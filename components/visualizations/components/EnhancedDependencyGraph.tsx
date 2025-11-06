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
  Panel,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { AnalysisResult } from '@/shared/types/analysis';
import { useVisualization } from '../core/VisualizationProvider';

interface EnhancedDependencyGraphProps {
  data: AnalysisResult;
  className?: string;
}

// Enhanced layout algorithms
class LayoutEngine {
  private nodes: any[];
  private edges: any[];
  private clusters: Map<string, string[]> = new Map();

  constructor(nodes: any[], edges: any[]) {
    this.nodes = nodes;
    this.edges = edges;
    this.detectClusters();
  }

  // 1. LAYERED HIERARCHICAL LAYOUT
  layeredHierarchical(): any[] {
    const NODE_WIDTH = 180;
    const NODE_HEIGHT = 100;
    const LAYER_SPACING = 300;
    const NODE_SPACING = 200;

    // Build adjacency lists
    const inDegree = new Map<string, number>();
    const outEdges = new Map<string, string[]>();
    const inEdges = new Map<string, string[]>();

    this.nodes.forEach(node => {
      inDegree.set(node.id, 0);
      outEdges.set(node.id, []);
      inEdges.set(node.id, []);
    });

    this.edges.forEach(edge => {
      outEdges.get(edge.source)!.push(edge.target);
      inEdges.get(edge.target)!.push(edge.source);
      inDegree.set(edge.target, inDegree.get(edge.target)! + 1);
    });

    // Topological sort with Kahn's algorithm for layering
    const layers: string[][] = [];
    const queue: string[] = [];
    const nodeToLayer = new Map<string, number>();

    // Find nodes with no incoming edges (entry points)
    this.nodes.forEach(node => {
      if (inDegree.get(node.id) === 0) {
        queue.push(node.id);
        nodeToLayer.set(node.id, 0);
      }
    });

    // If no entry points, use nodes with highest importance
    if (queue.length === 0) {
      const sortedByImportance = [...this.nodes].sort((a, b) => b.importance - a.importance);
      const entryCount = Math.max(1, Math.floor(this.nodes.length * 0.1));
      for (let i = 0; i < entryCount && i < sortedByImportance.length; i++) {
        queue.push(sortedByImportance[i].id);
        nodeToLayer.set(sortedByImportance[i].id, 0);
      }
    }

    // Process layers
    while (queue.length > 0) {
      const currentLayer: string[] = [];
      const queueSize = queue.length;

      for (let i = 0; i < queueSize; i++) {
        const nodeId = queue.shift()!;
        currentLayer.push(nodeId);

        // Process children
        outEdges.get(nodeId)!.forEach(childId => {
          inDegree.set(childId, inDegree.get(childId)! - 1);
          if (inDegree.get(childId) === 0) {
            queue.push(childId);
            nodeToLayer.set(childId, layers.length + 1);
          }
        });
      }

      if (currentLayer.length > 0) {
        layers.push(currentLayer);
      }
    }

    // Handle remaining nodes (cycles)
    const processed = new Set(Array.from(nodeToLayer.keys()));
    this.nodes.forEach(node => {
      if (!processed.has(node.id)) {
        const lastLayer = layers.length;
        if (!layers[lastLayer]) layers[lastLayer] = [];
        layers[lastLayer].push(node.id);
        nodeToLayer.set(node.id, lastLayer);
      }
    });

    // Position nodes in layers
    return this.nodes.map(node => {
      const layer = nodeToLayer.get(node.id) || 0;
      const layerNodes = layers[layer] || [];
      const indexInLayer = layerNodes.indexOf(node.id);

      // Center alignment for each layer
      const layerWidth = Math.max(layerNodes.length * NODE_SPACING, 800);
      const startX = -layerWidth / 2;
      const nodeX = startX + (indexInLayer * NODE_SPACING) + (NODE_SPACING / 2);

      return {
        ...node,
        position: {
          x: nodeX,
          y: layer * LAYER_SPACING + 100
        }
      };
    });
  }

  // 2. CLUSTER-BASED LAYOUT
  clusterBased(): any[] {
    const CLUSTER_SPACING = 400;
    const NODE_SPACING = 150;
    const clusters = Array.from(this.clusters.entries());

    // Group unclustered nodes
    const clusteredNodes = new Set(clusters.flatMap(([_, nodes]) => nodes));
    const unclusteredNodes = this.nodes.filter(node => !clusteredNodes.has(node.id));
    if (unclusteredNodes.length > 0) {
      clusters.push(['unclustered', unclusteredNodes.map(n => n.id)]);
    }

    // Calculate cluster positions in a grid
    const clusterCols = Math.ceil(Math.sqrt(clusters.length));
    const clusterRows = Math.ceil(clusters.length / clusterCols);

    return this.nodes.map(node => {
      const clusterIndex = clusters.findIndex(([_, nodes]) => nodes.includes(node.id));
      const cluster = clusters[clusterIndex];

      if (!cluster) return node;

      const [clusterId, clusterNodes] = cluster;
      const clusterRow = Math.floor(clusterIndex / clusterCols);
      const clusterCol = clusterIndex % clusterCols;

      // Position within cluster (circular arrangement)
      const nodeIndex = clusterNodes.indexOf(node.id);
      const angle = (2 * Math.PI * nodeIndex) / clusterNodes.length;
      const radius = Math.max(100, clusterNodes.length * 20);

      const clusterCenterX = clusterCol * CLUSTER_SPACING;
      const clusterCenterY = clusterRow * CLUSTER_SPACING;

      return {
        ...node,
        position: {
          x: clusterCenterX + Math.cos(angle) * radius,
          y: clusterCenterY + Math.sin(angle) * radius
        }
      };
    });
  }

  // 3. RADIAL/CIRCULAR LAYOUT
  radialCircular(): any[] {
    // Find the most important node as center
    const centerNode = this.nodes.reduce((max, node) =>
      node.importance > max.importance ? node : max
    );

    // Calculate rings based on distance from center
    const rings = new Map<number, string[]>();
    const visited = new Set<string>();
    const queue: {nodeId: string, distance: number}[] = [{nodeId: centerNode.id, distance: 0}];

    while (queue.length > 0) {
      const {nodeId, distance} = queue.shift()!;

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      if (!rings.has(distance)) rings.set(distance, []);
      rings.get(distance)!.push(nodeId);

      // Add connected nodes to next ring
      this.edges
        .filter(edge => edge.source === nodeId || edge.target === nodeId)
        .forEach(edge => {
          const nextNodeId = edge.source === nodeId ? edge.target : edge.source;
          if (!visited.has(nextNodeId)) {
            queue.push({nodeId: nextNodeId, distance: distance + 1});
          }
        });
    }

    // Handle disconnected nodes
    this.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const maxRing = Math.max(...rings.keys()) + 1;
        if (!rings.has(maxRing)) rings.set(maxRing, []);
        rings.get(maxRing)!.push(node.id);
      }
    });

    // Position nodes in rings
    return this.nodes.map(node => {
      if (node.id === centerNode.id) {
        return {...node, position: {x: 0, y: 0}};
      }

      let ring = 0;
      for (const [ringIndex, ringNodes] of rings.entries()) {
        if (ringNodes.includes(node.id)) {
          ring = ringIndex;
          break;
        }
      }

      const ringNodes = rings.get(ring) || [];
      const nodeIndex = ringNodes.indexOf(node.id);
      const angle = (2 * Math.PI * nodeIndex) / ringNodes.length;
      const radius = ring * 200 + 150;

      return {
        ...node,
        position: {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius
        }
      };
    });
  }

  // 4. GRID-BASED LAYOUT
  gridBased(): any[] {
    const NODE_SPACING = 200;
    const GROUP_SPACING = 400;

    // Group nodes by file type/language
    const groups = new Map<string, any[]>();
    this.nodes.forEach(node => {
      const groupKey = node.metadata?.language || node.type || 'other';
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey)!.push(node);
    });

    // Sort groups by size (largest first)
    const sortedGroups = Array.from(groups.entries())
      .sort(([,a], [,b]) => b.length - a.length);

    // Calculate grid dimensions for each group
    const groupPositions = new Map<string, {x: number, y: number}>();
    let currentX = 0;
    let currentY = 0;
    let maxHeightInRow = 0;

    sortedGroups.forEach(([groupKey, groupNodes]) => {
      const cols = Math.ceil(Math.sqrt(groupNodes.length));
      const rows = Math.ceil(groupNodes.length / cols);
      const groupWidth = cols * NODE_SPACING;
      const groupHeight = rows * NODE_SPACING;

      // Check if we need to move to next row
      if (currentX + groupWidth > 1200) { // max row width
        currentX = 0;
        currentY += maxHeightInRow + GROUP_SPACING;
        maxHeightInRow = 0;
      }

      groupPositions.set(groupKey, {x: currentX, y: currentY});
      currentX += groupWidth + GROUP_SPACING;
      maxHeightInRow = Math.max(maxHeightInRow, groupHeight);
    });

    // Position nodes within their groups
    return this.nodes.map(node => {
      const groupKey = node.metadata?.language || node.type || 'other';
      const groupNodes = groups.get(groupKey) || [];
      const groupPos = groupPositions.get(groupKey) || {x: 0, y: 0};

      const nodeIndex = groupNodes.indexOf(node);
      const cols = Math.ceil(Math.sqrt(groupNodes.length));
      const row = Math.floor(nodeIndex / cols);
      const col = nodeIndex % cols;

      return {
        ...node,
        position: {
          x: groupPos.x + col * NODE_SPACING,
          y: groupPos.y + row * NODE_SPACING
        }
      };
    });
  }

  // 5. FORCE-DIRECTED WITH CONSTRAINTS
  forceDirectedConstrained(): any[] {
    // Initialize with some existing positioning strategy
    let positions = this.layeredHierarchical();

    // Apply force-directed adjustments with constraints
    const ITERATIONS = 50;
    const COOLING_FACTOR = 0.95;
    let temperature = 100;

    for (let iter = 0; iter < ITERATIONS; iter++) {
      const forces = new Map<string, {x: number, y: number}>();

      // Initialize forces
      positions.forEach(node => {
        forces.set(node.id, {x: 0, y: 0});
      });

      // Repulsive forces between all nodes
      positions.forEach(nodeA => {
        positions.forEach(nodeB => {
          if (nodeA.id === nodeB.id) return;

          const dx = nodeA.position.x - nodeB.position.x;
          const dy = nodeA.position.y - nodeB.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const repulsion = 10000 / (distance * distance);

          const force = forces.get(nodeA.id)!;
          force.x += (dx / distance) * repulsion;
          force.y += (dy / distance) * repulsion;
        });
      });

      // Attractive forces for connected nodes
      this.edges.forEach(edge => {
        const sourcePos = positions.find(n => n.id === edge.source)?.position;
        const targetPos = positions.find(n => n.id === edge.target)?.position;

        if (!sourcePos || !targetPos) return;

        const dx = targetPos.x - sourcePos.x;
        const dy = targetPos.y - sourcePos.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const attraction = distance * 0.01;

        const sourceForce = forces.get(edge.source)!;
        const targetForce = forces.get(edge.target)!;

        sourceForce.x += (dx / distance) * attraction;
        sourceForce.y += (dy / distance) * attraction;
        targetForce.x -= (dx / distance) * attraction;
        targetForce.y -= (dy / distance) * attraction;
      });

      // Apply forces with temperature cooling
      positions = positions.map(node => {
        const force = forces.get(node.id)!;
        const displacement = Math.sqrt(force.x * force.x + force.y * force.y) || 1;
        const maxDisplacement = Math.min(displacement, temperature);

        return {
          ...node,
          position: {
            x: node.position.x + (force.x / displacement) * maxDisplacement,
            y: node.position.y + (force.y / displacement) * maxDisplacement
          }
        };
      });

      temperature *= COOLING_FACTOR;
    }

    return positions;
  }

  private detectClusters(): void {
    // Detect clusters based on edge density and file types
    const visited = new Set<string>();
    let clusterId = 0;

    this.nodes.forEach(node => {
      if (visited.has(node.id)) return;

      const cluster = this.expandCluster(node.id, visited);
      if (cluster.length > 1) {
        this.clusters.set(`cluster-${clusterId++}`, cluster);
      }
    });
  }

  private expandCluster(startNodeId: string, visited: Set<string>): string[] {
    const cluster = [startNodeId];
    const queue = [startNodeId];
    visited.add(startNodeId);

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const connectedNodes = this.edges
        .filter(edge => edge.source === nodeId || edge.target === nodeId)
        .map(edge => edge.source === nodeId ? edge.target : edge.source)
        .filter(id => !visited.has(id));

      connectedNodes.forEach(connectedId => {
        const connectedNode = this.nodes.find(n => n.id === connectedId);
        const currentNode = this.nodes.find(n => n.id === nodeId);

        // Group nodes with similar characteristics
        if (connectedNode && currentNode &&
            (connectedNode.metadata?.language === currentNode.metadata?.language ||
             this.getConnectionStrength(nodeId, connectedId) > 2)) {
          visited.add(connectedId);
          cluster.push(connectedId);
          queue.push(connectedId);
        }
      });
    }

    return cluster;
  }

  private getConnectionStrength(nodeA: string, nodeB: string): number {
    return this.edges
      .filter(edge =>
        (edge.source === nodeA && edge.target === nodeB) ||
        (edge.source === nodeB && edge.target === nodeA)
      )
      .reduce((sum, edge) => sum + edge.weight, 0);
  }
}

function EnhancedDependencyGraphContent({ data, className }: EnhancedDependencyGraphProps) {
  const { state, selectNode, deselectNode, setHoveredNode, setZoom, setCenter } = useVisualization();
  const reactFlowInstance = useReactFlow();
  const [selectedNodeInfo, setSelectedNodeInfo] = useState<any>(null);
  const [layoutType, setLayoutType] = useState<'layered' | 'cluster' | 'radial' | 'grid' | 'force'>('layered');

  const getNodeColor = (complexity: number) => {
    if (complexity > 20) return '#ef4444'; // red - high complexity
    if (complexity > 10) return '#f59e0b'; // amber - medium complexity
    if (complexity > 5) return '#3b82f6'; // blue - moderate complexity
    return '#10b981'; // green - low complexity
  };

  const getNodeSize = (importance: number) => {
    const baseSize = 120;
    const maxExtraSize = 60;
    return Math.min(baseSize + (importance * 3), baseSize + maxExtraSize);
  };

  const initialNodes = useMemo(() => {
    const layoutEngine = new LayoutEngine(data.dependencies.nodes, data.dependencies.edges);

    let positions: any[] = [];
    switch (layoutType) {
      case 'layered':
        positions = layoutEngine.layeredHierarchical();
        break;
      case 'cluster':
        positions = layoutEngine.clusterBased();
        break;
      case 'radial':
        positions = layoutEngine.radialCircular();
        break;
      case 'grid':
        positions = layoutEngine.gridBased();
        break;
      case 'force':
        positions = layoutEngine.forceDirectedConstrained();
        break;
      default:
        positions = layoutEngine.layeredHierarchical();
    }

    return positions.map(node => ({
      id: node.id,
      position: node.position,
      data: {
        label: node.name.length > 12 ? node.name.substring(0, 12) + '...' : node.name,
        fullName: node.name,
        complexity: node.complexity,
        importance: node.importance,
        type: node.type,
        metadata: node.metadata
      },
      style: {
        background: getNodeColor(node.complexity),
        color: '#fff',
        border: state.selectedNodes.includes(node.id) ? '3px solid #1e40af' : '2px solid #e5e7eb',
        borderRadius: '12px',
        width: getNodeSize(node.importance),
        height: 80,
        fontSize: '12px',
        fontWeight: 'bold',
        textAlign: 'center',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      },
      type: 'default',
      selected: state.selectedNodes.includes(node.id),
      draggable: true,
      selectable: true,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }));
  }, [data.dependencies.nodes, data.dependencies.edges, layoutType, state.selectedNodes]);

  const initialEdges = useMemo(() => {
    return data.dependencies.edges.map((edge, index) => ({
      id: `edge-${index}`,
      source: edge.source,
      target: edge.target,
      animated: edge.type === 'dynamic_import',
      label: edge.imports.length > 3 ? `${edge.imports.length} imports` : '',
      style: {
        stroke: edge.weight > 5 ? '#ef4444' : edge.weight > 2 ? '#f59e0b' : '#6b7280',
        strokeWidth: Math.max(1, Math.min(edge.weight, 4)),
        opacity: 0.7,
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
      type: 'smoothstep',
    }));
  }, [data.dependencies.edges, state.theme]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
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
      if (state.selectedNodes.includes(node.id)) {
        deselectNode(node.id);
      } else {
        selectNode(node.id);
      }
    } else {
      selectNode(node.id);
    }

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
  }, [selectNode, deselectNode, state.selectedNodes, data]);

  const onNodeMouseEnter = useCallback((event: React.MouseEvent, node: Node) => {
    setHoveredNode(node.id);
  }, [setHoveredNode]);

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, [setHoveredNode]);

  const onMove = useCallback(() => {
    if (reactFlowInstance) {
      const { x, y, zoom } = reactFlowInstance.getViewport();
      setZoom(zoom);
      setCenter({ x, y });
    }
  }, [reactFlowInstance, setZoom, setCenter]);

  const handleLayoutChange = (newLayout: typeof layoutType) => {
    setLayoutType(newLayout);
  };

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
        fitView={true}
        minZoom={0.1}
        maxZoom={3}
        zoomOnScroll={true}
        zoomOnPinch={true}
        panOnScroll={true}
        panOnDrag={true}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        fitViewOptions={{
          padding: 50,
          minZoom: 0.1,
          maxZoom: 1
        }}
      >
        <Background
          color={state.theme === 'dark' ? '#374151' : '#e5e7eb'}
          gap={20}
          size={1}
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

        {/* Layout Controls */}
        <Panel position="top-left" className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 m-2">
          <h4 className="font-semibold text-sm mb-2 text-gray-900 dark:text-white">Layout Algorithm</h4>
          <div className="space-y-1">
            {[
              { key: 'layered', label: 'Layered Hierarchical' },
              { key: 'cluster', label: 'Cluster-based' },
              { key: 'radial', label: 'Radial/Circular' },
              { key: 'grid', label: 'Grid-based' },
              { key: 'force', label: 'Force-directed' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleLayoutChange(key as typeof layoutType)}
                className={`w-full text-left px-2 py-1 text-xs rounded transition-colors ${
                  layoutType === key
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Panel>

        {/* Node Info Panel */}
        {selectedNodeInfo && (
          <Panel position="top-right" className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 m-2 max-w-sm">
            <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">{selectedNodeInfo.name}</h3>
            <div className="space-y-1 text-sm">
              <p className="text-gray-600 dark:text-gray-400">Type: {selectedNodeInfo.type}</p>
              <p className="text-gray-600 dark:text-gray-400">Complexity: {selectedNodeInfo.complexity}</p>
              <p className="text-gray-600 dark:text-gray-400">Importance: {selectedNodeInfo.importance.toFixed(1)}</p>
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
              <span className="text-xs text-gray-600 dark:text-gray-400">Low (≤5)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Moderate (6-10)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-500"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Medium (11-20)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">High (&gt;20)</span>
            </div>
          </div>
        </Panel>

        {/* Statistics Panel */}
        <Panel position="bottom-right" className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 m-2">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <p>Layout: {layoutType}</p>
            <p>Nodes: {nodes.length}</p>
            <p>Edges: {edges.length}</p>
            <p>Selected: {state.selectedNodes.length}</p>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default function EnhancedDependencyGraph(props: EnhancedDependencyGraphProps) {
  return (
    <ReactFlowProvider>
      <EnhancedDependencyGraphContent {...props} />
    </ReactFlowProvider>
  );
}