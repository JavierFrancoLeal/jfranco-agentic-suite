@echo off
rem DSH Assistant - Windows double-click launcher. Created by J.Franco. MIT.
rem Runs the suite autonomously (campo profile) and opens the result in Notepad.
setlocal
set "DSH=%LOCALAPPDATA%\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd"
if not exist "%DSH%" set "DSH=C:\Program Files\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd"
if not exist "%DSH%" (
  echo DeepSeek Harness not found. Install it first.
  pause
  exit /b 1
)
set /p INPUT=What do you need? (speak or type, starting with 'listen'):
if "%INPUT%"=="" exit /b 0
"%DSH%" --profile campo headless "%INPUT%" > "%USERPROFILE%\Desktop\DSH-Result.txt" 2>&1
start notepad "%USERPROFILE%\Desktop\DSH-Result.txt"
