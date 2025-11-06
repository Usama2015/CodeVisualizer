import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { API_ENDPOINTS, checkBackendHealth } from '@/lib/config';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Endpoints Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('API_ENDPOINTS', () => {
    it('should have correct endpoint URLs', () => {
      const baseUrl = 'http://localhost:3001';

      expect(API_ENDPOINTS.analyzeDeep).toBe(`${baseUrl}/api/analyze/deep`);
      expect(API_ENDPOINTS.upload).toBe(`${baseUrl}/api/upload`);
      expect(API_ENDPOINTS.analyzeGithub).toBe(`${baseUrl}/api/analyze-github`);
      expect(API_ENDPOINTS.health).toBe(`${baseUrl}/health`);
    });

    it('should generate correct dynamic URLs', () => {
      const analysisId = 'test-analysis-123';
      const baseUrl = 'http://localhost:3001';

      expect(API_ENDPOINTS.getAnalysis(analysisId)).toBe(`${baseUrl}/api/analysis/${analysisId}`);
      expect(API_ENDPOINTS.getDependencies(analysisId)).toBe(`${baseUrl}/api/analysis/${analysisId}/dependencies`);
      expect(API_ENDPOINTS.getMetrics(analysisId)).toBe(`${baseUrl}/api/analysis/${analysisId}/metrics`);
      expect(API_ENDPOINTS.getArchitecture(analysisId)).toBe(`${baseUrl}/api/analysis/${analysisId}/architecture`);
    });
  });

  describe('checkBackendHealth', () => {
    it('should return true when backend responds with OK', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      const result = await checkBackendHealth();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(API_ENDPOINTS.health);
    });

    it('should return false when backend responds with error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const result = await checkBackendHealth();
      expect(result).toBe(false);
    });

    it('should return false when fetch throws an error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await checkBackendHealth();
      expect(result).toBe(false);
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

      const result = await checkBackendHealth();
      expect(result).toBe(false);
    });
  });
});