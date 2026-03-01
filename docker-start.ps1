# Quick start script for Docker (PowerShell)

Write-Host "⬡ MCP Unified - Docker Setup" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ Docker is not running. Please start Docker and try again." -ForegroundColor Red
    exit 1
}

# Create data directory if it doesn't exist
if (-not (Test-Path "./data")) {
    Write-Host "📁 Creating data directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path "./data" -Force | Out-Null
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "📝 Creating .env file..." -ForegroundColor Yellow
    @"
# Docker Environment Variables
MASTER_SECRET=
API_PORT=3001
DASHBOARD_PORT=5173
CORS_ORIGINS=http://localhost:5173,http://localhost:80,http://localhost:3000

# Rate Limiting (requests per window)
RATE_LIMIT_GENERAL=100
RATE_LIMIT_TOOLS=30
RATE_LIMIT_OAUTH=10
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ Created .env file. You can set MASTER_SECRET for custom encryption key." -ForegroundColor Green
}

Write-Host ""
Write-Host "🐳 Building Docker images..." -ForegroundColor Yellow
docker-compose build

Write-Host ""
Write-Host "🚀 Starting containers..." -ForegroundColor Yellow
docker-compose up -d

Write-Host ""
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "✅ MCP Unified is running!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Dashboard: http://localhost:5173" -ForegroundColor Cyan
Write-Host "🔌 API:       http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "View logs:    docker-compose logs -f" -ForegroundColor Gray
Write-Host "Stop:         docker-compose down" -ForegroundColor Gray
Write-Host ""
