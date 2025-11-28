$env:MINIKUBE_HOME = "D:\MinikubeData"
$kubectl = "d:\Z_final_pbl\mini-balancer\bin\kubectl.exe"

Write-Host "Waiting for all pods to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 45

Write-Host "`n=== Pod Status ===" -ForegroundColor Cyan
& $kubectl get pods

Write-Host "`n=== Service URL ===" -ForegroundColor Cyan
& "d:\Z_final_pbl\mini-balancer\bin\minikube.exe" service mini-balancer --url
