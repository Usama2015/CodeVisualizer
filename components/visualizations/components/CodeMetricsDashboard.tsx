'use client';

import React, { useMemo } from 'react';
import { AnalysisResult } from '@/shared/types/analysis';
import { useVisualization } from '../core/VisualizationProvider';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Treemap
} from 'recharts';

interface CodeMetricsDashboardProps {
  data: AnalysisResult;
  className?: string;
}

export default function CodeMetricsDashboard({ data, className }: CodeMetricsDashboardProps) {
  const { state } = useVisualization();

  // Calculate overall metrics
  const overallMetrics = useMemo(() => {
    const files = data.analysis.files;

    const totalLines = files.reduce((sum, file) => sum + (file.metrics?.linesOfCode || 0), 0);
    const avgComplexity = files.reduce((sum, file) => sum + (file.metrics?.cyclomaticComplexity || 0), 0) / files.length;
    const avgMaintainability = files.reduce((sum, file) => sum + (file.metrics?.maintainabilityIndex || 0), 0) / files.length;
    const totalFunctions = files.reduce((sum, file) => sum + (file.functions?.length || 0), 0);
    const totalClasses = files.reduce((sum, file) => sum + (file.classes?.length || 0), 0);

    return {
      totalFiles: files.length,
      totalLines,
      avgComplexity: avgComplexity.toFixed(2),
      avgMaintainability: avgMaintainability.toFixed(1),
      totalFunctions,
      totalClasses,
      totalDependencies: data.dependencies.edges.length
    };
  }, [data]);

  // Prepare data for complexity distribution chart
  const complexityDistribution = useMemo(() => {
    const distribution = {
      low: 0,
      moderate: 0,
      medium: 0,
      high: 0
    };

    data.analysis.files.forEach(file => {
      const complexity = file.metrics?.cyclomaticComplexity || 0;
      if (complexity <= 5) distribution.low++;
      else if (complexity <= 10) distribution.moderate++;
      else if (complexity <= 20) distribution.medium++;
      else distribution.high++;
    });

    return [
      { name: 'Low (≤5)', value: distribution.low, color: '#10b981' },
      { name: 'Moderate (5-10)', value: distribution.moderate, color: '#3b82f6' },
      { name: 'Medium (10-20)', value: distribution.medium, color: '#f59e0b' },
      { name: 'High (>20)', value: distribution.high, color: '#ef4444' }
    ];
  }, [data]);

  // Prepare data for top complex files
  const topComplexFiles = useMemo(() => {
    return [...data.analysis.files]
      .sort((a, b) => (b.metrics?.cyclomaticComplexity || 0) - (a.metrics?.cyclomaticComplexity || 0))
      .slice(0, 10)
      .map(file => ({
        name: file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name,
        complexity: file.metrics?.cyclomaticComplexity || 0,
        maintainability: file.metrics?.maintainabilityIndex || 0,
        lines: file.metrics?.linesOfCode || 0
      }));
  }, [data]);

  // Prepare language distribution
  const languageDistribution = useMemo(() => {
    const langCount: Record<string, number> = {};

    data.analysis.files.forEach(file => {
      langCount[file.language] = (langCount[file.language] || 0) + 1;
    });

    return Object.entries(langCount).map(([lang, count]) => ({
      name: lang,
      value: count,
      percentage: ((count / data.analysis.files.length) * 100).toFixed(1)
    }));
  }, [data]);

  // Prepare treemap data for file sizes
  const fileTreemapData = useMemo(() => {
    const directoryMap = new Map<string, any[]>();

    data.analysis.files.forEach(file => {
      const pathParts = file.path?.split('/') || [file.name];
      const directory = pathParts.length > 1 ? pathParts[0] : 'root';

      if (!directoryMap.has(directory)) {
        directoryMap.set(directory, []);
      }

      directoryMap.get(directory)!.push({
        name: file.name,
        size: file.metrics?.linesOfCode || 1,
        complexity: file.metrics?.cyclomaticComplexity || 0
      });
    });

    return Array.from(directoryMap.entries()).map(([dir, files]) => ({
      name: dir,
      children: files
    }));
  }, [data]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  return (
    <div className={`w-full h-full overflow-auto bg-white dark:bg-gray-800 p-6 ${className}`}>
      {/* Overall Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-lg text-white">
          <p className="text-sm opacity-90">Total Files</p>
          <p className="text-2xl font-bold">{overallMetrics.totalFiles}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-lg text-white">
          <p className="text-sm opacity-90">Total Lines</p>
          <p className="text-2xl font-bold">{overallMetrics.totalLines.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-4 rounded-lg text-white">
          <p className="text-sm opacity-90">Avg Complexity</p>
          <p className="text-2xl font-bold">{overallMetrics.avgComplexity}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-lg text-white">
          <p className="text-sm opacity-90">Maintainability</p>
          <p className="text-2xl font-bold">{overallMetrics.avgMaintainability}</p>
        </div>
        <div className="bg-gradient-to-br from-pink-500 to-pink-600 p-4 rounded-lg text-white">
          <p className="text-sm opacity-90">Functions</p>
          <p className="text-2xl font-bold">{overallMetrics.totalFunctions}</p>
        </div>
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 rounded-lg text-white">
          <p className="text-sm opacity-90">Classes</p>
          <p className="text-2xl font-bold">{overallMetrics.totalClasses}</p>
        </div>
        <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-4 rounded-lg text-white">
          <p className="text-sm opacity-90">Dependencies</p>
          <p className="text-2xl font-bold">{overallMetrics.totalDependencies}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Complexity Distribution Pie Chart */}
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Complexity Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={complexityDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {complexityDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Complex Files Bar Chart */}
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Most Complex Files</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topComplexFiles}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 10 }}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="complexity" fill="#ef4444" name="Complexity" />
              <Bar dataKey="maintainability" fill="#10b981" name="Maintainability" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Language Distribution */}
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Language Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={languageDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.percentage}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {languageDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* File Size Treemap */}
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">File Size Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <Treemap
              data={fileTreemapData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="#fff"
              fill="#3b82f6"
              content={({ x, y, width, height, name, value }: any) => {
                if (width < 50 || height < 30) return null;

                return (
                  <g>
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      style={{
                        fill: value > 500 ? '#ef4444' : value > 200 ? '#f59e0b' : value > 100 ? '#3b82f6' : '#10b981',
                        stroke: '#fff',
                        strokeWidth: 2,
                      }}
                    />
                    <text
                      x={x + width / 2}
                      y={y + height / 2}
                      fill="#fff"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={10}
                      fontWeight="bold"
                    >
                      {name}
                    </text>
                    <text
                      x={x + width / 2}
                      y={y + height / 2 + 12}
                      fill="#fff"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={8}
                    >
                      {value} lines
                    </text>
                  </g>
                );
              }}
            />
          </ResponsiveContainer>
        </div>
      </div>

      {/* Architecture Patterns */}
      {data.analysis.architecturePatterns && data.analysis.architecturePatterns.length > 0 && (
        <div className="mt-6 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Detected Architecture Patterns</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.analysis.architecturePatterns.map((pattern, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{pattern.type}</h4>
                  <span className="text-sm px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                    {(pattern.confidence * 100).toFixed(0)}% confidence
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{pattern.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}