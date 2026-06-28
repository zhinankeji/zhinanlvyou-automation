<#
.SYNOPSIS
    指南帮 AI 助手 — 首次运行配置向导
.DESCRIPTION
    检查 DeepSeek API Key 配置，引导用户完成初始设置
#>

# ========== 编码设置 ==========
chcp 65001 > $null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'

$APP_DIR = Join-Path $env:APPDATA 'ZhinanAI'
$configFile = Join-Path $APP_DIR 'config.yaml'

Write-Host "==========================================" -ForegroundColor Green
Write-Host "   指南帮 AI 助手 - 首次运行向导" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# 检查配置文件
if (-not (Test-Path $configFile)) {
    Write-Host "未检测到配置文件，正在创建..." -ForegroundColor Yellow
    # 引导用户输入
    Write-Host "请输入您的 DeepSeek API Key：" -ForegroundColor Cyan
    Write-Host "  (如无 Key，请访问 https://platform.deepseek.com/ 注册)" -ForegroundColor DarkGray
    $apiKey = Read-Host "  API Key"
    
    if ([string]::IsNullOrWhiteSpace($apiKey)) {
        Write-Host "未输入 API Key，跳过配置。" -ForegroundColor Yellow
        Write-Host "稍后可编辑 %APPDATA%\ZhinanAI\config.yaml 手动配置。" -ForegroundColor Yellow
    } else {
        $configContent = @"
app:
  name: "指南帮 AI 助手"
  version: "1.0.0"
deepseek:
  api_key: "$apiKey"
  base_url: "https://api.deepseek.com"
  model: "deepseek-v4-pro"
agent:
  default_model: "deepseek-v4-pro"
  default_provider: "deepseek"
"@
        $configContent | Out-File -FilePath $configFile -Encoding utf8
        Write-Host "配置已保存！" -ForegroundColor Green
        Write-Host "配置文件: $configFile" -ForegroundColor Cyan
    }
} else {
    Write-Host "配置文件已存在: $configFile" -ForegroundColor Green
    # 检查是否配置了 Key
    $configText = Get-Content $configFile -Raw
    if ($configText -match 'YOUR_DEEPSEEK_API_KEY') {
        Write-Host "检测到 API Key 未设置（仍为占位符）" -ForegroundColor Yellow
        $reconfigure = Read-Host "是否现在设置 API Key？(Y/N)"
        if ($reconfigure -eq 'Y' -or $reconfigure -eq 'y') {
            $newKey = Read-Host "请输入 DeepSeek API Key"
            $configText = $configText -replace 'YOUR_DEEPSEEK_API_KEY', $newKey
            $configText | Out-File -FilePath $configFile -Encoding utf8
            Write-Host "API Key 已更新！" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "启动 Hermes Agent..." -ForegroundColor Green
Write-Host "输入 /model 选择 provider=deepseek，模型=deepseek-v4-pro" -ForegroundColor Yellow
Start-Sleep -Seconds 2
