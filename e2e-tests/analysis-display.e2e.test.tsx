import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '@/app/page';
import AnalysisResults from '@/components/analysis/AnalysisResults';
import DependencyGraph from '@/components/analysis/DependencyGraph';
import CodeMetrics from '@/components/analysis/CodeMetrics';
import { TEST_CONFIG, testUtils } from './setup.e2e';

/**
 * ANALYSIS COMPLETION AND DATA DISPLAY E2E TESTS
 *
 * These tests verify that analysis results are properly displayed
 * and that all components correctly fetch and render data from the backend.
 *
 * Tests cover:
 * 1. Analysis results fetching and display
 * 2. Component data loading states
 * 3. Error handling in components
 * 4. Data persistence across tab switches
 * 5. Real-time updates and progress tracking
 */

describe('Analysis Display E2E Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    global.fetch = vi.fn();
  });

  describe('Analysis Results Component', () => {
    it('should fetch and display analysis results correctly', async () => {
      const analysisId = 'test-analysis-123';
      const mockAnalysisData = {
        id: analysisId,
        analysis: {
          analysis: {
            files: [
              {
                path: 'components/UserCard.tsx',
                language: 'typescript',
                imports: ['react', '@/lib/utils'],
                exports: ['UserCard', 'UserCardProps'],
                functions: ['UserCard', 'formatUserName', 'handleClick'],
                classes: [],
                complexity: 8,
                metrics: {
                  linesOfCode: 156,
                  cyclomaticComplexity: 8,
                  maintainabilityIndex: 78,
                  cognitiveComplexity: 6
                }
              },
              {
                path: 'lib/utils.ts',
                language: 'typescript',
                imports: ['clsx', 'tailwind-merge'],
                exports: ['cn', 'formatDate', 'debounce'],
                functions: ['cn', 'formatDate', 'debounce'],
                classes: [],
                complexity: 4,
                metrics: {
                  linesOfCode: 89,
                  cyclomaticComplexity: 4,
                  maintainabilityIndex: 85,
                  cognitiveComplexity: 3
                }
              },
              {
                path: 'app/page.tsx',
                language: 'typescript',
                imports: ['react', '@/components/UserCard'],
                exports: ['default'],
                functions: ['HomePage'],
                classes: [],
                complexity: 3,
                metrics: {
                  linesOfCode: 67,
                  cyclomaticComplexity: 3,
                  maintainabilityIndex: 92,
                  cognitiveComplexity: 2
                }
              }
            ]
          }
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisData
      });

      render(<AnalysisResults analysisId={analysisId} />);

      // Should show loading state initially
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Wait for data to load and display
      await waitFor(() => {
        expect(screen.getByText('components/UserCard.tsx')).toBeInTheDocument();
        expect(screen.getByText('lib/utils.ts')).toBeInTheDocument();
        expect(screen.getByText('app/page.tsx')).toBeInTheDocument();
      }, { timeout: 10000 });

      // Verify file details are displayed
      expect(screen.getByText(/Lines of Code: 156/)).toBeInTheDocument();
      expect(screen.getByText(/Complexity: 8/)).toBeInTheDocument();
      expect(screen.getByText(/Functions: 3/)).toBeInTheDocument();

      // Verify summary statistics
      expect(screen.getByText(/Total Files: 3/)).toBeInTheDocument();
      expect(screen.getByText(/Total Lines: 312/)).toBeInTheDocument();

      // Verify API call was made correctly
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/analysis/${analysisId}`)
      );
    });

    it('should handle analysis data with errors gracefully', async () => {
      const analysisId = 'error-analysis-123';
      const mockAnalysisData = {
        id: analysisId,
        analysis: {
          analysis: {
            files: [
              {
                path: 'broken.js',
                language: 'javascript',
                error: 'SyntaxError: Unexpected token at line 15:7',
                imports: [],
                exports: [],
                functions: [],
                classes: [],
                complexity: 0,
                metrics: {
                  linesOfCode: 0,
                  cyclomaticComplexity: 0,
                  maintainabilityIndex: 0
                }
              },
              {
                path: 'valid.js',
                language: 'javascript',
                imports: ['lodash'],
                exports: ['helper'],
                functions: ['helper'],
                classes: [],
                complexity: 2,
                metrics: {
                  linesOfCode: 34,
                  cyclomaticComplexity: 2,
                  maintainabilityIndex: 88
                }
              }
            ]
          }
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisData
      });

      render(<AnalysisResults analysisId={analysisId} />);

      await waitFor(() => {
        expect(screen.getByText('broken.js')).toBeInTheDocument();
        expect(screen.getByText('valid.js')).toBeInTheDocument();
      });

      // Should show error for broken file
      expect(screen.getByText(/SyntaxError: Unexpected token/)).toBeInTheDocument();
      expect(screen.getByText(/line 15:7/)).toBeInTheDocument();

      // Should still show valid file data
      expect(screen.getByText(/Lines of Code: 34/)).toBeInTheDocument();

      // Error indicator should be visible
      expect(screen.getByText(/parsing error/i)).toBeInTheDocument();
    });

    it('should display detailed metrics for complex files', async () => {
      const analysisId = 'complex-analysis-123';
      const mockAnalysisData = {
        id: analysisId,
        analysis: {
          analysis: {
            files: [
              {
                path: 'complex/LargeComponent.tsx',
                language: 'typescript',
                imports: ['react', 'react-dom', '@/hooks/useData', '@/lib/api'],
                exports: ['LargeComponent', 'ComponentProps', 'useComponentState'],
                functions: [
                  'LargeComponent',
                  'useComponentState',
                  'handleSubmit',
                  'validateForm',
                  'processData',
                  'renderSection',
                  'formatOutput'
                ],
                classes: ['DataProcessor', 'ValidationEngine'],
                complexity: 24,
                metrics: {
                  linesOfCode: 487,
                  cyclomaticComplexity: 24,
                  maintainabilityIndex: 52,
                  cognitiveComplexity: 18,
                  duplicationRatio: 12.5
                }
              }
            ]
          }
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisData
      });

      render(<AnalysisResults analysisId={analysisId} />);

      await waitFor(() => {
        expect(screen.getByText('complex/LargeComponent.tsx')).toBeInTheDocument();
      });

      // Verify all metrics are displayed
      expect(screen.getByText(/Lines of Code: 487/)).toBeInTheDocument();
      expect(screen.getByText(/Complexity: 24/)).toBeInTheDocument();
      expect(screen.getByText(/Functions: 7/)).toBeInTheDocument();
      expect(screen.getByText(/Classes: 2/)).toBeInTheDocument();
      expect(screen.getByText(/Imports: 4/)).toBeInTheDocument();
      expect(screen.getByText(/Exports: 3/)).toBeInTheDocument();

      // Should highlight high complexity
      const complexityIndicator = screen.getByText(/complexity: 24/i).closest('div');
      expect(complexityIndicator).toHaveClass(/high-complexity|warning|danger/);

      // Should show maintainability warning
      expect(screen.getByText(/maintainability/i)).toBeInTheDocument();
      expect(screen.getByText(/52/)).toBeInTheDocument();
    });

    it('should handle loading states and retries', async () => {
      const analysisId = 'loading-test-123';

      // First call fails
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: analysisId,
            analysis: { analysis: { files: [] } }
          })
        });

      render(<AnalysisResults analysisId={analysisId} />);

      // Should show loading initially
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Should show error after first attempt
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });

      // Should show retry button
      const retryButton = screen.getByText(/try again|retry/i);
      expect(retryButton).toBeInTheDocument();

      // Click retry
      await user.click(retryButton);

      // Should show loading again
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Should eventually succeed
      await waitFor(() => {
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Dependency Graph Component', () => {
    it('should fetch and render dependency graph', async () => {
      const analysisId = 'deps-analysis-123';
      const mockDependencyData = {
        nodes: [
          {
            id: 'app/page.tsx',
            name: 'page.tsx',
            path: 'app/page.tsx',
            group: 'pages',
            imports: 2,
            exports: 1,
            complexity: 3
          },
          {
            id: 'components/UserCard.tsx',
            name: 'UserCard.tsx',
            path: 'components/UserCard.tsx',
            group: 'components',
            imports: 3,
            exports: 2,
            complexity: 8
          },
          {
            id: 'lib/utils.ts',
            name: 'utils.ts',
            path: 'lib/utils.ts',
            group: 'utilities',
            imports: 2,
            exports: 5,
            complexity: 4
          }
        ],
        edges: [
          {
            source: 'app/page.tsx',
            target: 'components/UserCard.tsx',
            imports: ['UserCard', 'UserCardProps']
          },
          {
            source: 'components/UserCard.tsx',
            target: 'lib/utils.ts',
            imports: ['cn', 'formatDate']
          }
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDependencyData
      });

      render(<DependencyGraph analysisId={analysisId} />);

      // Should show loading initially
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Wait for graph to render
      await waitFor(() => {
        expect(screen.getByTestId('dependency-graph-svg')).toBeInTheDocument();
      }, { timeout: 10000 });

      // Verify nodes are rendered
      expect(screen.getByText('page.tsx')).toBeInTheDocument();
      expect(screen.getByText('UserCard.tsx')).toBeInTheDocument();
      expect(screen.getByText('utils.ts')).toBeInTheDocument();

      // Verify API call
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/analysis/${analysisId}/dependencies`)
      );
    });

    it('should handle circular dependencies', async () => {
      const analysisId = 'circular-deps-123';
      const mockDependencyData = {
        nodes: [
          {
            id: 'moduleA.ts',
            name: 'moduleA.ts',
            group: 'modules'
          },
          {
            id: 'moduleB.ts',
            name: 'moduleB.ts',
            group: 'modules'
          }
        ],
        edges: [
          {
            source: 'moduleA.ts',
            target: 'moduleB.ts',
            imports: ['functionB']
          },
          {
            source: 'moduleB.ts',
            target: 'moduleA.ts',
            imports: ['functionA']
          }
        ],
        cycles: [
          ['moduleA.ts', 'moduleB.ts']
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDependencyData
      });

      render(<DependencyGraph analysisId={analysisId} />);

      await waitFor(() => {
        expect(screen.getByTestId('dependency-graph-svg')).toBeInTheDocument();
      });

      // Should show circular dependency warning
      expect(screen.getByText(/circular dependency detected/i)).toBeInTheDocument();

      // Should highlight circular edges
      const circularEdge = screen.getByTestId('circular-edge');
      expect(circularEdge).toHaveClass('circular-dependency');

      // Should show affected modules
      expect(screen.getByText('moduleA.ts')).toBeInTheDocument();
      expect(screen.getByText('moduleB.ts')).toBeInTheDocument();
    });

    it('should support interactive node exploration', async () => {
      const analysisId = 'interactive-deps-123';
      const mockDependencyData = {
        nodes: [
          {
            id: 'main.ts',
            name: 'main.ts',
            imports: 5,
            exports: 2,
            complexity: 12,
            group: 'main'
          }
        ],
        edges: []
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDependencyData
      });

      render(<DependencyGraph analysisId={analysisId} />);

      await waitFor(() => {
        const mainNode = screen.getByTestId('node-main.ts');
        expect(mainNode).toBeInTheDocument();
      });

      // Click on node to show details
      const mainNode = screen.getByTestId('node-main.ts');
      await user.click(mainNode);

      // Should show node details panel
      await waitFor(() => {
        expect(screen.getByText(/Imports: 5/)).toBeInTheDocument();
        expect(screen.getByText(/Exports: 2/)).toBeInTheDocument();
        expect(screen.getByText(/Complexity: 12/)).toBeInTheDocument();
      });
    });
  });

  describe('Code Metrics Component', () => {
    it('should fetch and display code metrics with charts', async () => {
      const analysisId = 'metrics-analysis-123';
      const mockMetricsData = {
        overall: {
          averageComplexity: 6.8,
          totalLines: 2847,
          fileCount: 23,
          duplicationPercentage: 8.5,
          maintainabilityIndex: 74.2,
          technicalDebt: 14.7
        },
        files: [
          {
            name: 'components/Dashboard.tsx',
            complexity: 18,
            lines: 432,
            maintainability: 58,
            duplication: 12.3
          },
          {
            name: 'lib/api.ts',
            complexity: 8,
            lines: 189,
            maintainability: 82,
            duplication: 3.2
          },
          {
            name: 'utils/helpers.ts',
            complexity: 4,
            lines: 97,
            maintainability: 91,
            duplication: 1.8
          }
        ],
        complexityDistribution: [
          { range: '1-5', count: 12 },
          { range: '6-10', count: 7 },
          { range: '11-15', count: 3 },
          { range: '16+', count: 1 }
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetricsData
      });

      render(<CodeMetrics analysisId={analysisId} />);

      // Should show loading initially
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Wait for metrics to load
      await waitFor(() => {
        expect(screen.getByText(/Average Complexity: 6.8/)).toBeInTheDocument();
        expect(screen.getByText(/Total Lines: 2,847/)).toBeInTheDocument();
        expect(screen.getByText(/Files: 23/)).toBeInTheDocument();
      }, { timeout: 10000 });

      // Verify chart is rendered
      expect(screen.getByTestId('complexity-chart')).toBeInTheDocument();

      // Verify high complexity files are highlighted
      const dashboardFile = screen.getByText('components/Dashboard.tsx');
      expect(dashboardFile.closest('div')).toHaveClass('high-complexity');

      // Verify low complexity files are not highlighted
      const helpersFile = screen.getByText('utils/helpers.ts');
      expect(helpersFile.closest('div')).not.toHaveClass('high-complexity');

      // Verify API call
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/analysis/${analysisId}/metrics`)
      );
    });

    it('should display maintainability warnings', async () => {
      const analysisId = 'maintainability-test-123';
      const mockMetricsData = {
        overall: {
          averageComplexity: 12.4,
          totalLines: 1250,
          fileCount: 8,
          maintainabilityIndex: 45.2 // Low maintainability
        },
        files: [
          {
            name: 'legacy/OldComponent.tsx',
            complexity: 28,
            lines: 654,
            maintainability: 32, // Very low
            duplication: 25.8
          },
          {
            name: 'utils/GoodUtils.ts',
            complexity: 3,
            lines: 87,
            maintainability: 95,
            duplication: 0
          }
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetricsData
      });

      render(<CodeMetrics analysisId={analysisId} />);

      await waitFor(() => {
        expect(screen.getByText(/Maintainability: 45.2/)).toBeInTheDocument();
      });

      // Should show maintainability warning
      expect(screen.getByText(/low maintainability/i)).toBeInTheDocument();

      // Should highlight problematic file
      const legacyFile = screen.getByText('legacy/OldComponent.tsx');
      expect(legacyFile.closest('div')).toHaveClass(/low-maintainability|warning|danger/);

      // Should show refactoring suggestions
      expect(screen.getByText(/consider refactoring/i)).toBeInTheDocument();
    });

    it('should handle empty or minimal metrics data', async () => {
      const analysisId = 'minimal-metrics-123';
      const mockMetricsData = {
        overall: {
          averageComplexity: 0,
          totalLines: 0,
          fileCount: 0
        },
        files: []
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetricsData
      });

      render(<CodeMetrics analysisId={analysisId} />);

      await waitFor(() => {
        expect(screen.getByText(/No metrics data available/i)).toBeInTheDocument();
      });

      // Should show empty state message
      expect(screen.getByText(/no files analyzed/i)).toBeInTheDocument();
    });
  });

  describe('Real-time Progress Updates', () => {
    it('should show progress during analysis', async () => {
      const analysisId = 'progress-test-123';

      // Mock progressive responses
      const progressStates = [
        { status: 'analyzing', progress: 25, current: 'Parsing files...' },
        { status: 'analyzing', progress: 50, current: 'Building dependency graph...' },
        { status: 'analyzing', progress: 75, current: 'Calculating metrics...' },
        { status: 'complete', progress: 100, current: 'Analysis complete!' }
      ];

      // Mock each progress update
      progressStates.forEach((state, index) => {
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: analysisId,
            status: state.status,
            progress: state.progress,
            message: state.current
          })
        });
      });

      render(<AnalysisResults analysisId={analysisId} realtime={true} />);

      // Should show initial progress
      await waitFor(() => {
        expect(screen.getByText('Parsing files...')).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });

      // Progress bar should reflect current progress
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '25');

      // Should update to next state
      await waitFor(() => {
        expect(screen.getByText('Building dependency graph...')).toBeInTheDocument();
      });

      // Should eventually complete
      await waitFor(() => {
        expect(screen.getByText('Analysis complete!')).toBeInTheDocument();
      }, { timeout: 15000 });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle component-level errors gracefully', async () => {
      const analysisId = 'error-recovery-123';

      // Mock different error scenarios for different components
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: analysisId, analysis: { analysis: { files: [] } } })
        })
        .mockRejectedValueOnce(new Error('Dependencies service unavailable'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ overall: {}, files: [] })
        });

      render(<Home />);

      // Simulate having completed an analysis
      const mockState = { analysisId };
      // In a real app, this would be set by the upload flow

      // Each component should handle its own errors
      render(<AnalysisResults analysisId={analysisId} />);
      render(<DependencyGraph analysisId={analysisId} />);
      render(<CodeMetrics analysisId={analysisId} />);

      // AnalysisResults should load successfully
      await waitFor(() => {
        expect(screen.queryByText(/analysis.*error/i)).not.toBeInTheDocument();
      });

      // DependencyGraph should show error state
      await waitFor(() => {
        expect(screen.getByText(/dependencies.*unavailable/i)).toBeInTheDocument();
      });

      // CodeMetrics should load successfully
      await waitFor(() => {
        expect(screen.queryByText(/metrics.*error/i)).not.toBeInTheDocument();
      });
    });
  });
});