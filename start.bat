@echo off
setlocal
chcp 65001 >nul
title PhysioVision

cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm was not found. Install Node.js 18 or newer.
    exit /b 1
)

if not exist "node_modules\" (
    echo Installing frontend dependencies...
    call npm install --legacy-peer-deps
    if errorlevel 1 exit /b 1
)

echo Starting PhysioVision frontend at http://localhost:3000
echo Press Ctrl+C to stop it.
call npm run dev
