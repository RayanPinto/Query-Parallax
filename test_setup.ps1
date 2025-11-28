# Wait for services to be up (simple sleep for now, or loop check)
Write-Host "Waiting for services to start..."
Start-Sleep -Seconds 10

# Create table and data
Write-Host "Creating test data in Postgres (100k rows)..."
docker exec -i mini-balancer-postgres-1 psql -U user -d demo -c "CREATE TABLE IF NOT EXISTS numbers (id INT PRIMARY KEY, val TEXT);"
# Use a transaction for faster insertion
docker exec -i mini-balancer-postgres-1 psql -U user -d demo -c "BEGIN; TRUNCATE TABLE numbers; INSERT INTO numbers (id, val) SELECT generate_series(1,100000), md5(random()::text); COMMIT;"

# Test query
Write-Host "Sending test query (100k rows)..."
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$response = Invoke-RestMethod -Uri "http://localhost:8089/query" -Method Post -ContentType "application/json" -Body '{"sql":"SELECT * FROM numbers WHERE id BETWEEN 1 AND 100000"}'
$sw.Stop()

Write-Host "Received $($response.rows.Count) rows in $($sw.Elapsed.TotalSeconds) seconds."
if ($response.rows.Count -eq 100000) {
    Write-Host "SUCCESS: Pipeline handled 100k rows!" -ForegroundColor Green
} else {
    Write-Host "FAILURE: Expected 100000 rows, got $($response.rows.Count)" -ForegroundColor Red
}
