'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { VisualizationProvider, useVisualization } from './core/VisualizationProvider';
import DependencyGraph from './components/DependencyGraph';
import EnhancedDependencyGraph from './components/EnhancedDependencyGraph';
import DependencyGraph3D from './components/DependencyGraph3D';
import ServiceMap3D from './components/ServiceMap3D';
import ServiceMap2D from './components/ServiceMap2D';
import CodeMetricsDashboard from './components/CodeMetricsDashboard';
import FileTreeExplorer from './components/FileTreeExplorer';
import ArchitecturePatterns from './components/ArchitecturePatterns';
import VisualizationControls from './components/VisualizationControls';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorDisplay from '../ui/ErrorDisplay';

type ViewType = 'dependency' | 'enhanced' | 'dependency3d' | 'servicemap' | 'metrics' | 'tree' | 'architecture' | 'split';

const VisualizationContent: React.FC = () => {
  const { state } = useVisualization();
  const [activeView, setActiveView] = useState<ViewType>('enhanced');
  const [splitView, setSplitView] = useState<[ViewType, ViewType]>(['enhanced', 'metrics']);

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="large" message="Loading analysis data..." />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex items-center justify-center h-full">
        <ErrorDisplay message={state.error} />
      </div>
    );
  }

  if (!state.data) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-medium mb-2">No Analysis Data</h3>
          <p>Upload your codebase to see visualizations</p>
        </div>
      </div>
    );
  }

  const renderVisualization = (type: ViewType, className?: string) => {
    switch (type) {
      case 'dependency':
        return <DependencyGraph data={state.data} className={className} />;
      case 'enhanced':
        return <EnhancedDependencyGraph data={state.data} className={className} />;
      case 'dependency3d':
        return <DependencyGraph3D data={state.data} className={className} />;
      case 'servicemap':
        return <ServiceMap2D data={state.data} className={className} />;
      case 'metrics':
        return <CodeMetricsDashboard data={state.data} className={className} />;
      case 'tree':
        return <FileTreeExplorer data={state.data} className={className} />;
      case 'architecture':
        return <ArchitecturePatterns data={state.data} className={className} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Controls Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveView('dependency')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeView === 'dependency'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Basic Graph
            </button>
            <button
              onClick={() => setActiveView('enhanced')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeView === 'enhanced'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Enhanced Layouts
            </button>
            <button
              onClick={() => setActiveView('dependency3d')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeView === 'dependency3d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              3D Graph
            </button>
            <button
              onClick={() => setActiveView('servicemap')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeView === 'servicemap'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Service Map
            </button>
            <button
              onClick={() => setActiveView('metrics')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeView === 'metrics'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Metrics
            </button>
            <button
              onClick={() => setActiveView('tree')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeView === 'tree'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              File Tree
            </button>
            <button
              onClick={() => setActiveView('architecture')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeView === 'architecture'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Architecture
            </button>
            <button
              onClick={() => setActiveView('split')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeView === 'split'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Split View
            </button>
          </div>
          <VisualizationControls />
        </div>
      </div>

      {/* Visualization Area */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'split' ? (
          <div className="h-full flex">
            <div className="w-1/2 h-full border-r border-gray-200 dark:border-gray-700">
              {renderVisualization(splitView[0], 'h-full')}
            </div>
            <div className="w-1/2 h-full">
              {renderVisualization(splitView[1], 'h-full')}
            </div>
          </div>
        ) : (
          renderVisualization(activeView, 'h-full')
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex space-x-4">
            <span>Files: {state.data.analysis.files.length}</span>
            <span>Dependencies: {state.data.dependencies.edges.length}</span>
            <span>Selected: {state.selectedNodes.length}</span>
          </div>
          <div className="flex space-x-4">
            <span>Layout: {state.layout}</span>
            <span>Zoom: {Math.round(state.zoom * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface VisualizationDashboardProps {
  analysisId?: string;
}

export default function VisualizationDashboard({ analysisId: propAnalysisId }: VisualizationDashboardProps = {}) {
  const searchParams = useSearchParams();
  const analysisId = propAnalysisId || searchParams.get('analysisId');

  if (!analysisId) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            No Analysis Selected
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Upload your codebase first to see visualizations
          </p>
        </div>
      </div>
    );
  }

  return (
    <VisualizationProvider analysisId={analysisId}>
      <VisualizationContent />
    </VisualizationProvider>
  );
}