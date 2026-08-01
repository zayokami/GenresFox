# GenresFox Extension Packager
# Packages the extension into .crx format
# Creates a filtered ZIP package and prints optional CRX instructions

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

# Auto-detect Chrome/Edge path if available
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
    Write-Host "Chrome or Edge not found; creating ZIP only." -ForegroundColor Yellow
}

Write-Host "Output file will be: $OutputName" -ForegroundColor Green
Write-Host ""

Write-Host "Creating backup ZIP file..." -ForegroundColor Cyan
$zipName = $OutputName -replace '\.crx$', '.zip'
if (Test-Path $zipName) {
    Remove-Item $zipName -Force
    Write-Host "Removed existing: $zipName" -ForegroundColor Yellow
}

try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction Stop
    $sourceRoot = (Resolve-Path "src").Path
    $zipPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $zipName))
    $excludedPatterns = @(
        '(^|[\\/])\.git([\\/]|$)',
        '(^|[\\/])node_modules([\\/]|$)',
        '(^|[\\/])target([\\/]|$)',
        '(^|[\\/])wasm-resize([\\/]|$)',
        '(^|[\/])\.env(?:\..*)?$|\.(cargo|rs|toml|lock|sh|bat|md|pem|key|crt|cer|p12|pfx|secret|crx|zip)$'
    )
    $files = Get-ChildItem -LiteralPath $sourceRoot -File -Recurse | Where-Object {
        $relative = $_.FullName.Substring($sourceRoot.Length).TrimStart('\', '/')
        -not ($excludedPatterns | Where-Object { $relative -match $_ })
    }
    $archive = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($file in $files) {
            $relative = $file.FullName.Substring($sourceRoot.Length).TrimStart('\', '/')
            $null = [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $archive,
                $file.FullName,
                ($relative -replace '\\', '/'),
                [System.IO.Compression.CompressionLevel]::Optimal
            )
        }
    } finally {
        $archive.Dispose()
    }
    
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
    exit 1
}
Write-Host ""
Write-Host "To convert ZIP to CRX:" -ForegroundColor Yellow
Write-Host "1. Rename .zip to .crx (optional, but recommended)" -ForegroundColor White
Write-Host "2. Or use Chrome's packager as described above" -ForegroundColor White
Write-Host ""

