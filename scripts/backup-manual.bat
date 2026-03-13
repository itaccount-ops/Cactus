@echo off
setlocal EnableDelayedExpansion

set "DROPBOX_DEST=C:\Users\MEP\MEP Projects Dropbox\Apps\CactusMEP\cactus-backups"
set "LOGFILE=%~dp0backup-manual.log"

call :LOG "=== BACKUP INICIO %DATE% %TIME% ==="

echo.
echo ===================================================
echo   CACTUS ERP - BACKUP MANUAL
echo   Neon DB + Vercel Blob -^> Dropbox
echo ===================================================
echo.

:: --- Cargar credenciales de produccion desde .env.production ---
set "ENV_FILE=%~dp0..\.env.production"
if not exist "!ENV_FILE!" (
    call :LOG "ERROR: .env.production no encontrado"
    echo [ERROR] No se encontro .env.production en: %~dp0..
    echo  Usa .env.production.example como plantilla.
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
    call :LOG "ERROR: DB_URL vacia"
    echo [ERROR] POSTGRES_URL_NON_POOLING no encontrada en .env.production
    pause
    exit /b 1
)

call :LOG "Credenciales OK"

if "!BLOB_TOKEN!"=="" (
    echo [AVISO] BLOB_READ_WRITE_TOKEN no encontrada - se omitira backup de Vercel Blob
    echo.
)

:: --- Buscar pg_dump ---
set "PGDUMP="
pg_dump --version >nul 2>&1
if not errorlevel 1 set "PGDUMP=pg_dump"

for %%V in (18 17 16 15 14 13) do (
    if "!PGDUMP!"=="" if exist "C:\Program Files\PostgreSQL\%%V\bin\pg_dump.exe" (
        set "PGDUMP=C:\Program Files\PostgreSQL\%%V\bin\pg_dump.exe"
        echo  PostgreSQL encontrado: C:\Program Files\PostgreSQL\%%V\bin\
    )
)

if "!PGDUMP!"=="" (
    call :LOG "ERROR: pg_dump no encontrado"
    echo [ERROR] pg_dump no encontrado. Instala PostgreSQL desde:
    echo         https://www.postgresql.org/download/windows/
    pause
    exit /b 1
)

call :LOG "pg_dump: !PGDUMP!"

:: --- Crear carpeta destino ---
powershell -NoProfile -Command "New-Item -ItemType Directory -Path '!DROPBOX_DEST!' -Force | Out-Null"
call :LOG "Carpeta Dropbox lista: !DROPBOX_DEST!"

:: --- Fecha ---
for /f %%D in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set "DATE_PART=%%D"
for /f %%T in ('powershell -NoProfile -Command "Get-Date -Format HH-mm"') do set "TIME_PART=%%T"

set "BASENAME=backup_manual_%DATE_PART%_%TIME_PART%"
set "TEMP_DIR=%TEMP%\cactus_backup_%DATE_PART%_%TIME_PART%"
set "DEST_FILE=!DROPBOX_DEST!\%BASENAME%.zip"

call :LOG "Fecha: %DATE_PART% %TIME_PART%"
call :LOG "Destino: !DEST_FILE!"

mkdir "!TEMP_DIR!" 2>nul

echo  Fecha:    %DATE_PART% %TIME_PART%
echo  Destino:  !DEST_FILE!
echo.

:: ---------------------------------------------------------
:: [1/3] Base de datos - pg_dump
:: ---------------------------------------------------------
echo [1/3] Respaldando base de datos (Neon)...
call :LOG "[1/3] Iniciando pg_dump..."

"!PGDUMP!" "!DB_URL!" --format=custom --no-acl --no-owner -f "!TEMP_DIR!\db.dump"
if errorlevel 1 (
    call :LOG "ERROR: pg_dump fallo"
    echo.
    echo [ERROR] pg_dump fallo.
    echo  Verifica conexion a internet y credenciales en .env.production
    rmdir /s /q "!TEMP_DIR!" 2>nul
    pause
    exit /b 1
)
call :LOG "pg_dump OK"
echo        OK

:: ---------------------------------------------------------
:: [2/3] Vercel Blob
:: ---------------------------------------------------------
if "!BLOB_TOKEN!"=="" (
    echo [2/3] Skipping Vercel Blob (sin token)
    call :LOG "[2/3] Blob skipped"
) else (
    echo [2/3] Respaldando archivos Vercel Blob...
    call :LOG "[2/3] Iniciando blob backup..."
    mkdir "!TEMP_DIR!\blob" 2>nul

    set "BLOB_TOKEN_PS=!BLOB_TOKEN!"
    set "BLOB_DIR_PS=!TEMP_DIR!\blob"

    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "$token = $env:BLOB_TOKEN_PS;" ^
        "$blobDir = $env:BLOB_DIR_PS;" ^
        "$headers = @{ Authorization = 'Bearer ' + $token };" ^
        "$cursor = $null; $total = 0;" ^
        "do {" ^
        "  $url = 'https://blob.vercel-storage.com?limit=1000';" ^
        "  if ($cursor) { $url += '&cursor=' + [uri]::EscapeDataString($cursor) };" ^
        "  $resp = Invoke-RestMethod -Uri $url -Method Get -Headers $headers;" ^
        "  foreach ($blob in $resp.blobs) {" ^
        "    $rel = $blob.pathname -replace '/', '\\';" ^
        "    $dest = Join-Path $blobDir $rel;" ^
        "    $dir = Split-Path $dest -Parent;" ^
        "    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null };" ^
        "    Invoke-WebRequest -Uri $blob.url -OutFile $dest -UseBasicParsing -Headers $headers;" ^
        "    $total++" ^
        "  };" ^
        "  $cursor = if ($resp.hasMore) { $resp.cursor } else { $null }" ^
        "} while ($cursor);" ^
        "Write-Host ('       OK - ' + $total + ' archivos descargados')"

    call :LOG "[2/3] Blob backup done"
    if errorlevel 1 echo [AVISO] Algunos archivos blob no pudieron descargarse
)

:: ---------------------------------------------------------
:: [3/3] Comprimir y copiar a Dropbox
:: ---------------------------------------------------------
echo [3/3] Comprimiendo y copiando a Dropbox...
call :LOG "[3/3] Iniciando compresion..."

powershell -NoProfile -Command "Compress-Archive -Path '!TEMP_DIR!\*' -DestinationPath '!DEST_FILE!' -Force"
if errorlevel 1 (
    call :LOG "ERROR: Compress-Archive fallo"
    echo [ERROR] No se pudo comprimir o copiar a Dropbox.
    rmdir /s /q "!TEMP_DIR!" 2>nul
    pause
    exit /b 1
)
call :LOG "Compress-Archive OK"

rmdir /s /q "!TEMP_DIR!" 2>nul
echo        OK

call :LOG "=== BACKUP COMPLETADO: !DEST_FILE! ==="

echo.
echo ===================================================
echo   BACKUP COMPLETADO CORRECTAMENTE
echo ===================================================
echo.
echo  Guardado en:
echo  !DEST_FILE!
echo.
echo  Contiene:
echo    db.dump   - base de datos Neon
echo    blob\     - archivos Vercel Blob
echo.
echo  Dropbox sincronizara el archivo automaticamente.
echo.
pause
exit /b 0

:LOG
echo [%TIME%] %~1 >> "!LOGFILE!"
goto :eof
