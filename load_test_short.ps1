# Load Generator for Auto-Scaling Demo (Short Version)
Write-Host "=== Starting Load Generator (Test Mode) ===" -ForegroundColor Cyan
Write-Host "Simulating high traffic..." -ForegroundColor Yellow

$url = "http://localhost:8089/query"
$concurrentUsers = 5
$durationSeconds = 5

$scriptBlock = {
    param($url)
    while ($true) {
        try {
            $body = '{"sql":"SELECT COUNT(*) FROM numbers"}'
            Invoke-RestMethod -Uri $url -Method Post -ContentType "application/json" -Body $body -ErrorAction SilentlyContinue
        } catch {}
    }
}

$jobs = @()
for ($i = 0; $i -lt $concurrentUsers; $i++) {
    $jobs += Start-Job -ScriptBlock $scriptBlock -ArgumentList $url
}

Write-Host "Generating load..." -ForegroundColor Green
Start-Sleep -Seconds $durationSeconds

jobs | Stop-Job
jobs | Remove-Job

Write-Host "Load test complete." -ForegroundColor Cyan
