const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const winston = require('winston');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Load environment variables
dotenv.config();

// Import database connection
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { connectQdrant } = require('./config/qdrant');

// Import MCP protocol handlers
const { setupMCPProtocol } = require('./mcp/protocol');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const aiRoutes = require('./routes/ai');
const healthRoutes = require('./routes/health');
const mcpRoutes = require('./routes/mcp');

// Create Express app and HTTP server
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  }
});

const PORT = process.env.PORT || 4002;

// Configure logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/ai/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Health check route
app.use('/health', healthRoutes);

// AI routes
app.use('/ai', aiRoutes);

// MCP protocol routes
app.use('/mcp', mcpRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('ai_request', async (data) => {
    try {
      // Handle AI requests via WebSocket
      const result = await handleAIRequest(data);
      socket.emit('ai_response', result);
    } catch (error) {
      logger.error('AI request error:', error);
      socket.emit('ai_error', { error: error.message });
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
async function startServer() {
  try {
    // Connect to databases
    await connectDB();
    logger.info('✅ Connected to MongoDB');
    
    await connectRedis();
    logger.info('✅ Connected to Redis');
    
    await connectQdrant();
    logger.info('✅ Connected to Qdrant Vector Database');
    
    // Setup MCP protocol
    await setupMCPProtocol();
    logger.info('✅ MCP Protocol initialized');
    
    server.listen(PORT, () => {
      logger.info(`🚀 AI Service running on port ${PORT}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      logger.info(`🤖 AI endpoints: http://localhost:${PORT}/ai`);
      logger.info(`🔗 MCP endpoints: http://localhost:${PORT}/mcp`);
      logger.info(`🔌 WebSocket: ws://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

startServer();
