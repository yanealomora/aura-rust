@echo off
chcp 65001 >nul
title AURA RUST
color 0F

cls
echo.
echo [95m     █████╗ ██╗   ██╗██████╗  █████╗     ██████╗ ██╗   ██╗███████╗████████╗[0m
echo [96m    ██╔══██╗██║   ██║██╔══██╗██╔══██╗    ██╔══██╗██║   ██║██╔════╝╚══██╔══╝[0m
echo [93m    ███████║██║   ██║██████╔╝███████║    ██████╔╝██║   ██║███████╗   ██║[0m
echo [92m    ██╔══██║██║   ██║██╔══██╗██╔══██║    ██╔══██╗██║   ██║╚════██║   ██║[0m
echo [94m    ██║  ██║╚██████╔╝██║  ██║██║  ██║    ██║  ██║╚██████╔╝███████║   ██║[0m
echo [97m    ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝    ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝[0m
echo.
echo [95m                              Premium Rust+ Tool[0m
echo.

echo [96mChecking Node.js...[0m
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [93mNode.js not found![0m
    pause
    exit /b 1
)

echo [92mChecking packages...[0m
if not exist "node_modules" (
    echo [94mInstalling...[0m
    npm install >nul 2>&1
)

echo [95mLoading config...[0m
if not exist ".env" (
    echo [93mConfig missing![0m
    pause
    exit /b 1
)

echo.
echo [97mStarting AURA RUST...[0m
echo.

node src/index.js

echo.
echo [93mStopped. Press any key to restart...[0m
pause >nul
goto :eof