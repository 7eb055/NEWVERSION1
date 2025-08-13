#!/bin/bash

# Event Management System - Docker Hub Publishing Script
# Run this script to build and push Docker images to Docker Hub

set -e

# Configuration - UPDATE THESE VALUES
DOCKER_USERNAME="your-dockerhub-username"
REPO_NAME="event-management-system"
VERSION="1.0.0"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🐳 Event Management System - Docker Hub Publisher${NC}"
echo -e "${YELLOW}=============================================${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if logged in to Docker Hub
if ! docker info | grep -q "Username"; then
    echo -e "${YELLOW}🔐 Please login to Docker Hub first:${NC}"
    docker login
fi

echo -e "${GREEN}📦 Building Docker images...${NC}"

# Build Backend Image
echo -e "${YELLOW}Building backend image...${NC}"
cd backend
docker build -t ${DOCKER_USERNAME}/${REPO_NAME}-backend:${VERSION} .
docker build -t ${DOCKER_USERNAME}/${REPO_NAME}-backend:latest .
cd ..

# Build Frontend Image
echo -e "${YELLOW}Building frontend image...${NC}"
cd eventfrontend
docker build -t ${DOCKER_USERNAME}/${REPO_NAME}-frontend:${VERSION} .
docker build -t ${DOCKER_USERNAME}/${REPO_NAME}-frontend:latest .
cd ..

echo -e "${GREEN}🚀 Pushing images to Docker Hub...${NC}"

# Push Backend Images
echo -e "${YELLOW}Pushing backend images...${NC}"
docker push ${DOCKER_USERNAME}/${REPO_NAME}-backend:${VERSION}
docker push ${DOCKER_USERNAME}/${REPO_NAME}-backend:latest

# Push Frontend Images
echo -e "${YELLOW}Pushing frontend images...${NC}"
docker push ${DOCKER_USERNAME}/${REPO_NAME}-frontend:${VERSION}
docker push ${DOCKER_USERNAME}/${REPO_NAME}-frontend:latest

echo -e "${GREEN}✅ Successfully published to Docker Hub!${NC}"
echo -e "${YELLOW}🔗 Your images are available at:${NC}"
echo -e "   Backend:  https://hub.docker.com/r/${DOCKER_USERNAME}/${REPO_NAME}-backend"
echo -e "   Frontend: https://hub.docker.com/r/${DOCKER_USERNAME}/${REPO_NAME}-frontend"

echo -e "${GREEN}📋 Usage instructions for others:${NC}"
echo -e "${YELLOW}# Pull and run backend:${NC}"
echo -e "docker run -d -p 5000:5000 --env-file .env ${DOCKER_USERNAME}/${REPO_NAME}-backend:latest"
echo -e "${YELLOW}# Pull and run frontend:${NC}"
echo -e "docker run -d -p 5173:5173 ${DOCKER_USERNAME}/${REPO_NAME}-frontend:latest"

echo -e "${GREEN}🎉 Docker Hub publishing completed!${NC}"
