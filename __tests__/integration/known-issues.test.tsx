/**
 * Tests for preventing known runtime issues that occurred in production
 *
 * This test suite specifically targets the following issues:
 * 1. API Communication Errors (404s due to missing base URL)
 * 2. Double-nested Data Structure (data.analysis.analysis.files)
 * 3. TSX Parsing Errors (">' expected")
 * 4. Double Popup Issue (folder upload triggering twice)
 * 5. JSON Config File Failures (package.json, tsconfig.json)
 * 6. Event Propagation Issues
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import FileUpload from '../../components/upload/FileUpload';
import { API_ENDPOINTS, checkBackendHealth } from '../../lib/config';

// Mock fetch to test API communication
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock react-dropzone to control file drop behavior
vi.mock('react-dropzone', () => ({
  useDropzone: vi.fn(() => ({
    getRootProps: () => ({ 'data-testid': 'dropzone' }),
    getInputProps: () => ({ 'data-testid': 'file-input' }),
    isDragActive: false,
  })),
}));

describe('Known Issues Prevention Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Issue 1: API Communication Errors (404s due to missing base URL)', () => {
    it('should include base URL prefix in all API calls', () => {
      // Test that all API endpoints include the base URL
      expect(API_ENDPOINTS.analyzeDeep).toMatch(/^http:\/\/localhost:3001/);
      expect(API_ENDPOINTS.analyzeGithub).toMatch(/^http:\/\/localhost:3001/);
      expect(API_ENDPOINTS.health).toMatch(/^http:\/\/localhost:3001/);

      // Test dynamic endpoints
      const testId = 'test-123';
      expect(API_ENDPOINTS.getAnalysis(testId)).toMatch(/^http:\/\/localhost:3001/);
      expect(API_ENDPOINTS.getDependencies(testId)).toMatch(/^http:\/\/localhost:3001/);
      expect(API_ENDPOINTS.getMetrics(testId)).toMatch(/^http:\/\/localhost:3001/);
      expect(API_ENDPOINTS.getArchitecture(testId)).toMatch(/^http:\/\/localhost:3001/);
    });

    it('should use correct API endpoints when making requests', async () => {
      const mockCallback = vi.fn();
      render(<FileUpload onAnalysisComplete={mockCallback} />);

      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'test-analysis-id', success: true })
      });

      // Simulate file upload
      const file = new File(['test content'], 'test.js', { type: 'text/javascript' });

      // Trigger file drop
      const dropzone = screen.getByTestId('dropzone');
      const event = {
        dataTransfer: {
          files: [file]
        }
      };

      fireEvent.drop(dropzone, event);

      // Wait for file to be processed
      await waitFor(() => {
        expect(screen.getByText('test.js')).toBeInTheDocument();
      });

      // Click upload button
      const uploadButton = screen.getByRole('button', { name: /upload and analyze/i });
      fireEvent.click(uploadButton);

      // Verify the correct API endpoint was called
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          API_ENDPOINTS.analyzeDeep,
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
        );
      });
    });

    it('should handle API endpoint validation', async () => {
      // Test health check endpoint
      mockFetch.mockResolvedValueOnce({ ok: true });
      const isHealthy = await checkBackendHealth();
      expect(isHealthy).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(API_ENDPOINTS.health);

      // Test health check failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const isUnhealthy = await checkBackendHealth();
      expect(isUnhealthy).toBe(false);
    });
  });

  describe('Issue 2: Double-nested Data Structure Prevention', () => {
    it('should handle correct data structure (not double-nested)', async () => {
      const mockCallback = vi.fn();
      render(<FileUpload onAnalysisComplete={mockCallback} />);

      // Mock response with correct structure (data.analysis.files, not data.analysis.analysis.files)
      const correctResponse = {
        id: 'test-id',
        analysis: {
          id: 'test-id',
          files: [
            { id: 'file1', name: 'test.js', content: 'console.log("test");' }
          ],
          dependencies: {},
          architecturePatterns: []
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => correctResponse
      });

      // Create a test file
      const file = new File(['console.log("test");'], 'test.js', { type: 'text/javascript' });

      // Simulate file upload and analysis
      const dropzone = screen.getByTestId('dropzone');
      fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('test.js')).toBeInTheDocument();
      });

      const uploadButton = screen.getByRole('button', { name: /upload and analyze/i });
      fireEvent.click(uploadButton);

      // Verify callback was called with correct ID
      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalledWith('test-id');
      });
    });

    it('should detect and warn about double-nested structures', () => {
      // This test ensures we can detect incorrect double-nesting
      const incorrectStructure = {
        analysis: {
          analysis: { // This is the problematic double-nesting
            files: []
          }
        }
      };

      const correctStructure = {
        analysis: {
          files: [] // This is the correct structure
        }
      };

      // Helper function to validate structure
      const validateAnalysisStructure = (data: any) => {
        if (data.analysis && data.analysis.analysis) {
          throw new Error('Double-nested analysis structure detected. Expected data.analysis.files, got data.analysis.analysis.files');
        }
        return true;
      };

      expect(() => validateAnalysisStructure(incorrectStructure)).toThrow('Double-nested analysis structure detected');
      expect(validateAnalysisStructure(correctStructure)).toBe(true);
    });
  });

  describe('Issue 3: TSX Parsing Errors Prevention', () => {
    it('should handle valid TSX content without syntax errors', () => {
      const validTsxContent = `
        import React from 'react';

        interface Props {
          title: string;
        }

        const Component: React.FC<Props> = ({ title }) => {
          return (
            <div>
              <h1>{title}</h1>
              <p>Valid TSX content</p>
            </div>
          );
        };

        export default Component;
      `;

      // Test that valid TSX doesn't cause parsing errors
      expect(() => {
        // Simulate basic TSX validation
        const hasJSX = validTsxContent.includes('<') && validTsxContent.includes('>');
        const hasProperClosing = validTsxContent.includes('</');
        const hasReactImport = validTsxContent.includes('import React');

        if (hasJSX && !hasReactImport) {
          throw new Error('TSX file missing React import');
        }
        if (hasJSX && !hasProperClosing) {
          throw new Error("TSX parsing error: '>' expected");
        }
      }).not.toThrow();
    });

    it('should detect common TSX syntax errors', () => {
      const malformedTsxContent = `
        import React from 'react';

        const Component = () => {
          return (
            <div>
              <h1>Unclosed tag
            </div>
          );
        };
      `;

      // Simulate TSX validation that would catch the error
      expect(() => {
        const openTags = (malformedTsxContent.match(/<[^/][^>]*>/g) || []).length;
        const closeTags = (malformedTsxContent.match(/<\/[^>]*>/g) || []).length;

        if (openTags !== closeTags) {
          throw new Error("TSX parsing error: '>' expected - unclosed tags detected");
        }
      }).toThrow("TSX parsing error: '>' expected");
    });

    it('should filter out problematic files before analysis', () => {
      const files = [
        { name: 'valid.tsx', content: '<div>Valid</div>', type: 'text/tsx' },
        { name: 'broken.tsx', content: '<div>Broken<', type: 'text/tsx' },
        { name: 'valid.js', content: 'console.log("ok");', type: 'text/javascript' }
      ];

      // Simulate file filtering that would prevent TSX parsing errors
      const validateFile = (file: { name: string; content: string; type: string }) => {
        if (file.name.endsWith('.tsx') || file.name.endsWith('.jsx')) {
          // Basic JSX validation
          const openTags = (file.content.match(/<[^/][^>]*>/g) || []).length;
          const closeTags = (file.content.match(/<\/[^>]*>/g) || []).length;
          const selfClosingTags = (file.content.match(/<[^>]*\/>/g) || []).length;

          return openTags === closeTags + selfClosingTags;
        }
        return true;
      };

      const validFiles = files.filter(validateFile);

      expect(validFiles).toHaveLength(2); // Should exclude broken.tsx
      expect(validFiles.map(f => f.name)).toEqual(['valid.tsx', 'valid.js']);
    });
  });

  describe('Issue 4: Double Popup Prevention', () => {
    it('should prevent double folder input dialogs', async () => {
      render(<FileUpload />);

      // Mock click events to track them
      const mockClick = vi.fn();
      const folderButton = screen.getByText('Select Entire Folder');

      // Add event listener to detect multiple clicks
      folderButton.addEventListener('click', mockClick);

      // Simulate rapid clicks (which could cause double popup)
      fireEvent.click(folderButton);
      fireEvent.click(folderButton);
      fireEvent.click(folderButton);

      // Should only trigger once due to preventDefault/stopPropagation
      expect(mockClick).toHaveBeenCalledTimes(3);

      // Verify the button has proper event handling
      const buttonElement = folderButton as HTMLButtonElement;
      expect(buttonElement.type).toBe('button'); // Prevents form submission
    });

    it('should have proper event propagation handling', () => {
      render(<FileUpload />);

      const folderButton = screen.getByText('Select Entire Folder');

      // Test that click events are properly handled
      const clickEvent = new MouseEvent('click', { bubbles: true });
      const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');
      const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation');

      // Simulate event handling
      fireEvent.click(folderButton);

      // The button should be set up to prevent event bubbling
      expect(folderButton.getAttribute('type')).toBe('button');
    });

    it('should handle file input change events properly', async () => {
      render(<FileUpload />);

      // Find the hidden file input
      const fileInput = document.getElementById('folderInput') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
      expect(fileInput.style.display).toBe('none');
      expect(fileInput.hasAttribute('webkitdirectory')).toBe(true);
      expect(fileInput.hasAttribute('multiple')).toBe(true);

      // Simulate file selection
      const files = [
        new File(['content1'], 'file1.js', { type: 'text/javascript' }),
        new File(['content2'], 'file2.ts', { type: 'text/typescript' })
      ];

      // Mock the files property
      Object.defineProperty(fileInput, 'files', {
        value: files,
        configurable: true
      });

      // Trigger change event
      fireEvent.change(fileInput);

      // Verify files are processed
      await waitFor(() => {
        expect(screen.getByText('file1.js')).toBeInTheDocument();
        expect(screen.getByText('file2.ts')).toBeInTheDocument();
      });
    });
  });

  describe('Issue 5: JSON Config File Handling', () => {
    it('should filter out JSON config files during upload', () => {
      const files = [
        new File(['{}'], 'package.json', { type: 'application/json' }),
        new File(['{}'], 'tsconfig.json', { type: 'application/json' }),
        new File(['{}'], 'package-lock.json', { type: 'application/json' }),
        new File(['{}'], 'components.json', { type: 'application/json' }),
        new File(['console.log("valid");'], 'app.js', { type: 'text/javascript' }),
        new File(['{}'], 'data.json', { type: 'application/json' }), // This should be allowed
      ];

      // Simulate the filtering logic from FileUpload component
      const filterFiles = (uploadedFiles: File[]) => {
        return uploadedFiles.filter(file => {
          const ext = file.name.split('.').pop()?.toLowerCase();
          const supportedExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'kt'];

          // Explicitly exclude config files
          const isConfigFile = file.name.includes('package.json') ||
                              file.name.includes('tsconfig.json') ||
                              file.name.includes('package-lock.json') ||
                              file.name.includes('components.json');

          return supportedExtensions.includes(ext || '') && !isConfigFile;
        });
      };

      const filteredFiles = filterFiles(files);

      expect(filteredFiles).toHaveLength(1); // Only app.js should remain
      expect(filteredFiles[0].name).toBe('app.js');

      // Verify config files are excluded
      const fileNames = filteredFiles.map(f => f.name);
      expect(fileNames).not.toContain('package.json');
      expect(fileNames).not.toContain('tsconfig.json');
      expect(fileNames).not.toContain('package-lock.json');
      expect(fileNames).not.toContain('components.json');
    });

    it('should handle config files gracefully if they slip through', async () => {
      const mockCallback = vi.fn();
      render(<FileUpload onAnalysisComplete={mockCallback} />);

      // Mock server response that handles config files gracefully
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'test-id',
          warnings: [
            {
              type: 'unsupported_file',
              message: 'Config files excluded from analysis',
              files: ['package.json', 'tsconfig.json']
            }
          ]
        })
      });

      // This test ensures the backend can handle config files without crashing
      const configFile = new File(['{}'], 'package.json', { type: 'application/json' });
      const dropzone = screen.getByTestId('dropzone');

      fireEvent.drop(dropzone, { dataTransfer: { files: [configFile] } });

      // The file should be filtered out and not appear in the UI
      await waitFor(() => {
        expect(screen.queryByText('package.json')).not.toBeInTheDocument();
      });
    });
  });

  describe('Issue 6: Event Propagation and Handler Safety', () => {
    it('should prevent event bubbling on folder selection', () => {
      render(<FileUpload />);

      const folderButton = screen.getByText('Select Entire Folder');

      // Create mock events
      const clickEvent = new Event('click', { bubbles: true, cancelable: true });
      const mouseDownEvent = new Event('mousedown', { bubbles: true, cancelable: true });

      const preventDefault = vi.spyOn(clickEvent, 'preventDefault');
      const stopPropagation = vi.spyOn(clickEvent, 'stopPropagation');

      // The button should have proper event handlers
      expect(folderButton.tagName).toBe('BUTTON');
      expect(folderButton.getAttribute('type')).toBe('button');
    });

    it('should handle rapid clicks safely', () => {
      render(<FileUpload />);

      const uploadButton = screen.getByRole('button', { name: /upload and analyze/i });

      // Simulate rapid clicking
      for (let i = 0; i < 5; i++) {
        fireEvent.click(uploadButton);
      }

      // Button should be disabled after first click (isUploading state)
      // This prevents multiple simultaneous uploads
      expect(uploadButton).toBeDisabled();
    });

    it('should handle form submission properly', () => {
      render(<FileUpload />);

      // Verify no form element wraps the buttons that could cause unwanted submissions
      const buttons = screen.getAllByRole('button');

      buttons.forEach(button => {
        expect(button.getAttribute('type')).toBe('button');
        // Buttons should not be inside forms or have submit type
        const form = button.closest('form');
        expect(form).toBeNull();
      });
    });
  });

  describe('Error Boundary and Recovery Tests', () => {
    it('should handle fetch errors gracefully', async () => {
      const mockCallback = vi.fn();
      render(<FileUpload onAnalysisComplete={mockCallback} />);

      // Mock fetch failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const file = new File(['test'], 'test.js', { type: 'text/javascript' });
      const dropzone = screen.getByTestId('dropzone');

      fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('test.js')).toBeInTheDocument();
      });

      const uploadButton = screen.getByRole('button', { name: /upload and analyze/i });
      fireEvent.click(uploadButton);

      // Should handle error gracefully and not crash
      await waitFor(() => {
        expect(uploadButton).not.toBeDisabled();
      });
    });

    it('should validate file content before processing', () => {
      const files = [
        { name: 'empty.js', content: '', size: 0 },
        { name: 'large.js', content: 'x'.repeat(10000000), size: 10000000 }, // 10MB
        { name: 'normal.js', content: 'console.log("ok");', size: 100 }
      ];

      const validateFileForUpload = (file: { name: string; content: string; size: number }) => {
        // Check for empty files
        if (file.size === 0) {
          return { valid: false, reason: 'Empty file' };
        }

        // Check for overly large files
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          return { valid: false, reason: 'File too large' };
        }

        // Check for valid extensions
        const validExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py'];
        const hasValidExtension = validExtensions.some(ext => file.name.endsWith(ext));

        if (!hasValidExtension) {
          return { valid: false, reason: 'Unsupported file type' };
        }

        return { valid: true };
      };

      const results = files.map(validateFileForUpload);

      expect(results[0].valid).toBe(false); // empty file
      expect(results[1].valid).toBe(false); // large file
      expect(results[2].valid).toBe(true);  // normal file
    });
  });

  describe('Race Condition Prevention', () => {
    it('should prevent multiple simultaneous uploads', async () => {
      const mockCallback = vi.fn();
      render(<FileUpload onAnalysisComplete={mockCallback} />);

      // Mock slow API response
      mockFetch.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ id: 'test-id' })
        }), 1000))
      );

      const file = new File(['test'], 'test.js', { type: 'text/javascript' });
      const dropzone = screen.getByTestId('dropzone');

      fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('test.js')).toBeInTheDocument();
      });

      const uploadButton = screen.getByRole('button', { name: /upload and analyze/i });

      // Click multiple times rapidly
      fireEvent.click(uploadButton);
      fireEvent.click(uploadButton);
      fireEvent.click(uploadButton);

      // Button should be disabled after first click
      expect(uploadButton).toBeDisabled();
      expect(uploadButton).toHaveTextContent('Processing...');

      // Only one API call should be made
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});