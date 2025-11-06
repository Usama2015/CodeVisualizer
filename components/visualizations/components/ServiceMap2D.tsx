'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { AnalysisResult } from '@/shared/types/analysis';
import { useVisualization } from '../core/VisualizationProvider';

interface ServiceMap2DProps {
  data: AnalysisResult;
  className?: string;
}

interface ServiceBox {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  type: 'project' | 'module' | 'file' | 'class' | 'function';
  children?: ServiceBox[];
  codeSnippet?: string;
  path?: string;
}

interface Connection {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export default function ServiceMap2D({ data, className }: ServiceMap2DProps) {
  const { state, selectNode, deselectNode } = useVisualization();
  const [selectedBox, setSelectedBox] = useState<ServiceBox | null>(null);
  const [hoveredBox, setHoveredBox] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [viewMode, setViewMode] = useState<'architecture' | 'flow' | 'detailed'>('architecture');

  // Parse directory structure from file paths
  const parseDirectoryStructure = useCallback(() => {
    const structure: { [key: string]: any } = {};

    data.analysis.files.forEach(file => {
      // Use file.path if available, otherwise try to infer from file.name
      const filePath = file.path || file.name;
      const pathParts = filePath.split(/[/\\]/); // Handle both / and \ separators

      // If no directory structure, create artificial grouping based on file type or name pattern
      if (pathParts.length === 1) {
        // Try to detect project grouping from filename patterns
        const fileName = pathParts[0];
        let projectName = 'main';

        // Look for common project patterns in filenames
        if (fileName.includes('backend') || fileName.includes('server') || fileName.includes('api')) {
          projectName = 'backend';
        } else if (fileName.includes('frontend') || fileName.includes('client') || fileName.includes('ui')) {
          projectName = 'frontend';
        } else if (fileName.includes('mqtt') || fileName.includes('messaging') || fileName.includes('broker')) {
          projectName = 'mqtt-service';
        } else if (fileName.includes('auth') || fileName.includes('login')) {
          projectName = 'auth-service';
        }

        // Create artificial structure
        if (!structure[projectName]) {
          structure[projectName] = {
            _files: [],
            _path: projectName
          };
        }
        structure[projectName]._files.push(file);
        return;
      }

      // Build nested structure for files with paths
      let current = structure;
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (part && part !== '.') {
          if (!current[part]) {
            current[part] = {
              _files: [],
              _path: pathParts.slice(0, i + 1).join('/')
            };
          }
          current = current[part];
        }
      }

      // Add file to the deepest directory
      if (!current._files) {
        current._files = [];
      }
      current._files.push(file);
    });

    return structure;
  }, [data]);

  // Generate layout for boxes
  const { boxes, connections } = useMemo(() => {
    const structure = parseDirectoryStructure();
    const allBoxes: ServiceBox[] = [];
    const allConnections: Connection[] = [];

    // Layout parameters
    const boxWidth = 180;
    const boxHeight = 80;
    const padding = 30;
    const verticalSpacing = 120;

    // Colors for different types
    const colors = {
      project: '#2196F3', // Blue
      module: '#4CAF50',  // Green
      file: '#FF9800',    // Orange
      class: '#9C27B0',   // Purple
      function: '#F44336' // Red
    };

    let yOffset = 50;
    let currentRow = 0;

    // Process top-level directories (projects)
    Object.keys(structure).forEach((projectName, projectIndex) => {
      if (projectName === '_files' || projectName === '_path') return;

      const xOffset = 50 + (projectIndex * (boxWidth + padding * 2));

      // Create project box
      const projectBox: ServiceBox = {
        id: projectName,
        label: projectName,
        x: xOffset,
        y: yOffset,
        width: boxWidth,
        height: boxHeight,
        color: colors.project,
        type: 'project',
        path: projectName,
        children: []
      };
      allBoxes.push(projectBox);

      // Process modules within project
      const project = structure[projectName];
      let moduleYOffset = yOffset + verticalSpacing;

      Object.keys(project).forEach((moduleName, moduleIndex) => {
        if (moduleName === '_files' || moduleName === '_path') {
          // Handle files directly in project
          if (moduleName === '_files' && viewMode !== 'architecture') {
            project._files.forEach((file: any, fileIndex: number) => {
              const fileBox: ServiceBox = {
                id: `${projectName}/${file.name}`,
                label: file.name,
                x: xOffset + 20,
                y: moduleYOffset + (fileIndex * 40),
                width: boxWidth - 40,
                height: 30,
                color: colors.file,
                type: 'file',
                codeSnippet: file.functions?.[0]?.code || file.classes?.[0]?.code || 'No code available',
                path: file.path
              };
              allBoxes.push(fileBox);
              projectBox.children?.push(fileBox);

              // Add connection from project to file
              allConnections.push({
                id: `${projectName}-to-${file.name}`,
                source: projectName,
                target: fileBox.id
              });
            });
          }
          return;
        }

        const moduleXOffset = xOffset;
        const module = project[moduleName];

        // Create module box
        const moduleBox: ServiceBox = {
          id: `${projectName}/${moduleName}`,
          label: moduleName,
          x: moduleXOffset,
          y: moduleYOffset,
          width: boxWidth,
          height: boxHeight - 20,
          color: colors.module,
          type: 'module',
          path: `${projectName}/${moduleName}`,
          children: []
        };
        allBoxes.push(moduleBox);
        projectBox.children?.push(moduleBox);

        // Add connection from project to module
        allConnections.push({
          id: `${projectName}-to-${moduleName}`,
          source: projectName,
          target: moduleBox.id,
          label: 'contains'
        });

        // Process files in module (in detailed view)
        if (viewMode === 'detailed' && module._files) {
          module._files.forEach((file: any, fileIndex: number) => {
            const fileYOffset = moduleYOffset + boxHeight + 10 + (fileIndex * 35);

            const fileBox: ServiceBox = {
              id: `${projectName}/${moduleName}/${file.name}`,
              label: file.name,
              x: moduleXOffset + 10,
              y: fileYOffset,
              width: boxWidth - 20,
              height: 25,
              color: colors.file,
              type: 'file',
              codeSnippet: file.functions?.[0]?.code || file.classes?.[0]?.code || 'No code available',
              path: file.path
            };
            allBoxes.push(fileBox);
            moduleBox.children?.push(fileBox);

            // Add connection from module to file
            allConnections.push({
              id: `${moduleBox.id}-to-${file.name}`,
              source: moduleBox.id,
              target: fileBox.id
            });
          });
        }

        moduleYOffset += verticalSpacing;
      });
    });

    // Add dependency connections
    if (viewMode === 'flow' || viewMode === 'detailed') {
      data.dependencies.edges.forEach(edge => {
        const sourceFile = data.analysis.files.find(f => f.path === edge.source);
        const targetFile = data.analysis.files.find(f => f.path === edge.target);

        if (sourceFile && targetFile) {
          allConnections.push({
            id: `dep-${edge.source}-to-${edge.target}`,
            source: edge.source,
            target: edge.target,
            label: edge.imports?.[0] || 'imports'
          });
        }
      });
    }

    return { boxes: allBoxes, connections: allConnections };
  }, [data, viewMode, parseDirectoryStructure]);

  const handleBoxClick = (box: ServiceBox) => {
    setSelectedBox(box);
    setShowCode(true);
    if (box.id) {
      selectNode(box.id);
    }
  };

  return (
    <div className={`w-full h-full relative bg-white dark:bg-gray-900 ${className || ''}`}>
      {/* View Mode Selector */}
      <div className="absolute top-4 left-4 z-10 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg shadow-md">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('architecture')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              viewMode === 'architecture'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Service Map
          </button>
          <button
            onClick={() => setViewMode('flow')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              viewMode === 'flow'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Flows
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              viewMode === 'detailed'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Detailed
          </button>
        </div>
      </div>

      {/* Main SVG Canvas */}
      <svg className="w-full h-full">
        {/* Define arrow marker for connections */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#666"
            />
          </marker>
        </defs>

        {/* Draw connections */}
        {connections.map(conn => {
          const sourceBox = boxes.find(b => b.id === conn.source);
          const targetBox = boxes.find(b => b.id === conn.target);

          if (!sourceBox || !targetBox) return null;

          const x1 = sourceBox.x + sourceBox.width / 2;
          const y1 = sourceBox.y + sourceBox.height;
          const x2 = targetBox.x + targetBox.width / 2;
          const y2 = targetBox.y;

          // Create curved path
          const midY = (y1 + y2) / 2;
          const path = `M ${x1},${y1} Q ${x1},${midY} ${x2},${y2}`;

          return (
            <g key={conn.id}>
              <path
                d={path}
                fill="none"
                stroke="#666"
                strokeWidth="1"
                strokeDasharray={viewMode === 'flow' ? '5,5' : undefined}
                markerEnd="url(#arrowhead)"
                opacity={0.6}
              />
              {conn.label && (
                <text
                  x={(x1 + x2) / 2}
                  y={midY}
                  textAnchor="middle"
                  fill="#666"
                  fontSize="10"
                  className="bg-white dark:bg-gray-900"
                >
                  {conn.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Draw boxes */}
        {boxes.map(box => (
          <g
            key={box.id}
            onClick={() => handleBoxClick(box)}
            onMouseEnter={() => setHoveredBox(box.id)}
            onMouseLeave={() => setHoveredBox(null)}
            style={{ cursor: 'pointer' }}
          >
            <rect
              x={box.x}
              y={box.y}
              width={box.width}
              height={box.height}
              fill={box.color}
              stroke={selectedBox?.id === box.id ? '#1e40af' : '#e5e7eb'}
              strokeWidth={selectedBox?.id === box.id ? 3 : 1}
              rx="5"
              opacity={hoveredBox === box.id ? 1 : 0.85}
            />
            <text
              x={box.x + box.width / 2}
              y={box.y + box.height / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="14"
              fontWeight="bold"
            >
              {box.label.length > 20 ? box.label.substring(0, 20) + '...' : box.label}
            </text>
            <text
              x={box.x + box.width / 2}
              y={box.y + box.height / 2 + 15}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(255,255,255,0.8)"
              fontSize="10"
            >
              {box.type}
            </text>
          </g>
        ))}
      </svg>

      {/* Code Snippet Overlay (Yellow box like in PDF) */}
      {showCode && selectedBox && selectedBox.codeSnippet && (
        <div
          className="absolute bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4 shadow-lg"
          style={{
            left: selectedBox.x + selectedBox.width + 20,
            top: selectedBox.y,
            maxWidth: '400px',
            maxHeight: '300px',
            overflow: 'auto'
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold text-gray-800">Entry Point</h4>
            <button
              onClick={() => setShowCode(false)}
              className="text-gray-600 hover:text-gray-800"
            >
              ×
            </button>
          </div>
          <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
            {selectedBox.codeSnippet}
          </pre>
        </div>
      )}

      {/* Info Panel */}
      <div className="absolute bottom-4 right-4 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg shadow-md text-sm">
        <h4 className="font-semibold mb-2">Service Architecture</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Projects</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Modules</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span>Files</span>
          </div>
        </div>
      </div>
    </div>
  );
}