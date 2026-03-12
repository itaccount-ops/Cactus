@echo off
setlocal EnableDelayedExpansion

echo Inicializando carpeta Dropbox Apps/CactusMEP...
echo.

:: Leer token de Dropbox del .env.production
set "ENV_FILE=%~dp0..\.env.production"
for /f "usebackq tokens=1,* delims==" %%A in ("!ENV_FILE!") do (
    set "KEY=%%A"
    set "KEY=!KEY: =!"
    if "!KEY!"=="DROPBOX_ACCESS_TOKEN" set "DBX_TOKEN=%%B"
)

if "!DBX_TOKEN!"=="" (
    echo [ERROR] DROPBOX_ACCESS_TOKEN no encontrado en .env.production
    echo Añade: DROPBOX_ACCESS_TOKEN=tu_token_aqui
    pause & exit /b 1
)

echo Llamando a Dropbox API para crear carpeta cactus-backups...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$token = $env:DBX_TOKEN_PS;" ^
    "$body = '{\"path\": \"/cactus-backups\", \"autorename\": false}';" ^
    "try {" ^
    "  $r = Invoke-RestMethod -Uri 'https://api.dropboxapi.com/2/files/create_folder_v2' -Method Post -Headers @{ Authorization = 'Bearer ' + $token; 'Content-Type' = 'application/json' } -Body $body;" ^
    "  Write-Host 'Carpeta creada en Dropbox. Espera a que Dropbox sincronice...';" ^
    "} catch {" ^
    "  $msg = $_.Exception.Message;" ^
    "  if ($msg -like '*conflict*' -or $msg -like '*already*') { Write-Host 'Carpeta ya existe OK' }" ^
    "  else { Write-Host ('Error: ' + $msg) }" ^
    "}"

set "DBX_TOKEN_PS=!DBX_TOKEN!"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$token = $env:DBX_TOKEN_PS;" ^
    "$body = '{\"path\": \"/cactus-backups\", \"autorename\": false}';" ^
    "try {" ^
    "  $r = Invoke-RestMethod -Uri 'https://api.dropboxapi.com/2/files/create_folder_v2' -Method Post -Headers @{ Authorization = 'Bearer ' + $token; 'Content-Type' = 'application/json' } -Body $body;" ^
    "  Write-Host 'OK - carpeta /cactus-backups creada en Dropbox';" ^
    "  Write-Host 'Espera unos segundos a que Dropbox Desktop sincronice y vuelve a ejecutar backup-manual.bat';" ^
    "} catch {" ^
    "  $msg = $_.Exception.Response.StatusCode;" ^
    "  if ($msg -eq 409) { Write-Host 'OK - carpeta ya existe en Dropbox' }" ^
    "  else { Write-Host ('Error al crear carpeta: ' + $_.Exception.Message) }" ^
    "}"

echo.
pause
