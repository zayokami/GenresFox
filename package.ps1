# GenresFox Extension Packager
# Packages the extension into .crx format
# Requires Chrome/Edge browser to be installed

param(
    [string]$OutputName = "",
    [string]$ChromePath = ""
)

$ErrorActionPreference = "Stop"

Write-Host "GenresFox Extension Packager" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

# Check if src directory exists
if (-not (Test-Path "src")) {
    Write-Host "Error: 'src' directory not found!" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory." -ForegroundColor Yellow
    exit 1
}

# Check if manifest.json exists
if (-not (Test-Path "src\manifest.json")) {
    Write-Host "Error: 'src\manifest.json' not found!" -ForegroundColor Red
    exit 1
}

# Read version from manifest.json
try {
    $manifest = Get-Content "src\manifest.json" -Raw | ConvertFrom-Json
    $version = $manifest.version
    Write-Host "Extension version: $version" -ForegroundColor Green
    
    # Set default output name if not provided
    if ([string]::IsNullOrEmpty($OutputName)) {
        $OutputName = "GenresFox-v$version.crx"
    }
} catch {
    Write-Host "Warning: Could not read version from manifest.json" -ForegroundColor Yellow
    $version = "unknown"
    if ([string]::IsNullOrEmpty($OutputName)) {
        $OutputName = "GenresFox-unknown.crx"
    }
}

# Auto-detect Chrome/Edge path if not provided
if ([string]::IsNullOrEmpty($ChromePath)) {
    $possiblePaths = @(
        "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
        "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe"
    )
    
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $ChromePath = $path
            Write-Host "Found browser: $path" -ForegroundColor Green
            break
        }
    }
}

if ([string]::IsNullOrEmpty($ChromePath)) {
    Write-Host ""
    Write-Host "Error: Chrome or Edge not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please use manual packaging method:" -ForegroundColor Yellow
    Write-Host "1. Open Chrome/Edge and go to chrome://extensions/" -ForegroundColor Yellow
    Write-Host "2. Enable 'Developer mode'" -ForegroundColor Yellow
    Write-Host "3. Click 'Pack extension'" -ForegroundColor Yellow
    Write-Host "4. Select the 'src' folder as extension root" -ForegroundColor Yellow
    Write-Host "5. Leave private key blank (for first-time packaging)" -ForegroundColor Yellow
    Write-Host "6. Click 'Pack Extension'" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "Note: Automated .crx packaging requires Chrome's command-line tools." -ForegroundColor Yellow
Write-Host "The easiest method is to use Chrome's built-in packager:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Manual Packaging Steps:" -ForegroundColor Cyan
Write-Host "1. Open Chrome/Edge and navigate to chrome://extensions/" -ForegroundColor White
Write-Host "2. Enable 'Developer mode' (toggle in top right)" -ForegroundColor White
Write-Host "3. Click 'Pack extension' button" -ForegroundColor White
Write-Host "4. Extension root directory: Select the 'src' folder" -ForegroundColor White
Write-Host "5. Private key file: Leave blank (for first-time packaging)" -ForegroundColor White
Write-Host "6. Click 'Pack Extension'" -ForegroundColor White
Write-Host "7. The .crx file will be created in the parent directory of 'src'" -ForegroundColor White
Write-Host ""
Write-Host "Output file will be: $OutputName" -ForegroundColor Green
Write-Host ""

# Alternative: Create a zip file (can be converted to .crx later)
Write-Host "Creating backup ZIP file..." -ForegroundColor Cyan
$zipName = $OutputName -replace '\.crx$', '.zip'
if (Test-Path $zipName) {
    Remove-Item $zipName -Force
    Write-Host "Removed existing: $zipName" -ForegroundColor Yellow
}

# Create zip using .NET compression
try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction Stop
    [System.IO.Compression.ZipFile]::CreateFromDirectory("$PWD\src", "$PWD\$zipName")
    
    if (Test-Path $zipName) {
        $fileSize = (Get-Item $zipName).Length
        $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
        Write-Host "Created: $zipName ($fileSizeMB MB)" -ForegroundColor Green
    } else {
        Write-Host "Error: ZIP file was not created!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error creating ZIP file: $_" -ForegroundColor Red
    Write-Host "Trying alternative method..." -ForegroundColor Yellow
    
    # Alternative: Use Compress-Archive (PowerShell 5.0+)
    try {
        Compress-Archive -Path "src\*" -DestinationPath $zipName -Force
        if (Test-Path $zipName) {
            $fileSize = (Get-Item $zipName).Length
            $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
            Write-Host "Created: $zipName ($fileSizeMB MB)" -ForegroundColor Green
        } else {
            Write-Host "Error: ZIP file was not created!" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "Error: Failed to create ZIP file using both methods" -ForegroundColor Red
        Write-Host "Error details: $_" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""
Write-Host "To convert ZIP to CRX:" -ForegroundColor Yellow
Write-Host "1. Rename .zip to .crx (optional, but recommended)" -ForegroundColor White
Write-Host "2. Or use Chrome's packager as described above" -ForegroundColor White
Write-Host ""

