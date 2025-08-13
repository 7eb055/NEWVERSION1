# Eventify Docker Manager for Windows PowerShell
# Usage: .\docker-manage.ps1 <command>

param(
    [Parameter(Mandatory=$false)]
    [string]$Command = "install-check",
    [string]$Service = ""
)

# Check if Docker is installed
function Test-DockerInstallation {
    try {
        $dockerVersion = & docker --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            return $true
        }
    }
    catch {
        return $false
    }
    return $false
}

# Docker installation check
function Show-DockerInstallationInfo {
    Write-Host "🐳 Docker Installation Check" -ForegroundColor Cyan
    Write-Host "================================" -ForegroundColor Cyan
    
    if (Test-DockerInstallation) {
        Write-Success "Docker is installed!"
        & docker --version
        
        try {
            & docker compose version
            Write-Success "Docker Compose is available!"
            Write-Host ""
            Write-Host "🚀 You can now use all Docker commands:" -ForegroundColor Yellow
            Write-Host "  .\docker-manage.ps1 start    - Start all services" -ForegroundColor White
            Write-Host "  .\docker-manage.ps1 status   - Check service status" -ForegroundColor White
            Write-Host "  .\docker-manage.ps1 logs     - View logs" -ForegroundColor White
        }
        catch {
            Write-Warning "Docker Compose not available. Installing Docker Desktop is recommended."
        }
    }
    else {
        Write-Error "Docker is not installed!"
        Write-Host ""
        Write-Host "📋 Installation Options:" -ForegroundColor Yellow
        Write-Host "  1. Docker Desktop (Recommended):" -ForegroundColor White
        Write-Host "     Download: https://www.docker.com/products/docker-desktop/" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  2. Manual Installation Guide:" -ForegroundColor White
        Write-Host "     See: DOCKER-INSTALLATION.md" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  3. Run without Docker:" -ForegroundColor White
        Write-Host "     See: DOCKER-INSTALLATION.md (Alternative Setup)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "⚡ Quick Start:" -ForegroundColor Green
        Write-Host "   1. Install Docker Desktop" -ForegroundColor White
        Write-Host "   2. Restart this script: .\docker-manage.ps1 start" -ForegroundColor White
        exit 1
    }
}

# Colors for output
function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Check if Docker is running
function Test-Docker {
    try {
        docker info | Out-Null
        return $true
    }
    catch {
        Write-Error "Docker is not running. Please start Docker Desktop first."
        exit 1
    }
}

# Build and start all services
function Start-All {
    Write-Info "Starting all Eventify services..."
    
    # Copy environment file if it doesn't exist
    if (!(Test-Path ".env")) {
        if (Test-Path ".env.docker") {
            Write-Warning "No .env file found. Copying from .env.docker"
            Copy-Item ".env.docker" ".env"
        } else {
            Write-Error "No environment file found. Please create .env file."
            exit 1
        }
    }
    
    docker-compose up --build -d
    Write-Success "All services started successfully!"
    
    # Show status
    Show-Status
}

# Stop all services
function Stop-All {
    Write-Info "Stopping all Eventify services..."
    docker-compose down
    Write-Success "All services stopped successfully!"
}

# Restart all services
function Restart-All {
    Write-Info "Restarting all Eventify services..."
    docker-compose restart
    Write-Success "All services restarted successfully!"
}

# Show service status
function Show-Status {
    Write-Info "Service Status:"
    docker-compose ps
    
    Write-Host ""
    Write-Info "Service URLs:"
    Write-Host "  🌐 Frontend: http://localhost:3000"
    Write-Host "  🔧 Backend API: http://localhost:5000"
    Write-Host "  🗄️  Database: localhost:5432"
    Write-Host "  📊 PgAdmin: http://localhost:8080"
}

# Show logs
function Show-Logs {
    param([string]$ServiceName = "")
    
    if ([string]::IsNullOrEmpty($ServiceName)) {
        Write-Info "Showing logs for all services..."
        docker-compose logs -f
    } else {
        Write-Info "Showing logs for $ServiceName..."
        docker-compose logs -f $ServiceName
    }
}

# Run database migrations
function Start-Migration {
    Write-Info "Running database migrations..."
    docker-compose exec backend npm run docker:migrate
    Write-Success "Database migrations completed!"
}

# Check database health
function Test-Health {
    Write-Info "Checking database health..."
    docker-compose exec backend npm run docker:health
}

# Access database shell
function Start-DbShell {
    Write-Info "Opening database shell..."
    docker-compose exec postgres psql -U postgres -d event_management_db
}

# Backup database
function Backup-Database {
    $backupName = "eventify_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
    Write-Info "Creating database backup: $backupName"
    
    # Ensure backups directory exists
    if (!(Test-Path "database\backups")) {
        New-Item -ItemType Directory -Path "database\backups" -Force
    }
    
    docker-compose exec postgres pg_dump -U postgres -d event_management_db > "database\backups\$backupName"
    Write-Success "Database backup created: $backupName"
}

# Clean up Docker resources
function Remove-All {
    Write-Warning "This will remove all containers and volumes. Are you sure? (y/N)"
    $response = Read-Host
    if ($response -match "^[yY]([eE][sS])?$") {
        Write-Info "Cleaning up Docker resources..."
        docker-compose down -v
        docker system prune -f
        Write-Success "Cleanup completed!"
    } else {
        Write-Info "Cleanup cancelled."
    }
}

# Show help
function Show-Help {
    Write-Host "Eventify Docker Management Commands:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  start     - Build and start all services"
    Write-Host "  stop      - Stop all services"
    Write-Host "  restart   - Restart all services"
    Write-Host "  status    - Show service status and URLs"
    Write-Host "  logs      - Show logs (add -Service for specific service)"
    Write-Host "  migrate   - Run database migrations"
    Write-Host "  health    - Check database health"
    Write-Host "  shell     - Access database shell"
    Write-Host "  backup    - Create database backup"
    Write-Host "  cleanup   - Remove all containers and volumes"
    Write-Host "  help      - Show this help message"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\docker-manage.ps1 start"
    Write-Host "  .\docker-manage.ps1 logs -Service backend"
    Write-Host "  .\docker-manage.ps1 health"
}

# Main script logic
Write-Host "🚀 Eventify Docker Manager" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan

Test-Docker

switch ($Command.ToLower()) {
    "install-check" {
        Show-DockerInstallationInfo
    }
    "start" {
        if (-not (Test-DockerInstallation)) {
            Show-DockerInstallationInfo
            return
        }
        Start-All
    }
    "stop" {
        if (-not (Test-DockerInstallation)) {
            Show-DockerInstallationInfo
            return
        }
        Stop-All
    }
    "restart" {
        if (-not (Test-DockerInstallation)) {
            Show-DockerInstallationInfo
            return
        }
        Restart-All
    }
    "status" {
        Show-Status
    }
    "logs" {
        Show-Logs -ServiceName $Service
    }
    "migrate" {
        Start-Migration
    }
    "health" {
        Test-Health
    }
    "shell" {
        Start-DbShell
    }
    "backup" {
        Backup-Database
    }
    "cleanup" {
        Remove-All
    }
    "help" {
        Show-Help
    }
    default {
        Write-Error "Unknown command: $Command"
        Write-Host ""
        Show-Help
        exit 1
    }
}
