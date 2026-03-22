@echo off
setlocal EnableDelayedExpansion
title Stockazon — Running

echo.
echo  =====================================================
echo    Stockazon ML  ^|  Starting Dev Server
echo  =====================================================
echo.

:: ── Verify node_modules exists ─────────────────────────
if not exist "node_modules\" (
    echo  [!] node_modules not found.
    echo      Run setup.bat first, then try again.
    echo.
    pause
    exit /b 1
)

:: ── Check Node.js ──────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found in PATH.
    echo          Download from: https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: ── Launch ─────────────────────────────────────────────
echo  Starting React dev server...
echo.
echo  ┌─────────────────────────────────────────────────┐
echo  │                                                  │
echo  │   App will open at:  http://localhost:3000       │
echo  │                                                  │
echo  │   Press  Ctrl + C  in this window to stop.      │
echo  │                                                  │
echo  └─────────────────────────────────────────────────┘
echo.
echo  Features:
echo    🔮  AI Forecast     — click any stock → Tools ^ → AI Forecast
echo    📊  ML Backtester   — click any stock → Tools ^ → ML Backtester
echo    📱  UPI Payments    — fully simulated checkout flow
echo.

:: ── Open browser after a short delay ──────────────────
timeout /t 4 /nobreak >nul
start "" "http://localhost:3000"

:: ── Start the server (blocking) ───────────────────────
call npm start

:: ── If npm start exits ─────────────────────────────────
echo.
echo  Server stopped.
pause
endlocal
