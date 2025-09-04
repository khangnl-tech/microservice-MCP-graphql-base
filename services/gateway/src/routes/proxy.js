const express = require('express');
const router = express.Router();
const axios = require('axios');
const { asyncHandler } = require('../middleware/errorHandler');

// Service URLs
const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
  ai: process.env.AI_SERVICE_URL || 'http://localhost:4002',
  media: process.env.MEDIA_SERVICE_URL || 'http://localhost:4003',
  user: process.env.USER_SERVICE_URL || 'http://localhost:4004',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4005'
};

// Helper function to proxy requests
const proxyRequest = async (serviceUrl, req, res) => {
  try {
    const { method, url, headers, body, query } = req;
    
    // Remove gateway-specific headers
    const cleanHeaders = { ...headers };
    delete cleanHeaders.host;
    delete cleanHeaders['content-length'];
    
    // Add user info to headers if available
    if (req.user) {
      cleanHeaders['x-user-id'] = req.user.id;
      cleanHeaders['x-user-role'] = req.user.role;
    }

    const config = {
      method: method.toLowerCase(),
      url: `${serviceUrl}${url}`,
      headers: cleanHeaders,
      params: query,
      timeout: 30000 // 30 second timeout
    };

    // Add body for POST, PUT, PATCH requests
    if (['post', 'put', 'patch'].includes(method.toLowerCase()) && body) {
      config.data = body;
    }

    const response = await axios(config);
    
    // Forward response headers
    Object.entries(response.headers).forEach(([key, value]) => {
      res.set(key, value);
    });

    // Set response status and send data
    res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      // Service responded with error status
      res.status(error.response.status).json(error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      // Service is down
      res.status(503).json({
        error: 'Service unavailable',
        message: 'The requested service is currently unavailable'
      });
    } else if (error.code === 'ETIMEDOUT') {
      // Request timeout
      res.status(504).json({
        error: 'Gateway timeout',
        message: 'The request to the service timed out'
      });
    } else {
      // Other errors
      res.status(500).json({
        error: 'Internal gateway error',
        message: error.message
      });
    }
  }
};

// Auth service routes
router.use('/auth', asyncHandler(async (req, res) => {
  await proxyRequest(services.auth, req, res);
}));

// AI service routes
router.use('/ai', asyncHandler(async (req, res) => {
  await proxyRequest(services.ai, req, res);
}));

// Media service routes
router.use('/media', asyncHandler(async (req, res) => {
  await proxyRequest(services.media, req, res);
}));

// User service routes
router.use('/users', asyncHandler(async (req, res) => {
  await proxyRequest(services.user, req, res);
}));

// Notification service routes
router.use('/notifications', asyncHandler(async (req, res) => {
  await proxyRequest(services.notification, req, res);
}));

// Generic proxy for other routes
router.use('*', asyncHandler(async (req, res) => {
  // Try to determine which service to route to based on the path
  const path = req.path;
  
  if (path.startsWith('/auth') || path.startsWith('/login') || path.startsWith('/register')) {
    await proxyRequest(services.auth, req, res);
  } else if (path.startsWith('/ai') || path.startsWith('/generate') || path.startsWith('/models')) {
    await proxyRequest(services.ai, req, res);
  } else if (path.startsWith('/media') || path.startsWith('/files') || path.startsWith('/upload')) {
    await proxyRequest(services.media, req, res);
  } else if (path.startsWith('/users') || path.startsWith('/profile')) {
    await proxyRequest(services.user, req, res);
  } else if (path.startsWith('/notifications') || path.startsWith('/notify')) {
    await proxyRequest(services.notification, req, res);
  } else {
    res.status(404).json({
      error: 'Route not found',
      message: 'No service found to handle this request'
    });
  }
}));

module.exports = router;
