@echo off
cd /d "%~dp0"
echo Open http://localhost:8000/login.html
python -m http.server 8000
pause
