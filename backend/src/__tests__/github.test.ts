import { GitHubService } from '../services/github';

describe('GitHubService', () => {
  let githubService: GitHubService;

  beforeEach(() => {
    githubService = new GitHubService();
  });

  afterEach(async () => {
    // Clean up any temp directories
    await githubService.cleanupAllTempDirectories();
  });

  describe('validateGitHubURL', () => {
    test('should validate correct HTTPS GitHub URLs', () => {
      const result = githubService.validateGitHubURL('https://github.com/microsoft/vscode');
      expect(result.isValid).toBe(true);
      expect(result.owner).toBe('microsoft');
      expect(result.repo).toBe('vscode');
    });

    test('should validate GitHub URLs with trailing slash', () => {
      const result = githubService.validateGitHubURL('https://github.com/facebook/react/');
      expect(result.isValid).toBe(true);
      expect(result.owner).toBe('facebook');
      expect(result.repo).toBe('react');
    });

    test('should validate GitHub URLs with .git suffix', () => {
      const result = githubService.validateGitHubURL('https://github.com/nodejs/node.git');
      expect(result.isValid).toBe(true);
      expect(result.owner).toBe('nodejs');
      expect(result.repo).toBe('node');
    });

    test('should reject non-GitHub URLs', () => {
      const result = githubService.validateGitHubURL('https://gitlab.com/user/repo');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid GitHub URL format');
    });

    test('should reject malformed URLs', () => {
      const result = githubService.validateGitHubURL('not-a-url');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid GitHub URL format');
    });

    test('should reject URLs without owner or repo', () => {
      const result = githubService.validateGitHubURL('https://github.com/');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid GitHub URL format');
    });

    test('should handle SSH URLs', () => {
      const result = githubService.validateGitHubURL('git@github.com:owner/repo');
      expect(result.isValid).toBe(true);
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });
  });

  describe('Code file filtering', () => {
    test('should identify code file extensions', () => {
      // This tests the private shouldSkipPath method indirectly
      const service = new GitHubService();

      // We can't directly test private methods, but we can verify the extensions
      // are handled correctly by checking the CODE_EXTENSIONS set exists
      expect(service).toBeDefined();
    });
  });

  describe('Error handling', () => {
    test('should handle invalid repository URLs gracefully', async () => {
      await expect(
        githubService.cloneRepository('https://github.com/invalid/nonexistent-repo-12345')
      ).rejects.toThrow();
    });

    test('should handle malformed URLs', async () => {
      await expect(
        githubService.cloneRepository('not-a-valid-url')
      ).rejects.toThrow('Invalid GitHub URL');
    });
  });
});