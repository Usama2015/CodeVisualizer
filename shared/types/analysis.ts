// Additional types specifically for deep code analysis
export interface DeepAnalysis {
  id: string;
  analysis: {
    files: DeepAnalyzedFile[];
    architecturePatterns: ArchitecturePattern[];
  };
  dependencies: DependencyGraph;
  createdAt: Date;
}

export interface DeepAnalyzedFile {
  id: string;
  path: string;
  name: string;
  language: string;
  imports: ImportInfo[];
  exports: ExportInfo[];
  functions: FunctionInfo[];
  classes: ClassInfo[];
  complexity: number;
  metrics: FileMetrics;
  duplication?: DuplicationInfo;
  endpoints?: EndpointInfo[];
}

export interface ImportInfo {
  module: string;
  imports: string[];
  isDefault?: boolean;
  alias?: string;
  line: number;
}

export interface ExportInfo {
  name: string;
  isDefault: boolean;
  type: 'function' | 'class' | 'variable' | 'type';
  line: number;
}

export interface FunctionInfo {
  name: string;
  startLine: number;
  endLine: number;
  parameters: ParameterInfo[];
  complexity: number;
  calls: string[];
  async: boolean;
  generator: boolean;
}

export interface ParameterInfo {
  name: string;
  type?: string;
  optional: boolean;
  defaultValue?: string;
}

export interface ClassInfo {
  name: string;
  startLine: number;
  endLine: number;
  methods: FunctionInfo[];
  properties: PropertyInfo[];
  extends?: string;
  implements?: string[];
  abstract: boolean;
}

export interface PropertyInfo {
  name: string;
  type?: string;
  visibility: 'public' | 'private' | 'protected';
  static: boolean;
  readonly: boolean;
  line: number;
}

export interface FileMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  cognitiveComplexity: number;
  halsteadVolume?: number;
  technicalDebt?: number;
}

export interface DuplicationInfo {
  percentage: number;
  blocks: DuplicationBlock[];
  totalDuplicatedLines: number;
}

export interface DuplicationBlock {
  startLine: number;
  endLine: number;
  tokens: number;
  duplicateOf?: {
    file: string;
    startLine: number;
    endLine: number;
  };
}

export interface EndpointInfo {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: string;
  middleware: string[];
  line: number;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  visualizationData?: {
    layout: 'force' | 'hierarchical' | 'circular';
    clusters: DependencyCluster[];
  };
}

export interface DependencyNode {
  id: string;
  name: string;
  type: 'file' | 'module' | 'package';
  size: number;
  complexity: number;
  importance: number;
  metadata: {
    path?: string;
    language?: string;
    exports?: string[];
    imports?: string[];
  };
}

export interface DependencyEdge {
  source: string;
  target: string;
  imports: string[];
  weight: number;
  type: 'import' | 'dynamic_import' | 'require' | 'export';
}

export interface DependencyCluster {
  id: string;
  name: string;
  nodes: string[];
  type: 'circular' | 'strongly_connected' | 'module_family';
}

export interface ArchitecturePattern {
  type: 'MVC' | 'MVVM' | 'MVP' | 'Component' | 'Layered' | 'Microservices' | 'Monolith' | 'Observer' | 'Strategy' | 'Factory' | 'Singleton';
  confidence: number;
  description: string;
  evidence: ArchitectureEvidence[];
  components: ArchitectureComponent[];
}

export interface ArchitectureEvidence {
  type: 'naming_convention' | 'directory_structure' | 'import_pattern' | 'class_hierarchy' | 'method_pattern';
  description: string;
  files: string[];
  confidence: number;
}

export interface ArchitectureComponent {
  name: string;
  role: string;
  files: string[];
  responsibilities: string[];
}

export interface CodeMetrics {
  overall: OverallMetrics;
  byFile: Record<string, FileMetrics>;
  byLanguage: Record<string, LanguageMetrics>;
  trends: MetricsTrend[];
}

export interface OverallMetrics {
  totalFiles: number;
  totalLines: number;
  totalFunctions: number;
  totalClasses: number;
  averageComplexity: number;
  maintainabilityIndex: number;
  technicalDebtRatio: number;
  duplicationPercentage: number;
  testCoverage?: number;
}

export interface LanguageMetrics {
  fileCount: number;
  lineCount: number;
  functionCount: number;
  classCount: number;
  averageComplexity: number;
  duplicationPercentage: number;
}

export interface MetricsTrend {
  metric: string;
  values: number[];
  timestamps: Date[];
  trend: 'improving' | 'degrading' | 'stable';
}

// Input types for analysis requests
export interface AnalysisFile {
  id: string;
  name: string;
  path?: string; // Optional path for folder structure preservation
  content: string;
  language: 'javascript' | 'typescript' | 'jsx' | 'tsx' | 'python' | 'java' | 'cpp' | 'c' | 'csharp' | 'php' | 'ruby' | 'go' | 'rust';
}

export interface DeepAnalysisRequest {
  files: AnalysisFile[];
  options?: AnalysisOptions;
}

export interface AnalysisOptions {
  includeMetrics?: boolean;
  includeDuplication?: boolean;
  includeArchitecture?: boolean;
  includeDependencies?: boolean;
  complexityThreshold?: number;
  duplicationThreshold?: number;
  excludePatterns?: string[];
}

// Response types
export interface AnalysisResult {
  id: string;
  analysis: {
    id: string;
    files: DeepAnalyzedFile[];
    architecturePatterns: ArchitecturePattern[];
    dependencies: DependencyGraph;
    createdAt: Date;
  };
  dependencies: DependencyGraph;
  processingTime: number;
  warnings: AnalysisWarning[];
}

export interface AnalysisWarning {
  type: 'circular_dependency' | 'high_complexity' | 'code_duplication' | 'large_file' | 'parse_error';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  file?: string;
  line?: number;
  suggestion?: string;
}