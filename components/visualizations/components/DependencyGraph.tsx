'use client';

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ConnectionMode,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { AnalysisResult } from '@/shared/types/analysis';
import { useVisualization } from '../core/VisualizationProvider';

interface DependencyGraphProps {
  data: AnalysisResult;
  className?: string;
}

function DependencyGraphContent({ data, className }: DependencyGraphProps) {
  const { state, selectNode, deselectNode, setHoveredNode, setZoom, setCenter } = useVisualization();
  const reactFlowInstance = useReactFlow();
  const [selectedNodeInfo, setSelectedNodeInfo] = useState<any>(null);

  const getNodeColor = (complexity: number) => {
    if (complexity > 20) return '#ef4444'; // red - high complexity
    if (complexity > 10) return '#f59e0b'; // amber - medium complexity
    if (complexity > 5) return '#3b82f6'; // blue - moderate complexity
    return '#10b981'; // green - low complexity
  };

  const getNodeSize = (importance: number) => {
    // Make nodes consistently sized and readable
    const baseSize = 100; // Increased base size
    const maxExtraSize = 50; // Limit the size variation
    return Math.min(baseSize + (importance * 20), baseSize + maxExtraSize);
  };

  const initialNodes = useMemo(() => {
    const layoutNodes = (nodes: typeof data.dependencies.nodes) => {
      // Increase spacing to prevent overlapping
      const nodeCount = Math.max(nodes.length, 1);
      const angleStep = (2 * Math.PI) / nodeCount;
      const baseRadius = Math.max(400, nodeCount * 30); // Dynamic radius based on node count
      const centerX = 800; // Move center to accommodate more nodes
      const centerY = 600;

      if (state.layout === 'circular') {
        // Enhanced cluster-based layout for maximum readability
        const clusters = new Map<string, typeof nodes>();

        // Group nodes by type/purpose for better organization
        nodes.forEach(node => {
          let clusterKey = 'other';

          // Smart clustering based on file analysis
          if (node.name.includes('app.') || node.name.includes('main.') || node.name.includes('index.')) {
            clusterKey = 'entry-points';
          } else if (node.name.includes('component') || node.name.includes('Component')) {
            clusterKey = 'components';
          } else if (node.name.includes('service') || node.name.includes('Service') || node.name.includes('api')) {
            clusterKey = 'services';
          } else if (node.name.includes('util') || node.name.includes('helper') || node.name.includes('lib')) {
            clusterKey = 'utilities';
          } else if (node.name.includes('type') || node.name.includes('interface') || node.name.includes('model')) {
            clusterKey = 'types';
          } else if (node.name.includes('config') || node.name.includes('env') || node.name.includes('.json')) {
            clusterKey = 'config';
          }

          if (!clusters.has(clusterKey)) {
            clusters.set(clusterKey, []);
          }
          clusters.get(clusterKey)!.push(node);
        });

        // Define cluster positions for clear separation
        const clusterPositions = {
          'entry-points': { x: 1200, y: 300, color: '#3B82F6' },   // Blue - Center top
          'services': { x: 600, y: 600, color: '#10B981' },        // Green - Left
          'components': { x: 1800, y: 600, color: '#8B5CF6' },     // Purple - Right
          'utilities': { x: 900, y: 900, color: '#F59E0B' },       // Orange - Bottom left
          'types': { x: 1500, y: 900, color: '#EC4899' },          // Pink - Bottom right
          'config': { x: 1200, y: 1200, color: '#6B7280' },        // Gray - Bottom center
          'other': { x: 300, y: 300, color: '#64748B' }            // Slate - Top left
        };

        const result: any[] = [];

        clusters.forEach((clusterNodes, clusterKey) => {
          const clusterPos = clusterPositions[clusterKey as keyof typeof clusterPositions] || clusterPositions.other;
          const nodeSpacing = 200; // Optimal spacing within clusters
          const nodesPerRow = Math.max(1, Math.ceil(Math.sqrt(clusterNodes.length)));

          clusterNodes.forEach((node, index) => {
            const col = index % nodesPerRow;
            const row = Math.floor(index / nodesPerRow);

            // Position nodes in a tight grid within each cluster
            const offsetX = (col - (nodesPerRow - 1) / 2) * nodeSpacing;
            const offsetY = (row - (Math.ceil(clusterNodes.length / nodesPerRow) - 1) / 2) * nodeSpacing * 0.8;

            result.push({
              id: node.id,
              position: {
                x: clusterPos.x + offsetX,
                y: clusterPos.y + offsetY
              },
              data: {
                label: node.name.length > 15 ? node.name.substring(0, 15) + '...' : node.name,
                fullName: node.name, // Keep full name for tooltips
                complexity: node.complexity,
                importance: node.importance,
                type: node.type,
                metadata: node.metadata
              },
              style: {
                background: getNodeColor(node.complexity),
                color: '#fff',
                border: state.selectedNodes.includes(node.id) ? '3px solid #1e40af' : '2px solid #e5e7eb',
                borderRadius: '8px',
                width: getNodeSize(node.importance),
                height: getNodeSize(node.importance),
                fontSize: '14px',
                fontWeight: 'bold',
                wordWrap: 'break-word',
                textAlign: 'center',
                cursor: 'pointer',
                opacity: 1, // Remove hover opacity changes to prevent flickering
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              },
              selected: state.selectedNodes.includes(node.id),
              draggable: true,
              selectable: true
            });
          });
        });
        return result;
      } else if (state.layout === 'hierarchical') {
        // Enhanced hierarchical layout based on node importance and connections
        const nodeConnections = new Map<string, {incoming: number, outgoing: number, importance: number}>();

        // Calculate connection counts for each node
        nodes.forEach(node => {
          const incoming = data.dependencies.edges.filter(e => e.target === node.id).length;
          const outgoing = data.dependencies.edges.filter(e => e.source === node.id).length;
          nodeConnections.set(node.id, {
            incoming,
            outgoing,
            importance: node.importance + (outgoing * 2) - (incoming * 0.5) // Weight outgoing connections more
          });
        });

        // Find root nodes (high outgoing, low incoming connections)
        const rootNodes = nodes
          .filter(node => {
            const conn = nodeConnections.get(node.id)!;
            return conn.outgoing >= 3 || (conn.outgoing > 0 && conn.incoming === 0);
          })
          .sort((a, b) => nodeConnections.get(b.id)!.importance - nodeConnections.get(a.id)!.importance);

        // If no clear root nodes, use nodes with highest importance
        if (rootNodes.length === 0) {
          rootNodes.push(...nodes
            .sort((a, b) => nodeConnections.get(b.id)!.importance - nodeConnections.get(a.id)!.importance)
            .slice(0, Math.max(1, Math.floor(nodes.length * 0.1)))
          );
        }

        const levels = new Map<string, number>();
        const visited = new Set<string>();
        const levelGroups = new Map<number, typeof nodes>();

        // Assign levels using breadth-first traversal for better distribution
        const assignLevelsFromRoots = () => {
          const queue: {nodeId: string, level: number}[] = [];

          // Start with root nodes at level 0
          rootNodes.forEach(node => {
            levels.set(node.id, 0);
            visited.add(node.id);
            queue.push({nodeId: node.id, level: 0});
            });

          while (queue.length > 0) {
            const {nodeId, level} = queue.shift()!;

            // Find all nodes this one depends on (targets)
            const dependencies = data.dependencies.edges
              .filter(e => e.source === nodeId)
              .map(e => e.target);

            dependencies.forEach(targetId => {
              if (!visited.has(targetId)) {
                const newLevel = level + 1;
                levels.set(targetId, newLevel);
                visited.add(targetId);
                queue.push({nodeId: targetId, level: newLevel});
              }
              });
          }

          // Handle any unvisited nodes (isolated or circular dependencies)
          nodes.forEach(node => {
            if (!visited.has(node.id)) {
              const conn = nodeConnections.get(node.id)!;
              const estimatedLevel = Math.max(1, Math.floor(conn.incoming / 2));
              levels.set(node.id, estimatedLevel);
            }
            });
        };

        assignLevelsFromRoots();

        // Group nodes by level
        nodes.forEach(node => {
          const level = levels.get(node.id) || 0;
          if (!levelGroups.has(level)) {
            levelGroups.set(level, []);
          }
          levelGroups.get(level)!.push(node);
        });

        // Sort nodes within each level by importance
        levelGroups.forEach(group => {
          group.sort((a, b) => nodeConnections.get(b.id)!.importance - nodeConnections.get(a.id)!.importance);
        });

        return nodes.map((node) => {
          const level = levels.get(node.id) || 0;
          const group = levelGroups.get(level) || [];
          const indexInLevel = group.findIndex(n => n.id === node.id);

          // Dynamic spacing based on group size
          const maxWidth = 2400;
          const nodeWidth = 150;
          const spacing = group.length > 1 ?
            Math.min(300, (maxWidth - nodeWidth) / (group.length - 1)) : 300;

          // Center the level horizontally
          const totalWidth = (group.length - 1) * spacing;
          const startX = (maxWidth - totalWidth) / 2;

          return {
            id: node.id,
            position: {
              x: startX + (indexInLevel * spacing),
              y: level * 300 + 100 // Reduced vertical spacing for better visibility
            },
            data: {
              label: node.name.length > 15 ? node.name.substring(0, 15) + '...' : node.name,
              fullName: node.name, // Keep full name for tooltips
              complexity: node.complexity,
              importance: node.importance,
              type: node.type,
              metadata: node.metadata
            },
            style: {
              background: getNodeColor(node.complexity),
              color: '#fff',
              border: state.selectedNodes.includes(node.id) ? '3px solid #1e40af' : '2px solid #e5e7eb',
              borderRadius: '8px',
              width: getNodeSize(node.importance),
              height: getNodeSize(node.importance),
              fontSize: '14px',
              fontWeight: 'bold',
              wordWrap: 'break-word',
              textAlign: 'center',
              cursor: 'pointer',
              opacity: 1, // Remove hover opacity changes to prevent flickering
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            },
            selected: state.selectedNodes.includes(node.id),
            draggable: true,
            selectable: true
          };
        });

      } else {
        // Enhanced force layout with hierarchical tendencies
        const nodeConnections = new Map<string, {incoming: number, outgoing: number}>();

        // Calculate connection counts
        nodes.forEach(node => {
          const incoming = data.dependencies.edges.filter(e => e.target === node.id).length;
          const outgoing = data.dependencies.edges.filter(e => e.source === node.id).length;
          nodeConnections.set(node.id, { incoming, outgoing });
        });

        // Sort nodes by hierarchy (more outgoing = higher level)
        const sortedNodes = [...nodes].sort((a, b) => {
          const aConn = nodeConnections.get(a.id)!;
          const bConn = nodeConnections.get(b.id)!;
          const aScore = aConn.outgoing * 2 - aConn.incoming * 0.5;
          const bScore = bConn.outgoing * 2 - bConn.incoming * 0.5;
          return bScore - aScore;
        });

        return sortedNodes.map((node, index) => {
          const conn = nodeConnections.get(node.id)!;

          // Calculate hierarchical layer based on connections
          const layer = Math.max(0, Math.min(4, Math.floor(conn.incoming / 2)));
          const nodesInLayer = sortedNodes.filter((n, i) => {
            const nConn = nodeConnections.get(n.id)!;
            const nLayer = Math.max(0, Math.min(4, Math.floor(nConn.incoming / 2)));
            return nLayer === layer;
            });

          const layerIndex = nodesInLayer.findIndex(n => n.id === node.id);
          const angleStep = (2 * Math.PI) / Math.max(nodesInLayer.length, 1);
          const angle = layerIndex * angleStep;

          // Vary radius based on layer and add some randomness for natural look
          const baseRadius = 400 + (layer * 300);
          const radius = baseRadius + (Math.random() - 0.5) * 100;
          const x = Math.cos(angle) * radius + 1200;
          const y = Math.sin(angle) * radius + 800;

          return {
            id: node.id,
            position: { x, y },
            data: {
              label: node.name,
              complexity: node.complexity,
              importance: node.importance,
              type: node.type,
              metadata: node.metadata
            },
            style: {
              background: getNodeColor(node.complexity),
              color: '#fff',
              border: state.selectedNodes.includes(node.id) ? '3px solid #1e40af' : '2px solid #e5e7eb',
              borderRadius: '8px',
              width: getNodeSize(node.importance),
              height: getNodeSize(node.importance),
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              opacity: 1, // Remove hover opacity changes to prevent flickering
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            },
            selected: state.selectedNodes.includes(node.id),
            draggable: true,
            selectable: true
          };
        });
      }
    };

    return layoutNodes(data.dependencies.nodes);
  }, [data.dependencies.nodes, data.dependencies.edges, state.layout, state.selectedNodes]);

  const initialEdges = useMemo(() => {
    return data.dependencies.edges.map((edge, index) => ({
      id: `edge-${index}`,
      source: edge.source,
      target: edge.target,
      animated: edge.type === 'dynamic_import',
      label: edge.imports.length > 3 ? `${edge.imports.length} imports` : edge.imports.join(', '),
      style: {
        stroke: edge.weight > 5 ? '#ef4444' : edge.weight > 2 ? '#f59e0b' : '#2563eb',
        strokeWidth: Math.max(2, Math.min(edge.weight * 1.5, 6)), // Bolder lines, minimum 2px
        opacity: 0.8, // Fixed opacity to prevent flickering
        strokeDasharray: edge.type === 'dynamic_import' ? '5,5' : undefined
      },
      labelStyle: {
        fontSize: '10px',
        fontWeight: 500,
        fill: state.theme === 'dark' ? '#e5e7eb' : '#374151'
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edge.weight > 5 ? '#ef4444' : edge.weight > 2 ? '#f59e0b' : '#6b7280'
      },
    }));
  }, [data.dependencies.edges, state.theme]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when layout or selection changes (preserve positions for dragging)
  useEffect(() => {
    setNodes((currentNodes) => {
      // Only update if the node count or layout actually changed
      if (currentNodes.length !== initialNodes.length ||
          currentNodes.some((node, i) => node.id !== initialNodes[i]?.id)) {
        return initialNodes;
      }
      // Preserve positions but update styling for selection state
      return currentNodes.map(currentNode => {
        const newNode = initialNodes.find(n => n.id === currentNode.id);
        return newNode ? {
          ...currentNode,
          style: newNode.style,
          data: newNode.data,
          selected: newNode.selected
        } : currentNode;
      });
    });
  }, [initialNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges]);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (event.shiftKey) {
      // Multi-select with shift
      if (state.selectedNodes.includes(node.id)) {
        deselectNode(node.id);
      } else {
        selectNode(node.id);
      }
    } else {
      // Single select
      selectNode(node.id);
    }

    // Set selected node info for display (moved data lookup inside handler)
    const nodeData = data.dependencies.nodes.find(n => n.id === node.id);
    if (nodeData) {
      const fileData = data.analysis.files.find(f => f.name === nodeData.name);
      setSelectedNodeInfo({
        ...nodeData,
        fileMetrics: fileData?.metrics,
        imports: fileData?.imports,
        exports: fileData?.exports,
        functions: fileData?.functions?.length || 0,
        classes: fileData?.classes?.length || 0
      });
    }
  }, [selectNode, deselectNode, state.selectedNodes]);

  const onNodeMouseEnter = useCallback((event: React.MouseEvent, node: Node) => {
    setHoveredNode(node.id);
  }, [setHoveredNode]);

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, [setHoveredNode]);

  const onMove = useCallback(() => {
    if (reactFlowInstance) {
      const { x, y, zoom } = reactFlowInstance.getViewport();
      // Debounce viewport updates to prevent excessive re-renders
      const timeoutId = setTimeout(() => {
        setZoom(zoom);
        setCenter({ x, y });
      }, 50); // 50ms debounce

      return () => clearTimeout(timeoutId);
    }
  }, [reactFlowInstance, setZoom, setCenter]);

  return (
    <div className={`relative w-full bg-gray-50 dark:bg-gray-900 ${className || 'h-[600px]'}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onMove={onMove}
        connectionMode={ConnectionMode.Loose}
        fitView={false}
        minZoom={0.1}
        maxZoom={4}
        defaultViewport={{ x: -200, y: -200, zoom: 0.5 }}
        zoomOnScroll={true}
        zoomOnPinch={true}
        panOnScroll={true}
        panOnDrag={true}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        <Background
          color={state.theme === 'dark' ? '#374151' : '#e5e7eb'}
          gap={16}
        />
        <Controls
          showInteractive={false}
          className="!bg-white dark:!bg-gray-800 !border-gray-200 dark:!border-gray-700 !shadow-lg"
        />
        <MiniMap
          nodeColor={(node) => node.style?.background as string || '#6b7280'}
          className="!bg-white dark:!bg-gray-800 !border-gray-200 dark:!border-gray-700 !shadow-lg"
          maskColor={state.theme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)'}
        />

        {/* Node Info Panel */}
        {selectedNodeInfo && (
          <Panel position="top-right" className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 m-2 max-w-sm">
            <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">{selectedNodeInfo.name}</h3>
            <div className="space-y-1 text-sm">
              <p className="text-gray-600 dark:text-gray-400">Type: {selectedNodeInfo.type}</p>
              <p className="text-gray-600 dark:text-gray-400">Complexity: {selectedNodeInfo.complexity}</p>
              <p className="text-gray-600 dark:text-gray-400">Functions: {selectedNodeInfo.functions}</p>
              <p className="text-gray-600 dark:text-gray-400">Classes: {selectedNodeInfo.classes}</p>
              {selectedNodeInfo.fileMetrics && (
                <>
                  <p className="text-gray-600 dark:text-gray-400">Lines: {selectedNodeInfo.fileMetrics.linesOfCode}</p>
                  <p className="text-gray-600 dark:text-gray-400">Maintainability: {selectedNodeInfo.fileMetrics.maintainabilityIndex.toFixed(1)}</p>
                </>
              )}
            </div>
          </Panel>
        )}

        {/* Legend */}
        <Panel position="bottom-left" className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 m-2">
          <h4 className="font-semibold text-sm mb-2 text-gray-900 dark:text-white">Complexity Legend</h4>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Low ({"<"}5)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Moderate (5-10)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-500"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Medium (10-20)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">High ({">"}20)</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default function DependencyGraph(props: DependencyGraphProps) {
  return (
    <ReactFlowProvider>
      <DependencyGraphContent {...props} />
    </ReactFlowProvider>
  );
}