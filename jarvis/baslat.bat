@echo off
chcp 65001 >nul
title JARVIS
cd /d "%~dp0"
where python >nul 2>nul || (echo Python bulunamadi. https://www.python.org/downloads/ adresinden kur, "Add Python to PATH" kutusunu isaretle. & pause & exit /b 1)
if not exist ".venv\Scripts\python.exe" (
  echo Ilk kurulum: gerekenler indiriliyor, bir kez surer...
  python -m venv .venv
  ".venv\Scripts\python.exe" -m pip install --upgrade pip -q
  ".venv\Scripts\python.exe" -m pip install -r requirements.txt -q
  ".venv\Scripts\python.exe" -m playwright install chromium
)
".venv\Scripts\python.exe" jarvis.py %*
pause
