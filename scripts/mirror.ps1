<#
.SYNOPSIS
    指南帮 AI 助手 — 镜像加速检测脚本 v1.2
.DESCRIPTION
    检测用户网络到各镜像源的延迟，自动选择最快的源
    结果保存到 %APPDATA%\ZhinanAI\mirror.json
#>

# ========== 编码设置 ==========
chcp 65001 > $null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ErrorActionPreference = 'SilentlyContinue'

# ---------- 镜像源配置 ----------
$mirrors = @{
    python = @(
        @{url="https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip"; name="Python.org"}
        @{url="https://mirrors.aliyun.com/python-release/windows/3.11.9/python-3.11.9-embed-amd64.zip"; name="阿里云"}
    )
    node = @(
        @{url="https://nodejs.org/dist/v22.14.0/node-v22.14.0-win-x64.zip"; name="Nodejs.org"}
        @{url="https://mirrors.huaweicloud.com/nodejs/v22.14.0/node-v22.14.0-win-x64.zip"; name="华为云"}
        @{url="https://npmmirror.com/mirrors/node/v22.14.0/node-v22.14.0-win-x64.zip"; name="NPMMirror"}
    )
    pip = @(
        @{url="https://pypi.org/simple/"; name="PyPI.org"}
        @{url="https://mirrors.aliyun.com/pypi/simple/"; name="阿里云PyPI"}
        @{url="https://pypi.tuna.tsinghua.edu.cn/simple/"; name="清华TUNA"}
    )
    github = @(
        @{url="https://github.com"; name="GitHub.com"}
        @{url="https://mirror.ghproxy.com/https://github.com"; name="GHProxy"}
    )
}

# ---------- 帮助函数 ----------
function Write-Info    { Write-Host "[信息] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[成功] $args" -ForegroundColor Green }
function Write-Warn    { Write-Host "[警告] $args" -ForegroundColor Yellow }

function Test-MirrorLatency {
    param([string]$Url, [int]$TimeoutSeconds = 5)
    try {
        $req = [System.Net.WebRequest]::Create($Url)
        $req.Method = 'HEAD'
        $req.Timeout = $TimeoutSeconds * 1000
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $resp = $req.GetResponse()
        $sw.Stop()
        $resp.Close()
        return $sw.ElapsedMilliseconds
    } catch {
        return $null
    }
}

# ========== 主流程 ==========
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "   指南帮 AI 助手 - 镜像加速检测 v1.2" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

$results = @{}

foreach ($category in $mirrors.Keys) {
    Write-Host "--- 检测 $category 镜像 ---" -ForegroundColor Yellow
    $best = $null
    $bestLatency = [int]::MaxValue
    
    foreach ($mirror in $mirrors[$category]) {
        Write-Info "  测试 $($mirror.name): $($mirror.url)"
        $latency = Test-MirrorLatency -Url $mirror.url
        if ($latency -ne $null) {
            Write-Info "    延迟: ${latency}ms"
            if ($latency -lt $bestLatency) {
                $bestLatency = $latency
                $best = $mirror
            }
        } else {
            Write-Warn "    超时/不可达"
        }
    }
    
    if ($best) {
        Write-Success "  $category 最佳镜像: $($best.name) (${bestLatency}ms)"
        $results[$category] = @{
            best = $best.name
            url = $best.url
            latency_ms = $bestLatency
        }
    } else {
        Write-Warn "  $category 无可达镜像"
        $results[$category] = @{
            best = "默认"
            url = $mirrors[$category][0].url
            latency_ms = -1
        }
    }
    Write-Host ""
}

# 保存结果
$appDir = Join-Path $env:APPDATA 'ZhinanAI'
if (-not (Test-Path $appDir)) {
    New-Item -Path $appDir -ItemType Directory -Force | Out-Null
}
$resultFile = Join-Path $appDir 'mirror.json'
$results | ConvertTo-Json | Out-File -FilePath $resultFile -Encoding UTF8

Write-Success "检测结果已保存: $resultFile"
Write-Host ""
Write-Host "推荐配置："
Write-Host "  pip: $($results.pip.url)" -ForegroundColor Cyan
Write-Host "  GitHub: $($results.github.url)" -ForegroundColor Cyan
Write-Host ""

Read-Host "按回车键退出"