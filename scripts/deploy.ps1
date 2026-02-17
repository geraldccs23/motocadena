# Motocadena VPS Deployment Script
# Usage: .\deploy.ps1

$VPS_IP = "45.85.249.111"
$VPS_USER = "root"
$REMOTE_BACKEND_PATH = "/var/www/motocadena/backend"
$REMOTE_FRONTEND_PATH = "/var/www/motocadena/dist"
$IDENTITY_FILE = "$HOME\.ssh\id_rsa"
$SSH_ID_OPT = if (Test-Path $IDENTITY_FILE) { "-i ""$IDENTITY_FILE""" } else { "" }

# 0. Frontend Build
Write-Host "--- Building Frontend ---" -ForegroundColor Cyan
pnpm run build
if ($LASTEXITCODE -ne 0) { 
    Write-Host "Build failed, aborting deployment." -ForegroundColor Red
    exit $LASTEXITCODE 
}

# 1. Prepare local bundles
Write-Host "--- Bundling artifacts ---" -ForegroundColor Cyan
if (Test-Path "backend-bundle.tar.gz") { Remove-Item "backend-bundle.tar.gz" }
if (Test-Path "frontend-bundle.tar.gz") { Remove-Item "frontend-bundle.tar.gz" }

# 1.1 Backend Bundle
$staging = New-Item -ItemType Directory -Path "$env:TEMP\mc-staging" -Force
Copy-Item -Path "c:\Motocadena\backend\server.js" -Destination $staging
Copy-Item -Path "c:\Motocadena\backend\package.json" -Destination $staging
Copy-Item -Path "c:\Motocadena\backend\package-lock.json" -Destination $staging
Copy-Item -Path "c:\Motocadena\backend\src" -Destination $staging -Recurse
if (Test-Path "c:\Motocadena\.env") {
    Copy-Item -Path "c:\Motocadena\.env" -Destination "$staging\.env"
    Write-Host "Included .env in backend bundle" -ForegroundColor Green
}
else {
    Write-Host "WARNING: .env not found at root! Backend might fail." -ForegroundColor Yellow
}
tar -czf "c:\Motocadena\backend-bundle.tar.gz" -C $staging .
Remove-Item -Path $staging -Recurse -Force

# 1.2 Frontend Bundle
tar -czf "c:\Motocadena\frontend-bundle.tar.gz" -C "c:\Motocadena\dist" .

# 2. Upload to VPS
Write-Host "--- Uploading to VPS ---" -ForegroundColor Cyan
scp $SSH_ID_OPT .\backend-bundle.tar.gz "${VPS_USER}@${VPS_IP}:/tmp/"
if ($LASTEXITCODE -ne 0) { Write-Host "Failed to upload backend bundle" -ForegroundColor Red; exit 1 }

scp $SSH_ID_OPT .\frontend-bundle.tar.gz "${VPS_USER}@${VPS_IP}:/tmp/"
if ($LASTEXITCODE -ne 0) { Write-Host "Failed to upload frontend bundle" -ForegroundColor Red; exit 1 }

scp $SSH_ID_OPT .\deployment\motocadena.yaml "${VPS_USER}@${VPS_IP}:~/"
scp $SSH_ID_OPT .\deployment\motocadena_nginx.conf "${VPS_USER}@${VPS_IP}:~/"

# 3. Remote Setup & Restart
Write-Host "--- Remote setup and service restart ---" -ForegroundColor Cyan
$remoteCmd = @"
set -ex
# Setup paths
mkdir -p ${REMOTE_BACKEND_PATH}
mkdir -p ${REMOTE_FRONTEND_PATH}

# Deploy Frontend
echo "--- Extracting Frontend ---"
ls -la /var/www/motocadena/
cd ${REMOTE_FRONTEND_PATH}
rm -rf *
tar -xzf /tmp/frontend-bundle.tar.gz

# Deploy Backend
echo "--- Extracting Backend ---"
cd ${REMOTE_BACKEND_PATH}
# Clean except node_modules (we want to overwrite .env if new one comes)
find . -maxdepth 1 -not -name "." -not -name "node_modules" -exec rm -rf {} +
tar -xzf /tmp/backend-bundle.tar.gz
[ -f .env ] || { echo "Error: .env not found in backend dir after extraction"; exit 1; }

cd ${REMOTE_BACKEND_PATH}
echo "--- Installing backend dependencies ---"
npm install --omit=dev

# Start/Restart services with Docker
echo "--- Cleaning up old stacks if they exist ---"
docker stack rm motocadena-admin || true
docker stack rm motocadena || true
sleep 2

echo "--- Deploying Docker stack: motocadena ---"
cd ~
docker stack deploy -c motocadena.yaml motocadena --with-registry-auth
sleep 5
docker stack ps motocadena
echo "--- Remote Deployment Finished ---"
"@

$remoteCmd = $remoteCmd -replace "`r", ""   # Ensure Unix line endings for bash
ssh $SSH_ID_OPT "${VPS_USER}@${VPS_IP}" "bash -lc '$remoteCmd'"

Write-Host "`n--- Deployment Complete! ---" -ForegroundColor Green
Write-Host "Frontend: https://motocadena.com"
Write-Host "Backend API: https://api.motocadena.com"
Write-Host "Managed via Docker Stack & Traefik"
