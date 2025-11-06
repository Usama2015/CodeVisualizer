import request from 'supertest';
import app from '../app';

describe('End-to-End Tests', () => {
  describe('Complete Upload to Visualization Flow', () => {
    test('should complete full analysis workflow', async () => {
      // Step 1: Upload files for analysis
      const uploadResponse = await request(app)
        .post('/api/analyze/deep')
        .send({
          files: [
            {
              id: 'file-1',
              name: 'App.tsx',
              path: 'src/App.tsx',
              content: `
                import React from 'react';
                import { Component } from './Component';

                export default function App() {
                  return <Component />;
                }
              `,
              language: 'tsx'
            },
            {
              id: 'file-2',
              name: 'Component.tsx',
              path: 'src/Component.tsx',
              content: `
                export const Component = () => {
                  return <div>Hello World</div>;
                };
              `,
              language: 'tsx'
            }
          ]
        });

      // Step 2: Verify upload response structure
      expect(uploadResponse.status).toBe(200);
      expect(uploadResponse.body).toHaveProperty('id');
      expect(uploadResponse.body).toHaveProperty('analysis');
      expect(uploadResponse.body.analysis).toHaveProperty('files');
      expect(uploadResponse.body.analysis.files).toHaveLength(2);

      // Verify no double-nested structure
      expect(uploadResponse.body.analysis).not.toHaveProperty('analysis');

      const analysisId = uploadResponse.body.id;

      // Step 3: Retrieve analysis
      const getResponse = await request(app)
        .get(`/api/analysis/${analysisId}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.analysis.id).toBe(analysisId);

      // Step 4: Verify dependency graph
      expect(getResponse.body.analysis).toHaveProperty('dependencies');
      const deps = getResponse.body.analysis.dependencies;
      expect(deps).toHaveProperty('nodes');
      expect(deps).toHaveProperty('edges');

      // Should have detected import relationship
      const edge = deps.edges.find((e: any) =>
        e.source.includes('App') && e.target.includes('Component')
      );
      expect(edge).toBeDefined();
    });

    test('should handle folder structure with nested directories', async () => {
      const files = [
        {
          id: 'f1',
          name: 'index.ts',
          path: 'src/index.ts',
          content: 'export * from "./components"',
          language: 'typescript' as const
        },
        {
          id: 'f2',
          name: 'Button.tsx',
          path: 'src/components/ui/Button.tsx',
          content: 'export const Button = () => <button />',
          language: 'tsx' as const
        },
        {
          id: 'f3',
          name: 'utils.js',
          path: 'src/utils/helpers/utils.js',
          content: 'export const helper = () => {}',
          language: 'javascript' as const
        }
      ];

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files });

      expect(response.status).toBe(200);

      // Verify paths are preserved
      response.body.analysis.files.forEach((file: any) => {
        const original = files.find(f => f.name === file.name);
        expect(file.path).toBe(original?.path);
      });
    });
  });

  describe('Error Scenarios', () => {
    test('should reject requests without files', async () => {
      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: [] });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should handle mixed valid and invalid files', async () => {
      const response = await request(app)
        .post('/api/analyze/deep')
        .send({
          files: [
            {
              id: 'valid',
              name: 'valid.js',
              content: 'const x = 1;',
              language: 'javascript'
            },
            {
              id: 'invalid',
              name: 'invalid.js',
              content: null, // Invalid content
              language: 'javascript'
            }
          ]
        });

      // Should process valid files and skip invalid ones
      expect(response.status).toBe(200);
      expect(response.body.analysis.files.length).toBeGreaterThanOrEqual(1);
    });

    test('should return 404 for non-existent analysis', async () => {
      const response = await request(app)
        .get('/api/analysis/definitely-does-not-exist-12345');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Analysis not found');
    });
  });

  describe('Performance Tests', () => {
    test('should handle 100+ files efficiently', async () => {
      const files = Array.from({ length: 100 }, (_, i) => ({
        id: `file-${i}`,
        name: `file${i}.js`,
        path: `src/modules/file${i}.js`,
        content: `
          export const func${i} = () => {
            return ${i};
          };
        `,
        language: 'javascript' as const
      }));

      const startTime = Date.now();
      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files })
        .timeout(30000);

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(30000); // Should complete within 30s
      expect(response.body.analysis.files.length).toBeGreaterThanOrEqual(50);
    });

    test('should handle large individual files', async () => {
      const largeContent = Array(1000).fill('const x = 1;').join('\n');

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({
          files: [{
            id: 'large',
            name: 'large.js',
            content: largeContent,
            language: 'javascript'
          }]
        });

      expect(response.status).toBe(200);
      expect(response.body.analysis.files[0].metrics).toBeDefined();
    });
  });

  describe('Specific Bug Regression Tests', () => {
    test('should not throw TSError for TSX files', async () => {
      const tsxContent = `
        import React from 'react';

        export const TestComponent = () => {
          return (
            <div>
              <h1>Test</h1>
              <button onClick={() => alert('test')}>Click</button>
            </div>
          );
        };
      `;

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({
          files: [{
            id: 'tsx-test',
            name: 'Component.tsx',
            content: tsxContent,
            language: 'tsx'
          }]
        });

      expect(response.status).toBe(200);
      expect(response.body.analysis.files[0].name).toBe('Component.tsx');
    });

    test('should filter out JSON config files automatically', async () => {
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
              name: 'tsconfig.json',
              content: '{"compilerOptions": {}}',
              language: 'javascript'
            },
            {
              id: '3',
              name: 'components.json',
              content: '{}',
              language: 'javascript'
            },
            {
              id: '4',
              name: 'app.js',
              content: 'const app = "test";',
              language: 'javascript'
            }
          ]
        });

      expect(response.status).toBe(200);
      // Should only process the actual code file
      expect(response.body.analysis.files).toHaveLength(1);
      expect(response.body.analysis.files[0].name).toBe('app.js');
    });

    test('API endpoints should include full URL prefix', async () => {
      // This test verifies the fix for the 404 errors
      // The actual frontend would use http://localhost:3001 prefix

      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200);
      // The route should be accessible at /api/health
      // Frontend should call http://localhost:3001/api/health
    });
  });
});