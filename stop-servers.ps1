# AI Engineer Challenge - Server Stop Script for Windows PowerShell
Write-Host "🛑 Stopping AI Engineer Challenge servers..." -ForegroundColor Red

# Stop Node.js processes (frontend)
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "Stopping Node.js processes..." -ForegroundColor Yellow
    $nodeProcesses | Stop-Process -Force
}

# Stop Python processes (backend)
$pythonProcesses = Get-Process -Name "python" -ErrorAction SilentlyContinue
if ($pythonProcesses) {
    Write-Host "Stopping Python processes..." -ForegroundColor Yellow
    $pythonProcesses | Stop-Process -Force
}

Write-Host "✅ Servers stopped successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "To restart servers, run: .\start-servers.ps1" -ForegroundColor Cyan
