@echo off
REM Start WeBook on Windows.
REM   start-windows.bat       -> desktop app (Electron)
REM   start-windows.bat web   -> open in your browser instead
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required: https://nodejs.org/
  echo Opening the book in your browser instead...
  start "" "%~dp0src\index.html"
  exit /b 0
)

if /i "%~1"=="web" (
  start "" http://localhost:8080
  node scripts\serve.js 8080
  exit /b 0
)

if not exist node_modules\electron (
  echo Installing WeBook ^(first run only^)...
  call npm install
)
call npx electron .
