@echo off
cd /d "%~dp0"
start "" /B node "%~dp0companion-server.cjs"
start "" "http://127.0.0.1:38749/"
