@echo off
title Aone Scraper (Portable Mode)
color 0A

echo ==================================================
echo   AONE BOARD - PORTABLE SCRAPER
echo ==================================================
echo.
echo   1. Installing requirements... (First time only)
call npm install
echo.
echo   2. Starting Scraper...
echo   Keep this window open to allow fetching.
echo.
echo ==================================================
node index.js
pause
