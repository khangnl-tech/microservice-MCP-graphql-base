import * as winston from 'winston';
import { LogEntry } from './interfaces';

// Logger configuration
export class Logger {
  private static instance: winston.Logger;

  private static createLogger(): winston.Logger {
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      defaultMeta: { service: process.env.SERVICE_NAME || 'unknown' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({ 
          filename: 'logs/error.log', 
          level: 'error' 
        }),
        new winston.transports.File({ 
          filename: 'logs/combined.log' 
        })
      ]
    });
  }

  public static getInstance(): winston.Logger {
    if (!Logger.instance) {
      Logger.instance = Logger.createLogger();
    }
    return Logger.instance;
  }

  public static info(message: string, meta?: any): void {
    Logger.getInstance().info(message, meta);
  }

  public static error(message: string, error?: Error, meta?: any): void {
    Logger.getInstance().error(message, { error: error?.stack, ...meta });
  }

  public static warn(message: string, meta?: any): void {
    Logger.getInstance().warn(message, meta);
  }

  public static debug(message: string, meta?: any): void {
    Logger.getInstance().debug(message, meta);
  }

  public static logEntry(entry: LogEntry): void {
    const logger = Logger.getInstance();
    logger.log(entry.level, entry.message, {
      timestamp: entry.timestamp,
      service: entry.service,
      correlationId: entry.correlationId,
      metadata: entry.metadata
    });
  }
}

// Export default instance
export const logger = Logger.getInstance();
