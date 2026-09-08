@echo off
echo ============================================================
echo  MF Subscription Reconciliation - Backend
echo  FastAPI + Uvicorn on http://localhost:8000
echo  API Docs: http://localhost:8000/api/docs
echo ============================================================

cd /d "%~dp0backend"

:: Create virtual environment if it doesn't exist
if not exist ".venv\Scripts\python.exe" (
    echo Creating Python virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment. Is Python 3.10+ installed?
        pause
        exit /b 1
    )
)

:: Upgrade pip silently (ignore the "use python -m pip" warning)
echo Upgrading pip...
.venv\Scripts\python.exe -m pip install --upgrade pip --quiet 2>nul

:: Install / update dependencies
echo Installing dependencies...
.venv\Scripts\python.exe -m pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo ERROR: Failed to install dependencies. Check requirements.txt.
    pause
    exit /b 1
)

:: Create uploads directory
if not exist "uploads" mkdir uploads

:: Start server
echo.
echo All dependencies installed. Starting FastAPI server...
echo  Backend  : http://localhost:8000
echo  API Docs : http://localhost:8000/api/docs
echo.
.venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

pause
