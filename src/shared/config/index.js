import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/microservice_db',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Authentication
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  
  // Service Discovery
  CONSUL_HOST: process.env.CONSUL_HOST || 'localhost',
  CONSUL_PORT: parseInt(process.env.CONSUL_PORT) || 8500,
  
  // AI Services
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
  HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY,
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  TOGETHER_API_KEY: process.env.TOGETHER_API_KEY,
  
  // Google Cloud
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID,
  
  // Vector Database
  QDRANT_URL: process.env.QDRANT_URL || 'http://localhost:6333',
  QDRANT_API_KEY: process.env.QDRANT_API_KEY,
  
  // Email
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  
  // File Upload
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || '50MB',
  UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
  
  // Monitoring
  APITALLY_CLIENT_ID: process.env.APITALLY_CLIENT_ID,
  APITALLY_ENV: process.env.APITALLY_ENV || 'development',
  
  // MCP Configuration
  MCP_SERVER_PORT: parseInt(process.env.MCP_SERVER_PORT) || 3001,
  MCP_TRANSPORT: process.env.MCP_TRANSPORT || 'stdio',
  MCP_LOG_LEVEL: process.env.MCP_LOG_LEVEL || 'info',
  
  // Service Ports
  GATEWAY_PORT: parseInt(process.env.GATEWAY_PORT) || 4000,
  AUTH_SERVICE_PORT: parseInt(process.env.AUTH_SERVICE_PORT) || 4001,
  AI_SERVICE_PORT: parseInt(process.env.AI_SERVICE_PORT) || 4002,
  MEDIA_SERVICE_PORT: parseInt(process.env.MEDIA_SERVICE_PORT) || 4003,
  DATA_SERVICE_PORT: parseInt(process.env.DATA_SERVICE_PORT) || 4004,
  
  // Service URLs (for inter-service communication)
  SERVICES: {
    AUTH: process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
    AI: process.env.AI_SERVICE_URL || 'http://localhost:4002',
    MEDIA: process.env.MEDIA_SERVICE_URL || 'http://localhost:4003',
    DATA: process.env.DATA_SERVICE_URL || 'http://localhost:4004',
  }
};

export default config;
