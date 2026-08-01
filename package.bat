@echo off
REM GenresFox Extension Packager (Batch version)
REM Packages the extension into .crx format

echo GenresFox Extension Packager
echo =============================
echo.

REM Check if src directory exists
if not exist "src" (
    echo Error: 'src' directory not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

REM Check if manifest.json exists
if not exist "src\manifest.json" (
    echo Error: 'src\manifest.json' not found!
    pause
    exit /b 1
)

echo Creating a filtered ZIP package...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0package.ps1" %*
if errorlevel 1 (
    echo Packaging failed.
    exit /b 1
)

