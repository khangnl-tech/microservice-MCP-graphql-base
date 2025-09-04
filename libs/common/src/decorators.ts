import 'reflect-metadata';

// Custom decorators for the application

/**
 * Service decorator to mark classes as services
 */
export function Service(name?: string) {
  return function (target: any) {
    Reflect.defineMetadata('service:name', name || target.name, target);
    Reflect.defineMetadata('service:type', 'service', target);
  };
}

/**
 * Controller decorator to mark classes as controllers
 */
export function Controller(path?: string) {
  return function (target: any) {
    Reflect.defineMetadata('controller:path', path || '', target);
    Reflect.defineMetadata('controller:type', 'controller', target);
  };
}

/**
 * Route decorator for HTTP methods
 */
export function Route(method: string, path: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const routes = Reflect.getMetadata('routes', target.constructor) || [];
    routes.push({
      method: method.toUpperCase(),
      path,
      handler: propertyKey,
    });
    Reflect.defineMetadata('routes', routes, target.constructor);
  };
}

/**
 * GET route decorator
 */
export function Get(path: string = '') {
  return Route('GET', path);
}

/**
 * POST route decorator
 */
export function Post(path: string = '') {
  return Route('POST', path);
}

/**
 * PUT route decorator
 */
export function Put(path: string = '') {
  return Route('PUT', path);
}

/**
 * DELETE route decorator
 */
export function Delete(path: string = '') {
  return Route('DELETE', path);
}

/**
 * PATCH route decorator
 */
export function Patch(path: string = '') {
  return Route('PATCH', path);
}

/**
 * Middleware decorator
 */
export function UseMiddleware(...middlewares: Function[]) {
  return function (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) {
    if (propertyKey) {
      // Method-level middleware
      const existingMiddlewares = Reflect.getMetadata('middlewares', target, propertyKey) || [];
      Reflect.defineMetadata('middlewares', [...existingMiddlewares, ...middlewares], target, propertyKey);
    } else {
      // Class-level middleware
      const existingMiddlewares = Reflect.getMetadata('middlewares', target) || [];
      Reflect.defineMetadata('middlewares', [...existingMiddlewares, ...middlewares], target);
    }
  };
}

/**
 * Authentication required decorator
 */
export function RequireAuth() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata('auth:required', true, target, propertyKey);
  };
}

/**
 * Role-based access control decorator
 */
export function RequireRole(...roles: string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata('auth:roles', roles, target, propertyKey);
  };
}

/**
 * Permission-based access control decorator
 */
export function RequirePermission(...permissions: string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata('auth:permissions', permissions, target, propertyKey);
  };
}

/**
 * Rate limiting decorator
 */
export function RateLimit(maxRequests: number, windowMs: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata('rateLimit', { maxRequests, windowMs }, target, propertyKey);
  };
}

/**
 * Cache decorator
 */
export function Cache(ttl: number = 300) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata('cache:ttl', ttl, target, propertyKey);
  };
}

/**
 * Validation decorator
 */
export function Validate(schema: any) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata('validation:schema', schema, target, propertyKey);
  };
}

/**
 * Event handler decorator
 */
export function EventHandler(eventType: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const handlers = Reflect.getMetadata('event:handlers', target.constructor) || [];
    handlers.push({
      eventType,
      handler: propertyKey,
    });
    Reflect.defineMetadata('event:handlers', handlers, target.constructor);
  };
}

/**
 * MCP Tool decorator
 */
export function MCPTool(name: string, description: string, inputSchema: any) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const tools = Reflect.getMetadata('mcp:tools', target.constructor) || [];
    tools.push({
      name,
      description,
      inputSchema,
      handler: propertyKey,
    });
    Reflect.defineMetadata('mcp:tools', tools, target.constructor);
  };
}

/**
 * MCP Resource decorator
 */
export function MCPResource(uri: string, name: string, description?: string, mimeType?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const resources = Reflect.getMetadata('mcp:resources', target.constructor) || [];
    resources.push({
      uri,
      name,
      description,
      mimeType,
      handler: propertyKey,
    });
    Reflect.defineMetadata('mcp:resources', resources, target.constructor);
  };
}

/**
 * Async retry decorator
 */
export function Retry(maxRetries: number = 3, delay: number = 1000) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let lastError: Error;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error as Error;
          
          if (attempt === maxRetries) {
            throw lastError;
          }

          const retryDelay = delay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }

      throw lastError!;
    };

    return descriptor;
  };
}

/**
 * Timeout decorator
 */
export function Timeout(ms: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return Promise.race([
        originalMethod.apply(this, args),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Method ${propertyKey} timed out after ${ms}ms`)), ms)
        )
      ]);
    };

    return descriptor;
  };
}

/**
 * Log execution time decorator
 */
export function LogExecutionTime() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = Date.now();
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - start;
        console.log(`${target.constructor.name}.${propertyKey} executed in ${duration}ms`);
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        console.log(`${target.constructor.name}.${propertyKey} failed after ${duration}ms`);
        throw error;
      }
    };

    return descriptor;
  };
}
