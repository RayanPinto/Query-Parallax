# Quick Docker & System Cleanup Script
Write-Host "🧹 Docker & System Cleanup for Presentation" -ForegroundColor Cyan

# 1. Stop Docker Desktop
Write-Host "`n1️⃣ Stopping Docker Desktop..." -ForegroundColor Yellow
Stop-Process -Name "Docker Desktop" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 5

# 2. Clean Docker cache and unused resources
Write-Host "`n2️⃣ Cleaning Docker cache..." -ForegroundColor Yellow
docker system prune -a -f --volumes 2>$null

# 3. Clean Windows temporary files
Write-Host "`n3️⃣ Cleaning Windows temp files..." -ForegroundColor Yellow
Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "C:\Windows\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue

# 4. Empty Recycle Bin
Write-Host "`n4️⃣ Emptying Recycle Bin..." -ForegroundColor Yellow
Clear-RecycleBin -Force -ErrorAction SilentlyContinue

# 5. Check C drive space
Write-Host "`n✅ Cleanup Complete!" -ForegroundColor Green
$drive = Get-PSDrive C
$freeGB = [math]::Round($drive.Free / 1GB, 2)
Write-Host "C: Drive Free Space: $freeGB GB" -ForegroundColor Cyan

if ($freeGB -lt 5) {
    Write-Host "`n⚠️ WARNING: Still low on space. You may need to:" -ForegroundColor Red
    Write-Host "   - Uninstall unused programs" -ForegroundColor Yellow
    Write-Host "   - Move large files to D: drive" -ForegroundColor Yellow
    Write-Host "   - Move Docker data to D: drive (see DOCKER_MOVE_GUIDE.md)" -ForegroundColor Yellow
} else {
    Write-Host "`n✅ You should have enough space now. Try starting Docker Desktop." -ForegroundColor Green
}
