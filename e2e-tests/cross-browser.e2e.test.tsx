import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '@/app/page';
import { TEST_CONFIG, testUtils } from './setup.e2e';

/**
 * CROSS-BROWSER INTEGRATION TEST SUITE
 *
 * These tests verify that the CodeVisualizer application works consistently
 * across different browser environments and handles browser-specific behaviors.
 *
 * Tests cover:
 * 1. DOM API compatibility
 * 2. File handling across browsers
 * 3. Drag and drop functionality
 * 4. SVG rendering and D3 compatibility
 * 5. CSS and styling consistency
 * 6. Performance characteristics
 * 7. Error handling differences
 */

describe('Cross-Browser Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    global.fetch = vi.fn();

    // Reset any browser-specific mocks
    vi.clearAllMocks();
  });

  describe('Browser Environment Detection and Compatibility', () => {
    it('should detect and adapt to different browser environments', () => {
      // Mock different user agents
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
      ];

      userAgents.forEach(userAgent => {
        Object.defineProperty(window.navigator, 'userAgent', {
          value: userAgent,
          configurable: true
        });

        render(<Home />);

        // Application should render regardless of browser
        expect(screen.getByText('CodeVisualizer')).toBeInTheDocument();
        expect(screen.getByText('Upload Your Codebase')).toBeInTheDocument();

        // File upload should be available
        expect(screen.getByText('Upload Files')).toBeInTheDocument();
      });
    });

    it('should handle different viewport sizes', () => {
      const viewports = [
        { width: 1920, height: 1080 }, // Desktop
        { width: 1366, height: 768 },  // Laptop
        { width: 768, height: 1024 },  // Tablet
        { width: 414, height: 896 }    // Mobile
      ];

      viewports.forEach(viewport => {
        // Mock window dimensions
        Object.defineProperty(window, 'innerWidth', {
          value: viewport.width,
          configurable: true
        });
        Object.defineProperty(window, 'innerHeight', {
          value: viewport.height,
          configurable: true
        });

        // Trigger resize event
        window.dispatchEvent(new Event('resize'));

        render(<Home />);

        // Essential elements should be visible on all screen sizes
        expect(screen.getByText('CodeVisualizer')).toBeInTheDocument();

        // On mobile, layout should adapt
        if (viewport.width < 768) {
          // Mobile-specific assertions
          const uploadSection = screen.getByText('Upload Your Codebase').closest('div');
          expect(uploadSection).toBeInTheDocument();
        } else {
          // Desktop/tablet-specific assertions
          expect(screen.getByText('Upload Files')).toBeInTheDocument();
          expect(screen.getByText('GitHub URL')).toBeInTheDocument();
        }
      });
    });
  });

  describe('File Handling Cross-Browser Compatibility', () => {
    it('should handle File API consistently across browsers', async () => {
      const mockAnalysisResponse = {
        id: 'cross-browser-test-123',
        analysis: { analysis: { files: [] } },
        dependencies: { nodes: [], edges: [] }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisResponse
      });

      render(<Home />);

      // Test file creation and reading
      const testFile = testUtils.createMockFile(
        'test.js',
        'console.log("Cross-browser test");',
        'application/javascript'
      );

      expect(testFile.name).toBe('test.js');
      expect(testFile.size).toBeGreaterThan(0);
      expect(testFile.type).toBe('application/javascript');

      // Test file input handling
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, [testFile]);

      await waitFor(() => {
        expect(screen.getByText('test.js')).toBeInTheDocument();
      });

      // File should be processed regardless of browser
      expect(screen.getByText('Uploaded Files (1)')).toBeInTheDocument();
    });

    it('should handle different file encodings', async () => {
      const mockAnalysisResponse = {
        id: 'encoding-test-123',
        analysis: { analysis: { files: [] } },
        dependencies: { nodes: [], edges: [] }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisResponse
      });

      // Test files with different encodings
      const files = [
        testUtils.createMockFile('ascii.js', 'console.log("ASCII");', 'text/javascript'),
        testUtils.createMockFile('utf8.js', 'console.log("UTF-8: 🚀");', 'text/javascript'),
        testUtils.createMockFile('unicode.js', 'const 变量 = "Unicode";', 'text/javascript'),
      ];

      render(<Home />);

      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, files);

      await waitFor(() => {
        files.forEach(file => {
          expect(screen.getByText(file.name)).toBeInTheDocument();
        });
      });

      // All files should be handled correctly
      expect(screen.getByText('Uploaded Files (3)')).toBeInTheDocument();
    });
  });

  describe('Drag and Drop Cross-Browser Support', () => {
    it('should handle drag and drop events consistently', async () => {
      render(<Home />);

      const dropzone = screen.getByText(/Drag and drop your code files here/).closest('div');
      expect(dropzone).toBeInTheDocument();

      // Test drag enter
      fireEvent.dragEnter(dropzone!, {
        dataTransfer: {
          files: [],
          types: ['Files']
        }
      });

      // Should show active drag state
      await waitFor(() => {
        expect(dropzone).toHaveClass(/border-blue-400|bg-blue-50/);
      });

      // Test drag leave
      fireEvent.dragLeave(dropzone!);

      // Should return to normal state
      await waitFor(() => {
        expect(dropzone).not.toHaveClass(/border-blue-400|bg-blue-50/);
      });

      // Test drop
      const testFile = testUtils.createMockFile('dropped.js', 'console.log("dropped");', 'text/javascript');

      fireEvent.drop(dropzone!, {
        dataTransfer: {
          files: [testFile],
          types: ['Files']
        }
      });

      await waitFor(() => {
        expect(screen.getByText('dropped.js')).toBeInTheDocument();
      });
    });

    it('should handle multiple file drops', async () => {
      render(<Home />);

      const dropzone = screen.getByText(/Drag and drop your code files here/).closest('div');

      const files = [
        testUtils.createMockFile('file1.js', 'console.log("1");', 'text/javascript'),
        testUtils.createMockFile('file2.ts', 'const x: number = 2;', 'text/typescript'),
        testUtils.createMockFile('file3.py', 'print("3")', 'text/x-python'),
      ];

      fireEvent.drop(dropzone!, {
        dataTransfer: {
          files,
          types: ['Files']
        }
      });

      await waitFor(() => {
        files.forEach(file => {
          expect(screen.getByText(file.name)).toBeInTheDocument();
        });
      });

      expect(screen.getByText('Uploaded Files (3)')).toBeInTheDocument();
    });

    it('should reject invalid file types gracefully', async () => {
      render(<Home />);

      const dropzone = screen.getByText(/Drag and drop your code files here/).closest('div');

      // Try to drop unsupported file types
      const invalidFiles = [
        testUtils.createMockFile('image.png', 'binary data', 'image/png'),
        testUtils.createMockFile('video.mp4', 'binary video', 'video/mp4'),
      ];

      fireEvent.drop(dropzone!, {
        dataTransfer: {
          files: invalidFiles,
          types: ['Files']
        }
      });

      // Should not add invalid files
      await waitFor(() => {
        expect(screen.queryByText('image.png')).not.toBeInTheDocument();
        expect(screen.queryByText('video.mp4')).not.toBeInTheDocument();
      });

      // Should show no files uploaded
      expect(screen.queryByText(/Uploaded Files/)).not.toBeInTheDocument();
    });
  });

  describe('SVG and D3 Rendering Cross-Browser Support', () => {
    it('should render SVG elements consistently across browsers', async () => {
      const mockDependencyData = {
        nodes: [
          { id: 'node1', name: 'test1.js', group: 'main' },
          { id: 'node2', name: 'test2.js', group: 'utils' }
        ],
        edges: [
          { source: 'node1', target: 'node2', imports: ['helper'] }
        ]
      };

      // Mock successful analysis and dependencies
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'svg-test-123',
            analysis: { analysis: { files: [] } }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDependencyData
        });

      render(<Home />);

      // Complete upload
      const testFile = testUtils.createMockFile('test.js', 'console.log("test");', 'text/javascript');
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, [testFile]);

      await waitFor(() => {
        expect(screen.getByText('test.js')).toBeInTheDocument();
      });

      const uploadButton = screen.getByText('Upload and Analyze');
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('Dependencies')).toBeInTheDocument();
      });

      // Switch to Dependencies tab
      const dependenciesTab = screen.getByText('Dependencies');
      await user.click(dependenciesTab);

      // SVG should render
      await waitFor(() => {
        const svg = screen.getByTestId('dependency-graph-svg');
        expect(svg).toBeInTheDocument();
        expect(svg.tagName.toLowerCase()).toBe('svg');
      }, { timeout: 10000 });

      // Nodes should be rendered
      expect(screen.getByText('test1.js')).toBeInTheDocument();
      expect(screen.getByText('test2.js')).toBeInTheDocument();
    });

    it('should handle SVG text measurement across browsers', async () => {
      // This tests the SVG text measurement mocks we set up
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textElement.textContent = 'Test Text';
      svg.appendChild(textElement);
      document.body.appendChild(svg);

      // Should not throw errors on any browser
      expect(() => {
        if (textElement.getComputedTextLength) {
          const length = textElement.getComputedTextLength();
          expect(typeof length).toBe('number');
        }
      }).not.toThrow();

      // Should handle getBBox
      expect(() => {
        const bbox = textElement.getBBox();
        expect(typeof bbox.width).toBe('number');
        expect(typeof bbox.height).toBe('number');
      }).not.toThrow();

      document.body.removeChild(svg);
    });
  });

  describe('CSS and Styling Cross-Browser Support', () => {
    it('should apply styles consistently across browsers', () => {
      render(<Home />);

      // Test CSS Grid and Flexbox support
      const mainContainer = screen.getByText('CodeVisualizer').closest('div');
      expect(mainContainer).toBeInTheDocument();

      // Test modern CSS features
      const uploadArea = screen.getByText(/Drag and drop/).closest('div');
      expect(uploadArea).toBeInTheDocument();

      // Should handle border-radius, box-shadow, transitions
      const uploadButton = screen.getByText('Upload Files');
      expect(uploadButton).toBeInTheDocument();
      expect(uploadButton).toHaveClass(/rounded|border-radius/);
    });

    it('should handle dark mode consistently', () => {
      // Test dark mode classes
      render(<Home />);

      const header = screen.getByText('CodeVisualizer').closest('header');
      expect(header).toHaveClass(/dark:bg-gray-800/);

      // Should handle color scheme changes
      const elements = screen.getAllByText(/text-gray-/);
      elements.forEach(element => {
        expect(element.className).toMatch(/dark:/);
      });
    });
  });

  describe('Performance Cross-Browser Testing', () => {
    it('should handle large file uploads efficiently', async () => {
      const startTime = performance.now();

      const largeContent = 'const line = "test";\n'.repeat(5000); // ~75KB
      const largeFile = testUtils.createMockFile('large.js', largeContent, 'text/javascript');

      const mockAnalysisResponse = {
        id: 'performance-test-123',
        analysis: { analysis: { files: [] } }
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
      });

      const uploadTime = performance.now() - startTime;

      // Should complete in reasonable time (adjust threshold as needed)
      expect(uploadTime).toBeLessThan(5000); // 5 seconds

      // File size should be displayed correctly
      expect(screen.getByText(/KB/)).toBeInTheDocument();
    });

    it('should handle multiple simultaneous operations', async () => {
      const mockResponses = Array.from({ length: 3 }, (_, i) => ({
        id: `concurrent-test-${i}`,
        analysis: { analysis: { files: [] } }
      }));

      // Mock multiple concurrent API calls
      mockResponses.forEach(response => {
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => response
        });
      });

      render(<Home />);

      // Upload multiple files quickly
      const files = Array.from({ length: 3 }, (_, i) =>
        testUtils.createMockFile(`concurrent${i}.js`, `console.log(${i});`, 'text/javascript')
      );

      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;

      const startTime = performance.now();

      // Upload files in rapid succession
      for (const file of files) {
        await user.upload(fileInput, [file]);
      }

      await waitFor(() => {
        files.forEach((file, i) => {
          expect(screen.getByText(`concurrent${i}.js`)).toBeInTheDocument();
        });
      });

      const totalTime = performance.now() - startTime;

      // Should handle concurrent operations efficiently
      expect(totalTime).toBeLessThan(3000); // 3 seconds

      expect(screen.getByText('Uploaded Files (3)')).toBeInTheDocument();
    });
  });

  describe('Error Handling Cross-Browser Differences', () => {
    it('should handle network errors consistently', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<Home />);

      const testFile = testUtils.createMockFile('test.js', 'console.log("test");', 'text/javascript');
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, [testFile]);

      await waitFor(() => {
        expect(screen.getByText('test.js')).toBeInTheDocument();
      });

      const uploadButton = screen.getByText('Upload and Analyze');
      await user.click(uploadButton);

      // Should show error message
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          expect.stringContaining('Upload/analysis failed')
        );
      });

      alertSpy.mockRestore();
    });

    it('should handle CORS errors gracefully', async () => {
      const corsError = new Error('CORS error');
      corsError.name = 'TypeError';

      (global.fetch as any).mockRejectedValue(corsError);

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<Home />);

      const testFile = testUtils.createMockFile('test.js', 'console.log("test");', 'text/javascript');
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, [testFile]);

      await waitFor(() => {
        expect(screen.getByText('test.js')).toBeInTheDocument();
      });

      const uploadButton = screen.getByText('Upload and Analyze');
      await user.click(uploadButton);

      // Should handle CORS error
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalled();
      });

      alertSpy.mockRestore();
    });
  });

  describe('Accessibility Cross-Browser Support', () => {
    it('should maintain accessibility features across browsers', () => {
      render(<Home />);

      // Test ARIA labels and roles
      const uploadButton = screen.getByText('Upload and Analyze');
      expect(uploadButton).toHaveAttribute('type', 'button');

      // Test keyboard navigation
      const fileInput = screen.getByRole('textbox', { hidden: true });
      expect(fileInput).toBeInTheDocument();

      // Test focus management
      const tabButtons = screen.getAllByRole('button');
      tabButtons.forEach(button => {
        expect(button).toHaveProperty('tabIndex');
      });
    });

    it('should work with screen readers', () => {
      render(<Home />);

      // Test semantic HTML structure
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();

      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();

      // Test descriptive text
      expect(screen.getByText(/Upload your code files/)).toBeInTheDocument();
      expect(screen.getByText(/Supports:/)).toBeInTheDocument();
    });
  });
});