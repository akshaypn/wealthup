#!/bin/bash

# Wealthup Startup Script
# This script helps you start the Wealthup application

set -e

echo "🚀 Starting Wealthup Application..."

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env files exist and create them if needed
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating backend environment file..."
    cp backend/env.example backend/.env
    echo "✅ Backend environment file created. Please edit backend/.env with your settings."
fi

if [ ! -f "ai-service/.env" ]; then
    echo "📝 Creating AI service environment file..."
    cp ai-service/env.example ai-service/.env
    echo "⚠️  Please edit ai-service/.env and add your OpenAI API key."
fi

# # Check if OpenAI API key is set
# if [ ! -f "ai-service/.env" ] || ! grep -q "OPENAI_API_KEY=your-openai-api-key-here" ai-service/.env; then
#     echo "⚠️  Warning: OpenAI API key not configured. AI categorization will not work."
#     echo "   Please edit ai-service/.env and add your OpenAI API key."
# fi

# Build and start services
echo "🔨 Building Docker images..."
docker compose build

echo "🚀 Starting services..."
docker compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🔍 Checking service health..."

# Check if services are running
if docker compose ps | grep -q "Up"; then
    echo "✅ Services are running!"
    echo ""
    echo "🌐 Application URLs:"
    echo "   Frontend: http://100.123.199.100:9000"
    echo "   Backend API: http://100.123.199.100:9001"
    echo "   API Docs: http://100.123.199.100:9001/api/docs"
    echo "   AI Service: http://100.123.199.100:9002"
    echo "   RabbitMQ Management: http://100.123.199.100:15672"
    echo ""
    echo "📊 Database:"
    echo "   PostgreSQL: 100.123.199.100:9003"
    echo "   Username: wealthup_user"
    echo "   Password: wealthup_password"
    echo "   Database: wealthup"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Open http://100.123.199.100:9000 in your browser"
    echo "   2. Upload your bank statement CSV file"
    echo "   3. View your categorized transactions and insights"
    echo ""
    echo "🛑 To stop the application, run: docker-compose down"
    echo "📋 To view logs, run: docker-compose logs -f"
else
    echo "❌ Some services failed to start. Check logs with: docker-compose logs"
    exit 1
fi 