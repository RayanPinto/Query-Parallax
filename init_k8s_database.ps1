# Initialize Database in Kubernetes
$env:MINIKUBE_HOME = "D:\MinikubeData"
$kubectl = "d:\Z_final_pbl\mini-balancer\bin\kubectl.exe"

Write-Host "=== Initializing Database in Kubernetes ===" -ForegroundColor Cyan

# Get the postgres pod name
$podName = & $kubectl get pods -l app=postgres -o jsonpath="{.items[0].metadata.name}"

Write-Host "Postgres pod: $podName" -ForegroundColor Gray

# Create the database and table with test data
Write-Host "Creating 'numbers' table with 100,000 rows..." -ForegroundColor Yellow

$sql = @"
CREATE TABLE IF NOT EXISTS numbers (id INT PRIMARY KEY);
INSERT INTO numbers (id) SELECT generate_series(1, 100000);
"@

& $kubectl exec $podName -- psql -U user -d demo -c "DROP TABLE IF EXISTS numbers;"
& $kubectl exec $podName -- psql -U user -d demo -c "CREATE TABLE numbers (id INT PRIMARY KEY);"
& $kubectl exec $podName -- psql -U user -d demo -c "INSERT INTO numbers (id) SELECT generate_series(1, 100000);"

Write-Host "Verifying data..." -ForegroundColor Yellow
& $kubectl exec $podName -- psql -U user -d demo -c "SELECT COUNT(*) FROM numbers;"

Write-Host "`n=== Database Initialized! ===" -ForegroundColor Green
Write-Host "You can now run queries from the dashboard." -ForegroundColor White
