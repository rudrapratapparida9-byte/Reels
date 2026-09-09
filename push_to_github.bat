@echo off
title Push ReelsVault to GitHub
cd /d "%~dp0"
echo =======================================================
echo Pushing updated ReelsVault code to GitHub...
echo =======================================================
"C:\Users\rudra\AppData\Local\MinGit\cmd\git.exe" push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Code pushed to GitHub successfully!
    echo Render will now automatically deploy the updates to https://reelsvault.onrender.com/ in ~1-2 minutes.
) else (
    echo [NOTE] If prompted for password, use a GitHub Personal Access Token (classic) with 'repo' scope.
)
echo.
pause
