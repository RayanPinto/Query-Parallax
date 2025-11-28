# Apply Updated Manifests
$env:MINIKUBE_HOME = "D:\MinikubeData"
$kubectl = "d:\Z_final_pbl\mini-balancer\bin\kubectl.exe"

Write-Host "=== Applying Updated Manifests ===" -ForegroundColor Cyan

& $kubectl apply -f k8s/worker.yaml
& $kubectl apply -f k8s/dispatcher.yaml
& $kubectl apply -f k8s/mini-balancer.yaml

Write-Host "`nWaiting for pods to restart..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

& $kubectl get pods

Write-Host "`n=== Done ===" -ForegroundColor Green
