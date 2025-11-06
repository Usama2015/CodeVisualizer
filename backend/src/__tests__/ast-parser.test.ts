import { ASTParser } from '../services/astParser';
import { AnalysisFile } from '../../../shared/types/analysis';

describe('AST Parser Service', () => {
  let astParser: ASTParser;

  beforeEach(() => {
    astParser = new ASTParser();
  });

  describe('JavaScript/TypeScript Parsing', () => {
    it('should parse JavaScript files correctly', () => {
      const files: AnalysisFile[] = [
        {
          id: 'js-test',
          name: 'test.js',
          content: `
            function calculateSum(a, b) {
              if (a > 0 && b > 0) {
                return a + b;
              }
              return 0;
            }

            class Calculator {
              constructor() {
                this.result = 0;
              }

              add(value) {
                this.result += value;
                return this;
              }
            }

            export { calculateSum, Calculator };
          `,
          language: 'javascript'
        }
      ];

      const result = astParser.parseFiles(files);

      expect(result).toHaveLength(1);
      const parsed = result[0];

      expect(parsed.functions).toHaveLength(2); // calculateSum and constructor
      expect(parsed.classes).toHaveLength(1);
      expect(parsed.exports).toHaveLength(1);
      expect(parsed.complexity).toBeGreaterThan(0);
      expect(parsed.metrics.linesOfCode).toBeGreaterThan(0);
    });

    it('should parse TypeScript files correctly', () => {
      const files: AnalysisFile[] = [
        {
          id: 'ts-test',
          name: 'test.ts',
          content: `
            interface User {
              id: number;
              name: string;
              email?: string;
            }

            class UserService {
              private users: User[] = [];

              constructor(private apiUrl: string) {}

              async getUser(id: number): Promise<User | null> {
                const user = this.users.find(u => u.id === id);
                if (!user) {
                  try {
                    const response = await fetch(\`\${this.apiUrl}/users/\${id}\`);
                    return await response.json();
                  } catch (error) {
                    console.error('Failed to fetch user:', error);
                    return null;
                  }
                }
                return user;
              }

              addUser(user: User): void {
                this.users.push(user);
              }
            }

            export default UserService;
          `,
          language: 'typescript'
        }
      ];

      const result = astParser.parseFiles(files);

      expect(result).toHaveLength(1);
      const parsed = result[0];

      expect(parsed.classes).toHaveLength(1);
      expect(parsed.functions.length).toBeGreaterThan(0);
      expect(parsed.exports).toHaveLength(1);
      expect(parsed.complexity).toBeGreaterThan(0);
    });

    it('should parse TSX files without errors', () => {
      const files: AnalysisFile[] = [
        {
          id: 'tsx-test',
          name: 'Component.tsx',
          content: `
            import React, { useState, useEffect } from 'react';

            interface Props {
              title: string;
              onSubmit?: (data: string) => void;
            }

            const FormComponent: React.FC<Props> = ({ title, onSubmit }) => {
              const [value, setValue] = useState<string>('');
              const [isValid, setIsValid] = useState<boolean>(false);

              useEffect(() => {
                setIsValid(value.length > 0);
              }, [value]);

              const handleSubmit = (e: React.FormEvent) => {
                e.preventDefault();
                if (isValid && onSubmit) {
                  onSubmit(value);
                  setValue('');
                }
              };

              return (
                <form onSubmit={handleSubmit}>
                  <h2>{title}</h2>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Enter text"
                  />
                  <button type="submit" disabled={!isValid}>
                    Submit
                  </button>
                </form>
              );
            };

            export default FormComponent;
          `,
          language: 'tsx'
        }
      ];

      const result = astParser.parseFiles(files);

      expect(result).toHaveLength(1);
      const parsed = result[0];

      expect(parsed.name).toBe('Component.tsx');
      expect(parsed.language).toBe('tsx');
      expect(parsed.functions.length).toBeGreaterThan(0);
      expect(parsed.imports).toHaveLength(1);
      expect(parsed.exports).toHaveLength(1);
    });

    it('should handle JSX syntax correctly', () => {
      const files: AnalysisFile[] = [
        {
          id: 'jsx-test',
          name: 'Component.jsx',
          content: `
            import React from 'react';

            function Welcome({ name, children }) {
              const greeting = \`Hello, \${name}!\`;

              return (
                <div className="welcome">
                  <h1>{greeting}</h1>
                  {children && (
                    <div className="content">
                      {children}
                    </div>
                  )}
                </div>
              );
            }

            export default Welcome;
          `,
          language: 'jsx'
        }
      ];

      const result = astParser.parseFiles(files);

      expect(result).toHaveLength(1);
      const parsed = result[0];

      expect(parsed.name).toBe('Component.jsx');
      expect(parsed.functions).toHaveLength(1);
      expect(parsed.functions[0].name).toBe('Welcome');
      expect(parsed.imports).toHaveLength(1);
      expect(parsed.exports).toHaveLength(1);
    });
  });

  describe('Python Parsing', () => {
    it('should parse Python files correctly', () => {
      const files: AnalysisFile[] = [
        {
          id: 'py-test',
          name: 'calculator.py',
          content: `
            import math
            from typing import List, Optional

            class Calculator:
                def __init__(self):
                    self.history: List[float] = []

                def add(self, a: float, b: float) -> float:
                    result = a + b
                    self.history.append(result)
                    return result

                def multiply(self, a: float, b: float) -> float:
                    if a == 0 or b == 0:
                        return 0
                    result = a * b
                    self.history.append(result)
                    return result

                def get_history(self) -> List[float]:
                    return self.history.copy()

            def factorial(n: int) -> int:
                if n <= 1:
                    return 1
                else:
                    return n * factorial(n - 1)

            def is_prime(num: int) -> bool:
                if num < 2:
                    return False
                for i in range(2, int(math.sqrt(num)) + 1):
                    if num % i == 0:
                        return False
                return True
          `,
          language: 'python'
        }
      ];

      const result = astParser.parseFiles(files);

      expect(result).toHaveLength(1);
      const parsed = result[0];

      expect(parsed.name).toBe('calculator.py');
      expect(parsed.language).toBe('python');
      expect(parsed.functions.length).toBeGreaterThan(0);
      expect(parsed.classes).toHaveLength(1);
      expect(parsed.imports.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle syntax errors gracefully', () => {
      const files: AnalysisFile[] = [
        {
          id: 'syntax-error',
          name: 'broken.js',
          content: `
            function broken( {
              // Missing closing parenthesis and brace
              console.log("This will not parse"
          `,
          language: 'javascript'
        }
      ];

      const result = astParser.parseFiles(files);

      expect(result).toHaveLength(1);
      const parsed = result[0];

      // Should still return a result even with syntax errors
      expect(parsed.name).toBe('broken.js');
      expect(parsed.functions).toEqual([]);
      expect(parsed.classes).toEqual([]);
    });

    it('should handle empty files', () => {
      const files: AnalysisFile[] = [
        {
          id: 'empty',
          name: 'empty.js',
          content: '',
          language: 'javascript'
        }
      ];

      const result = astParser.parseFiles(files);

      expect(result).toHaveLength(1);
      const parsed = result[0];

      expect(parsed.name).toBe('empty.js');
      expect(parsed.functions).toEqual([]);
      expect(parsed.classes).toEqual([]);
      expect(parsed.complexity).toBe(0);
      expect(parsed.metrics.linesOfCode).toBe(0);
    });

    it('should handle unsupported file types', () => {
      const files: AnalysisFile[] = [
        {
          id: 'unsupported',
          name: 'data.xml',
          content: '<root><item>test</item></root>',
          language: 'xml'
        }
      ];

      const result = astParser.parseFiles(files);

      expect(result).toHaveLength(1);
      const parsed = result[0];

      expect(parsed.name).toBe('data.xml');
      expect(parsed.functions).toEqual([]);
      expect(parsed.classes).toEqual([]);
    });

    it('should handle very large files', () => {
      const largeContent = 'console.log("line");\\n'.repeat(10000);

      const files: AnalysisFile[] = [
        {
          id: 'large',
          name: 'large.js',
          content: largeContent,
          language: 'javascript'
        }
      ];

      const result = astParser.parseFiles(files);

      expect(result).toHaveLength(1);
      const parsed = result[0];

      expect(parsed.name).toBe('large.js');
      expect(parsed.metrics.linesOfCode).toBeGreaterThan(9000);
    });
  });

  describe('Complexity Calculation', () => {
    it('should calculate cyclomatic complexity correctly', () => {
      const files: AnalysisFile[] = [
        {
          id: 'complex',
          name: 'complex.js',
          content: `
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
                if (b > 0) {
                  return b;
                } else {
                  return 0;
                }
              }
            }

            function simpleFunction(x) {
              return x * 2;
            }
          `,
          language: 'javascript'
        }
      ];

      const result = astParser.parseFiles(files);

      expect(result).toHaveLength(1);
      const parsed = result[0];

      expect(parsed.complexity).toBeGreaterThan(1);
      expect(parsed.functions).toHaveLength(2);

      const complexFn = parsed.functions.find(f => f.name === 'complexFunction');
      const simpleFn = parsed.functions.find(f => f.name === 'simpleFunction');

      expect(complexFn?.complexity).toBeGreaterThan(simpleFn?.complexity || 0);
    });

    it('should handle switch statements in complexity calculation', () => {
      const files: AnalysisFile[] = [
        {
          id: 'switch',
          name: 'switch.js',
          content: `
            function handleAction(action) {
              switch (action.type) {
                case 'ADD':
                  return state.count + 1;
                case 'SUBTRACT':
                  return state.count - 1;
                case 'MULTIPLY':
                  return state.count * action.payload;
                case 'DIVIDE':
                  if (action.payload !== 0) {
                    return state.count / action.payload;
                  }
                  return state.count;
                default:
                  return state.count;
              }
            }
          `,
          language: 'javascript'
        }
      ];

      const result = astParser.parseFiles(files);

      expect(result).toHaveLength(1);
      const parsed = result[0];

      expect(parsed.complexity).toBeGreaterThan(1);
      const fn = parsed.functions.find(f => f.name === 'handleAction');
      expect(fn?.complexity).toBeGreaterThan(3); // Switch adds complexity
    });
  });

  describe('Import/Export Detection', () => {
    it('should detect various import styles', () => {
      const files: AnalysisFile[] = [
        {
          id: 'imports',
          name: 'imports.js',
          content: `
            import React from 'react';
            import { useState, useEffect } from 'react';
            import * as utils from './utils';
            import('./dynamic-module').then(module => {
              // Dynamic import
            });

            const module = require('./legacy-module');
            const { helper } = require('./helpers');
          `,
          language: 'javascript'
        }
      ];

      const result = astParser.parseFiles(files);

      expect(result).toHaveLength(1);
      const parsed = result[0];

      expect(parsed.imports.length).toBeGreaterThan(0);

      // Should detect various import types
      const importSources = parsed.imports.map(imp => imp.source);
      expect(importSources).toContain('react');
      expect(importSources).toContain('./utils');
    });

    it('should detect various export styles', () => {
      const files: AnalysisFile[] = [
        {
          id: 'exports',
          name: 'exports.js',
          content: `
            export const CONSTANT = 'value';
            export function namedFunction() {}
            export class NamedClass {}

            const internalFunction = () => {};
            const InternalClass = class {};

            export { internalFunction, InternalClass };
            export default function defaultFunction() {}

            module.exports = { legacy: true };
          `,
          language: 'javascript'
        }
      ];

      const result = astParser.parseFiles(files);

      expect(result).toHaveLength(1);
      const parsed = result[0];

      expect(parsed.exports.length).toBeGreaterThan(0);

      // Should detect various export types
      const exportNames = parsed.exports.map(exp => exp.name);
      expect(exportNames).toContain('CONSTANT');
      expect(exportNames).toContain('namedFunction');
      expect(exportNames).toContain('NamedClass');
    });
  });

  describe('Specific Bug Prevention Tests', () => {
    it('should handle malformed TSX without crashing', () => {
      const files: AnalysisFile[] = [
        {
          id: 'malformed-tsx',
          name: 'broken.tsx',
          content: `
            import React from 'react';

            const Component = () => {
              return (
                <div>
                  <p>Missing closing tag
                </div>
              );
            };

            export default Component;
          `,
          language: 'tsx'
        }
      ];

      // Should not throw an error
      expect(() => {
        const result = astParser.parseFiles(files);
        expect(result).toHaveLength(1);
      }).not.toThrow();
    });

    it('should handle files with BOM (Byte Order Mark)', () => {
      const files: AnalysisFile[] = [
        {
          id: 'bom-file',
          name: 'bom.js',
          content: '\\uFEFFconsole.log("File with BOM");', // BOM character
          language: 'javascript'
        }
      ];

      const result = astParser.parseFiles(files);

      expect(result).toHaveLength(1);
      const parsed = result[0];

      expect(parsed.name).toBe('bom.js');
      expect(parsed.metrics.linesOfCode).toBeGreaterThan(0);
    });

    it('should handle files with different line endings', () => {
      const files: AnalysisFile[] = [
        {
          id: 'line-endings',
          name: 'mixed.js',
          content: 'function test1() {}\\r\\nfunction test2() {}\\nfunction test3() {}\\r',
          language: 'javascript'
        }
      ];

      const result = astParser.parseFiles(files);

      expect(result).toHaveLength(1);
      const parsed = result[0];

      expect(parsed.functions).toHaveLength(3);
    });

    it('should maintain consistent metrics across runs', () => {
      const files: AnalysisFile[] = [
        {
          id: 'consistent',
          name: 'test.js',
          content: `
            function calculate(a, b) {
              if (a > 0) {
                return a + b;
              }
              return b;
            }
          `,
          language: 'javascript'
        }
      ];

      const result1 = astParser.parseFiles(files);
      const result2 = astParser.parseFiles(files);

      expect(result1[0].complexity).toBe(result2[0].complexity);
      expect(result1[0].metrics.linesOfCode).toBe(result2[0].metrics.linesOfCode);
      expect(result1[0].functions.length).toBe(result2[0].functions.length);
    });
  });

  describe('Performance Tests', () => {
    it('should process multiple files efficiently', () => {
      const files: AnalysisFile[] = Array.from({ length: 50 }, (_, i) => ({
        id: `file-${i}`,
        name: `file${i}.js`,
        content: `
          function process${i}(data) {
            if (data) {
              return data.map(item => item * ${i});
            }
            return [];
          }

          export default process${i};
        `,
        language: 'javascript'
      }));

      const startTime = performance.now();
      const result = astParser.parseFiles(files);
      const endTime = performance.now();

      expect(result).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds

      // All files should be parsed
      result.forEach((parsed, index) => {
        expect(parsed.name).toBe(`file${index}.js`);
        expect(parsed.functions.length).toBeGreaterThan(0);
      });
    });
  });
});