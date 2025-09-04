import { Logger, natsClient } from '@libs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

export class AppModule {
  private logger = Logger.getInstance();
  private usersService: UsersService;
  private usersController: UsersController;

  constructor() {
    this.usersService = new UsersService();
    this.usersController = new UsersController(this.usersService);
  }

  async initialize() {
    this.logger.info('Initializing Users Service module');
    // Any initialization logic here
  }

  getUsersController(): UsersController {
    return this.usersController;
  }

  getUsersService(): UsersService {
    return this.usersService;
  }

  getHealthController() {
    return {
      getHealth: async (req: any, res: any) => {
        try {
          const health = {
            status: 'healthy',
            timestamp: new Date(),
            service: 'users-service',
            version: '1.0.0',
            dependencies: {
              mongodb: {
                status: 'healthy', // TODO: Check MongoDB connection
                responseTime: 0
              },
              nats: {
                status: natsClient.isConnected() ? 'healthy' : 'unhealthy',
                responseTime: 0
              }
            }
          };

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
            service: 'users-service',
            version: '1.0.0',
            error: (error as Error).message
          });
        }
      }
    };
  }

  async setupNatsHandlers() {
    this.logger.info('Setting up NATS handlers');

    // Handle user creation requests
    await natsClient.reply('users.create', async (data) => {
      try {
        return await this.usersService.createUser(data);
      } catch (error) {
        this.logger.error('Error handling users.create', error as Error);
        throw error;
      }
    });

    // Handle user retrieval requests
    await natsClient.reply('users.get', async (data) => {
      try {
        return await this.usersService.getUserById(data.userId);
      } catch (error) {
        this.logger.error('Error handling users.get', error as Error);
        throw error;
      }
    });

    // Handle user list requests
    await natsClient.reply('users.list', async (data) => {
      try {
        return await this.usersService.getUsers(data.pagination);
      } catch (error) {
        this.logger.error('Error handling users.list', error as Error);
        throw error;
      }
    });

    // Handle user update requests
    await natsClient.reply('users.update', async (data) => {
      try {
        const { userId, ...updateData } = data;
        return await this.usersService.updateUser(userId, updateData);
      } catch (error) {
        this.logger.error('Error handling users.update', error as Error);
        throw error;
      }
    });

    // Handle user deletion requests
    await natsClient.reply('users.delete', async (data) => {
      try {
        return await this.usersService.deleteUser(data.userId);
      } catch (error) {
        this.logger.error('Error handling users.delete', error as Error);
        throw error;
      }
    });

    // Handle health ping
    await natsClient.reply('health.ping', async (data) => {
      return {
        service: 'users-service',
        status: 'healthy',
        timestamp: new Date()
      };
    });

    this.logger.info('NATS handlers setup completed');
  }
}
