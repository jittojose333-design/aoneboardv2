@echo off
echo Checking for Git...
git --version
if %errorlevel% neq 0 (
    echo Git is not found in the system PATH.
    echo Please run this script from "Git Bash" or a terminal where Git is installed.
    pause
    exit /b
)

echo.
echo Adding all changes...
git add .

echo.
echo Committing changes...
git commit -m "feat: Prepare V2 for Vercel Deployment (Master Key, Scraper, filters)"

echo.
echo pushing to origin...
git push

echo.
echo DONE! You can now go to Vercel Dashboard and Import this project.
pause
