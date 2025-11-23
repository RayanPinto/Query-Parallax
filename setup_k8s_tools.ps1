# Script to install Minikube and Kubectl on Windows
Write-Host "=== Setting up Kubernetes Tools ===" -ForegroundColor Cyan

# Check for Winget
if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host "Installing Minikube via Winget..." -ForegroundColor Yellow
    winget install Kubernetes.Minikube
    
    Write-Host "Installing Kubectl via Winget..." -ForegroundColor Yellow
    winget install Kubernetes.kubectl
} else {
    Write-Host "Winget not found. Downloading binaries directly..." -ForegroundColor Yellow
    
    # Create bin directory
    $binDir = "C:\k8s-bin"
    New-Item -ItemType Directory -Force -Path $binDir | Out-Null
    
    # Download Minikube
    Write-Host "Downloading Minikube..."
    Invoke-WebRequest -Uri "https://github.com/kubernetes/minikube/releases/latest/download/minikube-windows-amd64.exe" -OutFile "$binDir\minikube.exe"
    
    # Download Kubectl
    Write-Host "Downloading Kubectl..."
    Invoke-WebRequest -Uri "https://dl.k8s.io/release/v1.28.0/bin/windows/amd64/kubectl.exe" -OutFile "$binDir\kubectl.exe"
    
    # Add to PATH
    $env:Path += ";$binDir"
    [Environment]::SetEnvironmentVariable("Path", $env:Path + ";$binDir", [EnvironmentVariableTarget]::User)
    
    Write-Host "Tools installed to $binDir and added to PATH." -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Installation Complete ===" -ForegroundColor Green
Write-Host "Please restart your terminal/PowerShell to use 'minikube' and 'kubectl'." -ForegroundColor White
