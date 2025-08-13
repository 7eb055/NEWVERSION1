# 🐳 Docker Installation Guide for Windows

## Current Status
❌ Docker is not currently installed on your system.

## Quick Installation Steps

### Option 1: Docker Desktop (Recommended)

1. **Download Docker Desktop:**
   - Visit: https://www.docker.com/products/docker-desktop/
   - Click "Download for Windows"
   - Choose your processor type (Intel/AMD or Apple Silicon)

2. **Install Docker Desktop:**
   - Run the installer `Docker Desktop Installer.exe`
   - Follow the installation wizard
   - Enable WSL 2 if prompted (recommended)
   - Restart your computer when prompted

3. **Verify Installation:**
   ```powershell
   docker --version
   docker compose version
   ```

4. **Start Docker Desktop:**
   - Launch Docker Desktop from Start Menu
   - Wait for Docker to start (whale icon in system tray)
   - Sign in or create Docker account (optional)

### Option 2: Manual Docker Installation

If Docker Desktop doesn't work, you can install Docker Engine manually:

1. **Enable WSL 2:**
   ```powershell
   # Run as Administrator
   dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
   dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
   ```

2. **Install WSL 2:**
   - Download: https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi
   - Install and restart

3. **Install Docker in WSL:**
   ```bash
   # In WSL terminal
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

## 🏃‍♂️ Alternative: Run Without Docker

While Docker is recommended, you can run the application without it:

### Setup PostgreSQL Locally

1. **Install PostgreSQL:**
   - Download: https://www.postgresql.org/download/windows/
   - Install with default settings
   - Remember your postgres password

2. **Create Database:**
   ```sql
   -- Connect to PostgreSQL
   psql -U postgres
   
   -- Create database
   CREATE DATABASE event_management_db;
   
   -- Create user (optional)
   CREATE USER eventify WITH PASSWORD 'password123';
   GRANT ALL PRIVILEGES ON DATABASE event_management_db TO eventify;
   ```

### Setup Backend

1. **Install Dependencies:**
   ```powershell
   cd backend
   npm install
   ```

2. **Configure Environment:**
   ```powershell
   cp .env.example .env
   # Edit .env with your database settings
   ```

3. **Run Migrations:**
   ```powershell
   npm run migrate
   ```

4. **Start Backend:**
   ```powershell
   npm run dev
   ```

### Setup Frontend

1. **Install Dependencies:**
   ```powershell
   cd eventfrontend
   npm install
   ```

2. **Start Frontend:**
   ```powershell
   npm run dev
   ```

## 🔄 After Docker Installation

Once Docker is installed, return to the main README and run:

```powershell
# Navigate to project directory
cd "c:\Users\ryule\OneDrive\Desktop\version2\NEWVERSION1"

# Start all services
docker compose up --build -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

## 🆘 Troubleshooting

### Docker Desktop Issues

1. **Enable Virtualization:**
   - Restart computer
   - Enter BIOS/UEFI
   - Enable Intel VT-x or AMD-V
   - Enable Hyper-V in Windows Features

2. **WSL 2 Issues:**
   ```powershell
   # Check WSL version
   wsl --list --verbose
   
   # Set WSL 2 as default
   wsl --set-default-version 2
   ```

3. **Memory Issues:**
   - Allocate more RAM to Docker Desktop
   - Settings → Resources → Advanced
   - Increase memory limit

### Port Conflicts

If ports 3000, 5000, or 5432 are in use:

```powershell
# Find processes using ports
netstat -ano | findstr :3000
netstat -ano | findstr :5000
netstat -ano | findstr :5432

# Kill process by PID
taskkill /PID <ProcessID> /F
```

## 🎯 Next Steps

1. **Install Docker Desktop** (recommended)
2. **Or** set up local development environment
3. **Test the installation** with our Docker setup
4. **Access your application** at http://localhost:3000

## 📞 Need Help?

- Docker Documentation: https://docs.docker.com/
- Docker Desktop Issues: https://docs.docker.com/desktop/troubleshoot/overview/
- WSL 2 Setup: https://docs.microsoft.com/en-us/windows/wsl/install

---

💡 **Tip:** Docker Desktop makes development much easier by containerizing all services. We highly recommend installing it for the best experience!
