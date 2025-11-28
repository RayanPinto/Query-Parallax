# Load Generator for Auto-Scaling Demo
Write-Host "=== Starting Load Generator ===" -ForegroundColor Cyan
Write-Host "Simulating high traffic to trigger auto-scaling..." -ForegroundColor Yellow

$url = "http://localhost:8089/query"
$concurrentUsers = 20
$durationSeconds = 60

$scriptBlock = {
    param($url)
    while ($true) {
        try {
            # Send a CPU-intensive query (aggregation)
            $body = '{"sql":"SELECT COUNT(*) FROM numbers"}'
            Invoke-RestMethod -Uri $url -Method Post -ContentType "application/json" -Body $body -ErrorAction SilentlyContinue
        } catch {}
    }
}

# Start concurrent jobs
$jobs = @()
for ($i = 0; $i -lt $concurrentUsers; $i++) {
    $jobs += Start-Job -ScriptBlock $scriptBlock -ArgumentList $url
}

Write-Host "Generating load with $concurrentUsers concurrent users..." -ForegroundColor Green
Write-Host "Watch the 'System Status' page in the dashboard!" -ForegroundColor White
Write-Host "Workers should scale from 1 -> 10" -ForegroundColor White

Start-Sleep -Seconds $durationSeconds

# Stop jobs
Get-Job | Stop-Job
Get-Job | Remove-Job

Write-Host "Load test complete." -ForegroundColor Cyan
