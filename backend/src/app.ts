import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

// Import analysis services
import { ASTParser } from './services/astParser';
import { DependencyAnalyzer } from './services/dependencyAnalyzer';
import { MetricsCalculator } from './services/metricsCalculator';
import { ArchitectureDetector } from './services/architectureDetector';
import { ICacheService, CacheFactory } from './services/cache';
import { gitHubService } from './services/github';
import {
  DeepAnalysisRequest,
  AnalysisResult,
  DeepAnalysis,
  AnalysisWarning,
  AnalysisFile
} from '../../shared/types/analysis';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize analysis services
const astParser = new ASTParser();
const dependencyAnalyzer = new DependencyAnalyzer();
const metricsCalculator = new MetricsCalculator();
const architectureDetector = new ArchitectureDetector();

// Initialize cache service (Redis with in-memory fallback)
let cacheService: ICacheService;

// Initialize cache service with configuration from environment
async function initializeCache() {
  try {
    const cacheConfig = CacheFactory.createConfigFromEnv();
    cacheService = await CacheFactory.create(cacheConfig);
    console.log('Cache service initialized successfully');

    // Log cache stats
    const stats = await cacheService.getStats();
    console.log('Cache stats:', stats);
  } catch (error) {
    console.error('Failed to initialize cache service:', error);
    process.exit(1);
  }
}

// Middleware
app.use(cors());

// Debug middleware to log requests
app.use((req, res, next) => {
  const contentLength = req.get('Content-Length');
  console.log(`🌐 ${req.method} ${req.path} - Content-Length: ${contentLength} bytes`);
  next();
});

// Increase payload limits for large file uploads
app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf, encoding) => {
    console.log(`📦 JSON payload size: ${buf.length} bytes`);
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only code files
    const allowedExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs',
      '.php', '.rb', '.go', '.rs', '.kt', '.swift', '.dart', '.scala',
      '.json', '.xml', '.yaml', '.yml', '.toml', '.md', '.txt'
    ];

    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only code files are allowed.'));
    }
  }
});

// Routes
app.get('/health', async (req, res) => {
  try {
    const cacheStats = cacheService ? await cacheService.getStats() : { connected: false };
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      cache: cacheStats
    });
  } catch (error) {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      cache: { connected: false, error: 'Failed to get cache stats' }
    });
  }
});

// File upload endpoint
app.post('/api/upload', upload.array('files', 50), (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const uploadedFiles = req.files.map(file => ({
      id: file.filename.split('.')[0],
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date()
    }));

    res.json({
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} files`,
      data: {
        files: uploadedFiles,
        totalSize: uploadedFiles.reduce((sum, file) => sum + file.size, 0)
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GitHub repository analysis endpoint
app.post('/api/analyze/github', async (req, res) => {
  const startTime = Date.now();
  let tempPath: string | null = null;

  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'GitHub URL is required and must be a string'
      });
    }

    // Validate GitHub URL format
    const validation = gitHubService.validateGitHubURL(url);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.error || 'Invalid GitHub URL format'
      });
    }

    console.log(`Starting GitHub repository analysis for: ${url}`);

    // Clone repository and get all code files
    const cloneResult = await gitHubService.cloneAndAnalyzeRepository(url);
    tempPath = cloneResult.repositoryInfo.tempPath;

    const { files, stats, repositoryInfo } = cloneResult;

    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No code files found in repository'
      });
    }

    console.log(`Found ${files.length} code files in repository ${repositoryInfo.name}`);

    // Generate analysis ID
    const analysisId = uuidv4();
    const warnings: AnalysisWarning[] = [];

    // Function to map file extensions to language types
    const getLanguageFromExtension = (extension: string): AnalysisFile['language'] => {
      const extensionMap: Record<string, AnalysisFile['language']> = {
        'js': 'javascript',
        'jsx': 'jsx',
        'ts': 'typescript',
        'tsx': 'tsx',
        'py': 'python',
        'java': 'java',
        'cpp': 'cpp',
        'cc': 'cpp',
        'cxx': 'cpp',
        'c': 'c',
        'cs': 'csharp',
        'php': 'php',
        'rb': 'ruby',
        'go': 'go',
        'rs': 'rust'
      };
      return extensionMap[extension] || 'javascript'; // Default to javascript
    };

    // Convert GitHub files to the format expected by the analysis pipeline
    const analysisFiles: AnalysisFile[] = files.map((file, index) => ({
      id: `github-${index}`,
      name: file.name,
      content: file.content,
      language: getLanguageFromExtension(file.extension)
    }));

    // Parse files using AST parser
    const parsedFiles = astParser.parseFiles(analysisFiles);

    // Add warnings for large files and high complexity
    parsedFiles.forEach(file => {
      if (file.metrics.linesOfCode > 1000) {
        warnings.push({
          type: 'large_file',
          message: `File ${file.name} is large (${file.metrics.linesOfCode} lines)`,
          severity: 'medium',
          file: file.path,
          suggestion: 'Consider breaking this file into smaller modules'
        });
      }

      if (file.complexity > 50) {
        warnings.push({
          type: 'high_complexity',
          message: `File ${file.name} has high complexity (${file.complexity})`,
          severity: 'high',
          file: file.path,
          suggestion: 'Consider refactoring to reduce complexity'
        });
      }
    });

    // Calculate metrics and duplication
    const fileContents = analysisFiles.map(f => ({ name: f.name, content: f.content }));
    const metrics = metricsCalculator.calculateMetricsForFiles(parsedFiles, fileContents);

    // Calculate duplication for each file
    const duplicationResults = await metricsCalculator.calculateDuplication(fileContents);
    parsedFiles.forEach((file, index) => {
      if (duplicationResults[index]) {
        file.duplication = duplicationResults[index];

        if (duplicationResults[index].percentage > 20) {
          warnings.push({
            type: 'code_duplication',
            message: `File ${file.name} has ${duplicationResults[index].percentage.toFixed(1)}% code duplication`,
            severity: 'medium',
            file: file.path,
            suggestion: 'Consider extracting common code into shared functions'
          });
        }
      }
    });

    // Analyze dependencies
    const dependencyGraph = dependencyAnalyzer.analyze(parsedFiles);

    // Check for circular dependencies
    const circularDeps = dependencyGraph.visualizationData?.clusters?.filter(c => c.type === 'circular') || [];
    if (circularDeps.length > 0) {
      circularDeps.forEach(cluster => {
        warnings.push({
          type: 'circular_dependency',
          message: `Circular dependency detected among files: ${cluster.nodes.join(', ')}`,
          severity: 'high',
          suggestion: 'Refactor to break circular dependencies'
        });
      });
    }

    // Detect architecture patterns
    const architecturePatterns = architectureDetector.detectPatterns(parsedFiles);

    const processingTime = Date.now() - startTime;

    // Create analysis result
    const result: AnalysisResult = {
      id: analysisId,
      analysis: {
        id: analysisId,
        files: parsedFiles,
        architecturePatterns,
        dependencies: dependencyGraph,
        createdAt: new Date()
      },
      dependencies: dependencyGraph,
      processingTime,
      warnings
    };

    // Store the result in cache with 1 hour TTL
    if (cacheService) {
      try {
        await cacheService.set(analysisId, result, 3600); // 1 hour TTL
        console.log(`GitHub analysis ${analysisId} stored in cache`);
      } catch (cacheError) {
        console.error('Failed to store GitHub analysis in cache:', cacheError);
        // Continue processing even if cache fails
      }
    }

    // Clean up temporary directory
    await gitHubService.cleanupDirectory(tempPath);
    tempPath = null;

    // Return successful response with analysis ID
    res.json({
      success: true,
      message: `GitHub repository analysis completed for ${repositoryInfo.owner}/${repositoryInfo.name}`,
      data: {
        analysisId,
        repository: {
          url: repositoryInfo.url,
          name: repositoryInfo.name,
          owner: repositoryInfo.owner
        },
        stats: {
          filesAnalyzed: files.length,
          totalSize: stats.totalSize,
          languages: stats.languages,
          processingTime
        },
        warningsCount: warnings.length
        // Note: Full analysis result available via /api/analysis/:id endpoint
      }
    });

  } catch (error) {
    console.error('GitHub analysis error:', error);

    // Clean up temporary directory on error
    if (tempPath) {
      try {
        await gitHubService.cleanupDirectory(tempPath);
      } catch (cleanupError) {
        console.error('Failed to cleanup after error:', cleanupError);
      }
    }

    // Handle specific error types
    let statusCode = 500;
    let errorMessage = 'GitHub analysis failed';

    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('private')) {
        statusCode = 404;
        errorMessage = 'Repository not found or is private';
      } else if (error.message.includes('too large')) {
        statusCode = 413;
        errorMessage = 'Repository is too large to analyze';
      } else if (error.message.includes('timeout') || error.message.includes('Network')) {
        statusCode = 408;
        errorMessage = 'Network timeout while accessing repository';
      } else if (error.message.includes('Invalid GitHub URL')) {
        statusCode = 400;
        errorMessage = 'Invalid GitHub URL format';
      }
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Code analysis endpoint
app.post('/api/analyze', (req, res) => {
  try {
    const { fileIds } = req.body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'File IDs are required'
      });
    }

    // TODO: Implement actual code analysis
    // For now, return a mock analysis result
    const mockAnalysis = {
      id: Date.now().toString(),
      name: 'Sample Analysis',
      files: fileIds.map((id, index) => ({
        path: `file-${index + 1}.js`,
        name: `file-${index + 1}.js`,
        extension: 'js',
        size: 1024,
        language: 'JavaScript',
        functions: [
          {
            name: `function${index + 1}`,
            startLine: 1,
            endLine: 10,
            parameters: [{ name: 'param1', optional: false }],
            complexity: 3,
            calls: []
          }
        ],
        classes: [],
        imports: [],
        exports: [],
        lineCount: 50
      })),
      dependencies: [],
      architecture: [],
      metrics: {
        totalFiles: fileIds.length,
        totalLines: fileIds.length * 50,
        totalFunctions: fileIds.length,
        totalClasses: 0,
        averageComplexity: 3,
        languageDistribution: { JavaScript: fileIds.length },
        dependencyCount: 0
      },
      createdAt: new Date()
    };

    res.json({
      success: true,
      message: 'Code analysis completed',
      data: mockAnalysis
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get analysis results
app.get('/api/analysis/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!cacheService) {
      return res.status(503).json({
        success: false,
        error: 'Cache service not initialized'
      });
    }

    const result = await cacheService.get(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found'
      });
    }

    // Return the stored analysis result
    res.json(result);
  } catch (error) {
    console.error('Get analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Deep analysis endpoint
app.post('/api/analyze/deep', async (req, res) => {
  const startTime = Date.now();

  // Set longer timeout for this specific endpoint
  req.setTimeout(300000); // 5 minutes
  res.setTimeout(300000); // 5 minutes

  try {
    const request: DeepAnalysisRequest = req.body;

    if (!request.files || !Array.isArray(request.files) || request.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files provided for analysis'
      });
    }

    const analysisId = uuidv4();
    const warnings: AnalysisWarning[] = [];

    // Log folder structure analysis for debugging
    console.log(`🔍 Deep analysis starting for ${request.files.length} files`);

    // For large uploads, send immediate response with processing status
    if (request.files.length > 50) {
      console.log(`⚠️  Large upload detected (${request.files.length} files), processing may take several minutes...`);
    }

    // Extract directory structure info
    const directories = new Set<string>();
    const filesByExtension = new Map<string, number>();

    request.files.forEach(file => {
      const path = file.path || file.name;
      const dir = path.split('/').slice(0, -1).join('/');
      if (dir) directories.add(dir);

      const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown';
      filesByExtension.set(ext, (filesByExtension.get(ext) || 0) + 1);
    });

    console.log(`📁 Directory structure: ${directories.size} directories`);
    console.log(`📄 File types:`, Object.fromEntries(filesByExtension));
    console.log(`📂 Sample directories:`, Array.from(directories).slice(0, 5));

    // Parse files using AST parser with batching for large uploads
    console.log(`🔄 Starting AST parsing for ${request.files.length} files...`);
    const parsedFiles = astParser.parseFiles(request.files);
    console.log(`✅ AST parsing completed in ${Date.now() - startTime}ms`);

    // Add warnings for parse errors or large files
    parsedFiles.forEach(file => {
      if (file.metrics.linesOfCode > 1000) {
        warnings.push({
          type: 'large_file',
          message: `File ${file.name} is large (${file.metrics.linesOfCode} lines)`,
          severity: 'medium',
          file: file.path,
          suggestion: 'Consider breaking this file into smaller modules'
        });
      }

      if (file.complexity > 50) {
        warnings.push({
          type: 'high_complexity',
          message: `File ${file.name} has high complexity (${file.complexity})`,
          severity: 'high',
          file: file.path,
          suggestion: 'Consider refactoring to reduce complexity'
        });
      }
    });

    // Calculate metrics and duplication
    const fileContents = request.files.map(f => ({ name: f.name, content: f.content }));
    const metrics = metricsCalculator.calculateMetricsForFiles(parsedFiles, fileContents);

    // Calculate duplication for each file
    const duplicationResults = await metricsCalculator.calculateDuplication(fileContents);
    parsedFiles.forEach((file, index) => {
      if (duplicationResults[index]) {
        file.duplication = duplicationResults[index];

        if (duplicationResults[index].percentage > 20) {
          warnings.push({
            type: 'code_duplication',
            message: `File ${file.name} has ${duplicationResults[index].percentage.toFixed(1)}% code duplication`,
            severity: 'medium',
            file: file.path,
            suggestion: 'Consider extracting common code into shared functions'
          });
        }
      }
    });

    // Analyze dependencies
    const dependencyGraph = dependencyAnalyzer.analyze(parsedFiles);

    // Check for circular dependencies
    const circularDeps = dependencyGraph.visualizationData?.clusters?.filter(c => c.type === 'circular') || [];
    if (circularDeps.length > 0) {
      circularDeps.forEach(cluster => {
        warnings.push({
          type: 'circular_dependency',
          message: `Circular dependency detected among files: ${cluster.nodes.join(', ')}`,
          severity: 'high',
          suggestion: 'Refactor to break circular dependencies'
        });
      });
    }

    // Detect architecture patterns
    const architecturePatterns = architectureDetector.detectPatterns(parsedFiles);

    const processingTime = Date.now() - startTime;

    // Create a flattened structure where analysis directly contains files and architecturePatterns
    const result: AnalysisResult = {
      id: analysisId,
      analysis: {
        id: analysisId,
        files: parsedFiles,
        architecturePatterns,
        dependencies: dependencyGraph,
        createdAt: new Date()
      },
      dependencies: dependencyGraph,
      processingTime,
      warnings
    };

    // Store the result in cache with 1 hour TTL
    if (cacheService) {
      try {
        await cacheService.set(analysisId, result, 3600); // 1 hour TTL
        console.log(`Analysis ${analysisId} stored in cache`);
      } catch (cacheError) {
        console.error('Failed to store analysis in cache:', cacheError);
        // Continue processing even if cache fails
      }
    }

    res.json(result);

  } catch (error) {
    console.error('Deep analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Deep analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get dependency graph for analysis
app.get('/api/analysis/:id/dependencies', async (req, res) => {
  try {
    const { id } = req.params;

    if (!cacheService) {
      return res.status(503).json({
        success: false,
        error: 'Cache service not initialized'
      });
    }

    const result = await cacheService.get(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found'
      });
    }

    res.json(result.dependencies);
  } catch (error) {
    console.error('Get dependencies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dependencies',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get architecture patterns for analysis
app.get('/api/analysis/:id/architecture', async (req, res) => {
  try {
    const { id } = req.params;

    if (!cacheService) {
      return res.status(503).json({
        success: false,
        error: 'Cache service not initialized'
      });
    }

    const result = await cacheService.get(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found'
      });
    }

    res.json({
      patterns: result.analysis.architecturePatterns,
      components: architectureDetector.analyzeComponentHierarchy(result.analysis.files)
    });
  } catch (error) {
    console.error('Get architecture error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve architecture',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get metrics for analysis
app.get('/api/analysis/:id/metrics', async (req, res) => {
  try {
    const { id } = req.params;

    if (!cacheService) {
      return res.status(503).json({
        success: false,
        error: 'Cache service not initialized'
      });
    }

    const result = await cacheService.get(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found'
      });
    }

    // Calculate metrics from analysis results
    const files = result.analysis.files;
    let totalComplexity = 0;
    let totalLines = 0;

    const fileMetrics = files.map(file => {
      totalComplexity += file.complexity || 0;
      totalLines += file.metrics?.linesOfCode || 0;
      return {
        name: file.name,
        complexity: file.complexity || 0,
        lines: file.metrics?.linesOfCode || 0
      };
    });

    // Return proper metrics structure
    res.json({
      overall: {
        averageComplexity: files.length > 0 ? totalComplexity / files.length : 0,
        totalLines: totalLines,
        fileCount: files.length,
        duplicationPercentage: 0
      },
      files: fileMetrics
    });
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cache management endpoints
app.get('/api/cache/stats', async (req, res) => {
  try {
    if (!cacheService) {
      return res.status(503).json({
        success: false,
        error: 'Cache service not initialized'
      });
    }

    const stats = await cacheService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Cache stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.delete('/api/cache/clear', async (req, res) => {
  try {
    if (!cacheService) {
      return res.status(503).json({
        success: false,
        error: 'Cache service not initialized'
      });
    }

    await cacheService.clear();
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.delete('/api/cache/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!cacheService) {
      return res.status(503).json({
        success: false,
        error: 'Cache service not initialized'
      });
    }

    const deleted = await cacheService.delete(id);

    if (deleted) {
      res.json({
        success: true,
        message: `Analysis ${id} deleted from cache`
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Analysis not found in cache'
      });
    }
  } catch (error) {
    console.error('Cache delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete from cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        message: 'File size exceeds 10MB limit'
      });
    }
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  if (cacheService) {
    try {
      await cacheService.close();
      console.log('Cache service closed');
    } catch (error) {
      console.error('Error closing cache service:', error);
    }
  }

  console.log('Graceful shutdown completed');
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start server with cache initialization
async function startServer() {
  try {
    // Initialize cache first
    await initializeCache();

    // Start HTTP server with increased timeouts
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });

    // Configure server timeouts and limits for large uploads
    server.timeout = 300000; // 5 minutes
    server.keepAliveTimeout = 120000; // 2 minutes
    server.headersTimeout = 120000; // 2 minutes
    server.maxRequestsPerSocket = 0; // Disable request limit per socket

    // Set request timeout if available (Node.js 14.11.0+)
    if (typeof server.requestTimeout !== 'undefined') {
      server.requestTimeout = 300000; // 5 minutes
    }

    // Increase the maximum HTTP header size if available
    if ('maxHeaderSize' in server) {
      (server as any).maxHeaderSize = 16384; // 16KB (default is 8KB)
    }

    // Handle connection events for debugging
    server.on('connection', (socket) => {
      console.log('🔌 New connection established');

      socket.on('error', (err) => {
        console.error('❌ Socket error:', err.message);
      });

      socket.on('close', (hadError) => {
        if (hadError) {
          console.log('🔌 Socket closed with error');
        }
      });

      socket.on('timeout', () => {
        console.log('⏰ Socket timeout');
      });
    });

    // Handle server errors
    server.on('error', (err) => {
      console.error('🚨 Server error:', err);
    });

    server.on('clientError', (err, socket) => {
      console.error('🚨 Client error:', err.message);
      if (!socket.destroyed) {
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      }
    });

    console.log('📡 Server configured with extended timeouts and limits:');
    console.log(`   - Timeout: ${server.timeout}ms`);
    console.log(`   - Keep-alive timeout: ${server.keepAliveTimeout}ms`);
    console.log(`   - Headers timeout: ${server.headersTimeout}ms`);
    if (typeof server.requestTimeout !== 'undefined') {
      console.log(`   - Request timeout: ${server.requestTimeout}ms`);
    }

    // Handle server shutdown
    process.on('SIGINT', () => {
      console.log('\nShutting down server...');
      server.close(() => {
        gracefulShutdown('SIGINT');
      });
    });

    process.on('SIGTERM', () => {
      console.log('\nShutting down server...');
      server.close(() => {
        gracefulShutdown('SIGTERM');
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer();

export default app;