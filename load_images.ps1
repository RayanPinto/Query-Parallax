# Load Pre-built Images into Minikube
Write-Host "=== Loading Images into Minikube ===" -ForegroundColor Cyan

$bin = "$PSScriptRoot\bin"
$minikube = "$bin\minikube.exe"
$kubectl = "$bin\kubectl.exe"
$env:MINIKUBE_HOME = "D:\MinikubeData"

# Load images into Minikube
Write-Host "Loading mini-balancer:latest..." -ForegroundColor Yellow
& $minikube image load mini-balancer:latest

Write-Host "Loading dispatcher:latest..." -ForegroundColor Yellow
& $minikube image load dispatcher:latest

Write-Host "Loading worker:latest..." -ForegroundColor Yellow
& $minikube image load worker:latest

# Verify images are in Minikube
Write-Host "`nImages in Minikube:" -ForegroundColor Green
& $minikube image ls | Select-String -Pattern "mini-balancer|dispatcher|worker"

# Delete existing failed pods
Write-Host "`nDeleting failed pods..." -ForegroundColor Yellow
& $kubectl delete pods --all

# Wait for new pods
Start-Sleep -Seconds 5

# Check status
Write-Host "`nNew Pod Status:" -ForegroundColor Green
& $kubectl get pods

Write-Host "`n=== Image Load Complete ===" -ForegroundColor Cyan
