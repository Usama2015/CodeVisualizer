import { MemoryService } from '../services/cache/MemoryService';
import { CacheFactory } from '../services/cache/CacheFactory';
import { AnalysisResult } from '../../../shared/types/analysis';

describe('Cache Services', () => {
  describe('MemoryService', () => {
    let memoryService: MemoryService;

    beforeEach(() => {
      memoryService = new MemoryService(60); // 60 seconds TTL
    });

    afterEach(async () => {
      await memoryService.close();
    });

    test('should store and retrieve analysis results', async () => {
      const mockAnalysis: AnalysisResult = {
        id: 'test-123',
        analysis: {
          id: 'test-123',
          files: [],
          architecturePatterns: [],
          dependencies: { nodes: [], edges: [] },
          createdAt: new Date()
        },
        dependencies: { nodes: [], edges: [] },
        processingTime: 100,
        warnings: []
      };

      await memoryService.set('test-123', mockAnalysis);
      const retrieved = await memoryService.get('test-123');

      expect(retrieved).toEqual(mockAnalysis);
    });

    test('should return null for non-existent keys', async () => {
      const result = await memoryService.get('non-existent');
      expect(result).toBeNull();
    });

    test('should delete stored items', async () => {
      const mockAnalysis: AnalysisResult = {
        id: 'test-delete',
        analysis: {
          id: 'test-delete',
          files: [],
          architecturePatterns: [],
          dependencies: { nodes: [], edges: [] },
          createdAt: new Date()
        },
        dependencies: { nodes: [], edges: [] },
        processingTime: 100,
        warnings: []
      };

      await memoryService.set('test-delete', mockAnalysis);
      expect(await memoryService.has('test-delete')).toBe(true);

      const deleted = await memoryService.delete('test-delete');
      expect(deleted).toBe(true);
      expect(await memoryService.has('test-delete')).toBe(false);
    });

    test('should handle TTL expiration', async () => {
      const shortTTLService = new MemoryService(1); // 1 second TTL

      const mockAnalysis: AnalysisResult = {
        id: 'test-ttl',
        analysis: {
          id: 'test-ttl',
          files: [],
          architecturePatterns: [],
          dependencies: { nodes: [], edges: [] },
          createdAt: new Date()
        },
        dependencies: { nodes: [], edges: [] },
        processingTime: 100,
        warnings: []
      };

      await shortTTLService.set('test-ttl', mockAnalysis, 0.1); // 0.1 seconds
      expect(await shortTTLService.has('test-ttl')).toBe(true);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(await shortTTLService.has('test-ttl')).toBe(false);

      await shortTTLService.close();
    });

    test('should provide cache statistics', async () => {
      const stats = await memoryService.getStats();

      expect(stats).toHaveProperty('connected', true);
      expect(stats).toHaveProperty('keyCount');
      expect(stats).toHaveProperty('hitRate');
    });
  });

  describe('CacheFactory', () => {
    afterEach(async () => {
      await CacheFactory.close();
    });

    test('should create memory service when Redis is disabled', async () => {
      const config = {
        redis: {
          enabled: false,
          host: 'localhost',
          port: 6379,
          db: 0,
          keyPrefix: 'test:',
          defaultTTL: 3600
        },
        fallback: {
          defaultTTL: 3600
        }
      };

      const cacheService = await CacheFactory.create(config);
      expect(cacheService).toBeInstanceOf(MemoryService);

      const stats = await cacheService.getStats();
      expect(stats.connected).toBe(true);
    });

    test('should create config from environment variables', () => {
      const originalEnv = process.env;

      process.env = {
        ...originalEnv,
        REDIS_ENABLE: 'true',
        REDIS_HOST: 'test-host',
        REDIS_PORT: '6380',
        REDIS_PASSWORD: 'test-password',
        REDIS_DB: '1',
        REDIS_KEY_PREFIX: 'test-prefix:',
        REDIS_DEFAULT_TTL: '7200'
      };

      const config = CacheFactory.createConfigFromEnv();

      expect(config.redis.enabled).toBe(true);
      expect(config.redis.host).toBe('test-host');
      expect(config.redis.port).toBe(6380);
      expect(config.redis.password).toBe('test-password');
      expect(config.redis.db).toBe(1);
      expect(config.redis.keyPrefix).toBe('test-prefix:');
      expect(config.redis.defaultTTL).toBe(7200);

      process.env = originalEnv;
    });
  });
});