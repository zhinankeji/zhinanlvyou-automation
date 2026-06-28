<#
.SYNOPSIS
    指南帮 AI 助手 — 版本更新工具 v1.3
.DESCRIPTION
    支持在线/离线双模式更新，自动备份可回滚
    在线模式：从服务器检测最新版本，增量下载变更文件
    离线模式：从 U 盘加载补丁包
#>

# ========== 编码设置 ==========
chcp 65001 > $null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'

param(
    [switch]$CheckOnly,         # 仅检查版本，不更新
    [switch]$Force,             # 强制更新
    [string]$OfflinePatch,      # 离线补丁包路径（U盘）
    [switch]$Rollback           # 回滚到上一个版本
)

$ErrorActionPreference = 'SilentlyContinue'
$START_TIME = Get-Date

# 启用 TLS 1.2（Win7 默认只开 TLS 1.0，GitHub 需要 TLS 1.2）
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch {}

# ---------- 路径 ----------
$LOCAL_DIR = Join-Path $env:LOCALAPPDATA 'ZhinanAI'
$VERSION_FILE = Join-Path $LOCAL_DIR 'version.txt'
$SELF_PATH = $PSCommandPath
$PENDING_FILE = Join-Path $LOCAL_DIR '.pending_replace'
$BACKUP_PREFIX = '.backup-'
$SERVER_ENDPOINT = "https://zhinanai.zhinanbang.cn/update/latest.json"

# ---------- 当前版本 ----------
$CURRENT_VER = "1.3.0"

# ---------- 帮助函数 ----------
function Write-Info    { Write-Host "[信息] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[成功] $args" -ForegroundColor Green }
function Write-Warn    { Write-Host "[警告] $args" -ForegroundColor Yellow }
function Write-Fail    { Write-Host "[失败] $args" -ForegroundColor Red }

function Write-Log {
    param([string]$Msg)
    $time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$time $Msg" | Out-File (Join-Path $LOCAL_DIR 'update.log') -Append -Encoding UTF8
}

# ---------- 读取当前安装版本 ----------
function Get-InstalledVersion {
    $ver = "0.0.0"
    if (Test-Path $VERSION_FILE) {
        try {
            $raw = (Get-Content $VERSION_FILE -Raw).Trim()
            if ($raw) { $ver = [Version]$raw }
        } catch { $ver = "0.0.0" }
    }
    return $ver
}

# ---------- 处理延迟替换 ----------
function Process-PendingReplace {
    if (-not (Test-Path $PENDING_FILE)) { return }
    Write-Info "检测到延迟替换标记，正在完成上次未完成的更新..."
    Get-Content $PENDING_FILE | ForEach-Object {
        $parts = $_.Split('|')
        if ($parts.Count -eq 2) {
            $newFile = $parts[0]
            $oldFile = $parts[1]
            if (Test-Path $newFile) {
                Copy-Item $newFile $oldFile -Force
                Remove-Item $newFile -Force
                Write-Info "  已替换: $oldFile"
            }
        }
    }
    Remove-Item $PENDING_FILE -Force
}

# ---------- 回滚函数 ----------
function Invoke-Rollback {
    Write-Host ""
    Write-Host "--- 回滚到上一个版本 ---" -ForegroundColor Yellow
    
    $backups = Get-ChildItem (Join-Path $LOCAL_DIR "${BACKUP_PREFIX}*") -Directory | Sort-Object LastWriteTime -Descending
    if (-not $backups) {
        Write-Warn "没有找到备份，无法回滚"
        return
    }
    
    $latestBackup = $backups[0]
    $backupVer = $latestBackup.Name -replace $BACKUP_PREFIX, ''
    Write-Info "找到备份: $backupVer ($(Get-Date $latestBackup.LastWriteTime -Format 'yyyy-MM-dd HH:mm'))"
    
    $confirm = Read-Host "确定回滚到 $backupVer ? (Y/N)"
    if ($confirm -ne 'Y' -and $confirm -ne 'y') {
        Write-Info "已取消"
        return
    }
    
    Restore-Backup -BackupDir $latestBackup.FullName
    Write-Success "已回滚到 $backupVer"
    Write-Log "[ROLLBACK] Rolled back to $backupVer"
}

function Restore-Backup {
    param([string]$BackupDir)
    if (-not (Test-Path $BackupDir)) {
        Write-Warn "备份目录不存在: $BackupDir"
        return
    }
    Write-Info "正在恢复文件..."
    Get-ChildItem $BackupDir -Recurse -File | ForEach-Object {
        $rel = $_.FullName.Substring($BackupDir.Length + 1)
        $target = Join-Path $LOCAL_DIR $rel
        $parent = Split-Path $target -Parent
        if (-not (Test-Path $parent)) { New-Item $parent -ItemType Directory -Force | Out-Null }
        Copy-Item $_.FullName $target -Force
    }
    # 恢复版本号
    $bakVerFile = Join-Path $BackupDir 'version.txt'
    if (Test-Path $bakVerFile) {
        Copy-Item $bakVerFile $VERSION_FILE -Force
    }
}

# ---------- 获取最新版本信息 ----------
function Get-LatestVersionInfo {
    # 方式A：服务器端点（推荐）
    try {
        $wc = New-Object System.Net.WebClient
        $wc.Timeout = 10000
        $json = $wc.DownloadString($SERVER_ENDPOINT)
        $info = $json | ConvertFrom-Json
        if ($info.latest_version) { return $info }
    } catch {
        Write-Log "[WARN] Server endpoint failed: $_"
    }
    # 方式B：GitHub API 降级
    try {
        $apiUrl = "https://api.github.com/repos/zhinankeji/zhinanlvyou-automation/releases/latest"
        $wc = New-Object System.Net.WebClient
        $wc.Headers.Add("User-Agent", "ZhinanAI-Updater")
        $release = ($wc.DownloadString($apiUrl) | ConvertFrom-Json)
        $tag = $release.tag_name -replace '^v', ''
        # 找 manifest 附件
        $manifestAsset = $release.assets | Where-Object { $_.name -eq "update-manifest.json" }
        if ($manifestAsset) {
            $wc2 = New-Object System.Net.WebClient
            $manifestJson = $wc2.DownloadString($manifestAsset.browser_download_url)
            $manifest = $manifestJson | ConvertFrom-Json
            return @{
                latest_version = $tag
                min_upgradable_from = $manifest.min_upgradable_from
                manifest_url = $manifestAsset.browser_download_url
                changelog = $manifest.changelog
                _manifest = $manifest
            }
        }
        return @{ latest_version = $tag }
    } catch {
        return $null
    }
}

# ========== 主流程 ==========
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "   指南帮 AI 助手 - 版本更新工具 v$CURRENT_VER" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Log "[START] Update tool started"

# 0. 处理延迟替换（上次更新未完成的文件覆盖）
Process-PendingReplace

# 1. 读取当前版本
$installedVer = Get-InstalledVersion
Write-Info "当前版本: $installedVer"
Write-Log "[INFO] Current version: $installedVer"

# 2. 回滚模式
if ($Rollback) {
    Invoke-Rollback
    $elapsed = (Get-Date) - $START_TIME
    Write-Info "耗时: $([math]::Round($elapsed.TotalSeconds, 1))s"
    Read-Host "按回车键退出"
    exit 0
}

# 3. 离线更新模式
if ($OfflinePatch) {
    Write-Host ""
    Write-Host "--- 离线更新模式 ---" -ForegroundColor Yellow
    Write-Log "[INFO] Offline patch mode: $OfflinePatch"
    
    if (-not (Test-Path $OfflinePatch)) {
        Write-Fail "补丁包不存在: $OfflinePatch"
        Read-Host "按回车键退出"
        exit 1
    }
    
    # 解压补丁包
    $patchDir = Join-Path $env:TEMP "ZhinanAI_Patch_$(Get-Date -Format 'yyyyMMddHHmmss')"
    New-Item -Path $patchDir -ItemType Directory -Force | Out-Null
    
    try {
        $shell = New-Object -ComObject Shell.Application
        $zip = $shell.NameSpace($OfflinePatch)
        $dest = $shell.NameSpace($patchDir)
        $dest.CopyHere($zip.Items(), 0x14)
        Start-Sleep -Seconds 1
    } catch {
        Expand-Archive -Path $OfflinePatch -DestinationPath $patchDir -Force
    }
    
    # 读取补丁清单
    $patchManifest = Join-Path $patchDir 'update-manifest.json'
    if (-not (Test-Path $patchManifest)) {
        Write-Fail "补丁包缺少 update-manifest.json"
        Remove-Item $patchDir -Recurse -Force
        Read-Host "按回车键退出"
        exit 1
    }
    
    $manifest = (Get-Content $patchManifest -Raw) | ConvertFrom-Json
    
    # 备份当前文件
    $backupDir = Join-Path $LOCAL_DIR "${BACKUP_PREFIX}$installedVer"
    if (-not (Test-Path $backupDir)) {
        New-Item $backupDir -ItemType Directory -Force | Out-Null
    }
    
    # 应用补丁
    $success = $true
    foreach ($file in $manifest.files) {
        $source = Join-Path $patchDir $file.path
        $target = Join-Path $LOCAL_DIR $file.path
        $backupTarget = Join-Path $backupDir $file.path
        
        if (-not (Test-Path $source)) {
            Write-Warn "补丁包中缺少: $($file.path)"
            $success = $false
            continue
        }
        
        # 备份
        if (Test-Path $target) {
            $parent = Split-Path $backupTarget -Parent
            if (-not (Test-Path $parent)) { New-Item $parent -ItemType Directory -Force | Out-Null }
            Copy-Item $target $backupTarget -Force
        }
        
        # 替换
        $targetParent = Split-Path $target -Parent
        if (-not (Test-Path $targetParent)) { New-Item $targetParent -ItemType Directory -Force | Out-Null }
        Copy-Item $source $target -Force
        Write-Info "  已更新: $($file.path)"
    }
    
    # 删除废弃文件
    foreach ($path in $manifest.delete) {
        $fullPath = Join-Path $LOCAL_DIR $path
        if (Test-Path $fullPath) { Remove-Item $fullPath -Force }
    }
    
    if ($success) {
        $manifest.version | Out-File $VERSION_FILE -Encoding UTF8
        Write-Success "已更新到 v$($manifest.version)"
        Write-Log "[SUCCESS] Updated to v$($manifest.version) (offline)"
    } else {
        Write-Warn "部分文件更新失败，可运行 -Rollback 回滚"
        Write-Log "[WARN] Offline update partial failure"
    }
    
    Remove-Item $patchDir -Recurse -Force
    Write-Info "耗时: $([math]::Round(((Get-Date)-$START_TIME).TotalSeconds, 1))s"
    Read-Host "按回车键退出"
    return
}

# 4. 在线更新模式
if ($CheckOnly) {
    Write-Host ""
    Write-Host "--- 检查更新 ---" -ForegroundColor Yellow
    
    # PowerShell 版本检测
    $psMajor = $PSVersionTable.PSVersion.Major
    if ($psMajor -lt 3) {
        # PS2.0 没有 ConvertFrom-Json，跳过在线检查
        Write-Log "[WARN] PS2.0 detected, skipping online check"
        exit 0
    }
    
    $info = Get-LatestVersionInfo
    if (-not $info) {
        # 无网络连接，静默退出
        Write-Log "[WARN] No network, skipped update check"
        exit 0
    }
    
    $latestVer = $info.latest_version
    Write-Info "最新版本: v$latestVer"
    
    if ([Version]$latestVer -gt [Version]$installedVer) {
        Write-Host ""
        Write-Host "[通知] 发现新版本 v$latestVer (当前 v$installedVer)" -ForegroundColor Green
        if ($info.changelog) {
            Write-Host "更新内容: $($info.changelog)" -ForegroundColor Cyan
        }
        # 写标记文件，让 launcher 提示用户
        "v$latestVer" | Out-File (Join-Path $LOCAL_DIR 'update_available.flag') -Encoding UTF8
        Write-Log "[INFO] Update available: v$latestVer"
    } else {
        Write-Info "已是最新版本"
    }
    exit 0
}

# 完整更新模式
Write-Host ""
Write-Host "--- 检查更新 ---" -ForegroundColor Yellow
Write-Log "[INFO] Full update mode"

$psMajor = $PSVersionTable.PSVersion.Major
if ($psMajor -lt 3) {
    Write-Warn "当前 PowerShell 版本 ($psMajor) 不支持在线更新"
    Write-Warn "请从官网 http://zhinanai.zhinanbang.cn/ 下载最新安装包"
    Write-Warn "或联系微信 hibeike 获取离线补丁包"
    Read-Host "按回车键退出"
    exit 1
}

$info = Get-LatestVersionInfo
if (-not $info) {
    Write-Warn "无法检查更新（无网络连接或服务器不可达）"
    Read-Host "按回车键退出"
    exit 1
}

$latestVer = $info.latest_version
Write-Info "最新版本: v$latestVer"

if ([Version]$latestVer -le [Version]$installedVer -and -not $Force) {
    Write-Info "已是最新版本 (v$installedVer)"
    Read-Host "按回车键退出"
    exit 0
}

Write-Host ""
Write-Host "发现新版本: v$installedVer → v$latestVer" -ForegroundColor Green
if ($info.changelog) {
    Write-Host "更新内容: $($info.changelog)" -ForegroundColor Cyan
}

$confirm = Read-Host "是否更新? (Y/N)"
if ($confirm -ne 'Y' -and $confirm -ne 'y') {
    Write-Info "已取消"
    exit 0
}

# 获取 manifest
$manifest = $info._manifest
if (-not $manifest) {
    try {
        $wc = New-Object System.Net.WebClient
        $manifestJson = $wc.DownloadString($info.manifest_url)
        $manifest = $manifestJson | ConvertFrom-Json
    } catch {
        Write-Fail "无法获取更新清单: $_"
        exit 1
    }
}

# 检查版本连续性
$minVer = $manifest.min_upgradable_from
if ([Version]$installedVer -lt [Version]$minVer) {
    Write-Warn "当前版本 (v$installedVer) 过低，请从官网下载完整安装包"
    Read-Host "按回车键退出"
    exit 1
}

# 备份当前文件
$backupDir = Join-Path $LOCAL_DIR "${BACKUP_PREFIX}$installedVer"
New-Item $backupDir -ItemType Directory -Force | Out-Null
Write-Info "备份当前文件到: $backupDir"

# 下载并替换
$updateSuccess = $true
$totalFiles = $manifest.files.Count
$currentFile = 0

foreach ($file in $manifest.files) {
    $currentFile++
    $targetPath = Join-Path $LOCAL_DIR $file.path
    $backupPath = Join-Path $backupDir $file.path
    $tmpPath = "$targetPath.tmp"
    
    Write-Info "[$currentFile/$totalFiles] 下载: $($file.path)"
    Write-Log "[INFO] Downloading: $($file.url)"
    
    # 下载
    try {
        $wc = New-Object System.Net.WebClient
        $wc.DownloadFile($file.url, $tmpPath)
    } catch {
        Write-Fail "下载失败: $($file.url)"
        $updateSuccess = $false
        break
    }
    
    # SHA256 校验
    try {
        $actualHash = (Get-FileHash $tmpPath -Algorithm SHA256).Hash
        if ($actualHash -ne $file.sha256 -and $file.sha256 -ne "PLACEHOLDER") {
            Write-Fail "SHA256 不匹配: $($file.path)"
            Remove-Item $tmpPath -Force -ErrorAction SilentlyContinue
            $updateSuccess = $false
            break
        }
    } catch {
        Write-Warn "SHA256 校验跳过（PS2 兼容）"
    }
    
    # 备份旧文件
    if (Test-Path $targetPath) {
        $parent = Split-Path $backupPath -Parent
        if (-not (Test-Path $parent)) { New-Item $parent -ItemType Directory -Force | Out-Null }
        Copy-Item $targetPath $backupPath -Force
    }
    
    # 延迟替换：检查文件是否正在运行
    $isRunning = $false
    try {
        $fh = [System.IO.File]::Open($targetPath, 'Open', 'Read', 'None')
        $fh.Close()
    } catch {
        $isRunning = $true
    }
    
    if ($isRunning) {
        Move-Item $tmpPath "$targetPath.new" -Force
        "$targetPath.new|$targetPath" | Out-File $PENDING_FILE -Append -Encoding UTF8
        Write-Info "  文件正在使用，将在下次启动时替换"
    } else {
        Move-Item $tmpPath $targetPath -Force
        Write-Info "  已更新"
    }
}

# 删除废弃文件
if ($updateSuccess) {
    foreach ($path in $manifest.delete) {
        $fullPath = Join-Path $LOCAL_DIR $path
        if (Test-Path $fullPath) { Remove-Item $fullPath -Force }
    }
    
    # 更新版本号
    $manifest.version | Out-File $VERSION_FILE -Encoding UTF8
    
    # 清理旧备份（保留最近2个）
    $backups = Get-ChildItem (Join-Path $LOCAL_DIR "${BACKUP_PREFIX}*") -Directory
    if ($backups.Count -gt 2) {
        $backups | Sort-Object LastWriteTime | Select-Object -First ($backups.Count - 2) | Remove-Item -Recurse -Force
    }
    
    Write-Success "更新完成！已升级到 v$($manifest.version)"
    Write-Log "[SUCCESS] Updated to v$($manifest.version)"
    Write-Host ""
    Write-Host "请关闭并重新启动终端，或重启 Hermes 以应用更新。" -ForegroundColor Yellow
} else {
    Write-Fail "更新失败，正在回滚..."
    Write-Log "[FAIL] Update failed, rolling back"
    Restore-Backup -BackupDir $backupDir
    Write-Info "已回滚到 v$installedVer"
}

$elapsed = (Get-Date) - $START_TIME
Write-Info "耗时: $([math]::Round($elapsed.TotalSeconds, 1))s"
Write-Log "[INFO] Update tool finished in $([math]::Round($elapsed.TotalSeconds, 1))s"

Read-Host "按回车键退出"