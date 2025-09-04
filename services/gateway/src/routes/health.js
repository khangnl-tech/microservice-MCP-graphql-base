const express = require('express');
const router = express.Router();
const axios = require('axios');

// Service URLs
const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
  ai: process.env.AI_SERVICE_URL || 'http://localhost:4002',
  media: process.env.MEDIA_SERVICE_URL || 'http://localhost:4003',
  user: process.env.USER_SERVICE_URL || 'http://localhost:4004',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4005'
};

// Health check for the gateway itself
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'API Gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check for all microservices
router.get('/services', async (req, res) => {
  const healthChecks = {};
  const promises = [];

  // Check each service
  for (const [serviceName, serviceUrl] of Object.entries(services)) {
    promises.push(
      axios.get(`${serviceUrl}/health`)
        .then(response => {
          healthChecks[serviceName] = {
            status: 'healthy',
            responseTime: response.headers['x-response-time'] || 'N/A',
            timestamp: new Date().toISOString()
          };
        })
        .catch(error => {
          healthChecks[serviceName] = {
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
          };
        })
    );
  }

  // Wait for all health checks to complete
  await Promise.allSettled(promises);

  // Determine overall health
  const allHealthy = Object.values(healthChecks).every(check => check.status === 'healthy');
  const overallStatus = allHealthy ? 'healthy' : 'degraded';

  res.status(allHealthy ? 200 : 503).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services: healthChecks,
    gateway: {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// Detailed health check for a specific service
router.get('/services/:serviceName', async (req, res) => {
  const { serviceName } = req.params;
  const serviceUrl = services[serviceName];

  if (!serviceUrl) {
    return res.status(404).json({
      error: 'Service not found',
      availableServices: Object.keys(services)
    });
  }

  try {
    const response = await axios.get(`${serviceUrl}/health`);
    res.status(200).json({
      service: serviceName,
      status: 'healthy',
      responseTime: response.headers['x-response-time'] || 'N/A',
      timestamp: new Date().toISOString(),
      details: response.data
    });
  } catch (error) {
    res.status(503).json({
      service: serviceName,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Metrics endpoint for monitoring
router.get('/metrics', (req, res) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  };

  res.status(200).json(metrics);
});

module.exports = router;
