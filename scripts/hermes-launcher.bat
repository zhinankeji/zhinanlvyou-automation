@echo off
chcp 65001 >nul
title 指南帮 AI 助手 v1.3

set ZHINANAI_HOME=%APPDATA%\ZhinanAI
set HERMES_HOME=%USERPROFILE%\.hermes

set PYTHON_DIR=%LOCALAPPDATA%\ZhinanAI\python
set PYTHON_SCRIPTS=%LOCALAPPDATA%\ZhinanAI\python\Scripts
set NODE_DIR=%LOCALAPPDATA%\ZhinanAI\node
set GIT_DIR=%LOCALAPPDATA%\ZhinanAI\git\bin
set RG_DIR=%LOCALAPPDATA%\ZhinanAI\ripgrep
set FF_DIR=%LOCALAPPDATA%\ZhinanAI\ffmpeg

set PATH=%PYTHON_DIR%;%PYTHON_SCRIPTS%;%NODE_DIR%;%GIT_DIR%;%RG_DIR%;%FF_DIR%;%PATH%

REM ===== 自动检查更新（后台静默）=====
if exist "%LOCALAPPDATA%\ZhinanAI\update.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%LOCALAPPDATA%\ZhinanAI\update.ps1" -CheckOnly
)

REM 如果有可用更新，提示用户
if exist "%LOCALAPPDATA%\ZhinanAI\update_available.flag" (
    echo.
    echo ============================================
    echo   [通知] 指南帮 AI 助手有新版本可用！
    echo   输入 Y 更新，N 跳过
    echo ============================================
    set /p "UPDATE_CHOICE=是否更新? (Y/N): "
    if /i "!UPDATE_CHOICE!"=="Y" (
        powershell -NoProfile -ExecutionPolicy Bypass -File "%LOCALAPPDATA%\ZhinanAI\update.ps1"
    )
    del "%LOCALAPPDATA%\ZhinanAI\update_available.flag"
)

REM ===== 读取配置 =====
if exist "%ZHINANAI_HOME%\config.yaml" (
    for /f "tokens=2 delims= " %%a in ('findstr /i "api_key:" "%ZHINANAI_HOME%\config.yaml"') do set API_KEY=%%a
    for /f "tokens=2 delims= " %%a in ('findstr /i "base_url:" "%ZHINANAI_HOME%\config.yaml"') do set API_BASE_URL=%%a
    for /f "tokens=2 delims= " %%a in ('findstr /i "provider:" "%ZHINANAI_HOME%\config.yaml"') do set API_PROVIDER=%%a
    for /f "tokens=2 delims= " %%a in ('findstr /i "model:" "%ZHINANAI_HOME%\config.yaml"') do set API_MODEL=%%a
)

if "%%API_KEY%%"=="" set API_KEY=YOUR_API_KEY
if "%%API_BASE_URL%%"=="" set API_BASE_URL=https://api.deepseek.com
if "%%API_PROVIDER%%"=="" set API_PROVIDER=deepseek
if "%%API_MODEL%%"=="" set API_MODEL=deepseek-v4-pro

REM ========== 启动画面（公司品牌展示）==========
cls
echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║                                                  ║
echo  ║          海南指南帮科技有限公司                   ║
echo  ║         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~               ║
echo  ║          指南帮 AI 助手 v1.3                     ║
echo  ║          ZhinanAI Assistant                      ║
echo  ║                                                  ║
echo  ║    ___ _   _ ___ _   _    _    ___                ║
echo  ║   |_ _| \ | |_ _| \ | |  / \  |_ _|               ║
echo  ║    | ||  \| || ||  \| | / _ \  | |                ║
echo  ║    | || |\  || || |\  |/ ___ \ | |                ║
echo  ║   |___|_| \_|___|_| \_/_/   \_\___|               ║
echo  ║                                                  ║
echo  ╚══════════════════════════════════════════════════╝
echo.
echo  [配置信息]
echo  模型提供商: %%API_PROVIDER%%
echo  当前模型:   %%API_MODEL%%
echo  API 地址:   %%API_BASE_URL%%
echo.
echo  [状态] 正在启动 Hermes Agent...
echo  ────────────────────────────────────────────────
echo.

hermes chat --provider %%API_PROVIDER%%

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║         指南帮 AI 助手已退出                      ║
echo  ║         如有问题请联系微信: hibeike               ║
echo  ╚══════════════════════════════════════════════════╝
echo.
pause
