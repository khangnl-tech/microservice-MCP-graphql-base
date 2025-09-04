FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY babel.config.js ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Create exports directory
RUN mkdir -p exports

# Expose port
EXPOSE 4004

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4004/health || exit 1

# Start the service
CMD ["node", "src/services/data/index.js"]
