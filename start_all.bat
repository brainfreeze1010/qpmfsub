@echo off
echo ============================================================
echo  MF Subscription Reconciliation - Starting All Services
echo ============================================================
echo.
echo Starting Backend (port 8000) in a new window...
start "MF Recon - Backend" cmd /k "%~dp0start_backend.bat"

timeout /t 5 /nobreak > nul

echo Starting Frontend (port 5173) in a new window...
start "MF Recon - Frontend" cmd /k "%~dp0start_frontend.bat"

echo.
echo Both services are starting. Check the new windows for status.
echo.
echo  Backend  : http://localhost:8000
echo  API Docs : http://localhost:8000/api/docs
echo  Frontend : http://localhost:5173
echo.
pause
