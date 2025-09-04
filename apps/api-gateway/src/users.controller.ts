import { Router, Request, Response } from 'express';
import { Logger, natsClient, validationPipe, CommonSchemas } from '@libs/common';

export class UsersController {
  private logger = Logger.getInstance();
  private router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // GET /api/users - List users
    this.router.get('/', this.getUsers.bind(this));
    
    // GET /api/users/:id - Get user by ID
    this.router.get('/:id', this.getUserById.bind(this));
    
    // POST /api/users - Create user
    this.router.post('/', this.createUser.bind(this));
    
    // PUT /api/users/:id - Update user
    this.router.put('/:id', this.updateUser.bind(this));
    
    // DELETE /api/users/:id - Delete user
    this.router.delete('/:id', this.deleteUser.bind(this));
  }

  public getRouter(): Router {
    return this.router;
  }

  async getUsers(req: Request, res: Response) {
    try {
      // Validate pagination parameters
      const pagination = await validationPipe.validateQuery(
        req.query, 
        CommonSchemas.pagination
      );

      // Forward request to users-service via NATS
      const result = await natsClient.request('users.list', { pagination }, 10000);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('Failed to get users', error as Error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date()
      });
    }
  }

  async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Validate user ID
      await validationPipe.validateParams(
        { id }, 
        CommonSchemas.id
      );

      // Forward request to users-service via NATS
      const user = await natsClient.request('users.get', { userId: id }, 5000);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          timestamp: new Date()
        });
      }

      res.json({
        success: true,
        data: user,
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('Failed to get user by ID', error as Error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date()
      });
    }
  }

  async createUser(req: Request, res: Response) {
    try {
      // Validate request body
      const userData = await validationPipe.validateBody(
        req.body, 
        CommonSchemas.createUser
      );

      // Forward request to users-service via NATS
      const user = await natsClient.request('users.create', userData, 10000);

      res.status(201).json({
        success: true,
        data: user,
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('Failed to create user', error as Error);
      res.status(400).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date()
      });
    }
  }

  async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Validate user ID
      await validationPipe.validateParams(
        { id }, 
        CommonSchemas.id
      );

      // Validate request body
      const updateData = await validationPipe.validateBody(
        req.body, 
        CommonSchemas.updateUser
      );

      // Forward request to users-service via NATS
      const user = await natsClient.request('users.update', { 
        userId: id, 
        ...updateData 
      }, 10000);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          timestamp: new Date()
        });
      }

      res.json({
        success: true,
        data: user,
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('Failed to update user', error as Error);
      res.status(400).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date()
      });
    }
  }

  async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Validate user ID
      await validationPipe.validateParams(
        { id }, 
        CommonSchemas.id
      );

      // Forward request to users-service via NATS
      const result = await natsClient.request('users.delete', { userId: id }, 10000);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          timestamp: new Date()
        });
      }

      res.json({
        success: true,
        message: 'User deleted successfully',
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('Failed to delete user', error as Error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date()
      });
    }
  }
}
