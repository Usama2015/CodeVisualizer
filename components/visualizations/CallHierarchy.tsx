'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Tree from 'react-d3-tree';

// Define types for call hierarchy data
export interface FunctionCall {
  id: string;
  name: string;
  filePath: string;
  lineNumber: number;
  complexity?: number;
  parameters?: string[];
  returnType?: string;
  isAsync?: boolean;
  calls: FunctionCall[];
}

export interface CallHierarchyData {
  functions: FunctionCall[];
}

interface CallHierarchyProps {
  data: CallHierarchyData | null;
  isLoading?: boolean;
  error?: string | null;
  onNodeClick?: (node: FunctionCall) => void;
  onNodeHover?: (node: FunctionCall | null) => void;
}

// Convert our data to react-d3-tree format
interface TreeNode {
  name: string;
  attributes?: Record<string, string | number | boolean>;
  children?: TreeNode[];
  __rd3t?: {
    id: string;
    depth: number;
    collapsed?: boolean;
  };
}

export default function CallHierarchy({
  data,
  isLoading = false,
  error = null,
  onNodeClick,
  onNodeHover
}: CallHierarchyProps) {
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<FunctionCall | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Convert function calls to tree structure
  const treeData = useMemo(() => {
    if (!data || data.functions.length === 0) return [];

    const convertToTreeNode = (func: FunctionCall): TreeNode => ({
      name: func.name,
      attributes: {
        id: func.id,
        filePath: func.filePath,
        lineNumber: func.lineNumber,
        complexity: func.complexity ?? 0,
        parameters: func.parameters?.join(', ') || '',
        returnType: func.returnType || 'void',
        isAsync: func.isAsync || false,
        callCount: func.calls.length
      },
      children: func.calls.length > 0 ? func.calls.map(convertToTreeNode) : undefined
    });

    return data.functions.map(convertToTreeNode);
  }, [data]);

  // Custom node shape
  const renderCustomNode = useCallback(({ nodeDatum, toggleNode }: { nodeDatum: TreeNode & { __rd3t?: { collapsed?: boolean } }, toggleNode: () => void }) => {
    const { attributes } = nodeDatum;
    const isSelected = selectedNode === attributes?.id;
    const complexity = typeof attributes?.complexity === 'number' ? attributes.complexity : 0;

    // Determine node color based on complexity
    const getComplexityColor = (complexity: number) => {
      if (complexity <= 5) return '#10b981'; // green
      if (complexity <= 10) return '#f59e0b'; // yellow
      if (complexity <= 15) return '#f97316'; // orange
      return '#ef4444'; // red
    };

    const nodeColor = getComplexityColor(complexity);
    const hasChildren = nodeDatum.children && nodeDatum.children.length > 0;

    return (
      <g>
        {/* Node circle */}
        <circle
          r={hasChildren ? 15 : 10}
          fill={isSelected ? '#3b82f6' : nodeColor}
          stroke="#ffffff"
          strokeWidth={2}
          style={{ cursor: 'pointer' }}
          onClick={() => {
            if (hasChildren) {
              toggleNode();
            }
            setSelectedNode(typeof attributes?.id === 'string' ? attributes.id : null);
            if (attributes && onNodeClick) {
              onNodeClick({
                id: String(attributes.id),
                name: nodeDatum.name,
                filePath: String(attributes.filePath),
                lineNumber: Number(attributes.lineNumber),
                complexity: Number(attributes.complexity),
                parameters: String(attributes.parameters)?.split(', ').filter(Boolean),
                returnType: String(attributes.returnType),
                isAsync: Boolean(attributes.isAsync),
                calls: []
              });
            }
          }}
          onMouseEnter={() => {
            if (attributes) {
              const nodeData: FunctionCall = {
                id: String(attributes.id),
                name: nodeDatum.name,
                filePath: String(attributes.filePath),
                lineNumber: Number(attributes.lineNumber),
                complexity: Number(attributes.complexity),
                parameters: String(attributes.parameters)?.split(', ').filter(Boolean),
                returnType: String(attributes.returnType),
                isAsync: Boolean(attributes.isAsync),
                calls: []
              };
              setHoveredNode(nodeData);
              onNodeHover?.(nodeData);
            }
          }}
          onMouseLeave={() => {
            setHoveredNode(null);
            onNodeHover?.(null);
          }}
        />

        {/* Expand/collapse indicator */}
        {hasChildren && (
          <text
            x={0}
            y={5}
            textAnchor="middle"
            fill="white"
            fontSize="10"
            fontWeight="bold"
            style={{ cursor: 'pointer', pointerEvents: 'none' }}
          >
            {nodeDatum.__rd3t?.collapsed ? '+' : '-'}
          </text>
        )}

        {/* Async indicator */}
        {attributes?.isAsync && (
          <text
            x={20}
            y={-10}
            textAnchor="start"
            fill="#8b5cf6"
            fontSize="8"
            fontWeight="bold"
          >
            async
          </text>
        )}

        {/* Function name */}
        <text
          x={hasChildren ? 25 : 20}
          y={5}
          textAnchor="start"
          fill="#374151"
          fontSize="12"
          fontWeight="medium"
        >
          {nodeDatum.name}
        </text>

        {/* File path and line number */}
        <text
          x={hasChildren ? 25 : 20}
          y={18}
          textAnchor="start"
          fill="#6b7280"
          fontSize="10"
        >
          {attributes?.filePath ? `${String(attributes.filePath).split('/').pop()}:${attributes.lineNumber}` : ''}
        </text>

        {/* Complexity indicator */}
        {attributes?.complexity && (
          <text
            x={hasChildren ? 25 : 20}
            y={31}
            textAnchor="start"
            fill={getComplexityColor(Number(attributes.complexity))}
            fontSize="9"
            fontWeight="bold"
          >
            C: {attributes.complexity}
          </text>
        )}
      </g>
    );
  }, [selectedNode, onNodeClick, onNodeHover]);

  // Handle container resize
  const handleResize = useCallback(() => {
    const container = document.getElementById('call-hierarchy-container');
    if (container) {
      const { width, height } = container.getBoundingClientRect();
      setTranslate({ x: width / 2, y: height / 2 });
    }
  }, []);

  // Initialize translate on mount
  React.useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  if (isLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading call hierarchy...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-red-50 rounded-lg">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">⚠️</div>
          <p className="text-red-600 font-medium">Error loading call hierarchy</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.functions.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-gray-400 text-xl mb-2">🌳</div>
          <p className="text-gray-600">No call hierarchy data available</p>
          <p className="text-gray-500 text-sm mt-1">Upload and analyze a codebase to see function call relationships</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-96 bg-white rounded-lg shadow-sm border relative">
      <div id="call-hierarchy-container" className="h-full">
        <Tree
          data={treeData}
          translate={translate}
          nodeSize={{ x: 200, y: 100 }}
          separation={{ siblings: 1, nonSiblings: 2 }}
          renderCustomNodeElement={renderCustomNode}
          orientation="horizontal"
          pathFunc="step"
          zoom={0.8}
          enableLegacyTransitions
          collapsible
          initialDepth={2}
        />
      </div>

      {/* Tooltip for hovered node */}
      {hoveredNode && (
        <div className="absolute top-4 left-4 bg-gray-900 text-white p-3 rounded-lg shadow-lg max-w-sm z-10">
          <div className="text-sm font-medium mb-2">{hoveredNode.name}</div>
          <div className="text-xs space-y-1">
            <div><span className="text-gray-300">File:</span> {hoveredNode.filePath}</div>
            <div><span className="text-gray-300">Line:</span> {hoveredNode.lineNumber}</div>
            {hoveredNode.complexity && (
              <div><span className="text-gray-300">Complexity:</span> {hoveredNode.complexity}</div>
            )}
            {hoveredNode.parameters && hoveredNode.parameters.length > 0 && (
              <div><span className="text-gray-300">Parameters:</span> {hoveredNode.parameters.join(', ')}</div>
            )}
            {hoveredNode.returnType && (
              <div><span className="text-gray-300">Returns:</span> {hoveredNode.returnType}</div>
            )}
            {hoveredNode.isAsync && (
              <div className="text-purple-300 font-medium">Async Function</div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-md border text-xs">
        <h4 className="font-medium text-gray-900 mb-2">Complexity Levels</h4>
        <div className="space-y-1">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full mr-2 bg-green-500" />
            <span className="text-gray-700">Low (1-5)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full mr-2 bg-yellow-500" />
            <span className="text-gray-700">Medium (6-10)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full mr-2 bg-orange-500" />
            <span className="text-gray-700">High (11-15)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full mr-2 bg-red-500" />
            <span className="text-gray-700">Very High (16+)</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="text-purple-600 font-medium text-xs">async = Async Function</div>
          <div className="text-gray-600 text-xs mt-1">Click nodes to expand/collapse</div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-4 bg-white p-2 rounded-lg shadow-md border text-xs">
        <div className="text-gray-600">
          <div>• Click circles to expand/collapse</div>
          <div>• Hover for function details</div>
          <div>• Scroll to zoom</div>
        </div>
      </div>
    </div>
  );
}