# Motocadena VPS Deployment Script
# Usage: .\deploy.ps1

$VPS_IP = "45.85.249.111"
$VPS_USER = "root"
$REMOTE_PATH = "/var/www/motocadena-backend"

$IDENTITY_FILE = "$HOME\.ssh\id_rsa_motocadena"

# 1. Prepare local bundle
Write-Host "--- Bundling backend ---" -ForegroundColor Cyan
if (Test-Path "backend-bundle.zip") { Remove-Item "backend-bundle.zip" }
# We use Compress-Archive but exclude node_modules manually or by focusing on src/server.js/package.json
Compress-Archive -Path "c:\Motocadena\motocadena-backend\*" -DestinationPath "backend-bundle.zip" -CompressionLevel Optimal

# 2. Upload to VPS
Write-Host "--- Uploading to VPS ---" -ForegroundColor Cyan
scp -i "$IDENTITY_FILE" backend-bundle.zip "${VPS_USER}@${VPS_IP}:/tmp/"

# 3. Remote Setup & PM2
Write-Host "--- Remote setup ---" -ForegroundColor Cyan
$remoteCmd = @"
mkdir -p ${REMOTE_PATH}
unzip -o /tmp/backend-bundle.zip -d ${REMOTE_PATH}
cd ${REMOTE_PATH}
npm install --omit=dev
# PM2 Setup
if ! command -v pm2 &> /dev/null
then
    npm install -g pm2
fi
pm2 delete motocadena-backend || true
pm2 start server.js --name motocadena-backend --env production
pm2 save
"@

ssh -i "$IDENTITY_FILE" "${VPS_USER}@${VPS_IP}" $remoteCmd

Write-Host "--- Deployment Complete! ---" -ForegroundColor Green
