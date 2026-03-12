@echo off
setlocal EnableDelayedExpansion

set "DROPBOX_DEST=C:\Users\MEP\MEP Projects Dropbox\Apps\CactusMEP\cactus-backups"
set "ENV_FILE=%~dp0..\.env.production"

echo [1] Leyendo .env.production...
for /f "usebackq tokens=1,* delims==" %%A in ("!ENV_FILE!") do (
    set "KEY=%%A"
    set "KEY=!KEY: =!"
    if "!KEY!"=="POSTGRES_URL_NON_POOLING" set "DB_URL=%%B"
    if "!KEY!"=="BLOB_READ_WRITE_TOKEN"    set "BLOB_TOKEN=%%B"
)
echo     DB_URL  = !DB_URL:~0,40!...
echo     BLOB    = !BLOB_TOKEN:~0,20!...

echo [2] Buscando pg_dump...
set "PGDUMP="
for %%V in (18 17 16 15 14 13) do (
    if exist "C:\Program Files\PostgreSQL\%%V\bin\pg_dump.exe" (
        if "!PGDUMP!"=="" set "PGDUMP=C:\Program Files\PostgreSQL\%%V\bin\pg_dump.exe"
    )
)
echo     PGDUMP = !PGDUMP!

echo [3] Creando carpeta Dropbox...
powershell -NoProfile -Command "New-Item -ItemType Directory -Path '!DROPBOX_DEST!' -Force | Out-Null"
echo     errorlevel = !errorlevel!

echo [4] Obteniendo fecha...
for /f %%D in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set "DATE_PART=%%D"
for /f %%T in ('powershell -NoProfile -Command "Get-Date -Format HH-mm"') do set "TIME_PART=%%T"
echo     Fecha = %DATE_PART% %TIME_PART%

echo [5] Creando carpeta temporal...
set "TEMP_DIR=%TEMP%\cactus_test_%DATE_PART%"
mkdir "!TEMP_DIR!" 2>nul
echo     TEMP_DIR = !TEMP_DIR!

echo [6] Ejecutando pg_dump (puede tardar unos segundos)...
"!PGDUMP!" "!DB_URL!" --format=custom --no-acl --no-owner -f "!TEMP_DIR!\db.dump"
echo     errorlevel pg_dump = !errorlevel!

if exist "!TEMP_DIR!\db.dump" (
    echo     db.dump creado OK
) else (
    echo     ERROR: db.dump no se creo
)

rmdir /s /q "!TEMP_DIR!" 2>nul

echo.
echo === FIN DEL TEST ===
pause
