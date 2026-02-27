@echo off
chcp 65001 >nul
echo Iniciando el servidor de desarrollo...
echo.
echo URL: http://localhost:3000
echo.

npm run dev
pause
