import { AnalyzedFile, FunctionDefinition, ClassDefinition, ImportStatement, ExportStatement } from '../../../shared/types';
import { getLanguageFromExtension, getFileExtension } from '../../../shared/utils';

export interface ParserResult {
  functions: FunctionDefinition[];
  classes: ClassDefinition[];
  imports: ImportStatement[];
  exports: ExportStatement[];
}

/**
 * Basic code parser - extracts functions, classes, imports, and exports
 * This is a simplified implementation that can be extended with more sophisticated parsing
 */
export class CodeParser {
  /**
   * Parse a code file and extract its structure
   */
  static parseFile(content: string, filename: string): AnalyzedFile {
    const extension = getFileExtension(filename);
    const language = getLanguageFromExtension(extension);
    const lines = content.split('\n');

    const result: ParserResult = {
      functions: [],
      classes: [],
      imports: [],
      exports: []
    };

    // Parse based on language
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        this.parseJavaScriptTypeScript(content, result);
        break;
      case 'python':
        this.parsePython(content, result);
        break;
      case 'java':
        this.parseJava(content, result);
        break;
      default:
        // Generic parsing for unknown languages
        this.parseGeneric(content, result);
    }

    return {
      path: filename,
      name: filename.split('/').pop() || filename,
      extension,
      size: content.length,
      language,
      functions: result.functions,
      classes: result.classes,
      imports: result.imports,
      exports: result.exports,
      lineCount: lines.length
    };
  }

  /**
   * Parse JavaScript/TypeScript files
   */
  private static parseJavaScriptTypeScript(content: string, result: ParserResult): void {
    const lines = content.split('\n');

    // Parse imports/exports
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Import statements
      const importMatch = line.match(/^import\s+(.+?)\s+from\s+['"`](.+?)['"`]/);
      if (importMatch) {
        const [, imports, module] = importMatch;
        const isDefault = !imports.includes('{');
        result.imports.push({
          module,
          imports: isDefault ? [imports.trim()] : this.extractImportNames(imports),
          isDefault
        });
      }

      // Export statements
      if (line.startsWith('export ')) {
        const isDefault = line.includes('export default');
        const exportName = this.extractExportName(line);
        if (exportName) {
          result.exports.push({
            name: exportName,
            isDefault,
            type: this.determineExportType(line)
          });
        }
      }
    }

    // Parse functions and classes
    this.parseFunctionsAndClasses(content, result);
  }

  /**
   * Parse Python files
   */
  private static parsePython(content: string, result: ParserResult): void {
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Import statements
      if (line.startsWith('import ') || line.startsWith('from ')) {
        const importMatch = line.match(/^(?:from\s+(\S+)\s+)?import\s+(.+)/);
        if (importMatch) {
          const [, module, imports] = importMatch;
          result.imports.push({
            module: module || imports.split(',')[0].trim(),
            imports: imports.split(',').map(imp => imp.trim()),
            isDefault: false
          });
        }
      }

      // Function definitions
      const funcMatch = line.match(/^def\s+(\w+)\s*\((.*?)\):/);
      if (funcMatch) {
        const [, name, params] = funcMatch;
        const endLine = this.findBlockEnd(lines, i, 'def');
        result.functions.push({
          name,
          startLine: i + 1,
          endLine,
          parameters: this.parsePythonParameters(params),
          complexity: 1, // Basic complexity
          calls: []
        });
      }

      // Class definitions
      const classMatch = line.match(/^class\s+(\w+)(?:\((.*?)\))?:/);
      if (classMatch) {
        const [, name, inheritance] = classMatch;
        const endLine = this.findBlockEnd(lines, i, 'class');
        result.classes.push({
          name,
          startLine: i + 1,
          endLine,
          methods: [],
          properties: [],
          extends: inheritance || undefined
        });
      }
    }
  }

  /**
   * Parse Java files
   */
  private static parseJava(content: string, result: ParserResult): void {
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Import statements
      const importMatch = line.match(/^import\s+(?:static\s+)?(.+?);/);
      if (importMatch) {
        result.imports.push({
          module: importMatch[1],
          imports: [importMatch[1].split('.').pop() || ''],
          isDefault: false
        });
      }

      // Method definitions
      const methodMatch = line.match(/(?:public|private|protected)?\s*(?:static)?\s*\w+\s+(\w+)\s*\(/);
      if (methodMatch && !line.includes('class ')) {
        const name = methodMatch[1];
        const endLine = this.findJavaBlockEnd(lines, i);
        result.functions.push({
          name,
          startLine: i + 1,
          endLine,
          parameters: [],
          complexity: 1,
          calls: []
        });
      }

      // Class definitions
      const classMatch = line.match(/(?:public|private)?\s*class\s+(\w+)(?:\s+extends\s+(\w+))?/);
      if (classMatch) {
        const [, name, superclass] = classMatch;
        const endLine = this.findJavaBlockEnd(lines, i);
        result.classes.push({
          name,
          startLine: i + 1,
          endLine,
          methods: [],
          properties: [],
          extends: superclass
        });
      }
    }
  }

  /**
   * Generic parser for unknown languages
   */
  private static parseGeneric(content: string, result: ParserResult): void {
    const lines = content.split('\n');

    // Look for function-like patterns
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Generic function patterns
      const funcPatterns = [
        /function\s+(\w+)/,
        /def\s+(\w+)/,
        /(\w+)\s*\(/,
        /(\w+)\s*:.*=>/
      ];

      for (const pattern of funcPatterns) {
        const match = line.match(pattern);
        if (match) {
          result.functions.push({
            name: match[1],
            startLine: i + 1,
            endLine: i + 10, // Estimate
            parameters: [],
            complexity: 1,
            calls: []
          });
          break;
        }
      }
    }
  }

  /**
   * Parse functions and classes from content
   */
  private static parseFunctionsAndClasses(content: string, result: ParserResult): void {
    // Function patterns for JS/TS
    const functionPatterns = [
      /function\s+(\w+)\s*\((.*?)\)/g,
      /const\s+(\w+)\s*=\s*\((.*?)\)\s*=>/g,
      /(\w+)\s*:\s*\((.*?)\)\s*=>/g,
      /(\w+)\s*\((.*?)\)\s*{/g
    ];

    // Class patterns
    const classPattern = /class\s+(\w+)(?:\s+extends\s+(\w+))?/g;

    // Extract functions
    functionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const [, name, params] = match;
        if (name && !result.functions.some(f => f.name === name)) {
          result.functions.push({
            name,
            startLine: this.getLineNumber(content, match.index),
            endLine: this.getLineNumber(content, match.index) + 10, // Estimate
            parameters: this.parseParameters(params || ''),
            complexity: this.calculateComplexity(content, match.index),
            calls: []
          });
        }
      }
    });

    // Extract classes
    let match;
    while ((match = classPattern.exec(content)) !== null) {
      const [, name, superclass] = match;
      result.classes.push({
        name,
        startLine: this.getLineNumber(content, match.index),
        endLine: this.getLineNumber(content, match.index) + 20, // Estimate
        methods: [],
        properties: [],
        extends: superclass
      });
    }
  }

  /**
   * Helper methods
   */
  private static extractImportNames(importStr: string): string[] {
    return importStr
      .replace(/[{}]/g, '')
      .split(',')
      .map(imp => imp.trim())
      .filter(imp => imp);
  }

  private static extractExportName(line: string): string {
    const match = line.match(/export\s+(?:default\s+)?(?:function\s+|class\s+|const\s+|let\s+|var\s+)?(\w+)/);
    return match ? match[1] : '';
  }

  private static determineExportType(line: string): 'function' | 'class' | 'variable' | 'type' {
    if (line.includes('function')) return 'function';
    if (line.includes('class')) return 'class';
    if (line.includes('type') || line.includes('interface')) return 'type';
    return 'variable';
  }

  private static parseParameters(paramStr: string): any[] {
    if (!paramStr.trim()) return [];

    return paramStr.split(',').map(param => {
      const trimmed = param.trim();
      const [name, defaultValue] = trimmed.split('=');
      return {
        name: name.trim(),
        optional: !!defaultValue,
        defaultValue: defaultValue?.trim()
      };
    });
  }

  private static parsePythonParameters(paramStr: string): any[] {
    if (!paramStr.trim()) return [];

    return paramStr.split(',').map(param => {
      const trimmed = param.trim();
      const [name, defaultValue] = trimmed.split('=');
      return {
        name: name.trim(),
        optional: !!defaultValue,
        defaultValue: defaultValue?.trim()
      };
    });
  }

  private static getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  private static calculateComplexity(content: string, startIndex: number): number {
    // Simple complexity calculation based on control flow statements
    const segment = content.substring(startIndex, startIndex + 1000);
    const complexityPatterns = [/if\s*\(/g, /for\s*\(/g, /while\s*\(/g, /switch\s*\(/g, /catch\s*\(/g];

    let complexity = 1; // Base complexity
    complexityPatterns.forEach(pattern => {
      const matches = segment.match(pattern);
      if (matches) complexity += matches.length;
    });

    return complexity;
  }

  private static findBlockEnd(lines: string[], startLine: number, keyword: string): number {
    let indentLevel = 0;
    const baseIndent = this.getIndentation(lines[startLine]);

    for (let i = startLine + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '') continue;

      const currentIndent = this.getIndentation(line);
      if (currentIndent <= baseIndent && line.trim()) {
        return i;
      }
    }
    return lines.length;
  }

  private static findJavaBlockEnd(lines: string[], startLine: number): number {
    let braceCount = 0;
    let foundOpenBrace = false;

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          foundOpenBrace = true;
        } else if (char === '}') {
          braceCount--;
          if (foundOpenBrace && braceCount === 0) {
            return i + 1;
          }
        }
      }
    }
    return lines.length;
  }

  private static getIndentation(line: string): number {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }
}