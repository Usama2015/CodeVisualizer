'use client';

import { useEffect, useState } from 'react';
import { API_ENDPOINTS } from '@/lib/config';
import {
  DependencyGraph,
  CallHierarchy,
  ComplexityHeatmap,
  type DependencyAnalysisData as DependencyGraphData,
  type CallHierarchyData,
  type ComplexityHeatmapData as ComplexityData,
  type FileDependency,
  type FunctionCall
} from '@/components/visualizations';

interface WrapperProps {
  analysisId: string;
}

interface FileMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
}

interface AnalysisFile {
  path: string;
  language: string;
  imports?: string[];
  exports?: string[];
  functions?: string[];
  classes?: string[];
  metrics?: FileMetrics;
  complexity?: number;
}

interface AnalysisResult {
  analysis: {
    files: AnalysisFile[];
  };
}

export function DependencyGraphWrapper({ analysisId }: WrapperProps) {
  const [data, setData] = useState<DependencyGraphData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.getAnalysis(analysisId));
        const result: AnalysisResult = await response.json();

        // Transform analysis data to DependencyGraphData format
        const dependencies: FileDependency[] = [];

        // Create dependencies from imports
        result.analysis.files.forEach((file: AnalysisFile) => {
          if (file.imports) {
            file.imports.forEach((imp: string) => {
              const targetFile = result.analysis.files.find((f: AnalysisFile) =>
                f.path.includes(imp) || f.path.endsWith(imp + '.ts') || f.path.endsWith(imp + '.tsx')
              );
              if (targetFile) {
                dependencies.push({
                  from: file.path,
                  to: targetFile.path,
                  type: 'import' as const
                });
              }
            });
          }
        });

        const graphData: DependencyGraphData = {
          files: result.analysis.files.map((file: AnalysisFile) => ({
            id: file.path,
            path: file.path,
            name: file.path.split('/').pop() || file.path,
            type: file.language,
            size: file.metrics?.linesOfCode || 100,
            complexity: file.complexity || file.metrics?.cyclomaticComplexity
          })),
          dependencies
        };

        setData(graphData);
      } catch (error) {
        console.error('Error fetching dependency data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [analysisId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading visualization...</span>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center p-8 text-gray-500">No data available for visualization.</div>;
  }

  return <DependencyGraph data={data} onNodeClick={(node) => console.log('Node clicked:', node)} />;
}

export function CallHierarchyWrapper({ analysisId }: WrapperProps) {
  const [data, setData] = useState<CallHierarchyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.getAnalysis(analysisId));
        const result: AnalysisResult = await response.json();

        // Transform analysis data to CallHierarchyData format
        const allFunctions: FunctionCall[] = [];

        result.analysis.files.forEach((file: AnalysisFile) => {
          if (file.functions && file.functions.length > 0) {
            file.functions.forEach((funcName: string, index: number) => {
              allFunctions.push({
                id: `${file.path}-${funcName}-${index}`,
                name: funcName,
                filePath: file.path,
                lineNumber: (index + 1) * 10, // Approximate line number
                complexity: file.complexity || file.metrics?.cyclomaticComplexity || 1,
                isAsync: funcName.includes('async'),
                calls: [] // Would need more analysis to determine actual calls
              });
            });
          }
        });

        const hierarchyData: CallHierarchyData = {
          functions: allFunctions
        };

        setData(hierarchyData);
      } catch (error) {
        console.error('Error fetching hierarchy data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [analysisId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading visualization...</span>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center p-8 text-gray-500">No data available for visualization.</div>;
  }

  return <CallHierarchy data={data} onNodeClick={(node) => console.log('Node clicked:', node)} />;
}

export function ComplexityHeatmapWrapper({ analysisId }: WrapperProps) {
  const [data, setData] = useState<ComplexityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.getAnalysis(analysisId));
        const result: AnalysisResult = await response.json();

        // Transform analysis data to ComplexityData format
        const files = result.analysis.files.map((file: AnalysisFile) => ({
          id: file.path,
          path: file.path,
          name: file.path.split('/').pop() || file.path,
          cyclomaticComplexity: file.complexity || file.metrics?.cyclomaticComplexity || 1,
          linesOfCode: file.metrics?.linesOfCode || 0,
          maintainabilityIndex: 100 - (file.complexity || file.metrics?.cyclomaticComplexity || 1) * 5, // Simple calculation
          technicalDebt: (file.complexity || file.metrics?.cyclomaticComplexity || 1) * 0.1, // Hours estimate
          category: file.language
        }));

        const complexities = files.map(f => f.cyclomaticComplexity);
        const maxComplexity = Math.max(...complexities, 1);
        const avgComplexity = complexities.reduce((a, b) => a + b, 0) / complexities.length || 1;

        const complexityData: ComplexityData = {
          files,
          maxComplexity,
          avgComplexity
        };

        setData(complexityData);
      } catch (error) {
        console.error('Error fetching complexity data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [analysisId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading visualization...</span>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center p-8 text-gray-500">No data available for visualization.</div>;
  }

  return <ComplexityHeatmap data={data} onFileClick={(file) => console.log('File clicked:', file)} />;
}