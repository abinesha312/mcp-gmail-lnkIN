#!/bin/bash
# Quick start script for Docker

set -e

echo "⬡ MCP Unified - Docker Setup"
echo "=============================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Create data directory if it doesn't exist
if [ ! -d "./data" ]; then
    echo "📁 Creating data directory..."
    mkdir -p ./data
    chmod 755 ./data
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Docker Environment Variables
MASTER_SECRET=
API_PORT=3001
DASHBOARD_PORT=5173
CORS_ORIGINS=http://localhost:5173,http://localhost:80,http://localhost:3000

# Rate Limiting (requests per window)
RATE_LIMIT_GENERAL=100
RATE_LIMIT_TOOLS=30
RATE_LIMIT_OAUTH=10
EOF
    echo "✅ Created .env file. You can set MASTER_SECRET for custom encryption key."
fi

echo ""
echo "🐳 Building Docker images..."
docker-compose build

echo ""
echo "🚀 Starting containers..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to start..."
sleep 5

echo ""
echo "✅ MCP Unified is running!"
echo ""
echo "📊 Dashboard: http://localhost:5173"
echo "🔌 API:       http://localhost:3001"
echo ""
echo "View logs:    docker-compose logs -f"
echo "Stop:         docker-compose down"
echo ""
