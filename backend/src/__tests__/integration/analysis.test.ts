import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../../app';
import path from 'path';
import fs from 'fs';

describe('Code Analysis API Integration Tests', () => {
  // These tests define what we WANT the API to do
  // We write these FIRST, then implement to make them pass

  describe('POST /api/analyze/deep', () => {
    it('should perform deep AST analysis on uploaded JavaScript files', async () => {
      // Test data - a simple JS file content
      const testCode = `
        import React from 'react';
        import { useState } from 'react';

        export function MyComponent() {
          const [count, setCount] = useState(0);

          const increment = () => {
            setCount(count + 1);
          };

          return <div onClick={increment}>{count}</div>;
        }
      `;

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({
          files: [{
            id: 'test-1',
            name: 'MyComponent.jsx',
            content: testCode,
            language: 'javascript'
          }]
        });

      expect(response.status).toBe(200);
      expect(response.body.analysis).toBeDefined();

      // Verify AST analysis extracted correct data
      const analysis = response.body.analysis.analysis;
      expect(analysis.files[0].imports).toHaveLength(2);
      expect(analysis.files[0].exports).toHaveLength(1);
      expect(analysis.files[0].functions).toHaveLength(2); // MyComponent and increment
      expect(analysis.files[0].complexity).toBeGreaterThan(0);
    });

    it('should detect dependencies between multiple files', async () => {
      const file1 = `
        export const API_URL = 'http://localhost:3000';
        export function fetchData() { return fetch(API_URL); }
      `;

      const file2 = `
        import { fetchData, API_URL } from './api';
        export async function loadUser() {
          return await fetchData('/user');
        }
      `;

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({
          files: [
            { id: '1', name: 'api.js', content: file1, language: 'javascript' },
            { id: '2', name: 'user.js', content: file2, language: 'javascript' }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.dependencies).toBeDefined();

      const deps = response.body.dependencies;
      expect(deps.edges).toContainEqual(
        expect.objectContaining({
          source: 'user.js',
          target: 'api.js',
          imports: ['fetchData', 'API_URL']
        })
      );
    });

    it('should calculate code quality metrics', async () => {
      const complexCode = `
        function complexFunction(a, b, c) {
          if (a > 0) {
            if (b > 0) {
              if (c > 0) {
                return a + b + c;
              } else {
                return a + b;
              }
            } else {
              return a;
            }
          } else {
            if (b > 0 && c > 0) {
              return b + c;
            }
          }
          return 0;
        }
      `;

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({
          files: [{
            id: 'complex-1',
            name: 'complex.js',
            content: complexCode,
            language: 'javascript'
          }]
        });

      expect(response.status).toBe(200);

      const metrics = response.body.analysis.analysis.files[0].metrics;
      expect(metrics).toBeDefined();
      expect(metrics.cyclomaticComplexity).toBeGreaterThan(5);
      expect(metrics.linesOfCode).toBeGreaterThan(10);
      expect(metrics.maintainabilityIndex).toBeLessThan(100);
    });

    it('should detect code duplication', async () => {
      const duplicatedCode = `
        function calculateTax(amount) {
          const taxRate = 0.15;
          const tax = amount * taxRate;
          return amount + tax;
        }

        function calculateFee(amount) {
          const feeRate = 0.15;
          const fee = amount * feeRate;
          return amount + fee;
        }
      `;

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({
          files: [{
            id: 'dup-1',
            name: 'duplicated.js',
            content: duplicatedCode,
            language: 'javascript'
          }]
        });

      expect(response.status).toBe(200);

      const duplication = response.body.analysis.analysis.files[0].duplication;
      expect(duplication).toBeDefined();
      expect(duplication.percentage).toBeGreaterThanOrEqual(0);
      expect(duplication.blocks).toBeDefined();
    });
  });

  describe('GET /api/analysis/:id/dependencies', () => {
    it('should return dependency graph for analyzed project', async () => {
      // First, analyze some files
      const analysisResponse = await request(app)
        .post('/api/analyze/deep')
        .send({
          files: [
            { id: '1', name: 'index.js', content: 'import "./app"', language: 'javascript' },
            { id: '2', name: 'app.js', content: 'export default {}', language: 'javascript' }
          ]
        });

      const analysisId = analysisResponse.body.id;

      // Then get dependency graph
      const response = await request(app)
        .get(`/api/analysis/${analysisId}/dependencies`);

      expect(response.status).toBe(200);
      expect(response.body.nodes).toHaveLength(2);
      expect(response.body.edges).toHaveLength(1);
      expect(response.body.visualizationData).toBeDefined();
    });
  });

  describe('GET /api/analysis/:id/architecture', () => {
    it('should detect architecture patterns', async () => {
      // Simulate MVC pattern files
      const modelFile = `
        export class UserModel {
          constructor() { this.data = {}; }
          save() { /* save to db */ }
        }
      `;

      const viewFile = `
        import React from 'react';
        export function UserView({ user }) {
          return <div>{user.name}</div>;
        }
      `;

      const controllerFile = `
        import { UserModel } from './model';
        import { UserView } from './view';

        export class UserController {
          constructor() {
            this.model = new UserModel();
          }

          render() {
            return UserView({ user: this.model.data });
          }
        }
      `;

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({
          files: [
            { id: '1', name: 'UserModel.js', content: modelFile, language: 'javascript' },
            { id: '2', name: 'UserView.jsx', content: viewFile, language: 'javascript' },
            { id: '3', name: 'UserController.js', content: controllerFile, language: 'javascript' }
          ]
        });

      expect(response.status).toBe(200);

      const patterns = response.body.analysis.analysis.architecturePatterns;
      expect(patterns).toContainEqual(
        expect.objectContaining({
          type: 'MVC',
          confidence: expect.any(Number)
        })
      );
    });
  });

  describe('Real Project Analysis', () => {
    it('should analyze CodeVisualizer backend code itself', async () => {
      // Read our own backend code
      const appPath = path.join(__dirname, '../../app.ts');
      const appCode = fs.readFileSync(appPath, 'utf-8');

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({
          files: [{
            id: 'self-analysis',
            name: 'app.ts',
            content: appCode,
            language: 'typescript'
          }]
        });

      expect(response.status).toBe(200);

      const analysis = response.body.analysis.analysis;
      expect(analysis.files[0].imports.length).toBeGreaterThan(5);
      expect(analysis.files[0].exports.length).toBeGreaterThan(0);
      expect(analysis.files[0].endpoints).toBeDefined();
      expect(analysis.files[0].endpoints).toContainEqual(
        expect.objectContaining({
          method: 'POST',
          path: '/api/upload'
        })
      );
    });
  });

  describe('Performance Tests', () => {
    it('should analyze 100+ lines of code in under 1 second', async () => {
      const largeCode = `
        ${Array(100).fill(0).map((_, i) => `
          function func${i}() {
            const var${i} = ${i};
            return var${i} * 2;
          }
        `).join('\n')}
      `;

      const startTime = Date.now();

      const response = await request(app)
        .post('/api/analyze/deep')
        .send({
          files: [{
            id: 'perf-test',
            name: 'large.js',
            content: largeCode,
            language: 'javascript'
          }]
        });

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000);
      expect(response.body.analysis.analysis.files[0].functions).toHaveLength(100);
    });
  });
});

// API Contract Tests - Ensure frontend and backend agree on data structure
describe('API Contract Validation', () => {
  it('should return analysis data in expected format for frontend', async () => {
    const response = await request(app)
      .post('/api/analyze/deep')
      .send({
        files: [{
          id: 'contract-test',
          name: 'test.js',
          content: 'const x = 1;',
          language: 'javascript'
        }]
      });

    expect(response.status).toBe(200);

    // Validate response structure matches frontend expectations
    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        analysis: expect.objectContaining({
          analysis: expect.objectContaining({
            files: expect.arrayContaining([
              expect.objectContaining({
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
              })
            ])
          })
        }),
        dependencies: expect.objectContaining({
          nodes: expect.any(Array),
          edges: expect.any(Array)
        })
      })
    );
  });
});