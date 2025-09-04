FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY babel.config.js ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Create uploads directory
RUN mkdir -p uploads/thumbnails

# Expose port
EXPOSE 4003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4003/health || exit 1

# Start the service
CMD ["node", "src/services/media/index.js"]
