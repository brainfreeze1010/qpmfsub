@echo off
echo ============================================================
echo  MF Subscription Reconciliation - Frontend
echo  React 18 + Vite 8 on http://localhost:5173
echo ============================================================

cd /d "%~dp0frontend"

:: Install npm packages if node_modules doesn't exist or package.json changed
if not exist "node_modules\vite" (
    echo Installing npm packages...
    npm install
    if errorlevel 1 (
        echo ERROR: npm install failed. Is Node.js installed?
        pause
        exit /b 1
    )
)

:: Start Vite dev server
echo.
echo Starting Vite dev server...
echo  Frontend : http://localhost:5173
echo.
node_modules\.bin\vite.cmd

pause
