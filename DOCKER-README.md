# 🐳 Eventify Docker Setup Guide

This guide will help you run the complete Eventify Event Management System using Docker containers.

## 📋 Prerequisites

- **Docker Desktop** installed and running
- **Docker Compose** (included with Docker Desktop)
- **Git** (to clone the repository)
- At least **4GB RAM** available for containers

## 🚀 Quick Start

### 1. Clone and Setup
```bash
git clone https://github.com/7eb055/NEWVERSION1.git
cd NEWVERSION1
```

### 2. Environment Configuration
```bash
# Copy the Docker environment template
cp .env.docker .env

# Edit .env file with your settings
# Important: Update database passwords and JWT secrets
```

### 3. Start All Services
```bash
# Using our management script (recommended)
./docker-manage.sh start

# Or using docker-compose directly
docker-compose up --build -d
```

### 4. Access Your Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Database**: localhost:5432
- **PgAdmin**: http://localhost:8080

## 🛠️ Management Commands

### Using Docker Management Scripts

**Linux/Mac:**
```bash
./docker-manage.sh start      # Start all services
./docker-manage.sh stop       # Stop all services
./docker-manage.sh status     # Show service status
./docker-manage.sh logs       # Show all logs
./docker-manage.sh logs backend  # Show specific service logs
./docker-manage.sh migrate    # Run database migrations
./docker-manage.sh health     # Check database health
./docker-manage.sh backup     # Create database backup
./docker-manage.sh cleanup    # Remove all containers and data
```

**Windows PowerShell:**
```powershell
.\docker-manage.ps1 start
.\docker-manage.ps1 status
.\docker-manage.ps1 logs -Service backend
.\docker-manage.ps1 health
```

### Using Docker Compose Directly

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up --build -d

# Run database migrations
docker-compose exec backend npm run docker:migrate

# Access database shell
docker-compose exec postgres psql -U postgres -d event_management_db

# Check service status
docker-compose ps
```

## 🗄️ Database Management

### Automatic Migrations
Migrations run automatically when the backend starts. You can also run them manually:

```bash
# Run migrations
./docker-manage.sh migrate

# Check database health
./docker-manage.sh health

# Access database shell
./docker-manage.sh shell
```

### Database Backup and Restore

**Create Backup:**
```bash
./docker-manage.sh backup
# Creates: database/backups/eventify_backup_YYYYMMDD_HHMMSS.sql
```

**Restore from Backup:**
```bash
# Stop services
docker-compose down

# Start only database
docker-compose up -d postgres

# Restore backup
docker-compose exec -T postgres psql -U postgres -d event_management_db < database/backups/your_backup.sql

# Start all services
docker-compose up -d
```

### Using PgAdmin (Database GUI)

1. Open http://localhost:8080
2. Login with:
   - Email: admin@eventify.com
   - Password: admin123
3. Add server connection:
   - Host: postgres
   - Port: 5432
   - Database: event_management_db
   - Username: postgres
   - Password: (from your .env file)

## 🔧 Configuration

### Environment Variables

Key variables in `.env`:

```bash
# Database
DB_HOST=postgres
DB_NAME=event_management_db
DB_USER=postgres
DB_PASSWORD=SecurePassword123!

# Application
JWT_SECRET=your-super-secure-jwt-secret
PAYSTACK_SECRET_KEY=sk_test_your_secret_key

# URLs
FRONTEND_URL=http://localhost:3000
REACT_APP_API_URL=http://localhost:5000
```

### Service Ports

- **Frontend**: 3000
- **Backend**: 5000
- **PostgreSQL**: 5432
- **PgAdmin**: 8080

To change ports, edit `docker-compose.yml`:

```yaml
services:
  frontend:
    ports:
      - "8080:80"  # Change 8080 to your preferred port
```

## 📊 Monitoring and Troubleshooting

### Check Service Health
```bash
# All services status
docker-compose ps

# Individual service logs
docker-compose logs frontend
docker-compose logs backend
docker-compose logs postgres

# Follow logs in real-time
docker-compose logs -f backend
```

### Common Issues

**Port Already in Use:**
```bash
# Find process using port
netstat -tulpn | grep :5000

# Or change port in docker-compose.yml
```

**Database Connection Issues:**
```bash
# Check database health
./docker-manage.sh health

# Restart database
docker-compose restart postgres
```

**Out of Disk Space:**
```bash
# Clean up unused Docker resources
docker system prune -a

# Remove all volumes (⚠️ deletes data)
docker-compose down -v
```

## 🚀 Production Deployment

### Environment-Specific Configurations

**Staging:**
```bash
cp .env.docker .env.staging
# Edit .env.staging with staging values
docker-compose --env-file .env.staging up -d
```

**Production:**
```bash
cp .env.docker .env.production
# Edit .env.production with production values
# Use strong passwords and real API keys
docker-compose --env-file .env.production up -d
```

### Security Considerations

1. **Change default passwords** in production
2. **Use strong JWT secrets** (32+ characters)
3. **Configure SSL/TLS** for HTTPS
4. **Limit database access** to application only
5. **Use real Paystack keys** for payment processing
6. **Set up proper backup strategy**

### Performance Optimization

```yaml
# docker-compose.yml - Add resource limits
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Node.js Docker Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

## 🆘 Support

If you encounter issues:

1. Check the logs: `./docker-manage.sh logs`
2. Verify database health: `./docker-manage.sh health`
3. Restart services: `./docker-manage.sh restart`
4. Clean rebuild: `docker-compose up --build --force-recreate`

## 📝 Development Notes

### Adding New Services

1. Add service to `docker-compose.yml`
2. Create Dockerfile if needed
3. Update network configuration
4. Add to management scripts

### Database Schema Changes

1. Create migration file in `database/migrations/`
2. Run: `./docker-manage.sh migrate`
3. Test with: `./docker-manage.sh health`

### Environment Updates

1. Edit `.env` file
2. Restart affected services: `docker-compose restart <service>`
3. Or full restart: `./docker-manage.sh restart`

---

🎉 **Your Eventify application is now running in Docker containers!**

Access your application at http://localhost:3000 and start managing events! 🚀
