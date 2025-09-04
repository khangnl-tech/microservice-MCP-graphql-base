import { Request, Response } from 'express';
import { Logger, natsClient } from '@libs/common';

export class HealthController {
  private logger = Logger.getInstance();

  async getHealth(req: Request, res: Response) {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date(),
        service: 'api-gateway',
        version: '1.0.0',
        dependencies: {
          nats: {
            status: natsClient.isConnected() ? 'healthy' : 'unhealthy',
            responseTime: 0
          }
        }
      };

      // Test NATS connection
      const startTime = Date.now();
      try {
        await natsClient.request('health.ping', { service: 'api-gateway' }, 1000);
        health.dependencies.nats.responseTime = Date.now() - startTime;
      } catch (error) {
        health.dependencies.nats.status = 'unhealthy';
        health.dependencies.nats.responseTime = Date.now() - startTime;
      }

      const overallStatus = Object.values(health.dependencies).every(dep => dep.status === 'healthy') 
        ? 'healthy' 
        : 'degraded';

      res.status(overallStatus === 'healthy' ? 200 : 503).json({
        ...health,
        status: overallStatus
      });
    } catch (error) {
      this.logger.error('Health check failed', error as Error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date(),
        service: 'api-gateway',
        version: '1.0.0',
        error: (error as Error).message
      });
    }
  }

  async getReadiness(req: Request, res: Response) {
    try {
      const ready = natsClient.isConnected();
      
      if (ready) {
        res.status(200).json({
          status: 'ready',
          timestamp: new Date(),
          service: 'api-gateway'
        });
      } else {
        res.status(503).json({
          status: 'not ready',
          timestamp: new Date(),
          service: 'api-gateway',
          reason: 'NATS connection not established'
        });
      }
    } catch (error) {
      this.logger.error('Readiness check failed', error as Error);
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date(),
        service: 'api-gateway',
        error: (error as Error).message
      });
    }
  }
}
