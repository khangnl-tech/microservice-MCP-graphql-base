import { connect, NatsConnection, JSONCodec, StringCodec } from 'nats';
import { Logger } from './logger';
import { EventPayload } from './interfaces';

export class NatsClientModule {
  private static instance: NatsClientModule;
  private connection: NatsConnection | null = null;
  private jsonCodec = JSONCodec();
  private stringCodec = StringCodec();
  private logger = Logger.getInstance();

  private constructor() {}

  public static getInstance(): NatsClientModule {
    if (!NatsClientModule.instance) {
      NatsClientModule.instance = new NatsClientModule();
    }
    return NatsClientModule.instance;
  }

  public async connect(url: string = 'nats://localhost:4222'): Promise<void> {
    try {
      this.connection = await connect({ servers: url });
      this.logger.info('Connected to NATS server', { url });
    } catch (error) {
      this.logger.error('Failed to connect to NATS server', error as Error, { url });
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
      this.logger.info('Disconnected from NATS server');
    }
  }

  public isConnected(): boolean {
    return this.connection !== null && !this.connection.isClosed();
  }

  public async publish(subject: string, data: any): Promise<void> {
    if (!this.connection) {
      throw new Error('NATS connection not established');
    }

    try {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      this.connection.publish(subject, this.stringCodec.encode(payload));
      this.logger.debug('Published message to NATS', { subject, data });
    } catch (error) {
      this.logger.error('Failed to publish message to NATS', error as Error, { subject });
      throw error;
    }
  }

  public async publishEvent(event: EventPayload): Promise<void> {
    const subject = `events.${event.eventType}`;
    await this.publish(subject, event);
  }

  public async subscribe(
    subject: string, 
    handler: (data: any) => Promise<void> | void,
    options?: { queue?: string }
  ): Promise<void> {
    if (!this.connection) {
      throw new Error('NATS connection not established');
    }

    try {
      const subscription = this.connection.subscribe(subject, options);
      
      (async () => {
        for await (const message of subscription) {
          try {
            const data = this.stringCodec.decode(message.data);
            let parsedData: any;
            
            try {
              parsedData = JSON.parse(data);
            } catch {
              parsedData = data;
            }

            await handler(parsedData);
            this.logger.debug('Processed NATS message', { subject, data: parsedData });
          } catch (error) {
            this.logger.error('Error processing NATS message', error as Error, { subject });
          }
        }
      })();

      this.logger.info('Subscribed to NATS subject', { subject, queue: options?.queue });
    } catch (error) {
      this.logger.error('Failed to subscribe to NATS subject', error as Error, { subject });
      throw error;
    }
  }

  public async subscribeToEvents(
    eventType: string,
    handler: (event: EventPayload) => Promise<void> | void,
    options?: { queue?: string }
  ): Promise<void> {
    const subject = `events.${eventType}`;
    await this.subscribe(subject, handler, options);
  }

  public async request(subject: string, data: any, timeout: number = 5000): Promise<any> {
    if (!this.connection) {
      throw new Error('NATS connection not established');
    }

    try {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      const response = await this.connection.request(
        subject, 
        this.stringCodec.encode(payload),
        { timeout }
      );

      const responseData = this.stringCodec.decode(response.data);
      
      try {
        return JSON.parse(responseData);
      } catch {
        return responseData;
      }
    } catch (error) {
      this.logger.error('Failed to make NATS request', error as Error, { subject });
      throw error;
    }
  }

  public async reply(
    subject: string,
    handler: (data: any) => Promise<any> | any,
    options?: { queue?: string }
  ): Promise<void> {
    if (!this.connection) {
      throw new Error('NATS connection not established');
    }

    try {
      const subscription = this.connection.subscribe(subject, options);
      
      (async () => {
        for await (const message of subscription) {
          try {
            const data = this.stringCodec.decode(message.data);
            let parsedData: any;
            
            try {
              parsedData = JSON.parse(data);
            } catch {
              parsedData = data;
            }

            const result = await handler(parsedData);
            const response = typeof result === 'string' ? result : JSON.stringify(result);
            
            message.respond(this.stringCodec.encode(response));
            this.logger.debug('Replied to NATS request', { subject, data: parsedData, result });
          } catch (error) {
            this.logger.error('Error handling NATS request', error as Error, { subject });
            const errorResponse = JSON.stringify({ 
              error: 'Internal server error',
              message: (error as Error).message 
            });
            message.respond(this.stringCodec.encode(errorResponse));
          }
        }
      })();

      this.logger.info('Started replying to NATS subject', { subject, queue: options?.queue });
    } catch (error) {
      this.logger.error('Failed to setup NATS reply handler', error as Error, { subject });
      throw error;
    }
  }

  // Service discovery methods
  public async registerService(serviceName: string, serviceInfo: any): Promise<void> {
    const subject = `services.register.${serviceName}`;
    await this.publish(subject, {
      ...serviceInfo,
      timestamp: new Date(),
      serviceName
    });
  }

  public async discoverService(serviceName: string): Promise<any> {
    const subject = `services.discover.${serviceName}`;
    return await this.request(subject, { serviceName });
  }

  // Health check methods
  public async publishHealthCheck(serviceName: string, health: any): Promise<void> {
    const subject = `health.${serviceName}`;
    await this.publish(subject, {
      ...health,
      timestamp: new Date(),
      serviceName
    });
  }

  public async subscribeToHealthChecks(
    serviceName: string,
    handler: (health: any) => Promise<void> | void
  ): Promise<void> {
    const subject = `health.${serviceName}`;
    await this.subscribe(subject, handler);
  }
}

// Export singleton instance
export const natsClient = NatsClientModule.getInstance();
