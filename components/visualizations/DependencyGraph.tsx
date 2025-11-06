'use client';

import React, { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  NodeTypes,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Define types for our analysis data
export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  complexity?: number;
}

export interface FileDependency {
  from: string;
  to: string;
  type: 'import' | 'require' | 'include';
}

export interface DependencyAnalysisData {
  files: FileNode[];
  dependencies: FileDependency[];
}

interface DependencyGraphProps {
  data: DependencyAnalysisData | null;
  isLoading?: boolean;
  error?: string | null;
  onNodeClick?: (node: FileNode) => void;
}

// Custom node component
const FileNodeComponent = ({ data }: { data: FileNode & { onClick?: () => void } }) => {
  const getNodeColor = (fileType: string) => {
    const colors: Record<string, string> = {
      'typescript': '#3178c6',
      'javascript': '#f7df1e',
      'python': '#3776ab',
      'java': '#ed8b00',
      'css': '#1572b6',
      'html': '#e34f26',
      'json': '#000000',
      'markdown': '#083fa1',
      'default': '#64748b'
    };
    return colors[fileType.toLowerCase()] || colors.default;
  };

  const getSizeCategory = (size: number) => {
    if (size < 1000) return 'small';
    if (size < 10000) return 'medium';
    return 'large';
  };

  const backgroundColor = getNodeColor(data.type);
  const sizeCategory = getSizeCategory(data.size);
  const nodeSize = sizeCategory === 'small' ? 120 : sizeCategory === 'medium' ? 150 : 180;

  return (
    <div
      className="px-4 py-2 shadow-md rounded-md border-2 border-white bg-white min-w-[120px] max-w-[200px]"
      style={{
        borderColor: backgroundColor,
        minWidth: `${nodeSize}px`
      }}
    >
      <div className="flex items-center">
        <div
          className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
          style={{ backgroundColor }}
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate" title={data.name}>
            {data.name}
          </div>
          <div className="text-xs text-gray-500 truncate" title={data.path}>
            {data.path}
          </div>
          <div className="text-xs text-gray-400">
            {data.type} • {(data.size / 1024).toFixed(1)}KB
          </div>
          {data.complexity && (
            <div className="text-xs text-orange-600">
              Complexity: {data.complexity}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const nodeTypes: NodeTypes = {
  fileNode: FileNodeComponent,
};

export default function DependencyGraph({
  data,
  isLoading = false,
  error = null,
  onNodeClick
}: DependencyGraphProps) {
  const [, setSelectedNode] = useState<string | null>(null);

  // Convert analysis data to ReactFlow format
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };

    // Create nodes from files
    const nodes: Node[] = data.files.map((file, index) => {
      const x = (index % 5) * 250;
      const y = Math.floor(index / 5) * 150;

      return {
        id: file.id,
        type: 'fileNode',
        position: { x, y },
        data: {
          ...file,
          onClick: () => {
            setSelectedNode(file.id);
            onNodeClick?.(file);
          }
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });

    // Create edges from dependencies
    const edges: Edge[] = data.dependencies.map((dep, index) => ({
      id: `edge-${index}`,
      source: dep.from,
      target: dep.to,
      type: 'smoothstep',
      animated: true,
      style: {
        stroke: dep.type === 'import' ? '#10b981' :
                dep.type === 'require' ? '#3b82f6' : '#8b5cf6',
        strokeWidth: 2,
      },
      label: dep.type,
      labelStyle: {
        fontSize: 10,
        fontWeight: 'bold',
        fill: '#374151'
      },
    }));

    return { nodes, edges };
  }, [data, onNodeClick]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClickHandler = useCallback((event: React.MouseEvent, node: Node) => {
    node.data.onClick?.();
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dependency graph...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-red-50 rounded-lg">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">⚠️</div>
          <p className="text-red-600 font-medium">Error loading dependency graph</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.files.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-gray-400 text-xl mb-2">📊</div>
          <p className="text-gray-600">No dependency data available</p>
          <p className="text-gray-500 text-sm mt-1">Upload and analyze a codebase to see the dependency graph</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-96 bg-white rounded-lg shadow-sm border">
      <div className="h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClickHandler}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const colors: Record<string, string> = {
                'typescript': '#3178c6',
                'javascript': '#f7df1e',
                'python': '#3776ab',
                'java': '#ed8b00',
                'css': '#1572b6',
                'html': '#e34f26',
                'json': '#000000',
                'markdown': '#083fa1',
                'default': '#64748b'
              };
              return colors[node.data?.type?.toLowerCase()] || colors.default;
            }}
          />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-md border text-xs">
        <h4 className="font-medium text-gray-900 mb-2">File Types</h4>
        <div className="space-y-1">
          {['TypeScript', 'JavaScript', 'Python', 'Java', 'CSS', 'HTML'].map((type) => (
            <div key={type} className="flex items-center">
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{
                  backgroundColor: {
                    'TypeScript': '#3178c6',
                    'JavaScript': '#f7df1e',
                    'Python': '#3776ab',
                    'Java': '#ed8b00',
                    'CSS': '#1572b6',
                    'HTML': '#e34f26'
                  }[type] || '#64748b'
                }}
              />
              <span className="text-gray-700">{type}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-1">Dependencies</h4>
          <div className="space-y-1">
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-green-500 mr-2"></div>
              <span className="text-gray-700">Import</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-blue-500 mr-2"></div>
              <span className="text-gray-700">Require</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-purple-500 mr-2"></div>
              <span className="text-gray-700">Include</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}