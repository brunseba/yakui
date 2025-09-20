import { DependencyType } from '../services/dependency-analyzer';

// Theme configuration interface
export interface DependencyTheme {
  colors: Record<DependencyType, string>;
  icons: Record<string, string>;
  nodeSize: { width: number; height: number };
  graphHeight: number;
  statusColors: Record<string, string>;
}

// Default theme
export const defaultDependencyTheme: DependencyTheme = {
  colors: {
    owner: '#ff6b6b',        // Red for ownership
    volume: '#4ecdc4',       // Teal for volumes  
    serviceAccount: '#45b7d1', // Blue for service accounts
    selector: '#96ceb4',     // Green for selectors
    service: '#ffa726',      // Orange for services
    network: '#ba68c8',      // Purple for networking
    custom: '#78909c',       // Gray for custom
    configMap: '#66bb6a',    // Green for ConfigMaps
    secret: '#ef5350',       // Red for Secrets
    environment: '#29b6f6',  // Light blue for environment variables
    imagePullSecret: '#ab47bc', // Purple for image pull secrets
    scheduling: '#ffca28'     // Yellow for scheduling
  },
  icons: {
    pod: '🚀',
    service: '🌐', 
    deployment: '📦',
    configmap: '⚙️',
    secret: '🔐',
    persistentvolumeclaim: '💾',
    persistentvolume: '💾',
    namespace: '🏷️',
    node: '🖥️',
    serviceaccount: '👤',
    role: '🛡️',
    clusterrole: '🛡️',
    ingress: '🌍',
    replicaset: '📋',
    daemonset: '⚡',
    statefulset: '🗃️',
    job: '⚙️',
    cronjob: '⏰',
    unknown: '📋'
  },
  nodeSize: {
    width: 250,
    height: 150
  },
  graphHeight: 600,
  statusColors: {
    running: '#4caf50',
    failed: '#f44336', 
    error: '#f44336',
    pending: '#ff9800',
    default: '#9e9e9e'
  }
};

// Theme context for React components
import { createContext, useContext } from 'react';

export const DependencyThemeContext = createContext<DependencyTheme>(defaultDependencyTheme);

export const useDependencyTheme = () => {
  return useContext(DependencyThemeContext);
};

// Environment-based theme overrides
export const getEnvironmentTheme = (): DependencyTheme => {
  const theme = { ...defaultDependencyTheme };
  
  // Override colors from environment if provided
  if (import.meta.env.VITE_DEPENDENCY_THEME_COLORS) {
    try {
      const colorOverrides = JSON.parse(import.meta.env.VITE_DEPENDENCY_THEME_COLORS);
      theme.colors = { ...theme.colors, ...colorOverrides };
    } catch (error) {
      console.warn('Invalid VITE_DEPENDENCY_THEME_COLORS format, using defaults:', error);
    }
  }
  
  // Override node dimensions from environment
  if (import.meta.env.VITE_DEPENDENCY_NODE_WIDTH) {
    theme.nodeSize.width = parseInt(import.meta.env.VITE_DEPENDENCY_NODE_WIDTH);
  }
  if (import.meta.env.VITE_DEPENDENCY_NODE_HEIGHT) {
    theme.nodeSize.height = parseInt(import.meta.env.VITE_DEPENDENCY_NODE_HEIGHT);
  }
  if (import.meta.env.VITE_DEPENDENCY_GRAPH_HEIGHT) {
    theme.graphHeight = parseInt(import.meta.env.VITE_DEPENDENCY_GRAPH_HEIGHT);
  }
  
  return theme;
};