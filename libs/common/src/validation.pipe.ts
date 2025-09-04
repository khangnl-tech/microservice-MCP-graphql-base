import { ValidationError } from './errors';
import { ValidationUtils, JoiSchemas } from './validators';
import * as Joi from 'joi';

export interface ValidationPipeOptions {
  transform?: boolean;
  whitelist?: boolean;
  forbidNonWhitelisted?: boolean;
  skipMissingProperties?: boolean;
  validateCustomDecorators?: boolean;
}

export class ValidationPipe {
  private options: ValidationPipeOptions;

  constructor(options: ValidationPipeOptions = {}) {
    this.options = {
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
      skipMissingProperties: false,
      validateCustomDecorators: true,
      ...options
    };
  }

  /**
   * Transform and validate data using Joi schema
   */
  public async transform<T>(data: any, schema: Joi.Schema): Promise<T> {
    try {
      const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: this.options.whitelist,
        allowUnknown: !this.options.forbidNonWhitelisted,
        skipFunctions: true,
        convert: this.options.transform
      });

      if (error) {
        const errorMessages = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        throw new ValidationError(
          `Validation failed: ${errorMessages.map(e => `${e.field}: ${e.message}`).join(', ')}`
        );
      }

      return value;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Validation error: ${(error as Error).message}`);
    }
  }

  /**
   * Validate pagination parameters
   */
  public async validatePagination(data: any) {
    return this.transform(data, JoiSchemas.pagination);
  }

  /**
   * Validate email
   */
  public async validateEmail(email: string) {
    return this.transform({ email }, Joi.object({ email: JoiSchemas.email }));
  }

  /**
   * Validate password
   */
  public async validatePassword(password: string) {
    return this.transform({ password }, Joi.object({ password: JoiSchemas.password }));
  }

  /**
   * Validate UUID
   */
  public async validateUUID(id: string) {
    return this.transform({ id }, Joi.object({ id: JoiSchemas.uuid }));
  }

  /**
   * Validate AI request
   */
  public async validateAIRequest(data: any) {
    return this.transform(data, JoiSchemas.aiRequest);
  }

  /**
   * Validate media file
   */
  public async validateMediaFile(data: any) {
    return this.transform(data, JoiSchemas.mediaFile);
  }

  /**
   * Validate notification
   */
  public async validateNotification(data: any) {
    return this.transform(data, JoiSchemas.notification);
  }

  /**
   * Create custom validation schema
   */
  public static createSchema(schemaDefinition: any): Joi.Schema {
    return Joi.object(schemaDefinition);
  }

  /**
   * Validate array of items
   */
  public async validateArray<T>(data: any[], itemSchema: Joi.Schema): Promise<T[]> {
    const arraySchema = Joi.array().items(itemSchema);
    return this.transform(data, arraySchema);
  }

  /**
   * Sanitize and validate input data
   */
  public async sanitizeAndValidate<T>(data: any, schema: Joi.Schema): Promise<T> {
    // First sanitize the data
    const sanitizedData = ValidationUtils.sanitizeInput(data);
    
    // Then validate
    return this.transform(sanitizedData, schema);
  }

  /**
   * Validate request body with custom schema
   */
  public async validateBody<T>(body: any, schema: Joi.Schema): Promise<T> {
    if (!body || typeof body !== 'object') {
      throw new ValidationError('Request body must be a valid object');
    }

    return this.sanitizeAndValidate(body, schema);
  }

  /**
   * Validate query parameters
   */
  public async validateQuery<T>(query: any, schema: Joi.Schema): Promise<T> {
    return this.sanitizeAndValidate(query, schema);
  }

  /**
   * Validate route parameters
   */
  public async validateParams<T>(params: any, schema: Joi.Schema): Promise<T> {
    return this.sanitizeAndValidate(params, schema);
  }

  /**
   * Create validation middleware for Express
   */
  public createMiddleware(schema: Joi.Schema, target: 'body' | 'query' | 'params' = 'body') {
    return async (req: any, res: any, next: any) => {
      try {
        let dataToValidate: any;
        
        switch (target) {
          case 'body':
            dataToValidate = req.body;
            break;
          case 'query':
            dataToValidate = req.query;
            break;
          case 'params':
            dataToValidate = req.params;
            break;
          default:
            dataToValidate = req.body;
        }

        const validatedData = await this.sanitizeAndValidate(dataToValidate, schema);
        
        // Replace the original data with validated data
        switch (target) {
          case 'body':
            req.body = validatedData;
            break;
          case 'query':
            req.query = validatedData;
            break;
          case 'params':
            req.params = validatedData;
            break;
        }

        next();
      } catch (error) {
        const validationError = error instanceof ValidationError 
          ? error 
          : new ValidationError(`Validation failed: ${(error as Error).message}`);
        
        res.status(validationError.statusCode).json({
          success: false,
          error: validationError.message,
          timestamp: validationError.timestamp
        });
      }
    };
  }

  /**
   * Batch validation for multiple schemas
   */
  public async validateBatch(validations: Array<{
    data: any;
    schema: Joi.Schema;
    name: string;
  }>): Promise<{ [key: string]: any }> {
    const results: { [key: string]: any } = {};
    const errors: string[] = [];

    for (const validation of validations) {
      try {
        results[validation.name] = await this.sanitizeAndValidate(
          validation.data, 
          validation.schema
        );
      } catch (error) {
        errors.push(`${validation.name}: ${(error as Error).message}`);
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(`Batch validation failed: ${errors.join('; ')}`);
    }

    return results;
  }
}

// Export default instance
export const validationPipe = new ValidationPipe();

// Common validation schemas
export const CommonSchemas = {
  id: Joi.object({
    id: JoiSchemas.uuid.required()
  }),

  pagination: JoiSchemas.pagination,

  createUser: Joi.object({
    email: JoiSchemas.email.required(),
    password: JoiSchemas.password.required(),
    username: JoiSchemas.username.required(),
    firstName: Joi.string().min(1).max(50).required(),
    lastName: Joi.string().min(1).max(50).required(),
    phone: JoiSchemas.phone.optional()
  }),

  updateUser: Joi.object({
    email: JoiSchemas.email.optional(),
    username: JoiSchemas.username.optional(),
    firstName: Joi.string().min(1).max(50).optional(),
    lastName: Joi.string().min(1).max(50).optional(),
    phone: JoiSchemas.phone.optional()
  }),

  login: Joi.object({
    email: JoiSchemas.email.required(),
    password: Joi.string().required()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: JoiSchemas.password.required()
  })
};
