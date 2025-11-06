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

describe('API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCacheService.getStats.mockResolvedValue({
      connected: true,
      keys: 5,
      memory: '10MB'
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'OK',
        timestamp: expect.any(String),
        cache: expect.any(Object)
      });
    });

    it('should handle cache service errors in health check', async () => {
      mockCacheService.getStats.mockRejectedValue(new Error('Cache error'));

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.cache).toEqual({
        connected: false,
        error: 'Failed to get cache stats'
      });
    });
  });

  describe('POST /api/analyze/deep', () => {
    it('should analyze files successfully', async () => {
      const mockFiles = [
        {
          id: 'file-1',
          name: 'test.js',
          content: 'console.log("test");',
          language: 'javascript'
        }
      ];

      mockCacheService.set.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: mockFiles })
        .expect(200);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        analysis: {
          id: expect.any(String),
          files: expect.any(Array),
          architecturePatterns: expect.any(Array),
          dependencies: expect.any(Object),
          createdAt: expect.any(String)
        },
        dependencies: expect.any(Object),
        processingTime: expect.any(Number),
        warnings: expect.any(Array)
      });
    });

    it('should return 400 when no files provided', async () => {
      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: [] })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'No files provided for analysis'
      });
    });

    it('should return 400 when files field is missing', async () => {
      const response = await request(app)
        .post('/api/analyze/deep')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'No files provided for analysis'
      });
    });

    it('should handle cache storage failure gracefully', async () => {
      const mockFiles = [
        {
          id: 'file-1',
          name: 'test.js',
          content: 'console.log("test");',
          language: 'javascript'
        }
      ];

      mockCacheService.set.mockRejectedValue(new Error('Cache storage failed'));

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: mockFiles })
        .expect(200);

      // Should still return successful response even if cache fails
      expect(response.body.id).toBeDefined();
    });

    it('should handle malformed file data', async () => {
      const malformedFiles = [
        {
          // Missing required fields
          name: 'test.js'
        }
      ];

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: malformedFiles })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Deep analysis failed');
    });

    it('should validate file structure and generate warnings', async () => {
      const largeFile = {
        id: 'large-file',
        name: 'large.js',
        content: 'console.log("line");\\n'.repeat(1001), // 1001 lines
        language: 'javascript'
      };

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: [largeFile] })
        .expect(200);

      expect(response.body.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'large_file',
            severity: 'medium',
            message: expect.stringContaining('large.js is large')
          })
        ])
      );
    });
  });

  describe('GET /api/analysis/:id', () => {
    it('should retrieve cached analysis', async () => {
      const mockAnalysis = {
        id: 'test-analysis',
        analysis: { files: [], architecturePatterns: [] },
        processingTime: 100
      };

      mockCacheService.get.mockResolvedValue(mockAnalysis);

      const response = await request(app)
        .get('/api/analysis/test-analysis')
        .expect(200);

      expect(response.body).toEqual(mockAnalysis);
      expect(mockCacheService.get).toHaveBeenCalledWith('test-analysis');
    });

    it('should return 404 when analysis not found', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/analysis/nonexistent')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Analysis not found'
      });
    });

    it('should return 503 when cache service not initialized', async () => {
      // Mock the scenario where cacheService is null
      const originalApp = require('../app').default;

      const response = await request(originalApp)
        .get('/api/analysis/test')
        .expect(503);

      expect(response.body.error).toContain('Cache service not initialized');
    });
  });

  describe('POST /api/analyze/github', () => {
    it('should analyze GitHub repository successfully', async () => {
      const mockGitHubResult = {
        files: [
          {
            name: 'index.js',
            content: 'console.log("Hello");',
            extension: 'js'
          }
        ],
        stats: {
          totalSize: 1024,
          languages: { javascript: 1 }
        },
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
      (gitHubService.cloneAndAnalyzeRepository as jest.Mock).mockResolvedValue(mockGitHubResult);
      (gitHubService.cleanupDirectory as jest.Mock).mockResolvedValue(undefined);
      mockCacheService.set.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/analyze/github')
        .send({ url: 'https://github.com/test-user/test-repo' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('GitHub repository analysis completed'),
        data: {
          analysisId: expect.any(String),
          repository: {
            url: 'https://github.com/test-user/test-repo',
            name: 'test-repo',
            owner: 'test-user'
          },
          stats: expect.any(Object),
          warningsCount: expect.any(Number)
        }
      });
    });

    it('should return 400 for invalid GitHub URL', async () => {
      (gitHubService.validateGitHubURL as jest.Mock).mockReturnValue({
        isValid: false,
        error: 'Invalid GitHub URL format'
      });

      const response = await request(app)
        .post('/api/analyze/github')
        .send({ url: 'https://invalid-url.com/repo' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid GitHub URL format'
      });
    });

    it('should return 400 when no URL provided', async () => {
      const response = await request(app)
        .post('/api/analyze/github')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'GitHub URL is required and must be a string'
      });
    });

    it('should handle repository not found', async () => {
      (gitHubService.validateGitHubURL as jest.Mock).mockReturnValue({
        isValid: true
      });
      (gitHubService.cloneAndAnalyzeRepository as jest.Mock).mockRejectedValue(
        new Error('Repository not found')
      );

      const response = await request(app)
        .post('/api/analyze/github')
        .send({ url: 'https://github.com/user/nonexistent-repo' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Repository not found or is private');
    });

    it('should handle repository too large error', async () => {
      (gitHubService.validateGitHubURL as jest.Mock).mockReturnValue({
        isValid: true
      });
      (gitHubService.cloneAndAnalyzeRepository as jest.Mock).mockRejectedValue(
        new Error('Repository too large to analyze')
      );

      const response = await request(app)
        .post('/api/analyze/github')
        .send({ url: 'https://github.com/user/huge-repo' })
        .expect(413);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Repository is too large to analyze');
    });

    it('should cleanup temp directory on error', async () => {
      const mockGitHubResult = {
        files: [],
        stats: { totalSize: 0, languages: {} },
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
      (gitHubService.cloneAndAnalyzeRepository as jest.Mock).mockResolvedValue(mockGitHubResult);
      (gitHubService.cleanupDirectory as jest.Mock).mockResolvedValue(undefined);

      // Simulate error during analysis
      mockCacheService.set.mockRejectedValue(new Error('Analysis failed'));

      const response = await request(app)
        .post('/api/analyze/github')
        .send({ url: 'https://github.com/test-user/test-repo' })
        .expect(400);

      // Should have attempted cleanup
      expect(gitHubService.cleanupDirectory).toHaveBeenCalledWith('/tmp/test-repo');
    });
  });

  describe('Cache Management Endpoints', () => {
    it('should get cache stats', async () => {
      const mockStats = {
        connected: true,
        keys: 10,
        memory: '50MB'
      };

      mockCacheService.getStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/cache/stats')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockStats
      });
    });

    it('should clear cache', async () => {
      mockCacheService.clear.mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/cache/clear')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Cache cleared successfully'
      });
    });

    it('should delete specific cache entry', async () => {
      mockCacheService.delete.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/cache/test-analysis')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Analysis test-analysis deleted from cache'
      });
    });

    it('should return 404 when deleting non-existent cache entry', async () => {
      mockCacheService.delete.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/cache/nonexistent')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Analysis not found in cache'
      });
    });
  });

  describe('File Upload Endpoint', () => {
    it('should handle no files uploaded', async () => {
      const response = await request(app)
        .post('/api/upload')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'No files uploaded'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
        message: 'Route GET /api/unknown not found'
      });
    });

    it('should handle JSON parsing errors', async () => {
      const response = await request(app)
        .post('/api/analyze/deep')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle request timeout', async () => {
      // Mock a long-running operation
      jest.setTimeout(10000);

      const mockFiles = [{
        id: 'file-1',
        name: 'test.js',
        content: 'console.log("test");',
        language: 'javascript'
      }];

      // This test verifies the server can handle the request within timeout
      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: mockFiles })
        .timeout(5000)
        .expect(200);

      expect(response.body.id).toBeDefined();
    });
  });

  describe('Specific Bug Prevention Tests', () => {
    it('should prevent double-nested analysis structure', async () => {
      const mockFiles = [{
        id: 'file-1',
        name: 'test.js',
        content: 'console.log("test");',
        language: 'javascript'
      }];

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: mockFiles })
        .expect(200);

      // Ensure the response has the correct structure (not double-nested)
      expect(response.body.analysis).toBeDefined();
      expect(response.body.analysis.analysis).toBeUndefined(); // Should not be double-nested
      expect(response.body.analysis.files).toBeDefined();
      expect(response.body.analysis.architecturePatterns).toBeDefined();
    });

    it('should handle TSX files without parsing errors', async () => {
      const tsxFiles = [{
        id: 'tsx-file',
        name: 'Component.tsx',
        content: `
          import React from 'react';

          interface Props {
            name: string;
          }

          const Component: React.FC<Props> = ({ name }) => {
            return <div>Hello {name}</div>;
          };

          export default Component;
        `,
        language: 'tsx'
      }];

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: tsxFiles })
        .expect(200);

      expect(response.body.analysis.files).toHaveLength(1);
      expect(response.body.analysis.files[0].name).toBe('Component.tsx');
      expect(response.body.analysis.files[0].language).toBe('tsx');
    });

    it('should filter JSON config files in analysis', async () => {
      const mixedFiles = [
        {
          id: 'js-file',
          name: 'index.js',
          content: 'console.log("test");',
          language: 'javascript'
        },
        {
          id: 'config-file',
          name: 'package.json',
          content: '{"name": "test"}',
          language: 'json'
        }
      ];

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: mixedFiles })
        .expect(200);

      // Should process both files but handle JSON appropriately
      expect(response.body.analysis.files).toHaveLength(2);
    });

    it('should maintain correct API endpoint paths', async () => {
      // Test that endpoints match what frontend expects
      const endpoints = [
        { path: '/api/analyze/deep', method: 'post' },
        { path: '/api/analysis/test-id', method: 'get' },
        { path: '/api/analysis/test-id/dependencies', method: 'get' },
        { path: '/api/analysis/test-id/metrics', method: 'get' },
        { path: '/api/analysis/test-id/architecture', method: 'get' },
        { path: '/health', method: 'get' }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path);
        // Should not return 404 (endpoint exists)
        expect(response.status).not.toBe(404);
      }
    });
  });
});