# Worker Metrics and Query Distribution Tracker
# Shows which workers processed which queries

Write-Host "`n=== WORKER METRICS & QUERY DISTRIBUTION ===" -ForegroundColor Cyan

$bin = "$PSScriptRoot\bin"
$kubectl = "$bin\kubectl.exe"

Write-Host "`n[1] Worker Pod Status" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray
& $kubectl get pods -l app=worker -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,RESTARTS:.status.containerStatuses[0].restartCount,AGE:.metadata.creationTimestamp

Write-Host "`n[2] Dispatcher Metrics" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "Fetching metrics from dispatcher..." -ForegroundColor Gray

$dispatcherPod = & $kubectl get pods -l app=dispatcher -o jsonpath='{.items[0].metadata.name}'
if ($dispatcherPod) {
    Write-Host "Dispatcher Pod: $dispatcherPod" -ForegroundColor White
    
    # Get recent logs with query distribution info
    Write-Host "`nRecent Query Processing:" -ForegroundColor Cyan
    & $kubectl logs $dispatcherPod --tail=50 | Select-String -Pattern "DEBUG dispatch:|Worker returned|subqueries" | Select-Object -Last 20
}

Write-Host "`n[3] Worker Resource Usage" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray
& $kubectl top pods -l app=worker 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Metrics server not available. Install with: kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml" -ForegroundColor Yellow
}

Write-Host "`n[4] Service Endpoints" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray
& $kubectl get endpoints worker-svc -o json | ConvertFrom-Json | Select-Object -ExpandProperty subsets | Select-Object -ExpandProperty addresses | ForEach-Object {
    Write-Host "Worker IP: $($_.ip)" -ForegroundColor White
}

Write-Host "`n[5] Query Distribution Summary" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray

# Count queries processed
$logs = & $kubectl logs -l app=dispatcher --tail=200
$totalQueries = ($logs | Select-String -Pattern "DEBUG dispatch: is_agg" | Measure-Object).Count
$groupByQueries = ($logs | Select-String -Pattern "group_by=\[" | Measure-Object).Count
$havingQueries = ($logs | Select-String -Pattern "having=True" | Measure-Object).Count
$workerCalls = ($logs | Select-String -Pattern "Worker returned" | Measure-Object).Count

Write-Host "Total Queries Processed: $totalQueries" -ForegroundColor Green
Write-Host "GROUP BY Queries: $groupByQueries" -ForegroundColor Green
Write-Host "HAVING Queries: $havingQueries" -ForegroundColor Green
Write-Host "Worker Calls Made: $workerCalls" -ForegroundColor Green

if ($totalQueries -gt 0) {
    $avgWorkersPerQuery = [math]::Round($workerCalls / $totalQueries, 2)
    Write-Host "Average Workers per Query: $avgWorkersPerQuery" -ForegroundColor Cyan
}

Write-Host "`n[6] Current Worker Count" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray
$workerCount = (& $kubectl get pods -l app=worker -o json | ConvertFrom-Json).items.Count
Write-Host "Active Workers: $workerCount" -ForegroundColor White

Write-Host "`n[7] Scaling Information" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "To scale workers:" -ForegroundColor Cyan
Write-Host "  Scale up:   kubectl scale deployment worker --replicas=10" -ForegroundColor White
Write-Host "  Scale down: kubectl scale deployment worker --replicas=4" -ForegroundColor White

Write-Host "`n=== Metrics Collection Complete ===" -ForegroundColor Cyan
Write-Host ""
