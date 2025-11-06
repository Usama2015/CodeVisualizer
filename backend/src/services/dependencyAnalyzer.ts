import {
  DeepAnalyzedFile,
  DependencyGraph,
  DependencyNode,
  DependencyEdge,
  DependencyCluster
} from '../../../shared/types/analysis';

export class DependencyAnalyzer {
  private files: DeepAnalyzedFile[] = [];
  private nodes: Map<string, DependencyNode> = new Map();
  private edges: DependencyEdge[] = [];

  public analyze(files: DeepAnalyzedFile[]): DependencyGraph {
    this.files = files;
    this.nodes.clear();
    this.edges = [];

    // Create nodes for each file
    this.createNodes();

    // Create edges based on imports
    this.createEdges();

    // Detect clusters (circular dependencies, etc.)
    const clusters = this.detectClusters();

    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
      visualizationData: {
        layout: 'force',
        clusters
      }
    };
  }

  private createNodes(): void {
    this.files.forEach(file => {
      const node: DependencyNode = {
        id: file.path,
        name: file.name,
        type: 'file',
        size: file.metrics.linesOfCode,
        complexity: file.complexity,
        importance: this.calculateImportance(file),
        metadata: {
          path: file.path,
          language: file.language,
          exports: file.exports.map(exp => exp.name),
          imports: file.imports.map(imp => imp.module)
        }
      };

      this.nodes.set(file.path, node);
    });
  }

  private calculateImportance(file: DeepAnalyzedFile): number {
    // Calculate importance based on:
    // 1. Number of other files that import this file
    // 2. Number of exports
    // 3. File complexity
    // 4. Number of functions/classes

    const exportCount = file.exports.length;
    const functionCount = file.functions.length;
    const classCount = file.classes.length;
    const complexity = file.complexity;

    // Count how many files import this one
    const importedByCount = this.files.filter(otherFile =>
      otherFile.imports.some(imp => this.resolveModulePath(imp.module, otherFile.path) === file.path)
    ).length;

    // Weighted calculation
    return (
      importedByCount * 10 +
      exportCount * 5 +
      functionCount * 2 +
      classCount * 3 +
      Math.log(complexity + 1) * 2
    );
  }

  private createEdges(): void {
    this.files.forEach(sourceFile => {
      sourceFile.imports.forEach(importInfo => {
        const targetPath = this.resolveModulePath(importInfo.module, sourceFile.path);

        if (targetPath && this.nodes.has(targetPath)) {
          const existingEdge = this.edges.find(
            edge => edge.source === sourceFile.path && edge.target === targetPath
          );

          if (existingEdge) {
            // Merge imports
            existingEdge.imports = [...new Set([...existingEdge.imports, ...importInfo.imports])];
            existingEdge.weight += importInfo.imports.length;
          } else {
            const edge: DependencyEdge = {
              source: sourceFile.path,
              target: targetPath,
              imports: importInfo.imports,
              weight: importInfo.imports.length,
              type: this.determineImportType(importInfo.module)
            };

            this.edges.push(edge);
          }
        }
      });
    });
  }

  private resolveModulePath(module: string, fromPath: string): string | null {
    // Handle relative imports
    if (module.startsWith('./') || module.startsWith('../')) {
      // Simple path resolution - in a real implementation, you'd want more sophisticated logic
      const basePath = fromPath.substring(0, fromPath.lastIndexOf('/'));
      let resolvedPath = this.normalizePath(basePath + '/' + module);

      // Try different extensions
      const possiblePaths = [
        resolvedPath,
        resolvedPath + '.js',
        resolvedPath + '.ts',
        resolvedPath + '.jsx',
        resolvedPath + '.tsx',
        resolvedPath + '/index.js',
        resolvedPath + '/index.ts',
        resolvedPath + '/index.jsx',
        resolvedPath + '/index.tsx'
      ];

      for (const path of possiblePaths) {
        if (this.files.some(file => file.path === path)) {
          return path;
        }
      }

      // If exact path not found, try finding by filename
      const fileName = module.split('/').pop();
      if (fileName) {
        const matchingFile = this.files.find(file =>
          file.name === fileName ||
          file.name === fileName + '.js' ||
          file.name === fileName + '.ts' ||
          file.name === fileName + '.jsx' ||
          file.name === fileName + '.tsx'
        );
        return matchingFile?.path || null;
      }
    }

    // Handle absolute imports (npm packages, etc.)
    // For now, we don't create nodes for external dependencies
    return null;
  }

  private normalizePath(path: string): string {
    const parts = path.split('/');
    const normalizedParts: string[] = [];

    for (const part of parts) {
      if (part === '..') {
        normalizedParts.pop();
      } else if (part !== '.' && part !== '') {
        normalizedParts.push(part);
      }
    }

    return normalizedParts.join('/');
  }

  private determineImportType(module: string): 'import' | 'dynamic_import' | 'require' | 'export' {
    // This is a simplified determination
    // In a real implementation, you'd analyze the AST to determine the actual import type
    if (module.startsWith('./') || module.startsWith('../')) {
      return 'import';
    }
    return 'import';
  }

  private detectClusters(): DependencyCluster[] {
    const clusters: DependencyCluster[] = [];

    // Detect circular dependencies using DFS
    const circularDependencies = this.detectCircularDependencies();
    if (circularDependencies.length > 0) {
      clusters.push({
        id: 'circular-dependencies',
        name: 'Circular Dependencies',
        nodes: circularDependencies,
        type: 'circular'
      });
    }

    // Detect strongly connected components
    const stronglyConnected = this.detectStronglyConnectedComponents();
    stronglyConnected.forEach((component, index) => {
      if (component.length > 1) {
        clusters.push({
          id: `strongly-connected-${index}`,
          name: `Strongly Connected Component ${index + 1}`,
          nodes: component,
          type: 'strongly_connected'
        });
      }
    });

    // Detect module families (files that heavily depend on each other)
    const moduleFamilies = this.detectModuleFamilies();
    moduleFamilies.forEach((family, index) => {
      clusters.push({
        id: `module-family-${index}`,
        name: `Module Family ${index + 1}`,
        nodes: family,
        type: 'module_family'
      });
    });

    return clusters;
  }

  private detectCircularDependencies(): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const circularNodes = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingEdges = this.edges.filter(edge => edge.source === nodeId);

      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          if (dfs(edge.target)) {
            circularNodes.add(nodeId);
            return true;
          }
        } else if (recursionStack.has(edge.target)) {
          circularNodes.add(nodeId);
          circularNodes.add(edge.target);
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    }

    return Array.from(circularNodes);
  }

  private detectStronglyConnectedComponents(): string[][] {
    const components: string[][] = [];
    const visited = new Set<string>();
    const stack: string[] = [];
    const onStack = new Set<string>();
    const ids = new Map<string, number>();
    const lowLinks = new Map<string, number>();
    let idCounter = 0;

    const strongConnect = (nodeId: string): void => {
      ids.set(nodeId, idCounter);
      lowLinks.set(nodeId, idCounter);
      idCounter++;
      visited.add(nodeId);
      stack.push(nodeId);
      onStack.add(nodeId);

      const outgoingEdges = this.edges.filter(edge => edge.source === nodeId);

      for (const edge of outgoingEdges) {
        const targetId = edge.target;

        if (!visited.has(targetId)) {
          strongConnect(targetId);
        }

        if (onStack.has(targetId)) {
          lowLinks.set(nodeId, Math.min(lowLinks.get(nodeId)!, lowLinks.get(targetId)!));
        }
      }

      if (lowLinks.get(nodeId) === ids.get(nodeId)) {
        const component: string[] = [];
        let poppedId: string;

        do {
          poppedId = stack.pop()!;
          onStack.delete(poppedId);
          component.push(poppedId);
        } while (poppedId !== nodeId);

        components.push(component);
      }
    };

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        strongConnect(nodeId);
      }
    }

    return components.filter(component => component.length > 1);
  }

  private detectModuleFamilies(): string[][] {
    const families: string[][] = [];
    const processed = new Set<string>();

    for (const nodeId of this.nodes.keys()) {
      if (processed.has(nodeId)) continue;

      const family = this.expandModuleFamily(nodeId, processed);
      if (family.length > 2) {
        families.push(family);
        family.forEach(id => processed.add(id));
      }
    }

    return families;
  }

  private expandModuleFamily(startNodeId: string, processed: Set<string>): string[] {
    const family = new Set<string>([startNodeId]);
    const threshold = 0.3; // 30% of imports/exports should be within the family

    let changed = true;
    while (changed) {
      changed = false;
      const currentFamily = Array.from(family);

      for (const nodeId of this.nodes.keys()) {
        if (family.has(nodeId) || processed.has(nodeId)) continue;

        const node = this.nodes.get(nodeId)!;
        const incomingEdges = this.edges.filter(edge => edge.target === nodeId);
        const outgoingEdges = this.edges.filter(edge => edge.source === nodeId);

        const totalConnections = incomingEdges.length + outgoingEdges.length;
        const familyConnections = [...incomingEdges, ...outgoingEdges]
          .filter(edge => family.has(edge.source) || family.has(edge.target))
          .length;

        if (totalConnections > 0 && familyConnections / totalConnections >= threshold) {
          family.add(nodeId);
          changed = true;
        }
      }
    }

    return Array.from(family);
  }

  public getDependencyPath(sourceFile: string, targetFile: string): string[] | null {
    // Find the shortest path between two files using BFS
    const queue: string[][] = [[sourceFile]];
    const visited = new Set<string>([sourceFile]);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const currentFile = path[path.length - 1];

      if (currentFile === targetFile) {
        return path;
      }

      const outgoingEdges = this.edges.filter(edge => edge.source === currentFile);

      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push([...path, edge.target]);
        }
      }
    }

    return null;
  }

  public getFileStats(filePath: string): {
    incomingDependencies: number;
    outgoingDependencies: number;
    importance: number;
    isInCircularDependency: boolean;
  } | null {
    const node = this.nodes.get(filePath);
    if (!node) return null;

    const incomingEdges = this.edges.filter(edge => edge.target === filePath);
    const outgoingEdges = this.edges.filter(edge => edge.source === filePath);

    const circularDependencies = this.detectCircularDependencies();

    return {
      incomingDependencies: incomingEdges.length,
      outgoingDependencies: outgoingEdges.length,
      importance: node.importance,
      isInCircularDependency: circularDependencies.includes(filePath)
    };
  }
}