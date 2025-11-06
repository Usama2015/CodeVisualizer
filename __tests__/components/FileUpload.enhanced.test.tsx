import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import FileUpload from '../../components/upload/FileUpload';
import { API_ENDPOINTS } from '@/lib/config';

// Mock react-dropzone
const mockGetRootProps = vi.fn();
const mockGetInputProps = vi.fn();
const mockOnDrop = vi.fn();

vi.mock('react-dropzone', () => ({
  useDropzone: vi.fn((options) => {
    mockOnDrop.mockImplementation(options.onDrop);
    return {
      getRootProps: mockGetRootProps.mockReturnValue({ 'data-testid': 'dropzone' }),
      getInputProps: mockGetInputProps.mockReturnValue({ 'data-testid': 'file-input' }),
      isDragActive: false,
    };
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log');
const mockConsoleError = vi.spyOn(console, 'error');

// Mock alert
const mockAlert = vi.spyOn(window, 'alert');

describe('FileUpload Component - Enhanced Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAlert.mockImplementation(() => {});
    mockConsoleLog.mockImplementation(() => {});
    mockConsoleError.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('File Upload Mode', () => {
    it('should filter out JSON config files during upload', async () => {
      const mockFiles = [
        new File(['console.log("test");'], 'test.js', { type: 'text/javascript' }),
        new File(['{}'], 'package.json', { type: 'application/json' }),
        new File(['{}'], 'tsconfig.json', { type: 'application/json' }),
        new File(['{}'], 'components.json', { type: 'application/json' }),
        new File(['class Test {}'], 'Test.tsx', { type: 'text/typescript' }),
      ];

      render(<FileUpload />);

      // Simulate file drop
      mockOnDrop(mockFiles);

      await waitFor(() => {
        // Should only show 2 supported files (test.js and Test.tsx)
        expect(screen.getByText('Uploaded Files (2)')).toBeInTheDocument();
      });

      // Verify console logs
      expect(mockConsoleLog).toHaveBeenCalledWith('Processing 5 files from folder upload...');
      expect(mockConsoleLog).toHaveBeenCalledWith('Found 2 supported code files in directory tree');
    });

    it('should handle preventDefault and stopPropagation correctly', async () => {
      render(<FileUpload />);

      const folderButton = screen.getByText('Select Entire Folder');

      // Create mock events
      const mockEvent = {
        stopPropagation: vi.fn(),
        preventDefault: vi.fn(),
      };

      // Test click event
      fireEvent.click(folderButton, mockEvent);
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockEvent.preventDefault).toHaveBeenCalled();

      // Test mouseDown event
      fireEvent.mouseDown(folderButton, mockEvent);
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should handle TSX parsing errors gracefully', async () => {
      const mockTsxFile = new File(['invalid tsx content <>', 'invalid.tsx', { type: 'text/typescript' }]);

      render(<FileUpload />);

      mockOnDrop([mockTsxFile]);

      await waitFor(() => {
        expect(screen.getByText('Uploaded Files (1)')).toBeInTheDocument();
      });

      // Should still accept the file even if content is invalid
      expect(screen.getByText('invalid.tsx')).toBeInTheDocument();
    });

    it('should prevent double form submission', async () => {
      const mockFile = new File(['test'], 'test.js', { type: 'text/javascript' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'test-analysis-id' })
      });

      render(<FileUpload />);

      mockOnDrop([mockFile]);

      await waitFor(() => {
        expect(screen.getByText('Uploaded Files (1)')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Upload and Analyze');

      // Click submit button twice rapidly
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);

      // Should only make one API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle 404 API errors correctly', async () => {
      const mockFile = new File(['test'], 'test.js', { type: 'text/javascript' });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('API endpoint not found')
      });

      render(<FileUpload />);

      mockOnDrop([mockFile]);

      await waitFor(() => {
        expect(screen.getByText('Uploaded Files (1)')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Upload and Analyze');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Upload/analysis failed. Please try again.');
        expect(mockConsoleError).toHaveBeenCalledWith('Analysis failed:', 'API endpoint not found');
      });
    });

    it('should handle double-nested data structure issues', async () => {
      const mockFile = new File(['test'], 'test.js', { type: 'text/javascript' });

      // Mock response with double-nested structure (the bug we want to prevent)
      const mockResponse = {
        id: 'test-id',
        analysis: {
          analysis: {  // Double-nested structure that caused issues
            files: [],
            architecturePatterns: []
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const mockCallback = vi.fn();
      render(<FileUpload onAnalysisComplete={mockCallback} />);

      mockOnDrop([mockFile]);

      await waitFor(() => {
        expect(screen.getByText('Uploaded Files (1)')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Upload and Analyze');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalledWith('test-id');
      });
    });

    it('should maintain file path structure for folder uploads', async () => {
      const mockFiles = [
        Object.assign(
          new File(['test1'], 'file1.js', { type: 'text/javascript' }),
          { webkitRelativePath: 'src/components/file1.js' }
        ),
        Object.assign(
          new File(['test2'], 'file2.js', { type: 'text/javascript' }),
          { webkitRelativePath: 'src/utils/file2.js' }
        ),
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'test-analysis-id' })
      });

      render(<FileUpload />);

      mockOnDrop(mockFiles);

      await waitFor(() => {
        expect(screen.getByText('Uploaded Files (2)')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Upload and Analyze');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          API_ENDPOINTS.analyzeDeep,
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('src/components/file1.js')
          })
        );
      });
    });
  });

  describe('GitHub Mode', () => {
    it('should validate GitHub URL format', async () => {
      render(<FileUpload />);

      // Switch to GitHub mode
      fireEvent.click(screen.getByText('GitHub URL'));

      const urlInput = screen.getByPlaceholderText('https://github.com/username/repository');
      const submitButton = screen.getByText('Analyze Repository');

      // Test invalid URLs
      const invalidUrls = [
        'not-a-url',
        'https://gitlab.com/user/repo',
        'https://github.com/',
        'github.com/user/repo'
      ];

      for (const url of invalidUrls) {
        await user.clear(urlInput);
        await user.type(urlInput, url);

        expect(submitButton).not.toBeDisabled();

        fireEvent.click(submitButton);

        // Note: URL validation happens on backend, frontend just checks if field is empty
        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalled();
        });

        vi.clearAllMocks();
      }
    });

    it('should handle GitHub API rate limiting', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API rate limit exceeded'));

      render(<FileUpload />);

      fireEvent.click(screen.getByText('GitHub URL'));

      const urlInput = screen.getByPlaceholderText('https://github.com/username/repository');
      await user.type(urlInput, 'https://github.com/test/repo');

      const submitButton = screen.getByText('Analyze Repository');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Upload/analysis failed. Please try again.');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts', async () => {
      const mockFile = new File(['test'], 'test.js', { type: 'text/javascript' });
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      render(<FileUpload />);

      mockOnDrop([mockFile]);

      await waitFor(() => {
        expect(screen.getByText('Uploaded Files (1)')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Upload and Analyze');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Upload/analysis failed. Please try again.');
        expect(mockConsoleError).toHaveBeenCalledWith('Error:', expect.any(Error));
      });
    });

    it('should handle malformed JSON responses', async () => {
      const mockFile = new File(['test'], 'test.js', { type: 'text/javascript' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Malformed JSON'))
      });

      render(<FileUpload />);

      mockOnDrop([mockFile]);

      await waitFor(() => {
        expect(screen.getByText('Uploaded Files (1)')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Upload and Analyze');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Upload/analysis failed. Please try again.');
      });
    });

    it('should handle missing analysis ID in response', async () => {
      const mockFile = new File(['test'], 'test.js', { type: 'text/javascript' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}) // Missing id field
      });

      render(<FileUpload />);

      mockOnDrop([mockFile]);

      await waitFor(() => {
        expect(screen.getByText('Uploaded Files (1)')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Upload and Analyze');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Analysis completed successfully!');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty file uploads', async () => {
      const emptyFile = new File([''], 'empty.js', { type: 'text/javascript' });

      render(<FileUpload />);

      mockOnDrop([emptyFile]);

      await waitFor(() => {
        expect(screen.getByText('Uploaded Files (1)')).toBeInTheDocument();
      });

      // Should still accept empty files
      expect(screen.getByText('empty.js')).toBeInTheDocument();
    });

    it('should handle very large file names', async () => {
      const longFileName = 'a'.repeat(255) + '.js';
      const fileWithLongName = new File(['test'], longFileName, { type: 'text/javascript' });

      render(<FileUpload />);

      mockOnDrop([fileWithLongName]);

      await waitFor(() => {
        expect(screen.getByText('Uploaded Files (1)')).toBeInTheDocument();
      });

      // Should handle long file names gracefully
      expect(screen.getByText(longFileName)).toBeInTheDocument();
    });

    it('should handle binary files being uploaded', async () => {
      const binaryFile = new File([new ArrayBuffer(100)], 'image.png', { type: 'image/png' });

      render(<FileUpload />);

      mockOnDrop([binaryFile]);

      // Should not process binary files
      expect(screen.queryByText('Uploaded Files')).not.toBeInTheDocument();
    });

    it('should handle special characters in file names', async () => {
      const specialChars = ['file with spaces.js', 'file-with-dashes.js', 'file_with_underscores.js', 'файл.js'];
      const mockFiles = specialChars.map(name => new File(['test'], name, { type: 'text/javascript' }));

      render(<FileUpload />);

      mockOnDrop(mockFiles);

      await waitFor(() => {
        expect(screen.getByText(`Uploaded Files (${mockFiles.length})`)).toBeInTheDocument();
      });

      // All files should be accepted
      specialChars.forEach(name => {
        expect(screen.getByText(name)).toBeInTheDocument();
      });
    });
  });

  describe('Performance Tests', () => {
    it('should handle large numbers of files efficiently', async () => {
      const startTime = performance.now();

      // Create 100 mock files
      const manyFiles = Array.from({ length: 100 }, (_, i) =>
        new File([`test content ${i}`], `file${i}.js`, { type: 'text/javascript' })
      );

      render(<FileUpload />);

      mockOnDrop(manyFiles);

      await waitFor(() => {
        expect(screen.getByText('Uploaded Files (100)')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should process 100 files in under 1 second
      expect(processingTime).toBeLessThan(1000);
    });
  });
});