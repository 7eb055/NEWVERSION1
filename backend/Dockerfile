# Eventify Full-Stack Docker Configuration
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
COPY package*.json ./

# Install backend dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy and build frontend
COPY ../eventfrontend /tmp/frontend
WORKDIR /tmp/frontend
RUN npm ci && npm run build

# Copy built frontend to backend public directory
WORKDIR /app
RUN mkdir -p public && \
    cp -r /tmp/frontend/dist/* public/ && \
    rm -rf /tmp/frontend

# Copy backend application code
COPY . .

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
