'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { API_ENDPOINTS } from '@/lib/config';
import {
  CodeMetricsProps,
  CodeMetricsData,
} from './types';

export default function CodeMetrics({ analysisId }: CodeMetricsProps) {
  const [data, setData] = useState<CodeMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(API_ENDPOINTS.getMetrics(analysisId));
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }

      const metricsData = await response.json();
      setData(metricsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, [analysisId]);

  useEffect(() => {
    fetchMetrics();
  }, [analysisId, fetchMetrics]);

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const getComplexityLevel = (complexity: number) => {
    if (complexity <= 5) return 'low';
    if (complexity <= 10) return 'medium';
    if (complexity <= 20) return 'high';
    return 'very-high';
  };

  const getComplexityColor = (complexity: number) => {
    const level = getComplexityLevel(complexity);
    const colors = {
      'low': '#10b981',
      'medium': '#f59e0b',
      'high': '#ef4444',
      'very-high': '#dc2626'
    };
    return colors[level];
  };

  const prepareComplexityDistribution = () => {
    if (!data?.files) return [];

    const distribution = {
      'Low (1-5)': 0,
      'Medium (6-10)': 0,
      'High (11-20)': 0,
      'Very High (21+)': 0
    };

    data.files.forEach(file => {
      const complexity = file.complexity;
      if (complexity <= 5) distribution['Low (1-5)']++;
      else if (complexity <= 10) distribution['Medium (6-10)']++;
      else if (complexity <= 20) distribution['High (11-20)']++;
      else distribution['Very High (21+)']++;
    });

    return Object.entries(distribution).map(([level, count]) => ({
      level,
      count,
      fill: level.includes('Low') ? '#10b981' :
            level.includes('Medium') ? '#f59e0b' :
            level.includes('High') && !level.includes('Very') ? '#ef4444' : '#dc2626'
    }));
  };

  const prepareComplexityChart = () => {
    if (!data?.files) return [];

    return data.files
      .sort((a, b) => b.complexity - a.complexity)
      .slice(0, 10) // Top 10 most complex files
      .map(file => ({
        name: file.name.split('/').pop() || file.name,
        complexity: file.complexity,
        lines: file.lines,
        fill: getComplexityColor(file.complexity)
      }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 space-y-4">
        <div className="text-red-600 text-lg">Error: {error}</div>
        <Button onClick={fetchMetrics}>Try Again</Button>
      </div>
    );
  }

  if (!data || !data.files || data.files.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        No metrics data available.
      </div>
    );
  }

  const complexityDistribution = prepareComplexityDistribution();
  const complexityChart = prepareComplexityChart();
  const highComplexityFiles = data.files.filter(file => file.complexity > 15);

  return (
    <div className="space-y-6">
      {/* Overall Metrics */}
      {data.overall && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Overall Project Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {data.overall.averageComplexity.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Average Complexity: {data.overall.averageComplexity.toFixed(1)}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatNumber(data.overall.totalLines)}
              </div>
              <div className="text-sm text-gray-600">Total Lines: {formatNumber(data.overall.totalLines)}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {data.overall.fileCount}
              </div>
              <div className="text-sm text-gray-600">Files: {data.overall.fileCount}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {data.overall.duplicationPercentage}%
              </div>
              <div className="text-sm text-gray-600">Duplication: {data.overall.duplicationPercentage}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Complexity Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Complexity Distribution Pie Chart */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Complexity Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={complexityDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ level, count }) => `${level}: ${count}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {complexityDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Complex Files Bar Chart */}
        <div className="bg-white border rounded-lg p-6" data-testid="complexity-chart">
          <h3 className="text-lg font-semibold mb-4">Most Complex Files</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={complexityChart} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis />
              <Tooltip
                formatter={(value, name) => [value, name === 'complexity' ? 'Complexity' : 'Lines']}
                labelFormatter={(label) => `File: ${label}`}
              />
              <Bar dataKey="complexity" name="complexity" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* High Complexity Files Warning */}
      {highComplexityFiles.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">
            Files with High Complexity (&gt;15)
          </h3>
          <div className="space-y-2">
            {highComplexityFiles.map((file) => (
              <div
                key={file.name}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg",
                  file.complexity > 20 ? "bg-red-100 high-complexity" : "bg-yellow-100 high-complexity"
                )}
              >
                <div>
                  <span className="font-medium">{file.name}</span>
                  <span className="ml-2 text-sm text-gray-600">
                    ({file.lines} lines)
                  </span>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-sm font-medium",
                  file.complexity > 20 ? "bg-red-200 text-red-800" : "bg-yellow-200 text-yellow-800"
                )}>
                  Complexity: {file.complexity}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-sm text-yellow-700">
            <strong>Recommendation:</strong> Consider refactoring these files to reduce complexity and improve maintainability.
          </div>
        </div>
      )}

      {/* All Files Table */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">All Files</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3">File</th>
                <th className="text-right py-2 px-3">Complexity</th>
                <th className="text-right py-2 px-3">Lines</th>
                <th className="text-center py-2 px-3">Level</th>
              </tr>
            </thead>
            <tbody>
              {data.files
                .sort((a, b) => b.complexity - a.complexity)
                .map((file) => (
                  <tr
                    key={file.name}
                    className={cn(
                      "border-b",
                      file.complexity > 15 ? "high-complexity" : ""
                    )}
                  >
                    <td className="py-2 px-3">
                      <span className="font-medium">{file.name}</span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      {file.complexity}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      {formatNumber(file.lines)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        {
                          "bg-green-100 text-green-800": getComplexityLevel(file.complexity) === 'low',
                          "bg-yellow-100 text-yellow-800": getComplexityLevel(file.complexity) === 'medium',
                          "bg-orange-100 text-orange-800": getComplexityLevel(file.complexity) === 'high',
                          "bg-red-100 text-red-800": getComplexityLevel(file.complexity) === 'very-high'
                        }
                      )}>
                        {getComplexityLevel(file.complexity).charAt(0).toUpperCase() + getComplexityLevel(file.complexity).slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}