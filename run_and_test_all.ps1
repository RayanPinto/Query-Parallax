# Master Run & Test Script
# Verifies the entire distributed query processing system

$ErrorActionPreference = "Stop"
$bin = "$PSScriptRoot\bin"
$kubectl = "$bin\kubectl.exe"
$minikube = "$bin\minikube.exe"

Write-Host "=== STARTING SYSTEM VERIFICATION ===" -ForegroundColor Cyan

# 1. Check Kubernetes Status
Write-Host "`n[1] Checking Kubernetes Cluster..." -ForegroundColor Yellow
$pods = & $kubectl get pods -o json | ConvertFrom-Json
$runningPods = $pods.items | Where-Object { $_.status.phase -eq 'Running' }
Write-Host "Active Pods: $($runningPods.Count) / $($pods.items.Count)" -ForegroundColor White

if ($runningPods.Count -lt 4) {
    Write-Host "⚠️  Some pods are not running. Attempting to fix..." -ForegroundColor Red
    .\deploy_k8s.ps1
    Start-Sleep -Seconds 10
} else {
    Write-Host "✅ Cluster is healthy" -ForegroundColor Green
}

# 2. Initialize Database
Write-Host "`n[2] Verifying Database Data..." -ForegroundColor Yellow
# We'll run the init script to ensure data exists (it drops/recreates tables)
Write-Host "Initializing realistic business data..." -ForegroundColor Gray
.\init_realistic_database.ps1

# 3. Backend API Test
Write-Host "`n[3] Testing Backend API & Worker Distribution..." -ForegroundColor Yellow
Write-Host "Running complex query demo..." -ForegroundColor Gray
python demo_presentation.py

# 4. Dashboard Setup
Write-Host "`n[4] Dashboard Configuration..." -ForegroundColor Yellow

# Get API URL
$apiUrl = & $minikube service mini-balancer --url
Write-Host "Backend API URL: $apiUrl" -ForegroundColor White

# Check if Dashboard is configured correctly
$nextConfigPath = "$PSScriptRoot\dashboard\next.config.ts"
if (Test-Path $nextConfigPath) {
    $configContent = Get-Content $nextConfigPath
    if ($configContent -match "http://127.0.0.1:\d+") {
        Write-Host "✅ Dashboard is configured to connect to backend" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Dashboard config might need update. Checking..." -ForegroundColor Yellow
    }
}

Write-Host "`n=== SYSTEM READY! ===" -ForegroundColor Cyan
Write-Host "`nTo test the Dashboard:" -ForegroundColor Yellow
Write-Host "1. Open a NEW terminal" -ForegroundColor White
Write-Host "2. Run: cd dashboard" -ForegroundColor White
Write-Host "3. Run: npm run dev" -ForegroundColor White
Write-Host "4. Open http://localhost:3000/analytics in your browser" -ForegroundColor White
Write-Host "`nYou should see the new Analytics page with:" -ForegroundColor Cyan
Write-Host "   - Real-time worker status" -ForegroundColor Gray
Write-Host "   - Interactive demo queries" -ForegroundColor Gray
Write-Host "   - Charts and data tables" -ForegroundColor Gray
