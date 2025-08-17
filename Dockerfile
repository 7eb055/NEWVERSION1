# Multi-stage build for Event Management App
FROM node:18-alpine as frontend-builder

# Build frontend
WORKDIR /frontend
COPY eventfrontend/package*.json ./
RUN npm ci
COPY eventfrontend/ ./
RUN npm run build

# Backend stage
FROM node:18-alpine

WORKDIR /app

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S eventify -u 1001

# Install system dependencies
RUN apk add --no-cache \
    curl \
    postgresql-client \
    && rm -rf /var/cache/apk/*

# Copy backend package files
COPY backend/package*.json ./

# Install backend dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built frontend from previous stage
COPY --from=frontend-builder /frontend/dist ./public

# Copy backend application code (this will include package.json again, but that's ok)
COPY backend/ ./

# Create necessary directories
RUN mkdir -p uploads logs && \
    chown -R eventify:nodejs /app

# Switch to non-root user
USER eventify

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start the application
CMD ["npm", "run", "docker:start"]
