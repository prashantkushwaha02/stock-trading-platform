@echo off
title ZenTrade Launcher
echo ====================================================
echo             ZENTRADE PLATFORM LAUNCHER
echo ====================================================
echo.
echo [1/3] Starting Flask Backend Server (Port 5000)...
start "ZenTrade Backend" cmd /k "cd backend && python run.py"

echo [2/3] Starting Frontend HTTP Server (Port 8000)...
start "ZenTrade Frontend" cmd /k "cd frontend && python -m http.server 8000"

echo [3/3] Launching Default Browser to http://localhost:8000...
timeout /t 3 /nobreak >nul
start http://localhost:8000

echo.
echo ====================================================
echo Platform active! Keep the separate windows running.
echo To close, exit this window and the spawned terminal shells.
echo ====================================================
echo.
pause
