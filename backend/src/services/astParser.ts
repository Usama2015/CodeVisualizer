import { parse, TSESTree } from '@typescript-eslint/typescript-estree';
import { parse as acornParse } from 'acorn';
import { simple as walkSimple } from 'acorn-walk';
import {
  AnalysisFile,
  DeepAnalyzedFile,
  ImportInfo,
  ExportInfo,
  FunctionInfo,
  ClassInfo,
  ParameterInfo,
  PropertyInfo,
  EndpointInfo
} from '../../../shared/types/analysis';

export class ASTParser {
  private calculateCyclomaticComplexity(node: any): number {
    let complexity = 1; // Base complexity

    const countComplexityNodes = (node: any) => {
      if (!node) return;

      switch (node.type) {
        case 'IfStatement':
        case 'ConditionalExpression':
        case 'SwitchCase':
        case 'WhileStatement':
        case 'DoWhileStatement':
        case 'ForStatement':
        case 'ForInStatement':
        case 'ForOfStatement':
          complexity++;
          break;
        case 'LogicalExpression':
          if (node.operator === '&&' || node.operator === '||') {
            complexity++;
          }
          break;
        case 'CatchClause':
          complexity++;
          break;
      }

      // Recursively check child nodes
      for (const key in node) {
        if (node[key] && typeof node[key] === 'object') {
          if (Array.isArray(node[key])) {
            node[key].forEach((child: any) => countComplexityNodes(child));
          } else if (node[key].type) {
            countComplexityNodes(node[key]);
          }
        }
      }
    };

    countComplexityNodes(node);
    return complexity;
  }

  private extractParameters(params: any[]): ParameterInfo[] {
    return params.map(param => {
      let name = '';
      let optional = false;
      let type: string | undefined;
      let defaultValue: string | undefined;

      if (param.type === 'Identifier') {
        name = param.name;
      } else if (param.type === 'AssignmentPattern') {
        name = param.left.name;
        optional = true;
        defaultValue = this.nodeToString(param.right);
      } else if (param.type === 'RestElement') {
        name = '...' + param.argument.name;
      }

      // Extract TypeScript type annotations
      if (param.typeAnnotation) {
        type = this.nodeToString(param.typeAnnotation.typeAnnotation);
      }

      return {
        name,
        type,
        optional,
        defaultValue
      };
    });
  }

  private nodeToString(node: any): string {
    if (!node || !node.type) return '';

    try {
      switch (node.type) {
        case 'Identifier':
          return node.name || '';
        case 'Literal':
          return String(node.value || '');
      case 'TemplateLiteral':
        return '`template`';
      case 'ArrayExpression':
        return '[]';
      case 'ObjectExpression':
        return '{}';
      case 'ArrowFunctionExpression':
      case 'FunctionExpression':
        return 'function';
      case 'CallExpression':
        return this.nodeToString(node.callee) + '()';
      case 'MemberExpression':
        return this.nodeToString(node.object) + '.' + this.nodeToString(node.property);
      case 'TSStringKeyword':
        return 'string';
      case 'TSNumberKeyword':
        return 'number';
      case 'TSBooleanKeyword':
        return 'boolean';
      case 'TSAnyKeyword':
        return 'any';
        case 'TSTypeReference':
          return node.typeName ? this.nodeToString(node.typeName) : 'unknown';
        default:
          return node.type || 'unknown';
      }
    } catch (error) {
      return '';
    }
  }

  private extractImports(ast: any): ImportInfo[] {
    const imports: ImportInfo[] = [];

    const walkNode = (node: any) => {
      if (!node || !node.type) return;

      if (node.type === 'ImportDeclaration') {
        const importInfo: ImportInfo = {
          module: node.source.value,
          imports: [],
          isDefault: false,
          line: node.loc ? node.loc.start.line : 0
        };

        if (node.specifiers) {
          node.specifiers.forEach((spec: any) => {
            if (spec.type === 'ImportDefaultSpecifier') {
              importInfo.isDefault = true;
              importInfo.imports.push(spec.local.name);
            } else if (spec.type === 'ImportSpecifier') {
              importInfo.imports.push(spec.imported.name);
              if (spec.local.name !== spec.imported.name) {
                importInfo.alias = spec.local.name;
              }
            } else if (spec.type === 'ImportNamespaceSpecifier') {
              importInfo.imports.push('*');
              importInfo.alias = spec.local.name;
            }
          });
        }

        imports.push(importInfo);
      }

      // Handle require() calls for CommonJS
      if (node.type === 'VariableDeclarator' &&
          node.init &&
          node.init.type === 'CallExpression' &&
          node.init.callee &&
          node.init.callee.name === 'require') {

        const module = node.init.arguments[0]?.value;
        if (module) {
          const importInfo: ImportInfo = {
            module,
            imports: [node.id.name],
            isDefault: true,
            line: node.loc ? node.loc.start.line : 0
          };
          imports.push(importInfo);
        }
      }

      // Recursively walk child nodes
      for (const key in node) {
        const child = node[key];
        if (child && typeof child === 'object') {
          if (Array.isArray(child)) {
            child.forEach(walkNode);
          } else if (child.type) {
            walkNode(child);
          }
        }
      }
    };

    walkNode(ast);
    return imports;
  }

  private extractExports(ast: any): ExportInfo[] {
    const exports: ExportInfo[] = [];

    const walkNode = (node: any) => {
      if (!node || !node.type) return;

      if (node.type === 'ExportNamedDeclaration') {
        if (node.declaration) {
          // export function name() {} or export class Name {}
          if (node.declaration.type === 'FunctionDeclaration' && node.declaration.id) {
            exports.push({
              name: node.declaration.id.name,
              isDefault: false,
              type: 'function',
              line: node.loc ? node.loc.start.line : 0
            });
          } else if (node.declaration.type === 'ClassDeclaration' && node.declaration.id) {
            exports.push({
              name: node.declaration.id.name,
              isDefault: false,
              type: 'class',
              line: node.loc ? node.loc.start.line : 0
            });
          } else if (node.declaration.type === 'VariableDeclaration' && node.declaration.declarations) {
            node.declaration.declarations.forEach((decl: any) => {
              if (decl.id && decl.id.name) {
                exports.push({
                  name: decl.id.name,
                isDefault: false,
                type: 'variable',
                  line: node.loc ? node.loc.start.line : 0
                });
              }
            });
          }
        } else if (node.specifiers) {
          // export { name1, name2 }
          node.specifiers.forEach((spec: any) => {
            if (spec.exported && spec.exported.name) {
              exports.push({
                name: spec.exported.name,
              isDefault: false,
              type: 'variable',
                line: node.loc ? node.loc.start.line : 0
              });
            }
          });
        }
      } else if (node.type === 'ExportDefaultDeclaration') {
        let name = 'default';
        let type: 'function' | 'class' | 'variable' | 'type' = 'variable';

        if (node.declaration.type === 'FunctionDeclaration') {
          name = node.declaration.id?.name || 'default';
          type = 'function';
        } else if (node.declaration.type === 'ClassDeclaration') {
          name = node.declaration.id?.name || 'default';
          type = 'class';
        }

        exports.push({
          name,
          isDefault: true,
          type,
          line: node.loc ? node.loc.start.line : 0
        });
      }

      // Handle module.exports for CommonJS
      if (node.type === 'AssignmentExpression' &&
          node.left && node.left.type === 'MemberExpression' &&
          node.left.object && node.left.object.name === 'module' &&
          node.left.property && node.left.property.name === 'exports') {

        exports.push({
          name: 'module.exports',
          isDefault: true,
          type: 'variable',
          line: node.loc ? node.loc.start.line : 0
        });
      }

      // Recursively walk child nodes
      for (const key in node) {
        const child = node[key];
        if (child && typeof child === 'object') {
          if (Array.isArray(child)) {
            child.forEach(walkNode);
          } else if (child.type) {
            walkNode(child);
          }
        }
      }
    };

    walkNode(ast);
    return exports;
  }

  private extractFunctions(ast: any): FunctionInfo[] {
    const functions: FunctionInfo[] = [];

    const walkNode = (node: any) => {
      if (!node || !node.type) return;

      if (node.type === 'FunctionDeclaration' ||
          node.type === 'FunctionExpression' ||
          node.type === 'ArrowFunctionExpression') {

        const name = node.id?.name ||
                    (node.type === 'ArrowFunctionExpression' ? 'anonymous' : 'anonymous');

        const functionInfo: FunctionInfo = {
          name,
          startLine: node.loc ? node.loc.start.line : 0,
          endLine: node.loc ? node.loc.end.line : 0,
          parameters: this.extractParameters(node.params || []),
          complexity: this.calculateCyclomaticComplexity(node),
          calls: this.extractFunctionCalls(node),
          async: node.async || false,
          generator: node.generator || false
        };

        functions.push(functionInfo);
      }

      // Handle method definitions in classes
      if (node.type === 'MethodDefinition') {
        const functionInfo: FunctionInfo = {
          name: this.nodeToString(node.key),
          startLine: node.loc ? node.loc.start.line : 0,
          endLine: node.loc ? node.loc.end.line : 0,
          parameters: this.extractParameters(node.value.params || []),
          complexity: this.calculateCyclomaticComplexity(node.value),
          calls: this.extractFunctionCalls(node.value),
          async: node.value.async || false,
          generator: node.value.generator || false
        };

        functions.push(functionInfo);
      }

      // Recursively walk child nodes
      for (const key in node) {
        const child = node[key];
        if (child && typeof child === 'object') {
          if (Array.isArray(child)) {
            child.forEach(walkNode);
          } else if (child.type) {
            walkNode(child);
          }
        }
      }
    };

    walkNode(ast);
    return functions;
  }

  private extractFunctionCalls(node: any): string[] {
    const calls: string[] = [];

    const walkNode = (node: any) => {
      if (!node || !node.type) return;

      if (node.type === 'CallExpression') {
        const callName = this.nodeToString(node.callee);
        if (callName && !calls.includes(callName)) {
          calls.push(callName);
        }
      }

      // Recursively walk child nodes
      for (const key in node) {
        const child = node[key];
        if (child && typeof child === 'object') {
          if (Array.isArray(child)) {
            child.forEach(walkNode);
          } else if (child.type) {
            walkNode(child);
          }
        }
      }
    };

    walkNode(node);
    return calls;
  }

  private extractClasses(ast: any): ClassInfo[] {
    const classes: ClassInfo[] = [];

    const walkNode = (node: any) => {
      if (!node || !node.type) return;

      if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
        const className = node.id?.name || 'anonymous';

        const classInfo: ClassInfo = {
          name: className,
          startLine: node.loc ? node.loc.start.line : 0,
          endLine: node.loc ? node.loc.end.line : 0,
          methods: [],
          properties: [],
          extends: node.superClass ? this.nodeToString(node.superClass) : undefined,
          implements: node.implements?.map((impl: any) => this.nodeToString(impl.expression)) || [],
          abstract: false // TypeScript-specific, could be enhanced
        };

        // Extract methods and properties
        if (node.body && node.body.body) {
          node.body.body.forEach((member: any) => {
            if (member.type === 'MethodDefinition') {
              const method: FunctionInfo = {
                name: this.nodeToString(member.key),
                startLine: member.loc ? member.loc.start.line : 0,
                endLine: member.loc ? member.loc.end.line : 0,
                parameters: this.extractParameters(member.value.params || []),
                complexity: this.calculateCyclomaticComplexity(member.value),
                calls: this.extractFunctionCalls(member.value),
                async: member.value.async || false,
                generator: member.value.generator || false
              };
              classInfo.methods.push(method);
            } else if (member.type === 'PropertyDefinition') {
              const property: PropertyInfo = {
                name: this.nodeToString(member.key),
                type: member.typeAnnotation ? this.nodeToString(member.typeAnnotation.typeAnnotation) : undefined,
                visibility: 'public', // Default, could be enhanced for TypeScript
                static: member.static || false,
                readonly: member.readonly || false,
                line: member.loc ? member.loc.start.line : 0
              };
              classInfo.properties.push(property);
            }
          });
        }

        classes.push(classInfo);
      }

      // Recursively walk child nodes
      for (const key in node) {
        const child = node[key];
        if (child && typeof child === 'object') {
          if (Array.isArray(child)) {
            child.forEach(walkNode);
          } else if (child.type) {
            walkNode(child);
          }
        }
      }
    };

    walkNode(ast);
    return classes;
  }

  private extractEndpoints(ast: any, filename: string): EndpointInfo[] {
    const endpoints: EndpointInfo[] = [];

    // Only extract endpoints from likely server files
    if (!filename.includes('app') && !filename.includes('server') && !filename.includes('route')) {
      return endpoints;
    }

    const walkNode = (node: any) => {
      if (!node || !node.type) return;

      // Look for Express.js route definitions: app.get(), app.post(), etc.
      if (node.type === 'CallExpression' &&
          node.callee && node.callee.type === 'MemberExpression' &&
          node.callee.object && node.callee.object.name === 'app') {

        const method = node.callee.property && node.callee.property.name ? node.callee.property.name.toUpperCase() : '';
        const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

        if (httpMethods.includes(method) && node.arguments.length >= 2) {
          const pathArg = node.arguments[0];
          if (pathArg.type === 'Literal' && typeof pathArg.value === 'string') {
            const endpoint: EndpointInfo = {
              method: method as any,
              path: pathArg.value,
              handler: this.nodeToString(node.arguments[node.arguments.length - 1]),
              middleware: node.arguments.slice(1, -1).map((arg: any) => this.nodeToString(arg)),
              line: node.loc ? node.loc.start.line : 0
            };
            endpoints.push(endpoint);
          }
        }
      }

      // Recursively walk child nodes
      for (const key in node) {
        const child = node[key];
        if (child && typeof child === 'object') {
          if (Array.isArray(child)) {
            child.forEach(walkNode);
          } else if (child.type) {
            walkNode(child);
          }
        }
      }
    };

    walkNode(ast);
    return endpoints;
  }

  public parseFile(file: AnalysisFile): DeepAnalyzedFile {
    try {
      let ast: any;

      // Determine if file contains JSX/TSX
      const isJSX = file.name.endsWith('.jsx') || file.name.endsWith('.tsx') ||
                    file.language === 'jsx' || file.language === 'tsx' ||
                    (file.language === 'typescript' && file.name.endsWith('.tsx'));

      // Parse with appropriate settings
      ast = parse(file.content, {
        loc: true,
        jsx: isJSX,
        errorOnUnknownASTType: false,
        errorOnTypeScriptSyntacticAndSemanticIssues: false,
        range: true,
        tokens: false,
        comment: false
      });

      const imports = this.extractImports(ast);
      const exports = this.extractExports(ast);
      const functions = this.extractFunctions(ast);
      const classes = this.extractClasses(ast);
      const endpoints = this.extractEndpoints(ast, file.name);

      // Calculate overall file complexity
      const complexity = functions.reduce((sum, fn) => sum + fn.complexity, 0) +
                        classes.reduce((sum, cls) => sum + cls.methods.reduce((methodSum, method) => methodSum + method.complexity, 0), 0);

      const analyzedFile: DeepAnalyzedFile = {
        id: file.id,
        path: file.path || file.name,
        name: file.name,
        language: file.language,
        imports,
        exports,
        functions,
        classes,
        complexity,
        metrics: {
          linesOfCode: file.content.split('\n').length,
          cyclomaticComplexity: complexity,
          maintainabilityIndex: Math.max(0, 171 - 5.2 * Math.log(complexity + 1) - 0.23 * complexity - 16.2 * Math.log(file.content.split('\n').length + 1)),
          cognitiveComplexity: complexity, // Simplified calculation
          halsteadVolume: 0, // TODO: Implement Halstead metrics
          technicalDebt: complexity * 0.1 // Simplified calculation
        },
        endpoints: endpoints.length > 0 ? endpoints : undefined
      };

      return analyzedFile;
    } catch (error) {
      console.error(`Error parsing file ${file.name}:`, error);

      // Return a basic analysis if parsing fails
      return {
        id: file.id,
        path: file.path || file.name,
        name: file.name,
        language: file.language,
        imports: [],
        exports: [],
        functions: [],
        classes: [],
        complexity: 0,
        metrics: {
          linesOfCode: file.content.split('\n').length,
          cyclomaticComplexity: 0,
          maintainabilityIndex: 0,
          cognitiveComplexity: 0
        }
      };
    }
  }

  public parseFiles(files: AnalysisFile[]): DeepAnalyzedFile[] {
    return files.map(file => this.parseFile(file));
  }
}