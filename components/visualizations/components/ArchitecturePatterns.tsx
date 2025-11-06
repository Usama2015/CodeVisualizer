'use client';

import React, { useMemo, useState } from 'react';
import { AnalysisResult, ArchitecturePattern } from '@/shared/types/analysis';
import { useVisualization } from '../core/VisualizationProvider';
import {
  Layers,
  Grid3x3,
  GitBranch,
  Package,
  Cpu,
  Database,
  Cloud,
  Shield,
  Zap,
  Box
} from 'lucide-react';

interface ArchitecturePatternsProps {
  data: AnalysisResult;
  className?: string;
}

const patternIcons: Record<string, React.ReactNode> = {
  'MVC': <Grid3x3 className="w-6 h-6" />,
  'MVVM': <Layers className="w-6 h-6" />,
  'MVP': <Package className="w-6 h-6" />,
  'Component': <Box className="w-6 h-6" />,
  'Layered': <Layers className="w-6 h-6" />,
  'Microservices': <Cloud className="w-6 h-6" />,
  'Monolith': <Database className="w-6 h-6" />,
  'Observer': <Zap className="w-6 h-6" />,
  'Strategy': <GitBranch className="w-6 h-6" />,
  'Factory': <Cpu className="w-6 h-6" />,
  'Singleton': <Shield className="w-6 h-6" />
};

const patternColors: Record<string, string> = {
  'MVC': 'bg-blue-500',
  'MVVM': 'bg-purple-500',
  'MVP': 'bg-green-500',
  'Component': 'bg-indigo-500',
  'Layered': 'bg-yellow-500',
  'Microservices': 'bg-pink-500',
  'Monolith': 'bg-gray-500',
  'Observer': 'bg-red-500',
  'Strategy': 'bg-teal-500',
  'Factory': 'bg-orange-500',
  'Singleton': 'bg-cyan-500'
};

export default function ArchitecturePatterns({ data, className }: ArchitecturePatternsProps) {
  const { state } = useVisualization();
  const [selectedPattern, setSelectedPattern] = useState<ArchitecturePattern | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'diagram'>('grid');

  const patterns = data.analysis.architecturePatterns || [];

  const sortedPatterns = useMemo(() => {
    return [...patterns].sort((a, b) => b.confidence - a.confidence);
  }, [patterns]);

  const componentsByPattern = useMemo(() => {
    const map = new Map<string, Set<string>>();
    
    patterns.forEach(pattern => {
      if (!map.has(pattern.type)) {
        map.set(pattern.type, new Set());
      }
      pattern.components?.forEach(component => {
        map.get(pattern.type)?.add(component.role);
      });
    });

    return map;
  }, [patterns]);

  const filesByPattern = useMemo(() => {
    const map = new Map<string, Set<string>>();
    
    patterns.forEach(pattern => {
      if (!map.has(pattern.type)) {
        map.set(pattern.type, new Set());
      }
      pattern.evidence?.forEach(evidence => {
        evidence.files?.forEach(file => {
          map.get(pattern.type)?.add(file);
        });
      });
    });

    return map;
  }, [patterns]);

  const renderPatternCard = (pattern: ArchitecturePattern) => {
    const icon = patternIcons[pattern.type] || <Box className="w-6 h-6" />;
    const colorClass = patternColors[pattern.type] || 'bg-gray-500';
    const files = filesByPattern.get(pattern.type);
    const components = componentsByPattern.get(pattern.type);

    return (
      <div
        key={pattern.type}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
        onClick={() => setSelectedPattern(pattern)}
      >
        <div className={`${colorClass} text-white p-4 rounded-t-lg`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon}
              <h3 className="text-lg font-semibold">{pattern.type}</h3>
            </div>
            <div className="text-sm bg-white bg-opacity-20 px-3 py-1 rounded-full">
              {(pattern.confidence * 100).toFixed(0)}%
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {pattern.description}
          </p>

          <div className="space-y-3">
            {/* Components */}
            {components && components.size > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Components</h4>
                <div className="flex flex-wrap gap-1">
                  {Array.from(components).slice(0, 5).map(comp => (
                    <span
                      key={comp}
                      className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded"
                    >
                      {comp}
                    </span>
                  ))}
                  {components.size > 5 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">+{components.size - 5} more</span>
                  )}
                </div>
              </div>
            )}

            {/* Files */}
            {files && files.size > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Files ({files.size})
                </h4>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {Array.from(files).slice(0, 3).map(file => (
                    <div key={file} className="truncate">
                      {file.split('/').pop()}
                    </div>
                  ))}
                  {files.size > 3 && (
                    <div className="text-gray-500 dark:text-gray-400">+{files.size - 3} more files</div>
                  )}
                </div>
              </div>
            )}

            {/* Evidence */}
            <div>
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Evidence</h4>
              <div className="space-y-1">
                {pattern.evidence?.slice(0, 2).map((evidence, idx) => (
                  <div key={idx} className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-medium">{evidence.type.replace(/_/g, ' ')}</span>:
                    <span className="ml-1">{evidence.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDiagramView = () => {
    // Create a simplified architecture diagram
    const layers = new Map<string, ArchitecturePattern[]>();
    
    // Categorize patterns into layers
    patterns.forEach(pattern => {
      let layer = 'Application';
      if (['MVC', 'MVVM', 'MVP', 'Component'].includes(pattern.type)) {
        layer = 'Presentation';
      } else if (['Layered', 'Microservices', 'Monolith'].includes(pattern.type)) {
        layer = 'Architecture';
      } else if (['Observer', 'Strategy', 'Factory', 'Singleton'].includes(pattern.type)) {
        layer = 'Patterns';
      }
      
      if (!layers.has(layer)) {
        layers.set(layer, []);
      }
      layers.get(layer)?.push(pattern);
    });

    return (
      <div className="p-6">
        <div className="space-y-6">
          {Array.from(layers.entries()).map(([layerName, layerPatterns]) => (
            <div key={layerName} className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{layerName} Layer</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {layerPatterns.map(pattern => {
                  const icon = patternIcons[pattern.type] || <Box className="w-5 h-5" />;
                  const colorClass = patternColors[pattern.type] || 'bg-gray-500';
                  
                  return (
                    <div
                      key={pattern.type}
                      className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedPattern(pattern)}
                    >
                      <div className={`${colorClass} text-white p-3 rounded-lg mb-2`}>
                        {icon}
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {pattern.type}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {(pattern.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Pattern Relationships */}
        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Pattern Relationships</h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            {patterns.slice(0, 5).map((pattern, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="font-medium">{pattern.type}</span>
                <span className="text-gray-400">→</span>
                <span>{pattern.components?.[0]?.role || 'Components'}</span>
                <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                  {pattern.evidence?.length || 0} evidence points
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`w-full h-full overflow-auto bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Architecture Patterns</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Detected {patterns.length} architectural patterns in your codebase
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Grid View
            </button>
            <button
              onClick={() => setViewMode('diagram')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                viewMode === 'diagram'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Diagram View
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {patterns.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <Layers className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-lg">No architecture patterns detected</p>
            <p className="text-sm mt-2">Upload more files to detect patterns</p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedPatterns.map(renderPatternCard)}
          </div>
        </div>
      ) : (
        renderDiagramView()
      )}

      {/* Detail Modal */}
      {selectedPattern && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedPattern(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`${patternColors[selectedPattern.type] || 'bg-gray-500'} text-white p-6 rounded-t-lg`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {patternIcons[selectedPattern.type] || <Box className="w-8 h-8" />}
                  <div>
                    <h2 className="text-2xl font-bold">{selectedPattern.type} Pattern</h2>
                    <p className="text-sm opacity-90">Confidence: {(selectedPattern.confidence * 100).toFixed(0)}%</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPattern(null)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Description</h3>
                <p className="text-gray-600 dark:text-gray-400">{selectedPattern.description}</p>
              </div>

              {selectedPattern.components && selectedPattern.components.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Components</h3>
                  <div className="space-y-3">
                    {selectedPattern.components.map((component, idx) => (
                      <div key={idx} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{component.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Role: {component.role}</p>
                        {component.responsibilities && component.responsibilities.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Responsibilities:</p>
                            <ul className="list-disc list-inside text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {component.responsibilities.map((resp, ridx) => (
                                <li key={ridx}>{resp}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {component.files && component.files.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Files:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {component.files.slice(0, 5).map((file, fidx) => (
                                <span key={fidx} className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                                  {file.split('/').pop()}
                                </span>
                              ))}
                              {component.files.length > 5 && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">+{component.files.length - 5} more</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedPattern.evidence && selectedPattern.evidence.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Evidence</h3>
                  <div className="space-y-2">
                    {selectedPattern.evidence.map((evidence, idx) => (
                      <div key={idx} className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {evidence.type.replace(/_/g, ' ').charAt(0).toUpperCase() + evidence.type.replace(/_/g, ' ').slice(1)}
                          </span>
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                            {(evidence.confidence * 100).toFixed(0)}% confidence
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{evidence.description}</p>
                        {evidence.files && evidence.files.length > 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Files: {evidence.files.length}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}