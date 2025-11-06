import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '@/app/page';
import { TEST_CONFIG, testUtils } from './setup.e2e';

/**
 * TABS FUNCTIONALITY E2E TESTS
 *
 * These tests verify the complete tab navigation and data display
 * functionality across Overview, Dependencies, and Metrics tabs.
 *
 * Tests cover:
 * 1. Tab navigation and state management
 * 2. Data persistence across tab switches
 * 3. Individual tab component functionality
 * 4. Tab-specific error handling
 * 5. Performance of tab switching
 * 6. URL state synchronization (if implemented)
 */

describe('Tabs Functionality E2E Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  // Mock data for all components
  const mockAnalysisData = {
    id: 'tabs-test-analysis-123',
    analysis: {
      analysis: {
        files: [
          {
            path: 'src/components/Header.tsx',
            language: 'typescript',
            imports: ['react', '@/lib/utils'],
            exports: ['Header', 'HeaderProps'],
            functions: ['Header', 'handleNavigation'],
            classes: [],
            complexity: 6,
            metrics: {
              linesOfCode: 124,
              cyclomaticComplexity: 6,
              maintainabilityIndex: 82,
              cognitiveComplexity: 4
            }
          },
          {
            path: 'src/lib/api.ts',
            language: 'typescript',
            imports: ['axios', 'zod'],
            exports: ['fetchUser', 'updateUser', 'UserSchema'],
            functions: ['fetchUser', 'updateUser', 'validateUser'],
            classes: ['ApiClient'],
            complexity: 9,
            metrics: {
              linesOfCode: 203,
              cyclomaticComplexity: 9,
              maintainabilityIndex: 75,
              cognitiveComplexity: 7
            }
          }
        ]
      }
    }
  };

  const mockDependenciesData = {
    nodes: [
      {
        id: 'src/components/Header.tsx',
        name: 'Header.tsx',
        group: 'components',
        imports: 2,
        exports: 2,
        complexity: 6
      },
      {
        id: 'src/lib/api.ts',
        name: 'api.ts',
        group: 'lib',
        imports: 2,
        exports: 3,
        complexity: 9
      },
      {
        id: 'src/lib/utils.ts',
        name: 'utils.ts',
        group: 'lib',
        imports: 1,
        exports: 4,
        complexity: 3
      }
    ],
    edges: [
      {
        source: 'src/components/Header.tsx',
        target: 'src/lib/utils.ts',
        imports: ['cn', 'formatText']
      },
      {
        source: 'src/lib/api.ts',
        target: 'src/lib/utils.ts',
        imports: ['validateInput']
      }
    ]
  };

  const mockMetricsData = {
    overall: {
      averageComplexity: 7.5,
      totalLines: 327,
      fileCount: 2,
      duplicationPercentage: 5.2,
      maintainabilityIndex: 78.5,
      technicalDebt: 8.3
    },
    files: [
      {
        name: 'src/components/Header.tsx',
        complexity: 6,
        lines: 124,
        maintainability: 82,
        duplication: 3.1
      },
      {
        name: 'src/lib/api.ts',
        complexity: 9,
        lines: 203,
        maintainability: 75,
        duplication: 7.3
      }
    ],
    complexityDistribution: [
      { range: '1-5', count: 0 },
      { range: '6-10', count: 2 },
      { range: '11-15', count: 0 },
      { range: '16+', count: 0 }
    ]
  };

  beforeEach(() => {
    user = userEvent.setup();
    global.fetch = vi.fn();
  });

  describe('Tab Navigation and State Management', () => {
    it('should display all three tabs after analysis completion', async () => {
      // Mock the upload and analysis flow
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisData
      });

      render(<Home />);

      // Simulate completing an upload (we'll mock this by directly setting the state)
      // Upload a test file
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
      }, { timeout: 10000 });

      // Verify all tabs are present
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Dependencies')).toBeInTheDocument();
      expect(screen.getByText('Metrics')).toBeInTheDocument();

      // Overview tab should be active by default
      const overviewTab = screen.getByText('Overview').closest('button');
      expect(overviewTab).toHaveClass(/border-blue-500|text-blue-600/);

      // Other tabs should not be active
      const dependenciesTab = screen.getByText('Dependencies').closest('button');
      const metricsTab = screen.getByText('Metrics').closest('button');
      expect(dependenciesTab).not.toHaveClass(/border-blue-500|text-blue-600/);
      expect(metricsTab).not.toHaveClass(/border-blue-500|text-blue-600/);
    });

    it('should switch between tabs correctly', async () => {
      // Set up initial state with analysis completed
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAnalysisData
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDependenciesData
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMetricsData
        });

      render(<Home />);

      // Complete upload flow (simplified)
      const testFile = testUtils.createMockFile('test.js', 'console.log("test");', 'text/javascript');
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, [testFile]);

      await waitFor(() => {
        expect(screen.getByText('test.js')).toBeInTheDocument();
      });

      const uploadButton = screen.getByText('Upload and Analyze');
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('Analysis Results')).toBeInTheDocument();
      });

      // Click Dependencies tab
      const dependenciesTab = screen.getByText('Dependencies');
      await user.click(dependenciesTab);

      // Dependencies tab should be active
      expect(dependenciesTab.closest('button')).toHaveClass(/border-blue-500|text-blue-600/);

      // Should show dependency graph content
      await waitFor(() => {
        expect(screen.getByTestId('dependency-graph-svg')).toBeInTheDocument();
      });

      // Click Metrics tab
      const metricsTab = screen.getByText('Metrics');
      await user.click(metricsTab);

      // Metrics tab should be active
      expect(metricsTab.closest('button')).toHaveClass(/border-blue-500|text-blue-600/);

      // Should show metrics content
      await waitFor(() => {
        expect(screen.getByTestId('complexity-chart')).toBeInTheDocument();
      });

      // Click back to Overview
      const overviewTab = screen.getByText('Overview');
      await user.click(overviewTab);

      // Overview tab should be active again
      expect(overviewTab.closest('button')).toHaveClass(/border-blue-500|text-blue-600/);

      // Should show overview content
      await waitFor(() => {
        expect(screen.getByText('src/components/Header.tsx')).toBeInTheDocument();
      });
    });

    it('should maintain tab state during rapid switching', async () => {
      // Mock all API responses
      (global.fetch as any)
        .mockResolvedValue({
          ok: true,
          json: async () => mockAnalysisData
        })
        .mockResolvedValue({
          ok: true,
          json: async () => mockDependenciesData
        })
        .mockResolvedValue({
          ok: true,
          json: async () => mockMetricsData
        });

      render(<Home />);

      // Complete upload flow
      const testFile = testUtils.createMockFile('test.js', 'console.log("test");', 'text/javascript');
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, [testFile]);

      await waitFor(() => {
        expect(screen.getByText('test.js')).toBeInTheDocument();
      });

      const uploadButton = screen.getByText('Upload and Analyze');
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('Analysis Results')).toBeInTheDocument();
      });

      // Rapidly switch between tabs
      const tabs = ['Dependencies', 'Metrics', 'Overview', 'Dependencies', 'Overview'];

      for (const tabName of tabs) {
        const tab = screen.getByText(tabName);
        await user.click(tab);

        // Verify tab is active
        expect(tab.closest('button')).toHaveClass(/border-blue-500|text-blue-600/);

        // Wait a moment for state to settle
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Final state should be Overview
      const overviewTab = screen.getByText('Overview');
      expect(overviewTab.closest('button')).toHaveClass(/border-blue-500|text-blue-600/);
    });
  });

  describe('Overview Tab Functionality', () => {
    it('should display comprehensive file analysis in Overview tab', async () => {
      // Mock analysis data
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisData
      });

      render(<Home />);

      // Simulate completed analysis state
      const testFile = testUtils.createMockFile('test.js', 'console.log("test");', 'text/javascript');
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, [testFile]);

      await waitFor(() => {
        expect(screen.getByText('test.js')).toBeInTheDocument();
      });

      const uploadButton = screen.getByText('Upload and Analyze');
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('Analysis Results')).toBeInTheDocument();
      });

      // Should show file details
      expect(screen.getByText('src/components/Header.tsx')).toBeInTheDocument();
      expect(screen.getByText('src/lib/api.ts')).toBeInTheDocument();

      // Should show metrics
      expect(screen.getByText(/Lines of Code: 124/)).toBeInTheDocument();
      expect(screen.getByText(/Complexity: 6/)).toBeInTheDocument();
      expect(screen.getByText(/Functions: 2/)).toBeInTheDocument();

      // Should show summary statistics
      expect(screen.getByText(/Total Files: 2/)).toBeInTheDocument();
      expect(screen.getByText(/Total Lines: 327/)).toBeInTheDocument();
    });

    it('should handle file expansion and collapsing in Overview', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisData
      });

      render(<Home />);

      // Complete analysis
      const testFile = testUtils.createMockFile('test.js', 'console.log("test");', 'text/javascript');
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, [testFile]);

      await waitFor(() => {
        expect(screen.getByText('test.js')).toBeInTheDocument();
      });

      const uploadButton = screen.getByText('Upload and Analyze');
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('src/components/Header.tsx')).toBeInTheDocument();
      });

      // Find expandable file item
      const fileItem = screen.getByText('src/components/Header.tsx').closest('[data-testid="file-item"]');
      const expandButton = fileItem?.querySelector('[data-testid="expand-button"]');

      if (expandButton) {
        await user.click(expandButton);

        // Should show detailed information
        await waitFor(() => {
          expect(screen.getByText('handleNavigation')).toBeInTheDocument();
          expect(screen.getByText('@/lib/utils')).toBeInTheDocument();
        });

        // Click again to collapse
        await user.click(expandButton);

        // Detailed info should be hidden
        await waitFor(() => {
          expect(screen.queryByText('handleNavigation')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Dependencies Tab Functionality', () => {
    it('should render dependency graph correctly', async () => {
      // Mock initial analysis and dependencies data
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAnalysisData
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDependenciesData
        });

      render(<Home />);

      // Complete analysis
      const testFile = testUtils.createMockFile('test.js', 'console.log("test");', 'text/javascript');
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, [testFile]);

      await waitFor(() => {
        expect(screen.getByText('test.js')).toBeInTheDocument();
      });

      const uploadButton = screen.getByText('Upload and Analyze');
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('Analysis Results')).toBeInTheDocument();
      });

      // Switch to Dependencies tab
      const dependenciesTab = screen.getByText('Dependencies');
      await user.click(dependenciesTab);

      // Wait for dependency graph to load
      await waitFor(() => {
        expect(screen.getByTestId('dependency-graph-svg')).toBeInTheDocument();
      }, { timeout: 10000 });

      // Should show node information
      expect(screen.getByText('Header.tsx')).toBeInTheDocument();
      expect(screen.getByText('api.ts')).toBeInTheDocument();
      expect(screen.getByText('utils.ts')).toBeInTheDocument();

      // Verify API call for dependencies
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/dependencies')
      );
    });

    it('should support interactive dependency exploration', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAnalysisData
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDependenciesData
        });

      render(<Home />);

      // Complete analysis and go to Dependencies tab
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

      const dependenciesTab = screen.getByText('Dependencies');
      await user.click(dependenciesTab);

      await waitFor(() => {
        expect(screen.getByTestId('dependency-graph-svg')).toBeInTheDocument();
      });

      // Click on a node
      const headerNode = screen.getByTestId('node-src/components/Header.tsx');
      await user.click(headerNode);

      // Should show node details
      await waitFor(() => {
        expect(screen.getByText(/Imports: 2/)).toBeInTheDocument();
        expect(screen.getByText(/Exports: 2/)).toBeInTheDocument();
      });
    });
  });

  describe('Metrics Tab Functionality', () => {
    it('should display code metrics with visualizations', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAnalysisData
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMetricsData
        });

      render(<Home />);

      // Complete analysis
      const testFile = testUtils.createMockFile('test.js', 'console.log("test");', 'text/javascript');
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, [testFile]);

      await waitFor(() => {
        expect(screen.getByText('test.js')).toBeInTheDocument();
      });

      const uploadButton = screen.getByText('Upload and Analyze');
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('Metrics')).toBeInTheDocument();
      });

      // Switch to Metrics tab
      const metricsTab = screen.getByText('Metrics');
      await user.click(metricsTab);

      // Wait for metrics to load
      await waitFor(() => {
        expect(screen.getByText(/Average Complexity: 7.5/)).toBeInTheDocument();
        expect(screen.getByText(/Total Lines: 327/)).toBeInTheDocument();
      }, { timeout: 10000 });

      // Should show chart
      expect(screen.getByTestId('complexity-chart')).toBeInTheDocument();

      // Should show file-specific metrics
      expect(screen.getByText('src/components/Header.tsx')).toBeInTheDocument();
      expect(screen.getByText('src/lib/api.ts')).toBeInTheDocument();

      // Verify API call for metrics
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/metrics')
      );
    });

    it('should highlight files with concerning metrics', async () => {
      const metricsWithConcerns = {
        ...mockMetricsData,
        files: [
          {
            name: 'src/components/ProblematicComponent.tsx',
            complexity: 25, // Very high
            lines: 1200,
            maintainability: 35, // Very low
            duplication: 45.2
          },
          {
            name: 'src/lib/GoodModule.ts',
            complexity: 3,
            lines: 89,
            maintainability: 95,
            duplication: 0
          }
        ]
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAnalysisData
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => metricsWithConcerns
        });

      render(<Home />);

      // Complete analysis and go to Metrics
      const testFile = testUtils.createMockFile('test.js', 'console.log("test");', 'text/javascript');
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, [testFile]);

      await waitFor(() => {
        expect(screen.getByText('test.js')).toBeInTheDocument();
      });

      const uploadButton = screen.getByText('Upload and Analyze');
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('Metrics')).toBeInTheDocument();
      });

      const metricsTab = screen.getByText('Metrics');
      await user.click(metricsTab);

      await waitFor(() => {
        expect(screen.getByText('ProblematicComponent.tsx')).toBeInTheDocument();
      });

      // Problematic file should be highlighted
      const problematicFile = screen.getByText('ProblematicComponent.tsx');
      expect(problematicFile.closest('div')).toHaveClass(/high-complexity|warning|danger/);

      // Good file should not be highlighted
      const goodFile = screen.getByText('GoodModule.ts');
      expect(goodFile.closest('div')).not.toHaveClass(/high-complexity|warning|danger/);

      // Should show warning indicators
      expect(screen.getByText(/high complexity/i)).toBeInTheDocument();
      expect(screen.getByText(/low maintainability/i)).toBeInTheDocument();
    });
  });

  describe('Tab Performance and Data Persistence', () => {
    it('should cache data between tab switches', async () => {
      let apiCallCount = 0;

      (global.fetch as any).mockImplementation((url: string) => {
        apiCallCount++;

        if (url.includes('/analysis/')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockAnalysisData
          });
        }
        if (url.includes('/dependencies')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockDependenciesData
          });
        }
        if (url.includes('/metrics')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockMetricsData
          });
        }
      });

      render(<Home />);

      // Complete analysis
      const testFile = testUtils.createMockFile('test.js', 'console.log("test");', 'text/javascript');
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, [testFile]);

      await waitFor(() => {
        expect(screen.getByText('test.js')).toBeInTheDocument();
      });

      const uploadButton = screen.getByText('Upload and Analyze');
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('Analysis Results')).toBeInTheDocument();
      });

      const initialCallCount = apiCallCount;

      // Switch to Dependencies tab
      const dependenciesTab = screen.getByText('Dependencies');
      await user.click(dependenciesTab);

      await waitFor(() => {
        expect(screen.getByTestId('dependency-graph-svg')).toBeInTheDocument();
      });

      // Switch to Metrics tab
      const metricsTab = screen.getByText('Metrics');
      await user.click(metricsTab);

      await waitFor(() => {
        expect(screen.getByTestId('complexity-chart')).toBeInTheDocument();
      });

      // Switch back to Dependencies - should not make new API call
      await user.click(dependenciesTab);

      await waitFor(() => {
        expect(screen.getByTestId('dependency-graph-svg')).toBeInTheDocument();
      });

      // Switch back to Metrics - should not make new API call
      await user.click(metricsTab);

      await waitFor(() => {
        expect(screen.getByTestId('complexity-chart')).toBeInTheDocument();
      });

      // API should not be called again for cached data
      // Allow for initial calls but no additional caching calls
      expect(apiCallCount).toBeLessThanOrEqual(initialCallCount + 2); // +2 for dependencies and metrics
    });

    it('should handle tab switching during loading', async () => {
      let resolveAnalysis: (value: any) => void;
      let resolveDependencies: (value: any) => void;

      // Create promises that we can control
      const analysisPromise = new Promise(resolve => {
        resolveAnalysis = resolve;
      });
      const dependenciesPromise = new Promise(resolve => {
        resolveDependencies = resolve;
      });

      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/analysis/')) {
          return analysisPromise.then(() => ({
            ok: true,
            json: async () => mockAnalysisData
          }));
        }
        if (url.includes('/dependencies')) {
          return dependenciesPromise.then(() => ({
            ok: true,
            json: async () => mockDependenciesData
          }));
        }
      });

      render(<Home />);

      // Complete upload flow
      const testFile = testUtils.createMockFile('test.js', 'console.log("test");', 'text/javascript');
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, [testFile]);

      await waitFor(() => {
        expect(screen.getByText('test.js')).toBeInTheDocument();
      });

      const uploadButton = screen.getByText('Upload and Analyze');
      await user.click(uploadButton);

      // Resolve analysis first
      resolveAnalysis!(true);

      await waitFor(() => {
        expect(screen.getByText('Analysis Results')).toBeInTheDocument();
      });

      // Switch to Dependencies while it's still loading
      const dependenciesTab = screen.getByText('Dependencies');
      await user.click(dependenciesTab);

      // Should show loading state
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Now resolve dependencies
      resolveDependencies!(true);

      // Should eventually show dependency graph
      await waitFor(() => {
        expect(screen.getByTestId('dependency-graph-svg')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling in Tabs', () => {
    it('should handle individual tab errors without affecting other tabs', async () => {
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/analysis/')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockAnalysisData
          });
        }
        if (url.includes('/dependencies')) {
          return Promise.reject(new Error('Dependencies service down'));
        }
        if (url.includes('/metrics')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockMetricsData
          });
        }
      });

      render(<Home />);

      // Complete analysis
      const testFile = testUtils.createMockFile('test.js', 'console.log("test");', 'text/javascript');
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, [testFile]);

      await waitFor(() => {
        expect(screen.getByText('test.js')).toBeInTheDocument();
      });

      const uploadButton = screen.getByText('Upload and Analyze');
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('Analysis Results')).toBeInTheDocument();
      });

      // Overview should work
      expect(screen.getByText('src/components/Header.tsx')).toBeInTheDocument();

      // Dependencies should show error
      const dependenciesTab = screen.getByText('Dependencies');
      await user.click(dependenciesTab);

      await waitFor(() => {
        expect(screen.getByText(/error.*dependencies/i)).toBeInTheDocument();
      });

      // Metrics should still work
      const metricsTab = screen.getByText('Metrics');
      await user.click(metricsTab);

      await waitFor(() => {
        expect(screen.getByTestId('complexity-chart')).toBeInTheDocument();
      });

      // Can still go back to Overview
      const overviewTab = screen.getByText('Overview');
      await user.click(overviewTab);

      await waitFor(() => {
        expect(screen.getByText('src/components/Header.tsx')).toBeInTheDocument();
      });
    });
  });
});