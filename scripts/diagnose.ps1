<#
.SYNOPSIS
    指南帮 AI 助手 — 诊断导出工具 v1.2
.DESCRIPTION
    一键导出 diagnose.zip 到桌面，包含系统信息、安装日志、配置文件等
    用于技术支持快速定位问题
#>

# ========== 编码设置 ==========
chcp 65001 > $null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'

$ErrorActionPreference = 'SilentlyContinue'
$START_TIME = Get-Date

# ---------- 路径 ----------
$DESKTOP = [Environment]::GetFolderPath('Desktop')
$TEMP_DIR = Join-Path $env:TEMP "ZhinanAI_Diagnose_$((Get-Date).ToString('yyyyMMdd_HHmmss'))"
$LOCAL_DIR = Join-Path $env:LOCALAPPDATA 'ZhinanAI'
$APP_DIR = Join-Path $env:APPDATA 'ZhinanAI'
$HERMES_DIR = "$env:USERPROFILE\.hermes"

# ---------- 帮助函数 ----------
function Write-Info    { Write-Host "[信息] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[成功] $args" -ForegroundColor Green }
function Write-Warn    { Write-Host "[警告] $args" -ForegroundColor Yellow }
function Write-Fail    { Write-Host "[失败] $args" -ForegroundColor Red }

function Write-File {
    param([string]$Path, [string]$Content)
    $dir = Split-Path $Path -Parent
    if (-not (Test-Path $dir)) { New-Item -Path $dir -ItemType Directory -Force | Out-Null }
    $Content | Out-File -FilePath $Path -Encoding UTF8
}

function Mask-Sensitive {
    param([string]$Text)
    # Mask API keys: keep first 3, last 4 chars
    $Text = $Text -replace '(sk-)[a-zA-Z0-9]{5,}([a-zA-Z0-9]{4})', '$1xxxxxxxx$2'
    # Mask username in paths
    $username = $env:USERNAME
    $Text = $Text -replace $username, '***'
    return $Text
}

# ========== 主流程 ==========
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "   指南帮 AI 助手 - 诊断工具 v1.2" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# 创建临时目录
New-Item -Path $TEMP_DIR -ItemType Directory -Force | Out-Null
Write-Info "临时目录: $TEMP_DIR"

# 1. systeminfo
Write-Info "收集系统信息..."
$sysInfo = systeminfo 2>&1 | Out-String
Write-File -Path "$TEMP_DIR\systeminfo.txt" -Content $sysInfo

# 2. OS 版本
$osInfo = Get-WmiObject Win32_OperatingSystem
$osVer = [Version]($osInfo.Version)
$memGB = [math]::Round((Get-WmiObject Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
$osText = @"
操作系统: $($osInfo.Caption)
版本: $($osVer.Major).$($osVer.Minor).$($osVer.Build)
架构: $env:PROCESSOR_ARCHITECTURE
内存: ${memGB}GB
CPU: $env:NUMBER_OF_PROCESSORS 核
"@
Write-File -Path "$TEMP_DIR\os-version.txt" -Content $osText

# 3. PowerShell 版本
$psText = @"
PowerShell 版本: $($PSVersionTable.PSVersion)
CLR 版本: $($PSVersionTable.CLRVersion)
PSCompatibleVersions: $($PSVersionTable.PSCompatibleVersions -join ', ')
PSRemotingProtocolVersion: $($PSVersionTable.PSRemotingProtocolVersion)
ExecutionPolicy: $(Get-ExecutionPolicy)
"@
Write-File -Path "$TEMP_DIR\powershell-version.txt" -Content $psText

# 4. ZhinanAI 安装目录结构
if (Test-Path $LOCAL_DIR) {
    $dirTree = Get-ChildItem -Path $LOCAL_DIR -Recurse | Select-Object FullName, Length, LastWriteTime | Format-Table -AutoSize | Out-String
    $dirInfo = @"
ZhinanAI 安装目录: $LOCAL_DIR
总大小: $((Get-ChildItem -Path $LOCAL_DIR -Recurse | Measure-Object Length -Sum).Sum / 1MB) MB

$dirTree
"@
    Write-File -Path "$TEMP_DIR\installed-files.txt" -Content $dirInfo
} else {
    Write-File -Path "$TEMP_DIR\installed-files.txt" -Content "ZhinanAI 未安装（$LOCAL_DIR 不存在）"
}

# 5. ZhinanAI 安装日志
$installLog = Join-Path $env:TEMP 'ZhinanAI_Install.log'
if (Test-Path $installLog) {
    Copy-Item -Path $installLog -Destination "$TEMP_DIR\zhinanai\install.log"
} else {
    Write-File -Path "$TEMP_DIR\zhinanai\install.log" -Content "安装日志不存在"
}

# 6. ZhinanAI 配置文件（脱敏）
$configFile = Join-Path $APP_DIR 'config.yaml'
if (Test-Path $configFile) {
    $configContent = Get-Content $configFile -Raw
    $configContent = Mask-Sensitive $configContent
    Write-File -Path "$TEMP_DIR\zhinanai\config.yaml" -Content $configContent
} else {
    Write-File -Path "$TEMP_DIR\zhinanai\config.yaml" -Content "配置文件不存在"
}

# 7. PATH 中的 ZhinanAI 相关项
$currentPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$pathLines = $currentPath -split ';' | Where-Object { $_ -like '*ZhinanAI*' }
$pathText = @"
用户 PATH 中 ZhinanAI 相关项:
$($pathLines -join "`n")

完整 PATH 长度: $($currentPath.Length) 字符
"@
Write-File -Path "$TEMP_DIR\zhinanai\path.txt" -Content $pathText

# 8. Hermes 版本
$hermesExe = Join-Path $LOCAL_DIR 'python\Scripts\hermes.exe'
if (Test-Path $hermesExe) {
    $hermesVer = & $hermesExe --version 2>&1 | Out-String
    Write-File -Path "$TEMP_DIR\hermes\version.txt" -Content $hermesVer
} else {
    Write-File -Path "$TEMP_DIR\hermes\version.txt" -Content "Hermes 未安装"
}

# 9. Hermes 配置文件（脱敏）
$hermesConfig = Join-Path $HERMES_DIR 'config.yaml'
if (Test-Path $hermesConfig) {
    $hc = Get-Content $hermesConfig -Raw
    $hc = Mask-Sensitive $hc
    Write-File -Path "$TEMP_DIR\hermes\config.yaml" -Content $hc
} else {
    Write-File -Path "$TEMP_DIR\hermes\config.yaml" -Content "Hermes 配置不存在"
}

# 10. 环境变量（脱敏）
$envVars = Get-ChildItem Env: | Where-Object {
    $_.Name -notlike '*SECRET*' -and $_.Name -notlike '*KEY*' -and $_.Name -notlike '*TOKEN*' -and $_.Name -notlike '*PASSWORD*'
} | Select-Object Name, Value | Format-Table -AutoSize | Out-String
$envText = Mask-Sensitive $envVars
Write-File -Path "$TEMP_DIR\env.txt" -Content $envText

# 11. 事件日志
try {
    $events = Get-WinEvent -LogName 'Application' -MaxEvents 50 | Where-Object {
        $_.Message -like '*ZhinanAI*' -or $_.Message -like '*hermes*'
    } | Select-Object TimeCreated, Id, LevelDisplayName, Message | Format-Table -AutoSize | Out-String
    Write-File -Path "$TEMP_DIR\eventlog.txt" -Content "ZhinanAI 相关事件日志:`n$events"
} catch {
    Write-File -Path "$TEMP_DIR\eventlog.txt" -Content "无法读取事件日志: $_"
}

# ========== 打包 ==========
Write-Info "正在打包..."
$zipName = "ZhinanAI_Diagnose_$((Get-Date).ToString('yyyy-MM-dd_HHmmss')).zip"
$zipPath = Join-Path $DESKTOP $zipName

# 使用 Shell.Application 打包（兼容 PS2.0）
try {
    $shell = New-Object -ComObject Shell.Application
    $zip = $shell.NameSpace($zipPath)
    if (-not $zip) {
        # 创建空 zip
        [byte[]]$emptyZip = 80,75,5,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        [System.IO.File]::WriteAllBytes($zipPath, $emptyZip)
        Start-Sleep -Milliseconds 500
    }
    $zip = $shell.NameSpace($zipPath)
    $folder = $shell.NameSpace($TEMP_DIR)
    $zip.CopyHere($folder.Items(), 0x14)  # 0x14 = NoProgressUI + RespondYesToAll
    Start-Sleep -Seconds 2
} catch {
    # Fallback: use .NET
    try {
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::CreateFromDirectory($TEMP_DIR, $zipPath)
    } catch {
        Write-Warn "打包失败: $_"
        Write-Info "诊断文件已保留在: $TEMP_DIR"
    }
}

# ========== 完成 ==========
$elapsed = (Get-Date) - $START_TIME

if (Test-Path $zipPath) {
    $zipSize = (Get-Item $zipPath).Length / 1KB
    Write-Success "诊断报告已生成！"
    Write-Info "文件: $zipPath"
    Write-Info "大小: $([math]::Round($zipSize, 0)) KB"
    
    # 清理临时目录
    Remove-Item -Path $TEMP_DIR -Recurse -Force -ErrorAction SilentlyContinue
} else {
    Write-Warn "ZIP 打包可能未完成，诊断文件在: $TEMP_DIR"
}

$elapsedStr = [math]::Round($elapsed.TotalSeconds, 1)
Write-Info "耗时: ${elapsedStr}s"
Write-Host ""
Write-Host "请将诊断文件发送给技术支持（微信: hibeike）" -ForegroundColor Yellow
Write-Host ""
Read-Host "按回车键退出"