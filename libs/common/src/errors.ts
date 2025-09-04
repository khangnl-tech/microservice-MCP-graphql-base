// Custom error classes
export class BaseError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly correlationId?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    correlationId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.correlationId = correlationId;

    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, correlationId?: string) {
    super(message, 400, true, correlationId);
  }
}

export class AuthenticationError extends BaseError {
  constructor(message: string = 'Authentication failed', correlationId?: string) {
    super(message, 401, true, correlationId);
  }
}

export class AuthorizationError extends BaseError {
  constructor(message: string = 'Access denied', correlationId?: string) {
    super(message, 403, true, correlationId);
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string = 'Resource not found', correlationId?: string) {
    super(message, 404, true, correlationId);
  }
}

export class ConflictError extends BaseError {
  constructor(message: string = 'Resource conflict', correlationId?: string) {
    super(message, 409, true, correlationId);
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string, correlationId?: string) {
    super(message, 500, true, correlationId);
  }
}

export class ExternalServiceError extends BaseError {
  public readonly service: string;

  constructor(service: string, message: string, correlationId?: string) {
    super(`External service error (${service}): ${message}`, 502, true, correlationId);
    this.service = service;
  }
}

export class RateLimitError extends BaseError {
  constructor(message: string = 'Rate limit exceeded', correlationId?: string) {
    super(message, 429, true, correlationId);
  }
}

export class MCPError extends BaseError {
  public readonly code: number;

  constructor(code: number, message: string, correlationId?: string) {
    super(message, 500, true, correlationId);
    this.code = code;
  }
}

// Error handler utility
export class ErrorHandler {
  public static handle(error: Error): {
    statusCode: number;
    message: string;
    isOperational: boolean;
    timestamp: Date;
    correlationId?: string;
  } {
    if (error instanceof BaseError) {
      return {
        statusCode: error.statusCode,
        message: error.message,
        isOperational: error.isOperational,
        timestamp: error.timestamp,
        correlationId: error.correlationId,
      };
    }

    // Handle unknown errors
    return {
      statusCode: 500,
      message: 'Internal server error',
      isOperational: false,
      timestamp: new Date(),
    };
  }

  public static isOperationalError(error: Error): boolean {
    if (error instanceof BaseError) {
      return error.isOperational;
    }
    return false;
  }
}
