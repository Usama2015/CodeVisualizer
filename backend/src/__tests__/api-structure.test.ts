/**
 * Tests for API response structure consistency
 *
 * This test suite prevents the specific data structure issues that caused runtime errors:
 * - Double-nested analysis structure (data.analysis.analysis.files)
 * - Missing required fields in API responses
 * - Inconsistent response formats
 * - TSX parsing errors from malformed content
 */

import request from 'supertest';
import app from '../app';

describe('API Response Structure Tests', () => {
  describe('POST /api/analyze/deep - Deep Analysis Endpoint', () => {
    it('should return correct data structure (not double-nested)', async () => {
      const testFiles = [
        {
          id: 'test-1',
          name: 'test.js',
          content: 'console.log("test");',
          language: 'javascript' as const
        }
      ];

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: testFiles })
        .expect(200);

      // Verify correct structure: response.analysis.files (NOT response.analysis.analysis.files)
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('analysis');
      expect(response.body.analysis).toHaveProperty('files');
      expect(response.body.analysis).toHaveProperty('dependencies');
      expect(response.body.analysis).toHaveProperty('architecturePatterns');

      // Ensure no double-nesting
      expect(response.body.analysis).not.toHaveProperty('analysis');

      // Verify files structure
      expect(Array.isArray(response.body.analysis.files)).toBe(true);
      expect(response.body.analysis.files.length).toBeGreaterThan(0);

      // Verify file structure
      const file = response.body.analysis.files[0];
      expect(file).toHaveProperty('id');
      expect(file).toHaveProperty('name');
      expect(file).toHaveProperty('language');
      expect(file).toHaveProperty('metrics');
    });

    it('should handle TSX files without parsing errors', async () => {
      const tsxFiles = [
        {
          id: 'tsx-1',
          name: 'Component.tsx',
          content: `
            import React from 'react';

            interface Props {
              title: string;
            }

            const TestComponent: React.FC<Props> = ({ title }) => {
              return (
                <div>
                  <h1>{title}</h1>
                  <p>Valid TSX content</p>
                </div>
              );
            };

            export default TestComponent;
          `,
          language: 'tsx' as const
        }
      ];

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: tsxFiles })
        .expect(200);

      expect(response.body.analysis.files).toHaveLength(1);
      const file = response.body.analysis.files[0];
      expect(file.name).toBe('Component.tsx');
      expect(file.language).toBe('tsx');
    });

    it('should handle malformed TSX gracefully', async () => {
      const malformedTsxFiles = [
        {
          id: 'bad-tsx-1',
          name: 'Broken.tsx',
          content: `
            import React from 'react';

            const BrokenComponent = () => {
              return (
                <div>
                  <h1>Unclosed tag
                </div>
              );
            };
          `,
          language: 'tsx' as const
        }
      ];

      // Should not crash, even with malformed TSX
      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: malformedTsxFiles })
        .expect(200);

      expect(response.body.analysis.files).toHaveLength(1);
      // File should still be processed, even if parsing has issues
      expect(response.body.analysis.files[0].name).toBe('Broken.tsx');
    });

    it('should reject config files that cause parsing issues', async () => {
      const configFiles = [
        {
          id: 'config-1',
          name: 'package.json',
          content: '{"name": "test", "version": "1.0.0"}',
          language: 'json' as const
        },
        {
          id: 'config-2',
          name: 'tsconfig.json',
          content: '{"compilerOptions": {"strict": true}}',
          language: 'json' as const
        }
      ];

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: configFiles })
        .expect(200);

      // Config files should be processed but with appropriate handling
      expect(response.body.analysis.files).toHaveLength(2);
    });

    it('should return consistent error structure', async () => {
      const response = await request(app)
        .post('/api/analyze/deep')
        .send({}) // No files
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });

    it('should handle large payloads without timeout', async () => {
      const largeFiles = Array.from({ length: 50 }, (_, i) => ({
        id: `large-${i}`,
        name: `file${i}.js`,
        content: `
          // Large file ${i}
          ${Array.from({ length: 100 }, (_, j) => `console.log("Line ${j} in file ${i}");`).join('\n')}
        `,
        language: 'javascript' as const
      }));

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: largeFiles })
        .expect(200);

      expect(response.body.analysis.files).toHaveLength(50);
    }, 30000); // 30 second timeout

    it('should include warnings for problematic files', async () => {
      const problematicFiles = [
        {
          id: 'large-file',
          name: 'huge.js',
          content: Array.from({ length: 2000 }, (_, i) => `console.log("Line ${i}");`).join('\n'),
          language: 'javascript' as const
        }
      ];

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: problematicFiles })
        .expect(200);

      expect(response.body).toHaveProperty('warnings');
      expect(Array.isArray(response.body.warnings)).toBe(true);

      // Should have warning for large file
      const largeFileWarnings = response.body.warnings.filter((w: any) => w.type === 'large_file');
      expect(largeFileWarnings.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/analysis/:id - Analysis Retrieval', () => {
    it('should return consistent structure for cached analysis', async () => {
      // First create an analysis
      const testFiles = [
        {
          id: 'cache-test-1',
          name: 'test.js',
          content: 'function test() { return true; }',
          language: 'javascript' as const
        }
      ];

      const createResponse = await request(app)
        .post('/api/analyze/deep')
        .send({ files: testFiles })
        .expect(200);

      const analysisId = createResponse.body.id;

      // Retrieve the analysis
      const getResponse = await request(app)
        .get(`/api/analysis/${analysisId}`)
        .expect(200);

      // Should have same structure as creation response
      expect(getResponse.body).toHaveProperty('id', analysisId);
      expect(getResponse.body).toHaveProperty('analysis');
      expect(getResponse.body.analysis).toHaveProperty('files');
      expect(getResponse.body.analysis).not.toHaveProperty('analysis'); // No double-nesting
    });

    it('should return 404 for non-existent analysis', async () => {
      const response = await request(app)
        .get('/api/analysis/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/analyze/github - GitHub Analysis', () => {
    it('should validate GitHub URL format', async () => {
      const invalidUrls = [
        'not-a-url',
        'https://example.com',
        'github.com/user/repo',
        'https://github.com', // Missing repo
      ];

      for (const url of invalidUrls) {
        const response = await request(app)
          .post('/api/analyze/github')
          .send({ url })
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should return consistent error structure for GitHub failures', async () => {
      const response = await request(app)
        .post('/api/analyze/github')
        .send({ url: 'https://github.com/nonexistent/repo' })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('API Endpoint Consistency', () => {
    it('should have consistent error response format across all endpoints', async () => {
      const endpoints = [
        { method: 'post', path: '/api/upload', data: {} },
        { method: 'post', path: '/api/analyze', data: {} },
        { method: 'post', path: '/api/analyze/deep', data: {} },
        { method: 'post', path: '/api/analyze/github', data: {} },
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path)
          .send(endpoint.data)
          .expect(400);

        // All error responses should have consistent structure
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(typeof response.body.error).toBe('string');
      }
    });

    it('should include proper CORS headers', async () => {
      const response = await request(app)
        .options('/api/analyze/deep')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/analyze/deep')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}') // Malformed JSON
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('File Processing Edge Cases', () => {
    it('should handle empty files', async () => {
      const emptyFiles = [
        {
          id: 'empty-1',
          name: 'empty.js',
          content: '',
          language: 'javascript' as const
        }
      ];

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: emptyFiles })
        .expect(200);

      expect(response.body.analysis.files).toHaveLength(1);
      const file = response.body.analysis.files[0];
      expect(file.metrics.linesOfCode).toBe(0);
    });

    it('should handle files with special characters', async () => {
      const specialFiles = [
        {
          id: 'special-1',
          name: 'special-chars.js',
          content: 'console.log("UTF-8: 你好 🌍 ñáéíóú");',
          language: 'javascript' as const
        }
      ];

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: specialFiles })
        .expect(200);

      expect(response.body.analysis.files).toHaveLength(1);
    });

    it('should handle mixed file types', async () => {
      const mixedFiles = [
        {
          id: 'js-1',
          name: 'script.js',
          content: 'console.log("JavaScript");',
          language: 'javascript' as const
        },
        {
          id: 'ts-1',
          name: 'app.ts',
          content: 'const message: string = "TypeScript";',
          language: 'typescript' as const
        },
        {
          id: 'py-1',
          name: 'script.py',
          content: 'print("Python")',
          language: 'python' as const
        }
      ];

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: mixedFiles })
        .expect(200);

      expect(response.body.analysis.files).toHaveLength(3);

      // Verify each file maintains its language
      const languages = response.body.analysis.files.map((f: any) => f.language);
      expect(languages).toContain('javascript');
      expect(languages).toContain('typescript');
      expect(languages).toContain('python');
    });
  });

  describe('Dependency Analysis Structure', () => {
    it('should return proper dependency structure', async () => {
      const dependencyFiles = [
        {
          id: 'main-1',
          name: 'main.js',
          content: `
            import { helper } from './helper.js';
            import { utils } from './utils.js';

            function main() {
              helper.doSomething();
              utils.format();
            }
          `,
          language: 'javascript' as const
        },
        {
          id: 'helper-1',
          name: 'helper.js',
          content: `
            export const helper = {
              doSomething() {
                return true;
              }
            };
          `,
          language: 'javascript' as const
        }
      ];

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: dependencyFiles })
        .expect(200);

      expect(response.body).toHaveProperty('dependencies');
      expect(response.body.dependencies).toHaveProperty('nodes');
      expect(response.body.dependencies).toHaveProperty('edges');
    });
  });

  describe('Performance and Memory Tests', () => {
    it('should not crash with deeply nested code structures', async () => {
      const deeplyNestedCode = `
        function level1() {
          function level2() {
            function level3() {
              function level4() {
                function level5() {
                  return "deep";
                }
                return level5();
              }
              return level4();
            }
            return level3();
          }
          return level2();
        }
      `;

      const nestedFiles = [
        {
          id: 'nested-1',
          name: 'nested.js',
          content: deeplyNestedCode,
          language: 'javascript' as const
        }
      ];

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: nestedFiles })
        .expect(200);

      expect(response.body.analysis.files).toHaveLength(1);
    });

    it('should handle concurrent requests properly', async () => {
      const testFiles = [
        {
          id: 'concurrent-1',
          name: 'test.js',
          content: 'console.log("test");',
          language: 'javascript' as const
        }
      ];

      // Send multiple concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/analyze/deep')
          .send({ files: testFiles })
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id');
        expect(response.body.analysis).toHaveProperty('files');
      });

      // All should have unique IDs
      const ids = responses.map(r => r.body.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });
  });
});