'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { OrbitControls, Text, Box, Line, Html, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { AnalysisResult } from '@/shared/types/analysis';
import { useVisualization } from '../core/VisualizationProvider';

// Service Node Component - Rectangular boxes like in PDF
interface ServiceNodeProps {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  label: string;
  type: 'service' | 'class' | 'method';
  onClick?: () => void;
  isSelected?: boolean;
  codeSnippet?: string;
}

function ServiceNode({ position, size, color, label, type, onClick, isSelected, codeSnippet }: ServiceNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [showCode, setShowCode] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      if (hovered || isSelected) {
        meshRef.current.scale.setScalar(1.05);
      } else {
        meshRef.current.scale.setScalar(1);
      }
    }
  });

  const handleClick = () => {
    setShowCode(!showCode);
    onClick?.();
  };

  return (
    <group position={position}>
      <Box
        ref={meshRef}
        args={size}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={color}
          transparent
          opacity={isSelected ? 1 : 0.8}
          emissive={color}
          emissiveIntensity={hovered ? 0.3 : 0.1}
        />
      </Box>

      {/* Label */}
      <Billboard>
        <Text
          position={[0, size[1] / 2 + 0.3, 0]}
          fontSize={0.25}
          color="white"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          {label}
        </Text>
      </Billboard>

      {/* Type indicator */}
      <Billboard>
        <Text
          position={[0, -size[1] / 2 - 0.2, 0]}
          fontSize={0.15}
          color="#aaa"
          anchorX="center"
          anchorY="middle"
        >
          {type}
        </Text>
      </Billboard>

      {/* Code Snippet Overlay - like in PDF */}
      {showCode && codeSnippet && (
        <Html
          position={[size[0] / 2 + 2, 0, 0]}
          style={{
            background: '#FFE082',
            padding: '10px',
            borderRadius: '5px',
            fontFamily: 'monospace',
            fontSize: '10px',
            whiteSpace: 'pre',
            maxWidth: '300px',
            overflow: 'auto',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            border: '1px solid #FFD54F'
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Entry Point</div>
          <code>{codeSnippet}</code>
        </Html>
      )}
    </group>
  );
}

// Flow Connection Component - Curved arrows between nodes
interface FlowConnectionProps {
  start: [number, number, number];
  end: [number, number, number];
  label?: string;
  animated?: boolean;
  color?: string;
}

function FlowConnection({ start, end, label, animated = false, color = '#4FC3F7' }: FlowConnectionProps) {
  const lineRef = useRef<any>(null);

  const points = useMemo(() => {
    const midPoint: [number, number, number] = [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2 + 1,
      (start[2] + end[2]) / 2
    ];

    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...start),
      new THREE.Vector3(...midPoint),
      new THREE.Vector3(...end)
    );

    return curve.getPoints(30);
  }, [start, end]);

  useFrame((state) => {
    if (animated && lineRef.current) {
      lineRef.current.material.dashOffset = -state.clock.elapsedTime * 2;
    }
  });

  return (
    <>
      <Line
        ref={lineRef}
        points={points}
        color={color}
        lineWidth={2}
        dashed={animated}
        dashScale={50}
        dashSize={1}
        dashOffset={0}
        gapSize={0.5}
      />
      {label && (
        <Billboard position={[(start[0] + end[0]) / 2, (start[1] + end[1]) / 2 + 0.5, (start[2] + end[2]) / 2]}>
          <Text fontSize={0.15} color="#FFB74D">
            {label}
          </Text>
        </Billboard>
      )}
    </>
  );
}

// Main Service Map Component
interface ServiceMap3DProps {
  data: AnalysisResult;
  className?: string;
}

export default function ServiceMap3D({ data, className }: ServiceMap3DProps) {
  const { state, selectNode, deselectNode } = useVisualization();
  const [viewMode, setViewMode] = useState<'architecture' | 'flow' | 'detailed'>('architecture');

  // Generate service architecture layout
  const { nodes, connections } = useMemo(() => {
    const services = new Map<string, any>();
    const connections: any[] = [];

    // Group files by directory (services)
    const directories = new Map<string, any[]>();

    data.analysis.files.forEach(file => {
      const parts = file.path.split('/');
      const dir = parts.length > 1 ? parts[0] : 'root';

      if (!directories.has(dir)) {
        directories.set(dir, []);
      }
      directories.get(dir)?.push(file);
    });

    // Create service nodes
    let xPos = -5;
    let yPos = 0;
    const nodePositions = new Map<string, [number, number, number]>();

    directories.forEach((files, dir) => {
      const position: [number, number, number] = [xPos, yPos, 0];

      services.set(dir, {
        id: dir,
        label: dir,
        position,
        size: [2, 1.5, 0.5] as [number, number, number],
        color: '#2196F3',
        type: 'service' as const,
        files,
        codeSnippet: files[0]?.functions?.[0]?.code || 'No code available'
      });

      nodePositions.set(dir, position);

      xPos += 3;
      if (xPos > 5) {
        xPos = -5;
        yPos -= 3;
      }
    });

    // Create connections based on imports
    data.dependencies.edges.forEach(edge => {
      const sourceFile = data.analysis.files.find(f => f.path === edge.source);
      const targetFile = data.analysis.files.find(f => f.path === edge.target);

      if (sourceFile && targetFile) {
        const sourceDir = sourceFile.path.split('/')[0] || 'root';
        const targetDir = targetFile.path.split('/')[0] || 'root';

        if (sourceDir !== targetDir) {
          const sourcePos = nodePositions.get(sourceDir);
          const targetPos = nodePositions.get(targetDir);

          if (sourcePos && targetPos) {
            connections.push({
              id: `${sourceDir}-${targetDir}`,
              start: sourcePos,
              end: targetPos,
              label: edge.imports[0] || 'import',
              animated: true
            });
          }
        }
      }
    });

    // Add class and method nodes in detailed view
    if (viewMode === 'detailed') {
      data.analysis.files.forEach(file => {
        const dir = file.path.split('/')[0] || 'root';
        const basePos = nodePositions.get(dir);

        if (basePos) {
          // Add classes
          file.classes?.forEach((cls, idx) => {
            const classPos: [number, number, number] = [
              basePos[0] + 1,
              basePos[1] - 1 - idx * 0.8,
              basePos[2] + 1
            ];

            services.set(`${dir}-${cls.name}`, {
              id: `${dir}-${cls.name}`,
              label: cls.name,
              position: classPos,
              size: [1.5, 0.8, 0.3] as [number, number, number],
              color: '#4CAF50',
              type: 'class' as const,
              codeSnippet: cls.code
            });

            // Connect to parent service
            connections.push({
              id: `${dir}-to-${cls.name}`,
              start: basePos,
              end: classPos,
              label: 'contains'
            });
          });

          // Add methods
          file.functions?.forEach((func, idx) => {
            const funcPos: [number, number, number] = [
              basePos[0] - 1,
              basePos[1] - 1 - idx * 0.6,
              basePos[2] + 1
            ];

            services.set(`${dir}-${func.name}`, {
              id: `${dir}-${func.name}`,
              label: func.name,
              position: funcPos,
              size: [1.2, 0.6, 0.2] as [number, number, number],
              color: '#FF9800',
              type: 'method' as const,
              codeSnippet: func.code
            });

            // Connect to parent service
            connections.push({
              id: `${dir}-to-${func.name}`,
              start: basePos,
              end: funcPos,
              label: 'method'
            });
          });
        }
      });
    }

    return { nodes: Array.from(services.values()), connections };
  }, [data, viewMode]);

  return (
    <div className={`w-full h-full relative ${className || ''}`}>
      {/* View Mode Selector */}
      <div className="absolute top-4 left-4 z-10 bg-gray-900 bg-opacity-90 p-2 rounded-lg">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('architecture')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'architecture' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            Service Map
          </button>
          <button
            onClick={() => setViewMode('flow')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'flow' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            Flows
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'detailed' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            Detailed
          </button>
        </div>
      </div>

      <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />

        {/* Render connections */}
        {connections.map(conn => (
          <FlowConnection
            key={conn.id}
            start={conn.start}
            end={conn.end}
            label={conn.label}
            animated={conn.animated}
          />
        ))}

        {/* Render service nodes */}
        {nodes.map(node => (
          <ServiceNode
            key={node.id}
            position={node.position}
            size={node.size}
            color={node.color}
            label={node.label}
            type={node.type}
            codeSnippet={node.codeSnippet}
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
          autoRotate={false}
        />

        <gridHelper args={[30, 30, '#444', '#222']} />
      </Canvas>

      {/* Info Panel */}
      <div className="absolute bottom-4 right-4 bg-gray-900 bg-opacity-90 p-4 rounded-lg text-white text-sm max-w-xs">
        <h4 className="font-semibold mb-2">Service Architecture</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500"></div>
            <span>Services/Modules</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500"></div>
            <span>Classes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500"></div>
            <span>Methods</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-xs">Click nodes to see code</p>
          <p className="text-xs">Drag to rotate view</p>
        </div>
      </div>
    </div>
  );
}