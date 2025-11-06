'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { AnalysisResult } from '@/shared/types/analysis';

interface VisualizationState {
  data: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  selectedNodes: string[];
  hoveredNode: string | null;
  layout: 'force' | 'hierarchical' | 'circular' | 'tree';
  theme: 'light' | 'dark';
  filters: {
    fileTypes: string[];
    minComplexity: number;
    maxComplexity: number;
    searchQuery: string;
  };
  zoom: number;
  center: { x: number; y: number };
}

type VisualizationAction =
  | { type: 'SET_DATA'; payload: AnalysisResult }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SELECT_NODE'; payload: string }
  | { type: 'DESELECT_NODE'; payload: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_HOVERED_NODE'; payload: string | null }
  | { type: 'SET_LAYOUT'; payload: VisualizationState['layout'] }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_FILTERS'; payload: Partial<VisualizationState['filters']> }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_CENTER'; payload: { x: number; y: number } };

const initialState: VisualizationState = {
  data: null,
  loading: false,
  error: null,
  selectedNodes: [],
  hoveredNode: null,
  layout: 'force',
  theme: 'light',
  filters: {
    fileTypes: [],
    minComplexity: 0,
    maxComplexity: 100,
    searchQuery: ''
  },
  zoom: 1,
  center: { x: 0, y: 0 }
};

const visualizationReducer = (
  state: VisualizationState,
  action: VisualizationAction
): VisualizationState => {
  switch (action.type) {
    case 'SET_DATA':
      return { ...state, data: action.payload, loading: false, error: null };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SELECT_NODE':
      return {
        ...state,
        selectedNodes: state.selectedNodes.includes(action.payload)
          ? state.selectedNodes
          : [...state.selectedNodes, action.payload]
      };
    case 'DESELECT_NODE':
      return {
        ...state,
        selectedNodes: state.selectedNodes.filter(id => id !== action.payload)
      };
    case 'CLEAR_SELECTION':
      return { ...state, selectedNodes: [] };
    case 'SET_HOVERED_NODE':
      return { ...state, hoveredNode: action.payload };
    case 'SET_LAYOUT':
      return { ...state, layout: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case 'SET_ZOOM':
      return { ...state, zoom: action.payload };
    case 'SET_CENTER':
      return { ...state, center: action.payload };
    default:
      return state;
  }
};

interface VisualizationContextType {
  state: VisualizationState;
  dispatch: React.Dispatch<VisualizationAction>;
  loadAnalysis: (analysisId: string) => Promise<void>;
  selectNode: (nodeId: string) => void;
  deselectNode: (nodeId: string) => void;
  clearSelection: () => void;
  setHoveredNode: (nodeId: string | null) => void;
  setLayout: (layout: VisualizationState['layout']) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setFilters: (filters: Partial<VisualizationState['filters']>) => void;
  setZoom: (zoom: number) => void;
  setCenter: (center: { x: number; y: number }) => void;
}

const VisualizationContext = createContext<VisualizationContextType | undefined>(undefined);

export const useVisualization = () => {
  const context = useContext(VisualizationContext);
  if (!context) {
    throw new Error('useVisualization must be used within VisualizationProvider');
  }
  return context;
};

interface VisualizationProviderProps {
  children: React.ReactNode;
  analysisId?: string;
}

export const VisualizationProvider: React.FC<VisualizationProviderProps> = ({
  children,
  analysisId
}) => {
  const [state, dispatch] = useReducer(visualizationReducer, initialState);

  const loadAnalysis = useCallback(async (id: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/analysis/${id}`);
      if (!response.ok) {
        throw new Error('Failed to load analysis');
      }
      const data = await response.json();
      dispatch({ type: 'SET_DATA', payload: data });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
    }
  }, []);

  const selectNode = useCallback((nodeId: string) => {
    dispatch({ type: 'SELECT_NODE', payload: nodeId });
  }, []);

  const deselectNode = useCallback((nodeId: string) => {
    dispatch({ type: 'DESELECT_NODE', payload: nodeId });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  const setHoveredNode = useCallback((nodeId: string | null) => {
    dispatch({ type: 'SET_HOVERED_NODE', payload: nodeId });
  }, []);

  const setLayout = useCallback((layout: VisualizationState['layout']) => {
    dispatch({ type: 'SET_LAYOUT', payload: layout });
  }, []);

  const setTheme = useCallback((theme: 'light' | 'dark') => {
    dispatch({ type: 'SET_THEME', payload: theme });
  }, []);

  const setFilters = useCallback((filters: Partial<VisualizationState['filters']>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const setZoom = useCallback((zoom: number) => {
    dispatch({ type: 'SET_ZOOM', payload: zoom });
  }, []);

  const setCenter = useCallback((center: { x: number; y: number }) => {
    dispatch({ type: 'SET_CENTER', payload: center });
  }, []);

  // Load analysis on mount if ID is provided
  useEffect(() => {
    if (analysisId) {
      loadAnalysis(analysisId);
    }
  }, [analysisId, loadAnalysis]);

  // Apply theme to document
  useEffect(() => {
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.theme]);

  const value = {
    state,
    dispatch,
    loadAnalysis,
    selectNode,
    deselectNode,
    clearSelection,
    setHoveredNode,
    setLayout,
    setTheme,
    setFilters,
    setZoom,
    setCenter
  };

  return (
    <VisualizationContext.Provider value={value}>
      {children}
    </VisualizationContext.Provider>
  );
};