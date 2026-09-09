@echo off
title ReelsVault - Stop Website
echo Stopping ReelsVault background processes...

taskkill /F /IM cloudflared.exe >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq ReelsVault Server*" >nul 2>&1
powershell -Command "Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like '*ReelsVault*' } | Stop-Process -Force"

echo Website stopped successfully.
pause
