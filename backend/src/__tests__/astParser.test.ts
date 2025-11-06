import { parseCode } from '../services/astParser';

describe('AST Parser Service', () => {
  describe('JavaScript Parsing', () => {
    test('should parse simple JavaScript', () => {
      const code = 'const x = 5; console.log(x);';
      const result = parseCode(code, 'javascript');

      expect(result).toHaveProperty('imports');
      expect(result).toHaveProperty('exports');
      expect(result).toHaveProperty('functions');
      expect(result).toHaveProperty('classes');
    });

    test('should parse ES6 imports', () => {
      const code = `
        import React from 'react';
        import { useState } from 'react';
        import * as utils from './utils';
      `;
      const result = parseCode(code, 'javascript');

      expect(result.imports).toHaveLength(3);
      expect(result.imports[0].module).toBe('react');
    });

    test('should handle malformed JavaScript gracefully', () => {
      const code = 'const x = {'; // Intentionally broken

      // Should not throw, should return partial results
      expect(() => parseCode(code, 'javascript')).not.toThrow();
      const result = parseCode(code, 'javascript');
      expect(result).toBeDefined();
    });
  });

  describe('TypeScript/TSX Parsing', () => {
    test('should parse TypeScript interfaces', () => {
      const code = `
        interface User {
          id: string;
          name: string;
        }
        const user: User = { id: '1', name: 'Test' };
      `;
      const result = parseCode(code, 'typescript');

      expect(result).toBeDefined();
      expect(result.functions).toBeDefined();
    });

    test('should parse TSX components correctly', () => {
      const code = `
        import React from 'react';

        interface Props {
          title: string;
        }

        export const Component: React.FC<Props> = ({ title }) => {
          return <div>{title}</div>;
        };
      `;
      const result = parseCode(code, 'tsx');

      expect(result.imports).toHaveLength(1);
      expect(result.exports).toHaveLength(1);
      expect(result.exports[0].name).toBe('Component');
    });

    test('should handle JSX syntax without errors', () => {
      const code = `
        export default function App() {
          return (
            <div className="app">
              <h1>Hello World</h1>
              <button onClick={() => console.log('clicked')}>
                Click me
              </button>
            </div>
          );
        }
      `;

      // Should not throw TSError: '>' expected
      expect(() => parseCode(code, 'tsx')).not.toThrow();
      const result = parseCode(code, 'tsx');

      expect(result.functions).toHaveLength(1);
      expect(result.functions[0].name).toBe('App');
    });

    test('should detect TSX file type correctly', () => {
      const jsxCode = '<div>Hello</div>';
      const tsxCode = 'const x: string = "test"; return <div>{x}</div>';

      // Both should be parsed without errors
      expect(() => parseCode(jsxCode, 'jsx')).not.toThrow();
      expect(() => parseCode(tsxCode, 'tsx')).not.toThrow();
    });
  });

  describe('File Type Detection', () => {
    test('should NOT parse JSON files as JavaScript', () => {
      const jsonContent = '{"name": "test", "version": "1.0.0"}';

      // Should handle JSON content gracefully
      const result = parseCode(jsonContent, 'javascript');
      expect(result).toBeDefined();
      expect(result.imports).toEqual([]);
    });

    test('should handle file extensions correctly', () => {
      const fileTypes = [
        { ext: 'js', language: 'javascript' },
        { ext: 'jsx', language: 'jsx' },
        { ext: 'ts', language: 'typescript' },
        { ext: 'tsx', language: 'tsx' },
      ];

      fileTypes.forEach(({ ext, language }) => {
        const code = 'const x = 1;';
        expect(() => parseCode(code, language as any)).not.toThrow();
      });
    });
  });

  describe('Complex Code Structures', () => {
    test('should parse nested functions and classes', () => {
      const code = `
        class OuterClass {
          constructor() {
            this.value = 10;
          }

          outerMethod() {
            const innerFunction = () => {
              return this.value * 2;
            };
            return innerFunction();
          }
        }

        function topLevelFunction() {
          const nested = function() {
            return 'nested';
          };
          return nested();
        }
      `;

      const result = parseCode(code, 'javascript');

      expect(result.classes).toHaveLength(1);
      expect(result.classes[0].name).toBe('OuterClass');
      expect(result.functions.length).toBeGreaterThanOrEqual(1);
    });

    test('should extract async/generator functions', () => {
      const code = `
        async function fetchData() {
          return await fetch('/api/data');
        }

        function* generator() {
          yield 1;
          yield 2;
        }
      `;

      const result = parseCode(code, 'javascript');

      const asyncFunc = result.functions.find(f => f.name === 'fetchData');
      const genFunc = result.functions.find(f => f.name === 'generator');

      expect(asyncFunc?.async).toBe(true);
      expect(genFunc?.generator).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    test('should recover from syntax errors and continue parsing', () => {
      const code = `
        function validFunction() {
          return 'valid';
        }

        this is invalid syntax

        function anotherValidFunction() {
          return 'also valid';
        }
      `;

      const result = parseCode(code, 'javascript');

      // Should still extract valid functions despite syntax error
      expect(result.functions.length).toBeGreaterThanOrEqual(1);
    });

    test('should handle empty files', () => {
      const result = parseCode('', 'javascript');

      expect(result).toBeDefined();
      expect(result.imports).toEqual([]);
      expect(result.exports).toEqual([]);
      expect(result.functions).toEqual([]);
      expect(result.classes).toEqual([]);
    });

    test('should handle very large files without timeout', () => {
      const largeCode = Array(10000).fill('const x = 1;').join('\n');

      const startTime = Date.now();
      const result = parseCode(largeCode, 'javascript');
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});