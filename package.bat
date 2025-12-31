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

echo.
echo Manual Packaging Steps:
echo 1. Open Chrome/Edge and navigate to chrome://extensions/
echo 2. Enable 'Developer mode' (toggle in top right)
echo 3. Click 'Pack extension' button
echo 4. Extension root directory: Select the 'src' folder
echo 5. Private key file: Leave blank (for first-time packaging)
echo 6. Click 'Pack Extension'
echo 7. The .crx file will be created in the parent directory of 'src'
echo.
echo Note: Automated .crx packaging requires Chrome's command-line tools.
echo The easiest method is to use Chrome's built-in packager as shown above.
echo.
pause

