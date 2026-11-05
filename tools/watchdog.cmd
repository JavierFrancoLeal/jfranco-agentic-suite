@echo off
rem Fanal watchdog for Windows — the supervisor never stays dead.
rem Usage: watchdog.cmd   (run from the repo root)
set ROOT=%~dp0..
set NODE=node
set PORT=8790
set DATA=%USERPROFILE%\.dsh\supervisor-data
:loop
echo [watchdog] starting the supervisor…
set DSH_SUPERVISOR_DATA=%DATA%
set PORT=%PORT%
"%NODE%" "%ROOT%\supervisor\server.js" --lan
echo [watchdog] the supervisor exited — restarting in 3 s
timeout /t 3 /nobreak >nul
goto loop
