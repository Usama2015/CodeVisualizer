import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  DeepAnalyzedFile,
  FileMetrics,
  CodeMetrics,
  OverallMetrics,
  LanguageMetrics,
  DuplicationInfo,
  DuplicationBlock
} from '../../../shared/types/analysis';

export class MetricsCalculator {
  public calculateFileMetrics(file: DeepAnalyzedFile, content: string): FileMetrics {
    return {
      linesOfCode: this.countLinesOfCode(content),
      cyclomaticComplexity: this.calculateCyclomaticComplexity(file),
      maintainabilityIndex: this.calculateMaintainabilityIndex(file, content),
      cognitiveComplexity: this.calculateCognitiveComplexity(file),
      halsteadVolume: this.calculateHalsteadVolume(content),
      technicalDebt: this.calculateTechnicalDebt(file, content)
    };
  }

  public calculateOverallMetrics(files: DeepAnalyzedFile[]): OverallMetrics {
    const totalFiles = files.length;
    const totalLines = files.reduce((sum, file) => sum + file.metrics.linesOfCode, 0);
    const totalFunctions = files.reduce((sum, file) => sum + file.functions.length, 0);
    const totalClasses = files.reduce((sum, file) => sum + file.classes.length, 0);

    const totalComplexity = files.reduce((sum, file) => sum + file.metrics.cyclomaticComplexity, 0);
    const averageComplexity = totalFiles > 0 ? totalComplexity / totalFiles : 0;

    const maintainabilityValues = files.map(file => file.metrics.maintainabilityIndex);
    const maintainabilityIndex = maintainabilityValues.length > 0
      ? maintainabilityValues.reduce((sum, val) => sum + val, 0) / maintainabilityValues.length
      : 0;

    const technicalDebtValues = files.map(file => file.metrics.technicalDebt || 0);
    const totalTechnicalDebt = technicalDebtValues.reduce((sum, val) => sum + val, 0);
    const technicalDebtRatio = totalLines > 0 ? (totalTechnicalDebt / totalLines) * 100 : 0;

    const duplicationPercentages = files.map(file => file.duplication?.percentage || 0);
    const duplicationPercentage = duplicationPercentages.length > 0
      ? duplicationPercentages.reduce((sum, val) => sum + val, 0) / duplicationPercentages.length
      : 0;

    return {
      totalFiles,
      totalLines,
      totalFunctions,
      totalClasses,
      averageComplexity,
      maintainabilityIndex,
      technicalDebtRatio,
      duplicationPercentage
    };
  }

  public calculateLanguageMetrics(files: DeepAnalyzedFile[]): Record<string, LanguageMetrics> {
    const languageMetrics: Record<string, LanguageMetrics> = {};

    files.forEach(file => {
      const language = file.language;

      if (!languageMetrics[language]) {
        languageMetrics[language] = {
          fileCount: 0,
          lineCount: 0,
          functionCount: 0,
          classCount: 0,
          averageComplexity: 0,
          duplicationPercentage: 0
        };
      }

      const metrics = languageMetrics[language];
      metrics.fileCount++;
      metrics.lineCount += file.metrics.linesOfCode;
      metrics.functionCount += file.functions.length;
      metrics.classCount += file.classes.length;
    });

    // Calculate averages
    Object.keys(languageMetrics).forEach(language => {
      const metrics = languageMetrics[language];
      const languageFiles = files.filter(file => file.language === language);

      const totalComplexity = languageFiles.reduce((sum, file) => sum + file.metrics.cyclomaticComplexity, 0);
      metrics.averageComplexity = metrics.fileCount > 0 ? totalComplexity / metrics.fileCount : 0;

      const totalDuplication = languageFiles.reduce((sum, file) => sum + (file.duplication?.percentage || 0), 0);
      metrics.duplicationPercentage = metrics.fileCount > 0 ? totalDuplication / metrics.fileCount : 0;
    });

    return languageMetrics;
  }

  public async calculateDuplication(files: Array<{ name: string; content: string }>): Promise<DuplicationInfo[]> {
    if (files.length === 0) return [];

    // Create temporary directory for analysis
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-analysis-'));

    try {
      // Write files to temp directory
      for (const file of files) {
        const filePath = path.join(tempDir, file.name);
        fs.writeFileSync(filePath, file.content);
      }

      // Run jscpd for duplication detection
      const jscpdCommand = `npx jscpd --output json --reporters json --min-lines 3 --min-tokens 30 "${tempDir}"`;

      let jscpdOutput: any = {};
      try {
        const result = execSync(jscpdCommand, {
          encoding: 'utf8',
          cwd: process.cwd(),
          timeout: 10000 // 10 second timeout
        });

        // jscpd outputs to files, try to read the JSON report
        const reportPath = path.join(tempDir, '.jscpd', 'jscpd-report.json');
        if (fs.existsSync(reportPath)) {
          jscpdOutput = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        }
      } catch (error) {
        console.warn('jscpd analysis failed, using fallback duplication detection:', error);
        return this.fallbackDuplicationDetection(files);
      }

      // Process jscpd results
      const duplicationResults: DuplicationInfo[] = [];

      for (const file of files) {
        const duplications = jscpdOutput.duplicates?.filter((dup: any) =>
          dup.firstFile?.name?.endsWith(file.name) || dup.secondFile?.name?.endsWith(file.name)
        ) || [];

        const blocks: DuplicationBlock[] = duplications.map((dup: any) => ({
          startLine: dup.firstFile?.start || 0,
          endLine: dup.firstFile?.end || 0,
          tokens: dup.tokens || 0,
          duplicateOf: dup.secondFile ? {
            file: dup.secondFile.name,
            startLine: dup.secondFile.start,
            endLine: dup.secondFile.end
          } : undefined
        }));

        const totalLines = file.content.split('\n').length;
        const duplicatedLines = blocks.reduce((sum, block) => sum + (block.endLine - block.startLine + 1), 0);
        const percentage = totalLines > 0 ? (duplicatedLines / totalLines) * 100 : 0;

        duplicationResults.push({
          percentage,
          blocks,
          totalDuplicatedLines: duplicatedLines
        });
      }

      return duplicationResults;

    } finally {
      // Clean up temp directory
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.warn('Failed to clean up temp directory:', error);
      }
    }
  }

  private fallbackDuplicationDetection(files: Array<{ name: string; content: string }>): DuplicationInfo[] {
    // Simple fallback duplication detection
    const results: DuplicationInfo[] = [];

    for (const file of files) {
      const lines = file.content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      const blocks: DuplicationBlock[] = [];
      let duplicatedLines = 0;


      // Look for similar patterns within the same file and between files
      const allFiles = files.length === 1 ? [file, file] : files; // If single file, compare with itself

      for (const otherFile of allFiles) {
        if (file === otherFile && files.length > 1) continue;

        const otherLines = otherFile.content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const minLength = 3;

        for (let i = 0; i <= lines.length - minLength; i++) {
          const startJ = file === otherFile ? i + minLength : 0;

          for (let j = startJ; j <= otherLines.length - minLength; j++) {
            let matchLength = 0;
            let similarityScore = 0;

            // Check for consecutive similar lines (allowing for variable name differences)
            while (
              i + matchLength < lines.length &&
              j + matchLength < otherLines.length &&
              matchLength < 10 // Limit to prevent infinite loops
            ) {
              const line1 = lines[i + matchLength];
              const line2 = otherLines[j + matchLength];

              if (line1 === line2) {
                similarityScore += 10;
                matchLength++;
              } else if (this.areLinesStructurallySimilar(line1, line2)) {
                similarityScore += 7;
                matchLength++;
              } else {
                break;
              }
            }

            // If we found a match of sufficient length and similarity
            if (matchLength >= minLength && similarityScore >= 25) {
              blocks.push({
                startLine: this.findLineNumber(file.content, i),
                endLine: this.findLineNumber(file.content, i + matchLength - 1),
                tokens: similarityScore,
                duplicateOf: file === otherFile ? undefined : {
                  file: otherFile.name,
                  startLine: this.findLineNumber(otherFile.content, j),
                  endLine: this.findLineNumber(otherFile.content, j + matchLength - 1)
                }
              });

              duplicatedLines += matchLength;
              i += matchLength - 1;
              break;
            }
          }
        }
      }

      const totalLines = lines.length;
      const percentage = totalLines > 0 ? Math.min((duplicatedLines / totalLines) * 100, 100) : 0;

      results.push({
        percentage,
        blocks,
        totalDuplicatedLines: duplicatedLines
      });
    }

    return results;
  }

  private areLinesStructurallySimilar(line1: string, line2: string): boolean {
    // Remove variable names and check structural similarity
    const normalize = (line: string) => {
      return line
        .replace(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g, 'VAR') // Replace variable names
        .replace(/\d+/g, 'NUM') // Replace numbers
        .replace(/['"`][^'"`]*['"`]/g, 'STR') // Replace strings
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    };

    const norm1 = normalize(line1);
    const norm2 = normalize(line2);

    return norm1 === norm2;
  }

  private findLineNumber(content: string, lineIndex: number): number {
    const lines = content.split('\n');
    let currentIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.length > 0) {
        if (currentIndex === lineIndex) {
          return i + 1;
        }
        currentIndex++;
      }
    }

    return lineIndex + 1; // Fallback
  }

  private countLinesOfCode(content: string): number {
    const lines = content.split('\n');
    let count = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines and comment-only lines
      if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*')) {
        count++;
      }
    }

    return count;
  }

  private calculateCyclomaticComplexity(file: DeepAnalyzedFile): number {
    // Sum complexity of all functions and methods
    let totalComplexity = 0;

    file.functions.forEach(func => {
      totalComplexity += func.complexity;
    });

    file.classes.forEach(cls => {
      cls.methods.forEach(method => {
        totalComplexity += method.complexity;
      });
    });

    return totalComplexity;
  }

  private calculateMaintainabilityIndex(file: DeepAnalyzedFile, content: string): number {
    const loc = this.countLinesOfCode(content);
    const complexity = this.calculateCyclomaticComplexity(file);
    const halsteadVolume = this.calculateHalsteadVolume(content);

    // Microsoft's maintainability index formula
    // MI = MAX(0,(171 - 5.2 * ln(Halstead Volume) - 0.23 * (Cyclomatic Complexity) - 16.2 * ln(Lines of Code))*100/171)
    const mi = Math.max(0,
      (171 - 5.2 * Math.log(halsteadVolume) - 0.23 * complexity - 16.2 * Math.log(loc + 1)) * 100 / 171
    );

    return Math.round(mi * 100) / 100;
  }

  private calculateCognitiveComplexity(file: DeepAnalyzedFile): number {
    // Simplified cognitive complexity calculation
    // In a real implementation, this would require more sophisticated AST analysis
    // For now, we'll use a factor of cyclomatic complexity
    return Math.round(this.calculateCyclomaticComplexity(file) * 1.2);
  }

  private calculateHalsteadVolume(content: string): number {
    // Simplified Halstead volume calculation
    const operators = ['+', '-', '*', '/', '=', '==', '===', '!=', '!==', '<', '>', '<=', '>=', '&&', '||', '!', '?', ':', ';', ',', '(', ')', '{', '}', '[', ']'];
    const operands = content.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g) || [];

    const uniqueOperators = new Set();
    const uniqueOperands = new Set(operands);

    // Count operators
    operators.forEach(op => {
      if (content.includes(op)) {
        uniqueOperators.add(op);
      }
    });

    const n1 = uniqueOperators.size; // Unique operators
    const n2 = uniqueOperands.size; // Unique operands
    const N1 = operators.reduce((sum, op) => sum + (content.split(op).length - 1), 0); // Total operators
    const N2 = operands.length; // Total operands

    const vocabulary = n1 + n2;
    const length = N1 + N2;

    // Halstead Volume = Length * log2(Vocabulary)
    return length * Math.log2(vocabulary || 1);
  }

  private calculateTechnicalDebt(file: DeepAnalyzedFile, content: string): number {
    // Technical debt calculation based on various factors
    const complexity = this.calculateCyclomaticComplexity(file);
    const loc = this.countLinesOfCode(content);
    const maintainabilityIndex = this.calculateMaintainabilityIndex(file, content);

    // Factors that contribute to technical debt:
    // 1. High complexity
    // 2. Low maintainability
    // 3. Large file size
    // 4. Number of functions per file

    const complexityDebt = Math.max(0, complexity - 10) * 0.5; // Penalty for complexity > 10
    const maintainabilityDebt = Math.max(0, 100 - maintainabilityIndex) * 0.2; // Penalty for low maintainability
    const sizeDebt = Math.max(0, loc - 300) * 0.01; // Penalty for files > 300 LOC
    const functionDebt = Math.max(0, file.functions.length - 20) * 0.3; // Penalty for > 20 functions

    return Math.round((complexityDebt + maintainabilityDebt + sizeDebt + functionDebt) * 100) / 100;
  }

  public calculateMetricsForFiles(files: DeepAnalyzedFile[], fileContents: Array<{ name: string; content: string }>): CodeMetrics {
    // Calculate individual file metrics
    const byFile: Record<string, FileMetrics> = {};

    files.forEach((file, index) => {
      const content = fileContents.find(fc => fc.name === file.name)?.content || '';
      const metrics = this.calculateFileMetrics(file, content);

      // Update the file's metrics
      file.metrics = metrics;
      byFile[file.path] = metrics;
    });

    // Calculate overall metrics
    const overall = this.calculateOverallMetrics(files);

    // Calculate language-specific metrics
    const byLanguage = this.calculateLanguageMetrics(files);

    return {
      overall,
      byFile,
      byLanguage,
      trends: [] // Trends would require historical data
    };
  }
}