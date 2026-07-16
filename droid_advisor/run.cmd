@echo off
set "ROOT=%~dp0"
cd /d "%ROOT%.."
start "Droid Advisor" /b "%ROOT%.venv\Scripts\pythonw.exe" -m droid_advisor.app
exit /b 0
