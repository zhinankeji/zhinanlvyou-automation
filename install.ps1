<#
.SYNOPSIS
    指南帮 AI 助手 — 安装脚本 v1.3（Windows 兼容版 + 版本更新机制）
.DESCRIPTION
    支持 Windows 7/10/11 + Windows Server 2016+
    兼容 PowerShell 2.0+ 
    将预构建的组件复制到 %LOCALAPPDATA%\ZhinanAI，配置 PATH，创建快捷方式
#>

# ========== 编码设置（必须在第一行）==========
# 修复 Bug 9：中文乱码
chcp 65001 > $null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

$ErrorActionPreference = 'Stop'



# 启用 TLS 1.2（Win7 兼容，GitHub API 需要）

try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch {}

# ---------- 路径 ----------
$SCRIPT_ROOT = Split-Path -Parent $MyInvocation.MyCommand.Definition
$LOCAL_DIR   = Join-Path $env:LOCALAPPDATA 'ZhinanAI'
$APP_DIR     = Join-Path $env:APPDATA 'ZhinanAI'
$DESKTOP     = [Environment]::GetFolderPath('Desktop')
$STARTUP     = [Environment]::GetFolderPath('Startup')
$STARTMENU   = Join-Path ([Environment]::GetFolderPath('Programs')) 'ZhinanAI'

# 组件源路径
$BUILD_DIR  = Join-Path $SCRIPT_ROOT 'build'
$PKG_DIR    = Join-Path $SCRIPT_ROOT 'packages'
$SRC_PYTHON = Join-Path $BUILD_DIR 'python'
$SRC_NODE   = Join-Path $BUILD_DIR 'node'
$SRC_GIT    = Join-Path $BUILD_DIR 'git'
$SRC_RG     = Join-Path $BUILD_DIR 'ripgrep'
$SRC_FFMPEG = Join-Path $BUILD_DIR 'ffmpeg'
$SRC_HERMES = Join-Path $PKG_DIR 'hermes'
$SRC_CONFIG = Join-Path $SCRIPT_ROOT 'config'

# 目标路径
$DST_PYTHON = Join-Path $LOCAL_DIR 'python'
$DST_NODE   = Join-Path $LOCAL_DIR 'node'
$DST_GIT    = Join-Path $LOCAL_DIR 'git'
$DST_RG     = Join-Path $LOCAL_DIR 'ripgrep'
$DST_FFMPEG = Join-Path $LOCAL_DIR 'ffmpeg'

# ---------- 日志 ----------
$LOG_FILE = Join-Path $env:TEMP 'ZhinanAI_Install.log'
$START_TIME = Get-Date

function Write-Log {
    param([string]$Msg)
    $time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$time $Msg" | Out-File -FilePath $LOG_FILE -Append -Encoding UTF8
}

function Write-Info {
    Write-Host "[信息] $args" -ForegroundColor Cyan
    Write-Log "[INFO] $args"
}
function Write-Success {
    Write-Host "[成功] $args" -ForegroundColor Green
    Write-Log "[SUCCESS] $args"
}
function Write-Warn {
    Write-Host "[警告] $args" -ForegroundColor Yellow
    Write-Log "[WARN] $args"
}
function Write-Fail {
    Write-Host "[失败] $args" -ForegroundColor Red
    Write-Log "[FAIL] $args"
}
function Write-ErrorExit {
    param([string]$Msg)
    Write-Fail $Msg
    $elapsed = (Get-Date) - $START_TIME
    Write-Log "[FATAL] $Msg"
    Write-Log "[INFO] Installation failed after $([math]::Round($elapsed.TotalSeconds, 1))s"
    Write-Host ""
    Write-Host "安装失败！日志已保存到: $LOG_FILE" -ForegroundColor Red
    Write-Host "请将此日志发送给技术支持（微信: hibeike）" -ForegroundColor Yellow
    Read-Host "按回车键退出"
    exit 1
}

# ========== 兼容性辅助函数（PowerShell 2.0 兼容）==========
# 修复 Bug 3：PowerShell 2 没有 -Directory 参数
function Get-ChildDirectories {
    param([string]$Path)
    if (Test-Path $Path) {
        Get-ChildItem -Path $Path | Where-Object { $_.PSIsContainer }
    }
}

function Get-ChildFiles {
    param([string]$Path, [string]$Filter)
    if (Test-Path $Path) {
        if ($Filter) {
            Get-ChildItem -Path $Path -Filter $Filter
        } else {
            Get-ChildItem -Path $Path | Where-Object { -not $_.PSIsContainer }
        }
    }
}

# ========== 环境预检函数 ==========
function Test-Environment {
    Write-Host ""
    Write-Host "========== 环境检测 ==========" -ForegroundColor Yellow
    $allPass = $true
    $fatalErrors = @()

    # 1. Windows 版本检测（修复 Bug 1：不兼容系统直接退出）
    try {
        $osInfo = Get-WmiObject Win32_OperatingSystem
        $osVer = [Version]($osInfo.Version)
        $osName = $osInfo.Caption
        Write-Info "操作系统: $osName"
        Write-Log "[INFO] OS Version: $($osVer.Major).$($osVer.Minor).$($osVer.Build)"
        
        $isWin10Plus = ($osVer.Major -eq 10 -and $osVer.Build -ge 10240)
        $isWinServer2016Plus = ($osVer.Major -eq 10 -and $osVer.Build -ge 14393 -and $osName -match "Server")
        $isWin11 = ($osVer.Major -eq 10 -and $osVer.Build -ge 22000)
        
        if ($isWin11) {
            Write-Info "Windows 11 检测通过"
        } elseif ($isWin10Plus) {
            Write-Info "Windows 10 检测通过"
        } elseif ($isWinServer2016Plus) {
            Write-Info "Windows Server 2016+ 检测通过"
        } else {
            # Win7 兼容模式
            Write-Warn "操作系统：$osName（Win7 兼容模式）"
            Write-Warn "部分组件使用 Win7 兼容版本（Node.js 18 / Git 2.35）"
            Write-Warn "建议升级到 Windows 10/11 以获得更好的性能和安全性"
            Write-Log "[WARN] Win7 compatibility mode: $osName"
            $global:isWin7 = $true
        }
    } catch {
        Write-ErrorExit "Windows 版本检测失败: $_"
    }

    # 2. 系统架构
    $arch = $env:PROCESSOR_ARCHITECTURE
    if ($arch -eq 'AMD64' -or $arch -eq 'ARM64') {
        Write-Info "系统架构: $arch (64-bit)"
    } else {
        Write-ErrorExit "需要 64-bit 系统。当前架构: $arch"
    }

    # 3. PowerShell 版本检测（修复 Bug 2：PS 2.0 直接退出）
    $psMajor = $PSVersionTable.PSVersion.Major
    $psFull = $PSVersionTable.PSVersion.ToString()
    Write-Info "PowerShell 版本: $psFull"
    Write-Log "[INFO] PowerShell version: $psFull"
    
    if ($psMajor -lt 3) {
        Write-Fail "PowerShell 版本过低: $psFull"
        Write-Host ""
        Write-Host "当前 PowerShell 版本: $psFull" -ForegroundColor Red
        Write-Host "最低要求: 5.1" -ForegroundColor Yellow
        Write-Host "请先安装 Windows Management Framework 5.1：" -ForegroundColor Yellow
        Write-Host "  https://www.microsoft.com/en-us/download/details.aspx?id=54616" -ForegroundColor White
        Write-ErrorExit "PowerShell 版本过低，安装终止。"
    } elseif ($psMajor -lt 5) {
        Write-Warn "PowerShell $psFull - 建议升级到 5.1+"
        Write-Warn "部分功能可能受限，但安装将继续..."
        Write-Warn "建议安装: Windows Management Framework 5.1"
    } elseif ($psMajor -ge 5) {
        Write-Info "PowerShell 版本检测通过 (v$psFull)"
    }

    # 4. 磁盘空间
    $drives = @($env:SystemDrive, $env:LOCALAPPDATA.Substring(0,2)) | Select-Object -Unique
    foreach ($d in $drives) {
        $disk = Get-WmiObject Win32_LogicalDisk -Filter "DeviceID='$d'"
        $freeGB = [math]::Round($disk.FreeSpace / 1GB, 1)
        if ($freeGB -ge 2) {
            Write-Info "磁盘 $d 剩余空间: ${freeGB}GB"
        } else {
            Write-Warn "磁盘 $d 剩余空间仅 ${freeGB}GB，建议至少 2GB 可用空间"
        }
    }

    # 5. 内存
    $memGB = [math]::Round((Get-WmiObject Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
    if ($memGB -ge 4) {
        Write-Info "内存: ${memGB}GB"
    } else {
        Write-Warn "内存: ${memGB}GB - 建议至少 4GB 内存"
    }

    # 6. .NET Framework 检测
    try {
        $dotnet = Get-ChildItem 'HKLM:\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full\' -ErrorAction SilentlyContinue | Get-ItemProperty -Name Release -ErrorAction SilentlyContinue
        if ($dotnet) {
            Write-Info ".NET Framework 4.x 已安装"
        } else {
            Write-Warn ".NET Framework 4.x 未检测到（非必须，但建议安装）"
        }
    } catch {
        Write-Warn ".NET Framework 检测失败（忽略）"
    }

    # 7. 管理员权限检测
    try {
        $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
        if ($isAdmin) {
            Write-Info "运行权限: 管理员"
        } else {
            Write-Info "运行权限: 普通用户（不需要管理员权限）"
        }
    } catch {
        Write-Info "运行权限检测失败（忽略）"
    }

    # 8. 检测是否已安装
    if (Test-Path $LOCAL_DIR) {
        Write-Warn "检测到已安装版本（%LOCALAPPDATA%\ZhinanAI 已存在）"
    }

    Write-Host ""
    Write-Host "环境检测完成" -ForegroundColor Green
    Write-Host "===============================" -ForegroundColor Yellow
    Write-Host ""
}

# ========== 资源完整性检查（修复 Bug 8）==========
function Check-Resources {
    Write-Host "========== 资源检查 ==========" -ForegroundColor Yellow
    $allOK = $true
    $missing = @()

    $requiredDirs = @(
        @{Path=$SRC_PYTHON; Name="build/python"; Fallback=(Join-Path $PKG_DIR 'python\python-3.11.9-embed-amd64.zip')},
        @{Path=$SRC_NODE;   Name="build/node";   Fallback=(Join-Path $PKG_DIR 'node\node-v22.14.0-win-x64.zip')},
        @{Path=$SRC_GIT;    Name="build/git";    Fallback=(Join-Path $PKG_DIR 'git\MinGit-2.35.5-64-bit.zip')},
        @{Path=$SRC_RG;     Name="build/ripgrep";Fallback=(Join-Path $PKG_DIR 'ripgrep\ripgrep-14.1.1-x86_64-pc-windows-gnu.zip')},
        @{Path=$SRC_FFMPEG; Name="build/ffmpeg"; Fallback=(Join-Path $PKG_DIR 'ffmpeg\ffmpeg-master-latest-win64-gpl.zip')},
        @{Path=$SRC_HERMES; Name="packages/hermes"},
        @{Path=$SRC_CONFIG; Name="config"}
    )

    foreach ($dir in $requiredDirs) {
        if (Test-Path $dir.Path) {
            Write-Info "  [OK] $($dir.Name)"
        } elseif ($dir.Fallback -and (Test-Path $dir.Fallback)) {
            Write-Info "  [OK] $($dir.Name) (packages 压缩包模式)"
        } else {
            Write-Fail "  [缺失] $($dir.Name)"
            $missing += $dir.Name
            $allOK = $false
        }
    }

    # 检查 hermes wheel 是否存在（修复 Bug 6）
    $hermesWheels = Get-ChildFiles -Path $SRC_HERMES -Filter '*.whl'
    $hasHermesWheel = $false
    if ($hermesWheels) {
        foreach ($w in $hermesWheels) {
            if ($w.Name -like 'hermes_agent*' -or $w.Name -like 'hermes-agent*') {
                $hasHermesWheel = $true
                break
            }
        }
    }
    if ($hasHermesWheel) {
        Write-Info "  [OK] hermes-agent wheel"
    } else {
        Write-Fail "  [缺失] hermes-agent wheel（packages/hermes/ 下缺少 hermes-agent*.whl）"
        $missing += "hermes-agent wheel"
        $allOK = $false
    }

    # 检查 python.exe（修复 Bug 4）
    $pythonExe = Join-Path $SRC_PYTHON 'python.exe'
    if (Test-Path $pythonExe) {
        Write-Info "  [OK] python.exe"
    } else {
        Write-Fail "  [缺失] python.exe（build/python/python.exe 不存在）"
        $missing += "python.exe"
        $allOK = $false
    }

    if (-not $allOK) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "  安装包损坏！" -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Red
        foreach ($m in $missing) {
            Write-Host "  缺少: $m" -ForegroundColor Yellow
        }
        Write-Host ""
        Write-Host "请重新下载安装包。" -ForegroundColor Cyan
        Write-ErrorExit "资源完整性检查失败，安装终止。"
    }

    Write-Host "资源检查全部通过" -ForegroundColor Green
    Write-Host "===============================" -ForegroundColor Yellow
    Write-Host ""
}

# ========== 辅助函数 ==========
function Copy-Directory {
    param([string]$Source, [string]$Dest, [string]$Label)
    if (-not (Test-Path $Source)) {
        Write-ErrorExit "源目录不存在: $Source"
    }
    Write-Info "正在复制 $Label ..."
    if (Test-Path $Dest) {
        Remove-Item -Path $Dest -Recurse -Force -ErrorAction SilentlyContinue
    }
    Copy-Item -Path $Source -Destination $Dest -Recurse -Force
    if (Test-Path $Dest) {
        Write-Success "$Label 安装成功"
        return $true
    } else {
        Write-ErrorExit "$Label 安装失败（复制到 $Dest 失败）"
    }
}

function Add-ToUserPath {
    param([string]$NewPath)
    $currentPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $paths = $currentPath -split ';' | Where-Object { $_ -ne '' }
    $normalized = $NewPath.Replace('/', '\').TrimEnd('\')
    if ($paths -notcontains $normalized) {
        $newPathStr = ($paths + $normalized) -join ';'
        [Environment]::SetEnvironmentVariable('Path', $newPathStr, 'User')
        $env:Path = "$env:Path;$normalized"
        Write-Info "已添加到 PATH: $normalized"
    } else {
        Write-Info "PATH 中已存在: $normalized"
    }
}

function Test-CommandInstalled {
    param([string]$ExePath)
    return (Test-Path $ExePath)
}


function Get-7zPath {
    # Try to find 7z.exe on the system
    $candidates = @(
        "$env:ProgramFiles\\7-Zip\\7z.exe",
        "${env:ProgramFiles(x86)}\\7-Zip\\7z.exe",
        "$env:LOCALAPPDATA\\7-Zip\\7z.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { return $c }
    }
    return $null
}

function Extract-Archive {
    param([string]$Archive, [string]$Dest, [string]$Label)
    
    if (-not (Test-Path $Archive)) {
        Write-ErrorExit "压缩包不存在: $Archive"
    }
    
    Write-Info "正在解压 $Label ..."
    Write-Log "[INFO] Extracting: $Archive -> $Dest"
    
    New-DirIfMissing $Dest
    
    $ext = [System.IO.Path]::GetExtension($Archive).ToLower()
    
    if ($ext -eq '.zip') {
        # Use built-in Shell.Application for PS2.0 compatibility
        try {
            $shell = New-Object -ComObject Shell.Application
            $zip = $shell.NameSpace($Archive)
            $dest = $shell.NameSpace($Dest)
            $dest.CopyHere($zip.Items(), 0x14)  # 0x14 = NoProgressUI + RespondYesToAll
            Write-Success "$Label 解压完成"
            return $true
        } catch {
            # Fallback: use Expand-Archive (PS5+) or try harder
            Write-Warn "Shell.Application 解压失败，尝试其他方法: $_"
            try {
                Expand-Archive -Path $Archive -DestinationPath $Dest -Force
                Write-Success "$Label 解压完成"
                return $true
            } catch {
                Write-ErrorExit "$Label 解压失败: $_"
            }
        }
    } elseif (($ext -eq '.7z') -or ($Archive -like '*.7z.exe')) {
        $7z = Get-7zPath
        if ($7z) {
            Write-Info "使用 7-Zip 解压 $Label ..."
            & $7z x "$Archive" -o"$Dest" -y 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "$Label 解压完成"
                return $true
            } else {
                Write-ErrorExit "$Label 解压失败 (7z exit: $LASTEXITCODE)"
            }
        } else {
            Write-ErrorExit "需要 7-Zip 解压 $Label。请从 https://www.7-zip.org/ 安装"
        }
    } else {
        Write-ErrorExit "不支持的压缩格式: $ext"
    }
}

function New-DirIfMissing {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        New-Item -Path $Path -ItemType Directory -Force | Out-Null
    }
}


# ========== 主流程 ==========
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "   指南帮 AI 助手 - 安装程序 v1.2" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

# 初始化日志
"ZhinanAI Installer v1.2 - Install Log" | Out-File -FilePath $LOG_FILE -Encoding UTF8
Write-Log "[INFO] Install started"
Write-Log "[INFO] Script root: $SCRIPT_ROOT"
Write-Log "[INFO] OS: $((Get-WmiObject Win32_OperatingSystem).Caption)"
Write-Log "[INFO] PowerShell: $($PSVersionTable.PSVersion)"
Write-Log "[INFO] Architecture: $env:PROCESSOR_ARCHITECTURE"

# 运行环境预检
Test-Environment

# 资源完整性检查（修复 Bug 8）
Check-Resources

# 询问安装模式（在线/离线）
Write-Host ""
Write-Host "请选择安装模式：" -ForegroundColor Cyan
Write-Host "  [1] 离线安装（默认）- 使用安装包内置组件" -ForegroundColor White
Write-Host "  [2] 在线安装 - 从网络下载最新组件" -ForegroundColor White
$modeChoice = Read-Host "请选择 (1/2，默认 1)"
if ($modeChoice -eq '2') {
    $onlineMode = $true
    Write-Info "已选择在线安装模式"
    Write-Log "[INFO] Mode: online"
} else {
    $onlineMode = $false
    Write-Info "已选择离线安装模式"
    Write-Log "[INFO] Mode: offline"
}

Write-Host ""

# 1. 检测是否已安装
$configFile = Join-Path $APP_DIR 'config.yaml'
if (Test-Path $APP_DIR) {
    Write-Warn "检测到已安装版本（%APPDATA%\ZhinanAI 已存在）"
    $overwrite = Read-Host "是否覆盖安装？(Y/N，默认 N)"
    if ($overwrite -ne 'Y' -and $overwrite -ne 'y') {
        Write-Info "用户取消安装"
        Write-Log "[INFO] User cancelled (already installed)"
        Read-Host "按回车键退出"
        exit 0
    }
    Write-Info "执行覆盖安装..."
    Write-Log "[INFO] Overwrite installation"
}

# ========== 安装步骤（12步，失败即停止）==========
$installSuccess = $true
try {
    # Step 1: 安装 Python
    Write-Host ""
    Write-Host "--- 步骤 1/12: 安装 Python ---" -ForegroundColor Yellow
    Write-Log "[STEP 1/12] Installing Python"
    
    # 检查 build/python 是否已解压
    $pythonExe = Join-Path $SRC_PYTHON 'python.exe'
    if (-not (Test-Path $pythonExe)) {
        # 尝试从 packages/ 解压
        Write-Info "build/python 未找到，从 packages 解压..."
        $pyArchive = Join-Path $PKG_DIR 'python\python-3.11.9-embed-amd64.zip'
        if (-not (Test-Path $pyArchive)) {
            Write-ErrorExit "Python 安装包缺失（$pyArchive 不存在），请重新下载安装包。"
        }
        Extract-Archive -Archive $pyArchive -Dest $SRC_PYTHON -Label "Python 3.11.9"
        $pythonExe = Join-Path $SRC_PYTHON 'python.exe'
    }
    if (-not (Test-Path $pythonExe)) {
        Write-ErrorExit "Python 安装包缺失（$pythonExe 不存在），请重新下载安装包。"
    }
    Copy-Directory -Source $SRC_PYTHON -Dest $DST_PYTHON -Label "Python 3.11.9"
    $installedPythonExe = Join-Path $DST_PYTHON 'python.exe'
    if (-not (Test-Path $installedPythonExe)) {
        Write-ErrorExit "Python 安装失败（$installedPythonExe 不存在）"
    }
    Write-Success "Python 3.11.9 安装完成"
    Write-Log "[INFO] Python installed to: $DST_PYTHON"

    # Step 2: 安装 pip
    Write-Host ""
    Write-Host "--- 步骤 2/12: 安装 pip ---" -ForegroundColor Yellow
    Write-Log "[STEP 2/12] Installing pip"
    
    $pipScript = Join-Path $SRC_HERMES 'get-pip.py'
    if (-not (Test-Path $pipScript)) {
        if ($onlineMode) {
            Write-Info "正在下载 get-pip.py ..."
            try {
                $wc = New-Object System.Net.WebClient
                $wc.DownloadFile('https://bootstrap.pypa.io/get-pip.py', $pipScript)
                Write-Success "get-pip.py 下载完成"
            } catch {
                Write-ErrorExit "无法下载 get-pip.py: $_"
            }
        } else {
            Write-ErrorExit "离线包中缺少 get-pip.py（packages/hermes/get-pip.py），请重新下载安装包"
        }
    }
    
    if (Test-Path $pipScript) {
        Write-Info "正在安装 pip ..."
        Write-Log "[INFO] Running: $installedPythonExe $pipScript --no-warn-script-location"
        & $installedPythonExe $pipScript --no-warn-script-location 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "pip 安装完成"
            Write-Log "[INFO] pip install success"
        } else {
            Write-ErrorExit "pip 安装失败（exit code: $LASTEXITCODE）"
        }
    }

    # Step 3: 安装 Hermes Agent
    Write-Host ""
    Write-Host "--- 步骤 3/12: 安装 Hermes Agent ---" -ForegroundColor Yellow
    Write-Log "[STEP 3/12] Installing Hermes Agent"
    
    $hermesWheels = Get-ChildFiles -Path $SRC_HERMES -Filter '*.whl'
    if ($hermesWheels -and (Test-Path $installedPythonExe)) {
        $mainWheel = $null
        foreach ($w in $hermesWheels) {
            if ($w.Name -like 'hermes_agent*' -or $w.Name -like 'hermes-agent*') {
                $mainWheel = $w
                break
            }
        }
        if (-not $mainWheel) {
            Write-ErrorExit "找不到 hermes-agent*.whl，请重新下载安装包"
        }
        
        Write-Info "正在离线安装 Hermes Agent ..."
        Write-Log "[INFO] Installing main wheel: $($mainWheel.Name)"
        
        # 先装依赖 wheel
        foreach ($wheel in $hermesWheels) {
            $wname = $wheel.Name
            if ($wname -notlike 'hermes_agent*' -and $wname -notlike 'hermes-agent*') {
                Write-Info "  安装依赖: $wname"
                & $installedPythonExe -m pip install --no-index --find-links "$SRC_HERMES" "$($wheel.FullName)" 2>&1 | Out-Null
                if ($LASTEXITCODE -ne 0) {
                    Write-Warn "  依赖安装失败: $wname（跳过）"
                }
            }
        }
        
        # 装主包
        & $installedPythonExe -m pip install --no-index --find-links "$SRC_HERMES" hermes-agent 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Hermes Agent 安装完成"
            Write-Log "[INFO] Hermes Agent installed"
        } else {
            Write-ErrorExit "Hermes Agent 安装失败"
        }
    } else {
        Write-ErrorExit "Hermes Agent wheel 缺失，安装终止。"
    }

    # Step 4: 安装 Node.js（自动选择 Win7/Win10 版本）
    Write-Host ""
    Write-Host "--- 步骤 4/12: 安装 Node.js ---" -ForegroundColor Yellow
    Write-Log "[STEP 4/12] Installing Node.js"
    
    # 根据系统选择 Node.js 版本
    if ($global:isWin7) {
        $nodeVer = "18.20.4"
        $nodeArchive = Join-Path $PKG_DIR 'node\node-v18.20.4-win-x64.zip'
        $nodeLabel = "Node.js 18.20.4 (Win7 兼容)"
    } else {
        $nodeVer = "22.14.0"
        $nodeArchive = Join-Path $PKG_DIR 'node\node-v22.14.0-win-x64.zip'
        $nodeLabel = "Node.js 22.14.0"
    }
    Write-Info "检测到当前系统" + $(if ($global:isWin7) { "Windows 7" } else { "Windows 10/11" }) + "，选择 $nodeLabel"
    Write-Log "[INFO] Node.js version: $nodeVer"
    
    # 检查 build/node 是否已解压
    $nodeDirs = Get-ChildDirectories -Path $SRC_NODE
    if (-not $nodeDirs) {
        # 从 packages/ 解压
        Write-Info "build/node 未找到，从 packages 解压..."
        if (-not (Test-Path $nodeArchive)) {
            Write-ErrorExit "Node.js 安装包缺失（$nodeArchive 不存在）"
        }
        Extract-Archive -Archive $nodeArchive -Dest $BUILD_DIR -Label $nodeLabel
        # 查找解压后的目录
        $nodeDirs = Get-ChildDirectories -Path $SRC_NODE
    }
    $nodeDir = $null
    if ($nodeDirs) {
        $nodeDir = $nodeDirs | Select-Object -First 1
    }
    if ($nodeDir) {
        Copy-Directory -Source $nodeDir.FullName -Dest $DST_NODE -Label "Node.js 22.14.0"
    } else {
        Copy-Directory -Source $SRC_NODE -Dest $DST_NODE -Label "Node.js 22.14.0"
    }
    Write-Log "[INFO] Node.js installed to: $DST_NODE"

    # Step 5: 安装 Git
    Write-Host ""
    Write-Host "--- 步骤 5/12: 安装 Git ---" -ForegroundColor Yellow
    Write-Log "[STEP 5/12] Installing Git"
    
    # 检查 build/git 是否已解压
    $gitDirs = Get-ChildDirectories -Path $SRC_GIT
    if (-not $gitDirs) {
        # 从 packages/ 解压（PortableGit 是 7z 自解压文件）
        Write-Info "build/git 未找到，从 packages 解压..."
        $gitArchive = Join-Path $PKG_DIR 'git\MinGit-2.35.5-64-bit.zip'
        if (-not (Test-Path $gitArchive)) {
            Write-ErrorExit "Git 安装包缺失（$gitArchive 不存在）"
        }
        Extract-Archive -Archive $gitArchive -Dest $SRC_GIT -Label "Git 2.35.5 (MinGit)"
        $gitDirs = Get-ChildDirectories -Path $SRC_GIT
    }
    $gitDir = $null
    if ($gitDirs) {
        $gitDir = $gitDirs | Select-Object -First 1
    }
    if ($gitDir) {
        Copy-Directory -Source $gitDir.FullName -Dest $DST_GIT -Label "Git 2.35.5 (MinGit)"
    } else {
        Copy-Directory -Source $SRC_GIT -Dest $DST_GIT -Label "Git 2.35.5 (MinGit)"
    }
    Write-Log "[INFO] Git installed to: $DST_GIT"

    # Step 6: 安装 ripgrep
    Write-Host ""
    Write-Host "--- 步骤 6/12: 安装 ripgrep ---" -ForegroundColor Yellow
    Write-Log "[STEP 6/12] Installing ripgrep"
    
    # 检查 build/ripgrep 是否已解压
    $rgDirs = Get-ChildDirectories -Path $SRC_RG
    if (-not $rgDirs) {
        # 从 packages/ 解压
        Write-Info "build/ripgrep 未找到，从 packages 解压..."
        $rgArchive = Join-Path $PKG_DIR 'ripgrep\ripgrep-14.1.1-x86_64-pc-windows-gnu.zip'
        if (-not (Test-Path $rgArchive)) {
            Write-ErrorExit "ripgrep 安装包缺失（$rgArchive 不存在）"
        }
        Extract-Archive -Archive $rgArchive -Dest $BUILD_DIR -Label "ripgrep 14.1.1"
        # 查找解压后的目录
        $rgDirs = Get-ChildDirectories -Path $SRC_RG
    }
    $rgDir = $null
    if ($rgDirs) {
        $rgDir = $rgDirs | Select-Object -First 1
    }
    if ($rgDir) {
        Copy-Directory -Source $rgDir.FullName -Dest $DST_RG -Label "ripgrep 14.1.1"
    } else {
        Copy-Directory -Source $SRC_RG -Dest $DST_RG -Label "ripgrep 14.1.1"
    }
    Write-Log "[INFO] ripgrep installed to: $DST_RG"

    # Step 7: 安装 FFmpeg
    Write-Host ""
    Write-Host "--- 步骤 7/12: 安装 FFmpeg ---" -ForegroundColor Yellow
    Write-Log "[STEP 7/12] Installing FFmpeg"
    
    # 检查 build/ffmpeg 是否已解压
    $ffDirs = Get-ChildDirectories -Path $SRC_FFMPEG
    if (-not $ffDirs) {
        # 从 packages/ 解压
        Write-Info "build/ffmpeg 未找到，从 packages 解压..."
        $ffArchive = Join-Path $PKG_DIR 'ffmpeg\ffmpeg-master-latest-win64-gpl.zip'
        if (-not (Test-Path $ffArchive)) {
            Write-ErrorExit "FFmpeg 安装包缺失（$ffArchive 不存在）"
        }
        Extract-Archive -Archive $ffArchive -Dest $BUILD_DIR -Label "FFmpeg"
        $ffDirs = Get-ChildDirectories -Path $SRC_FFMPEG
    }
    $ffDir = $null
    if ($ffDirs) {
        $ffDir = $ffDirs | Where-Object { $_.Name -like 'ffmpeg*' } | Select-Object -First 1
    }
    if ($ffDir) {
        $binDir = Join-Path $ffDir.FullName 'bin'
        if (Test-Path $binDir) {
            Copy-Directory -Source $binDir -Dest $DST_FFMPEG -Label "FFmpeg"
        } else {
            Copy-Directory -Source $ffDir.FullName -Dest $DST_FFMPEG -Label "FFmpeg"
        }
    } else {
        Copy-Directory -Source $SRC_FFMPEG -Dest $DST_FFMPEG -Label "FFmpeg"
    }
    Write-Log "[INFO] FFmpeg installed to: $DST_FFMPEG"

    # Step 8: 配置 PATH
    Write-Host ""
    Write-Host "--- 步骤 8/12: 配置 PATH 环境变量 ---" -ForegroundColor Yellow
    Write-Log "[STEP 8/12] Configuring PATH"
    
    $pathDirs = @(
        $DST_PYTHON,
        (Join-Path $DST_PYTHON 'Scripts'),   # hermes.exe 所在目录
        $DST_NODE,
        (Join-Path $DST_GIT 'bin'),
        $DST_RG,
        $DST_FFMPEG
    )
    foreach ($p in $pathDirs) {
        if (Test-Path $p) { Add-ToUserPath -NewPath $p }
    }
    Write-Success "PATH 配置完成（新终端窗口生效，请重启终端后输入 hermes）"
    Write-Log "[INFO] PATH configured"

    # Step 9: 配置 DeepSeek API Key
    Write-Host ""
    Write-Host "--- 步骤 9/12: 配置 DeepSeek API ---" -ForegroundColor Yellow
    Write-Log "[STEP 9/12] Configuring DeepSeek API"
    
    if (-not (Test-Path $APP_DIR)) {
        New-Item -Path $APP_DIR -ItemType Directory -Force | Out-Null
    }

    Write-Host "请输入您的 DeepSeek API Key：" -ForegroundColor Magenta
    Write-Host "  （如无 Key，请访问 https://platform.deepseek.com/ 注册）" -ForegroundColor DarkGray
    $apiKey = Read-Host "  API Key"
    if ([string]::IsNullOrWhiteSpace($apiKey)) {
        $apiKey = "YOUR_DEEPSEEK_API_KEY"
        Write-Warn "未输入 API Key，使用占位符"
        Write-Warn "稍后可编辑 %APPDATA%\ZhinanAI\config.yaml 设置真实 Key"
        Write-Log "[WARN] No API key entered, using placeholder"
    } else {
        Write-Log "[INFO] API key entered (masked)"
    }

    $configContent = @"
# 指南帮 AI 助手 配置文件 v1.2
# 编辑此文件修改 AI 模型配置

app:
  name: "指南帮 AI 助手"
  version: "1.3.0"
  language: "zh-CN"

model:
  provider: "$provider"
  base_url: "$baseUrl"
  model: "$model"
  chat_model: "$chatModel"
  api_key: "$apiKey"

agent:
  default_model: "$model"
  default_provider: "$provider"

paths:
  python: "$DST_PYTHON"
  node: "$DST_NODE"
  git: "$DST_GIT"
  ripgrep: "$DST_RG"
  ffmpeg: "$DST_FFMPEG"

startup:
  auto_start: true
"@

    $configContent | Out-File -FilePath $configFile -Encoding utf8
    Write-Success "配置文件已创建: $configFile"
    Write-Log "[INFO] Config file created: $configFile"

    # Step 10: 创建桌面快捷方式
    Write-Host ""
    Write-Host "--- 步骤 10/12: 创建桌面快捷方式 ---" -ForegroundColor Yellow
    Write-Log "[STEP 10/12] Creating desktop shortcut"
    
    $launcherBat = Join-Path $SCRIPT_ROOT 'scripts\hermes-launcher.bat'
    $desktopLnk = Join-Path $DESKTOP '指南帮 AI 助手.lnk'

    if (Test-Path $launcherBat) {
        try {
            $wshell = New-Object -ComObject WScript.Shell
            $shortcut = $wshell.CreateShortcut($desktopLnk)
            $shortcut.TargetPath = $launcherBat
            $shortcut.WorkingDirectory = $APP_DIR
            $shortcut.Description = '指南帮 AI 助手 - 启动 Hermes Agent (DeepSeek版)'
            $shortcut.IconLocation = "C:\Windows\System32\shell32.dll, 13"
            $shortcut.Save()
            Write-Success "桌面快捷方式已创建"
            Write-Log "[INFO] Desktop shortcut created"
        } catch {
            Write-Warn "创建桌面快捷方式失败: $_"
            Write-Log "[WARN] Desktop shortcut failed: $_"
        }
    } else {
        Write-Warn "未找到启动脚本: $launcherBat"
        Write-Log "[WARN] Launcher not found: $launcherBat"
    }

    # Step 11: 创建开始菜单
    Write-Host ""
    Write-Host "--- 步骤 11/12: 创建开始菜单 ---" -ForegroundColor Yellow
    Write-Log "[STEP 11/12] Creating start menu"
    
    # 验证 STARTMENU 路径
    $startMenuPath = $STARTMENU
    if ([string]::IsNullOrWhiteSpace($startMenuPath)) {
        Write-Warn "开始菜单路径为空，跳过"
        Write-Log "[WARN] STARTMENU path is empty"
    } else {
        # 确保 Programs 目录存在
        $programsDir = [Environment]::GetFolderPath('Programs')
        if (-not (Test-Path $programsDir)) {
            Write-Warn "开始菜单 Programs 目录不存在 ($programsDir)，跳过"
            Write-Log "[WARN] Programs dir not found: $programsDir"
        } else {
            try {
                if (-not (Test-Path $startMenuPath)) {
                    New-Item -Path $startMenuPath -ItemType Directory -Force | Out-Null
                    Write-Info "创建开始菜单目录: $startMenuPath"
                }
                $wshell2 = New-Object -ComObject WScript.Shell
                
                # 启动快捷方式
                $lnkSM = $wshell2.CreateShortcut((Join-Path $startMenuPath '指南帮 AI 助手.lnk'))
                $lnkSM.TargetPath = $launcherBat
                $lnkSM.WorkingDirectory = $APP_DIR
                $lnkSM.Description = '指南帮 AI 助手'
                $lnkSM.IconLocation = "C:\Windows\System32\shell32.dll, 13"
                $lnkSM.Save()

                # 卸载快捷方式
                $uninstallPs1 = Join-Path $SCRIPT_ROOT 'uninstall.ps1'
                if (Test-Path $uninstallPs1) {
                    $lnkUninst = $wshell2.CreateShortcut((Join-Path $startMenuPath '卸载 指南帮 AI 助手.lnk'))
                    $lnkUninst.TargetPath = 'powershell.exe'
                    $lnkUninst.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$uninstallPs1`""
                    $lnkUninst.WorkingDirectory = $APP_DIR
                    $lnkUninst.Description = '卸载 指南帮 AI 助手'
                    $lnkUninst.Save()
                }
                Write-Success "开始菜单已创建"
                Write-Log "[INFO] Start menu created: $startMenuPath"
            } catch {
                Write-Warn "创建开始菜单失败（不影响使用）: $_"
                Write-Log "[WARN] Start menu failed: $_"
            }
        }
    }

    # Step 12: 配置开机自启（非关键步骤，失败不影响使用）
    Write-Host ""
    Write-Host "--- 步骤 12/12: 配置开机自启 ---" -ForegroundColor Yellow
    Write-Log "[STEP 12/12] Configuring auto-start"
    
    if (Test-Path $launcherBat) {
        # 检查 STARTUP 路径是否有效
        $startupPath = $STARTUP
        if ([string]::IsNullOrWhiteSpace($startupPath) -or $startupPath -eq $env:APPDATA) {
            Write-Warn "启动文件夹路径异常 ($startupPath)，跳过开机自启配置"
            Write-Log "[WARN] Invalid STARTUP path: $startupPath"
        } elseif (-not (Test-Path $startupPath)) {
            Write-Warn "启动文件夹不存在 ($startupPath)，跳过开机自启配置"
            Write-Log "[WARN] STARTUP folder missing: $startupPath"
        } else {
            try {
                $wshell3 = New-Object -ComObject WScript.Shell
                $lnkStartup = $wshell3.CreateShortcut((Join-Path $startupPath '指南帮 AI 助手.lnk'))
                $lnkStartup.TargetPath = $launcherBat
                $lnkStartup.WorkingDirectory = $APP_DIR
                $lnkStartup.Description = '指南帮 AI 助手 开机自启'
                $lnkStartup.IconLocation = "C:\Windows\System32\shell32.dll, 13"
                $lnkStartup.Save()
                Write-Success "开机自启已配置"
                Write-Log "[INFO] Auto-start configured: $startupPath"
            } catch {
                Write-Warn "开机自启配置失败（不影响使用，可手动添加）: $_"
                Write-Log "[WARN] Auto-start failed: $_"
            }
        }
    }

} catch {
    # 任何步骤失败，立即退出（修复 Bug 10）
    Write-ErrorExit "安装过程出错: $_"
}

# ========== 安装完成检测 ==========
Write-Host ""
Write-Host "========== 安装完成检测 ==========" -ForegroundColor Yellow
Write-Log "[INFO] Post-install verification"

$allVerified = $true

# 检测 Python
$verifyPython = Join-Path $DST_PYTHON 'python.exe'
if (Test-Path $verifyPython) {
    try {
        $pyVer = & $verifyPython --version 2>&1
        Write-Success "Python: $pyVer"
        Write-Log "[INFO] Python verification: $pyVer"
    } catch {
        Write-Warn "Python 验证失败"
        $allVerified = $false
    }
} else {
    Write-Fail "Python: 未安装"
    $allVerified = $false
}

# 检测 Node
$verifyNode = Join-Path $DST_NODE 'node.exe'
if (Test-Path $verifyNode) {
    try {
        $nodeVer = & $verifyNode --version 2>&1
        Write-Success "Node.js: $nodeVer"
        Write-Log "[INFO] Node.js verification: $nodeVer"
    } catch {
        Write-Warn "Node.js 验证失败"
        $allVerified = $false
    }
} else {
    Write-Fail "Node.js: 未安装"
    $allVerified = $false
}

# 检测 Git
$verifyGit = Join-Path $DST_GIT 'bin\git.exe'
if (Test-Path $verifyGit) {
    try {
        $gitVer = & $verifyGit --version 2>&1
        Write-Success "Git: $gitVer"
        Write-Log "[INFO] Git verification: $gitVer"
    } catch {
        Write-Warn "Git 验证失败"
        $allVerified = $false
    }
} else {
    Write-Fail "Git: 未安装"
    $allVerified = $false
}

# 检测 Hermes
$verifyHermes = Join-Path $DST_PYTHON 'Scripts\hermes.exe'
if (Test-Path $verifyHermes) {
    try {
        $hermesVer = & $verifyHermes --version 2>&1
        Write-Success "Hermes Agent: $hermesVer"
        Write-Log "[INFO] Hermes verification: $hermesVer"
    } catch {
        Write-Warn "Hermes 验证失败"
        $allVerified = $false
    }
} else {
    Write-Warn "Hermes: 未找到 hermes.exe（可能尚未加入 PATH）"
    $allVerified = $false
}

# 检测 ripgrep
$verifyRG = Join-Path $DST_RG 'rg.exe'
if (Test-Path $verifyRG) {
    Write-Success "ripgrep: 已安装"
} else {
    Write-Warn "ripgrep: 未找到"
}

# 检测 FFmpeg
$verifyFF = Join-Path $DST_FFMPEG 'ffmpeg.exe'
if (Test-Path $verifyFF) {
    Write-Success "FFmpeg: 已安装"
} else {
    Write-Warn "FFmpeg: 未找到"
}

# ========== 完成 ==========
$elapsed = (Get-Date) - $START_TIME
$elapsedStr = [math]::Round($elapsed.TotalSeconds, 1)

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
if ($allVerified) {
    Write-Host "  安装完成！所有组件验证通过！" -ForegroundColor Green
} else {
    Write-Host "  安装完成（部分组件验证异常）" -ForegroundColor Yellow
}
Write-Host "  耗时: ${elapsedStr}秒" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "已安装组件：" -ForegroundColor White
Write-Host "  Python 3.11.9"
Write-Host "  Node.js 22.14.0 LTS"
Write-Host "  Git 2.35.5 (MinGit)"
Write-Host "  ripgrep 14.1.1"
Write-Host "  FFmpeg (最新版)"
Write-Host "  Hermes Agent (DeepSeek 版)"
Write-Host ""
Write-Host "配置文件: $configFile" -ForegroundColor Cyan
Write-Host "桌面快捷方式: 指南帮 AI 助手.lnk" -ForegroundColor Cyan
Write-Host "安装日志: $LOG_FILE" -ForegroundColor Cyan
Write-Host ""
Write-Host "首次启动请双击桌面「指南帮 AI 助手」图标。" -ForegroundColor Yellow
Write-Host "如需切换模型，启动后在 Hermes 中输入 /model 选择。" -ForegroundColor Yellow
Write-Host ""

Write-Log "[INFO] Install completed in ${elapsedStr}s, allVerified=$allVerified"

# ========== 记录版本号（用于后续版本更新检测）==========
$verFile = Join-Path $LOCAL_DIR 'version.txt'
"1.3.0" | Out-File $verFile -Encoding UTF8
Write-Log "[INFO] Version recorded: 1.3.0 -> $verFile"


# ========== v1.3 新功能: 诊断报告与批量部署 ==========
# 安装完成后，用户可通过以下工具使用 v1.3 新功能：
#   - diagnose.ps1        一键生成诊断报告（用于排查问题）
#   - gpo-deploy.ps1      企业 GPO 批量部署脚本
#   - mirror.ps1          GitHub 镜像源检测
#   - update.ps1          版本更新检查（launcher 自动调用）

# ========== 复制更新脚本 ==========
$updateScript = Join-Path $SCRIPT_ROOT 'scripts\update.ps1'
if (Test-Path $updateScript) {
    $updateDst = Join-Path $LOCAL_DIR 'update.ps1'
    Copy-Item $updateScript $updateDst -Force
    Write-Log "[INFO] Update script deployed to: $updateDst"
}

Read-Host "按回车键退出"
