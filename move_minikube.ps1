# Move Minikube to D: Drive
Write-Host "=== Relocating Minikube to D: Drive ===" -ForegroundColor Cyan

$bin = "$PSScriptRoot\bin"
$minikube = "$bin\minikube.exe"

# 1. Delete existing cluster
# Write-Host "Deleting old cluster..." -ForegroundColor Yellow
# & $minikube delete --all

# 2. Set environment variable for Minikube Home
# This tells Minikube to store its VM and data on D:
$env:MINIKUBE_HOME = "D:\MinikubeData"
[Environment]::SetEnvironmentVariable("MINIKUBE_HOME", "D:\MinikubeData", [EnvironmentVariableTarget]::User)

# Ensure directory exists
New-Item -ItemType Directory -Force -Path "D:\MinikubeData" | Out-Null

Write-Host "Minikube configured to use D:\MinikubeData" -ForegroundColor Green

# 3. Start Minikube with new location
Write-Host "Starting Minikube on D: drive..." -ForegroundColor Yellow
& $minikube start --driver=docker --base-image="gcr.io/k8s-minikube/kicbase:v0.0.44"

Write-Host "Minikube started successfully on D: drive!" -ForegroundColor Green
