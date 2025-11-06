// Type definitions for code analysis components

export interface FileMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
}

export interface FileAnalysis {
  path: string;
  language: string;
  imports?: string[];
  exports?: string[];
  functions?: string[];
  classes?: string[];
  complexity?: number;
  metrics?: FileMetrics;
  error?: string;
}

export interface AnalysisResponse {
  id: string;
  analysis: {
    files: FileAnalysis[];
  };
}

export interface DependencyNode {
  id: string;
  group: string;
  imports?: number;
  exports?: number;
}

export interface DependencyEdge {
  source: string;
  target: string;
  imports: string[];
}

export interface DependencyGraphData {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  cycles?: string[][];
}

export interface OverallMetrics {
  averageComplexity: number;
  totalLines: number;
  fileCount: number;
  duplicationPercentage: number;
}

export interface FileMetricsData {
  name: string;
  complexity: number;
  lines: number;
}

export interface CodeMetricsData {
  overall?: OverallMetrics;
  files: FileMetricsData[];
}

export interface ProgressUpdate {
  status: 'analyzing' | 'complete' | 'error';
  progress: number;
  current: string;
}

// Component prop interfaces
export interface AnalysisResultsProps {
  analysisId: string;
  realtime?: boolean;
}

export interface DependencyGraphProps {
  analysisId: string;
}

export interface CodeMetricsProps {
  analysisId: string;
}