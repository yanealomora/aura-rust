@echo off
chcp 65001 >nul
title AURA RUST
cls
node scripts/launcher.js
if errorlevel 1 (
    pause >nul
)
