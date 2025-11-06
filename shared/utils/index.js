"use strict";
// Shared utilities between frontend and backend
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.getFileExtension = getFileExtension;
exports.getLanguageFromExtension = getLanguageFromExtension;
exports.isCodeFile = isCodeFile;
exports.formatFileSize = formatFileSize;
exports.sanitizeFilename = sanitizeFilename;
exports.extractPackageName = extractPackageName;
exports.getComplexityCategory = getComplexityCategory;
exports.debounce = debounce;
exports.deepMerge = deepMerge;
/**
 * Generate a unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
/**
 * Get file extension from filename
 */
function getFileExtension(filename) {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.slice(lastDot + 1).toLowerCase();
}
/**
 * Determine programming language from file extension
 */
function getLanguageFromExtension(extension) {
    const languageMap = {
        js: 'JavaScript',
        jsx: 'JavaScript',
        ts: 'TypeScript',
        tsx: 'TypeScript',
        py: 'Python',
        java: 'Java',
        cpp: 'C++',
        c: 'C',
        cs: 'C#',
        php: 'PHP',
        rb: 'Ruby',
        go: 'Go',
        rs: 'Rust',
        kt: 'Kotlin',
        swift: 'Swift',
        dart: 'Dart',
        scala: 'Scala',
        clj: 'Clojure',
        hs: 'Haskell',
        ml: 'OCaml',
        fs: 'F#',
        ex: 'Elixir',
        erl: 'Erlang',
        lua: 'Lua',
        r: 'R',
        sql: 'SQL',
        sh: 'Shell',
        bash: 'Bash',
        ps1: 'PowerShell',
        html: 'HTML',
        css: 'CSS',
        scss: 'SCSS',
        sass: 'Sass',
        less: 'Less',
        json: 'JSON',
        xml: 'XML',
        yaml: 'YAML',
        yml: 'YAML',
        toml: 'TOML',
        md: 'Markdown',
        tex: 'LaTeX',
    };
    return languageMap[extension] || 'Unknown';
}
/**
 * Check if file is a code file based on extension
 */
function isCodeFile(filename) {
    const extension = getFileExtension(filename);
    const codeExtensions = [
        'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb',
        'go', 'rs', 'kt', 'swift', 'dart', 'scala', 'clj', 'hs', 'ml', 'fs',
        'ex', 'erl', 'lua', 'r', 'sql', 'sh', 'bash', 'ps1'
    ];
    return codeExtensions.includes(extension);
}
/**
 * Format file size in human readable format
 */
function formatFileSize(bytes) {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
/**
 * Sanitize filename for safe storage
 */
function sanitizeFilename(filename) {
    return filename
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '');
}
/**
 * Extract package name from import statement
 */
function extractPackageName(importPath) {
    // Handle scoped packages (@scope/package)
    if (importPath.startsWith('@')) {
        const parts = importPath.split('/');
        return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : importPath;
    }
    // Handle regular packages
    return importPath.split('/')[0];
}
/**
 * Calculate cyclomatic complexity score category
 */
function getComplexityCategory(complexity) {
    if (complexity <= 5)
        return 'Low';
    if (complexity <= 10)
        return 'Medium';
    if (complexity <= 15)
        return 'High';
    return 'Very High';
}
/**
 * Debounce function for performance optimization
 */
function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
/**
 * Deep merge objects
 */
function deepMerge(target, ...sources) {
    if (!sources.length)
        return target;
    const source = sources.shift();
    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key])
                    Object.assign(target, { [key]: {} });
                deepMerge(target[key], source[key]);
            }
            else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }
    return deepMerge(target, ...sources);
}
function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}
//# sourceMappingURL=index.js.map