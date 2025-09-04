import { v4 as uuidv4 } from 'uuid';
import * as _ from 'lodash';
import * as moment from 'moment';

// Utility functions
export class Utils {
  /**
   * Generate a unique correlation ID
   */
  static generateCorrelationId(): string {
    return uuidv4();
  }

  /**
   * Generate a unique request ID
   */
  static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep for specified milliseconds
   */
  static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Deep clone an object
   */
  static deepClone<T>(obj: T): T {
    return _.cloneDeep(obj);
  }

  /**
   * Check if object is empty
   */
  static isEmpty(obj: any): boolean {
    return _.isEmpty(obj);
  }

  /**
   * Merge objects deeply
   */
  static merge<T>(...objects: Partial<T>[]): T {
    return _.merge({}, ...objects);
  }

  /**
   * Pick specific properties from object
   */
  static pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    return _.pick(obj, keys);
  }

  /**
   * Omit specific properties from object
   */
  static omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    return _.omit(obj, keys);
  }

  /**
   * Format date to ISO string
   */
  static formatDate(date: Date): string {
    return moment(date).toISOString();
  }

  /**
   * Parse date from string
   */
  static parseDate(dateString: string): Date {
    return moment(dateString).toDate();
  }

  /**
   * Get relative time (e.g., "2 hours ago")
   */
  static getRelativeTime(date: Date): string {
    return moment(date).fromNow();
  }

  /**
   * Sanitize string for safe usage
   */
  static sanitizeString(str: string): string {
    return str.replace(/[<>\"'&]/g, (match) => {
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

  /**
   * Generate random string
   */
  static generateRandomString(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Convert bytes to human readable format
   */
  static formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format
   */
  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Hash password or sensitive data
   */
  static async hashData(data: string): Promise<string> {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate secure random token
   */
  static async generateSecureToken(length: number = 32): Promise<string> {
    const crypto = await import('crypto');
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Debounce function
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    return _.debounce(func, wait);
  }

  /**
   * Throttle function
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => ReturnType<T> | undefined {
    return _.throttle(func, wait);
  }

  /**
   * Convert object to query string
   */
  static objectToQueryString(obj: Record<string, any>): string {
    const params = new URLSearchParams();
    
    Object.entries(obj).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.append(key, String(value));
      }
    });
    
    return params.toString();
  }

  /**
   * Parse query string to object
   */
  static queryStringToObject(queryString: string): Record<string, string> {
    const params = new URLSearchParams(queryString);
    const result: Record<string, string> = {};
    
    params.forEach((value, key) => {
      result[key] = value;
    });
    
    return result;
  }

  /**
   * Chunk array into smaller arrays
   */
  static chunk<T>(array: T[], size: number): T[][] {
    return _.chunk(array, size);
  }

  /**
   * Remove duplicates from array
   */
  static unique<T>(array: T[]): T[] {
    return _.uniq(array);
  }

  /**
   * Flatten nested array
   */
  static flatten<T>(array: (T | T[])[]): T[] {
    return _.flatten(array);
  }
}
