@echo off
chcp 65001 >nul
title 指南帮 AI 助手 - 诊断工具 v1.2

echo ==========================================
echo   指南帮 AI 助手 - 诊断工具 v1.2
echo ==========================================
echo.
echo 正在收集诊断信息...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0diagnose.ps1"

echo.
echo 诊断工具已退出。
pause