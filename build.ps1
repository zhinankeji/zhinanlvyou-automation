<#
.SYNOPSIS
    指南帮 AI 助手 — 构建脚本
.DESCRIPTION
    下载依赖包、解压组件、生成依赖锁文件、编译安装程序
#>

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# ---------- 路径 ----------
$ROOT    = Split-Path -Parent $MyInvocation.MyCommand.Definition
$BUILD   = Join-Path $ROOT 'build'
$PKG     = Join-Path $ROOT 'packages'
$OUTPUT  = Join-Path $ROOT 'output'
$CURL    = 'C:\Windows\System32\curl.exe'

# 各组件版本
$PYTHON_VER   = '3.11.9'
$NODE_VER     = '22.14.0'
$GIT_VER      = '2.35.5'
$RG_VER       = '14.1.1'
$HERMES_VER   = '0.17.0'

# ---------- 帮助函数 ----------
function Write-Step {
    param([string]$Msg)
    Write-Host ">>> $Msg" -ForegroundColor Cyan
}

function Test-Command {
    param([string]$Exe)
    return (Get-Command $Exe -ErrorAction SilentlyContinue) -ne $null
}

function New-DirIfMissing {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        New-Item -Path $Path -ItemType Directory -Force | Out-Null
    }
}

function Get-FileSHA256 {
    param([string]$Path)
    if (Test-Path $Path) {
        return (Get-FileHash -Path $Path -Algorithm SHA256).Hash.ToLower()
    }
    return $null
}

function Invoke-Download {
    param([string]$Url, [string]$OutFile)
    $parent = Split-Path $OutFile -Parent
    New-DirIfMissing $parent
    if (-not (Test-Path $OutFile)) {
        Write-Step "下载: $Url"
        if (Test-Command 'curl.exe') {
            & $CURL -L -o "$OutFile" "$Url" --ssl-no-revoke 2>$null
        } else {
            $wc = New-Object System.Net.WebClient
            $wc.DownloadFile($Url, $OutFile)
        }
    } else {
        Write-Step "已存在: $OutFile"
    }
}

function Expand-ArchiveEx {
    param([string]$Archive, [string]$Dest)
    New-DirIfMissing $Dest
    $ext = [System.IO.Path]::GetExtension($Archive).ToLower()
    Write-Step "解压: $Archive -> $Dest"
    if ($ext -eq '.zip') {
        if (Test-Command 'tar.exe') {
            tar -xf "$Archive" -C "$Dest" 2>$null
        } else {
            Expand-Archive -Path "$Archive" -DestinationPath "$Dest" -Force
        }
    } elseif (($ext -eq '.7z') -or ($Archive -like '*.7z.exe')) {
        if (Test-Command '7z.exe') {
            & 7z x "$Archive" -o"$Dest" -y | Out-Null
        } else {
            Write-Warning "未找到 7z.exe，跳过解压: $Archive"
            Write-Warning "请从 https://www.7-zip.org/ 安装 7-Zip"
        }
    } else {
        Write-Warning "未知压缩格式: $ext"
    }
}

# ========== 主流程 ==========
Write-Host "==========================================" -ForegroundColor Green
Write-Host "   指南帮 AI 助手 - 构建脚本 v1.0" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

# 1. 创建目录结构
Write-Step "1/7: 创建目录结构"
$dirs = @(
    "$BUILD\python", "$BUILD\node", "$BUILD\git",
    "$BUILD\rg", "$BUILD\ffmpeg", "$BUILD\hermes",
    "$PKG\python", "$PKG\node", "$PKG\git",
    "$PKG\rg", "$PKG\ffmpeg", "$PKG\hermes",
    "$OUTPUT"
)
foreach ($d in $dirs) { New-DirIfMissing $d }

# 2. 下载所有依赖包
Write-Step "2/7: 下载依赖包"

Invoke-Download -Url "https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip" `
                -OutFile "$PKG\python\python-$PYTHON_VER-embed-amd64.zip"

Invoke-Download -Url "https://nodejs.org/dist/v$NODE_VER/node-v$NODE_VER-win-x64.zip" `
                -OutFile "$PKG\node\node-v$NODE_VER-win-x64.zip"

Invoke-Download -Url "https://github.com/git-for-windows/git/releases/download/v$GIT_VER.windows.1/PortableGit-$GIT_VER-64-bit.7z.exe" `
                -OutFile "$PKG\git\PortableGit-$GIT_VER-64-bit.7z.exe"

Invoke-Download -Url "https://github.com/BurntSushi/ripgrep/releases/download/$RG_VER/ripgrep-$RG_VER-x86_64-pc-windows-gnu.zip" `
                -OutFile "$PKG\rg\ripgrep-$RG_VER-x86_64-pc-windows-gnu.zip"

Invoke-Download -Url "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip" `
                -OutFile "$PKG\ffmpeg\ffmpeg-master-latest-win64-gpl.zip"

# 3. 解压各组件到 build\
Write-Step "3/7: 解压组件"
Expand-ArchiveEx -Archive "$PKG\python\python-$PYTHON_VER-embed-amd64.zip" -Dest "$BUILD\python"
Expand-ArchiveEx -Archive "$PKG\node\node-v$NODE_VER-win-x64.zip"         -Dest "$BUILD\node"
Expand-ArchiveEx -Archive "$PKG\git\PortableGit-$GIT_VER-64-bit.7z.exe"  -Dest "$BUILD\git"
Expand-ArchiveEx -Archive "$PKG\rg\ripgrep-$RG_VER-x86_64-pc-windows-gnu.zip" -Dest "$BUILD\rg"
Expand-ArchiveEx -Archive "$PKG\ffmpeg\ffmpeg-master-latest-win64-gpl.zip"           -Dest "$BUILD\ffmpeg"

# 4. 下载 get-pip.py
Write-Step "4/7: 下载 pip 引导程序"
Invoke-Download -Url "https://bootstrap.pypa.io/get-pip.py" `
                -OutFile "$PKG\hermes\get-pip.py"

# 5. 下载 Hermes Agent wheel 及依赖
Write-Step "5/7: 下载 Hermes Agent"
$pythonEmbed = Get-ChildItem "$BUILD\python\python.exe" -Recurse | Select-Object -First 1
if ($pythonEmbed) {
    Write-Step "使用嵌入式 Python 下载 Hermes"
    & $pythonEmbed.FullName "$PKG\hermes\get-pip.py" --no-warn-script-location 2>$null
    & $pythonEmbed.FullName -m pip download hermes-agent -d "$PKG\hermes" --only-binary=:all: 2>$null
} else {
    Write-Warning "未找到嵌入式 Python，使用系统 pip"
    pip download hermes-agent -d "$PKG\hermes" --only-binary=:all: 2>$null
}

# 6. 生成 dependencies.lock.json
Write-Step "6/7: 生成 dependencies.lock.json"
$lockObj = @{
    version = "1.0"
    created = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssK")
    packages = @()
}
$pkgFiles = Get-ChildItem -Path $PKG -Recurse -File | Where-Object { $_.Extension -in '.zip','.7z','.exe','.whl','.py' }
foreach ($f in $pkgFiles) {
    $hash = Get-FileSHA256 -Path $f.FullName
    $lockObj.packages += @{
        name    = $f.Name
        path    = $f.FullName.Replace($ROOT, '.').Replace('\', '/')
        size    = $f.Length
        sha256  = $hash
    }
}
$lockJson = $lockObj | ConvertTo-Json -Depth 4
$lockJson | Out-File -FilePath (Join-Path $ROOT 'dependencies.lock.json') -Encoding utf8
Write-Step "   -> dependencies.lock.json 已生成"

# 7. 检查 Inno Setup 并编译
Write-Step "7/7: 编译安装程序"
$isccPaths = @(
    "${env:ProgramFiles(x86)}\Inno Setup 6\iscc.exe",
    "${env:ProgramFiles}\Inno Setup 6\iscc.exe",
    "${env:ProgramFiles(x86)}\Inno Setup 5\iscc.exe",
    "${env:ProgramFiles}\Inno Setup 5\iscc.exe"
)
$isccFound = $false
foreach ($p in $isccPaths) {
    if (Test-Path $p) {
        $isccFound = $true
        Write-Step "   找到 iscc: $p"
        $issFile = Join-Path $ROOT 'installer\ZhinanAI_Setup_v1.0.iss'
        if (Test-Path $issFile) {
            Write-Step "   编译安装程序..."
            & $p "/O$OUTPUT" "/FZhinanAI_Setup_v1.0" $issFile
        } else {
            Write-Warning "   未找到 .iss 文件，跳过编译"
        }
        break
    }
}
if (-not $isccFound) {
    Write-Warning "   未安装 Inno Setup，跳过编译步骤"
    Write-Warning "   请从 https://jrsoftware.org/isdl.php 下载 Inno Setup 6"
}

# 最终输出
Write-Step "构建完成"
$outputExe = Join-Path $OUTPUT 'ZhinanAI_Setup_v1.0.exe'
if (Test-Path $outputExe) {
    Write-Host "   安装包: $outputExe" -ForegroundColor Green
    Write-Host "   大小: $((Get-Item $outputExe).Length / 1MB -as [int]) MB" -ForegroundColor Green
} else {
    Write-Host "   安装包未生成（Inno Setup 未安装）" -ForegroundColor Yellow
    Write-Host "   所有依赖已下载到 packages/ 目录" -ForegroundColor Yellow
    Write-Host "   在目标机器上可直接运行 install.ps1 完成安装" -ForegroundColor Yellow
}

Write-Host "==========================================" -ForegroundColor Green
Write-Host "   构建脚本执行完毕" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
