# Rebuild and Deploy to Minikube
Write-Host "=== Rebuilding Images in Minikube Docker ===" -ForegroundColor Cyan

$bin = "$PSScriptRoot\bin"
$minikube = "$bin\minikube.exe"
$kubectl = "$bin\kubectl.exe"
$env:MINIKUBE_HOME = "D:\MinikubeData"

# Configure current shell to use Minikube's Docker
Write-Host "Switching to Minikube Docker daemon..." -ForegroundColor Yellow
& $minikube -p minikube docker-env --shell powershell | Invoke-Expression

# Verify we're using Minikube's Docker
Write-Host "Current Docker host:" -ForegroundColor Gray
docker context show

# Build images
Write-Host "Building mini-balancer..." -ForegroundColor Yellow
docker build -t mini-balancer:latest .

Write-Host "Building dispatcher..." -ForegroundColor Yellow
docker build -t dispatcher:latest ./dispatcher

Write-Host "Building worker..." -ForegroundColor Yellow
docker build -t worker:latest ./worker

# List images to confirm
Write-Host "`nImages in Minikube:" -ForegroundColor Green
docker images | Select-String -Pattern "mini-balancer|dispatcher|worker|latest"

# Delete existing pods to force recreation
Write-Host "`nDeleting existing pods..." -ForegroundColor Yellow
& $kubectl delete pods --all

# Wait a moment
Start-Sleep -Seconds 5

# Check pod status
Write-Host "`nPod Status:" -ForegroundColor Green
& $kubectl get pods

Write-Host "`n=== Rebuild Complete ===" -ForegroundColor Cyan
Write-Host "Pods should be starting now. Run 'kubectl get pods -w' to watch." -ForegroundColor White
