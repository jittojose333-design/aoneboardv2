@echo off
echo Starting NREGA Scraper Service on Port 10000...
cd /d "%~dp0"
npm install
node index.js
pause
