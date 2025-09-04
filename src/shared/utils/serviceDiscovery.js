import consul from 'consul';
import { config } from '../config/index.js';
import logger from './logger.js';

class ServiceDiscovery {
  constructor() {
    this.consul = consul({
      host: config.CONSUL_HOST,
      port: config.CONSUL_PORT,
      promisify: true,
    });
    this.services = new Map();
    this.healthCheckInterval = null;
  }

  // Register a service with Consul
  async registerService(serviceConfig) {
    try {
      const {
        name,
        id,
        port,
        address = 'localhost',
        tags = [],
        check = null,
      } = serviceConfig;

      const serviceId = id || `${name}-${port}`;

      const registrationConfig = {
        name,
        id: serviceId,
        address,
        port,
        tags: ['microservice', ...tags],
      };

      // Add health check if provided
      if (check) {
        registrationConfig.check = {
          http: check.http || `http://${address}:${port}/health`,
          interval: check.interval || '10s',
          timeout: check.timeout || '5s',
          deregistercriticalserviceafter: check.deregister || '30s',
        };
      }

      await this.consul.agent.service.register(registrationConfig);
      
      this.services.set(serviceId, {
        ...registrationConfig,
        registeredAt: new Date(),
      });

      logger.info(`Service registered: ${name} (${serviceId}) at ${address}:${port}`);
      return serviceId;
    } catch (error) {
      logger.error('Failed to register service:', error);
      throw error;
    }
  }

  // Deregister a service from Consul
  async deregisterService(serviceId) {
    try {
      await this.consul.agent.service.deregister(serviceId);
      this.services.delete(serviceId);
      logger.info(`Service deregistered: ${serviceId}`);
    } catch (error) {
      logger.error(`Failed to deregister service ${serviceId}:`, error);
      throw error;
    }
  }

  // Discover services by name
  async discoverService(serviceName) {
    try {
      const services = await this.consul.health.service({
        service: serviceName,
        passing: true, // Only return healthy services
      });

      if (!services || services.length === 0) {
        logger.warn(`No healthy instances found for service: ${serviceName}`);
        return null;
      }

      // Return the first healthy service instance
      const service = services[0];
      const serviceInfo = {
        id: service.Service.ID,
        name: service.Service.Service,
        address: service.Service.Address,
        port: service.Service.Port,
        tags: service.Service.Tags,
        url: `http://${service.Service.Address}:${service.Service.Port}`,
      };

      logger.debug(`Discovered service: ${serviceName}`, serviceInfo);
      return serviceInfo;
    } catch (error) {
      logger.error(`Failed to discover service ${serviceName}:`, error);
      return null;
    }
  }

  // Discover all instances of a service
  async discoverAllInstances(serviceName) {
    try {
      const services = await this.consul.health.service({
        service: serviceName,
        passing: true,
      });

      if (!services || services.length === 0) {
        logger.warn(`No healthy instances found for service: ${serviceName}`);
        return [];
      }

      const instances = services.map(service => ({
        id: service.Service.ID,
        name: service.Service.Service,
        address: service.Service.Address,
        port: service.Service.Port,
        tags: service.Service.Tags,
        url: `http://${service.Service.Address}:${service.Service.Port}`,
      }));

      logger.debug(`Discovered ${instances.length} instances for service: ${serviceName}`);
      return instances;
    } catch (error) {
      logger.error(`Failed to discover instances for service ${serviceName}:`, error);
      return [];
    }
  }

  // Get service URL with load balancing (round-robin)
  async getServiceUrl(serviceName) {
    try {
      const instances = await this.discoverAllInstances(serviceName);
      
      if (instances.length === 0) {
        throw new Error(`No healthy instances available for service: ${serviceName}`);
      }

      // Simple round-robin load balancing
      const instanceIndex = Math.floor(Math.random() * instances.length);
      const selectedInstance = instances[instanceIndex];

      logger.debug(`Selected instance for ${serviceName}:`, selectedInstance);
      return selectedInstance.url;
    } catch (error) {
      logger.error(`Failed to get service URL for ${serviceName}:`, error);
      throw error;
    }
  }

  // Watch for service changes
  watchService(serviceName, callback) {
    const watcher = this.consul.watch({
      method: this.consul.health.service,
      options: {
        service: serviceName,
        passing: true,
      },
    });

    watcher.on('change', (data) => {
      logger.info(`Service ${serviceName} instances changed`);
      callback(data);
    });

    watcher.on('error', (error) => {
      logger.error(`Error watching service ${serviceName}:`, error);
    });

    return watcher;
  }

  // Start health check monitoring
  startHealthCheckMonitoring(interval = 30000) {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        for (const [serviceId, serviceInfo] of this.services) {
          const health = await this.consul.health.service({
            service: serviceInfo.name,
            passing: true,
          });

          const isHealthy = health.some(h => h.Service.ID === serviceId);
          
          if (!isHealthy) {
            logger.warn(`Service ${serviceId} is not healthy`);
          }
        }
      } catch (error) {
        logger.error('Health check monitoring error:', error);
      }
    }, interval);

    logger.info('Health check monitoring started');
  }

  // Stop health check monitoring
  stopHealthCheckMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Health check monitoring stopped');
    }
  }

  // Get all registered services
  async getAllServices() {
    try {
      const services = await this.consul.catalog.service.list();
      return services;
    } catch (error) {
      logger.error('Failed to get all services:', error);
      return {};
    }
  }

  // Graceful shutdown
  async shutdown() {
    try {
      this.stopHealthCheckMonitoring();
      
      // Deregister all services registered by this instance
      for (const serviceId of this.services.keys()) {
        await this.deregisterService(serviceId);
      }
      
      logger.info('Service discovery shutdown completed');
    } catch (error) {
      logger.error('Error during service discovery shutdown:', error);
    }
  }
}

// Create singleton instance
const serviceDiscovery = new ServiceDiscovery();

export default serviceDiscovery;
export { ServiceDiscovery };
