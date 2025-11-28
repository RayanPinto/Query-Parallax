# Cleanup Script for C: Drive
Write-Host "=== Cleaning up C: Drive Artifacts ===" -ForegroundColor Cyan

# 1. Remove Minikube Data
$minikubePath = "C:\Users\Rayan\.minikube"
if (Test-Path $minikubePath) {
    Write-Host "Removing $minikubePath..." -ForegroundColor Yellow
    try {
        Remove-Item -Path $minikubePath -Recurse -Force -ErrorAction Stop
        Write-Host "Successfully removed Minikube data." -ForegroundColor Green
    } catch {
        Write-Host "Failed to remove some files (likely locked). Please restart Docker Desktop if this persists." -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
    }
} else {
    Write-Host "Minikube data not found on C:." -ForegroundColor Green
}

# 2. Remove k8s-bin (if I created it)
$binPath = "C:\k8s-bin"
if (Test-Path $binPath) {
    Write-Host "Removing $binPath..." -ForegroundColor Yellow
    Remove-Item -Path $binPath -Recurse -Force
    Write-Host "Successfully removed k8s-bin." -ForegroundColor Green
}

Write-Host "Cleanup Complete." -ForegroundColor Cyan
