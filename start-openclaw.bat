@echo off
title MEP Projects - OpenClaw Gateway + App
color 0A
echo.
echo  ========================================
echo   🦞 MEP Projects - Inicio Rapido
echo  ========================================
echo.

:: Verificar que nvm existe
where nvm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] nvm no encontrado. Instala nvm4w primero.
    pause
    exit /b 1
)

echo [1/3] Iniciando OpenClaw Gateway (Node 22)...
start "OpenClaw Gateway" cmd /k "nvm use 22 && openclaw gateway run"

echo [2/3] Esperando 5 segundos para que el Gateway arranque...
timeout /t 5 /nobreak >nul

echo [3/3] Iniciando MEP App (Node 20)...
start "MEP App - Next.js" cmd /k "cd /d %~dp0 && nvm use 20 && npm run dev"

echo.
echo  ========================================
echo   ✅ Todo iniciado!
echo  ========================================
echo.
echo   Gateway:  http://127.0.0.1:18789
echo   App:      http://localhost:3000
echo.
echo   Cierra esta ventana cuando quieras.
pause
