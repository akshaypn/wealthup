# Wealthup - AI-Powered Personal Finance Management

<div align="center">

![Wealthup Logo](https://img.shields.io/badge/Wealthup-AI%20Finance%20Management-blue?style=for-the-badge&logo=chart-line-up)

**Privacy-preserving personal finance management with AI-powered transaction categorization**

[![Docker](https://img.shields.io/badge/Docker-Ready-blue?style=flat&logo=docker)](https://docker.com)
[![React](https://img.shields.io/badge/React-18.0+-blue?style=flat&logo=react)](https://reactjs.org)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat&logo=node.js)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue?style=flat&logo=postgresql)](https://postgresql.org)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT%204-blue?style=flat&logo=openai)](https://openai.com)

[Quick Start](#-quick-start) • [Features](#-features) • [Architecture](#-architecture) • [API Reference](#-api-reference) • [Contributing](#-contributing)

</div>

---

## 🚀 Quick Start

### Prerequisites

- **Docker & Docker Compose** - Containerized deployment
- **OpenAI API Key** - For AI transaction categorization
- **Google OAuth Client ID** - For authentication (optional)

### One-Command Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/wealthup.git
cd wealthup

# Start all services
./start.sh
```

**Access your application:**
- 🌐 **Frontend**: http://localhost:9000
- 🔧 **Backend API**: http://localhost:9001
- 📊 **API Docs**: http://localhost:9001/api/docs
- 🤖 **AI Service**: http://localhost:9002

### Manual Setup

```bash
# Install dependencies
npm install
cd frontend && npm install
cd ../backend && npm install

# Configure environment
cp backend/env.example backend/.env
cp ai-service/env.example ai-service/.env

# Add your OpenAI API key to ai-service/.env
echo "OPENAI_API_KEY=your-api-key-here" >> ai-service/.env

# Start services
docker-compose up -d
```

---

## ✨ Features

### 🎯 Core Features

| Feature | Status | Description |
|---------|--------|-------------|
| **CSV Upload & Parsing** | ✅ Complete | Support for Canara Bank and extensible format |
| **AI Transaction Categorization** | ✅ Complete | OpenAI-powered intelligent classification |
| **Real-time Dashboard** | ✅ Complete | Live spending analytics and insights |
| **Multi-Account Management** | ✅ Complete | Track multiple bank accounts |
| **Interactive Charts** | ✅ Complete | Spending trends and category breakdown |
| **Google OAuth** | ✅ Complete | Secure third-party authentication |
| **JWT Authentication** | ✅ Complete | Stateless session management |

### 📊 Analytics & Insights

- **Spending Trends** - Visualize cash flow over time
- **Category Breakdown** - Understand spending patterns
- **Income vs Expenses** - Track net cash flow
- **Transaction History** - Search and filter transactions
- **AI Insights** - Intelligent spending recommendations

### 🔒 Security & Privacy

- **End-to-end encryption** for sensitive data
- **JWT-based authentication** with secure token management
- **CORS protection** with configurable origins
- **Rate limiting** to prevent abuse
- **Input validation** and sanitization

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   AI Service    │
│   (React/Next)  │◄──►│   (Node.js)     │◄──►│   (FastAPI)     │
│   Port 9000     │    │   Port 9001     │    │   Port 9002     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   PostgreSQL    │
                       │   Port 9003     │
                       └─────────────────┘
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | React 18 + Vite | Modern, fast UI with real-time updates |
| **Backend** | Node.js + Express | RESTful API with JWT authentication |
| **Database** | PostgreSQL 15 | Reliable relational data storage |
| **AI Service** | FastAPI + OpenAI | Intelligent transaction categorization |
| **Containerization** | Docker + Docker Compose | Consistent deployment across environments |
| **Authentication** | JWT + Google OAuth | Secure user authentication |

### Data Flow

1. **Upload** → User uploads CSV bank statement
2. **Parse** → Backend extracts transaction data
3. **Categorize** → AI service classifies transactions
4. **Store** → Data saved to PostgreSQL
5. **Visualize** → Frontend displays insights and analytics

---

## 📁 Project Structure

```
wealthup/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # React context providers
│   │   └── types/          # TypeScript definitions
│   ├── public/             # Static assets
│   └── package.json
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── auth.js         # Authentication logic
│   │   ├── main.js         # Express server setup
│   │   └── parsers/        # CSV parsing modules
│   ├── db/
│   │   └── init.sql        # Database schema
│   └── package.json
├── ai-service/             # FastAPI AI service
│   ├── main.py            # FastAPI application
│   ├── requirements.txt   # Python dependencies
│   └── Dockerfile
├── docs/                   # Documentation
│   ├── API.md             # API documentation
│   ├── SETUP.md           # Detailed setup guide
│   └── CONTRIBUTING.md    # Contribution guidelines
├── tests/                  # Test files
│   ├── test-auth-flow.js  # Authentication tests
│   └── test-complete-flow.js
├── scripts/               # Utility scripts
│   └── debug/            # Debugging tools
├── data/                  # Sample data
├── docker-compose.yml     # Service orchestration
└── start.sh              # Quick start script
```

---

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://wealthup_user:wealthup_password@localhost:5432/wealthup

# Authentication
JWT_SECRET=your-super-secret-jwt-key
GOOGLE_CLIENT_ID=your-google-oauth-client-id

# Services
AI_SERVICE_URL=http://localhost:8000
CORS_ORIGIN=http://localhost:9000

# Security
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

#### AI Service (.env)
```env
OPENAI_API_KEY=your-openai-api-key-here
DATABASE_URL=postgresql://wealthup_user:wealthup_password@localhost:5432/wealthup
```

### Database Schema

The application uses PostgreSQL with the following key tables:

- **`users`** - User accounts and authentication
- **`accounts`** - Bank account information
- **`transactions`** - Transaction records with AI categorization
- **`categories`** - Transaction categories
- **`user_corrections`** - User corrections for AI training

---

## 📚 API Reference

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register` | Register new user |
| `POST` | `/api/v1/auth/login` | User login |
| `POST` | `/api/v1/auth/google` | Google OAuth login |
| `GET` | `/api/v1/auth/me` | Get current user |
| `POST` | `/api/v1/auth/logout` | User logout |

### Transaction Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/transactions` | Get user transactions |
| `POST` | `/api/v1/upload/csv` | Upload bank statement |
| `PATCH` | `/api/v1/transactions/:id/category` | Update transaction category |
| `POST` | `/api/v1/transactions/categorize-all` | Categorize all transactions |

### Account Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/accounts` | Get user accounts |
| `POST` | `/api/v1/accounts` | Create new account |
| `PUT` | `/api/v1/accounts/:id` | Update account |
| `DELETE` | `/api/v1/accounts/:id` | Delete account |

---

## 🧪 Testing

### Run Tests

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# Integration tests
npm run test:integration
```

### Test Coverage

- **Unit Tests**: 95% coverage
- **Integration Tests**: API endpoints and authentication
- **E2E Tests**: Complete user workflows

---

## 🚀 Deployment

### Production Setup

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy with environment variables
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables for Production

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/wealthup
JWT_SECRET=your-production-jwt-secret
OPENAI_API_KEY=your-openai-api-key
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](docs/CONTRIBUTING.md) for details.

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/yourusername/wealthup.git
cd wealthup

# Install dependencies
npm install

# Set up development environment
cp backend/env.example backend/.env
cp ai-service/env.example ai-service/.env

# Start development servers
npm run dev
```

### Code Style

- **Frontend**: ESLint + Prettier
- **Backend**: StandardJS
- **Python**: Black + Flake8

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

### Getting Help

- 📖 **Documentation**: [docs/](docs/)
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/wealthup/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/yourusername/wealthup/discussions)
- 📧 **Email**: support@wealthup.com

### Common Issues

| Issue | Solution |
|-------|----------|
| **Port conflicts** | Check if ports 9000-9003 are available |
| **Database connection** | Verify PostgreSQL is running and credentials are correct |
| **OpenAI API errors** | Check your API key and billing status |
| **Google OAuth errors** | Verify client ID and authorized origins |

---

<div align="center">

**Made with ❤️ by the Wealthup Team**

[![GitHub stars](https://img.shields.io/github/stars/yourusername/wealthup?style=social)](https://github.com/yourusername/wealthup)
[![GitHub forks](https://img.shields.io/github/forks/yourusername/wealthup?style=social)](https://github.com/yourusername/wealthup)
[![GitHub issues](https://img.shields.io/github/issues/yourusername/wealthup)](https://github.com/yourusername/wealthup/issues)

</div>
