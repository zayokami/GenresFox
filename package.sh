#!/bin/bash
# GenresFox Extension Packager
# Packages the extension into .crx format
# Supports macOS and Linux

set -e

OUTPUT_NAME="${1:-GenresFox-v0.4.5.crx}"
CHROME_PATH="${2:-}"

echo "GenresFox Extension Packager"
echo "============================="
echo ""

# Check if src directory exists
if [ ! -d "src" ]; then
    echo "Error: 'src' directory not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Check if manifest.json exists
if [ ! -f "src/manifest.json" ]; then
    echo "Error: 'src/manifest.json' not found!"
    exit 1
fi

# Read version from manifest.json
if command -v jq &> /dev/null; then
    VERSION=$(jq -r '.version' src/manifest.json)
    echo "Extension version: $VERSION"
elif command -v python3 &> /dev/null; then
    VERSION=$(python3 -c "import json; print(json.load(open('src/manifest.json'))['version'])")
    echo "Extension version: $VERSION"
else
    echo "Warning: Could not read version from manifest.json (jq or python3 not found)"
    VERSION="unknown"
fi

# Auto-detect Chrome/Chromium path if not provided
if [ -z "$CHROME_PATH" ]; then
    # macOS paths
    if [[ "$OSTYPE" == "darwin"* ]]; then
        POSSIBLE_PATHS=(
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
            "/Applications/Chromium.app/Contents/MacOS/Chromium"
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
        )
    # Linux paths
    else
        POSSIBLE_PATHS=(
            "/usr/bin/google-chrome"
            "/usr/bin/chromium"
            "/usr/bin/chromium-browser"
            "/usr/bin/microsoft-edge"
            "/snap/bin/chromium"
            "$HOME/.local/bin/google-chrome"
        )
    fi
    
    for path in "${POSSIBLE_PATHS[@]}"; do
        if [ -f "$path" ] || [ -d "$path" ]; then
            CHROME_PATH="$path"
            echo "Found browser: $path"
            break
        fi
    done
fi

if [ -z "$CHROME_PATH" ]; then
    echo ""
    echo "Error: Chrome or Chromium not found!"
    echo ""
    echo "Please use manual packaging method:"
    echo "1. Open Chrome/Chromium and go to chrome://extensions/"
    echo "2. Enable 'Developer mode'"
    echo "3. Click 'Pack extension'"
    echo "4. Select the 'src' folder as extension root"
    echo "5. Leave private key blank (for first-time packaging)"
    echo "6. Click 'Pack Extension'"
    echo ""
    exit 1
fi

echo ""
echo "Note: Automated .crx packaging requires Chrome's command-line tools."
echo "The easiest method is to use Chrome's built-in packager:"
echo ""
echo "Manual Packaging Steps:"
echo "1. Open Chrome/Chromium and navigate to chrome://extensions/"
echo "2. Enable 'Developer mode' (toggle in top right)"
echo "3. Click 'Pack extension' button"
echo "4. Extension root directory: Select the 'src' folder"
echo "5. Private key file: Leave blank (for first-time packaging)"
echo "6. Click 'Pack Extension'"
echo "7. The .crx file will be created in the parent directory of 'src'"
echo ""
echo "Output file will be: $OUTPUT_NAME"
echo ""

# Create backup ZIP file
echo "Creating backup ZIP file..."
ZIP_NAME="${OUTPUT_NAME%.crx}.zip"
if [ -f "$ZIP_NAME" ]; then
    rm -f "$ZIP_NAME"
fi

# Create zip using zip command (if available)
if command -v zip &> /dev/null; then
    cd src
    zip -r "../$ZIP_NAME" . -q
    cd ..
    echo "Created: $ZIP_NAME"
elif command -v 7z &> /dev/null; then
    7z a "$ZIP_NAME" src/* -r -q
    echo "Created: $ZIP_NAME"
else
    echo "Warning: zip or 7z not found, skipping ZIP creation"
    echo "Install zip: sudo apt-get install zip (Ubuntu/Debian) or brew install zip (macOS)"
fi

echo ""
echo "To convert ZIP to CRX:"
echo "1. Rename .zip to .crx (optional, but recommended)"
echo "2. Or use Chrome's packager as described above"
echo ""

