@echo off
echo ========================================================
echo   Creating AONE PORTABLE BUNDLE
echo ========================================================

set TARGET_DIR=portable_build\AoneBoard_Portable
set APP_DIR=%CD%

echo 1. Cleaning old build...
if exist "%TARGET_DIR%" rmdir /s /q "%TARGET_DIR%"
mkdir "%TARGET_DIR%"

echo 2. Copying Application Files...
xcopy /E /I /Y "app" "%TARGET_DIR%\app"
xcopy /E /I /Y "public" "%TARGET_DIR%\public"
xcopy /E /I /Y "components" "%TARGET_DIR%\components"
xcopy /E /I /Y "lib" "%TARGET_DIR%\lib"
xcopy /E /I /Y "utils" "%TARGET_DIR%\utils"
xcopy /E /I /Y "types" "%TARGET_DIR%\types"
copy "package.json" "%TARGET_DIR%\"
copy "next.config.mjs" "%TARGET_DIR%\"
copy "tsconfig.json" "%TARGET_DIR%\"
copy "tailwind.config.ts" "%TARGET_DIR%\"
copy "postcss.config.mjs" "%TARGET_DIR%\"

echo 3. Creating Startup Script...
(
echo @echo off
echo echo Starting Aone Board Portable...
echo echo Please wait while we initialize the local server...
echo.
echo REM Use the bundled Node if available, else attempt system node
echo if exist "bin\node.exe" (
echo    set "PATH=%%~dp0bin;%%PATH%%"
echo )
echo.
echo echo Installing dependencies locally...
echo call npm install --omit=dev --no-audit --no-fund
echo.
echo echo Launching App...
echo start http://localhost:3000
echo call npm run dev
echo pause
) > "%TARGET_DIR%\Start-Aone-Portable.bat"

echo.
echo ========================================================
echo   PORTABLE BUILD CREATED AT: %TARGET_DIR%
echo ========================================================
echo.
echo IMPORTANT INSTRUCTIONS FOR USB STICK:
echo 1. Download the 'Node.js Binary' (node.exe) from nodejs.org.
echo 2. Create a folder named 'bin' inside 'AoneBoard_Portable'.
echo 3. Put 'node.exe' inside that 'bin' folder.
echo 4. Copy the whole 'AoneBoard_Portable' folder to your USB.
echo.
pause
