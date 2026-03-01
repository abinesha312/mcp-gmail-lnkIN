# Dockerfile for MCP Unified API Server
FROM node:20-alpine

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY nodemon.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY src/ ./src/
COPY dashboard/ ./dashboard/

# Build the application (API server only, dashboard built separately)
RUN npm run build

# Expose API port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV API_PORT=3001
ENV MCP_DATA_DIR=/app/data

# Create data directory for credentials
RUN mkdir -p /app/data

# Default command (can be overridden)
CMD ["node", "dist/api.js"]
