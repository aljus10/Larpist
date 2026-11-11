@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Earthtone Studio needs Node.js on PATH.
  echo Install the Node.js LTS release, then run this file again.
  pause
  exit /b 1
)
node tools\server.mjs
pause
