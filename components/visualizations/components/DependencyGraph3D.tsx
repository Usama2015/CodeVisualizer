'use client';

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Line, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { AnalysisResult } from '@/shared/types/analysis';
import { useVisualization } from '../core/VisualizationProvider';

interface NodeProps {
  position: [number, number, number];
  color: string;
  label: string;
  size: number;
  onClick?: () => void;
  isSelected?: boolean;
  complexity?: number;
}

function Node({ position, color, label, size, onClick, isSelected, complexity = 0 }: NodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      if (hovered || isSelected) {
        meshRef.current.scale.setScalar(size * 1.2);
      } else {
        meshRef.current.scale.setScalar(size);
      }
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.5 : 0.2}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>
      <Billboard>
        <Text
          position={[0, size + 0.5, 0]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      </Billboard>
      {(hovered || isSelected) && (
        <Billboard>
          <Text
            position={[0, -(size + 0.5), 0]}
            fontSize={0.2}
            color="#aaa"
            anchorX="center"
            anchorY="middle"
          >
            Complexity: {complexity}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

interface EdgeProps {
  start: [number, number, number];
  end: [number, number, number];
  color?: string;
  weight?: number;
}

function Edge({ start, end, color = '#666', weight = 1 }: EdgeProps) {
  const points = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(...start),
      new THREE.Vector3(
        (start[0] + end[0]) / 2,
        (start[1] + end[1]) / 2 + 2,
        (start[2] + end[2]) / 2
      ),
      new THREE.Vector3(...end)
    ]);
    return curve.getPoints(50);
  }, [start, end]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={weight}
      opacity={0.6}
      transparent
    />
  );
}

interface DependencyGraph3DProps {
  data: AnalysisResult;
  className?: string;
}

export default function DependencyGraph3D({ data, className }: DependencyGraph3DProps) {
  const { state, selectNode, deselectNode } = useVisualization();

  const getNodeColor = (complexity: number) => {
    if (complexity > 20) return '#ef4444'; // red - high complexity
    if (complexity > 10) return '#f59e0b'; // amber - medium complexity
    if (complexity > 5) return '#3b82f6'; // blue - moderate complexity
    return '#10b981'; // green - low complexity
  };

  const getNodeSize = (importance: number) => {
    // Make nodes bigger and more consistent
    return Math.max(0.8, 0.8 + (importance * 0.1));
  };

  const { nodes, edges } = useMemo(() => {
    const nodePositions = new Map<string, [number, number, number]>();
    // Dynamic radius based on number of nodes to prevent overlapping
    const nodeCount = data.dependencies.nodes.length;
    const radius = Math.max(15, nodeCount * 0.8); // Scale radius with node count
    const layers = Math.max(3, Math.ceil(nodeCount / 20)); // More layers for more nodes

    // Create nodes with 3D positions
    const nodesData = data.dependencies.nodes.map((node, index) => {
      const theta = (index / data.dependencies.nodes.length) * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      const layer = index % layers;
      const r = radius * (0.7 + layer * 0.3);

      const x = r * Math.cos(theta) * Math.cos(phi);
      const y = r * Math.sin(phi);
      const z = r * Math.sin(theta) * Math.cos(phi);

      const position: [number, number, number] = [x, y, z];
      nodePositions.set(node.id, position);

      return {
        id: node.id,
        position,
        color: getNodeColor(node.complexity),
        label: node.name.length > 12 ? node.name.substring(0, 12) + '...' : node.name,
        size: getNodeSize(node.importance),
        complexity: node.complexity
      };
    });

    // Create edges
    const edgesData = data.dependencies.edges.map(edge => ({
      id: `${edge.source}-${edge.target}`,
      start: nodePositions.get(edge.source) || [0, 0, 0],
      end: nodePositions.get(edge.target) || [0, 0, 0],
      weight: edge.weight || 1
    }));

    return { nodes: nodesData, edges: edgesData };
  }, [data]);

  return (
    <div className={`w-full h-full ${className || ''}`}>
      <Canvas camera={{ position: [15, 10, 15], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />

        {/* Render edges */}
        {edges.map(edge => (
          <Edge
            key={edge.id}
            start={edge.start}
            end={edge.end}
            weight={edge.weight}
          />
        ))}

        {/* Render nodes */}
        {nodes.map(node => (
          <Node
            key={node.id}
            position={node.position}
            color={node.color}
            label={node.label}
            size={node.size}
            complexity={node.complexity}
            isSelected={state.selectedNodes.includes(node.id)}
            onClick={() => {
              if (state.selectedNodes.includes(node.id)) {
                deselectNode(node.id);
              } else {
                selectNode(node.id);
              }
            }}
          />
        ))}

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          autoRotate={true}
          autoRotateSpeed={0.5}
        />

        {/* Grid helper */}
        <gridHelper args={[30, 30, '#444', '#222']} />
      </Canvas>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-gray-900 bg-opacity-90 p-4 rounded-lg text-white text-sm">
        <h4 className="font-semibold mb-2">Complexity Legend</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Low (≤5)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Moderate (5-10)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span>Medium (10-20)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>High (&gt;20)</span>
          </div>
        </div>
      </div>

      {/* Controls info */}
      <div className="absolute top-4 right-4 bg-gray-900 bg-opacity-90 p-3 rounded-lg text-white text-xs">
        <div>🖱️ Drag to rotate</div>
        <div>📜 Scroll to zoom</div>
        <div>🎯 Click nodes to select</div>
      </div>
    </div>
  );
}