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
const cron = require('node-cron');

// Load environment variables
dotenv.config();

// Import orchestrator components
const { ServiceRegistry } = require('./registry/serviceRegistry');
const { LoadBalancer } = require('./loadbalancer/loadBalancer');
const { CircuitBreaker } = require('./circuitbreaker/circuitBreaker');
const { HealthMonitor } = require('./monitoring/healthMonitor');
const { ConfigManager } = require('./config/configManager');
const { MetricsCollector } = require('./metrics/metricsCollector');

// Import routes
const orchestratorRoutes = require('./routes/orchestrator');
const healthRoutes = require('./routes/health');
const metricsRoutes = require('./routes/metrics');

// Create Express app and HTTP server
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  }
});

const PORT = process.env.PORT || 4006;

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
app.use('/orchestrator/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Health check route
app.use('/health', healthRoutes);

// Orchestrator routes
app.use('/orchestrator', orchestratorRoutes);

// Metrics route
app.use('/metrics', metricsRoutes);

// Socket.IO connection handling for real-time updates
io.on('connection', (socket) => {
  logger.info(`Client connected to orchestrator: ${socket.id}`);

  socket.on('subscribe_service_updates', (data) => {
    socket.join('service_updates');
    logger.info(`Client ${socket.id} subscribed to service updates`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected from orchestrator: ${socket.id}`);
  });
});

// Initialize orchestrator components
let serviceRegistry, loadBalancer, circuitBreaker, healthMonitor, configManager, metricsCollector;

async function initializeOrchestrator() {
  try {
    // Initialize Service Registry
    serviceRegistry = new ServiceRegistry();
    await serviceRegistry.initialize();
    logger.info('✅ Service Registry initialized');

    // Initialize Load Balancer
    loadBalancer = new LoadBalancer(serviceRegistry);
    await loadBalancer.initialize();
    logger.info('✅ Load Balancer initialized');

    // Initialize Circuit Breaker
    circuitBreaker = new CircuitBreaker();
    await circuitBreaker.initialize();
    logger.info('✅ Circuit Breaker initialized');

    // Initialize Health Monitor
    healthMonitor = new HealthMonitor(serviceRegistry, io);
    await healthMonitor.initialize();
    logger.info('✅ Health Monitor initialized');

    // Initialize Config Manager
    configManager = new ConfigManager();
    await configManager.initialize();
    logger.info('✅ Config Manager initialized');

    // Initialize Metrics Collector
    metricsCollector = new MetricsCollector();
    await metricsCollector.initialize();
    logger.info('✅ Metrics Collector initialized');

    // Register default services
    await registerDefaultServices();

    // Start health monitoring cron job
    startHealthMonitoring();

    // Start metrics collection cron job
    startMetricsCollection();

  } catch (error) {
    logger.error('Failed to initialize orchestrator:', error);
    throw error;
  }
}

async function registerDefaultServices() {
  const defaultServices = [
    {
      name: 'gateway',
      url: process.env.GATEWAY_SERVICE_URL || 'http://localhost:4000',
      healthEndpoint: '/health',
      type: 'api-gateway'
    },
    {
      name: 'auth',
      url: process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
      healthEndpoint: '/health',
      type: 'authentication'
    },
    {
      name: 'ai',
      url: process.env.AI_SERVICE_URL || 'http://localhost:4002',
      healthEndpoint: '/health',
      type: 'ai-ml'
    },
    {
      name: 'media',
      url: process.env.MEDIA_SERVICE_URL || 'http://localhost:4003',
      healthEndpoint: '/health',
      type: 'media-processing'
    },
    {
      name: 'user',
      url: process.env.USER_SERVICE_URL || 'http://localhost:4004',
      healthEndpoint: '/health',
      type: 'user-management'
    },
    {
      name: 'notification',
      url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4005',
      healthEndpoint: '/health',
      type: 'notification'
    }
  ];

  for (const service of defaultServices) {
    try {
      await serviceRegistry.registerService(service);
      logger.info(`Registered service: ${service.name}`);
    } catch (error) {
      logger.warn(`Failed to register service ${service.name}:`, error.message);
    }
  }
}

function startHealthMonitoring() {
  // Check health every 30 seconds
  cron.schedule('*/30 * * * * *', async () => {
    try {
      await healthMonitor.checkAllServices();
    } catch (error) {
      logger.error('Health monitoring cron job failed:', error);
    }
  });
}

function startMetricsCollection() {
  // Collect metrics every minute
  cron.schedule('0 * * * * *', async () => {
    try {
      await metricsCollector.collectAllMetrics();
    } catch (error) {
      logger.error('Metrics collection cron job failed:', error);
    }
  });
}

// Start server
async function startServer() {
  try {
    // Initialize orchestrator
    await initializeOrchestrator();
    
    server.listen(PORT, () => {
      logger.info(`🚀 Service Orchestrator running on port ${PORT}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      logger.info(`🔧 Orchestrator: http://localhost:${PORT}/orchestrator`);
      logger.info(`📈 Metrics: http://localhost:${PORT}/metrics`);
      logger.info(`🔌 WebSocket: ws://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start orchestrator server:', error);
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
