# Auto-Scaling Deployment Script (Local Kubernetes)
Write-Host "=== Deploying to Local Kubernetes (Minikube) ===" -ForegroundColor Cyan

$bin = "$PSScriptRoot\bin"
$minikube = "$bin\minikube.exe"
$kubectl = "$bin\kubectl.exe"

# Force Minikube to use D: drive
$env:MINIKUBE_HOME = "D:\MinikubeData"

# Check if Minikube is running
try {
    $minikubeStatus = & $minikube status 2>&1
    if ($minikubeStatus -match "Stopped" -or $minikubeStatus -match "not found") {
        Write-Host "Starting Minikube..." -ForegroundColor Yellow
        & $minikube start
    }
} catch {
    Write-Host "Starting Minikube (First run)..." -ForegroundColor Yellow
    & $minikube start
}

# Point Docker to Minikube's daemon
Write-Host "Configuring Docker environment..." -ForegroundColor Yellow
& $minikube -p minikube docker-env --shell powershell | Invoke-Expression

# Build images directly inside Minikube
Write-Host "Building images in Minikube..." -ForegroundColor Yellow
docker build -t mini-balancer:latest .
docker build -t dispatcher:latest ./dispatcher
docker build -t worker:latest ./worker

# Deploy to Kubernetes
Write-Host "Applying Kubernetes manifests..." -ForegroundColor Yellow
& $kubectl apply -f k8s/postgres.yaml
& $kubectl apply -f k8s/worker.yaml
& $kubectl apply -f k8s/dispatcher.yaml
& $kubectl apply -f k8s/mini-balancer.yaml
& $kubectl apply -f k8s/hpa.yaml

# Wait for rollout
Write-Host "Waiting for deployments..." -ForegroundColor Yellow
& $kubectl rollout status deployment/postgres
& $kubectl rollout status deployment/worker
& $kubectl rollout status deployment/dispatcher

# Enable Metrics Server (required for HPA)
Write-Host "Enabling Metrics Server..." -ForegroundColor Yellow
& $minikube addons enable metrics-server

Write-Host ""
Write-Host "=== Deployment Complete! ===" -ForegroundColor Green
Write-Host "Access the application at:" -ForegroundColor White
& $minikube service mini-balancer --url
