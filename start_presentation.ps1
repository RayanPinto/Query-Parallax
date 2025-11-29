$env:MINIKUBE_HOME = "D:\MinikubeData"

Write-Host "🚀 Starting Adaptive Query Parallelization System Presentation Setup..." -ForegroundColor Cyan

# 1. Check Minikube Status
Write-Host "Checking Minikube status..." -ForegroundColor Yellow
$status = & ".\bin\minikube.exe" status
if ($status -match "Running") {
    Write-Host "✅ Minikube is already running." -ForegroundColor Green
} else {
    Write-Host "🔄 Starting Minikube..." -ForegroundColor Yellow
    & ".\bin\minikube.exe" start --driver=docker
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to start Minikube. Please check Docker Desktop."
        exit 1
    }
    Write-Host "✅ Minikube started." -ForegroundColor Green
}

# 2. Apply Kubernetes Manifests
Write-Host "📦 Deploying Application to Kubernetes..." -ForegroundColor Yellow
& ".\bin\kubectl.exe" apply -f k8s/
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment applied." -ForegroundColor Green
} else {
    Write-Error "Failed to apply manifests."
}

# 3. Wait for Pods (Optional, just a quick sleep)
Write-Host "⏳ Waiting for pods to stabilize (10s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 4. Get Service URL
Write-Host "🌐 Fetching Service URL..." -ForegroundColor Yellow
$url = & ".\bin\minikube.exe" service mini-balancer --url
Write-Host "Backend Service is available at: $url" -ForegroundColor Cyan

# 5. Start Dashboard
Write-Host "📊 Starting Dashboard..." -ForegroundColor Yellow
Set-Location "dashboard"
Write-Host "Opening Dashboard in Browser..." -ForegroundColor Cyan
Start-Process "http://localhost:3000"

Write-Host "⚠️  IMPORTANT: The dashboard server is starting below. Keep this window OPEN." -ForegroundColor Red
Write-Host "   If the browser says 'Connection Refused', wait a few seconds and refresh." -ForegroundColor Gray

npm run dev
