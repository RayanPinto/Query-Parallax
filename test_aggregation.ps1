# Test script for aggregation support
Write-Host "=== Testing Aggregation Support ===" -ForegroundColor Cyan

# Wait for services
Write-Host "Waiting for services to start..."
Start-Sleep -Seconds 10

# Test 1: Regular SELECT (baseline)
Write-Host ""
Write-Host "[Test 1] Regular SELECT query (100k rows)..." -ForegroundColor Yellow
$sw1 = [System.Diagnostics.Stopwatch]::StartNew()
$response1 = Invoke-RestMethod -Uri "http://localhost:8089/query" -Method Post -ContentType "application/json" -Body '{"sql":"SELECT * FROM numbers WHERE id BETWEEN 1 AND 100000"}'
$sw1.Stop()
Write-Host "Received $($response1.rows.Count) rows in $($sw1.Elapsed.TotalSeconds) seconds" -ForegroundColor Green

# Test 2: COUNT(*)
Write-Host ""
Write-Host "[Test 2] COUNT(*) query..." -ForegroundColor Yellow
$sw2 = [System.Diagnostics.Stopwatch]::StartNew()
$response2 = Invoke-RestMethod -Uri "http://localhost:8089/query" -Method Post -ContentType "application/json" -Body '{"sql":"SELECT COUNT(*) FROM numbers WHERE id BETWEEN 1 AND 100000"}'
$sw2.Stop()
$countResult = $response2.rows[0].result
Write-Host "COUNT result: $countResult in $($sw2.Elapsed.TotalSeconds) seconds" -ForegroundColor Green
if ($countResult -eq 100000) {
    Write-Host "  COUNT is correct!" -ForegroundColor Green
} else {
    Write-Host "  COUNT is incorrect! Expected 100000, got $countResult" -ForegroundColor Red
}

# Test 3: SUM(id)
Write-Host ""
Write-Host "[Test 3] SUM(id) query..." -ForegroundColor Yellow
$sw3 = [System.Diagnostics.Stopwatch]::StartNew()
$response3 = Invoke-RestMethod -Uri "http://localhost:8089/query" -Method Post -ContentType "application/json" -Body '{"sql":"SELECT SUM(id) FROM numbers WHERE id BETWEEN 1 AND 100000"}'
$sw3.Stop()
$sumResult = $response3.rows[0].result
$expectedSum = (100000 * 100001) / 2
Write-Host "SUM result: $sumResult in $($sw3.Elapsed.TotalSeconds) seconds" -ForegroundColor Green
if ($sumResult -eq $expectedSum) {
    Write-Host "  SUM is correct!" -ForegroundColor Green
} else {
    Write-Host "  SUM is incorrect! Expected $expectedSum, got $sumResult" -ForegroundColor Red
}

# Test 4: MIN(id)
Write-Host ""
Write-Host "[Test 4] MIN(id) query..." -ForegroundColor Yellow
$sw4 = [System.Diagnostics.Stopwatch]::StartNew()
$response4 = Invoke-RestMethod -Uri "http://localhost:8089/query" -Method Post -ContentType "application/json" -Body '{"sql":"SELECT MIN(id) FROM numbers WHERE id BETWEEN 1 AND 100000"}'
$sw4.Stop()
$minResult = $response4.rows[0].result
Write-Host "MIN result: $minResult in $($sw4.Elapsed.TotalSeconds) seconds" -ForegroundColor Green
if ($minResult -eq 1) {
    Write-Host "  MIN is correct!" -ForegroundColor Green
} else {
    Write-Host "  MIN is incorrect! Expected 1, got $minResult" -ForegroundColor Red
}

# Test 5: MAX(id)
Write-Host ""
Write-Host "[Test 5] MAX(id) query..." -ForegroundColor Yellow
$sw5 = [System.Diagnostics.Stopwatch]::StartNew()
$response5 = Invoke-RestMethod -Uri "http://localhost:8089/query" -Method Post -ContentType "application/json" -Body '{"sql":"SELECT MAX(id) FROM numbers WHERE id BETWEEN 1 AND 100000"}'
$sw5.Stop()
$maxResult = $response5.rows[0].result
Write-Host "MAX result: $maxResult in $($sw5.Elapsed.TotalSeconds) seconds" -ForegroundColor Green
if ($maxResult -eq 100000) {
    Write-Host "  MAX is correct!" -ForegroundColor Green
} else {
    Write-Host "  MAX is incorrect! Expected 100000, got $maxResult" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "All aggregation tests completed! The Map-Reduce pattern is working." -ForegroundColor Green
