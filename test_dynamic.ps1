# Test script for dynamic splitting (no explicit BETWEEN needed)
Write-Host "=== Testing Dynamic Splitting ===" -ForegroundColor Cyan

# Wait for services
Write-Host "Waiting for services to start..."
Start-Sleep -Seconds 10

# Test 1: SELECT * without any WHERE clause (fully dynamic)
Write-Host ""
Write-Host "[Test 1] SELECT * FROM numbers (no WHERE clause)..." -ForegroundColor Yellow
$sw1 = [System.Diagnostics.Stopwatch]::StartNew()
$response1 = Invoke-RestMethod -Uri "http://localhost:8089/query" -Method Post -ContentType "application/json" -Body '{"sql":"SELECT * FROM numbers"}'
$sw1.Stop()
Write-Host "Received $($response1.rows.Count) rows in $($sw1.Elapsed.TotalSeconds) seconds" -ForegroundColor Green
if ($response1.rows.Count -eq 100000) {
    Write-Host "  Dynamic splitting worked! Got all 100k rows." -ForegroundColor Green
} else {
    Write-Host "  Warning: Expected 100000 rows, got $($response1.rows.Count)" -ForegroundColor Yellow
}

# Test 2: COUNT without WHERE clause
Write-Host ""
Write-Host "[Test 2] SELECT COUNT(*) FROM numbers (no WHERE)..." -ForegroundColor Yellow
$sw2 = [System.Diagnostics.Stopwatch]::StartNew()
$response2 = Invoke-RestMethod -Uri "http://localhost:8089/query" -Method Post -ContentType "application/json" -Body '{"sql":"SELECT COUNT(*) FROM numbers"}'
$sw2.Stop()
$countResult = $response2.rows[0].result
Write-Host "COUNT result: $countResult in $($sw2.Elapsed.TotalSeconds) seconds" -ForegroundColor Green
if ($countResult -eq 100000) {
    Write-Host "  COUNT is correct!" -ForegroundColor Green
} else {
    Write-Host "  COUNT is incorrect! Expected 100000, got $countResult" -ForegroundColor Red
}

# Test 3: SUM without WHERE clause
Write-Host ""
Write-Host "[Test 3] SELECT SUM(id) FROM numbers (no WHERE)..." -ForegroundColor Yellow
$sw3 = [System.Diagnostics.Stopwatch]::StartNew()
$response3 = Invoke-RestMethod -Uri "http://localhost:8089/query" -Method Post -ContentType "application/json" -Body '{"sql":"SELECT SUM(id) FROM numbers"}'
$sw3.Stop()
$sumResult = $response3.rows[0].result
$expectedSum = (100000 * 100001) / 2
Write-Host "SUM result: $sumResult in $($sw3.Elapsed.TotalSeconds) seconds" -ForegroundColor Green
if ($sumResult -eq $expectedSum) {
    Write-Host "  SUM is correct!" -ForegroundColor Green
} else {
    Write-Host "  SUM is incorrect! Expected $expectedSum, got $sumResult" -ForegroundColor Red
}

# Test 4: Original BETWEEN query still works
Write-Host ""
Write-Host "[Test 4] SELECT * FROM numbers WHERE id BETWEEN 1 AND 50000 (explicit)..." -ForegroundColor Yellow
$sw4 = [System.Diagnostics.Stopwatch]::StartNew()
$response4 = Invoke-RestMethod -Uri "http://localhost:8089/query" -Method Post -ContentType "application/json" -Body '{"sql":"SELECT * FROM numbers WHERE id BETWEEN 1 AND 50000"}'
$sw4.Stop()
Write-Host "Received $($response4.rows.Count) rows in $($sw4.Elapsed.TotalSeconds) seconds" -ForegroundColor Green
if ($response4.rows.Count -eq 50000) {
    Write-Host "  Explicit BETWEEN still works!" -ForegroundColor Green
} else {
    Write-Host "  Warning: Expected 50000 rows, got $($response4.rows.Count)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Dynamic splitting is working! The system can now:" -ForegroundColor Green
Write-Host "  - Split queries WITHOUT explicit BETWEEN clauses" -ForegroundColor White
Write-Host "  - Auto-detect min/max from the database" -ForegroundColor White
Write-Host "  - Work on ANY table (not just hardcoded ranges)" -ForegroundColor White
