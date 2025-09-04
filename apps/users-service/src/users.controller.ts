import { Router, Request, Response } from 'express';
import { Logger, validationPipe, CommonSchemas } from '@libs/common';
import { UsersService } from './users.service';

export class UsersController {
  private logger = Logger.getInstance();
  private router = Router();

  constructor(private usersService: UsersService) {
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

      const result = await this.usersService.getUsers(pagination);

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

      const user = await this.usersService.getUserById(id);

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

      const user = await this.usersService.createUser(userData);

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

      const user = await this.usersService.updateUser(id, updateData);

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

      const result = await this.usersService.deleteUser(id);

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
