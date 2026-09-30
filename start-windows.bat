@echo off
REM Start WeBook on Windows.
REM   start-windows.bat          -> desktop app if it is ready, otherwise the browser version (instant)
REM   start-windows.bat desktop  -> desktop app (downloads the ~100 MB Electron runtime once)
REM   start-windows.bat web      -> browser version at http://localhost:8080
REM Slow download? First run:  set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required for the desktop app: https://nodejs.org/
  echo Opening the book in your browser instead...
  start "" "%~dp0src\index.html"
  exit /b 0
)

if /i "%~1"=="web" goto web
if /i "%~1"=="desktop" goto desktop
if exist node_modules\electron\path.txt goto desktop
echo The desktop runtime is not downloaded yet, so WeBook is opening in your browser now.
echo To get the desktop app later (one-time ~100 MB download), run:  start-windows.bat desktop
echo.

:web
node scripts\serve.js 8080 --open
exit /b 0

:desktop
if not exist node_modules\electron (
  echo Installing WeBook ^(first run only^)...
  call npm install
)
call npx electron .
