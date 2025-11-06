/**
 * Generate a unique ID
 */
export declare function generateId(): string;
/**
 * Get file extension from filename
 */
export declare function getFileExtension(filename: string): string;
/**
 * Determine programming language from file extension
 */
export declare function getLanguageFromExtension(extension: string): string;
/**
 * Check if file is a code file based on extension
 */
export declare function isCodeFile(filename: string): boolean;
/**
 * Format file size in human readable format
 */
export declare function formatFileSize(bytes: number): string;
/**
 * Sanitize filename for safe storage
 */
export declare function sanitizeFilename(filename: string): string;
/**
 * Extract package name from import statement
 */
export declare function extractPackageName(importPath: string): string;
/**
 * Calculate cyclomatic complexity score category
 */
export declare function getComplexityCategory(complexity: number): string;
/**
 * Debounce function for performance optimization
 */
export declare function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
/**
 * Deep merge objects
 */
export declare function deepMerge<T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T;
//# sourceMappingURL=index.d.ts.map