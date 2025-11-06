import request from 'supertest';
import app from '../app';

describe('Express App', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /api/upload', () => {
    it('should return error when no files uploaded', async () => {
      const response = await request(app)
        .post('/api/upload')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'No files uploaded');
    });
  });

  describe('POST /api/analyze-github', () => {
    it('should return error when no URL provided', async () => {
      const response = await request(app)
        .post('/api/analyze-github')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'GitHub URL is required');
    });

    it('should return error for invalid GitHub URL', async () => {
      const response = await request(app)
        .post('/api/analyze-github')
        .send({ url: 'invalid-url' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid GitHub URL format');
    });

    it('should accept valid GitHub URL', async () => {
      const response = await request(app)
        .post('/api/analyze-github')
        .send({ url: 'https://github.com/user/repo' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'GitHub repository analysis initiated');
    });
  });

  describe('POST /api/analyze', () => {
    it('should return error when no file IDs provided', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'File IDs are required');
    });

    it('should return mock analysis for valid file IDs', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send({ fileIds: ['file1', 'file2'] })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Code analysis completed');
      expect(response.body.data).toHaveProperty('files');
      expect(response.body.data).toHaveProperty('metrics');
    });
  });

  describe('GET /api/analysis/:id', () => {
    it('should return analysis result for any ID', async () => {
      const response = await request(app)
        .get('/api/analysis/test-id')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', 'test-id');
      expect(response.body.data).toHaveProperty('status', 'completed');
    });
  });

  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Not found');
    });
  });
});