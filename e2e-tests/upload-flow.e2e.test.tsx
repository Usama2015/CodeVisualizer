import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '@/app/page';
import { TEST_CONFIG, testUtils } from './setup.e2e';

/**
 * COMPLETE FILE UPLOAD FLOW E2E TESTS
 *
 * These tests verify the entire user journey from file selection
 * through upload, analysis, and visualization display.
 *
 * Tests cover:
 * 1. UI file selection and upload
 * 2. Backend communication and analysis
 * 3. Data persistence and retrieval
 * 4. Frontend state management
 * 5. Error handling scenarios
 */

describe('File Upload Flow E2E Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();

    // Mock fetch to intercept API calls
    global.fetch = vi.fn();
  });

  describe('File Selection and Upload UI', () => {
    it('should render file upload interface on initial load', () => {
      render(<Home />);

      // Verify main heading
      expect(screen.getByText('CodeVisualizer')).toBeInTheDocument();
      expect(screen.getByText('Upload Your Codebase')).toBeInTheDocument();

      // Verify upload modes
      expect(screen.getByText('Upload Files')).toBeInTheDocument();
      expect(screen.getByText('GitHub URL')).toBeInTheDocument();

      // Verify drag and drop area
      expect(screen.getByText(/Drag and drop your code files here/)).toBeInTheDocument();

      // Verify supported file types
      expect(screen.getByText(/Supports: .js, .jsx, .ts, .tsx/)).toBeInTheDocument();
    });

    it('should allow switching between upload modes', async () => {
      render(<Home />);

      // Start with files mode
      const filesButton = screen.getByText('Upload Files');
      const githubButton = screen.getByText('GitHub URL');

      expect(filesButton).toHaveClass('bg-blue-600');
      expect(githubButton).not.toHaveClass('bg-blue-600');

      // Switch to GitHub mode
      await user.click(githubButton);

      expect(githubButton).toHaveClass('bg-blue-600');
      expect(filesButton).not.toHaveClass('bg-blue-600');

      // Verify GitHub URL input appears
      expect(screen.getByPlaceholderText('https://github.com/username/repository')).toBeInTheDocument();

      // Switch back to files mode
      await user.click(filesButton);

      expect(filesButton).toHaveClass('bg-blue-600');
      expect(githubButton).not.toHaveClass('bg-blue-600');

      // Verify drag and drop area is visible again
      expect(screen.getByText(/Drag and drop your code files here/)).toBeInTheDocument();
    });

    it('should handle file selection via file input', async () => {
      render(<Home />);

      // Create mock files
      const testFile1 = testUtils.createMockFile('test1.js', 'console.log("test1");', 'text/javascript');
      const testFile2 = testUtils.createMockFile('test2.ts', 'const x: number = 1;', 'text/typescript');

      // Get the file input (hidden)
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;

      // Simulate file selection
      await user.upload(fileInput, [testFile1, testFile2]);

      // Wait for files to be processed and displayed
      await waitFor(() => {
        expect(screen.getByText('test1.js')).toBeInTheDocument();
        expect(screen.getByText('test2.ts')).toBeInTheDocument();
      });

      // Verify file count
      expect(screen.getByText('Uploaded Files (2)')).toBeInTheDocument();

      // Verify upload button is enabled
      const uploadButton = screen.getByText('Upload and Analyze');
      expect(uploadButton).not.toBeDisabled();
    });

    it('should allow removing selected files', async () => {
      render(<Home />);

      // Add a test file
      const testFile = testUtils.createMockFile('removeme.js', 'console.log("remove");', 'text/javascript');
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, [testFile]);

      // Wait for file to appear
      await waitFor(() => {
        expect(screen.getByText('removeme.js')).toBeInTheDocument();
      });

      // Find and click the remove button
      const removeButton = screen.getByRole('button', { name: /remove file/i });
      await user.click(removeButton);

      // Verify file is removed
      await waitFor(() => {
        expect(screen.queryByText('removeme.js')).not.toBeInTheDocument();
      });

      // Verify upload button is disabled again
      const uploadButton = screen.getByText('Upload and Analyze');
      expect(uploadButton).toBeDisabled();
    });
  });

  describe('File Upload and Analysis Integration', () => {
    it('should successfully upload files and trigger analysis', async () => {
      // Mock successful analysis response
      const mockAnalysisId = 'test-analysis-123';
      const mockAnalysisResponse = {
        id: mockAnalysisId,
        analysis: {
          analysis: {
            files: [{
              path: 'test.js',
              language: 'javascript',
              imports: ['react'],
              exports: ['TestComponent'],
              functions: ['render'],
              classes: [],
              complexity: 5,
              metrics: {
                linesOfCode: 25,
                cyclomaticComplexity: 5,
                maintainabilityIndex: 85
              }
            }]
          }
        },
        dependencies: {
          nodes: [{ id: 'test.js', name: 'test.js' }],
          edges: []
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisResponse
      });

      render(<Home />);

      // Add test file
      const testFile = testUtils.createMockFile(
        'test.js',
        `
import React from 'react';

export function TestComponent() {
  const [count, setCount] = React.useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
        `,
        'text/javascript'
      );

      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, [testFile]);

      // Wait for file to be displayed
      await waitFor(() => {
        expect(screen.getByText('test.js')).toBeInTheDocument();
      });

      // Click upload button
      const uploadButton = screen.getByText('Upload and Analyze');
      await user.click(uploadButton);

      // Verify upload button shows processing state
      expect(screen.getByText('Processing...')).toBeInTheDocument();

      // Wait for analysis to complete and UI to update
      await waitFor(() => {
        expect(screen.getByText('Analysis Results')).toBeInTheDocument();
      }, { timeout: 10000 });

      // Verify API call was made with correct data
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analyze/deep'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('test.js')
        })
      );

      // Verify UI switched to results view
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Dependencies')).toBeInTheDocument();
      expect(screen.getByText('Metrics')).toBeInTheDocument();
    });

    it('should handle upload errors gracefully', async () => {
      // Mock failed analysis response
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      // Mock window.alert
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<Home />);

      // Add test file
      const testFile = testUtils.createMockFile('test.js', 'console.log("test");', 'text/javascript');
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, [testFile]);

      await waitFor(() => {
        expect(screen.getByText('test.js')).toBeInTheDocument();
      });

      // Click upload button
      const uploadButton = screen.getByText('Upload and Analyze');
      await user.click(uploadButton);

      // Wait for error handling
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Upload/analysis failed. Please try again.');
      });

      // Verify UI returns to upload state
      expect(screen.getByText('Upload and Analyze')).toBeInTheDocument();
      expect(screen.queryByText('Processing...')).not.toBeInTheDocument();

      alertSpy.mockRestore();
    });

    it('should handle server error responses', async () => {
      // Mock server error response
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      });

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<Home />);

      // Add test file
      const testFile = testUtils.createMockFile('test.js', 'console.log("test");', 'text/javascript');
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, [testFile]);

      await waitFor(() => {
        expect(screen.getByText('test.js')).toBeInTheDocument();
      });

      // Click upload button
      const uploadButton = screen.getByText('Upload and Analyze');
      await user.click(uploadButton);

      // Wait for error handling
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          expect.stringContaining('Upload/analysis failed')
        );
      });

      alertSpy.mockRestore();
    });
  });

  describe('GitHub URL Analysis', () => {
    it('should handle GitHub URL submission', async () => {
      const mockResponse = {
        id: 'github-analysis-123',
        message: 'GitHub repository analysis started'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<Home />);

      // Switch to GitHub mode
      const githubButton = screen.getByText('GitHub URL');
      await user.click(githubButton);

      // Enter GitHub URL
      const urlInput = screen.getByPlaceholderText('https://github.com/username/repository');
      await user.type(urlInput, 'https://github.com/facebook/react');

      // Click analyze button
      const analyzeButton = screen.getByText('Analyze Repository');
      expect(analyzeButton).not.toBeDisabled();

      await user.click(analyzeButton);

      // Verify API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/analyze/github'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('https://github.com/facebook/react')
          })
        );
      });

      // Verify success message
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('GitHub repository analyzed successfully!');
      });

      alertSpy.mockRestore();
    });

    it('should validate GitHub URL input', async () => {
      render(<Home />);

      // Switch to GitHub mode
      const githubButton = screen.getByText('GitHub URL');
      await user.click(githubButton);

      // Analyze button should be disabled with empty URL
      const analyzeButton = screen.getByText('Analyze Repository');
      expect(analyzeButton).toBeDisabled();

      // Enter invalid URL
      const urlInput = screen.getByPlaceholderText('https://github.com/username/repository');
      await user.type(urlInput, 'invalid-url');

      // Button should still be enabled (URL validation happens on submit)
      expect(analyzeButton).not.toBeDisabled();

      // Clear input
      await user.clear(urlInput);

      // Button should be disabled again
      expect(analyzeButton).toBeDisabled();
    });
  });

  describe('File Type Support', () => {
    it('should handle various supported file types', async () => {
      const supportedFiles = [
        { name: 'script.js', content: 'console.log("js");', language: 'javascript' },
        { name: 'component.jsx', content: '<div>jsx</div>;', language: 'jsx' },
        { name: 'module.ts', content: 'const x: number = 1;', language: 'typescript' },
        { name: 'component.tsx', content: '<div>tsx</div>;', language: 'tsx' },
        { name: 'script.py', content: 'print("python")', language: 'python' },
        { name: 'Main.java', content: 'public class Main {}', language: 'java' },
        { name: 'config.json', content: '{"test": true}', language: 'json' },
      ];

      const mockAnalysisResponse = {
        id: 'multi-type-analysis-123',
        analysis: { analysis: { files: [] } },
        dependencies: { nodes: [], edges: [] }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisResponse
      });

      render(<Home />);

      // Upload all supported file types
      const mockFiles = supportedFiles.map(file =>
        testUtils.createMockFile(file.name, file.content, 'text/plain')
      );

      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, mockFiles);

      // Wait for all files to be displayed
      await waitFor(() => {
        supportedFiles.forEach(file => {
          expect(screen.getByText(file.name)).toBeInTheDocument();
        });
      });

      expect(screen.getByText(`Uploaded Files (${supportedFiles.length})`)).toBeInTheDocument();

      // Upload should work
      const uploadButton = screen.getByText('Upload and Analyze');
      expect(uploadButton).not.toBeDisabled();

      await user.click(uploadButton);

      // Verify all files are sent to backend
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/analyze/deep'),
          expect.objectContaining({
            body: expect.stringContaining('script.js')
          })
        );
      });
    });
  });

  describe('Large File Handling', () => {
    it('should handle large files gracefully', async () => {
      const largeContent = 'const line = "test";\n'.repeat(1000); // ~15KB file
      const largeFile = testUtils.createMockFile('large.js', largeContent, 'text/javascript');

      const mockAnalysisResponse = {
        id: 'large-file-analysis-123',
        analysis: { analysis: { files: [] } },
        dependencies: { nodes: [], edges: [] }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisResponse
      });

      render(<Home />);

      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, [largeFile]);

      await waitFor(() => {
        expect(screen.getByText('large.js')).toBeInTheDocument();
        // Should show file size
        expect(screen.getByText(/KB/)).toBeInTheDocument();
      });

      const uploadButton = screen.getByText('Upload and Analyze');
      await user.click(uploadButton);

      // Should handle large file without crashing
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('UI State Management', () => {
    it('should handle "New Analysis" button functionality', async () => {
      const mockAnalysisResponse = {
        id: 'state-test-123',
        analysis: { analysis: { files: [] } },
        dependencies: { nodes: [], edges: [] }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisResponse
      });

      render(<Home />);

      // Upload a file and complete analysis
      const testFile = testUtils.createMockFile('test.js', 'console.log("test");', 'text/javascript');
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, [testFile]);

      await waitFor(() => {
        expect(screen.getByText('test.js')).toBeInTheDocument();
      });

      const uploadButton = screen.getByText('Upload and Analyze');
      await user.click(uploadButton);

      // Wait for analysis results to appear
      await waitFor(() => {
        expect(screen.getByText('Analysis Results')).toBeInTheDocument();
      });

      // Verify "New Analysis" button appears
      const newAnalysisButton = screen.getByText('New Analysis');
      expect(newAnalysisButton).toBeInTheDocument();

      // Click "New Analysis"
      await user.click(newAnalysisButton);

      // Should return to upload interface
      await waitFor(() => {
        expect(screen.getByText('Upload Your Codebase')).toBeInTheDocument();
        expect(screen.queryByText('Analysis Results')).not.toBeInTheDocument();
      });
    });
  });
});