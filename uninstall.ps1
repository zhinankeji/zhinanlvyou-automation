<#
.SYNOPSIS
    指南帮 AI 助手 — 卸载脚本
.DESCRIPTION
    删除所有安装文件、环境变量配置、快捷方式等
#>

# ========== 编码设置 ==========
chcp 65001 > $null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'

$ErrorActionPreference = 'Continue'

$LOCAL_DIR   = Join-Path $env:LOCALAPPDATA 'ZhinanAI'
$APP_DIR     = Join-Path $env:APPDATA 'ZhinanAI'
$DESKTOP     = [Environment]::GetFolderPath('Desktop')
$STARTUP     = [Environment]::GetFolderPath('Startup')
$STARTMENU   = Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs\ZhinanAI'

function Write-Info    { Write-Host "[信息] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[成功] $args" -ForegroundColor Green }
function Write-Warn    { Write-Host "[警告] $args" -ForegroundColor Yellow }

Write-Host "==========================================" -ForegroundColor Green
Write-Host "   指南帮 AI 助手 - 卸载程序 v1.0" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

$confirm = Read-Host "确定要卸载 指南帮 AI 助手 吗？(Y/N，默认 N)"
if ($confirm -ne 'Y' -and $confirm -ne 'y') {
    Write-Info "用户取消卸载"
    Read-Host "按回车键退出"
    exit 0
}

# 1. 删除组件文件
Write-Info "正在删除组件文件..."
if (Test-Path $LOCAL_DIR) {
    try {
        Remove-Item -Path $LOCAL_DIR -Recurse -Force -ErrorAction Stop
        Write-Success "已删除: $LOCAL_DIR"
    } catch {
        Write-Warn "无法删除 $LOCAL_DIR : $_"
        Write-Warn "部分文件可能被占用，请关闭相关程序后重试"
    }
} else { Write-Info "目录不存在，跳过: $LOCAL_DIR" }

# 2. 删除配置文件
Write-Info "正在删除配置文件..."
if (Test-Path $APP_DIR) {
    try {
        Remove-Item -Path $APP_DIR -Recurse -Force -ErrorAction Stop
        Write-Success "已删除: $APP_DIR"
    } catch { Write-Warn "无法删除 $APP_DIR : $_" }
} else { Write-Info "目录不存在，跳过: $APP_DIR" }

# 3. 清理 PATH
Write-Info "正在清理 PATH 环境变量..."
$pathsToRemove = @(
    (Join-Path $env:LOCALAPPDATA 'ZhinanAI\python'),
    (Join-Path $env:LOCALAPPDATA 'ZhinanAI\node'),
    (Join-Path $env:LOCALAPPDATA 'ZhinanAI\git\bin'),
    (Join-Path $env:LOCALAPPDATA 'ZhinanAI\ripgrep'),
    (Join-Path $env:LOCALAPPDATA 'ZhinanAI\ffmpeg\bin')
)
$currentPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$paths = $currentPath -split ';' | Where-Object { $_ -ne '' }
$removedCount = 0
foreach ($removePath in $pathsToRemove) {
    $normalized = $removePath.Replace('/', '\').TrimEnd('\')
    $paths = $paths | Where-Object {
        $p = $_.Replace('/', '\').TrimEnd('\')
        $keep = $p -ne $normalized
        if (-not $keep) { $removedCount++ }
        $keep
    }
}
if ($removedCount -gt 0) {
    [Environment]::SetEnvironmentVariable('Path', ($paths -join ';'), 'User')
    Write-Success "已从 PATH 中移除 $removedCount 条路径"
} else { Write-Info "PATH 中未找到 ZhinanAI 相关路径" }

# 4. 删除桌面快捷方式
Write-Info "正在删除桌面快捷方式..."
$desktopShortcuts = @(
    (Join-Path $DESKTOP '指南帮 AI 助手.lnk'),
    (Join-Path $DESKTOP '指南帮 AI 助手.url')
)
foreach ($sc in $desktopShortcuts) {
    if (Test-Path $sc) {
        try { Remove-Item -Path $sc -Force; Write-Success "已删除: $sc" }
        catch { Write-Warn "无法删除 $sc : $_" }
    }
}

# 5. 删除启动项
Write-Info "正在删除启动项..."
$startupFiles = @(
    (Join-Path $STARTUP '指南帮 AI 助手.lnk'),
    (Join-Path $STARTUP 'ZhinanAI-Hermes.bat'),
    (Join-Path $STARTUP 'ZhinanAI-Hermes.lnk')
)
foreach ($f in $startupFiles) {
    if (Test-Path $f) {
        try { Remove-Item -Path $f -Force; Write-Success "已删除启动项: $f" }
        catch { Write-Warn "无法删除 $f : $_" }
    }
}

# 6. 删除开始菜单
Write-Info "正在删除开始菜单条目..."
if (Test-Path $STARTMENU) {
    try { Remove-Item -Path $STARTMENU -Recurse -Force; Write-Success "已删除开始菜单目录" }
    catch { Write-Warn "无法删除 $STARTMENU : $_" }
} else { Write-Info "开始菜单目录不存在，跳过" }

# 完成
Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "   卸载完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "以下内容已被删除："
Write-Host "  - 组件文件目录: %LOCALAPPDATA%\ZhinanAI"
Write-Host "  - 配置文件目录: %APPDATA%\ZhinanAI"
Write-Host "  - PATH 环境变量中的 ZhinanAI 路径"
Write-Host "  - 桌面快捷方式"
Write-Host "  - 开机启动项"
Write-Host "  - 开始菜单条目"
Write-Host ""
Write-Host "提示：请重启终端或重新登录以完全刷新环境变量。" -ForegroundColor Yellow
Write-Host "感谢您使用 指南帮 AI 助手！" -ForegroundColor Green
Read-Host "按回车键退出"
