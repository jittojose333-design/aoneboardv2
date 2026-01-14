@echo off
echo Fixing Git State (Removing node_modules from commit)...

rem Unstage everything
git reset

echo.
echo Re-Adding files (respecting .gitignore)...
git add .

echo.
echo Committing...
git commit -m "feat: Initial V2 Upload (Clean)"

echo.
echo Pushing to GitHub (Force push to overwrite bad history)...
git push -u origin main --force

echo.
echo Done! Now you can import 'aoneboardv2' on Vercel.
pause
