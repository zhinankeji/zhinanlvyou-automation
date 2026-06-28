@echo off
chcp 65001 >nul
title 指南帮 AI 助手 - 安装程序 v1.3

echo ==========================================
echo   指南帮 AI 助手 - 安装程序 v1.3
echo ==========================================
echo.
echo 正在启动安装向导...
echo.

REM 查找 PowerShell
set PS_PATH=%SystemRoot%\system32\WindowsPowerShell\v1.0\powershell.exe
if not exist "%PS_PATH%" set PS_PATH=powershell.exe

"%PS_PATH%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"

echo.
echo 安装程序已退出。
pause
