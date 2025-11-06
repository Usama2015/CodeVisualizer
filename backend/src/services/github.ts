import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

export interface CodeFile {
  name: string;
  path: string;
  content: string;
  extension: string;
  size: number;
}

export interface RepositoryInfo {
  url: string;
  name: string;
  owner: string;
  tempPath: string;
}

export interface CloneResult {
  repositoryInfo: RepositoryInfo;
  files: CodeFile[];
  stats: {
    totalFiles: number;
    totalSize: number;
    languages: Record<string, number>;
  };
}

export class GitHubService {
  private tempDirs: Set<string> = new Set();

  // Maximum repository size in bytes (100MB)
  private readonly MAX_REPO_SIZE = 100 * 1024 * 1024;

  // Maximum number of files to process
  private readonly MAX_FILES = 1000;

  // Supported code file extensions
  private readonly CODE_EXTENSIONS = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs',
    '.php', '.rb', '.go', '.rs', '.kt', '.swift', '.dart', '.scala',
    '.json', '.xml', '.yaml', '.yml', '.toml', '.md', '.txt', '.vue',
    '.svelte', '.html', '.css', '.scss', '.sass', '.less', '.sql',
    '.sh', '.bash', '.ps1', '.dockerfile', '.r', '.m', '.h', '.hpp'
  ]);

  /**
   * Validates if a URL is a valid GitHub repository URL
   */
  public validateGitHubURL(url: string): { isValid: boolean; owner?: string; repo?: string; error?: string } {
    try {
      // Remove trailing slash and .git if present
      const cleanUrl = url.replace(/\/+$/, '').replace(/\.git$/, '');

      // GitHub URL patterns
      const httpsPattern = /^https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/;
      const sshPattern = /^git@github\.com:([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/;

      let match = cleanUrl.match(httpsPattern) || cleanUrl.match(sshPattern);

      if (!match) {
        return {
          isValid: false,
          error: 'Invalid GitHub URL format. Expected: https://github.com/owner/repo'
        };
      }

      const [, owner, repo] = match;

      // Validate owner and repo names
      if (!owner || !repo) {
        return {
          isValid: false,
          error: 'Invalid repository owner or name'
        };
      }

      return {
        isValid: true,
        owner,
        repo
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Failed to validate URL'
      };
    }
  }

  /**
   * Clones a GitHub repository to a temporary directory
   */
  public async cloneRepository(url: string): Promise<RepositoryInfo> {
    const validation = this.validateGitHubURL(url);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid GitHub URL');
    }

    const { owner, repo } = validation;
    const tempDir = path.join(os.tmpdir(), 'code-visualizer', uuidv4());

    try {
      // Ensure temp directory exists
      await fs.mkdir(tempDir, { recursive: true });
      this.tempDirs.add(tempDir);

      // Initialize git
      const git: SimpleGit = simpleGit();

      // Set clone timeout (30 seconds)
      const cloneOptions = {
        '--depth': 1, // Shallow clone for faster download
        '--single-branch': null,
        '--no-tags': null
      };

      console.log(`Cloning repository: ${url} to ${tempDir}`);

      // Clone with timeout
      await Promise.race([
        git.clone(url, tempDir, cloneOptions),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Clone timeout: Repository took too long to clone')), 30000)
        )
      ]);

      // Check if repository was cloned successfully
      const repoPath = tempDir;
      if (!fsSync.existsSync(path.join(repoPath, '.git'))) {
        throw new Error('Repository clone failed: .git directory not found');
      }

      // Check repository size
      const repoSize = await this.getDirectorySize(repoPath);
      if (repoSize > this.MAX_REPO_SIZE) {
        throw new Error(`Repository too large: ${Math.round(repoSize / 1024 / 1024)}MB exceeds 100MB limit`);
      }

      return {
        url,
        name: repo || 'unknown',
        owner: owner || 'unknown',
        tempPath: repoPath
      };

    } catch (error) {
      // Clean up on failure
      await this.cleanupDirectory(tempDir);

      if (error instanceof Error) {
        // Handle specific git errors
        if (error.message.includes('not found') || error.message.includes('404')) {
          throw new Error('Repository not found. It may be private or does not exist.');
        }
        if (error.message.includes('Permission denied') || error.message.includes('403')) {
          throw new Error('Access denied. This appears to be a private repository.');
        }
        if (error.message.includes('timeout') || error.message.includes('Connection timed out')) {
          throw new Error('Network timeout: Unable to connect to repository.');
        }
        throw error;
      }
      throw new Error('Failed to clone repository');
    }
  }

  /**
   * Recursively gets all code files from a directory
   */
  public async getAllCodeFiles(directory: string): Promise<CodeFile[]> {
    const files: CodeFile[] = [];
    const stats = {
      totalFiles: 0,
      skippedFiles: 0,
      languages: new Map<string, number>()
    };

    try {
      await this.walkDirectory(directory, directory, files, stats);

      if (files.length === 0) {
        throw new Error('No code files found in repository');
      }

      if (files.length > this.MAX_FILES) {
        console.warn(`Repository has ${files.length} files, limiting to ${this.MAX_FILES}`);
        return files.slice(0, this.MAX_FILES);
      }

      return files;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to read repository files');
    }
  }

  /**
   * Recursively walks through directory to find code files
   */
  private async walkDirectory(
    currentPath: string,
    basePath: string,
    files: CodeFile[],
    stats: { totalFiles: number; skippedFiles: number; languages: Map<string, number> }
  ): Promise<void> {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        // Skip hidden files, directories, and common non-code directories
        if (this.shouldSkipPath(entry.name, entry.isDirectory())) {
          continue;
        }

        if (entry.isDirectory()) {
          await this.walkDirectory(fullPath, basePath, files, stats);
        } else if (entry.isFile()) {
          stats.totalFiles++;

          const extension = path.extname(entry.name).toLowerCase();
          if (this.CODE_EXTENSIONS.has(extension)) {
            try {
              const fileStats = await fs.stat(fullPath);

              // Skip very large files (>1MB)
              if (fileStats.size > 1024 * 1024) {
                stats.skippedFiles++;
                continue;
              }

              const content = await fs.readFile(fullPath, 'utf-8');
              const relativePath = path.relative(basePath, fullPath);

              files.push({
                name: entry.name,
                path: relativePath.replace(/\\/g, '/'), // Normalize path separators
                content,
                extension: extension.substring(1), // Remove the dot
                size: fileStats.size
              });

              // Track language statistics
              const current = stats.languages.get(extension) || 0;
              stats.languages.set(extension, current + 1);

            } catch (fileError) {
              // Skip files that can't be read (binary files, permission issues, etc.)
              stats.skippedFiles++;
              console.warn(`Skipping file ${fullPath}:`, fileError);
            }
          } else {
            stats.skippedFiles++;
          }
        }
      }
    } catch (error) {
      console.warn(`Error reading directory ${currentPath}:`, error);
      // Continue processing other directories
    }
  }

  /**
   * Determines if a path should be skipped during file walking
   */
  private shouldSkipPath(name: string, isDirectory: boolean): boolean {
    // Skip hidden files and directories
    if (name.startsWith('.') && name !== '.') {
      return true;
    }

    if (isDirectory) {
      const skipDirs = new Set([
        'node_modules', 'vendor', 'dist', 'build', 'out', 'target',
        'bin', 'obj', '__pycache__', '.venv', 'venv', 'env',
        'coverage', '.nyc_output', 'logs', 'tmp', 'temp',
        '.git', '.svn', '.hg', '.bzr',
        '.idea', '.vscode', '.vs',
        'packages', 'deps', '_build', 'priv/static'
      ]);
      return skipDirs.has(name.toLowerCase());
    }

    // Skip common non-code files
    const skipFiles = new Set([
      'package-lock.json', 'yarn.lock', 'composer.lock', 'pipfile.lock',
      'gemfile.lock', 'cargo.lock', 'go.sum', 'poetry.lock'
    ]);
    return skipFiles.has(name.toLowerCase());
  }

  /**
   * Calculates the total size of a directory
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          totalSize += await this.getDirectorySize(fullPath);
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        }
      }
    } catch (error) {
      // Ignore permission errors and continue
      console.warn(`Error calculating size for ${dirPath}:`, error);
    }

    return totalSize;
  }

  /**
   * Cleans up a temporary directory
   */
  public async cleanupDirectory(dirPath: string): Promise<void> {
    try {
      if (fsSync.existsSync(dirPath)) {
        await fs.rm(dirPath, { recursive: true, force: true });
        console.log(`Cleaned up temporary directory: ${dirPath}`);
      }
      this.tempDirs.delete(dirPath);
    } catch (error) {
      console.error(`Failed to cleanup directory ${dirPath}:`, error);
      // Don't throw error for cleanup failures
    }
  }

  /**
   * Cleans up all temporary directories created by this service
   */
  public async cleanupAllTempDirectories(): Promise<void> {
    const promises = Array.from(this.tempDirs).map(dir => this.cleanupDirectory(dir));
    await Promise.allSettled(promises);
    this.tempDirs.clear();
  }

  /**
   * Complete repository clone and analysis workflow
   */
  public async cloneAndAnalyzeRepository(url: string): Promise<CloneResult> {
    let repositoryInfo: RepositoryInfo | null = null;

    try {
      // Clone repository
      repositoryInfo = await this.cloneRepository(url);

      // Get all code files
      const files = await this.getAllCodeFiles(repositoryInfo.tempPath);

      // Calculate statistics
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const languages: Record<string, number> = {};

      files.forEach(file => {
        const ext = file.extension;
        languages[ext] = (languages[ext] || 0) + 1;
      });

      return {
        repositoryInfo,
        files,
        stats: {
          totalFiles: files.length,
          totalSize,
          languages
        }
      };

    } catch (error) {
      // Cleanup on any error
      if (repositoryInfo) {
        await this.cleanupDirectory(repositoryInfo.tempPath);
      }
      throw error;
    }
  }
}

// Export a singleton instance
export const gitHubService = new GitHubService();

// Cleanup on process exit
process.on('exit', () => {
  gitHubService.cleanupAllTempDirectories().catch(console.error);
});

process.on('SIGINT', async () => {
  await gitHubService.cleanupAllTempDirectories();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await gitHubService.cleanupAllTempDirectories();
  process.exit(0);
});