# 📦 Event Management System - Dependencies

## 🎯 System Requirements

| Component | Version | Required | Notes |
|-----------|---------|----------|-------|
| **Node.js** | >= 16.0.0 | ✅ Required | JavaScript runtime |
| **npm** | >= 8.0.0 | ✅ Required | Package manager |
| **PostgreSQL** | >= 13.0 | ✅ Required | Database |
| **Docker** | >= 20.10 | ⚪ Optional | For containerized deployment |
| **Git** | Latest | ✅ Required | Version control |

---

## 🛠️ Backend Dependencies (Node.js/Express)

### **Production Dependencies**
```json
{
  "@paystack/inline-js": "^2.22.7",     // Payment processing
  "axios": "^1.11.0",                    // HTTP client
  "bcryptjs": "^2.4.3",                  // Password hashing
  "cors": "^2.8.5",                      // Cross-origin requests
  "crypto": "^1.0.1",                    // Cryptographic functions
  "dotenv": "^16.3.1",                   // Environment variables
  "express": "^4.18.2",                  // Web framework
  "express-rate-limit": "^7.1.5",        // Rate limiting
  "express-validator": "^7.0.1",         // Input validation
  "helmet": "^7.1.0",                    // Security headers
  "jsonwebtoken": "^9.0.2",              // JWT authentication
  "morgan": "^1.10.0",                   // HTTP request logger
  "multer": "^2.0.2",                    // File upload handling
  "nodemailer": "^6.10.1",               // Email sending
  "pg": "^8.11.3",                       // PostgreSQL client
  "qrcode": "^1.5.4",                    // QR code generation
  "uuid": "^11.1.0"                      // UUID generation
}
```

### **Development Dependencies**
```json
{
  "@types/jest": "^30.0.0",              // Jest type definitions
  "eslint": "^8.57.1",                   // Code linting
  "eslint-config-node": "^4.1.0",        // Node.js ESLint config
  "jest": "^29.7.0",                     // Testing framework
  "nodemon": "^3.1.10",                  // Development server
  "prettier": "^3.6.2",                  // Code formatting
  "supertest": "^6.3.4"                  // HTTP testing
}
```

---

## ⚛️ Frontend Dependencies (React/Vite)

### **Production Dependencies**
```json
{
  "@paystack/inline-js": "^2.22.7",      // Payment widget
  "axios": "^1.10.0",                    // API client
  "code": "^5.2.4",                      // Code utilities
  "qr": "^0.5.0",                        // QR code utilities
  "qrcode": "^1.5.4",                    // QR code generation
  "qrcode.react": "^4.2.0",              // React QR component
  "react": "^19.1.0",                    // React framework
  "react-dom": "^19.1.0",                // React DOM
  "react-router-dom": "^7.6.3"           // React routing
}
```

### **Development Dependencies**
```json
{
  "@eslint/js": "^9.30.1",               // ESLint JavaScript
  "@testing-library/jest-dom": "^6.6.4", // Jest DOM testing
  "@testing-library/react": "^16.3.0",   // React testing utilities
  "@types/react": "^19.1.8",             // React type definitions
  "@types/react-dom": "^19.1.6",         // React DOM types
  "@vitejs/plugin-react": "^4.6.0",      // Vite React plugin
  "eslint": "^9.30.1",                   // Code linting
  "eslint-plugin-react-hooks": "^5.2.0", // React hooks ESLint
  "eslint-plugin-react-refresh": "^0.4.20", // React refresh ESLint
  "globals": "^16.3.0",                  // Global variables
  "jsdom": "^26.1.0",                    // DOM testing environment
  "prettier": "^3.6.2",                  // Code formatting
  "typescript": "^5.9.2",                // TypeScript compiler
  "vite": "^7.0.4",                      // Build tool
  "vitest": "^3.2.4"                     // Testing framework
}
```

---

## 🔧 Third-Party Services

| Service | Purpose | Required | Free Tier |
|---------|---------|----------|-----------|
| **PostgreSQL Database** | Data storage | ✅ Required | ✅ Yes (various providers) |
| **Paystack** | Payment processing | ✅ Required | ✅ Yes (test mode) |
| **Gmail SMTP** | Email notifications | ✅ Required | ✅ Yes (app passwords) |
| **Railway/Render/Heroku** | Hosting platform | ⚪ Deployment | ✅ Yes (limited) |

---

## 🚀 Quick Installation Commands

### **Install All Dependencies**
```bash
# Backend
cd backend && npm install

# Frontend  
cd eventfrontend && npm install
```

### **Development Mode**
```bash
# Backend (Terminal 1)
cd backend && npm run dev

# Frontend (Terminal 2)
cd eventfrontend && npm run dev
```

### **Production Build**
```bash
# Backend
cd backend && npm start

# Frontend
cd eventfrontend && npm run build && npm run preview
```

---

## 📋 Installation Verification

### **Check Node.js & npm**
```bash
node --version  # Should be >= 16.0.0
npm --version   # Should be >= 8.0.0
```

### **Check PostgreSQL**
```bash
psql --version  # Should be >= 13.0
```

### **Test Application**
```bash
# Backend health check
curl http://localhost:5000/health

# Frontend access
curl http://localhost:5173
```

---

## 🐳 Docker Dependencies

### **Docker Compose Services**
- **postgres:15-alpine** - PostgreSQL database
- **node:18-alpine** - Node.js runtime for backend
- **nginx:alpine** - Web server for frontend

### **Docker Commands**
```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

---

**📝 Note:** All version numbers are minimum requirements. Newer versions should work unless breaking changes are introduced.
