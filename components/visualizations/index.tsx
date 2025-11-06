// Export all visualization components and their types
export { default as DependencyGraph } from './DependencyGraph';
export type {
  FileNode,
  FileDependency,
  DependencyAnalysisData
} from './DependencyGraph';

export { default as CallHierarchy } from './CallHierarchy';
export type {
  FunctionCall,
  CallHierarchyData
} from './CallHierarchy';

export { default as ComplexityHeatmap } from './ComplexityHeatmap';
export type {
  FileComplexity,
  ComplexityHeatmapData
} from './ComplexityHeatmap';

// Combined export for convenience
import DependencyGraphComponent from './DependencyGraph';
import CallHierarchyComponent from './CallHierarchy';
import ComplexityHeatmapComponent from './ComplexityHeatmap';

export const Visualizations = {
  DependencyGraph: DependencyGraphComponent,
  CallHierarchy: CallHierarchyComponent,
  ComplexityHeatmap: ComplexityHeatmapComponent,
} as const;

// Type definitions for common visualization props
export interface BaseVisualizationProps {
  isLoading?: boolean;
  error?: string | null;
}

// Utility type for visualization data states
export type VisualizationDataState<T> = {
  data: T | null;
  isLoading: boolean;
  error: string | null;
};

// Common visualization themes and colors
export const VISUALIZATION_COLORS = {
  // File type colors
  fileTypes: {
    typescript: '#3178c6',
    javascript: '#f7df1e',
    python: '#3776ab',
    java: '#ed8b00',
    css: '#1572b6',
    html: '#e34f26',
    json: '#000000',
    markdown: '#083fa1',
    default: '#64748b'
  },

  // Complexity level colors
  complexity: {
    veryLow: '#10b981',   // green
    low: '#22c55e',       // green
    medium: '#f59e0b',    // yellow
    high: '#f97316',      // orange
    veryHigh: '#ef4444'   // red
  },

  // Dependency type colors
  dependencies: {
    import: '#10b981',
    require: '#3b82f6',
    include: '#8b5cf6'
  }
} as const;

// Helper functions for color mapping
export const getFileTypeColor = (fileType: string): string => {
  return VISUALIZATION_COLORS.fileTypes[fileType.toLowerCase() as keyof typeof VISUALIZATION_COLORS.fileTypes]
    || VISUALIZATION_COLORS.fileTypes.default;
};

export const getComplexityColor = (complexity: number): string => {
  if (complexity <= 2) return VISUALIZATION_COLORS.complexity.veryLow;
  if (complexity <= 5) return VISUALIZATION_COLORS.complexity.low;
  if (complexity <= 10) return VISUALIZATION_COLORS.complexity.medium;
  if (complexity <= 15) return VISUALIZATION_COLORS.complexity.high;
  return VISUALIZATION_COLORS.complexity.veryHigh;
};

export const getDependencyTypeColor = (dependencyType: string): string => {
  return VISUALIZATION_COLORS.dependencies[dependencyType as keyof typeof VISUALIZATION_COLORS.dependencies]
    || VISUALIZATION_COLORS.dependencies.import;
};

// Common layout configurations
export const LAYOUT_CONFIGS = {
  dependencyGraph: {
    nodeSize: { small: 120, medium: 150, large: 180 },
    nodeSpacing: { x: 250, y: 150 }
  },

  callHierarchy: {
    nodeSize: { x: 200, y: 100 },
    separation: { siblings: 1, nonSiblings: 2 }
  },

  complexityHeatmap: {
    defaultDimensions: { width: 800, height: 400 },
    cellSpacing: 1
  }
} as const;