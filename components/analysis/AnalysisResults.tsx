'use client';

import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { API_ENDPOINTS } from '@/lib/config';
import {
  AnalysisResultsProps,
  AnalysisResponse,
  FileAnalysis,
  ProgressUpdate
} from './types';

export default function AnalysisResults({ analysisId, realtime = false }: AnalysisResultsProps) {
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);

  const fetchAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching analysis for ID:', analysisId);
      const url = API_ENDPOINTS.getAnalysis(analysisId);
      console.log('Fetching from URL:', url);

      const response = await fetch(url);
      console.log('Analysis fetch response:', response.status, response.ok);

      if (!response.ok) {
        throw new Error(`Failed to fetch analysis: ${response.statusText}`);
      }

      const analysisData = await response.json();
      console.log('Analysis data received:', analysisData);
      console.log('Has analysis.analysis.files?', analysisData?.analysis?.analysis?.files);
      setData(analysisData);
    } catch (err) {
      console.error('Error fetching analysis:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [analysisId]);

  useEffect(() => {
    fetchAnalysis();

    // Simulate real-time updates for testing
    if (realtime) {
      const progressUpdates: ProgressUpdate[] = [
        { status: 'analyzing', progress: 25, current: 'Parsing AST...' },
        { status: 'analyzing', progress: 50, current: 'Building dependencies...' },
        { status: 'analyzing', progress: 75, current: 'Calculating metrics...' },
        { status: 'complete', progress: 100, current: 'Analysis complete!' }
      ];

      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex < progressUpdates.length) {
          setProgress(progressUpdates[currentIndex]);
          currentIndex++;
        } else {
          clearInterval(interval);
          fetchAnalysis();
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [analysisId, realtime, fetchAnalysis]);

  const getTotalLines = () => {
    if (!data?.analysis?.files) return 0;
    return data.analysis.files.reduce((total, file) => {
      return total + (file.metrics?.linesOfCode || 0);
    }, 0);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const renderFileCard = (file: FileAnalysis) => {
    const hasError = !!file.error;

    return (
      <div
        key={file.path}
        className={cn(
          "border rounded-lg p-4 space-y-3",
          hasError ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"
        )}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">{file.path}</h3>
          <span className="text-sm text-gray-500 capitalize">{file.language}</span>
        </div>

        {hasError ? (
          <div className="text-red-600 text-sm">
            <p className="font-medium">Failed to parse:</p>
            <p>{file.error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {file.metrics && (
              <>
                <div>
                  <span className="text-gray-600">Lines of Code: {file.metrics.linesOfCode}</span>
                </div>
                <div>
                  <span className="text-gray-600">Complexity: {file.complexity || file.metrics.cyclomaticComplexity}</span>
                </div>
              </>
            )}
            {file.imports && (
              <div>
                <span className="text-gray-600">Imports: {file.imports.length}</span>
              </div>
            )}
            {file.functions && (
              <div>
                <span className="text-gray-600">Functions: {file.functions.length}</span>
              </div>
            )}
          </div>
        )}

        {file.imports && file.imports.length > 0 && (
          <div className="text-sm">
            <span className="text-gray-600">Imports: </span>
            <span className="text-gray-800">{file.imports.join(', ')}</span>
          </div>
        )}

        {file.exports && file.exports.length > 0 && (
          <div className="text-sm">
            <span className="text-gray-600">Exports: </span>
            <span className="text-gray-800">{file.exports.join(', ')}</span>
          </div>
        )}

        {file.functions && file.functions.length > 0 && (
          <div className="text-sm">
            <span className="text-gray-600">Functions: </span>
            <span className="text-gray-800">{file.functions.join(', ')}</span>
          </div>
        )}

        {file.classes && file.classes.length > 0 && (
          <div className="text-sm">
            <span className="text-gray-600">Classes: </span>
            <span className="text-gray-800">{file.classes.join(', ')}</span>
          </div>
        )}
      </div>
    );
  };

  if (realtime && progress) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Analysis in Progress</h2>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          <div
            role="progressbar"
            aria-valuenow={progress.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="sr-only"
          >
            {progress.progress}% complete
          </div>
          <p className="text-gray-600">{progress.current}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading analysis...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 space-y-4">
        <div className="text-red-600 text-lg">Error: {error}</div>
        <Button onClick={fetchAnalysis}>Try Again</Button>
      </div>
    );
  }

  if (!data?.analysis?.files || data.analysis.files.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        No analysis data available.
      </div>
    );
  }

  const totalLines = getTotalLines();
  const fileCount = data.analysis.files.length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Analysis Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total Lines: {formatNumber(totalLines)}</span>
          </div>
          <div>
            <span className="text-gray-600">Files Analyzed: {fileCount}</span>
          </div>
        </div>
      </div>

      {/* File Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">File Details</h3>
        {data.analysis.files.map((file) => renderFileCard(file))}
      </div>
    </div>
  );
}