# Simple metrics monitoring script
Write-Host "=== Query Performance Monitor ===" -ForegroundColor Cyan
Write-Host "Monitoring metrics at http://localhost:8000/metrics" -ForegroundColor Yellow
Write-Host ""

# Function to parse Prometheus metrics
function Get-MetricValue {
    param($MetricsText, $MetricName)
    $line = $MetricsText | Select-String -Pattern "^$MetricName\s+" | Select-Object -First 1
    if ($line) {
        return ($line.ToString() -split '\s+')[1]
    }
    return "0"
}

# Run performance tests
Write-Host "Running tests to generate metrics..." -ForegroundColor Green
& powershell -ExecutionPolicy Bypass -File .\test_aggregation.ps1 | Out-Null
& powershell -ExecutionPolicy Bypass -File .\test_dynamic.ps1 | Out-Null

Start-Sleep -Seconds 2

# Fetch metrics
try {
    $metrics = Invoke-RestMethod -Uri "http://localhost:8000/metrics" -ErrorAction Stop
    
    Write-Host "`n=== Performance Metrics ===" -ForegroundColor Cyan
    Write-Host ""
    
    $totalRequests = Get-MetricValue -MetricsText $metrics -MetricName "dispatcher_requests_total"
    Write-Host "Total Requests: $totalRequests" -ForegroundColor White
    
    $workerRequests = Get-MetricValue -MetricsText $metrics -MetricName "dispatcher_worker_requests_total"
    Write-Host "Worker Requests: $workerRequests" -ForegroundColor White
    
    $dynamicSplits = Get-MetricValue -MetricsText $metrics -MetricName "dispatcher_dynamic_splits_total"
    Write-Host "Dynamic Splits: $dynamicSplits" -ForegroundColor White
    
    Write-Host ""
    Write-Host "=== Aggregate Query Breakdown ===" -ForegroundColor Cyan
    $aggregateLines = $metrics | Select-String -Pattern 'dispatcher_aggregate_queries_total\{agg_type="([^"]+)"\}\s+(\d+)'
    foreach ($line in $aggregateLines) {
        if ($line -match 'agg_type="([^"]+)"\}\s+(\d+)') {
            $aggType = $matches[1]
            $count = $matches[2]
            Write-Host "  $aggType aggregates: $count" -ForegroundColor White
        }
    }
    
    Write-Host ""
    Write-Host "=== Latency Histogram (seconds) ===" -ForegroundColor Cyan
    $latencyLines = $metrics | Select-String -Pattern 'dispatcher_query_duration_seconds_bucket\{.*query_type="([^"]+)",le="([^"]+)"\}\s+(\d+)'
    
    $latencyData = @{}
    foreach ($line in $latencyLines) {
        if ($line -match 'query_type="([^"]+)",le="([^"]+)"\}\s+(\d+)') {
            $queryType = $matches[1]
            $bucket = $matches[2]
            $count = $matches[3]
            
            if (-not $latencyData.ContainsKey($queryType)) {
                $latencyData[$queryType] = @{}
            }
            $latencyData[$queryType][$bucket] = $count
        }
    }
    
    foreach ($queryType in $latencyData.Keys) {
        Write-Host$"  $queryType queries:" -ForegroundColor Yellow
        foreach ($bucket in ($latencyData[$queryType].Keys | Sort-Object {[double]$_})) {
            $count = $latencyData[$queryType][$bucket]
            Write-Host "    <= ${bucket}s: $count requests" -ForegroundColor White
        }
    }
    
    Write-Host ""
    Write-Host "Full metrics available at: http://localhost:8000/metrics" -ForegroundColor Cyan
    
} catch {
    Write-Host "Error: Could not fetch metrics. Is the dispatcher running?" -ForegroundColor Red
    Write-Host "Start it with: docker compose up --scale worker=4 -d" -ForegroundColor Yellow
}
