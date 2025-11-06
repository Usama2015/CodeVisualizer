# Visualization Components

This directory contains three interactive visualization components for the CodeVisualizer frontend:

## Components

### 1. DependencyGraph.tsx
An interactive node-based graph showing file dependencies.

**Features:**
- Interactive nodes with zoom/pan support
- Color-coded by file type (TypeScript, JavaScript, Python, etc.)
- Click on nodes to see file details
- Different edge colors for import types (import, require, include)
- Responsive design with legend

**Usage:**
```tsx
import { DependencyGraph } from '@/components/visualizations';

const data = {
  files: [
    {
      id: "1",
      name: "App.tsx",
      path: "/src/App.tsx",
      type: "typescript",
      size: 2048,
      complexity: 5
    }
  ],
  dependencies: [
    {
      from: "1",
      to: "2",
      type: "import"
    }
  ]
};

<DependencyGraph
  data={data}
  isLoading={false}
  error={null}
  onNodeClick={(node) => console.log('Node clicked:', node)}
/>
```

### 2. CallHierarchy.tsx
Shows function call relationships as an expandable tree.

**Features:**
- Expandable/collapsible tree structure
- Color-coded by complexity level
- Hover tooltips with function details
- Horizontal tree layout
- Async function indicators

**Usage:**
```tsx
import { CallHierarchy } from '@/components/visualizations';

const data = {
  functions: [
    {
      id: "1",
      name: "calculateTotal",
      filePath: "/src/utils.ts",
      lineNumber: 15,
      complexity: 3,
      parameters: ["items", "tax"],
      returnType: "number",
      isAsync: false,
      calls: [
        {
          id: "2",
          name: "validateItems",
          filePath: "/src/validation.ts",
          lineNumber: 8,
          complexity: 2,
          calls: []
        }
      ]
    }
  ]
};

<CallHierarchy
  data={data}
  isLoading={false}
  error={null}
  onNodeClick={(node) => console.log('Function clicked:', node)}
  onNodeHover={(node) => console.log('Function hovered:', node)}
/>
```

### 3. ComplexityHeatmap.tsx
Creates a heatmap grid showing file complexity metrics.

**Features:**
- Color intensity based on cyclomatic complexity
- Tooltip showing detailed metrics on hover
- Click to navigate to file analysis
- Responsive grid layout
- Detailed file information panel

**Usage:**
```tsx
import { ComplexityHeatmap } from '@/components/visualizations';

const data = {
  files: [
    {
      id: "1",
      name: "App.tsx",
      path: "/src/App.tsx",
      cyclomaticComplexity: 8,
      linesOfCode: 150,
      maintainabilityIndex: 75.5,
      technicalDebt: 2.5,
      category: "component"
    }
  ],
  maxComplexity: 15,
  avgComplexity: 6.2
};

<ComplexityHeatmap
  data={data}
  isLoading={false}
  error={null}
  onFileClick={(file) => console.log('File clicked:', file)}
  width={800}
  height={400}
/>
```

## Shared Types and Utilities

The `index.tsx` file exports:
- All components with default exports
- All TypeScript interfaces and types
- Color constants and helper functions
- Layout configuration constants
- Utility functions for color mapping

```tsx
import {
  DependencyGraph,
  CallHierarchy,
  ComplexityHeatmap,
  getFileTypeColor,
  getComplexityColor,
  VISUALIZATION_COLORS
} from '@/components/visualizations';
```

## Dependencies

The components use the following libraries:
- **reactflow**: For dependency graph visualization
- **react-d3-tree**: For call hierarchy tree visualization
- **d3**: For complexity heatmap and color scales

## Common Props

All components accept these common props:
- `isLoading?: boolean` - Shows loading state
- `error?: string | null` - Shows error state
- `data: T | null` - The visualization data (varies by component)

## Styling

Components use Tailwind CSS for styling and are designed to be responsive. They include:
- Loading states with spinners
- Error states with user-friendly messages
- Empty states when no data is available
- Interactive legends and tooltips
- Hover effects and visual feedback

## Integration

These components are designed to integrate with the CodeVisualizer backend analysis data. They handle loading, error, and empty states gracefully, making them suitable for real-world applications where data may be loading or unavailable.