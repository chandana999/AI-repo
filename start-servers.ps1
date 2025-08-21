# AI Engineer Challenge - Server Startup Script for Windows PowerShell
Write-Host "🚀 Starting AI Engineer Challenge servers..." -ForegroundColor Green

# Function to start backend server
function Start-Backend {
    Write-Host "📡 Starting backend server..." -ForegroundColor Yellow
    Set-Location "api"
    
    # Check if virtual environment exists
    if (-not (Test-Path "venv")) {
        Write-Host "Creating virtual environment..." -ForegroundColor Yellow
        python -m venv venv
    }
    
    # Activate virtual environment and start server
    & "venv\Scripts\Activate.ps1"
    pip install -r requirements.txt
    python app.py
}

# Function to start frontend server
function Start-Frontend {
    Write-Host "🎨 Starting frontend server..." -ForegroundColor Yellow
    Set-Location "frontend"
    
    # Install dependencies if node_modules doesn't exist
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
        npm install
    }
    
    npm run dev
}

# Start both servers in separate PowerShell windows
Write-Host "Starting backend in new window..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PWD'; .\start-servers.ps1 -BackendOnly"

Write-Host "Starting frontend in new window..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PWD'; .\start-servers.ps1 -FrontendOnly"

Write-Host "✅ Servers started in separate windows!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Your application is available at:" -ForegroundColor Cyan
Write-Host "  • Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  • Backend API: http://localhost:8000" -ForegroundColor White
Write-Host "  • Health check: http://localhost:8000/api/health" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Handle individual server startup
param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

if ($BackendOnly) {
    Start-Backend
} elseif ($FrontendOnly) {
    Start-Frontend
}
