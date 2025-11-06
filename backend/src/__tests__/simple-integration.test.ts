import request from 'supertest';
import app from '../app';

describe('Simple Integration Tests - Verify Fixes', () => {
  describe('File Upload Issues Fixed', () => {
    test('API endpoint should be accessible at /api/analyze/deep', async () => {
      const response = await request(app)
        .post('/api/analyze/deep')
        .send({
          files: [{
            id: 'test-1',
            name: 'test.js',
            content: 'const x = 1;',
            language: 'javascript'
          }]
        });

      // Should not return 404
      expect(response.status).not.toBe(404);
      expect(response.status).toBe(200);
    });

    test('Response should not have double-nested analysis', async () => {
      const response = await request(app)
        .post('/api/analyze/deep')
        .send({
          files: [{
            id: 'test-1',
            name: 'test.js',
            content: 'const x = 1;',
            language: 'javascript'
          }]
        });

      // Check structure is correct
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('analysis');
      expect(response.body.analysis).toHaveProperty('files');

      // Should NOT have analysis.analysis (double nesting)
      expect(response.body.analysis).not.toHaveProperty('analysis');
    });

    test('Should handle TSX files without parsing errors', async () => {
      const tsxCode = `
        import React from 'react';
        export const Component = () => {
          return <div>Hello World</div>;
        };
      `;

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({
          files: [{
            id: 'tsx-test',
            name: 'Component.tsx',
            content: tsxCode,
            language: 'tsx'
          }]
        });

      expect(response.status).toBe(200);
      expect(response.body.analysis.files).toHaveLength(1);
      expect(response.body.analysis.files[0].name).toBe('Component.tsx');
    });

    test('Should filter out JSON config files', async () => {
      const response = await request(app)
        .post('/api/analyze/deep')
        .send({
          files: [
            {
              id: '1',
              name: 'package.json',
              content: '{"name": "test"}',
              language: 'javascript'
            },
            {
              id: '2',
              name: 'app.js',
              content: 'console.log("app");',
              language: 'javascript'
            }
          ]
        });

      expect(response.status).toBe(200);
      // Should only have the JS file, not package.json
      expect(response.body.analysis.files).toHaveLength(1);
      expect(response.body.analysis.files[0].name).toBe('app.js');
    });

    test('Should preserve folder structure with paths', async () => {
      const response = await request(app)
        .post('/api/analyze/deep')
        .send({
          files: [{
            id: 'test-1',
            name: 'index.js',
            path: 'src/components/index.js',
            content: 'export default {};',
            language: 'javascript'
          }]
        });

      expect(response.status).toBe(200);
      expect(response.body.analysis.files[0]).toHaveProperty('path', 'src/components/index.js');
    });
  });

  describe('Health Check', () => {
    test('Health endpoint should be working', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
    });
  });

  describe('Analysis Retrieval', () => {
    test('Should store and retrieve analysis by ID', async () => {
      // Create analysis
      const createResponse = await request(app)
        .post('/api/analyze/deep')
        .send({
          files: [{
            id: 'test-1',
            name: 'test.js',
            content: 'const x = 1;',
            language: 'javascript'
          }]
        });

      expect(createResponse.status).toBe(200);
      const analysisId = createResponse.body.id;

      // Retrieve it
      const getResponse = await request(app)
        .get(`/api/analysis/${analysisId}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.analysis.id).toBe(analysisId);
    });
  });
});