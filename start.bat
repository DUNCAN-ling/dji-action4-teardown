@echo off
setlocal
cd /d "%~dp0"

netstat -ano | findstr ":8899" >nul
if not errorlevel 1 (
  echo Server already running at http://127.0.0.1:8899/
  start "" explorer http://127.0.0.1:8899/
  goto :eof
)

where python >nul 2>nul
if %errorlevel%==0 (
  echo Serving DJI Action 4 teardown at http://127.0.0.1:8899/
  echo Keep this window open while using the page.
  start "" cmd /c "timeout /t 2 >nul & explorer http://127.0.0.1:8899/"
  python -m http.server 8899 --bind 127.0.0.1
  goto :eof
)

where py >nul 2>nul
if %errorlevel%==0 (
  echo Serving DJI Action 4 teardown at http://127.0.0.1:8899/
  echo Keep this window open while using the page.
  start "" cmd /c "timeout /t 2 >nul & explorer http://127.0.0.1:8899/"
  py -m http.server 8899 --bind 127.0.0.1
  goto :eof
)

echo Python was not found. Install Python or run any static file server in this folder,
echo then open http://127.0.0.1:8899/
pause
