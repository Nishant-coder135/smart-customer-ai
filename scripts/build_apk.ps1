# PWA to APK Build Automation Script
# This script uses Google's '@bubblewrap/cli' to package your Progressive Web App into a native Android APK (TWA).

$AppDir = $PSScriptRoot
$BuildDir = Join-Path $AppDir "build-apk"

# 1. Verification
Write-Host "--- SmartCustomer AI: APK Build Service ---" -ForegroundColor Cyan
if (!(Test-Path (Join-Path $AppDir "frontend\manifest.json"))) {
    Write-Host "Error: manifest.json not found in frontend directory." -ForegroundColor Red
    exit
}

# 2. Setup Build Directory
if (!(Test-Path $BuildDir)) {
    New-Item -ItemType Directory -Path $BuildDir | Out-Null
}

# 3. Instruction for the User
Write-Host "`nThis script requires Node.js and Java (JDK 11+) to be installed on your machine." -ForegroundColor Yellow
Write-Host "To generate your APK, please run the following commands in your terminal:`n"

Write-Host "1. npm install -g @bubblewrap/cli" -ForegroundColor Green
Write-Host "2. bubblewrap init --manifest=https://your-deployed-url.com/manifest.json" -ForegroundColor Green
Write-Host "3. bubblewrap build" -ForegroundColor Green

Write-Host "`nYour APK will be generated in the 'build-apk' folder." -ForegroundColor Cyan
Write-Host "--------------------------------------------"
