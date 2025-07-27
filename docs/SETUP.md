# Wealthup Setup Guide

This guide will help you set up the Wealthup personal finance management application with the provided Canara Bank data.

## Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- Docker and Docker Compose
- PostgreSQL (if running locally)
- OpenAI API key (for AI categorization)

## Quick Start

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install

# Install AI service dependencies
cd ../ai-service && pip install -r requirements.txt
```

### 2. Environment Configuration

Create environment files:

```bash
# Backend environment
cp backend/.env.example backend/.env
# Edit backend/.env with your database and API settings

# AI service environment
cp ai-service/.env.example ai-service/.env
# Add your OpenAI API key to ai-service/.env
```

### 3. Process Canara Bank Data

```bash
# Install csv-parser for data processing
npm install csv-parser

# Process the existing Canara Bank CSV data
node scripts/process-canara-data.js
```

This will create `data/processed-transactions.json` with categorized transactions.

### 4. Start the Application

#### Option A: Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

#### Option B: Running Locally

```bash
# Terminal 1: Start backend
cd backend && npm run start:dev

# Terminal 2: Start AI service
cd ai-service && npm run dev

# Terminal 3: Start frontend
cd frontend && npm run dev
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/docs
- **AI Service**: http://localhost:8000

## Data Processing

The application includes a script to process the existing Canara Bank CSV data:

```bash
node scripts/process-canara-data.js
```

This script:
- Parses the CSV file from `data/canara_bank/data.csv`
- Categorizes transactions using keyword matching
- Generates unique transaction IDs
- Outputs processed data to `data/processed-transactions.json`

## Features

### ✅ Implemented
- CSV file upload and parsing
- Transaction categorization (basic keyword-based)
- Database schema with PostgreSQL
- Basic frontend dashboard
- AI service with OpenAI integration
- Docker containerization

### 🚧 In Progress
- Full NestJS backend implementation
- React Query integration
- Advanced charts and analytics
- PWA features
- User authentication

### 📋 Planned
- Real-time transaction sync
- Investment portfolio integration
- Advanced AI categorization
- Mobile app
- Multi-bank support

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │    │   Backend   │    │ AI Service  │
│  (Next.js)  │◄──►│  (NestJS)   │◄──►│  (FastAPI)  │
│   Port 3000 │    │  Port 3001  │    │  Port 8000  │
└─────────────┘    └─────────────┘    └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │ PostgreSQL  │
                   │  Port 5432  │
                   └─────────────┘
```

## Data Flow

1. **Upload**: User uploads CSV file through frontend
2. **Parse**: Backend parses CSV and extracts transactions
3. **Categorize**: AI service categorizes transactions using OpenAI
4. **Store**: Transactions stored in PostgreSQL database
5. **Display**: Frontend displays categorized transactions and analytics

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3000, 3001, 8000, and 5432 are available
2. **Database connection**: Check PostgreSQL is running and credentials are correct
3. **OpenAI API**: Verify your API key is valid and has sufficient credits
4. **Docker issues**: Try `docker-compose down -v` to reset volumes

### Logs

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs ai-service
docker-compose logs frontend
```

## Development

### Adding New Bank Support

1. Create a new parser in `backend/src/services/csv-parser.service.ts`
2. Add bank-specific logic for date parsing and amount extraction
3. Update the upload controller to handle the new bank type

### Extending Categories

1. Update categories in `backend/db/init.sql`
2. Add new category mappings in `scripts/process-canara-data.js`
3. Update AI service categories in `ai-service/main.py`

## Security Notes

- Change default passwords in production
- Use environment variables for sensitive data
- Enable HTTPS in production
- Implement proper authentication and authorization
- Regular security updates for dependencies

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation at `/api/docs`
3. Check the logs for error messages
4. Ensure all prerequisites are met

## License

This project is for educational purposes. Please ensure compliance with your bank's terms of service when using real financial data. 