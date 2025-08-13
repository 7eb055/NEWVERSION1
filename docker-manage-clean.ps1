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
        $null = & docker --version 2>$null
        return $LASTEXITCODE -eq 0
    }
    catch {
        return $false
    }
}

# Docker installation check
function Show-DockerInstallationInfo {
    Write-Host "🐳 Docker Installation Check" -ForegroundColor Cyan
    Write-Host "================================" -ForegroundColor Cyan
    
    if (Test-DockerInstallation) {
        Write-Host "✅ Docker is installed!" -ForegroundColor Green
        & docker --version
        
        try {
            & docker compose version
            Write-Host "✅ Docker Compose is available!" -ForegroundColor Green
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
        Write-Host "❌ Docker is not installed!" -ForegroundColor Red
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

# Help function
function Show-Help {
    Write-Host "🐳 Eventify Docker Manager" -ForegroundColor Cyan
    Write-Host "=========================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: .\docker-manage.ps1 <command> [options]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Green
    Write-Host "  install-check  Check if Docker is installed" -ForegroundColor White
    Write-Host "  start         Start all services" -ForegroundColor White
    Write-Host "  stop          Stop all services" -ForegroundColor White
    Write-Host "  restart       Restart all services" -ForegroundColor White
    Write-Host "  status        Show service status" -ForegroundColor White
    Write-Host "  logs          Show logs (all or specific service)" -ForegroundColor White
    Write-Host "  migrate       Run database migrations" -ForegroundColor White
    Write-Host "  health        Check database health" -ForegroundColor White
    Write-Host "  backup        Create database backup" -ForegroundColor White
    Write-Host "  shell         Access database shell" -ForegroundColor White
    Write-Host "  cleanup       Remove all containers and data" -ForegroundColor White
    Write-Host "  help          Show this help" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Green
    Write-Host "  .\docker-manage.ps1 start" -ForegroundColor Gray
    Write-Host "  .\docker-manage.ps1 logs backend" -ForegroundColor Gray
    Write-Host "  .\docker-manage.ps1 status" -ForegroundColor Gray
}

# Core Docker functions
function Start-All {
    Write-Info "Starting all Eventify services..."
    & docker compose up -d --build
    if ($LASTEXITCODE -eq 0) {
        Write-Success "All services started successfully!"
        Write-Host ""
        Write-Host "🌐 Access your application:" -ForegroundColor Yellow
        Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Cyan
        Write-Host "  Backend:  http://localhost:5000" -ForegroundColor Cyan
        Write-Host "  PgAdmin:  http://localhost:8080" -ForegroundColor Cyan
    }
    else {
        Write-Error "Failed to start services"
    }
}

function Stop-All {
    Write-Info "Stopping all services..."
    & docker compose down
    if ($LASTEXITCODE -eq 0) {
        Write-Success "All services stopped"
    }
    else {
        Write-Error "Failed to stop services"
    }
}

function Restart-All {
    Write-Info "Restarting all services..."
    & docker compose restart
    if ($LASTEXITCODE -eq 0) {
        Write-Success "All services restarted"
    }
    else {
        Write-Error "Failed to restart services"
    }
}

function Show-Status {
    Write-Info "Service status:"
    & docker compose ps
}

function Show-Logs {
    param([string]$ServiceName)
    
    if ($ServiceName) {
        Write-Info "Showing logs for $ServiceName..."
        & docker compose logs -f $ServiceName
    }
    else {
        Write-Info "Showing logs for all services..."
        & docker compose logs -f
    }
}

function Run-Migrations {
    Write-Info "Running database migrations..."
    & docker compose exec backend npm run docker:migrate
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Migrations completed"
    }
    else {
        Write-Error "Migration failed"
    }
}

function Check-Health {
    Write-Info "Checking database health..."
    & docker compose exec backend npm run docker:health
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Database is healthy"
    }
    else {
        Write-Error "Database health check failed"
    }
}

function Create-Backup {
    $BackupName = "eventify_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
    $BackupPath = "database/backups/$BackupName"
    
    Write-Info "Creating database backup: $BackupName"
    & docker compose exec -T postgres pg_dump -U postgres -d event_management_db > $BackupPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Backup created: $BackupPath"
    }
    else {
        Write-Error "Backup failed"
    }
}

function Open-Shell {
    Write-Info "Opening database shell..."
    & docker compose exec postgres psql -U postgres -d event_management_db
}

function Remove-All {
    Write-Warning "This will remove ALL containers and data!"
    $Confirm = Read-Host "Are you sure? Type 'yes' to continue"
    
    if ($Confirm -eq "yes") {
        Write-Info "Removing all containers and data..."
        & docker compose down -v --rmi all
        Write-Success "All containers and data removed"
    }
    else {
        Write-Info "Operation cancelled"
    }
}

# Main execution
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
        if (-not (Test-DockerInstallation)) {
            Show-DockerInstallationInfo
            return
        }
        Show-Status
    }
    "logs" {
        if (-not (Test-DockerInstallation)) {
            Show-DockerInstallationInfo
            return
        }
        Show-Logs -ServiceName $Service
    }
    "migrate" {
        if (-not (Test-DockerInstallation)) {
            Show-DockerInstallationInfo
            return
        }
        Run-Migrations
    }
    "health" {
        if (-not (Test-DockerInstallation)) {
            Show-DockerInstallationInfo
            return
        }
        Check-Health
    }
    "backup" {
        if (-not (Test-DockerInstallation)) {
            Show-DockerInstallationInfo
            return
        }
        Create-Backup
    }
    "shell" {
        if (-not (Test-DockerInstallation)) {
            Show-DockerInstallationInfo
            return
        }
        Open-Shell
    }
    "cleanup" {
        if (-not (Test-DockerInstallation)) {
            Show-DockerInstallationInfo
            return
        }
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
