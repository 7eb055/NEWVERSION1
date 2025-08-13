@echo off
REM Event Management System - Docker Hub Publishing Script (Windows)
REM Run this script to build and push Docker images to Docker Hub

echo 🐳 Event Management System - Docker Hub Publisher
echo =============================================

REM Configuration - UPDATE THESE VALUES
set DOCKER_USERNAME=your-dockerhub-username
set REPO_NAME=event-management-system
set VERSION=1.0.0

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker and try again.
    pause
    exit /b 1
)

echo 🔐 Please ensure you're logged in to Docker Hub
docker login

echo 📦 Building Docker images...

REM Build Backend Image
echo Building backend image...
cd backend
docker build -t %DOCKER_USERNAME%/%REPO_NAME%-backend:%VERSION% .
docker build -t %DOCKER_USERNAME%/%REPO_NAME%-backend:latest .
cd ..

REM Build Frontend Image
echo Building frontend image...
cd eventfrontend
docker build -t %DOCKER_USERNAME%/%REPO_NAME%-frontend:%VERSION% .
docker build -t %DOCKER_USERNAME%/%REPO_NAME%-frontend:latest .
cd ..

echo 🚀 Pushing images to Docker Hub...

REM Push Backend Images
echo Pushing backend images...
docker push %DOCKER_USERNAME%/%REPO_NAME%-backend:%VERSION%
docker push %DOCKER_USERNAME%/%REPO_NAME%-backend:latest

REM Push Frontend Images
echo Pushing frontend images...
docker push %DOCKER_USERNAME%/%REPO_NAME%-frontend:%VERSION%
docker push %DOCKER_USERNAME%/%REPO_NAME%-frontend:latest

echo ✅ Successfully published to Docker Hub!
echo 🔗 Your images are available at:
echo    Backend:  https://hub.docker.com/r/%DOCKER_USERNAME%/%REPO_NAME%-backend
echo    Frontend: https://hub.docker.com/r/%DOCKER_USERNAME%/%REPO_NAME%-frontend

echo 📋 Usage instructions for others:
echo # Pull and run backend:
echo docker run -d -p 5000:5000 --env-file .env %DOCKER_USERNAME%/%REPO_NAME%-backend:latest
echo # Pull and run frontend:
echo docker run -d -p 5173:5173 %DOCKER_USERNAME%/%REPO_NAME%-frontend:latest

echo 🎉 Docker Hub publishing completed!
pause
