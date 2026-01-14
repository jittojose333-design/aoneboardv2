@echo off
echo ===========================================
echo FULL RESET & DEPLOY SCRIPT
echo ===========================================

echo.
echo 1. Removing old Git history (wiping .git folder)...
rmdir /s /q .git

echo.
echo 2. Re-initializing Git...
git init
git branch -M main
git config user.email "deploy@aoneboard.com"
git config user.name "Aone Deployer"

echo.
echo 3. Adding files (ignoring cloud-version)...
git add .

echo.
echo 4. Committing Clean State...
git commit -m "feat: Vercel Ready (Clean Upload)"

echo.
echo 5. Linking Remote...
git remote add origin https://github.com/jittojose333-design/aoneboardv2.git

echo.
echo 6. Force Pushing (Overwriting remote)...
git push -u origin main --force

echo.
echo ===========================================
echo DONE! Check Vercel now.
echo ===========================================
pause
