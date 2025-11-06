'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { AnalysisResult } from '@/shared/types/analysis';
import { useVisualization } from '../core/VisualizationProvider';
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Code,
  FileText,
  Package,
  GitBranch,
  AlertCircle
} from 'lucide-react';

interface FileTreeExplorerProps {
  data: AnalysisResult;
  className?: string;
}

interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  path: string;
  children?: TreeNode[];
  fileData?: any;
  metrics?: any;
  language?: string;
  complexity?: number;
}

function getFileIcon(fileName: string, language?: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  if (language === 'typescript' || ext === 'ts' || ext === 'tsx') {
    return <Code className="w-4 h-4 text-blue-500" />;
  }
  if (language === 'javascript' || ext === 'js' || ext === 'jsx') {
    return <Code className="w-4 h-4 text-yellow-500" />;
  }
  if (language === 'python' || ext === 'py') {
    return <Code className="w-4 h-4 text-green-500" />;
  }
  if (ext === 'json' || ext === 'md' || ext === 'txt') {
    return <FileText className="w-4 h-4 text-gray-500" />;
  }
  if (ext === 'package' || fileName === 'package.json') {
    return <Package className="w-4 h-4 text-red-500" />;
  }
  
  return <File className="w-4 h-4 text-gray-400" />;
}

function TreeNodeComponent({ 
  node, 
  level = 0,
  onSelect,
  selectedNode,
  expandedNodes,
  onToggleExpand
}: {
  node: TreeNode;
  level?: number;
  onSelect: (node: TreeNode) => void;
  selectedNode: string | null;
  expandedNodes: Set<string>;
  onToggleExpand: (nodeId: string) => void;
}) {
  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedNode === node.id;
  const hasChildren = node.children && node.children.length > 0;
  
  const getComplexityColor = (complexity?: number) => {
    if (!complexity) return '';
    if (complexity > 20) return 'text-red-500';
    if (complexity > 10) return 'text-amber-500';
    if (complexity > 5) return 'text-blue-500';
    return 'text-green-500';
  };

  return (
    <div>
      <div
        className={`flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ${
          isSelected ? 'bg-blue-100 dark:bg-blue-900' : ''
        }`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => {
          if (hasChildren) {
            onToggleExpand(node.id);
          }
          onSelect(node);
        }}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="w-4 h-4 mr-1 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 mr-1 text-gray-500" />
          )
        ) : (
          <span className="w-4 mr-1" />
        )}
        
        {node.type === 'folder' ? (
          isExpanded ? (
            <FolderOpen className="w-4 h-4 mr-2 text-blue-500" />
          ) : (
            <Folder className="w-4 h-4 mr-2 text-blue-500" />
          )
        ) : (
          <span className="mr-2">{getFileIcon(node.name, node.language)}</span>
        )}
        
        <span className={`flex-1 text-sm ${isSelected ? 'font-semibold' : ''} text-gray-900 dark:text-white`}>
          {node.name}
        </span>
        
        {node.type === 'file' && node.complexity && (
          <span className={`text-xs ml-2 ${getComplexityColor(node.complexity)}`}>
            C: {node.complexity}
          </span>
        )}
      </div>
      
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map(child => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              selectedNode={selectedNode}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTreeExplorer({ data, className }: FileTreeExplorerProps) {
  const { state, selectNode } = useVisualization();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedFileInfo, setSelectedFileInfo] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const treeData = useMemo(() => {
    const root: TreeNode = {
      id: 'root',
      name: 'Project Root',
      type: 'folder',
      path: '/',
      children: []
    };

    const pathMap = new Map<string, TreeNode>();
    pathMap.set('/', root);

    // Build tree structure from files
    data.analysis.files.forEach(file => {
      const pathParts = file.path ? file.path.split('/').filter(Boolean) : [file.name];
      let currentPath = '/';
      let currentNode = root;

      // Create folder structure
      for (let i = 0; i < pathParts.length - 1; i++) {
        const folderName = pathParts[i];
        currentPath = currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`;

        if (!pathMap.has(currentPath)) {
          const folderNode: TreeNode = {
            id: currentPath,
            name: folderName,
            type: 'folder',
            path: currentPath,
            children: []
          };

          if (!currentNode.children) currentNode.children = [];
          currentNode.children.push(folderNode);
          pathMap.set(currentPath, folderNode);
          currentNode = folderNode;
        } else {
          currentNode = pathMap.get(currentPath)!;
        }
      }

      // Add file node
      const fileName = pathParts[pathParts.length - 1] || file.name;
      const filePath = currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`;
      
      const fileNode: TreeNode = {
        id: file.id,
        name: fileName,
        type: 'file',
        path: filePath,
        fileData: file,
        metrics: file.metrics,
        language: file.language,
        complexity: file.metrics?.cyclomaticComplexity
      };

      if (!currentNode.children) currentNode.children = [];
      currentNode.children.push(fileNode);
    });

    // Sort children (folders first, then alphabetically)
    const sortChildren = (node: TreeNode) => {
      if (node.children) {
        node.children.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'folder' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
        node.children.forEach(sortChildren);
      }
    };

    sortChildren(root);
    return root;
  }, [data]);

  // Filter tree based on search
  const filteredTree = useMemo(() => {
    if (!searchQuery) return treeData;

    const filterNode = (node: TreeNode): TreeNode | null => {
      const nameMatches = node.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (node.children) {
        const filteredChildren = node.children
          .map(child => filterNode(child))
          .filter(Boolean) as TreeNode[];
        
        if (filteredChildren.length > 0 || nameMatches) {
          return {
            ...node,
            children: filteredChildren
          };
        }
      } else if (nameMatches) {
        return node;
      }
      
      return null;
    };

    const filtered = filterNode(treeData);
    return filtered || treeData;
  }, [treeData, searchQuery]);

  const handleNodeSelect = useCallback((node: TreeNode) => {
    setSelectedNode(node.id);
    
    if (node.type === 'file' && node.fileData) {
      setSelectedFileInfo({
        ...node.fileData,
        path: node.path
      });
      selectNode(node.id);
    } else {
      setSelectedFileInfo(null);
    }
  }, [selectNode]);

  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const allFolders = new Set<string>();
    const collectFolders = (node: TreeNode) => {
      if (node.type === 'folder') {
        allFolders.add(node.id);
        node.children?.forEach(collectFolders);
      }
    };
    collectFolders(filteredTree);
    setExpandedNodes(allFolders);
  }, [filteredTree]);

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  return (
    <div className={`w-full h-full flex bg-white dark:bg-gray-800 ${className}`}>
      {/* Tree Panel */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Search and Controls */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={expandAll}
              className="flex-1 px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="flex-1 px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-auto p-2">
          <TreeNodeComponent
            node={filteredTree}
            onSelect={handleNodeSelect}
            selectedNode={selectedNode}
            expandedNodes={expandedNodes}
            onToggleExpand={handleToggleExpand}
          />
        </div>

        {/* Summary */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
          <div>Total Files: {data.analysis.files.length}</div>
          <div>Languages: {[...new Set(data.analysis.files.map(f => f.language))].join(', ')}</div>
        </div>
      </div>

      {/* Details Panel */}
      <div className="flex-1 overflow-auto">
        {selectedFileInfo ? (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{selectedFileInfo.name}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{selectedFileInfo.path}</p>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Lines of Code</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedFileInfo.metrics?.linesOfCode || 0}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Complexity</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedFileInfo.metrics?.cyclomaticComplexity || 0}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Maintainability</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedFileInfo.metrics?.maintainabilityIndex?.toFixed(1) || 'N/A'}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Functions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedFileInfo.functions?.length || 0}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Classes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedFileInfo.classes?.length || 0}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Language</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedFileInfo.language}
                </p>
              </div>
            </div>

            {/* Functions List */}
            {selectedFileInfo.functions && selectedFileInfo.functions.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Functions</h3>
                <div className="space-y-2">
                  {selectedFileInfo.functions.map((func: any, index: number) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-sm text-gray-900 dark:text-white">{func.name}</span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          Lines: {func.startLine}-{func.endLine} | Complexity: {func.complexity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Classes List */}
            {selectedFileInfo.classes && selectedFileInfo.classes.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Classes</h3>
                <div className="space-y-2">
                  {selectedFileInfo.classes.map((cls: any, index: number) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-sm text-gray-900 dark:text-white">{cls.name}</span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          Lines: {cls.startLine}-{cls.endLine} | Methods: {cls.methods?.length || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Imports */}
            {selectedFileInfo.imports && selectedFileInfo.imports.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Imports</h3>
                <div className="space-y-1">
                  {selectedFileInfo.imports.map((imp: any, index: number) => (
                    <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-mono">{imp.module}</span>
                      {imp.imports?.length > 0 && (
                        <span className="ml-2">({imp.imports.join(', ')})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Exports */}
            {selectedFileInfo.exports && selectedFileInfo.exports.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Exports</h3>
                <div className="space-y-1">
                  {selectedFileInfo.exports.map((exp: any, index: number) => (
                    <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-mono">{exp.name}</span>
                      <span className="ml-2">({exp.type})</span>
                      {exp.isDefault && (
                        <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">default</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <File className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p>Select a file to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}