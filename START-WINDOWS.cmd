@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Earthtone Studio needs Node.js on PATH.
  echo Install the Node.js LTS release, then run this file again.
  pause
  exit /b 1
)
echo Starting EarthTune Studio...
echo Your browser will open when the server is ready.
echo Keep this window open while using the app. You can minimize it.
echo.
node tools\server.mjs
echo.
echo The server has stopped. See any error above.
pause
