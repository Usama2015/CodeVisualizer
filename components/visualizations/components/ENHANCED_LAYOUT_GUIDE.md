# Enhanced Dependency Graph Layout Implementation Guide

## Overview

The `EnhancedDependencyGraph` component provides five sophisticated layout algorithms for visualizing software dependency graphs. This guide explains how to use and extend the implementation.

## Component Structure

```
EnhancedDependencyGraph.tsx
├── LayoutEngine class - Core layout algorithms
├── EnhancedDependencyGraphContent - React component
└── EnhancedDependencyGraph - Provider wrapper
```

## Layout Algorithms

### 1. Layered Hierarchical (`layeredHierarchical()`)

**Purpose**: Creates a top-down hierarchy showing dependency flow

**Algorithm**:
1. Build adjacency lists and calculate in-degrees
2. Use Kahn's algorithm for topological sorting
3. Create layers based on dependency distance
4. Center-align nodes within each layer
5. Handle circular dependencies by placing in final layer

**Customization Parameters**:
```typescript
const NODE_WIDTH = 180;      // Horizontal space per node
const NODE_HEIGHT = 100;     // Vertical space per node
const LAYER_SPACING = 300;   // Distance between layers
const NODE_SPACING = 200;    // Distance between nodes in same layer
```

### 2. Cluster-Based (`clusterBased()`)

**Purpose**: Groups related components and separates concerns

**Algorithm**:
1. Detect clusters using `detectClusters()` and `expandCluster()`
2. Group unclustered nodes together
3. Arrange clusters in a grid pattern
4. Position nodes within clusters in circular arrangements

**Cluster Detection Logic**:
- Files with same language/type
- High connection density (>30% internal connections)
- Iterative expansion until convergence

**Customization Parameters**:
```typescript
const CLUSTER_SPACING = 400;  // Distance between cluster centers
const NODE_SPACING = 150;     // Distance between nodes in cluster
const threshold = 0.3;        // 30% internal connection threshold
```

### 3. Radial/Circular (`radialCircular()`)

**Purpose**: Shows centrality and dependency distance from core components

**Algorithm**:
1. Select center node (highest importance score)
2. Use BFS to calculate distance rings from center
3. Distribute nodes evenly around each ring
4. Scale ring radius based on node count

**Ring Calculation**:
```typescript
const angle = (2 * Math.PI * nodeIndex) / ringNodes.length;
const radius = ring * 200 + 150;  // Base radius + ring spacing
```

### 4. Grid-Based (`gridBased()`)

**Purpose**: Provides maximum organization and consistency

**Algorithm**:
1. Group nodes by file type/language
2. Sort groups by size (largest first)
3. Calculate grid dimensions for each group
4. Position groups to minimize total layout area
5. Arrange nodes within groups in square grids

**Grid Layout Logic**:
```typescript
const cols = Math.ceil(Math.sqrt(groupNodes.length));
const rows = Math.ceil(groupNodes.length / cols);
```

### 5. Force-Directed with Constraints (`forceDirectedConstrained()`)

**Purpose**: Natural positioning with structural constraints

**Algorithm**:
1. Start with layered hierarchical positions
2. Apply iterative force simulation:
   - Repulsive forces between all nodes
   - Attractive forces for connected nodes
   - Temperature-based cooling
3. Converge to stable positions

**Force Parameters**:
```typescript
const ITERATIONS = 50;           // Simulation steps
const COOLING_FACTOR = 0.95;     // Temperature reduction per iteration
const repulsion = 10000 / (distance * distance);  // Repulsive force
const attraction = distance * 0.01;               // Attractive force
```

## Usage Examples

### Basic Usage

```typescript
import EnhancedDependencyGraph from './components/EnhancedDependencyGraph';

<EnhancedDependencyGraph
  data={analysisResult}
  className="h-full"
/>
```

### With Custom Styling

```typescript
<div className="dependency-graph-container">
  <EnhancedDependencyGraph
    data={analysisResult}
    className="h-screen bg-white dark:bg-gray-900"
  />
</div>
```

## Extending the Implementation

### Adding a New Layout Algorithm

1. **Add to LayoutEngine class**:
```typescript
myCustomLayout(): any[] {
  // Your algorithm here
  return this.nodes.map(node => ({
    ...node,
    position: { x: calculateX(node), y: calculateY(node) }
  }));
}
```

2. **Update the layout type**:
```typescript
type LayoutType = 'layered' | 'cluster' | 'radial' | 'grid' | 'force' | 'myCustom';
```

3. **Add to switch statement**:
```typescript
case 'myCustom':
  positions = layoutEngine.myCustomLayout();
  break;
```

4. **Add control button**:
```typescript
{ key: 'myCustom', label: 'My Custom Layout' }
```

### Customizing Node Appearance

```typescript
const getNodeColor = (complexity: number) => {
  // Your color logic here
  return complexity > 10 ? '#ff0000' : '#00ff00';
};

const getNodeSize = (importance: number) => {
  // Your sizing logic here
  return Math.max(100, importance * 5);
};
```

### Customizing Edge Appearance

```typescript
style: {
  stroke: edge.weight > 5 ? '#ef4444' : '#6b7280',
  strokeWidth: Math.max(1, edge.weight),
  strokeDasharray: edge.type === 'dynamic_import' ? '5,5' : undefined
}
```

## Performance Optimization

### For Large Graphs (>500 nodes)

1. **Enable virtualization**:
```typescript
// Add to ReactFlow props
onlyRenderVisibleElements={true}
```

2. **Optimize force algorithm**:
```typescript
// Reduce iterations for large graphs
const ITERATIONS = Math.max(10, 100 - nodes.length / 10);
```

3. **Implement level-of-detail**:
```typescript
const showLabels = zoom > 0.5;
const showComplexEdges = nodes.length < 100;
```

### Memory Management

1. **Memoize expensive calculations**:
```typescript
const expensiveLayout = useMemo(() =>
  layoutEngine.forceDirectedConstrained(),
  [data.dependencies.nodes, layoutType]
);
```

2. **Debounce viewport updates**:
```typescript
const debouncedViewportUpdate = useCallback(
  debounce(() => {
    setZoom(zoom);
    setCenter({ x, y });
  }, 100),
  [setZoom, setCenter]
);
```

## Debugging and Troubleshooting

### Common Issues

1. **Nodes overlapping**: Increase spacing parameters
2. **Performance issues**: Reduce iteration count or enable virtualization
3. **Circular dependency layout problems**: Check cluster detection logic
4. **Edge crossings**: Consider different layout or edge routing

### Debug Information

Add debug panels to visualize algorithm decisions:

```typescript
{process.env.NODE_ENV === 'development' && (
  <Panel position="bottom-center" className="bg-yellow-100 p-2">
    <pre className="text-xs">
      {JSON.stringify({
        layoutType,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        clusters: layoutEngine.clusters.size
      }, null, 2)}
    </pre>
  </Panel>
)}
```

## Testing Layout Algorithms

### Unit Tests

```typescript
describe('LayoutEngine', () => {
  it('should create hierarchical layers correctly', () => {
    const engine = new LayoutEngine(testNodes, testEdges);
    const result = engine.layeredHierarchical();
    expect(result[0].position.y).toBeLessThan(result[1].position.y);
  });
});
```

### Visual Testing

Use screenshot testing for layout consistency:

```typescript
test('layout produces consistent results', async () => {
  const component = render(<EnhancedDependencyGraph data={testData} />);
  await expect(component).toMatchSnapshot();
});
```

## Best Practices

1. **Always provide fallbacks** for edge cases
2. **Test with various graph sizes** (small, medium, large)
3. **Consider user interaction patterns** when positioning elements
4. **Optimize for the most common use case** (typically layered hierarchical)
5. **Provide clear visual feedback** during layout calculations
6. **Maintain consistency** in node sizing and coloring across layouts