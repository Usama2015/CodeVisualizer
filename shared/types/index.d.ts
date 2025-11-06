export interface FileUpload {
    id: string;
    filename: string;
    originalName: string;
    size: number;
    mimetype: string;
    uploadedAt: Date;
}
export interface CodebaseAnalysis {
    id: string;
    name: string;
    files: AnalyzedFile[];
    dependencies: Dependency[];
    architecture: ArchitectureNode[];
    metrics: CodeMetrics;
    createdAt: Date;
}
export interface AnalyzedFile {
    path: string;
    name: string;
    extension: string;
    size: number;
    language: string;
    functions: FunctionDefinition[];
    classes: ClassDefinition[];
    imports: ImportStatement[];
    exports: ExportStatement[];
    lineCount: number;
}
export interface FunctionDefinition {
    name: string;
    startLine: number;
    endLine: number;
    parameters: Parameter[];
    returnType?: string;
    complexity: number;
    calls: string[];
}
export interface ClassDefinition {
    name: string;
    startLine: number;
    endLine: number;
    methods: FunctionDefinition[];
    properties: Property[];
    extends?: string;
    implements?: string[];
}
export interface Parameter {
    name: string;
    type?: string;
    optional: boolean;
    defaultValue?: string;
}
export interface Property {
    name: string;
    type?: string;
    visibility: 'public' | 'private' | 'protected';
    static: boolean;
}
export interface ImportStatement {
    module: string;
    imports: string[];
    isDefault: boolean;
    alias?: string;
}
export interface ExportStatement {
    name: string;
    isDefault: boolean;
    type: 'function' | 'class' | 'variable' | 'type';
}
export interface Dependency {
    name: string;
    version: string;
    type: 'dependency' | 'devDependency' | 'peerDependency';
    source?: string;
}
export interface ArchitectureNode {
    id: string;
    name: string;
    type: 'module' | 'class' | 'function' | 'component';
    children: ArchitectureNode[];
    connections: Connection[];
    position?: {
        x: number;
        y: number;
    };
    metadata: Record<string, any>;
}
export interface Connection {
    target: string;
    type: 'imports' | 'calls' | 'extends' | 'implements' | 'uses';
    weight: number;
}
export interface CodeMetrics {
    totalFiles: number;
    totalLines: number;
    totalFunctions: number;
    totalClasses: number;
    averageComplexity: number;
    languageDistribution: Record<string, number>;
    dependencyCount: number;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface UploadResponse extends ApiResponse<FileUpload> {
}
export interface AnalysisResponse extends ApiResponse<CodebaseAnalysis> {
}
export interface VisualizationConfig {
    type: 'dependency-graph' | 'architecture-tree' | 'complexity-heatmap' | 'file-structure';
    layout: 'force' | 'hierarchical' | 'circular' | 'grid';
    filters: {
        languages?: string[];
        minComplexity?: number;
        fileTypes?: string[];
        modules?: string[];
    };
    display: {
        showLabels: boolean;
        showMetrics: boolean;
        colorScheme: string;
        nodeSize: 'fixed' | 'proportional';
    };
}
export interface GraphNode {
    id: string;
    label: string;
    type: string;
    size: number;
    color: string;
    metadata: Record<string, any>;
}
export interface GraphEdge {
    source: string;
    target: string;
    type: string;
    weight: number;
    color: string;
}
export interface VisualizationData {
    nodes: GraphNode[];
    edges: GraphEdge[];
    config: VisualizationConfig;
}
//# sourceMappingURL=index.d.ts.map