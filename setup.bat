@echo off
setlocal EnableDelayedExpansion
title Stockazon — Setup

echo.
echo  =====================================================
echo    Stockazon ML  ^|  First-Time Setup
echo  =====================================================
echo.

:: ── Check Node.js ──────────────────────────────────────
echo  [1/3]  Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Node.js is not installed or not in PATH.
    echo.
    echo          Download it from: https://nodejs.org
    echo          Install the LTS version, then re-run setup.bat
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo          Node.js found: !NODE_VER!

:: ── Check npm ──────────────────────────────────────────
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] npm not found. Reinstall Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('npm -v') do set NPM_VER=%%v
echo          npm found: v!NPM_VER!

:: ── Install dependencies ───────────────────────────────
echo.
echo  [2/3]  Installing npm dependencies...
echo         (this may take a minute on first run)
echo.
call npm install
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] npm install failed. Check the output above.
    echo.
    pause
    exit /b 1
)
echo.
echo          Dependencies installed successfully.

:: ── Done ───────────────────────────────────────────────
echo.
echo  [3/3]  Setup complete!
echo.
echo  =====================================================
echo    Everything is ready. Run  run.bat  to start.
echo  =====================================================
echo.
echo  What's included:
echo    - React 18 frontend  (localhost:3000)
echo    - Live price engine  (local, no API key needed)
echo    - ML Backtester      (logistic regression, in-browser)
echo    - AI Price Forecast  (logistic growth model)
echo    - UPI payment modal
echo.
pause
endlocal
