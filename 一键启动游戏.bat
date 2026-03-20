@echo off
title NBA Career Simulator - Starter
echo Checking environment...

where npx >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [Node.js Found] Starting local server using npx serve...
    start http://localhost:3000/nba-career-simulator.html
    npx serve . -p 3000
    pause
    exit
)

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [Python Found] Starting local server using python http.server...
    start http://localhost:8000/nba-career-simulator.html
    python -m http.server 8000
    pause
    exit
)

echo [Error] Node.js or Python not found.
echo Please install Node.js from https://nodejs.org/ to run the server.
pause
