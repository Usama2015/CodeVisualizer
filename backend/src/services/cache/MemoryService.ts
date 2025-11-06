import { ICacheService } from './ICacheService';
import { AnalysisResult } from '../../../../shared/types/analysis';

interface CacheItem {
  value: AnalysisResult;
  expiresAt?: number;
}

/**
 * In-memory cache service implementation
 * Used as fallback when Redis is unavailable
 * Data is lost when server restarts
 */
export class MemoryService implements ICacheService {
  private cache = new Map<string, CacheItem>();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0
  };
  private cleanupInterval: NodeJS.Timeout;

  constructor(private defaultTTL: number = 3600) {
    // Clean up expired items every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000);
  }

  private cleanupExpired(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt && item.expiresAt <= now) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      console.log(`Memory Cache: Cleaned up ${expiredCount} expired items`);
    }
  }

  async set(key: string, value: AnalysisResult, ttl?: number): Promise<void> {
    const actualTTL = ttl || this.defaultTTL;
    const item: CacheItem = {
      value,
      expiresAt: actualTTL > 0 ? Date.now() + (actualTTL * 1000) : undefined
    };

    this.cache.set(key, item);
    this.stats.sets++;
  }

  async get(key: string): Promise<AnalysisResult | null> {
    const item = this.cache.get(key);

    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Check if item has expired
    if (item.expiresAt && item.expiresAt <= Date.now()) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return item.value;
  }

  async delete(key: string): Promise<boolean> {
    const existed = this.cache.has(key);
    if (existed) {
      this.cache.delete(key);
      this.stats.deletes++;
      return true;
    }
    return false;
  }

  async has(key: string): Promise<boolean> {
    const item = this.cache.get(key);

    if (!item) {
      return false;
    }

    // Check if item has expired
    if (item.expiresAt && item.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    console.log('Memory Cache: All items cleared');
  }

  async getStats(): Promise<{
    connected: boolean;
    keyCount?: number;
    memoryUsage?: string;
    hitRate?: number;
  }> {
    // Clean up expired items before counting
    this.cleanupExpired();

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    // Estimate memory usage (very rough approximation)
    const itemCount = this.cache.size;
    const estimatedMemoryMB = Math.round((itemCount * 50) / 1024); // Rough estimate: 50KB per item

    return {
      connected: true,
      keyCount: itemCount,
      memoryUsage: `~${estimatedMemoryMB}MB`,
      hitRate
    };
  }

  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
    console.log('Memory Cache: Service closed');
  }

  /**
   * Get internal stats for monitoring
   */
  getInternalStats() {
    return { ...this.stats };
  }
}