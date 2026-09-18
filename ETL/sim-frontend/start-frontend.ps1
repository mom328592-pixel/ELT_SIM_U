Write-Host "Starting SIM Management Frontend..." -ForegroundColor Cyan
Set-Location $PSScriptRoot
if (!(Test-Path "node_modules")) {
  npm install
}
npm run dev
