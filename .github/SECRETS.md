# GitHub Actions Secrets Configuration

This document lists the required secrets for GitHub Actions CI/CD pipeline.

## Required Secrets

### Database Configuration
- `STAGING_DB_HOST` - Staging database host
- `STAGING_DB_USER` - Staging database username  
- `STAGING_DB_PASSWORD` - Staging database password
- `STAGING_DB_NAME` - Staging database name

- `PRODUCTION_DB_HOST` - Production database host
- `PRODUCTION_DB_USER` - Production database username
- `PRODUCTION_DB_PASSWORD` - Production database password  
- `PRODUCTION_DB_NAME` - Production database name

### Authentication
- `STAGING_JWT_SECRET` - JWT secret for staging environment
- `PRODUCTION_JWT_SECRET` - JWT secret for production environment

### Payment Integration
- `STAGING_PAYSTACK_SECRET_KEY` - Paystack secret key for staging
- `PRODUCTION_PAYSTACK_SECRET_KEY` - Paystack secret key for production

### Deployment
- `HEROKU_API_KEY` - Heroku API key for deployment
- `DOCKER_HUB_USERNAME` - Docker Hub username (if using Docker)
- `DOCKER_HUB_PASSWORD` - Docker Hub password (if using Docker)

## How to Add Secrets

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Add each secret with the exact name listed above

## Environment Variables for Local Development

Copy `.env.example` to `.env` in the backend directory and fill in your local values:

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your local configuration

# Frontend (if needed)
cd ../eventfrontend
cp .env.example .env
# Edit .env with your local configuration
```

## Security Notes

- Never commit actual secret values to the repository
- Use different secrets for staging and production
- Rotate secrets regularly
- Use strong, unique values for JWT secrets
- Ensure Paystack keys are from the correct environment (test vs live)
