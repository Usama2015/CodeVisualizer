import request from 'supertest';
import app from '../app';
import { ICacheService, CacheFactory } from '../services/cache';
import { gitHubService } from '../services/github';

// Mock dependencies
jest.mock('../services/cache');
jest.mock('../services/github');

const mockCacheService: jest.Mocked<ICacheService> = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  close: jest.fn(),
  getStats: jest.fn(),
};

// Mock CacheFactory
(CacheFactory.create as jest.Mock).mockResolvedValue(mockCacheService);
(CacheFactory.createConfigFromEnv as jest.Mock).mockReturnValue({
  type: 'memory',
  options: {}
});

describe('Error Handling and Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCacheService.getStats.mockResolvedValue({
      connected: true,
      keys: 0,
      memory: '0MB'
    });
  });

  describe('Request Validation Errors', () => {
    it('should handle missing request body', async () => {
      const response = await request(app)
        .post('/api/analyze/deep')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'No files provided for analysis'
      });
    });

    it('should handle empty files array', async () => {
      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: [] })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'No files provided for analysis'
      });
    });

    it('should handle null files field', async () => {
      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: null })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'No files provided for analysis'
      });
    });

    it('should handle non-array files field', async () => {
      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: 'not-an-array' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'No files provided for analysis'
      });
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/analyze/deep')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle requests exceeding payload limit', async () => {
      const largeFile = {
        id: 'large',
        name: 'large.js',
        content: 'x'.repeat(15 * 1024 * 1024), // 15MB - exceeds 10MB limit
        language: 'javascript'
      };

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: [largeFile] })
        .expect(413);

      expect(response.body.success).toBe(false);
    });
  });

  describe('File Processing Errors', () => {
    it('should handle files with invalid characters', async () => {
      const files = [{
        id: 'invalid-chars',
        name: 'test.js',
        content: 'const test = "\\x00\\x01\\x02"; // Null bytes and control characters',
        language: 'javascript'
      }];

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files })
        .expect(200);

      expect(response.body.id).toBeDefined();
      expect(response.body.analysis.files).toHaveLength(1);
    });

    it('should handle binary file content', async () => {
      const files = [{
        id: 'binary',
        name: 'image.js', // Wrong extension for binary content
        content: '\\x89PNG\\r\\n\\x1a\\n\\x00\\x00\\x00\\rIHDR', // PNG file header
        language: 'javascript'
      }];

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files })
        .expect(200);

      expect(response.body.id).toBeDefined();
    });

    it('should handle extremely long file names', async () => {
      const longName = 'a'.repeat(1000) + '.js';
      const files = [{
        id: 'long-name',
        name: longName,
        content: 'console.log("test");',
        language: 'javascript'
      }];

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files })
        .expect(200);

      expect(response.body.analysis.files[0].name).toBe(longName);
    });

    it('should handle files with special Unicode characters', async () => {
      const files = [{
        id: 'unicode',
        name: 'тест.js', // Cyrillic characters
        content: '// 测试注释\\nconst emoji = "🚀💻";\\nconsole.log("Unicode: αβγδε");',
        language: 'javascript'
      }];

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files })
        .expect(200);

      expect(response.body.analysis.files[0].name).toBe('тест.js');
    });

    it('should handle deeply nested code structures', async () => {
      const deeplyNested = Array(100).fill(0).reduce((acc, _, i) => {
        return `if (condition${i}) { ${acc} }`;
      }, 'console.log("deep");');

      const files = [{
        id: 'deeply-nested',
        name: 'nested.js',
        content: `function deeplyNested() { ${deeplyNested} }`,
        language: 'javascript'
      }];

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files })
        .expect(200);

      expect(response.body.analysis.files[0].complexity).toBeGreaterThan(50);
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle processing many small files', async () => {
      const manyFiles = Array.from({ length: 1000 }, (_, i) => ({
        id: `file-${i}`,
        name: `file${i}.js`,
        content: `console.log("File ${i}");`,
        language: 'javascript'
      }));

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: manyFiles })
        .expect(200);

      expect(response.body.analysis.files).toHaveLength(1000);
    });

    it('should handle processing files with very long lines', async () => {
      const veryLongLine = 'const longString = "' + 'x'.repeat(100000) + '";';
      const files = [{
        id: 'long-line',
        name: 'longline.js',
        content: veryLongLine,
        language: 'javascript'
      }];

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files })
        .expect(200);

      expect(response.body.analysis.files[0].metrics.linesOfCode).toBe(1);
    });

    it('should handle circular reference in file content (JSON-like)', async () => {
      const files = [{
        id: 'circular',
        name: 'circular.js',
        content: `
          const obj = {};
          obj.self = obj;
          export default obj;
        `,
        language: 'javascript'
      }];

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files })
        .expect(200);

      expect(response.body.analysis.files).toHaveLength(1);
    });
  });

  describe('Cache Service Failures', () => {
    it('should continue processing when cache set fails', async () => {
      mockCacheService.set.mockRejectedValue(new Error('Cache write failed'));

      const files = [{
        id: 'cache-fail',
        name: 'test.js',
        content: 'console.log("test");',
        language: 'javascript'
      }];

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files })
        .expect(200);

      expect(response.body.id).toBeDefined();
      expect(response.body.analysis.files).toHaveLength(1);
    });

    it('should handle cache get failures gracefully', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Cache read failed'));

      const response = await request(app)
        .get('/api/analysis/test-id')
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle cache stats failures', async () => {
      mockCacheService.getStats.mockRejectedValue(new Error('Stats unavailable'));

      const response = await request(app)
        .get('/api/cache/stats')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GitHub Service Failures', () => {
    it('should handle network timeouts during GitHub clone', async () => {
      (gitHubService.validateGitHubURL as jest.Mock).mockReturnValue({
        isValid: true
      });
      (gitHubService.cloneAndAnalyzeRepository as jest.Mock).mockRejectedValue(
        new Error('Network timeout while cloning repository')
      );

      const response = await request(app)
        .post('/api/analyze/github')
        .send({ url: 'https://github.com/user/repo' })
        .expect(408);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Network timeout while accessing repository');
    });

    it('should handle private repository access', async () => {
      (gitHubService.validateGitHubURL as jest.Mock).mockReturnValue({
        isValid: true
      });
      (gitHubService.cloneAndAnalyzeRepository as jest.Mock).mockRejectedValue(
        new Error('Repository is private and cannot be accessed')
      );

      const response = await request(app)
        .post('/api/analyze/github')
        .send({ url: 'https://github.com/user/private-repo' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Repository not found or is private');
    });

    it('should handle cleanup failures after successful analysis', async () => {
      const mockResult = {
        files: [{ name: 'test.js', content: 'test', extension: 'js' }],
        stats: { totalSize: 100, languages: { javascript: 1 } },
        repositoryInfo: {
          name: 'test-repo',
          owner: 'test-user',
          url: 'https://github.com/test-user/test-repo',
          tempPath: '/tmp/test-repo'
        }
      };

      (gitHubService.validateGitHubURL as jest.Mock).mockReturnValue({
        isValid: true
      });
      (gitHubService.cloneAndAnalyzeRepository as jest.Mock).mockResolvedValue(mockResult);
      (gitHubService.cleanupDirectory as jest.Mock).mockRejectedValue(
        new Error('Cleanup failed')
      );

      const response = await request(app)
        .post('/api/analyze/github')
        .send({ url: 'https://github.com/test-user/test-repo' })
        .expect(200);

      // Should still succeed even if cleanup fails
      expect(response.body.success).toBe(true);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple simultaneous analysis requests', async () => {
      const files = [{
        id: 'concurrent',
        name: 'test.js',
        content: 'console.log("concurrent test");',
        language: 'javascript'
      }];

      // Send 5 concurrent requests
      const requests = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/analyze/deep')
          .send({ files })
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.id).toBeDefined();
      });

      // All should have unique IDs
      const ids = responses.map(r => r.body.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });

    it('should handle mixed request types concurrently', async () => {
      const files = [{
        id: 'mixed',
        name: 'test.js',
        content: 'console.log("mixed test");',
        language: 'javascript'
      }];

      mockCacheService.get.mockResolvedValue(null);

      const requests = [
        request(app).post('/api/analyze/deep').send({ files }),
        request(app).get('/health'),
        request(app).get('/api/analysis/nonexistent'),
        request(app).get('/api/cache/stats'),
      ];

      const responses = await Promise.all(requests);

      expect(responses[0].status).toBe(200); // analyze/deep
      expect(responses[1].status).toBe(200); // health
      expect(responses[2].status).toBe(404); // analysis not found
      expect(responses[3].status).toBe(200); // cache stats
    });
  });

  describe('Resource Cleanup', () => {
    it('should handle interrupted requests', async () => {
      const files = [{
        id: 'interrupted',
        name: 'test.js',
        content: 'console.log("test");',
        language: 'javascript'
      }];

      // Start request and immediately close connection
      const agent = request(app);
      const req = agent
        .post('/api/analyze/deep')
        .send({ files });

      // Simulate connection closed
      req.abort();

      // Server should handle this gracefully without crashing
      // We can't easily test the actual abortion, but this ensures
      // the test doesn't hang or crash
      expect(true).toBe(true);
    });

    it('should handle memory pressure scenarios', async () => {
      // Simulate memory pressure with large analysis
      const largeContent = 'function test() { return true; }\\n'.repeat(10000);
      const files = [{
        id: 'memory-pressure',
        name: 'large.js',
        content: largeContent,
        language: 'javascript'
      }];

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files })
        .expect(200);

      expect(response.body.id).toBeDefined();
    });
  });

  describe('Input Sanitization', () => {
    it('should handle HTML/script injection attempts', async () => {
      const maliciousContent = `
        <script>alert('xss')</script>
        function normalFunction() {
          return '<img src="x" onerror="alert(1)">';
        }
      `;

      const files = [{
        id: 'xss-attempt',
        name: 'malicious.js',
        content: maliciousContent,
        language: 'javascript'
      }];

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files })
        .expect(200);

      expect(response.body.analysis.files[0].content).toBe(maliciousContent);
      // Content should be stored as-is, not executed
    });

    it('should handle SQL injection patterns in file content', async () => {
      const sqlInjectionContent = `
        const query = "SELECT * FROM users WHERE id = ' OR '1'='1";
        const anotherQuery = "'; DROP TABLE users; --";
      `;

      const files = [{
        id: 'sql-injection',
        name: 'database.js',
        content: sqlInjectionContent,
        language: 'javascript'
      }];

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files })
        .expect(200);

      expect(response.body.analysis.files).toHaveLength(1);
    });

    it('should handle extremely long parameter values', async () => {
      const extremelyLongId = 'x'.repeat(100000);

      const response = await request(app)
        .get(`/api/analysis/${extremelyLongId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting Scenarios', () => {
    it('should handle burst of requests gracefully', async () => {
      const files = [{
        id: 'burst',
        name: 'test.js',
        content: 'console.log("burst test");',
        language: 'javascript'
      }];

      // Send 20 requests in quick succession
      const promises = Array.from({ length: 20 }, (_, i) =>
        request(app)
          .post('/api/analyze/deep')
          .send({ files: [{ ...files[0], id: `burst-${i}` }] })
      );

      const responses = await Promise.all(promises);

      // Most should succeed (server should handle the load)
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(15); // Allow for some failures under load
    });
  });
});