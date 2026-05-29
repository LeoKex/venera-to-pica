@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title Venera to PicaComic Converter

echo.
echo ========================================
echo   Venera to PicaComic Data Converter
echo ========================================
echo.

:: Get script directory
set "SCRIPT_DIR=%~dp0"
set "CONVERTER=%SCRIPT_DIR%convert_v4.js"

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Check converter script
if not exist "%CONVERTER%" (
    echo [ERROR] convert_v4.js not found
    echo.
    pause
    exit /b 1
)

:: Check if better-sqlite3 is installed
if not exist "%SCRIPT_DIR%node_modules\better-sqlite3" (
    echo [INFO] Installing dependencies...
    cd /d "%SCRIPT_DIR%"
    call npm install better-sqlite3
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
)

:: Check if file is dragged
if "%~1" neq "" (
    set "VENERA_FILE=%~1"
    goto :process
)

:: Interactive mode
echo Please drag and drop your data.venera file here,
echo or type the full path and press Enter:
echo.
set /p "VENERA_FILE=File path: "

:process
echo.

:: Remove quotes if any
set "VENERA_FILE=%VENERA_FILE:"=%"

:: Check file exists
if not exist "%VENERA_FILE%" (
    echo [ERROR] File not found: %VENERA_FILE%
    echo.
    pause
    exit /b 1
)

:: Set output file
for %%i in ("%VENERA_FILE%") do set "OUTPUT_DIR=%%~dpi"
set "OUTPUT_FILE=%OUTPUT_DIR%userData.picadata"

echo [Input]  %VENERA_FILE%
echo [Output] %OUTPUT_FILE%
echo.
echo ----------------------------------------
echo.

:: Run conversion
cd /d "%SCRIPT_DIR%"
node convert_v4.js "%VENERA_FILE%" "%OUTPUT_FILE%"

if %errorlevel% equ 0 (
    echo.
    echo ----------------------------------------
    echo.
    echo [SUCCESS] Conversion complete!
    echo.
    echo Output: %OUTPUT_FILE%
    echo.
    echo Next steps:
    echo   1. Copy userData.picadata to your phone
    echo   2. Import in PicaComic v4.2.11
    echo.
    echo ----------------------------------------
) else (
    echo.
    echo [ERROR] Conversion failed
)

echo.
pause
