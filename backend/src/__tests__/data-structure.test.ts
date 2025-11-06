import { ASTParser } from '../services/astParser';
import { DependencyAnalyzer } from '../services/dependencyAnalyzer';
import { MetricsCalculator } from '../services/metricsCalculator';
import { ArchitectureDetector } from '../services/architectureDetector';
import { AnalysisFile, ParsedFile, AnalysisResult } from '../../../shared/types/analysis';

describe('Data Structure Consistency Tests', () => {
  let astParser: ASTParser;
  let dependencyAnalyzer: DependencyAnalyzer;
  let metricsCalculator: MetricsCalculator;
  let architectureDetector: ArchitectureDetector;

  beforeEach(() => {
    astParser = new ASTParser();
    dependencyAnalyzer = new DependencyAnalyzer();
    metricsCalculator = new MetricsCalculator();
    architectureDetector = new ArchitectureDetector();
  });

  describe('AnalysisFile Structure Validation', () => {
    it('should maintain consistent AnalysisFile structure', () => {
      const validFile: AnalysisFile = {
        id: 'test-file-1',
        name: 'test.js',
        content: 'console.log("test");',
        language: 'javascript'
      };

      // All required fields should be present
      expect(validFile.id).toBeDefined();
      expect(validFile.name).toBeDefined();
      expect(validFile.content).toBeDefined();
      expect(validFile.language).toBeDefined();

      // Types should be correct
      expect(typeof validFile.id).toBe('string');
      expect(typeof validFile.name).toBe('string');
      expect(typeof validFile.content).toBe('string');
      expect(typeof validFile.language).toBe('string');
    });

    it('should handle optional path field consistently', () => {
      const fileWithPath: AnalysisFile = {
        id: 'test-file-2',
        name: 'utils.js',
        content: 'export const helper = () => {};',
        language: 'javascript',
        path: 'src/utils.js'
      };

      const fileWithoutPath: AnalysisFile = {
        id: 'test-file-3',
        name: 'index.js',
        content: 'console.log("main");',
        language: 'javascript'
      };

      expect(fileWithPath.path).toBe('src/utils.js');
      expect(fileWithoutPath.path).toBeUndefined();
    });

    it('should validate language field values', () => {
      const supportedLanguages: AnalysisFile['language'][] = [
        'javascript', 'jsx', 'typescript', 'tsx', 'python', 'java', 'cpp', 'c', 'csharp', 'php', 'ruby', 'go', 'rust'
      ];

      supportedLanguages.forEach(lang => {
        const file: AnalysisFile = {
          id: `file-${lang}`,
          name: `test.${lang}`,
          content: 'test content',
          language: lang
        };

        expect(file.language).toBe(lang);
      });
    });
  });

  describe('ParsedFile Structure Validation', () => {
    it('should ensure ParsedFile extends AnalysisFile correctly', () => {
      const analysisFiles: AnalysisFile[] = [{
        id: 'parsed-test',
        name: 'component.tsx',
        content: `
          import React from 'react';

          interface Props {
            title: string;
          }

          const Component: React.FC<Props> = ({ title }) => {
            const handleClick = () => {
              console.log('clicked');
            };

            return <div onClick={handleClick}>{title}</div>;
          };

          export default Component;
        `,
        language: 'tsx'
      }];

      const parsedFiles = astParser.parseFiles(analysisFiles);
      const parsedFile = parsedFiles[0];

      // Should maintain all AnalysisFile properties
      expect(parsedFile.id).toBe('parsed-test');
      expect(parsedFile.name).toBe('component.tsx');
      expect(parsedFile.content).toBeDefined();
      expect(parsedFile.language).toBe('tsx');

      // Should have additional ParsedFile properties
      expect(parsedFile.functions).toBeDefined();
      expect(Array.isArray(parsedFile.functions)).toBe(true);
      expect(parsedFile.classes).toBeDefined();
      expect(Array.isArray(parsedFile.classes)).toBe(true);
      expect(parsedFile.imports).toBeDefined();
      expect(Array.isArray(parsedFile.imports)).toBe(true);
      expect(parsedFile.exports).toBeDefined();
      expect(Array.isArray(parsedFile.exports)).toBe(true);
      expect(parsedFile.complexity).toBeDefined();
      expect(typeof parsedFile.complexity).toBe('number');
      expect(parsedFile.metrics).toBeDefined();
      expect(typeof parsedFile.metrics).toBe('object');
    });

    it('should have consistent metrics structure', () => {
      const analysisFiles: AnalysisFile[] = [{
        id: 'metrics-test',
        name: 'test.js',
        content: `
          function complexFunction(a, b, c) {
            if (a > 0) {
              if (b > 0) {
                return a + b + c;
              }
              return a + c;
            }
            return c;
          }
        `,
        language: 'javascript'
      }];

      const parsedFiles = astParser.parseFiles(analysisFiles);
      const metrics = parsedFiles[0].metrics;

      expect(metrics).toBeDefined();
      expect(typeof metrics.linesOfCode).toBe('number');
      expect(typeof metrics.cyclomaticComplexity).toBe('number');
      expect(typeof metrics.maintainabilityIndex).toBe('number');
      expect(metrics.linesOfCode).toBeGreaterThan(0);
      expect(metrics.cyclomaticComplexity).toBeGreaterThan(0);
      expect(metrics.maintainabilityIndex).toBeGreaterThanOrEqual(0);
      expect(metrics.maintainabilityIndex).toBeLessThanOrEqual(100);
    });

    it('should have consistent function structure', () => {
      const analysisFiles: AnalysisFile[] = [{
        id: 'function-test',
        name: 'functions.js',
        content: `
          function namedFunction(param1, param2 = 'default') {
            return param1 + param2;
          }

          const arrowFunction = (x, y) => {
            if (x > 0) {
              return x * y;
            }
            return 0;
          };

          class TestClass {
            constructor(value) {
              this.value = value;
            }

            method(input) {
              return this.value + input;
            }
          }
        `,
        language: 'javascript'
      }];

      const parsedFiles = astParser.parseFiles(analysisFiles);
      const functions = parsedFiles[0].functions;

      expect(functions.length).toBeGreaterThan(0);

      functions.forEach(func => {
        expect(typeof func.name).toBe('string');
        expect(typeof func.startLine).toBe('number');
        expect(typeof func.endLine).toBe('number');
        expect(Array.isArray(func.parameters)).toBe(true);
        expect(typeof func.complexity).toBe('number');
        expect(Array.isArray(func.calls)).toBe(true);

        func.parameters.forEach(param => {
          expect(typeof param.name).toBe('string');
          expect(typeof param.optional).toBe('boolean');
        });
      });
    });
  });

  describe('Dependency Graph Structure', () => {
    it('should maintain consistent dependency graph structure', () => {
      const analysisFiles: AnalysisFile[] = [
        {
          id: 'dep-1',
          name: 'utils.js',
          content: `
            export const helper = () => 'help';
            export default function main() { return 'main'; }
          `,
          language: 'javascript'
        },
        {
          id: 'dep-2',
          name: 'component.js',
          content: `
            import { helper } from './utils.js';
            import main from './utils.js';

            export const Component = () => {
              return helper() + main();
            };
          `,
          language: 'javascript'
        }
      ];

      const parsedFiles = astParser.parseFiles(analysisFiles);
      const dependencyGraph = dependencyAnalyzer.analyze(parsedFiles);

      expect(dependencyGraph).toBeDefined();
      expect(dependencyGraph.graph).toBeDefined();
      expect(dependencyGraph.graph.nodes).toBeDefined();
      expect(Array.isArray(dependencyGraph.graph.nodes)).toBe(true);
      expect(dependencyGraph.graph.edges).toBeDefined();
      expect(Array.isArray(dependencyGraph.graph.edges)).toBe(true);

      // Validate node structure
      dependencyGraph.graph.nodes.forEach(node => {
        expect(typeof node.id).toBe('string');
        expect(typeof node.name).toBe('string');
        if (node.group !== undefined) {
          expect(typeof node.group).toBe('number');
        }
      });

      // Validate edge structure
      dependencyGraph.graph.edges.forEach(edge => {
        expect(typeof edge.source).toBe('string');
        expect(typeof edge.target).toBe('string');
        if (edge.type !== undefined) {
          expect(typeof edge.type).toBe('string');
        }
      });
    });

    it('should include metrics in dependency analysis', () => {
      const analysisFiles: AnalysisFile[] = [{
        id: 'metrics-dep',
        name: 'test.js',
        content: 'console.log("test");',
        language: 'javascript'
      }];

      const parsedFiles = astParser.parseFiles(analysisFiles);
      const dependencyGraph = dependencyAnalyzer.analyze(parsedFiles);

      expect(dependencyGraph.metrics).toBeDefined();
      expect(typeof dependencyGraph.metrics.totalDependencies).toBe('number');
      expect(dependencyGraph.metrics.totalDependencies).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Architecture Patterns Structure', () => {
    it('should maintain consistent architecture pattern structure', () => {
      const analysisFiles: AnalysisFile[] = [
        {
          id: 'arch-1',
          name: 'controller.js',
          content: `
            export class UserController {
              constructor(userService) {
                this.userService = userService;
              }

              async getUser(id) {
                return await this.userService.findById(id);
              }
            }
          `,
          language: 'javascript'
        },
        {
          id: 'arch-2',
          name: 'service.js',
          content: `
            export class UserService {
              constructor(repository) {
                this.repository = repository;
              }

              async findById(id) {
                return await this.repository.findOne({ id });
              }
            }
          `,
          language: 'javascript'
        }
      ];

      const parsedFiles = astParser.parseFiles(analysisFiles);
      const patterns = architectureDetector.detectPatterns(parsedFiles);

      expect(Array.isArray(patterns)).toBe(true);

      patterns.forEach(pattern => {
        expect(typeof pattern.type).toBe('string');
        expect(typeof pattern.confidence).toBe('number');
        expect(pattern.confidence).toBeGreaterThanOrEqual(0);
        expect(pattern.confidence).toBeLessThanOrEqual(1);
        expect(typeof pattern.description).toBe('string');

        if (pattern.files) {
          expect(Array.isArray(pattern.files)).toBe(true);
        }
        if (pattern.evidence) {
          expect(Array.isArray(pattern.evidence)).toBe(true);
        }
      });
    });
  });

  describe('Analysis Result Structure Consistency', () => {
    it('should prevent double-nested analysis structure', () => {
      const analysisFiles: AnalysisFile[] = [{
        id: 'nesting-test',
        name: 'test.js',
        content: 'console.log("test");',
        language: 'javascript'
      }];

      const parsedFiles = astParser.parseFiles(analysisFiles);
      const dependencyGraph = dependencyAnalyzer.analyze(parsedFiles);
      const architecturePatterns = architectureDetector.detectPatterns(parsedFiles);

      // Simulate the structure that should be returned by the API
      const analysisResult: AnalysisResult = {
        id: 'test-analysis-id',
        analysis: {
          id: 'test-analysis-id',
          files: parsedFiles,
          architecturePatterns,
          dependencies: dependencyGraph,
          createdAt: new Date()
        },
        dependencies: dependencyGraph,
        processingTime: 100,
        warnings: []
      };

      // Ensure correct structure (not double-nested)
      expect(analysisResult.analysis).toBeDefined();
      expect(analysisResult.analysis.analysis).toBeUndefined(); // Should NOT be double-nested

      // Verify all required fields
      expect(typeof analysisResult.id).toBe('string');
      expect(analysisResult.analysis.id).toBe(analysisResult.id);
      expect(Array.isArray(analysisResult.analysis.files)).toBe(true);
      expect(Array.isArray(analysisResult.analysis.architecturePatterns)).toBe(true);
      expect(analysisResult.analysis.dependencies).toBeDefined();
      expect(analysisResult.analysis.createdAt instanceof Date).toBe(true);
      expect(analysisResult.dependencies).toBeDefined();
      expect(typeof analysisResult.processingTime).toBe('number');
      expect(Array.isArray(analysisResult.warnings)).toBe(true);
    });

    it('should maintain warning structure consistency', () => {
      const warnings = [
        {
          type: 'large_file',
          message: 'File is too large',
          severity: 'medium' as const,
          file: 'large.js',
          suggestion: 'Consider breaking into smaller files'
        },
        {
          type: 'high_complexity',
          message: 'Function has high complexity',
          severity: 'high' as const,
          file: 'complex.js',
          suggestion: 'Refactor to reduce complexity'
        }
      ];

      warnings.forEach(warning => {
        expect(typeof warning.type).toBe('string');
        expect(typeof warning.message).toBe('string');
        expect(['low', 'medium', 'high'].includes(warning.severity)).toBe(true);
        if (warning.file !== undefined) {
          expect(typeof warning.file).toBe('string');
        }
        if (warning.suggestion !== undefined) {
          expect(typeof warning.suggestion).toBe('string');
        }
      });
    });
  });

  describe('Cross-Service Data Consistency', () => {
    it('should maintain file references across all services', () => {
      const analysisFiles: AnalysisFile[] = [
        {
          id: 'cross-1',
          name: 'module1.js',
          content: `
            export const value1 = 'test';
            export function func1() { return value1; }
          `,
          language: 'javascript'
        },
        {
          id: 'cross-2',
          name: 'module2.js',
          content: `
            import { value1, func1 } from './module1.js';
            export const value2 = func1() + ' extended';
          `,
          language: 'javascript'
        }
      ];

      const parsedFiles = astParser.parseFiles(analysisFiles);
      const dependencyGraph = dependencyAnalyzer.analyze(parsedFiles);
      const architecturePatterns = architectureDetector.detectPatterns(parsedFiles);

      // All services should work with the same file references
      expect(parsedFiles.length).toBe(2);
      expect(parsedFiles[0].id).toBe('cross-1');
      expect(parsedFiles[1].id).toBe('cross-2');

      // Dependency graph should reference the same files
      const nodeIds = dependencyGraph.graph.nodes.map(node => node.id);
      expect(nodeIds).toContain('cross-1');
      expect(nodeIds).toContain('cross-2');

      // All data should be consistently typed
      parsedFiles.forEach(file => {
        expect(typeof file.id).toBe('string');
        expect(typeof file.name).toBe('string');
        expect(typeof file.complexity).toBe('number');
      });
    });

    it('should handle empty analysis results consistently', () => {
      const emptyFiles: AnalysisFile[] = [{
        id: 'empty',
        name: 'empty.js',
        content: '',
        language: 'javascript'
      }];

      const parsedFiles = astParser.parseFiles(emptyFiles);
      const dependencyGraph = dependencyAnalyzer.analyze(parsedFiles);
      const architecturePatterns = architectureDetector.detectPatterns(parsedFiles);

      // All services should handle empty content gracefully
      expect(parsedFiles).toHaveLength(1);
      expect(parsedFiles[0].functions).toEqual([]);
      expect(parsedFiles[0].classes).toEqual([]);
      expect(parsedFiles[0].imports).toEqual([]);
      expect(parsedFiles[0].exports).toEqual([]);

      expect(dependencyGraph.graph.nodes).toHaveLength(1);
      expect(dependencyGraph.graph.edges).toEqual([]);

      expect(Array.isArray(architecturePatterns)).toBe(true);
    });
  });

  describe('Type Safety and Validation', () => {
    it('should enforce required fields in analysis files', () => {
      // This test ensures TypeScript compilation catches missing fields
      const validFile: AnalysisFile = {
        id: 'type-test',
        name: 'test.js',
        content: 'console.log("test");',
        language: 'javascript'
      };

      expect(validFile).toBeDefined();

      // Uncomment these to test TypeScript compilation errors:
      // const invalidFile1: AnalysisFile = {
      //   name: 'test.js',
      //   content: 'test',
      //   language: 'javascript'
      //   // Missing 'id' - should cause TypeScript error
      // };

      // const invalidFile2: AnalysisFile = {
      //   id: 'test',
      //   name: 'test.js',
      //   content: 'test',
      //   language: 'invalid-language' // Should cause TypeScript error
      // };
    });

    it('should maintain consistent date handling', () => {
      const now = new Date();
      const analysis = {
        id: 'date-test',
        files: [],
        architecturePatterns: [],
        dependencies: { graph: { nodes: [], edges: [] }, metrics: { totalDependencies: 0 } },
        createdAt: now
      };

      expect(analysis.createdAt instanceof Date).toBe(true);
      expect(analysis.createdAt.getTime()).toBe(now.getTime());

      // Serialization/deserialization should handle dates correctly
      const serialized = JSON.stringify(analysis);
      const deserialized = JSON.parse(serialized);

      // After JSON round-trip, dates become strings
      expect(typeof deserialized.createdAt).toBe('string');
      expect(new Date(deserialized.createdAt).getTime()).toBe(now.getTime());
    });

    it('should handle numeric values consistently', () => {
      const analysisFiles: AnalysisFile[] = [{
        id: 'numeric-test',
        name: 'test.js',
        content: 'function test() { return 1; }',
        language: 'javascript'
      }];

      const parsedFiles = astParser.parseFiles(analysisFiles);
      const file = parsedFiles[0];

      // All numeric values should be finite numbers
      expect(Number.isFinite(file.complexity)).toBe(true);
      expect(Number.isFinite(file.metrics.linesOfCode)).toBe(true);
      expect(Number.isFinite(file.metrics.cyclomaticComplexity)).toBe(true);
      expect(Number.isFinite(file.metrics.maintainabilityIndex)).toBe(true);

      // Should not have NaN or Infinity values
      expect(Number.isNaN(file.complexity)).toBe(false);
      expect(Number.isNaN(file.metrics.linesOfCode)).toBe(false);
      expect(Number.isNaN(file.metrics.cyclomaticComplexity)).toBe(false);
      expect(Number.isNaN(file.metrics.maintainabilityIndex)).toBe(false);
    });
  });
});