@echo off
title Aone V2 Scraper (India Proxy)
color 0A

echo ==================================================
echo   AONE BOARD V2 - NREGA SCRAPER (LOCAL MODE)
echo ==================================================
echo.
echo   Since NREGA blocks outside connections, we run 
echo   this scraper LOCALLY on your PC (Indian IP).
echo.
echo   Your Vercel App will talk to this window.
echo   KEEP THIS WINDOW OPEN while using "Auto Fetch".
echo.
echo ==================================================
echo.

cd v2_app/scraper_backend
npm install
node index.js
pause
