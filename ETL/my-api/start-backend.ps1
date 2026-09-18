Write-Host "Starting SIM Management API..." -ForegroundColor Cyan
Set-Location $PSScriptRoot
if (!(Test-Path ".env")) {
  Write-Host "ERROR: .env not found. Create it from .env.example." -ForegroundColor Red
  exit 1
}
if (!(Test-Path "node_modules")) {
  npm install
}
npm start
