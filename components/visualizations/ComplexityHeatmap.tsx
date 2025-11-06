'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';

// Define types for complexity data
export interface FileComplexity {
  id: string;
  name: string;
  path: string;
  cyclomaticComplexity: number;
  linesOfCode: number;
  maintainabilityIndex: number;
  technicalDebt: number;
  category: string;
}

export interface ComplexityHeatmapData {
  files: FileComplexity[];
  maxComplexity: number;
  avgComplexity: number;
}

interface ComplexityHeatmapProps {
  data: ComplexityHeatmapData | null;
  isLoading?: boolean;
  error?: string | null;
  onFileClick?: (file: FileComplexity) => void;
  width?: number;
  height?: number;
}

export default function ComplexityHeatmap({
  data,
  isLoading = false,
  error = null,
  onFileClick,
  width = 800,
  height = 400
}: ComplexityHeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width, height });

  // Responsive handling
  useEffect(() => {
    const handleResize = () => {
      const container = svgRef.current?.parentElement;
      if (container) {
        const containerWidth = container.getBoundingClientRect().width;
        setDimensions({
          width: Math.min(containerWidth - 40, width),
          height: height
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [width, height]);

  // Prepare grid data
  const gridData = useMemo(() => {
    if (!data || data.files.length === 0) return [];

    const files = data.files;
    const cols = Math.ceil(Math.sqrt(files.length * 1.5)); // Slightly wider than square
    const rows = Math.ceil(files.length / cols);

    return files.map((file, index) => ({
      ...file,
      row: Math.floor(index / cols),
      col: index % cols,
      x: (index % cols) * (dimensions.width / cols),
      y: Math.floor(index / cols) * (dimensions.height / rows),
      width: dimensions.width / cols,
      height: dimensions.height / rows
    }));
  }, [data, dimensions]);

  // Color scales
  const complexityColorScale = useMemo(() => {
    if (!data) return null;
    return d3.scaleSequential(d3.interpolateRdYlGn)
      .domain([data.maxComplexity, 1]); // Reverse so red is high complexity
  }, [data]);

  // Removed unused maintainabilityColorScale to fix warning

  // Draw heatmap
  useEffect(() => {
    if (!data || gridData.length === 0 || !complexityColorScale) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const tooltip = d3.select(tooltipRef.current);

    // Create cells
    const cells = svg.selectAll('.heatmap-cell')
      .data(gridData)
      .enter()
      .append('g')
      .attr('class', 'heatmap-cell')
      .style('cursor', 'pointer');

    // Add rectangles
    cells.append('rect')
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('width', d => d.width - 1)
      .attr('height', d => d.height - 1)
      .attr('fill', d => complexityColorScale(d.cyclomaticComplexity))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('opacity', 0.8)
      .on('mouseover', function(event, d) {
        d3.select(this)
          .style('opacity', 1)
          .attr('stroke-width', 2)
          .attr('stroke', '#333');

        // Show tooltip
        tooltip
          .style('display', 'block')
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
          .html(`
            <div class="font-medium text-gray-900">${d.name}</div>
            <div class="text-sm text-gray-600 mt-1">
              <div>Path: ${d.path}</div>
              <div>Complexity: ${d.cyclomaticComplexity}</div>
              <div>Lines of Code: ${d.linesOfCode}</div>
              <div>Maintainability: ${d.maintainabilityIndex.toFixed(1)}</div>
              <div>Technical Debt: ${d.technicalDebt.toFixed(1)}h</div>
              <div>Category: ${d.category}</div>
            </div>
          `);
      })
      .on('mousemove', function(event) {
        tooltip
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .style('opacity', 0.8)
          .attr('stroke-width', selectedFile === d.id ? 2 : 1)
          .attr('stroke', selectedFile === d.id ? '#333' : '#fff');

        tooltip.style('display', 'none');
      })
      .on('click', function(event, d) {
        setSelectedFile(d.id);
        onFileClick?.(d);

        // Update visual selection
        cells.selectAll('rect')
          .attr('stroke-width', 1)
          .attr('stroke', '#fff');

        d3.select(this)
          .attr('stroke-width', 3)
          .attr('stroke', '#333');
      });

    // Add file names (for larger cells)
    cells.append('text')
      .attr('x', d => d.x + d.width / 2)
      .attr('y', d => d.y + d.height / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .text(d => d.width > 60 ? d.name.split('/').pop() || d.name : '')
      .style('font-size', d => Math.min(10, d.width / 8) + 'px')
      .style('fill', d => d.cyclomaticComplexity > data.avgComplexity ? '#fff' : '#333')
      .style('pointer-events', 'none')
      .style('font-weight', 'bold');

    // Add complexity numbers (for larger cells)
    cells.append('text')
      .attr('x', d => d.x + d.width / 2)
      .attr('y', d => d.y + d.height / 2 + 15)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .text(d => d.width > 80 ? d.cyclomaticComplexity : '')
      .style('font-size', d => Math.min(12, d.width / 6) + 'px')
      .style('fill', d => d.cyclomaticComplexity > data.avgComplexity ? '#fff' : '#333')
      .style('pointer-events', 'none')
      .style('font-weight', 'bold');

  }, [data, gridData, complexityColorScale, selectedFile, onFileClick]);

  if (isLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading complexity heatmap...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-red-50 rounded-lg">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">⚠️</div>
          <p className="text-red-600 font-medium">Error loading complexity heatmap</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.files.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-gray-400 text-xl mb-2">🔥</div>
          <p className="text-gray-600">No complexity data available</p>
          <p className="text-gray-500 text-sm mt-1">Upload and analyze a codebase to see complexity metrics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border relative">
      {/* Header with stats */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Complexity Heatmap</h3>
          <div className="flex space-x-6 text-sm">
            <div className="text-center">
              <div className="text-gray-500">Files</div>
              <div className="font-medium text-gray-900">{data.files.length}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">Avg Complexity</div>
              <div className="font-medium text-gray-900">{data.avgComplexity.toFixed(1)}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">Max Complexity</div>
              <div className="font-medium text-gray-900">{data.maxComplexity}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="p-4">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="border border-gray-200 rounded"
        />
      </div>

      {/* Legend */}
      <div className="absolute top-16 right-4 bg-white p-3 rounded-lg shadow-md border text-xs">
        <h4 className="font-medium text-gray-900 mb-2">Complexity Scale</h4>
        <div className="space-y-1">
          <div className="flex items-center">
            <div className="w-4 h-3 mr-2" style={{ backgroundColor: '#d73027' }} />
            <span className="text-gray-700">Very High (&gt;15)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-3 mr-2" style={{ backgroundColor: '#fc8d59' }} />
            <span className="text-gray-700">High (11-15)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-3 mr-2" style={{ backgroundColor: '#fee08b' }} />
            <span className="text-gray-700">Medium (6-10)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-3 mr-2" style={{ backgroundColor: '#e6f598' }} />
            <span className="text-gray-700">Low (3-5)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-3 mr-2" style={{ backgroundColor: '#abd9e9' }} />
            <span className="text-gray-700">Very Low (1-2)</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600">
          Click cells for file details
        </div>
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none bg-gray-900 text-white p-3 rounded-lg shadow-lg max-w-sm z-10"
        style={{ display: 'none' }}
      />

      {/* File details panel */}
      {selectedFile && (
        <div className="absolute bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg border max-w-sm">
          {(() => {
            const file = data.files.find(f => f.id === selectedFile);
            if (!file) return null;

            const getComplexityLevel = (complexity: number) => {
              if (complexity <= 2) return { level: 'Very Low', color: 'text-green-600' };
              if (complexity <= 5) return { level: 'Low', color: 'text-green-500' };
              if (complexity <= 10) return { level: 'Medium', color: 'text-yellow-500' };
              if (complexity <= 15) return { level: 'High', color: 'text-orange-500' };
              return { level: 'Very High', color: 'text-red-600' };
            };

            const complexityInfo = getComplexityLevel(file.cyclomaticComplexity);

            return (
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900 text-sm">{file.name}</h4>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                <div className="text-xs space-y-1">
                  <div className="text-gray-600 truncate" title={file.path}>{file.path}</div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <span className="text-gray-500">Complexity:</span>
                      <div className={`font-medium ${complexityInfo.color}`}>
                        {file.cyclomaticComplexity} ({complexityInfo.level})
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Lines:</span>
                      <div className="font-medium text-gray-900">{file.linesOfCode}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Maintainability:</span>
                      <div className="font-medium text-gray-900">{file.maintainabilityIndex.toFixed(1)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Tech Debt:</span>
                      <div className="font-medium text-gray-900">{file.technicalDebt.toFixed(1)}h</div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <span className="text-gray-500">Category:</span>
                    <span className="ml-1 font-medium text-gray-900">{file.category}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}