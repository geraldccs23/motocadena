# Motocadena VPS Deployment Script (Optimized)
# Usage: .\deploy.ps1

$ErrorActionPreference = "Stop" # Halt on any error

$VPS_IP = "45.85.249.111"
$VPS_USER = "root"
$REMOTE_BACKEND_PATH = "/var/www/motocadena/backend"
$REMOTE_FRONTEND_PATH = "/var/www/motocadena/dist"
$IDENTITY_FILE = "$HOME\.ssh\id_rsa"
$SSH_ID_OPT = if (Test-Path $IDENTITY_FILE) { "-i ""$IDENTITY_FILE""" } else { "" }

# 0. Frontend Build
Write-Host "--- 🚀 Building Frontend ---" -ForegroundColor Cyan
try {
    pnpm run build
} catch {
    Write-Host "❌ Build failed! Check for syntax errors in your frontend code." -ForegroundColor Red
    exit 1
}

# 1. Prepare local bundles
Write-Host "--- 📦 Bundling artifacts ---" -ForegroundColor Cyan
if (Test-Path "backend-bundle.tar.gz") { Remove-Item "backend-bundle.tar.gz" }
if (Test-Path "frontend-bundle.tar.gz") { Remove-Item "frontend-bundle.tar.gz" }

# 1.1 Backend Bundle (ESM Support)
$stagingPath = "$env:TEMP\mc-staging-$((Get-Random))"
$staging = New-Item -ItemType Directory -Path $stagingPath -Force
Write-Host "Staging files at: $($staging.FullName)" -ForegroundColor DarkGray

# Using Join-Path for absolute safety
Copy-Item -Path (Join-Path $PSScriptRoot "backend\server.js") -Destination $staging.FullName
Copy-Item -Path (Join-Path $PSScriptRoot "backend\package.json") -Destination $staging.FullName

if (Test-Path (Join-Path $PSScriptRoot "backend\package-lock.json")) {
    Copy-Item -Path (Join-Path $PSScriptRoot "backend\package-lock.json") -Destination $staging.FullName
}

Copy-Item -Path (Join-Path $PSScriptRoot "backend\src") -Destination $staging.FullName -Recurse

# Inject Environment Variables
if (Test-Path ".\.env.production") {
    Copy-Item -Path ".\.env.production" -Destination "$($staging.FullName)\.env"
    Write-Host "✅ Included .env.production as .env" -ForegroundColor Green
}
elseif (Test-Path ".\.env") {
    Copy-Item -Path ".\.env" -Destination "$($staging.FullName)\.env"
    Write-Host "✅ Included .env" -ForegroundColor Green
}

# Run tar
tar -czf "backend-bundle.tar.gz" -C $staging.FullName .
Remove-Item -Path $staging.FullName -Recurse -Force

# 1.2 Frontend Bundle
if (Test-Path ".\dist") {
    tar -czf "frontend-bundle.tar.gz" -C ".\dist" .
} else {
    Write-Host "❌ Dist folder not found! Build might not have generated artifacts." -ForegroundColor Red
    exit 1
}

# 2. Upload to VPS
Write-Host "--- 📡 Uploading to VPS ($VPS_IP) ---" -ForegroundColor Cyan
scp $SSH_ID_OPT .\backend-bundle.tar.gz "${VPS_USER}@${VPS_IP}:/tmp/"
scp $SSH_ID_OPT .\frontend-bundle.tar.gz "${VPS_USER}@${VPS_IP}:/tmp/"
scp $SSH_ID_OPT .\deployment\motocadena.yaml "${VPS_USER}@${VPS_IP}:~/"
scp $SSH_ID_OPT .\deployment\motocadena_nginx.conf "${VPS_USER}@${VPS_IP}:~/"

# 3. Remote Setup & Restart
Write-Host "--- ⚙️ Remote setup and service restart ---" -ForegroundColor Cyan
$remoteCmd = @"
set -ex
mkdir -p ${REMOTE_BACKEND_PATH}
mkdir -p ${REMOTE_FRONTEND_PATH}

echo "--- 🖥️ Extracting Frontend ---"
cd ${REMOTE_FRONTEND_PATH}
rm -rf *
tar -xzf /tmp/frontend-bundle.tar.gz

echo "--- 🛠️ Extracting Backend ---"
cd ${REMOTE_BACKEND_PATH}
find . -maxdepth 1 -not -name "." -not -name "node_modules" -exec rm -rf {} +
tar -xzf /tmp/backend-bundle.tar.gz

echo "--- 🔄 Deploying Docker environment ---"
cd ~
docker network create --driver overlay geraldnet || true
docker stack deploy -c motocadena.yaml motocadena --with-registry-auth
sleep 5
docker stack ps motocadena
"@

$remoteCmd = $remoteCmd -replace "`r", ""
ssh $SSH_ID_OPT "${VPS_USER}@${VPS_IP}" "bash -lc '$remoteCmd'"

Write-Host "`n✨ Deployment Complete! ✨" -ForegroundColor Green
Write-Host "Frontend: https://motocadena.com"
Write-Host "Backend API: https://api.motocadena.com"
