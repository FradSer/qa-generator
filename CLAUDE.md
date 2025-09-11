# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI fine-tuning dataset generator that uses knowledge distillation techniques to create high-quality training data. The system transforms expensive teacher models into cost-effective student models through intelligent evaluation and automated optimization workflows.

## Architecture

This is a full-stack application with the following key components:

### Backend (FastAPI + Python)
- **Framework**: FastAPI with async/await support using Pydantic v2 models
- **Database**: PostgreSQL with SQLAlchemy ORM, async support via asyncpg
- **Cache/Queue**: Redis for caching and Celery for background tasks
- **LLM Integration**: OpenAI, Anthropic, Google APIs for model distillation
- **Location**: `./backend/` directory
- **Key Files**:
  - `services.py`: Business logic with DatasetService, QualityService, CostService, ExportService
  - `models.py`: Pydantic models with enums for DataType, ExportFormat, OptimizationLevel
  - `database.py`: SQLAlchemy models (GenerationRecord, DatasetItem, CostRecord, QualityValidation)
  - `config.py`: Settings using pydantic-settings with environment-based configuration

### Frontend (Next.js + React + TypeScript)
- **Framework**: Next.js 14 with React 18 (App Router)
- **Language**: TypeScript with strict configuration
- **Styling**: Tailwind CSS with custom configurations
- **Components**: Headless UI, Lucide React icons, Framer Motion for animations
- **State Management**: React Query v3 for server state, React Hook Form for forms
- **UI Libraries**: Recharts for analytics, React Hot Toast for notifications
- **Location**: `./frontend/` directory
- **Key Pages**: `/generate`, `/datasets`, `/analytics` (App Router structure)

### Knowledge Distillation System
- **Purpose**: Teacher-student model architecture for cost optimization (70-90% cost reduction)
- **Location**: `./distillation/` directory
- **Key Files**:
  - `core.py`: Core orchestrator, teacher/student models, quality validation
  - `providers.py`: Multi-provider LLM integration (OpenAI, Anthropic, Google, Local)  
  - `integration.py`: API integration layer and configuration management
  - `transfer.py`: Knowledge transfer algorithms and adaptive learning
- **Configuration**: `./config/distillation.json`

## Development Commands

### Starting the Development Environment
```bash
# Start full development environment with hot reload
./start-dev.sh

# Alternative: Start individual services
docker-compose -f docker-compose.dev.yml up -d postgres redis  # Basic services
docker-compose -f docker-compose.dev.yml up -d --build          # Full services
```

### Starting Production Environment
```bash
# Start production environment
./start-prod.sh
# OR
docker-compose up -d

# With monitoring (Prometheus + Grafana)
docker-compose --profile monitoring up -d

# With background tasks (Celery)
docker-compose --profile background-tasks up -d
```

### Backend Development
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run locally (requires database and Redis running)
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Code formatting and linting
black .                    # Format code
isort .                   # Sort imports
mypy .                    # Type checking

# Run tests
pytest                    # All tests
pytest tests/unit/        # Unit tests only
pytest tests/integration/ # Integration tests only
pytest -v -s             # Verbose output
pytest --cov=app         # With coverage
```

### Frontend Development
```bash
cd frontend

# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

### Service Management
```bash
# View service status
docker-compose ps
docker-compose -f docker-compose.dev.yml ps

# View logs
docker-compose logs -f [service_name]
docker-compose -f docker-compose.dev.yml logs -f backend

# Stop all services
./stop-dev.sh
# OR
docker-compose down
docker-compose -f docker-compose.dev.yml down

# Restart specific service
docker-compose restart backend
```

## Environment Configuration

### Required Environment Variables (.env)
```bash
# Database Configuration
POSTGRES_PASSWORD=password123
DATABASE_URL=postgresql://postgres:password123@localhost:5432/qa_generator

# Redis Configuration  
REDIS_PASSWORD=redis123
REDIS_URL=redis://:redis123@localhost:6379/0

# LLM API Keys (at least one required)
OPENAI_API_KEY=sk-your-openai-api-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
GOOGLE_API_KEY=your-google-api-key
GROQ_API_KEY=your_groq_api_key
QIANFAN_ACCESS_KEY=your_qianfan_access_key
QIANFAN_SECRET_KEY=your_qianfan_secret_key
OPENAI_BASE_URL=your_openai_base_url

# Application Configuration
DEBUG=false
NODE_ENV=production
LOG_LEVEL=INFO
SECRET_KEY=your-secret-key-change-in-production-very-long-and-random

# Frontend Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Optional: Monitoring
GRAFANA_PASSWORD=admin123

# Optional: Background Tasks
CELERY_BROKER_URL=redis://:redis123@localhost:6379/1
CELERY_RESULT_BACKEND=redis://:redis123@localhost:6379/1

# Optional: Production SSL
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem

# Optional: Email Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-password

# Optional: AWS File Storage
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=qa-generator-storage

# Optional: Third-party Services
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
ANALYTICS_ID=GA-your-google-analytics-id
```

### Creating Environment File
- Copy `.env.example` to `.env`: `cp .env.example .env`
- The `./start-dev.sh` script automatically creates a basic `.env` file if missing
- **Important**: Replace placeholder API keys with actual keys for LLM providers
- **Minimum Required**: At least one LLM API key (OpenAI, Anthropic, Google, Groq, or Qianfan)
- **Extended Providers**: System supports Groq and Qianfan (Baidu) in addition to standard providers

## Key Architectural Patterns

### Service Layer Architecture
The backend uses a service-oriented pattern with distinct responsibilities:
- **DatasetService**: Manages dataset creation, storage, and retrieval (`backend/services.py:25`)
- **QualityService**: Handles quality analytics, validation, and metrics (`backend/services.py:141`)
- **CostService**: Provides cost estimation, tracking, and optimization analysis (`backend/services.py:227`) 
- **ExportService**: Manages data export in multiple formats (JSON, JSONL, CSV, Hugging Face, OpenAI) (`backend/services.py:315`)
- **BatchService**: Handles concurrent batch processing of generation requests (`backend/services.py:432`)

### Knowledge Distillation Architecture
The distillation system implements a sophisticated teacher-student learning framework:
- **KnowledgeDistillationOrchestrator**: Main orchestrator coordinating the 4-stage process (`distillation/core.py:313`)
- **TeacherModel**: High-capacity model for seed data generation (`distillation/core.py:80`)
- **StudentModel**: Cost-efficient model learning from teacher examples (`distillation/core.py:140`)
- **QualityValidator**: Automated quality assessment using teacher models (`distillation/core.py:246`)
- **ProviderFactory**: Multi-provider abstraction with optimal model pairing (`distillation/providers.py:399`)

### Knowledge Distillation Pipeline (4-Stage Process)
1. **Teacher Seed Generation**: High-capacity model generates 10% high-quality seed data (`TeacherModel.generate_seed_data`)
2. **Student Learning**: Pattern extraction from teacher examples (`StudentModel.learn_from_teacher`) 
3. **Bulk Generation**: Student model generates remaining 90% using learned patterns (`StudentModel.generate_bulk_data`)
4. **Quality Validation**: Automated quality assessment with sampling for cost efficiency (`QualityValidator.validate_batch`)

### Multi-Provider LLM Integration
- **Provider Classes**: `OpenAIProvider`, `AnthropicProvider`, `GoogleProvider`, `LocalLlamaProvider` (`distillation/providers.py`)
- **Real API Integration**: Actual HTTP calls to OpenAI, Anthropic Claude, Google Gemini, and Ollama endpoints
- **Cost Optimization**: Real 2024 pricing data with intelligent teacher-student model pairing
- **Rate Limiting**: Per-provider request throttling with `RateLimiter` class
- **Concurrent Processing**: Async batch processing with configurable batch sizes

### Data Models & Storage
- **SQLAlchemy Models** (`backend/database.py`):
  - `GenerationRecord`: Tracks generation requests, costs, quality metrics, metadata
  - `DatasetItem`: Individual data items with content, quality scores, validation status
  - `CostRecord`: Detailed cost tracking per provider/model with token usage
  - `QualityValidation`: Validation results with quality breakdowns and recommendations
- **Pydantic Models** (`backend/models.py`): API request/response validation with strict typing
- **IMPORTANT**: Avoid reserved field names like `metadata` (use `extra_metadata`) and `model_*` prefixes

## Testing Strategy

### Backend Testing
```bash
cd backend
pytest                          # Run all tests
pytest tests/unit/              # Unit tests only
pytest tests/integration/       # Integration tests only
pytest --cov=app               # With coverage
```

### Frontend Testing
```bash
cd frontend
npm test                        # Run tests
npm run test:watch             # Watch mode
npm run test:coverage          # With coverage
```

## Deployment Profiles

The system supports multiple deployment configurations via Docker Compose profiles:

- **Default**: Basic application (frontend + backend + database + redis)
- **monitoring**: Includes Prometheus + Grafana for metrics
- **background-tasks**: Includes Celery workers + Flower monitoring
- **production**: Includes Nginx reverse proxy with SSL

## API Documentation

- **Development**: http://localhost:8000/docs (FastAPI auto-generated)
- **Health Check**: http://localhost:8000/api/system/status
- **Frontend**: http://localhost:3000

## Common Development Tasks

### Adding New LLM Provider
1. Implement provider class in `distillation/providers.py` extending `LLMProvider`
2. Add provider to `ProviderFactory.PROVIDER_MAP` 
3. Update `config/distillation.json` with new provider configuration
4. Add pricing information and role suitability scoring
5. Add tests for new provider integration

### Modifying Distillation Strategy
1. Update distillation configuration in `config/distillation.json`
2. Implement strategy in `distillation/transfer.py` or `distillation/core.py`
3. Update `DistillationStrategy` enum in `distillation/core.py`
4. Add quality metrics and validation in `QualityValidator` class
5. Test with different teacher-student combinations

### Database Schema Changes
1. Create Alembic migration: `cd backend && alembic revision --autogenerate -m "description"`
2. Apply migration: `alembic upgrade head`
3. Update SQLAlchemy models in `backend/database.py` (not models.py - that's for Pydantic)

### Working with Data Types
Supported data types are defined in `DataType` enum:
- `qa`: Question-Answer pairs
- `classification`: Text classification data
- `generation`: Text generation prompts
- `code`: Code generation and completion
- `translation`: Translation pairs
- `ner`: Named Entity Recognition data

### Cost Management
Cost estimation and tracking includes:
- Base cost per data type with quality multipliers
- Teacher-student ratio impact on pricing
- Budget limits and utilization tracking
- Provider-specific token and cost recording
- ROI analysis vs traditional annotation methods

## Performance Considerations

- **Concurrent Processing**: System supports 1000+ concurrent requests
- **Rate Limiting**: Configured per LLM provider to avoid quota issues
- **Caching**: Redis caching for frequently accessed data and API responses
- **Background Tasks**: Use Celery for long-running distillation processes
- **Database**: Connection pooling and query optimization for large datasets

## Security Features

- **API Authentication**: JWT tokens with configurable secret keys
- **Data Encryption**: All API communications over HTTPS in production
- **Input Validation**: Pydantic models for request/response validation
- **Rate Limiting**: Per-endpoint and per-user request throttling
- **Environment Isolation**: Separate configurations for dev/staging/production

## Troubleshooting

### Common Issues
- **Port conflicts**: Ensure ports 3000, 8000, 5432, 6379 are available
- **API key errors**: Verify LLM provider API keys in `.env`
- **Database connection**: Check PostgreSQL container health and credentials
- **Memory issues**: Increase Docker memory limits for large dataset processing

### Debug Commands
```bash
# Check container health
docker-compose ps
docker-compose logs [service]

# Database connection test
docker-compose exec postgres pg_isready -U postgres

# Redis connection test
docker-compose exec redis redis-cli ping

# API health check
curl http://localhost:8000/api/system/status
```