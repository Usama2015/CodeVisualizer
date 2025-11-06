'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { Button } from '@/components/ui/Button';
import { API_ENDPOINTS } from '@/lib/config';
import {
  DependencyGraphProps,
  DependencyGraphData,
  DependencyNode
} from './types';

interface D3Node extends DependencyNode {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

interface D3Edge {
  source: D3Node | string;
  target: D3Node | string;
  imports: string[];
}

export default function DependencyGraph({ analysisId }: DependencyGraphProps) {
  const [data, setData] = useState<DependencyGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<DependencyNode | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<D3Node, D3Edge> | null>(null);

  const fetchDependencies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(API_ENDPOINTS.getDependencies(analysisId));
      if (!response.ok) {
        throw new Error(`Failed to fetch dependencies: ${response.statusText}`);
      }

      const dependencyData = await response.json();
      setData(dependencyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dependencies');
    } finally {
      setLoading(false);
    }
  }, [analysisId]);

  useEffect(() => {
    fetchDependencies();
  }, [analysisId, fetchDependencies]);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 600;

    // Clear previous content
    svg.selectAll('*').remove();

    // Create container group for zoom/pan
    const container = svg
      .attr('width', width)
      .attr('height', height)
      .append('g');

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Prepare data
    const nodes: D3Node[] = data.nodes.map(d => ({ ...d }));
    const edges: D3Edge[] = data.edges.map(d => ({ ...d }));

    // Check for circular dependencies
    const isCircularEdge = (edge: { source: string | D3Node; target: string | D3Node }) => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      return data.cycles?.some(cycle =>
        cycle.includes(sourceId) && cycle.includes(targetId)
      );
    };

    // Create force simulation
    const simulation = d3.forceSimulation<D3Node>(nodes)
      .force('link', d3.forceLink<D3Node, D3Edge>(edges)
        .id(d => d.id)
        .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    simulationRef.current = simulation;

    // Create arrow markers for directed edges
    const defs = container.append('defs');

    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('xoverflow', 'visible')
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#666')
      .style('stroke', 'none');

    defs.append('marker')
      .attr('id', 'arrowhead-circular')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('xoverflow', 'visible')
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#ef4444')
      .style('stroke', 'none');

    // Create edges
    const link = container.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(edges)
      .enter()
      .append('line')
      .attr('stroke', d => isCircularEdge(d) ? '#ef4444' : '#666')
      .attr('stroke-width', 2)
      .attr('marker-end', d => isCircularEdge(d) ? 'url(#arrowhead-circular)' : 'url(#arrowhead)')
      .attr('class', d => isCircularEdge(d) ? 'circular-dependency' : '')
      .attr('data-testid', d => isCircularEdge(d) ? 'circular-edge' : null);

    // Create node groups
    const nodeGroup = container.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node-group')
      .attr('data-testid', d => `node-${d.id}`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        setSelectedNode(d);
      })
      .call(d3.drag<SVGGElement, D3Node>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Add circles to nodes
    nodeGroup.append('circle')
      .attr('r', 20)
      .attr('fill', d => {
        const colors: Record<string, string> = {
          main: '#3b82f6',
          utility: '#10b981',
          service: '#f59e0b',
          component: '#8b5cf6'
        };
        return colors[d.group] || '#6b7280';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add labels to nodes
    nodeGroup.append('text')
      .text(d => d.id.split('/').pop() || d.id)
      .attr('x', 0)
      .attr('y', 35)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#374151');

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as D3Node).x || 0)
        .attr('y1', d => (d.source as D3Node).y || 0)
        .attr('x2', d => (d.target as D3Node).x || 0)
        .attr('y2', d => (d.target as D3Node).y || 0);

      nodeGroup
        .attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [data]);

  const resetZoom = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().duration(750).call(
        d3.zoom<SVGSVGElement, unknown>().transform,
        d3.zoomIdentity
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading dependency graph...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 space-y-4">
        <div className="text-red-600 text-lg">Error: {error}</div>
        <Button onClick={fetchDependencies}>Try Again</Button>
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        No dependency data available.
      </div>
    );
  }

  const hasCircularDependencies = data.cycles && data.cycles.length > 0;

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Dependency Graph</h2>
        <div className="flex items-center space-x-4">
          <Button onClick={resetZoom} size="sm" variant="outline">
            Reset Zoom
          </Button>
          {hasCircularDependencies && (
            <div className="text-red-600 text-sm font-medium">
              Circular dependency detected
            </div>
          )}
        </div>
      </div>

      {/* Graph container */}
      <div className="relative border rounded-lg bg-white overflow-hidden">
        <svg
          ref={svgRef}
          data-testid="dependency-graph-svg"
          className="w-full"
          style={{ minHeight: '600px' }}
        />

        {/* Legend */}
        <div className="absolute top-4 right-4 bg-white bg-opacity-90 p-3 rounded-lg shadow-sm">
          <h4 className="text-sm font-medium mb-2">Legend</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
              <span>Main</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
              <span>Utility</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
              <span>Service</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
              <span>Component</span>
            </div>
          </div>
        </div>
      </div>

      {/* Node details panel */}
      {selectedNode && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-lg mb-2">{selectedNode.id}</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Group:</span>
              <span className="ml-2 font-medium capitalize">{selectedNode.group}</span>
            </div>
            {selectedNode.imports !== undefined && (
              <div>
                <span className="text-gray-600">Imports:</span>
                <span className="ml-2 font-medium">{selectedNode.imports}</span>
              </div>
            )}
            {selectedNode.exports !== undefined && (
              <div>
                <span className="text-gray-600">Exports:</span>
                <span className="ml-2 font-medium">{selectedNode.exports}</span>
              </div>
            )}
          </div>
          <Button
            onClick={() => setSelectedNode(null)}
            size="sm"
            variant="outline"
            className="mt-3"
          >
            Close
          </Button>
        </div>
      )}

      {/* Instructions */}
      <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
        <p><strong>Instructions:</strong> Click and drag nodes to rearrange them. Use mouse wheel to zoom. Click on nodes to view details.</p>
      </div>
    </div>
  );
}