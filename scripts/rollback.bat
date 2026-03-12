@echo off
setlocal EnableDelayedExpansion

:: ============================================================
::  CACTUS ERP - Rollback (Neon DB + Vercel Blob)
::  Lee desde la carpeta local de Dropbox
::  Requiere: .env.production en la raiz del proyecto
:: ============================================================

set "DROPBOX_DIR=C:\Users\MEP\MEP Projects Dropbox\Apps\CactusMEP\cactus-backups"

echo.
echo ===================================================
echo   CACTUS ERP - ROLLBACK
echo   Neon DB + Vercel Blob
echo ===================================================
echo.
echo  [ADVERTENCIA] Esta operacion REEMPLAZA datos en produccion.
echo  Esta accion NO SE PUEDE DESHACER facilmente.
echo.

:: --- Confirmacion 1 ---
set /p "CONFIRM1=  Estas seguro que quieres continuar? (escribe SI): "
if /i "!CONFIRM1!" neq "SI" (
    echo.
    echo  Operacion cancelada.
    echo.
    pause
    exit /b 0
)
echo.

:: --- Cargar credenciales de produccion desde .env.production ---
set "ENV_FILE=%~dp0..\.env.production"
if not exist "!ENV_FILE!" (
    echo [ERROR] No se encontro .env.production en: %~dp0..
    echo.
    echo  Crea el archivo .env.production con las credenciales de produccion.
    echo  Usa .env.production.example como plantilla.
    echo.
    pause
    exit /b 1
)

for /f "usebackq tokens=1,* delims==" %%A in ("!ENV_FILE!") do (
    set "KEY=%%A"
    set "KEY=!KEY: =!"
    if "!KEY!"=="POSTGRES_URL_NON_POOLING" set "DB_URL=%%B"
    if "!KEY!"=="BLOB_READ_WRITE_TOKEN"    set "BLOB_TOKEN=%%B"
)

if "!DB_URL!"=="" (
    echo [ERROR] POSTGRES_URL_NON_POOLING no encontrada en .env.production
    pause
    exit /b 1
)

:: --- Buscar pg_restore ---
set "PGRESTORE="
pg_restore --version >nul 2>&1
if not errorlevel 1 set "PGRESTORE=pg_restore"

if "!PGRESTORE!"=="" (
    for %%V in (18 17 16 15 14 13) do (
        if exist "C:\Program Files\PostgreSQL\%%V\bin\pg_restore.exe" (
            if "!PGRESTORE!"=="" (
                set "PGRESTORE=C:\Program Files\PostgreSQL\%%V\bin\pg_restore.exe"
                echo  PostgreSQL encontrado: C:\Program Files\PostgreSQL\%%V\bin\
            )
        )
    )
)

if "!PGRESTORE!"=="" (
    echo [ERROR] pg_restore no encontrado. Instala PostgreSQL desde:
    echo         https://www.postgresql.org/download/windows/
    echo         (Solo necesitas marcar "Command Line Tools")
    pause
    exit /b 1
)

:: --- Verificar carpeta de backups ---
if not exist "!DROPBOX_DIR!" (
    echo [ERROR] No se encontro la carpeta de backups:
    echo         !DROPBOX_DIR!
    echo.
    echo  Verifica que Dropbox este instalado y sincronizado.
    pause
    exit /b 1
)

:: --- Listar backups disponibles ---
echo  Backups disponibles en Dropbox:
echo  --------------------------------------------------
echo.

set "IDX=0"
for /f "delims=" %%F in ('dir /b /o-d "!DROPBOX_DIR!\*.zip" 2^>nul') do (
    set /a IDX+=1
    set "FILE_!IDX!=!DROPBOX_DIR!\%%F"
    set "NAME_!IDX!=%%F"
    echo   [!IDX!] %%F
)

if "!IDX!"=="0" (
    echo  No hay backups en:
    echo  !DROPBOX_DIR!
    echo.
    echo  Crea uno primero con backup-manual.bat o espera al backup automatico.
    pause
    exit /b 1
)

echo.
set /p "SELECCION=  Numero del backup a restaurar: "

set "SELECTED_FILE=!FILE_%SELECCION%!"
set "SELECTED_NAME=!NAME_%SELECCION%!"

if "!SELECTED_FILE!"=="" (
    echo [ERROR] Numero invalido.
    pause
    exit /b 1
)
if not exist "!SELECTED_FILE!" (
    echo [ERROR] Archivo no encontrado: !SELECTED_FILE!
    pause
    exit /b 1
)

:: --- Elegir que restaurar ---
echo.
echo  Que deseas restaurar?
echo.
echo   [1] Solo base de datos (Neon)
echo   [2] Solo archivos (Vercel Blob)
echo   [3] Todo (base de datos + archivos)
echo.
set /p "MODO=  Opcion (1/2/3): "

if "!MODO!" neq "1" if "!MODO!" neq "2" if "!MODO!" neq "3" (
    echo [ERROR] Opcion invalida.
    pause
    exit /b 1
)

if "!MODO!"=="2" if "!BLOB_TOKEN!"=="" (
    echo [ERROR] BLOB_READ_WRITE_TOKEN no encontrada - no se puede restaurar Blob
    pause
    exit /b 1
)
if "!MODO!"=="3" if "!BLOB_TOKEN!"=="" (
    echo [AVISO] BLOB_READ_WRITE_TOKEN no encontrada - solo se restaurara la base de datos
    set "MODO=1"
)

:: --- Confirmacion 2 ---
echo.
echo ===================================================
echo   CONFIRMACION FINAL
echo ===================================================
echo.
echo  Backup:   !SELECTED_NAME!
echo  DB:       !DB_URL:~0,55!...
if "!MODO!"=="1" echo  Accion:   Restaurar SOLO base de datos
if "!MODO!"=="2" echo  Accion:   Restaurar SOLO archivos Vercel Blob
if "!MODO!"=="3" echo  Accion:   Restaurar base de datos + archivos Vercel Blob
echo.
echo  TODOS los datos actuales seran REEMPLAZADOS.
echo.
set /p "CONFIRM2=  Escribe CONFIRMAR para proceder: "
if /i "!CONFIRM2!" neq "CONFIRMAR" (
    echo.
    echo  Operacion cancelada. No se hizo ningun cambio.
    echo.
    pause
    exit /b 0
)

echo.
echo  Iniciando restauracion...
echo.

:: --- Descomprimir el zip ---
set "TEMP_DIR=%TEMP%\cactus_restore_tmp"
if exist "!TEMP_DIR!" rmdir /s /q "!TEMP_DIR!"

echo [Paso 1] Descomprimiendo backup...
powershell -NoProfile -Command "Expand-Archive -Path '!SELECTED_FILE!' -DestinationPath '!TEMP_DIR!' -Force"
if errorlevel 1 (
    echo [ERROR] No se pudo descomprimir el archivo.
    pause
    exit /b 1
)
echo        OK

:: ---------------------------------------------------------
:: RESTAURAR BASE DE DATOS
:: ---------------------------------------------------------
if "!MODO!"=="2" goto :skip_db

echo.
echo [Paso 2] Restaurando base de datos con pg_restore...

set "DUMP_PATH=!TEMP_DIR!\db.dump"
if not exist "!DUMP_PATH!" (
    echo [ERROR] No se encontro db.dump en el backup.
    rmdir /s /q "!TEMP_DIR!" 2>nul
    pause
    exit /b 1
)

"!PGRESTORE!" --clean --if-exists --no-acl --no-owner -d "!DB_URL!" "!DUMP_PATH!"
set "RESTORE_CODE=!errorlevel!"

if "!RESTORE_CODE!" neq "0" (
    echo.
    echo [AVISO] pg_restore termino con codigo !RESTORE_CODE!
    echo  Algunos avisos son normales. Verifica que la app funcione correctamente.
    echo.
) else (
    echo        OK
)

:skip_db

:: ---------------------------------------------------------
:: RESTAURAR VERCEL BLOB
:: ---------------------------------------------------------
if "!MODO!"=="1" goto :restore_done
if "!BLOB_TOKEN!"=="" goto :restore_done

set "BLOB_BACKUP_DIR=!TEMP_DIR!\blob"
if not exist "!BLOB_BACKUP_DIR!" (
    echo.
    echo [AVISO] No se encontro carpeta blob\ en el backup - se omite restauracion de archivos.
    goto :restore_done
)

echo.
echo [Paso 3] Restaurando archivos a Vercel Blob...

set "BLOB_TOKEN_PS=!BLOB_TOKEN!"
set "BLOB_DIR_PS=!BLOB_BACKUP_DIR!"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$token = $env:BLOB_TOKEN_PS;" ^
    "$blobDir = $env:BLOB_DIR_PS;" ^
    "$files = Get-ChildItem -Path $blobDir -Recurse -File;" ^
    "$total = 0; $errors = 0;" ^
    "foreach ($file in $files) {" ^
    "  $rel = $file.FullName.Substring($blobDir.Length + 1).Replace('\', '/');" ^
    "  $uploadUrl = 'https://blob.vercel-storage.com/' + $rel;" ^
    "  $ext = $file.Extension.ToLower();" ^
    "  $mime = switch ($ext) {" ^
    "    '.jpg'  { 'image/jpeg' } '.jpeg' { 'image/jpeg' }" ^
    "    '.png'  { 'image/png'  } '.gif'  { 'image/gif'  }" ^
    "    '.webp' { 'image/webp' } '.svg'  { 'image/svg+xml' }" ^
    "    '.pdf'  { 'application/pdf' }" ^
    "    '.docx' { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }" ^
    "    '.xlsx' { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }" ^
    "    default { 'application/octet-stream' }" ^
    "  };" ^
    "  try {" ^
    "    $bytes = [System.IO.File]::ReadAllBytes($file.FullName);" ^
    "    $resp = Invoke-RestMethod -Uri $uploadUrl -Method Put -Body $bytes -ContentType $mime -Headers @{ Authorization = 'Bearer ' + $token };" ^
    "    Write-Host ('  OK: ' + $rel);" ^
    "    $total++" ^
    "  } catch {" ^
    "    Write-Host ('  ERROR: ' + $rel + ' - ' + $_.Exception.Message);" ^
    "    $errors++" ^
    "  }" ^
    "};" ^
    "Write-Host '';" ^
    "Write-Host ('       Blob: ' + $total + ' restaurados, ' + $errors + ' errores')"

if errorlevel 1 echo [AVISO] Algunos archivos no pudieron restaurarse

:restore_done

:: --- Limpiar temporales ---
rmdir /s /q "!TEMP_DIR!" 2>nul

echo.
echo ===================================================
echo   ROLLBACK COMPLETADO
echo ===================================================
echo.
echo  Backup restaurado: !SELECTED_NAME!
echo.
echo  IMPORTANTE: Reinicia el servidor si es necesario.
echo.
pause
