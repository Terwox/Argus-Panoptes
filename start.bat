@echo off
cd /d "%~dp0"
set PATH=%~dp0node_modules\.bin;C:\Program Files\nodejs;%PATH%

echo Starting Argus server on :4242...
start "Argus Server" cmd /k "cd /d %~dp0 && tsx watch server/index.ts"

echo Starting Argus client on :5173...
start "Argus Client" cmd /k "cd /d %~dp0 && vite client"

timeout /t 3 /noq >nul
start "" "http://localhost:5173"

echo Argus is running. Close the server/client windows to stop.
