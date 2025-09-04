const winston = require('winston');
const redis = require('redis');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/registry.log', level: 'error' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

class ServiceRegistry {
  constructor() {
    this.redisClient = null;
    this.services = new Map();
    this.serviceTypes = new Map();
    this.healthStatus = new Map();
  }

  async initialize() {
    try {
      // Connect to Redis
      this.redisClient = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      await this.redisClient.connect();
      logger.info('Service Registry Redis connected');

      // Load existing services from Redis
      await this.loadServicesFromRedis();

    } catch (error) {
      logger.error('Failed to initialize Service Registry:', error);
      throw error;
    }
  }

  async registerService(serviceInfo) {
    try {
      const serviceId = this.generateServiceId(serviceInfo);
      const serviceData = {
        id: serviceId,
        name: serviceInfo.name,
        url: serviceInfo.url,
        type: serviceInfo.type,
        healthEndpoint: serviceInfo.healthEndpoint,
        status: 'healthy',
        lastSeen: new Date().toISOString(),
        metadata: serviceInfo.metadata || {},
        version: serviceInfo.version || '1.0.0',
        endpoints: serviceInfo.endpoints || [],
        loadBalancing: serviceInfo.loadBalancing || 'round-robin'
      };

      // Store in memory
      this.services.set(serviceId, serviceData);
      
      // Store in Redis for persistence
      await this.redisClient.hSet('services', serviceId, JSON.stringify(serviceData));
      
      // Update service types index
      if (!this.serviceTypes.has(serviceData.type)) {
        this.serviceTypes.set(serviceData.type, []);
      }
      this.serviceTypes.get(serviceData.type).push(serviceId);

      logger.info(`Service registered: ${serviceData.name} (${serviceId})`);
      return serviceId;

    } catch (error) {
      logger.error(`Failed to register service ${serviceInfo.name}:`, error);
      throw error;
    }
  }

  async deregisterService(serviceId) {
    try {
      const service = this.services.get(serviceId);
      if (!service) {
        throw new Error(`Service ${serviceId} not found`);
      }

      // Remove from memory
      this.services.delete(serviceId);
      
      // Remove from Redis
      await this.redisClient.hDel('services', serviceId);
      
      // Remove from service types index
      const typeServices = this.serviceTypes.get(service.type);
      if (typeServices) {
        const index = typeServices.indexOf(serviceId);
        if (index > -1) {
          typeServices.splice(index, 1);
        }
      }

      // Remove health status
      this.healthStatus.delete(serviceId);

      logger.info(`Service deregistered: ${service.name} (${serviceId})`);
      return true;

    } catch (error) {
      logger.error(`Failed to deregister service ${serviceId}:`, error);
      throw error;
    }
  }

  async updateServiceHealth(serviceId, healthData) {
    try {
      const service = this.services.get(serviceId);
      if (!service) {
        throw new Error(`Service ${serviceId} not found`);
      }

      // Update health status
      this.healthStatus.set(serviceId, {
        ...healthData,
        lastUpdated: new Date().toISOString()
      });

      // Update service status
      service.status = healthData.status;
      service.lastSeen = new Date().toISOString();

      // Update in Redis
      await this.redisClient.hSet('services', serviceId, JSON.stringify(service));

      logger.debug(`Service health updated: ${service.name} - ${healthData.status}`);
      return true;

    } catch (error) {
      logger.error(`Failed to update service health for ${serviceId}:`, error);
      throw error;
    }
  }

  async getService(serviceId) {
    return this.services.get(serviceId);
  }

  async getServicesByType(type) {
    const serviceIds = this.serviceTypes.get(type) || [];
    return serviceIds.map(id => this.services.get(id)).filter(Boolean);
  }

  async getAllServices() {
    return Array.from(this.services.values());
  }

  async getHealthyServices() {
    return Array.from(this.services.values()).filter(service => 
      service.status === 'healthy'
    );
  }

  async getServiceHealth(serviceId) {
    return this.healthStatus.get(serviceId);
  }

  async getAllServiceHealth() {
    const healthData = {};
    for (const [serviceId, health] of this.healthStatus) {
      healthData[serviceId] = health;
    }
    return healthData;
  }

  async searchServices(query) {
    const results = [];
    const searchTerm = query.toLowerCase();

    for (const service of this.services.values()) {
      if (
        service.name.toLowerCase().includes(searchTerm) ||
        service.type.toLowerCase().includes(searchTerm) ||
        service.url.toLowerCase().includes(searchTerm)
      ) {
        results.push(service);
      }
    }

    return results;
  }

  async getServiceMetrics(serviceId) {
    try {
      const service = this.services.get(serviceId);
      if (!service) {
        throw new Error(`Service ${serviceId} not found`);
      }

      const health = this.healthStatus.get(serviceId);
      const metrics = {
        serviceId,
        name: service.name,
        type: service.type,
        status: service.status,
        uptime: this.calculateUptime(service.lastSeen),
        health: health || {},
        lastSeen: service.lastSeen,
        metadata: service.metadata
      };

      return metrics;

    } catch (error) {
      logger.error(`Failed to get service metrics for ${serviceId}:`, error);
      throw error;
    }
  }

  async loadServicesFromRedis() {
    try {
      const servicesData = await this.redisClient.hGetAll('services');
      
      for (const [serviceId, serviceJson] of Object.entries(servicesData)) {
        try {
          const serviceData = JSON.parse(serviceJson);
          this.services.set(serviceId, serviceData);
          
          // Update service types index
          if (!this.serviceTypes.has(serviceData.type)) {
            this.serviceTypes.set(serviceData.type, []);
          }
          this.serviceTypes.get(serviceData.type).push(serviceId);
          
        } catch (parseError) {
          logger.warn(`Failed to parse service data for ${serviceId}:`, parseError);
        }
      }

      logger.info(`Loaded ${this.services.size} services from Redis`);

    } catch (error) {
      logger.error('Failed to load services from Redis:', error);
    }
  }

  generateServiceId(serviceInfo) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${serviceInfo.name}-${serviceInfo.type}-${timestamp}-${random}`;
  }

  calculateUptime(lastSeen) {
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMs = now - lastSeenDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours % 24}h ${diffMins % 60}m`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    } else {
      return `${diffMins}m`;
    }
  }

  async cleanup() {
    try {
      if (this.redisClient) {
        await this.redisClient.quit();
        logger.info('Service Registry Redis connection closed');
      }
    } catch (error) {
      logger.error('Failed to cleanup Service Registry:', error);
    }
  }
}

module.exports = { ServiceRegistry };
