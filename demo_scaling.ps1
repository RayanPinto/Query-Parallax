# Manual Scaling Demo Script
# Since HPA metrics aren't working, we'll manually scale to demonstrate

$env:MINIKUBE_HOME = "D:\MinikubeData"
$kubectl = "d:\Z_final_pbl\mini-balancer\bin\kubectl.exe"

Write-Host "=== Demonstrating Worker Scaling ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Current workers:" -ForegroundColor Yellow
& $kubectl get pods -l app=worker

Write-Host ""
Write-Host "Scaling UP to 8 workers..." -ForegroundColor Green
& $kubectl scale deployment worker --replicas=8

Write-Host ""
Write-Host "Waiting for new pods to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "New worker count:" -ForegroundColor Green
& $kubectl get pods -l app=worker

Write-Host ""
Write-Host "✅ Scaled from 4 to 8 workers!" -ForegroundColor Green
Write-Host "Refresh your Status page to see the new workers!" -ForegroundColor White
Write-Host ""
Write-Host "To scale back down:" -ForegroundColor Gray
Write-Host "  kubectl scale deployment worker --replicas=4" -ForegroundColor Gray
