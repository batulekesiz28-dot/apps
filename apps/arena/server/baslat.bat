@echo off
title AI Arena sunucusu
cd /d "%~dp0"
if not exist .env copy .env.example .env >nul && echo .env dosyasi olusturuldu - anahtarlarini ekle, sonra tekrar calistir. && notepad .env && exit /b
node arena-server.mjs
pause
