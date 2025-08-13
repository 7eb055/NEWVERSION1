# 🚀 Event Management System - Deployment Guide

## 📋 Overview
This is a full-stack event management system with React frontend, Node.js/Express backend, and PostgreSQL database. The application includes payment integration with Paystack, event registration, feedback system, and admin functionality.

**Repository:** https://github.com/7eb055/NEWVERSION1
**Docker Hub:** *[Add your Docker Hub link here after pushing images]*

---

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React/Vite    │    │ Node.js/Express │    │   PostgreSQL    │
│   Frontend      │◄──►│    Backend      │◄──►│    Database     │
│   (Port 5173)   │    │   (Port 5000)   │    │   (Port 5432)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🛠️ Dependencies & Requirements

### **System Requirements**
- **Node.js:** >= 16.0.0
- **npm:** >= 8.0.0
- **PostgreSQL:** >= 13.0
- **Docker:** >= 20.10 (optional)
- **Git:** Latest version

### **Backend Dependencies**
```json
{
  "runtime": {
    "@paystack/inline-js": "^2.22.7",
    "axios": "^1.11.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "crypto": "^1.0.1",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "morgan": "^1.10.0",
    "multer": "^2.0.2",
    "nodemailer": "^6.10.1",
    "pg": "^8.11.3",
    "qrcode": "^1.5.4",
    "uuid": "^11.1.0"
  },
  "development": {
    "@types/jest": "^30.0.0",
    "eslint": "^8.57.1",
    "jest": "^29.7.0",
    "nodemon": "^3.1.10",
    "prettier": "^3.6.2",
    "supertest": "^6.3.4"
  }
}
```

### **Frontend Dependencies**
```json
{
  "runtime": {
    "@paystack/inline-js": "^2.22.7",
    "axios": "^1.10.0",
    "qrcode": "^1.5.4",
    "qrcode.react": "^4.2.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^7.6.3"
  },
  "development": {
    "@vitejs/plugin-react": "^4.6.0",
    "eslint": "^9.30.1",
    "prettier": "^3.6.2",
    "typescript": "^5.9.2",
    "vite": "^7.0.4",
    "vitest": "^3.2.4"
  }
}
```

---

## 🔧 Environment Variables

### **Backend (.env)**
```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=event_management_db
DB_USER=your_db_username
DB_PASSWORD=your_secure_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# Email Configuration (Gmail SMTP)
EMAIL_USER=your-app-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password

# Server Configuration
PORT=5000
NODE_ENV=production

# Frontend URL
FRONTEND_URL=https://your-frontend-domain.com

# CORS Configuration
CORS_ORIGINS=https://your-frontend-domain.com

# Paystack Configuration
PAYSTACK_PUBLIC_KEY=pk_live_your_public_key
PAYSTACK_SECRET_KEY=sk_live_your_secret_key
PAYSTACK_BASE_URL=https://api.paystack.co
```

### **Frontend (.env)**
```bash
VITE_API_URL=https://your-backend-domain.com/api
VITE_PAYSTACK_PUBLIC_KEY=pk_live_your_public_key
```

---

## 🚀 Quick Deployment Guide (GitHub Actions + Free Hosting)

### **Step 1: Clone the Repository**
```bash
git clone https://github.com/7eb055/NEWVERSION1.git
cd NEWVERSION1
```

### **Step 2: Choose Your Free Hosting Platform**

#### **Option A: Railway (Recommended)**
1. **Create Account:** [Railway.app](https://railway.app)
2. **Deploy Database:**
   - New Project → Add PostgreSQL
   - Note connection details

3. **Deploy Backend:**
   - New Service → Connect GitHub → Select repository
   - Root directory: `/backend`
   - Add environment variables from above

4. **Deploy Frontend:**
   - New Service → Connect GitHub → Same repository
   - Root directory: `/eventfrontend`
   - Add `VITE_API_URL` pointing to backend

#### **Option B: Render.com**
1. **Database:** Create PostgreSQL instance
2. **Backend:** Web Service from GitHub
3. **Frontend:** Static Site from GitHub

#### **Option C: Heroku (with GitHub Actions)**
1. **Apps:** Create staging and production apps
2. **Database:** Add PostgreSQL addon
3. **GitHub Actions:** Already configured!

### **Step 3: Configure GitHub Actions Secrets**

Go to your GitHub repository → Settings → Secrets and Variables → Actions

**Required Secrets:**
```
HEROKU_API_KEY=your_heroku_api_key
HEROKU_EMAIL=your_email@example.com

# Staging Environment
STAGING_DB_HOST=postgres_host
STAGING_DB_USER=postgres_user
STAGING_DB_PASSWORD=postgres_password
STAGING_DB_NAME=database_name
STAGING_JWT_SECRET=random_32_char_string
STAGING_PAYSTACK_SECRET_KEY=sk_test_key

# Production Environment
PRODUCTION_DB_HOST=postgres_host
PRODUCTION_DB_USER=postgres_user
PRODUCTION_DB_PASSWORD=postgres_password
PRODUCTION_DB_NAME=database_name
PRODUCTION_JWT_SECRET=random_32_char_string
PRODUCTION_PAYSTACK_SECRET_KEY=sk_live_key
```

### **Step 4: Update GitHub Actions Configuration**

Edit `.github/workflows/ci-cd.yml`:
```yaml
# Update these values (lines 168, 197):
heroku_app_name: "your-actual-staging-app-name"
heroku_email: "your-actual-email@example.com"

# And for production (lines 220, 223):
heroku_app_name: "your-actual-production-app-name"
heroku_email: "your-actual-email@example.com"
```

---

## 🐳 Docker Deployment

### **Option 1: Docker Compose (Complete Stack)**
```bash
# Clone repository
git clone https://github.com/7eb055/NEWVERSION1.git
cd NEWVERSION1

# Create environment file
cp .env.docker .env

# Start all services
docker-compose up -d

# Access:
# Frontend: http://localhost:5173
# Backend: http://localhost:5000
# Database: localhost:5432
```

### **Option 2: Individual Docker Images**
```bash
# Build Backend
cd backend
docker build -t event-backend .
docker run -p 5000:5000 --env-file .env event-backend

# Build Frontend
cd ../eventfrontend
docker build -t event-frontend .
docker run -p 5173:5173 event-frontend
```

---

## 📝 Manual Deployment Steps

### **Step 1: Server Setup**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Install PM2 (Process Manager)
sudo npm install -g pm2
```

### **Step 2: Database Setup**
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE event_management_db;
CREATE USER your_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE event_management_db TO your_user;
\q
```

### **Step 3: Application Setup**
```bash
# Clone repository
git clone https://github.com/7eb055/NEWVERSION1.git
cd NEWVERSION1

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run migrate

# Frontend setup
cd ../eventfrontend
npm install
npm run build
```

### **Step 4: Start Services**
```bash
# Start backend with PM2
cd backend
pm2 start server.js --name "event-backend"

# Serve frontend (using nginx or serve)
cd ../eventfrontend
sudo npm install -g serve
pm2 start "serve -s dist -l 5173" --name "event-frontend"

# Save PM2 configuration
pm2 save
pm2 startup
```

---

## 🔍 Verification Steps

### **Health Checks**
```bash
# Backend health
curl http://your-domain:5000/health

# Frontend access
curl http://your-domain:5173

# Database connection
cd backend && npm run test
```

### **Test Registration Flow**
1. Visit frontend URL
2. Register new account
3. Check email verification
4. Login and create event
5. Test payment with Paystack test keys

---

## 🛠️ Troubleshooting

### **Common Issues**
1. **Port conflicts:** Use different ports or kill existing processes
2. **Database connection:** Check credentials and host accessibility
3. **CORS errors:** Update CORS_ORIGINS environment variable
4. **Payment issues:** Verify Paystack keys and webhook URL

### **Logs Location**
```bash
# PM2 logs
pm2 logs

# Docker logs
docker-compose logs

# Backend logs
tail -f backend/logs/app.log
```

---

## 📞 Support & Resources

- **Repository Issues:** https://github.com/7eb055/NEWVERSION1/issues
- **Paystack Documentation:** https://paystack.com/docs
- **Railway Documentation:** https://docs.railway.app
- **Heroku Documentation:** https://devcenter.heroku.com

---

## 📄 License
MIT License - see LICENSE file for details

---

**Last Updated:** August 2025
**Maintainer:** @7eb055
