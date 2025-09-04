import { IsEmail, IsString, IsNumber, IsOptional, MinLength, MaxLength, IsEnum, IsArray, IsBoolean, IsUUID, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import * as Joi from 'joi';

// Class validator decorators for DTOs
export class BaseValidator {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsDateString()
  createdAt?: string;

  @IsOptional()
  @IsDateString()
  updatedAt?: string;
}

export class PaginationValidator {
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

// Joi schemas for validation
export const JoiSchemas = {
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  username: Joi.string().min(3).max(30).required(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
  uuid: Joi.string().uuid().required(),
  
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  aiRequest: Joi.object({
    model: Joi.string().required(),
    prompt: Joi.string().required(),
    parameters: Joi.object().optional(),
    userId: Joi.string().uuid().optional(),
    sessionId: Joi.string().optional()
  }),

  mediaFile: Joi.object({
    filename: Joi.string().required(),
    originalName: Joi.string().required(),
    mimeType: Joi.string().required(),
    size: Joi.number().integer().min(0).required(),
    path: Joi.string().required(),
    userId: Joi.string().uuid().optional()
  }),

  notification: Joi.object({
    type: Joi.string().valid('email', 'push', 'sms').required(),
    recipient: Joi.string().required(),
    subject: Joi.string().optional(),
    content: Joi.string().required(),
    template: Joi.string().optional(),
    data: Joi.object().optional()
  })
};

// Validation utility functions
export class ValidationUtils {
  /**
   * Validate data against Joi schema
   */
  static async validateWithJoi<T>(data: any, schema: Joi.Schema): Promise<T> {
    const { error, value } = schema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      throw new Error(`Validation error: ${errorMessage}`);
    }
    
    return value;
  }

  /**
   * Sanitize input data
   */
  static sanitizeInput(data: any): any {
    if (typeof data === 'string') {
      return data.trim().replace(/[<>\"'&]/g, (match) => {
        const escapeMap: { [key: string]: string } = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return escapeMap[match];
      });
    }
    
    if (Array.isArray(data)) {
      return data.map(item => ValidationUtils.sanitizeInput(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = ValidationUtils.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return data;
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  static isStrongPassword(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
  }

  /**
   * Validate phone number format
   */
  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Validate UUID format
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate URL format
   */
  static isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate file type
   */
  static isValidFileType(filename: string, allowedTypes: string[]): boolean {
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension ? allowedTypes.includes(extension) : false;
  }

  /**
   * Validate file size
   */
  static isValidFileSize(size: number, maxSizeInBytes: number): boolean {
    return size <= maxSizeInBytes;
  }
}
