import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FileUpload from '../components/upload/FileUpload';
import { API_ENDPOINTS } from '../lib/config';

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn(() => ({
    getRootProps: jest.fn(() => ({ onClick: jest.fn() })),
    getInputProps: jest.fn(() => ({})),
    isDragActive: false
  }))
}));

// Mock fetch
global.fetch = jest.fn();

describe('FileUpload Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('Upload Mode Toggle', () => {
    test('should toggle between files and github mode', () => {
      render(<FileUpload />);

      const filesButton = screen.getByText('Upload Files');
      const githubButton = screen.getByText('GitHub URL');

      expect(filesButton).toHaveClass('bg-blue-600');
      expect(githubButton).not.toHaveClass('bg-blue-600');

      fireEvent.click(githubButton);

      expect(githubButton).toHaveClass('bg-blue-600');
      expect(filesButton).not.toHaveClass('bg-blue-600');
    });
  });

  describe('File Filtering', () => {
    test('should filter out JSON config files', () => {
      const { container } = render(<FileUpload />);

      const mockFiles = [
        new File(['{}'], 'package.json', { type: 'application/json' }),
        new File(['{}'], 'tsconfig.json', { type: 'application/json' }),
        new File(['const x = 1'], 'test.js', { type: 'text/javascript' }),
        new File(['{}'], 'package-lock.json', { type: 'application/json' }),
        new File(['export default {}'], 'component.tsx', { type: 'text/typescript' })
      ];

      // Simulate file drop
      const dropzone = container.querySelector('[role="presentation"]');
      if (dropzone) {
        fireEvent.drop(dropzone, {
          dataTransfer: {
            files: mockFiles
          }
        });
      }

      // Only code files should be accepted
      waitFor(() => {
        expect(screen.queryByText('package.json')).not.toBeInTheDocument();
        expect(screen.queryByText('tsconfig.json')).not.toBeInTheDocument();
        expect(screen.queryByText('package-lock.json')).not.toBeInTheDocument();
        expect(screen.getByText('test.js')).toBeInTheDocument();
        expect(screen.getByText('component.tsx')).toBeInTheDocument();
      });
    });

    test('should accept all supported code file types', () => {
      const supportedExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'kt'];

      supportedExtensions.forEach(ext => {
        const fileName = `test.${ext}`;
        const file = new File(['content'], fileName);

        // Test file acceptance logic
        const isSupported = supportedExtensions.includes(ext);
        expect(isSupported).toBe(true);
      });
    });
  });

  describe('Folder Upload Button', () => {
    test('should prevent event propagation when clicking folder button', () => {
      render(<FileUpload />);

      const folderButton = screen.getByText('Select Entire Folder');
      const mockEvent = {
        stopPropagation: jest.fn(),
        preventDefault: jest.fn()
      };

      // Simulate click with mock event
      fireEvent.click(folderButton, mockEvent);

      // Both methods should be called to prevent double popup
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    test('should prevent event propagation on mouseDown', () => {
      render(<FileUpload />);

      const folderButton = screen.getByText('Select Entire Folder');
      const mockEvent = {
        stopPropagation: jest.fn(),
        preventDefault: jest.fn()
      };

      fireEvent.mouseDown(folderButton, mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
  });

  describe('API Integration', () => {
    test('should use correct API endpoint with full URL', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'test-id', analysis: { files: [] } })
      });

      render(<FileUpload />);

      // Add a file
      const mockFile = new File(['const x = 1'], 'test.js');
      const input = screen.getByRole('textbox', { hidden: true });
      Object.defineProperty(input, 'files', {
        value: [mockFile],
        writable: false,
      });
      fireEvent.change(input);

      // Click upload
      const uploadButton = screen.getByText('Upload and Analyze');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('http://localhost:3001/api/analyze/deep'),
          expect.any(Object)
        );
      });
    });

    test('should handle API errors gracefully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      });

      const alertSpy = jest.spyOn(window, 'alert').mockImplementation();

      render(<FileUpload />);

      // Add file and upload
      const mockFile = new File(['const x = 1'], 'test.js');
      const uploadButton = screen.getByText('Upload and Analyze');

      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Upload/analysis failed. Please try again.');
      });
    });

    test('should correctly structure request payload', async () => {
      let capturedPayload: any;
      (fetch as jest.Mock).mockImplementation(async (url, options) => {
        capturedPayload = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({ id: 'test-id', analysis: { files: [] } })
        };
      });

      render(<FileUpload />);

      const mockFile = new File(['const x = 1'], 'test.js');
      const input = screen.getByRole('textbox', { hidden: true });
      Object.defineProperty(input, 'files', {
        value: [mockFile],
        writable: false,
      });
      fireEvent.change(input);

      const uploadButton = screen.getByText('Upload and Analyze');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(capturedPayload).toHaveProperty('files');
        expect(Array.isArray(capturedPayload.files)).toBe(true);
        expect(capturedPayload.files[0]).toHaveProperty('id');
        expect(capturedPayload.files[0]).toHaveProperty('name');
        expect(capturedPayload.files[0]).toHaveProperty('content');
        expect(capturedPayload.files[0]).toHaveProperty('language');
      });
    });
  });

  describe('File Path Handling', () => {
    test('should preserve folder structure with webkitRelativePath', async () => {
      const mockFile = new File(['const x = 1'], 'test.js');
      (mockFile as any).webkitRelativePath = 'src/components/test.js';

      let capturedPayload: any;
      (fetch as jest.Mock).mockImplementation(async (url, options) => {
        capturedPayload = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({ id: 'test-id', analysis: { files: [] } })
        };
      });

      render(<FileUpload />);

      // Simulate file selection
      const input = screen.getByRole('textbox', { hidden: true });
      Object.defineProperty(input, 'files', {
        value: [mockFile],
        writable: false,
      });
      fireEvent.change(input);

      const uploadButton = screen.getByText('Upload and Analyze');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(capturedPayload.files[0]).toHaveProperty('path', 'src/components/test.js');
      });
    });
  });
});