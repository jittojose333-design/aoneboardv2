@echo off
echo ===================================================
echo   AONE BOARD PORTABLE LAUNCHER
echo ===================================================

echo.
echo 1. Checking for Portable Node.js...
if exist "bin\node.exe" (
   echo    [OK] Found Portable Node in /bin
   set "PATH=%~dp0bin;%PATH%"
) else (
   echo    [INFO] Using System Node.js
)

echo 2. Installing Local Dependencies (First Run Only)...
if not exist "node_modules" (
    call npm install --omit=dev --no-audit --no-fund
)

echo 3. Starting Application...
echo    Open http://localhost:3000 in your browser if it doesn't open automatically.
echo.
start http://localhost:3000
call npm run dev
pause
