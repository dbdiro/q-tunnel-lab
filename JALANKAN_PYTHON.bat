@echo off
title Q-Tunnel Lab - Server Python
cd /d "%~dp0"
echo Server Python Q-Tunnel Lab berjalan di http://localhost:5000
echo Jangan tutup jendela ini selama memakai lab.
start "" http://localhost/labvirtual/
python server\app.py
pause
