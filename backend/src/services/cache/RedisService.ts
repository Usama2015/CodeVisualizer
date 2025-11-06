import Redis from 'ioredis';
import { ICacheService } from './ICacheService';
import { AnalysisResult } from '../../../../shared/types/analysis';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  defaultTTL: number;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
  lazyConnect?: boolean;
}

/**
 * Redis-based cache service implementation
 * Provides persistent storage for analysis results with automatic expiration
 */
export class RedisService implements ICacheService {
  private client: Redis;
  private config: RedisConfig;
  private connected: boolean = false;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0
  };

  constructor(config: RedisConfig) {
    this.config = config;
    this.client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password || undefined,
      db: config.db,
      keyPrefix: config.keyPrefix,
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
      enableReadyCheck: config.enableReadyCheck !== false,
      lazyConnect: config.lazyConnect !== false
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      console.log('Redis: Connected to server');
      this.connected = true;
    });

    this.client.on('ready', () => {
      console.log('Redis: Server is ready to receive commands');
    });

    this.client.on('error', (error) => {
      console.error('Redis: Connection error:', error.message);
      this.connected = false;
    });

    this.client.on('close', () => {
      console.log('Redis: Connection closed');
      this.connected = false;
    });

    this.client.on('reconnecting', () => {
      console.log('Redis: Reconnecting...');
    });
  }

  private getKey(key: string): string {
    // The keyPrefix is automatically handled by ioredis
    return key;
  }

  async set(key: string, value: AnalysisResult, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const actualTTL = ttl || this.config.defaultTTL;

      if (actualTTL > 0) {
        await this.client.setex(this.getKey(key), actualTTL, serialized);
      } else {
        await this.client.set(this.getKey(key), serialized);
      }

      this.stats.sets++;
    } catch (error) {
      console.error('Redis: Error setting value:', error);
      throw new Error(`Failed to set cache value: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async get(key: string): Promise<AnalysisResult | null> {
    try {
      const value = await this.client.get(this.getKey(key));

      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return JSON.parse(value) as AnalysisResult;
    } catch (error) {
      console.error('Redis: Error getting value:', error);
      this.stats.misses++;
      return null;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(this.getKey(key));
      if (result > 0) {
        this.stats.deletes++;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Redis: Error deleting value:', error);
      return false;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const exists = await this.client.exists(this.getKey(key));
      return exists === 1;
    } catch (error) {
      console.error('Redis: Error checking key existence:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      // Only clear keys with our prefix to avoid affecting other applications
      const pattern = this.config.keyPrefix + '*';
      const keys = await this.client.keys(pattern);

      if (keys.length > 0) {
        // Remove the prefix from keys since Redis client automatically adds it
        const unprefixedKeys = keys.map(key => key.replace(this.config.keyPrefix, ''));
        await this.client.del(...unprefixedKeys);
      }
    } catch (error) {
      console.error('Redis: Error clearing cache:', error);
      throw new Error(`Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getStats(): Promise<{
    connected: boolean;
    keyCount?: number;
    memoryUsage?: string;
    hitRate?: number;
  }> {
    const stats: any = {
      connected: this.connected
    };

    if (!this.connected) {
      return stats;
    }

    try {
      // Get key count for our prefix
      const pattern = this.config.keyPrefix + '*';
      const keys = await this.client.keys(pattern);
      stats.keyCount = keys.length;

      // Get memory usage
      const info = await this.client.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      if (memoryMatch) {
        stats.memoryUsage = memoryMatch[1].trim();
      }

      // Calculate hit rate
      const totalRequests = this.stats.hits + this.stats.misses;
      if (totalRequests > 0) {
        stats.hitRate = (this.stats.hits / totalRequests) * 100;
      }

    } catch (error) {
      console.error('Redis: Error getting stats:', error);
    }

    return stats;
  }

  async close(): Promise<void> {
    try {
      await this.client.quit();
      console.log('Redis: Connection closed gracefully');
    } catch (error) {
      console.error('Redis: Error closing connection:', error);
      this.client.disconnect();
    }
  }

  /**
   * Test connection to Redis server
   * @returns Promise that resolves to true if connection is successful
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      console.error('Redis: Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get internal stats for monitoring
   */
  getInternalStats() {
    return { ...this.stats };
  }
}