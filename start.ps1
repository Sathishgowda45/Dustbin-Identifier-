# Dustbin Finder - Start Script
# Run this script to start both backend and frontend

Write-Host "🗑️ Dustbin Finder - Starting..." -ForegroundColor Cyan

# 1. Start MongoDB service if not running
$mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
if ($mongoService) {
    if ($mongoService.Status -ne "Running") {
        Write-Host "🍃 Starting MongoDB service..." -ForegroundColor Yellow
        Start-Service -Name "MongoDB"
        Start-Sleep -Seconds 2
        Write-Host "✅ MongoDB started!" -ForegroundColor Green
    } else {
        Write-Host "✅ MongoDB is already running" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  MongoDB service not found. Make sure MongoDB is installed." -ForegroundColor Red
    Write-Host "   Install from: https://www.mongodb.com/try/download/community" -ForegroundColor Yellow
}

# 2. Start Backend
Write-Host "🚀 Starting Backend (port 5000)..." -ForegroundColor Yellow
$backendPath = Join-Path $PSScriptRoot "backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; node server.js" -WindowStyle Normal

Start-Sleep -Seconds 2

# 3. Start Frontend
Write-Host "🎨 Starting Frontend (port 5173)..." -ForegroundColor Yellow
$frontendPath = Join-Path $PSScriptRoot "frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npx vite" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "✅ All services started!" -ForegroundColor Green
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "   Backend:  http://localhost:5000/api/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Admin Login:" -ForegroundColor White
Write-Host "   Email:    admin@dustbinfinder.com" -ForegroundColor Yellow
Write-Host "   Password: admin123" -ForegroundColor Yellow
