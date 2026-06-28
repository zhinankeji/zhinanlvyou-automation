<#
.SYNOPSIS
    指南帮 AI 助手 — GPO 批量部署脚本 v1.2（企业版）
.DESCRIPTION
    通过 Active Directory GPO 启动脚本批量部署到域内所有计算机
    使用 SYSTEM 账户运行，安装到 C:\Program Files\ZhinanAI
#>

# ========== 编码设置 ==========
chcp 65001 > $null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

param(
    [switch]$SILENT,
    [string]$LOG = "C:\Windows\Logs\ZhinanAI\deploy.log",
    [switch]$UNINSTALL
)

$ErrorActionPreference = 'Stop'
$START_TIME = Get-Date

# ---------- 路径 ----------
$INSTALL_DIR = "$env:ProgramFiles\ZhinanAI"
$REG_PATH = "HKLM:\SOFTWARE\ZhinanAI"
$LOG_DIR = [System.IO.Path]::GetDirectoryName($LOG)
$SCRIPT_ROOT = Split-Path -Parent $MyInvocation.MyCommand.Definition

# ---------- 日志 ----------
function Write-Log {
    param([string]$Msg)
    $time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$time $Msg" | Out-File -FilePath $LOG -Append -Encoding UTF8
    if (-not $SILENT) { Write-Host $Msg }
}

# 初始化日志目录
if (-not (Test-Path $LOG_DIR)) {
    New-Item -Path $LOG_DIR -ItemType Directory -Force | Out-Null
}

Write-Log "=== 指南帮 AI 助手 GPO 部署开始 ==="
Write-Log "系统: $((Get-WmiObject Win32_OperatingSystem).Caption)"
Write-Log "架构: $env:PROCESSOR_ARCHITECTURE"
Write-Log "账户: $env:USERNAME"

# ---------- 卸载模式 ----------
if ($UNINSTALL) {
    Write-Log "[INFO] 卸载模式"
    if (Test-Path $INSTALL_DIR) {
        Remove-Item -Path $INSTALL_DIR -Recurse -Force -ErrorAction SilentlyContinue
        Write-Log "[OK] 已删除: $INSTALL_DIR"
    }
    if (Test-Path $REG_PATH) {
        Remove-Item -Path $REG_PATH -Recurse -Force -ErrorAction SilentlyContinue
        Write-Log "[OK] 已删除注册表: $REG_PATH"
    }
    Write-Log "[OK] 卸载完成"
    exit 0
}

# ---------- 系统检查 ----------
$osInfo = Get-WmiObject Win32_OperatingSystem
$osVer = [Version]($osInfo.Version)
$isWin10Plus = ($osVer.Major -eq 10 -and $osVer.Build -ge 10240)

if (-not $isWin10Plus) {
    Write-Log "[FAIL] 不支持的操作系统: $($osInfo.Caption)"
    exit 1
}

$arch = $env:PROCESSOR_ARCHITECTURE
if ($arch -ne 'AMD64' -and $arch -ne 'ARM64') {
    Write-Log "[FAIL] 需要 64-bit 系统"
    exit 1
}

# ---------- 检测是否已安装 ----------
if (Test-Path $REG_PATH) {
    try {
        $installedVer = (Get-ItemProperty -Path $REG_PATH -Name 'Version' -ErrorAction Stop).Version
        Write-Log "[INFO] 已安装版本: $installedVer"
        if ($installedVer -ge '1.2') {
            Write-Log "[OK] 已安装最新版本，跳过"
            exit 0
        }
        Write-Log "[INFO] 需要升级"
    } catch {
        Write-Log "[WARN] 注册表损坏，重新安装"
    }
}

# ---------- 安装 ----------
if (-not (Test-Path $SCRIPT_ROOT\install.ps1)) {
    Write-Log "[FAIL] install.ps1 不存在于 $SCRIPT_ROOT"
    exit 1
}

Write-Log "[INFO] 开始安装..."
try {
    # 复制到安装目录
    if (-not (Test-Path $INSTALL_DIR)) {
        New-Item -Path $INSTALL_DIR -ItemType Directory -Force | Out-Null
    }
    
    # 复制所有文件
    $items = @('install.ps1', 'install.bat', 'uninstall.ps1', 'build.ps1', 
               'packages', 'scripts', 'config', 'assets', 'dependencies.lock.json')
    foreach ($item in $items) {
        $src = Join-Path $SCRIPT_ROOT $item
        $dst = Join-Path $INSTALL_DIR $item
        if (Test-Path $src) {
            if (Test-Path $dst) {
                Remove-Item -Path $dst -Recurse -Force -ErrorAction SilentlyContinue
            }
            Copy-Item -Path $src -Destination $dst -Recurse -Force
            Write-Log "[OK] 已复制: $item"
        }
    }
    
    # 运行安装脚本（静默模式）
    $installScript = Join-Path $INSTALL_DIR 'install.ps1'
    if (Test-Path $installScript) {
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installScript
        Write-Log "[OK] 安装脚本执行完成"
    }
    
    # 写注册表
    if (-not (Test-Path $REG_PATH)) {
        New-Item -Path $REG_PATH -Force | Out-Null
    }
    Set-ItemProperty -Path $REG_PATH -Name 'Version' -Value '1.2.0'
    Set-ItemProperty -Path $REG_PATH -Name 'InstallDate' -Value (Get-Date -Format 'yyyy-MM-dd')
    Set-ItemProperty -Path $REG_PATH -Name 'InstallDir' -Value $INSTALL_DIR
    Write-Log "[OK] 注册表已写入"
    
    # 写事件日志
    try {
        $eventMsg = "指南帮 AI 助手 v1.2.0 已通过 GPO 部署到 $env:COMPUTERNAME"
        Write-EventLog -LogName Application -Source 'ZhinanAI' -EntryType Information -EventId 1000 -Message $eventMsg -ErrorAction SilentlyContinue
    } catch {
        Write-Log "[WARN] 无法写入事件日志: $_"
    }
    
    Write-Log "[OK] 部署完成"
} catch {
    Write-Log "[FAIL] 部署失败: $_"
    exit 1
}

$elapsed = (Get-Date) - $START_TIME
Write-Log "[INFO] 耗时: $([math]::Round($elapsed.TotalSeconds, 1))s"
Write-Log "=== GPO 部署结束 ==="