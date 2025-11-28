# Setup Minikube on D: Drive
Write-Host "=== Setting up Minikube on D: Drive ===" -ForegroundColor Cyan

$bin = "$PSScriptRoot\bin"
$minikube = "$bin\minikube.exe"

# 1. Set Environment Variable
$env:MINIKUBE_HOME = "D:\MinikubeData"
[Environment]::SetEnvironmentVariable("MINIKUBE_HOME", "D:\MinikubeData", [EnvironmentVariableTarget]::User)
Write-Host "MINIKUBE_HOME set to D:\MinikubeData" -ForegroundColor Green

# 2. Ensure Directory Exists
New-Item -ItemType Directory -Force -Path "D:\MinikubeData" | Out-Null

# 3. Start Minikube
Write-Host "Starting Minikube..." -ForegroundColor Yellow
# Using --force to bypass some checks if needed, and ensuring docker driver
& $minikube start --driver=docker --base-image="gcr.io/k8s-minikube/kicbase:v0.0.44" --force

if ($LASTEXITCODE -eq 0) {
    Write-Host "Minikube started successfully!" -ForegroundColor Green
    
    # 4. Run Deployment
    Write-Host "Running deployment script..." -ForegroundColor Yellow
    .\deploy_k8s.ps1
} else {
    Write-Host "Minikube failed to start. Please check Docker Desktop status." -ForegroundColor Red
}
