import { ICacheService } from './ICacheService';
import { RedisService, RedisConfig } from './RedisService';
import { MemoryService } from './MemoryService';

export interface CacheFactoryConfig {
  redis: {
    enabled: boolean;
    host: string;
    port: number;
    password?: string;
    db: number;
    keyPrefix: string;
    defaultTTL: number;
  };
  fallback: {
    defaultTTL: number;
  };
}

/**
 * Cache factory that creates appropriate cache service based on configuration
 * Handles Redis connection testing and fallback to in-memory cache
 */
export class CacheFactory {
  private static instance: ICacheService | null = null;
  private static config: CacheFactoryConfig | null = null;

  /**
   * Create or get singleton cache service instance
   * @param config Cache configuration
   * @returns Promise that resolves to cache service instance
   */
  static async create(config: CacheFactoryConfig): Promise<ICacheService> {
    // Return existing instance if available and config hasn't changed
    if (this.instance && this.configEquals(config)) {
      return this.instance;
    }

    // Close existing instance if config changed
    if (this.instance) {
      await this.instance.close();
      this.instance = null;
    }

    this.config = config;

    // Try Redis first if enabled
    if (config.redis.enabled) {
      try {
        const redisConfig: RedisConfig = {
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
          db: config.redis.db,
          keyPrefix: config.redis.keyPrefix,
          defaultTTL: config.redis.defaultTTL,
          lazyConnect: true, // Don't connect immediately
          maxRetriesPerRequest: 2 // Limit retries for faster fallback
        };

        const redisService = new RedisService(redisConfig);

        // Test connection with timeout
        const connectionTest = await Promise.race([
          redisService.testConnection(),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)) // 5 second timeout
        ]);

        if (connectionTest) {
          console.log('Cache: Using Redis service');
          this.instance = redisService;
          return this.instance;
        } else {
          console.warn('Cache: Redis connection test failed, falling back to memory cache');
          await redisService.close(); // Clean up failed connection
        }
      } catch (error) {
        console.error('Cache: Failed to initialize Redis service:', error);
        console.log('Cache: Falling back to memory cache');
      }
    }

    // Fall back to memory cache
    console.log('Cache: Using in-memory service');
    this.instance = new MemoryService(config.fallback.defaultTTL);
    return this.instance;
  }

  /**
   * Get current cache service instance
   * @returns Current cache service or null if not initialized
   */
  static getInstance(): ICacheService | null {
    return this.instance;
  }

  /**
   * Force recreation of cache service (useful for testing)
   */
  static async recreate(): Promise<void> {
    if (this.instance) {
      await this.instance.close();
      this.instance = null;
    }

    if (this.config) {
      this.instance = await this.create(this.config);
    }
  }

  /**
   * Close current cache service
   */
  static async close(): Promise<void> {
    if (this.instance) {
      await this.instance.close();
      this.instance = null;
      this.config = null;
    }
  }

  /**
   * Check if cache configuration has changed
   * @param newConfig New configuration to compare
   * @returns True if configuration is the same
   */
  private static configEquals(newConfig: CacheFactoryConfig): boolean {
    if (!this.config) return false;

    return JSON.stringify(this.config) === JSON.stringify(newConfig);
  }

  /**
   * Create cache configuration from environment variables
   * @returns Cache configuration object
   */
  static createConfigFromEnv(): CacheFactoryConfig {
    return {
      redis: {
        enabled: process.env.REDIS_ENABLE === 'true',
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0'),
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'codevisualizer:',
        defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '3600')
      },
      fallback: {
        defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '3600')
      }
    };
  }
}