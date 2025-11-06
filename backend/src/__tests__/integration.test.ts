import request from 'supertest';
import app from '../app';
import { DeepAnalysisRequest } from '../../shared/types/analysis';

describe('Backend Integration Tests', () => {
  describe('API Endpoints', () => {
    test('GET /api/health should return 200', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
    });

    test('POST /api/analyze/deep should handle valid files', async () => {
      const validRequest: DeepAnalysisRequest = {
        files: [
          {
            id: 'test-1',
            name: 'test.js',
            path: 'src/test.js',
            content: 'const x = 5; console.log(x);',
            language: 'javascript'
          }
        ]
      };

      const response = await request(app)
        .post('/api/analyze/deep')
        .send(validRequest);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('analysis');
      expect(response.body.analysis).toHaveProperty('files');
      expect(Array.isArray(response.body.analysis.files)).toBe(true);
    });

    test('POST /api/analyze/deep should filter JSON config files', async () => {
      const requestWithJSON: DeepAnalysisRequest = {
        files: [
          {
            id: 'test-1',
            name: 'package.json',
            path: 'package.json',
            content: '{"name": "test"}',
            language: 'javascript'
          },
          {
            id: 'test-2',
            name: 'index.js',
            path: 'src/index.js',
            content: 'console.log("test");',
            language: 'javascript'
          }
        ]
      };

      const response = await request(app)
        .post('/api/analyze/deep')
        .send(requestWithJSON);

      expect(response.status).toBe(200);
      expect(response.body.analysis.files).toHaveLength(1);
      expect(response.body.analysis.files[0].name).toBe('index.js');
    });

    test('POST /api/analyze/deep should handle TSX files correctly', async () => {
      const tsxRequest: DeepAnalysisRequest = {
        files: [
          {
            id: 'test-1',
            name: 'Component.tsx',
            path: 'src/Component.tsx',
            content: `
              import React from 'react';
              export const Component = () => <div>Hello</div>;
            `,
            language: 'tsx'
          }
        ]
      };

      const response = await request(app)
        .post('/api/analyze/deep')
        .send(tsxRequest);

      expect(response.status).toBe(200);
      expect(response.body.analysis.files[0]).toHaveProperty('imports');
      expect(response.body.analysis.files[0]).toHaveProperty('exports');
    });

    test('GET /api/analysis/:id should return stored analysis', async () => {
      // First create an analysis
      const createResponse = await request(app)
        .post('/api/analyze/deep')
        .send({
          files: [
            {
              id: 'test-1',
              name: 'test.js',
              content: 'const x = 1;',
              language: 'javascript'
            }
          ]
        });

      const analysisId = createResponse.body.id;

      // Then retrieve it
      const getResponse = await request(app)
        .get(`/api/analysis/${analysisId}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body).toHaveProperty('analysis');
      expect(getResponse.body.analysis).toHaveProperty('id', analysisId);
    });

    test('GET /api/analysis/:id should return 404 for non-existent id', async () => {
      const response = await request(app)
        .get('/api/analysis/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Data Structure Validation', () => {
    test('Response should not have double-nested analysis structure', async () => {
      const response = await request(app)
        .post('/api/analyze/deep')
        .send({
          files: [
            {
              id: 'test-1',
              name: 'test.js',
              content: 'const x = 1;',
              language: 'javascript'
            }
          ]
        });

      expect(response.body).toHaveProperty('analysis');
      expect(response.body.analysis).not.toHaveProperty('analysis');
      expect(response.body.analysis).toHaveProperty('files');
      expect(response.body.analysis).toHaveProperty('architecturePatterns');
    });

    test('Should handle folder structure with paths correctly', async () => {
      const response = await request(app)
        .post('/api/analyze/deep')
        .send({
          files: [
            {
              id: 'test-1',
              name: 'index.js',
              path: 'src/components/index.js',
              content: 'export default function() {}',
              language: 'javascript'
            },
            {
              id: 'test-2',
              name: 'utils.js',
              path: 'src/utils/utils.js',
              content: 'export const helper = () => {}',
              language: 'javascript'
            }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.analysis.files).toHaveLength(2);
      expect(response.body.analysis.files[0]).toHaveProperty('path');
    });
  });

  describe('Error Handling', () => {
    test('Should handle empty request gracefully', async () => {
      const response = await request(app)
        .post('/api/analyze/deep')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('Should handle malformed file content', async () => {
      const response = await request(app)
        .post('/api/analyze/deep')
        .send({
          files: [
            {
              id: 'test-1',
              name: 'broken.js',
              content: 'const x = {',  // Intentionally broken
              language: 'javascript'
            }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.analysis.files[0]).toHaveProperty('metrics');
    });

    test('Should handle large payloads', async () => {
      const largeFiles = Array.from({ length: 100 }, (_, i) => ({
        id: `file-${i}`,
        name: `file${i}.js`,
        path: `src/file${i}.js`,
        content: `const var${i} = ${i}; console.log(var${i});`,
        language: 'javascript' as const
      }));

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: largeFiles });

      expect(response.status).toBe(200);
      expect(response.body.analysis.files.length).toBeGreaterThan(0);
    });
  });
});