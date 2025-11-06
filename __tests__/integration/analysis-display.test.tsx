import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnalysisResults from '@/components/analysis/AnalysisResults';
import DependencyGraph from '@/components/analysis/DependencyGraph';
import CodeMetrics from '@/components/analysis/CodeMetrics';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Analysis Display Integration Tests', () => {
  // Tests for displaying analysis results from backend

  describe('Analysis Results Component', () => {
    it('should display parsed file information', async () => {
      const mockAnalysis = {
        id: 'test-123',
        analysis: {
          files: [{
            path: 'test.js',
            language: 'javascript',
            imports: ['react', 'lodash'],
            exports: ['MyComponent'],
            functions: ['doSomething', 'handleClick'],
            classes: ['UserModel'],
            complexity: 8,
            metrics: {
              linesOfCode: 150,
              cyclomaticComplexity: 8,
              maintainabilityIndex: 75
            }
          }]
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysis
      });

      render(<AnalysisResults analysisId="test-123" />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('test.js')).toBeInTheDocument();
      });

      // Verify displayed information
      expect(screen.getByText(/Lines of Code: 150/)).toBeInTheDocument();
      expect(screen.getByText(/Complexity: 8/)).toBeInTheDocument();
      expect(screen.getByText(/Imports: 2/)).toBeInTheDocument();
      expect(screen.getByText(/Functions: 2/)).toBeInTheDocument();
    });

    it('should handle multiple file analysis', async () => {
      const mockAnalysis = {
        analysis: {
          files: [
            { path: 'app.js', language: 'javascript', metrics: { linesOfCode: 100 } },
            { path: 'utils.js', language: 'javascript', metrics: { linesOfCode: 50 } },
            { path: 'index.js', language: 'javascript', metrics: { linesOfCode: 25 } }
          ]
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysis
      });

      render(<AnalysisResults analysisId="multi-123" />);

      await waitFor(() => {
        expect(screen.getByText('app.js')).toBeInTheDocument();
        expect(screen.getByText('utils.js')).toBeInTheDocument();
        expect(screen.getByText('index.js')).toBeInTheDocument();
      });

      // Should show total metrics
      expect(screen.getByText(/Total Lines: 175/)).toBeInTheDocument();
      expect(screen.getByText(/Files Analyzed: 3/)).toBeInTheDocument();
    });
  });

  describe('Dependency Graph Visualization', () => {
    it('should render dependency graph from analysis data', async () => {
      const mockDependencies = {
        nodes: [
          { id: 'app.js', group: 'main' },
          { id: 'utils.js', group: 'utility' },
          { id: 'api.js', group: 'service' }
        ],
        edges: [
          { source: 'app.js', target: 'utils.js', imports: ['formatDate'] },
          { source: 'app.js', target: 'api.js', imports: ['fetchData'] }
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDependencies
      });

      render(<DependencyGraph analysisId="graph-123" />);

      await waitFor(() => {
        // Check SVG is rendered
        const svg = screen.getByTestId('dependency-graph-svg');
        expect(svg).toBeInTheDocument();

        // Check nodes are rendered
        expect(screen.getByText('app.js')).toBeInTheDocument();
        expect(screen.getByText('utils.js')).toBeInTheDocument();
        expect(screen.getByText('api.js')).toBeInTheDocument();
      });
    });

    it('should highlight circular dependencies', async () => {
      const mockDependencies = {
        nodes: [
          { id: 'moduleA.js', group: 'main' },
          { id: 'moduleB.js', group: 'main' }
        ],
        edges: [
          { source: 'moduleA.js', target: 'moduleB.js', imports: ['funcB'] },
          { source: 'moduleB.js', target: 'moduleA.js', imports: ['funcA'] }
        ],
        cycles: [['moduleA.js', 'moduleB.js']]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDependencies
      });

      render(<DependencyGraph analysisId="circular-123" />);

      await waitFor(() => {
        // Check circular dependency warning
        expect(screen.getByText(/Circular dependency detected/)).toBeInTheDocument();
        expect(screen.getByTestId('circular-edge')).toHaveClass('circular-dependency');
      });
    });

    it('should allow interactive exploration of dependencies', async () => {
      const mockDependencies = {
        nodes: [
          { id: 'main.js', group: 'main', imports: 5, exports: 2 },
          { id: 'helper.js', group: 'utility', imports: 1, exports: 8 }
        ],
        edges: [
          { source: 'main.js', target: 'helper.js', imports: ['util1', 'util2'] }
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDependencies
      });

      render(<DependencyGraph analysisId="interactive-123" />);

      await waitFor(() => {
        const mainNode = screen.getByTestId('node-main.js');
        expect(mainNode).toBeInTheDocument();
      });

      // Click on node to show details
      const mainNode = screen.getByTestId('node-main.js');
      await userEvent.click(mainNode);

      // Should show node details
      expect(screen.getByText(/Imports: 5/)).toBeInTheDocument();
      expect(screen.getByText(/Exports: 2/)).toBeInTheDocument();
    });
  });

  describe('Code Metrics Dashboard', () => {
    it('should display complexity metrics as charts', async () => {
      const mockMetrics = {
        overall: {
          averageComplexity: 5.2,
          totalLines: 1250,
          fileCount: 15,
          duplicationPercentage: 12
        },
        files: [
          { name: 'complex.js', complexity: 15, lines: 300 },
          { name: 'simple.js', complexity: 2, lines: 50 }
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetrics
      });

      render(<CodeMetrics analysisId="metrics-123" />);

      await waitFor(() => {
        // Check metrics are displayed
        expect(screen.getByText(/Average Complexity: 5.2/)).toBeInTheDocument();
        expect(screen.getByText(/Total Lines: 1,250/)).toBeInTheDocument();
        expect(screen.getByText(/Files: 15/)).toBeInTheDocument();
        expect(screen.getByText(/Duplication: 12%/)).toBeInTheDocument();
      });

      // Check chart is rendered
      expect(screen.getByTestId('complexity-chart')).toBeInTheDocument();
    });

    it('should highlight files with high complexity', async () => {
      const mockMetrics = {
        files: [
          { name: 'very-complex.js', complexity: 25, lines: 500 },
          { name: 'normal.js', complexity: 5, lines: 100 }
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetrics
      });

      render(<CodeMetrics analysisId="highlight-123" />);

      await waitFor(() => {
        const complexFile = screen.getByText('very-complex.js');
        expect(complexFile.parentElement).toHaveClass('high-complexity');

        const normalFile = screen.getByText('normal.js');
        expect(normalFile.parentElement).not.toHaveClass('high-complexity');
      });
    });
  });

  describe('Real-time Analysis Updates', () => {
    it('should show progress during analysis', async () => {
      // Mock SSE or WebSocket for real-time updates
      const mockProgress = [
        { status: 'analyzing', progress: 25, current: 'Parsing AST...' },
        { status: 'analyzing', progress: 50, current: 'Building dependencies...' },
        { status: 'analyzing', progress: 75, current: 'Calculating metrics...' },
        { status: 'complete', progress: 100, current: 'Analysis complete!' }
      ];

      render(<AnalysisResults analysisId="progress-123" realtime={true} />);

      // Simulate progress updates
      for (const update of mockProgress) {
        await waitFor(() => {
          expect(screen.getByText(update.current)).toBeInTheDocument();
          expect(screen.getByRole('progressbar')).toHaveAttribute(
            'aria-valuenow',
            String(update.progress)
          );
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('should display error when analysis fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Analysis failed'));

      render(<AnalysisResults analysisId="error-123" />);

      await waitFor(() => {
        expect(screen.getByText(/Error: Analysis failed/)).toBeInTheDocument();
        expect(screen.getByText(/Try Again/)).toBeInTheDocument();
      });
    });

    it('should handle partial analysis results', async () => {
      const mockPartialAnalysis = {
        analysis: {
          files: [{
            path: 'partial.js',
            error: 'Failed to parse: Syntax error at line 10'
          }]
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPartialAnalysis
      });

      render(<AnalysisResults analysisId="partial-123" />);

      await waitFor(() => {
        expect(screen.getByText('partial.js')).toBeInTheDocument();
        expect(screen.getByText(/Failed to parse/)).toBeInTheDocument();
        expect(screen.getByText(/Syntax error at line 10/)).toBeInTheDocument();
      });
    });
  });
});