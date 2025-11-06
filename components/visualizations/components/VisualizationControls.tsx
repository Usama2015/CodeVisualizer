'use client';

import React, { useState } from 'react';
import { useVisualization } from '../core/VisualizationProvider';
import {
  Settings,
  Download,
  Filter,
  Layout,
  Sun,
  Moon,
  RefreshCw,
  Maximize2,
  Minimize2,
  Grid,
  GitBranch,
  Circle,
  TreePine
} from 'lucide-react';

interface VisualizationControlsProps {
  className?: string;
}

export default function VisualizationControls({ className }: VisualizationControlsProps = {}) {
  const { state, setLayout, setTheme, setFilters, setZoom } = useVisualization();
  const [showFilters, setShowFilters] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleExport = (format: 'png' | 'svg' | 'json') => {
    // Export functionality would be implemented here
    console.log(`Exporting as ${format}`);
    setShowExport(false);
    
    // For JSON export
    if (format === 'json' && state.data) {
      const dataStr = JSON.stringify(state.data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `analysis-${new Date().toISOString()}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  };

  const handleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleZoom = (delta: number) => {
    const newZoom = Math.max(0.1, Math.min(4, state.zoom + delta));
    setZoom(newZoom);
  };

  const layoutIcons = {
    force: <GitBranch className="w-4 h-4" />,
    hierarchical: <Grid className="w-4 h-4" />,
    circular: <Circle className="w-4 h-4" />,
    tree: <TreePine className="w-4 h-4" />
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Layout Selector */}
      <div className="relative">
        <button
          className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title="Change Layout"
        >
          <Layout className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
        <div className="absolute top-full mt-2 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 min-w-[150px] hidden group-hover:block">
          {(['force', 'hierarchical', 'circular', 'tree'] as const).map(layout => (
            <button
              key={layout}
              onClick={() => setLayout(layout)}
              className={`w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                state.layout === layout ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
            >
              {layoutIcons[layout]}
              <span className="capitalize text-sm text-gray-700 dark:text-gray-300">{layout}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="relative">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title="Filters"
        >
          <Filter className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
        {showFilters && (
          <div className="absolute top-full mt-2 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 min-w-[300px] z-10">
            <h3 className="font-semibold text-sm mb-3 text-gray-900 dark:text-white">Filters</h3>
            
            {/* Complexity Filter */}
            <div className="mb-4">
              <label className="text-xs text-gray-600 dark:text-gray-400">Complexity Range</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={state.filters.minComplexity}
                  onChange={(e) => setFilters({ minComplexity: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 w-8">{state.filters.minComplexity}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={state.filters.maxComplexity}
                  onChange={(e) => setFilters({ maxComplexity: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 w-8">{state.filters.maxComplexity}</span>
              </div>
            </div>

            {/* File Type Filter */}
            <div className="mb-4">
              <label className="text-xs text-gray-600 dark:text-gray-400">File Types</label>
              <div className="mt-1 space-y-1">
                {['typescript', 'javascript', 'python', 'java'].map(type => (
                  <label key={type} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={state.filters.fileTypes.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters({ fileTypes: [...state.filters.fileTypes, type] });
                        } else {
                          setFilters({ fileTypes: state.filters.fileTypes.filter(t => t !== type) });
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Search */}
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">Search</label>
              <input
                type="text"
                value={state.filters.searchQuery}
                onChange={(e) => setFilters({ searchQuery: e.target.value })}
                placeholder="Search files..."
                className="w-full mt-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>

            <button
              onClick={() => setShowFilters(false)}
              className="mt-4 w-full px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
            >
              Apply Filters
            </button>
          </div>
        )}
      </div>

      {/* Theme Toggle */}
      <button
        onClick={() => setTheme(state.theme === 'light' ? 'dark' : 'light')}
        className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        title="Toggle Theme"
      >
        {state.theme === 'light' ? (
          <Moon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        ) : (
          <Sun className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        )}
      </button>

      {/* Zoom Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleZoom(-0.1)}
          className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title="Zoom Out"
        >
          <Minimize2 className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
        <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[40px] text-center">
          {Math.round(state.zoom * 100)}%
        </span>
        <button
          onClick={() => handleZoom(0.1)}
          className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title="Zoom In"
        >
          <Maximize2 className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      {/* Refresh */}
      <button
        onClick={() => window.location.reload()}
        className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        title="Refresh"
      >
        <RefreshCw className="w-4 h-4 text-gray-700 dark:text-gray-300" />
      </button>

      {/* Export */}
      <div className="relative">
        <button
          onClick={() => setShowExport(!showExport)}
          className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title="Export"
        >
          <Download className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
        {showExport && (
          <div className="absolute top-full mt-2 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 min-w-[120px] z-10">
            <button
              onClick={() => handleExport('png')}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm text-gray-700 dark:text-gray-300"
            >
              Export as PNG
            </button>
            <button
              onClick={() => handleExport('svg')}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm text-gray-700 dark:text-gray-300"
            >
              Export as SVG
            </button>
            <button
              onClick={() => handleExport('json')}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm text-gray-700 dark:text-gray-300"
            >
              Export as JSON
            </button>
          </div>
        )}
      </div>

      {/* Settings */}
      <button
        className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        title="Settings"
      >
        <Settings className="w-4 h-4 text-gray-700 dark:text-gray-300" />
      </button>
    </div>
  );
}