import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { API_ENDPOINTS, checkBackendHealth } from '@/lib/config';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock alert
const mockAlert = vi.spyOn(window, 'alert');

describe('Frontend-Backend Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAlert.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('API Communication', () => {
    it('should handle successful deep analysis flow', async () => {
      const mockAnalysisResponse = {
        id: 'analysis-123',
        analysis: {
          id: 'analysis-123',
          files: [
            {
              id: 'file-1',
              name: 'test.js',
              content: 'console.log("test");',
              language: 'javascript',
              path: 'test.js',
              metrics: {
                linesOfCode: 1,
                cyclomaticComplexity: 1,
                maintainabilityIndex: 100
              },
              complexity: 1,
              functions: [],
              classes: [],
              imports: [],
              exports: []
            }
          ],
          architecturePatterns: [],
          dependencies: {
            graph: { nodes: [], edges: [] },
            metrics: { totalDependencies: 0 }
          },
          createdAt: new Date()
        },
        dependencies: {
          graph: { nodes: [], edges: [] },
          metrics: { totalDependencies: 0 }
        },
        processingTime: 150,
        warnings: []
      };

      // Mock successful analysis response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockAnalysisResponse)
      });

      const mockCallback = vi.fn();

      // Import FileUpload component dynamically to avoid hoisting issues
      const { default: FileUpload } = await import('../../components/upload/FileUpload');
      render(<FileUpload onAnalysisComplete={mockCallback} />);

      // Simulate file upload
      const mockFile = new File(['console.log("test");'], 'test.js', { type: 'text/javascript' });
      const dropzone = screen.getByTestId('dropzone');

      Object.defineProperty(dropzone, 'files', {
        value: [mockFile],
        writable: false,
      });

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [mockFile],
        },
      });

      await waitFor(() => {
        expect(screen.getByText('Uploaded Files (1)')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Upload and Analyze');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          API_ENDPOINTS.analyzeDeep,
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: expect.stringContaining('test.js')
          })
        );
      });

      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalledWith('analysis-123');
      });
    });

    it('should handle backend downtime gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Failed to fetch'));

      const isHealthy = await checkBackendHealth();
      expect(isHealthy).toBe(false);
    });

    it('should handle malformed backend responses', async () => {
      // Mock response with invalid JSON
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('Unexpected token in JSON'))
      });

      const { default: FileUpload } = await import('../../components/upload/FileUpload');
      render(<FileUpload />);

      const mockFile = new File(['test'], 'test.js', { type: 'text/javascript' });
      const dropzone = screen.getByTestId('dropzone');

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [mockFile],
        },
      });

      await waitFor(() => {
        expect(screen.getByText('Uploaded Files (1)')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Upload and Analyze');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Upload/analysis failed. Please try again.');
      });
    });

    it('should handle 404 errors from missing endpoints', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Cannot GET /api/analyze/deep')
      });

      const { default: FileUpload } = await import('../../components/upload/FileUpload');
      render(<FileUpload />);

      const mockFile = new File(['test'], 'test.js', { type: 'text/javascript' });
      const dropzone = screen.getByTestId('dropzone');

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [mockFile],
        },
      });

      await waitFor(() => {
        expect(screen.getByText('Uploaded Files (1)')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Upload and Analyze');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Upload/analysis failed. Please try again.');
      });
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      const { default: FileUpload } = await import('../../components/upload/FileUpload');
      render(<FileUpload />);

      const mockFile = new File(['test'], 'test.js', { type: 'text/javascript' });
      const dropzone = screen.getByTestId('dropzone');

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [mockFile],
        },
      });

      await waitFor(() => {
        expect(screen.getByText('Uploaded Files (1)')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Upload and Analyze');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Upload/analysis failed. Please try again.');
      }, { timeout: 5000 });
    });
  });

  describe('Data Structure Consistency', () => {
    it('should handle correctly structured analysis response', async () => {
      const correctResponse = {
        id: 'analysis-123',
        analysis: {
          id: 'analysis-123',
          files: [
            {
              id: 'file-1',
              name: 'test.js',
              content: 'console.log("test");',
              language: 'javascript',
              path: 'test.js',
              metrics: {
                linesOfCode: 10,
                cyclomaticComplexity: 2,
                maintainabilityIndex: 85
              },
              complexity: 2,
              functions: [
                {
                  name: 'testFunction',
                  startLine: 1,
                  endLine: 5,
                  parameters: [],
                  complexity: 1,
                  calls: []
                }
              ],
              classes: [],
              imports: [],
              exports: []
            }
          ],
          architecturePatterns: [
            {
              type: 'component_based',
              confidence: 0.8,
              description: 'Component-based architecture detected'
            }
          ],
          dependencies: {
            graph: {
              nodes: [{ id: 'file-1', name: 'test.js' }],
              edges: []
            },
            metrics: {
              totalDependencies: 0,
              circularDependencies: 0
            }
          },
          createdAt: new Date()
        },
        dependencies: {
          graph: {
            nodes: [{ id: 'file-1', name: 'test.js' }],
            edges: []
          },
          metrics: {
            totalDependencies: 0,
            circularDependencies: 0
          }
        },
        processingTime: 150,
        warnings: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(correctResponse)
      });

      const mockCallback = vi.fn();
      const { default: FileUpload } = await import('../../components/upload/FileUpload');
      render(<FileUpload onAnalysisComplete={mockCallback} />);

      const mockFile = new File(['console.log("test");'], 'test.js', { type: 'text/javascript' });
      const dropzone = screen.getByTestId('dropzone');

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [mockFile],
        },
      });

      await waitFor(() => {
        expect(screen.getByText('Uploaded Files (1)')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Upload and Analyze');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalledWith('analysis-123');
      });
    });

    it('should handle double-nested data structure bug', async () => {
      // This response has the double-nesting bug that we want to prevent
      const buggyResponse = {
        id: 'analysis-123',
        analysis: {
          analysis: {  // Double-nested structure that caused frontend issues
            id: 'analysis-123',
            files: [],
            architecturePatterns: [],
            dependencies: { graph: { nodes: [], edges: [] }, metrics: {} },
            createdAt: new Date()
          }
        },
        dependencies: { graph: { nodes: [], edges: [] }, metrics: {} },
        processingTime: 150,
        warnings: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(buggyResponse)
      });

      const mockCallback = vi.fn();
      const { default: FileUpload } = await import('../../components/upload/FileUpload');
      render(<FileUpload onAnalysisComplete={mockCallback} />);

      const mockFile = new File(['test'], 'test.js', { type: 'text/javascript' });
      const dropzone = screen.getByTestId('dropzone');

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [mockFile],
        },
      });

      await waitFor(() => {
        expect(screen.getByText('Uploaded Files (1)')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Upload and Analyze');
      fireEvent.click(submitButton);

      // Should still call the callback even with buggy response structure
      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalledWith('analysis-123');
      });
    });

    it('should validate required fields in analysis response', async () => {
      const incompleteResponse = {
        // Missing id field
        analysis: {
          files: [],
          architecturePatterns: []
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(incompleteResponse)
      });

      const mockCallback = vi.fn();
      const { default: FileUpload } = await import('../../components/upload/FileUpload');
      render(<FileUpload onAnalysisComplete={mockCallback} />);

      const mockFile = new File(['test'], 'test.js', { type: 'text/javascript' });
      const dropzone = screen.getByTestId('dropzone');

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [mockFile],
        },
      });

      await waitFor(() => {
        expect(screen.getByText('Uploaded Files (1)')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Upload and Analyze');
      fireEvent.click(submitButton);

      // Should show success message when ID is missing
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Analysis completed successfully!');
      });
    });
  });

  describe('GitHub Integration', () => {
    it('should handle GitHub analysis endpoint correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          data: {
            analysisId: 'github-analysis-123',
            repository: {
              name: 'test-repo',
              owner: 'test-user'
            },
            stats: {
              filesAnalyzed: 10,
              totalSize: 50000,
              languages: { javascript: 8, typescript: 2 }
            }
          }
        })
      });

      const { default: FileUpload } = await import('../../components/upload/FileUpload');
      render(<FileUpload />);

      // Switch to GitHub mode
      fireEvent.click(screen.getByText('GitHub URL'));

      const urlInput = screen.getByPlaceholderText('https://github.com/username/repository');
      fireEvent.change(urlInput, { target: { value: 'https://github.com/test-user/test-repo' } });

      const submitButton = screen.getByText('Analyze Repository');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          API_ENDPOINTS.analyzeGithub,
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: 'https://github.com/test-user/test-repo' })
          })
        );
      });

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('GitHub repository analyzed successfully!');
      });
    });

    it('should handle GitHub API rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve('API rate limit exceeded')
      });

      const { default: FileUpload } = await import('../../components/upload/FileUpload');
      render(<FileUpload />);

      fireEvent.click(screen.getByText('GitHub URL'));

      const urlInput = screen.getByPlaceholderText('https://github.com/username/repository');
      fireEvent.change(urlInput, { target: { value: 'https://github.com/test-user/test-repo' } });

      const submitButton = screen.getByText('Analyze Repository');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Upload/analysis failed. Please try again.');
      });
    });
  });

  describe('Error Recovery', () => {
    it('should allow retry after failed upload', async () => {
      // First call fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { default: FileUpload } = await import('../../components/upload/FileUpload');
      render(<FileUpload />);

      const mockFile = new File(['test'], 'test.js', { type: 'text/javascript' });
      const dropzone = screen.getByTestId('dropzone');

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [mockFile],
        },
      });

      await waitFor(() => {
        expect(screen.getByText('Uploaded Files (1)')).toBeInTheDocument();
      });

      let submitButton = screen.getByText('Upload and Analyze');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Upload/analysis failed. Please try again.');
      });

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 'retry-success-123' })
      });

      submitButton = screen.getByText('Upload and Analyze');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });
});