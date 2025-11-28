# Script to install Minikube and Kubectl locally in the workspace
Write-Host "=== Setting up Kubernetes Tools (Local) ===" -ForegroundColor Cyan

$binDir = "$PSScriptRoot\bin"
New-Item -ItemType Directory -Force -Path $binDir | Out-Null

# Download Minikube
Write-Host "Downloading Minikube..."
Invoke-WebRequest -Uri "https://github.com/kubernetes/minikube/releases/latest/download/minikube-windows-amd64.exe" -OutFile "$binDir\minikube.exe"

# Download Kubectl
Write-Host "Downloading Kubectl..."
Invoke-WebRequest -Uri "https://dl.k8s.io/release/v1.28.0/bin/windows/amd64/kubectl.exe" -OutFile "$binDir\kubectl.exe"

Write-Host "Tools installed to $binDir" -ForegroundColor Green
