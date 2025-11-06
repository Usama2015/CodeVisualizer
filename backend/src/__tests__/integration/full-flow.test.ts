import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../../app';
import fs from 'fs';
import path from 'path';

/**
 * COMPLETE FLOW INTEGRATION TEST
 * This test suite verifies the entire user journey from file upload to visualization
 * It catches runtime errors that were missed before
 */
describe('Complete Upload-to-Visualization Flow', () => {
  let analysisId: string;

  describe('Step 1: File Upload and Analysis', () => {
    it('should accept files and trigger analysis automatically', async () => {
      const testFiles = [
        {
          id: 'file-1',
          name: 'component.tsx',
          content: `
            import React, { useState } from 'react';
            
            export function TestComponent() {
              const [count, setCount] = useState(0);
              return <div>{count}</div>;
            }
          `,
          language: 'typescript'
        },
        {
          id: 'file-2',
          name: 'utils.ts',
          content: `
            export function formatDate(date: Date): string {
              return date.toISOString();
            }
            
            export function parseJSON(str: string): any {
              return JSON.parse(str);
            }
          `,
          language: 'typescript'
        }
      ];

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({ files: testFiles })
        .expect(200);

      // Verify response structure matches frontend expectations
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('analysis');
      expect(response.body).toHaveProperty('dependencies');
      
      analysisId = response.body.id;
      expect(analysisId).toBeTruthy();
      expect(typeof analysisId).toBe('string');
    });
  });

  describe('Step 2: Retrieve Analysis Results', () => {
    it('should return stored analysis by ID (fixes Not Found error)', async () => {
      const response = await request(app)
        .get(`/api/analysis/${analysisId}`)
        .expect(200);

      // Verify the endpoint returns actual data, not mock
      expect(response.body).toHaveProperty('id', analysisId);
      expect(response.body).toHaveProperty('analysis');
      expect(response.body.analysis).toHaveProperty('files');
      expect(Array.isArray(response.body.analysis.files)).toBe(true);
    });

    it('should return 404 for non-existent analysis', async () => {
      const response = await request(app)
        .get('/api/analysis/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Step 3: Dependencies Endpoint', () => {
    it('should return dependency graph data', async () => {
      const response = await request(app)
        .get(`/api/analysis/${analysisId}/dependencies`)
        .expect(200);

      expect(response.body).toHaveProperty('nodes');
      expect(response.body).toHaveProperty('edges');
      expect(Array.isArray(response.body.nodes)).toBe(true);
      expect(Array.isArray(response.body.edges)).toBe(true);
    });
  });

  describe('Step 4: Metrics Endpoint', () => {
    it('should return code metrics', async () => {
      const response = await request(app)
        .get(`/api/analysis/${analysisId}/metrics`)
        .expect(200);

      expect(response.body).toHaveProperty('overall');
      expect(response.body).toHaveProperty('files');
    });
  });

  describe('Step 5: Architecture Patterns Endpoint', () => {
    it('should return architecture analysis', async () => {
      const response = await request(app)
        .get(`/api/analysis/${analysisId}/architecture`)
        .expect(200);

      expect(response.body).toHaveProperty('patterns');
      expect(Array.isArray(response.body.patterns)).toBe(true);
    });
  });
});

describe('Error Handling Tests', () => {
  describe('Invalid File Formats', () => {
    it('should handle malformed JavaScript gracefully', async () => {
      const response = await request(app)
        .post('/api/analyze/deep')
        .send({
          files: [{
            id: 'bad-1',
            name: 'broken.js',
            content: 'function broken( { /* unclosed',
            language: 'javascript'
          }]
        })
        .expect(200); // Should still return 200 but with error info

      expect(response.body.analysis.analysis.files[0]).toHaveProperty('error');
    });

    it('should handle TSX files correctly (fixes parsing error)', async () => {
      const tsxContent = `
        import React from 'react';
        
        interface Props {
          name: string;
        }
        
        export const Component: React.FC<Props> = ({ name }) => {
          return <div>Hello {name}</div>;
        };
      `;

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({
          files: [{
            id: 'tsx-1',
            name: 'component.tsx',
            content: tsxContent,
            language: 'typescript'
          }]
        })
        .expect(200);

      // Should parse without errors
      expect(response.body.analysis.analysis.files[0]).not.toHaveProperty('error');
      expect(response.body.analysis.analysis.files[0].imports).toContain('react');
    });
  });

  describe('Large File Handling', () => {
    it('should handle files larger than default limit', async () => {
      const largeContent = 'const x = 1;\n'.repeat(10000);
      
      const response = await request(app)
        .post('/api/analyze/deep')
        .send({
          files: [{
            id: 'large-1',
            name: 'large.js',
            content: largeContent,
            language: 'javascript'
          }]
        })
        .expect(200);

      expect(response.body).toHaveProperty('id');
    });
  });
});

describe('Frontend-Backend Contract Tests', () => {
  it('should match expected response format for AnalysisResults component', async () => {
    const response = await request(app)
      .post('/api/analyze/deep')
      .send({
        files: [{
          id: 'contract-1',
          name: 'test.js',
          content: 'export const test = 1;',
          language: 'javascript'
        }]
      })
      .expect(200);

    const analysisId = response.body.id;
    const getResponse = await request(app)
      .get(`/api/analysis/${analysisId}`)
      .expect(200);

    // Verify structure matches what AnalysisResults.tsx expects
    expect(getResponse.body).toMatchObject({
      id: expect.any(String),
      analysis: {
        analysis: {
          files: expect.arrayContaining([{
            path: expect.any(String),
            language: expect.any(String),
            imports: expect.any(Array),
            exports: expect.any(Array),
            functions: expect.any(Array),
            classes: expect.any(Array),
            complexity: expect.any(Number),
            metrics: expect.objectContaining({
              linesOfCode: expect.any(Number),
              cyclomaticComplexity: expect.any(Number)
            })
          }])
        }
      }
    });
  });

  it('should match expected format for DependencyGraph component', async () => {
    const response = await request(app)
      .post('/api/analyze/deep')
      .send({
        files: [
          {
            id: 'dep-1',
            name: 'a.js',
            content: 'import { b } from "./b";',
            language: 'javascript'
          },
          {
            id: 'dep-2',
            name: 'b.js',
            content: 'export const b = 1;',
            language: 'javascript'
          }
        ]
      })
      .expect(200);

    const depResponse = await request(app)
      .get(`/api/analysis/${response.body.id}/dependencies`)
      .expect(200);

    // Verify structure matches what DependencyGraph.tsx expects
    expect(depResponse.body).toMatchObject({
      nodes: expect.any(Array),
      edges: expect.any(Array)
    });

    if (depResponse.body.nodes.length > 0) {
      expect(depResponse.body.nodes[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String)
      });
    }
  });

  it('should match expected format for CodeMetrics component', async () => {
    const response = await request(app)
      .post('/api/analyze/deep')
      .send({
        files: [{
          id: 'metrics-1',
          name: 'code.js',
          content: 'function test() { if (true) { return 1; } }',
          language: 'javascript'
        }]
      })
      .expect(200);

    const metricsResponse = await request(app)
      .get(`/api/analysis/${response.body.id}/metrics`)
      .expect(200);

    // Verify structure matches what CodeMetrics.tsx expects
    expect(metricsResponse.body).toMatchObject({
      overall: expect.objectContaining({
        averageComplexity: expect.any(Number),
        totalLines: expect.any(Number),
        fileCount: expect.any(Number)
      }),
      files: expect.any(Array)
    });
  });
});

describe('Persistence Tests', () => {
  it('should store analysis results and retrieve them later', async () => {
    // Create analysis
    const createResponse = await request(app)
      .post('/api/analyze/deep')
      .send({
        files: [{
          id: 'persist-1',
          name: 'persist.js',
          content: 'const persistent = true;',
          language: 'javascript'
        }]
      })
      .expect(200);

    const analysisId = createResponse.body.id;

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 100));

    // Retrieve multiple times
    for (let i = 0; i < 3; i++) {
      const getResponse = await request(app)
        .get(`/api/analysis/${analysisId}`)
        .expect(200);

      expect(getResponse.body.id).toBe(analysisId);
    }
  });
});

// Add this test to catch the exact error you faced
describe('Runtime Error Prevention Tests', () => {
  it('should handle the complete user flow without errors', async () => {
    // Step 1: User uploads files
    const uploadResponse = await request(app)
      .post('/api/analyze/deep')
      .send({
        files: [
          {
            id: 'user-file-1',
            name: 'UserComponent.tsx',
            content: `
              import React from 'react';
              export default function UserComponent() {
                return <div>User Interface</div>;
              }
            `,
            language: 'typescript'
          }
        ]
      })
      .expect(200);

    const analysisId = uploadResponse.body.id;
    expect(analysisId).toBeTruthy();

    // Step 2: Frontend requests analysis (this was returning 404)
    const analysisResponse = await request(app)
      .get(`/api/analysis/${analysisId}`)
      .expect(200); // This should NOT be 404

    expect(analysisResponse.body).not.toHaveProperty('error');
    expect(analysisResponse.body.id).toBe(analysisId);

    // Step 3: Frontend requests dependencies
    const depResponse = await request(app)
      .get(`/api/analysis/${analysisId}/dependencies`)
      .expect(200);

    expect(depResponse.body).toHaveProperty('nodes');

    // Step 4: Frontend requests metrics
    const metricsResponse = await request(app)
      .get(`/api/analysis/${analysisId}/metrics`)
      .expect(200);

    expect(metricsResponse.body).toHaveProperty('overall');
  });
});
