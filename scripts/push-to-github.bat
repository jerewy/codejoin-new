@echo off
REM Push repositories to GitHub
REM Make sure you've created the repositories on GitHub first

echo 🚀 Pushing repositories to GitHub
echo ================================

REM Configuration
set GITHUB_USERNAME=jerewy
set FRONTEND_REPO_NAME=codejoin-frontend
set BACKEND_REPO_NAME=codejoin-backend
set SOCKET_REPO_NAME=codejoin-socket

REM Get parent directory
set CURRENT_DIR=%CD%
for %%i in ("%CURRENT_DIR%") do set PARENT_DIR=%%~dpi

set FRONTEND_DIR=%PARENT_DIR%%FRONTEND_REPO_NAME%
set BACKEND_DIR=%PARENT_DIR%%BACKEND_REPO_NAME%
set SOCKET_DIR=%PARENT_DIR%%SOCKET_REPO_NAME%

echo 📁 Repository directories:
echo 🔹 Frontend: %FRONTEND_DIR%
echo 🔹 Backend: %BACKEND_DIR%
echo 🔹 Socket: %SOCKET_DIR%
echo.

echo 1/3: Pushing frontend repository...
cd /d "%FRONTEND_DIR%"
git remote add origin https://github.com/%GITHUB_USERNAME%/%FRONTEND_REPO_NAME%.git
git branch -M main
git push -u origin main
echo ✅ Frontend repository pushed to GitHub

echo.
echo 2/3: Pushing backend repository...
cd /d "%BACKEND_DIR%"
git remote add origin https://github.com/%GITHUB_USERNAME%/%BACKEND_REPO_NAME%.git
git branch -M main
git push -u origin main
echo ✅ Backend repository pushed to GitHub

echo.
echo 3/3: Pushing socket repository...
cd /d "%SOCKET_DIR%"
git remote add origin https://github.com/%GITHUB_USERNAME%/%SOCKET_REPO_NAME%.git
git branch -M main
git push -u origin main
echo ✅ Socket repository pushed to GitHub

echo.
echo 🎉 All repositories have been pushed to GitHub!
echo.
echo Repository URLs:
echo 🔹 Frontend: https://github.com/%GITHUB_USERNAME%/%FRONTEND_REPO_NAME%
echo 🔹 Backend: https://github.com/%GITHUB_USERNAME%/%BACKEND_REPO_NAME%
echo 🔹 Socket: https://github.com/%GITHUB_USERNAME%/%SOCKET_REPO_NAME%
echo.
pause