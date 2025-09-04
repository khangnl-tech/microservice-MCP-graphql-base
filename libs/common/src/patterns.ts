// Common design patterns and utilities

/**
 * Singleton pattern implementation
 */
export abstract class Singleton {
  private static instances: Map<any, any> = new Map();

  public static getInstance<T extends Singleton>(this: new () => T): T {
    if (!Singleton.instances.has(this)) {
      Singleton.instances.set(this, new this());
    }
    return Singleton.instances.get(this);
  }
}

/**
 * Observer pattern implementation
 */
export interface Observer<T = any> {
  update(data: T): void;
}

export class Subject<T = any> {
  private observers: Observer<T>[] = [];

  public subscribe(observer: Observer<T>): void {
    this.observers.push(observer);
  }

  public unsubscribe(observer: Observer<T>): void {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  public notify(data: T): void {
    this.observers.forEach(observer => observer.update(data));
  }
}

/**
 * Command pattern implementation
 */
export interface Command {
  execute(): Promise<any> | any;
  undo?(): Promise<any> | any;
}

export class CommandInvoker {
  private history: Command[] = [];
  private currentIndex: number = -1;

  public async execute(command: Command): Promise<any> {
    const result = await command.execute();
    
    // Remove any commands after current index (for redo functionality)
    this.history = this.history.slice(0, this.currentIndex + 1);
    
    // Add new command to history
    this.history.push(command);
    this.currentIndex++;
    
    return result;
  }

  public async undo(): Promise<any> {
    if (this.currentIndex >= 0) {
      const command = this.history[this.currentIndex];
      if (command.undo) {
        const result = await command.undo();
        this.currentIndex--;
        return result;
      }
    }
    throw new Error('Cannot undo: no undoable command available');
  }

  public async redo(): Promise<any> {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      const command = this.history[this.currentIndex];
      return await command.execute();
    }
    throw new Error('Cannot redo: no redoable command available');
  }

  public canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  public canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  public clearHistory(): void {
    this.history = [];
    this.currentIndex = -1;
  }
}

/**
 * Strategy pattern implementation
 */
export interface Strategy<T = any, R = any> {
  execute(data: T): Promise<R> | R;
}

export class Context<T = any, R = any> {
  private strategy: Strategy<T, R>;

  constructor(strategy: Strategy<T, R>) {
    this.strategy = strategy;
  }

  public setStrategy(strategy: Strategy<T, R>): void {
    this.strategy = strategy;
  }

  public async executeStrategy(data: T): Promise<R> {
    return await this.strategy.execute(data);
  }
}

/**
 * Factory pattern implementation
 */
export interface Factory<T> {
  create(...args: any[]): T;
}

export abstract class AbstractFactory<T> implements Factory<T> {
  public abstract create(...args: any[]): T;

  public createMultiple(count: number, ...args: any[]): T[] {
    const items: T[] = [];
    for (let i = 0; i < count; i++) {
      items.push(this.create(...args));
    }
    return items;
  }
}

/**
 * Builder pattern implementation
 */
export abstract class Builder<T> {
  protected product: Partial<T> = {};

  public abstract build(): T;

  public reset(): this {
    this.product = {};
    return this;
  }
}

/**
 * Repository pattern implementation
 */
export interface IRepository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(filter?: any): Promise<T[]>;
  create(entity: Omit<T, 'id'>): Promise<T>;
  update(id: ID, entity: Partial<T>): Promise<T | null>;
  delete(id: ID): Promise<boolean>;
  exists(id: ID): Promise<boolean>;
  count(filter?: any): Promise<number>;
}

export abstract class BaseRepository<T, ID = string> implements IRepository<T, ID> {
  public abstract findById(id: ID): Promise<T | null>;
  public abstract findAll(filter?: any): Promise<T[]>;
  public abstract create(entity: Omit<T, 'id'>): Promise<T>;
  public abstract update(id: ID, entity: Partial<T>): Promise<T | null>;
  public abstract delete(id: ID): Promise<boolean>;

  public async exists(id: ID): Promise<boolean> {
    const entity = await this.findById(id);
    return entity !== null;
  }

  public async count(filter?: any): Promise<number> {
    const entities = await this.findAll(filter);
    return entities.length;
  }
}

/**
 * Unit of Work pattern implementation
 */
export interface UnitOfWork {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  isActive(): boolean;
}

export abstract class BaseUnitOfWork implements UnitOfWork {
  protected isTransactionActive: boolean = false;

  public abstract begin(): Promise<void>;
  public abstract commit(): Promise<void>;
  public abstract rollback(): Promise<void>;

  public isActive(): boolean {
    return this.isTransactionActive;
  }

  protected setActive(active: boolean): void {
    this.isTransactionActive = active;
  }
}

/**
 * Specification pattern implementation
 */
export interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
  and(other: Specification<T>): Specification<T>;
  or(other: Specification<T>): Specification<T>;
  not(): Specification<T>;
}

export abstract class BaseSpecification<T> implements Specification<T> {
  public abstract isSatisfiedBy(candidate: T): boolean;

  public and(other: Specification<T>): Specification<T> {
    return new AndSpecification(this, other);
  }

  public or(other: Specification<T>): Specification<T> {
    return new OrSpecification(this, other);
  }

  public not(): Specification<T> {
    return new NotSpecification(this);
  }
}

class AndSpecification<T> extends BaseSpecification<T> {
  constructor(
    private left: Specification<T>,
    private right: Specification<T>
  ) {
    super();
  }

  public isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
  }
}

class OrSpecification<T> extends BaseSpecification<T> {
  constructor(
    private left: Specification<T>,
    private right: Specification<T>
  ) {
    super();
  }

  public isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
  }
}

class NotSpecification<T> extends BaseSpecification<T> {
  constructor(private specification: Specification<T>) {
    super();
  }

  public isSatisfiedBy(candidate: T): boolean {
    return !this.specification.isSatisfiedBy(candidate);
  }
}

/**
 * Event Bus pattern implementation
 */
export type EventHandler<T = any> = (event: T) => Promise<void> | void;

export class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  public subscribe<T>(eventType: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  public unsubscribe<T>(eventType: string, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  public async publish<T>(eventType: string, event: T): Promise<void> {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      await Promise.all(handlers.map(handler => handler(event)));
    }
  }

  public clear(): void {
    this.handlers.clear();
  }

  public getHandlerCount(eventType: string): number {
    return this.handlers.get(eventType)?.length || 0;
  }
}

/**
 * Circuit Breaker pattern implementation
 */
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;

  constructor(private options: CircuitBreakerOptions) {}

  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.options.recoveryTimeout) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.options.failureThreshold) {
        this.state = CircuitBreakerState.CLOSED;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
    }
  }

  public getState(): CircuitBreakerState {
    return this.state;
  }

  public getFailureCount(): number {
    return this.failureCount;
  }

  public reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.successCount = 0;
  }
}
