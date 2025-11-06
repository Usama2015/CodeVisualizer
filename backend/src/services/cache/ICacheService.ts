import { AnalysisResult } from '../../../../shared/types/analysis';

/**
 * Interface for cache service implementations
 * Supports both Redis and in-memory caching with optional TTL
 */
export interface ICacheService {
  /**
   * Store analysis result with optional TTL
   * @param key - Unique key for the analysis
   * @param value - Analysis result to store
   * @param ttl - Time to live in seconds (optional)
   */
  set(key: string, value: AnalysisResult, ttl?: number): Promise<void>;

  /**
   * Retrieve analysis result by key
   * @param key - Unique key for the analysis
   * @returns Analysis result or null if not found
   */
  get(key: string): Promise<AnalysisResult | null>;

  /**
   * Delete analysis result by key
   * @param key - Unique key for the analysis
   * @returns True if deleted, false if key didn't exist
   */
  delete(key: string): Promise<boolean>;

  /**
   * Check if key exists in cache
   * @param key - Unique key to check
   * @returns True if key exists, false otherwise
   */
  has(key: string): Promise<boolean>;

  /**
   * Clear all cached data (use with caution)
   */
  clear(): Promise<void>;

  /**
   * Get cache statistics
   * @returns Basic cache statistics
   */
  getStats(): Promise<{
    connected: boolean;
    keyCount?: number;
    memoryUsage?: string;
    hitRate?: number;
  }>;

  /**
   * Close cache connection gracefully
   */
  close(): Promise<void>;
}