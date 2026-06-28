@echo off
chcp 65001 >nul
title 指南帮 AI 助手 - GPO 批量部署 v1.2

REM GPO 启动脚本 - 放在域控制器 SYSVOL 下
REM GPO 路径: Computer Configuration -> Windows Settings -> Scripts -> Startup

set LOG_DIR=C:\Windows\Logs\ZhinanAI
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0gpo-deploy.ps1" -SILENT -LOG "%LOG_DIR%\deploy.log"

exit /b %ERRORLEVEL%