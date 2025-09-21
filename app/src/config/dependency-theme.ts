import React, { createContext } from 'react';

/**
 * Dependency Theme Configuration
 * Provides theming configuration for dependency visualization and related components
 */

export interface DependencyThemeConfig {
  colors: {
    // Node types
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    
    // Dependency relationships
    dependsOn: string;
    dependedBy: string;
    bidirectional: string;
    
    // States
    active: string;
    inactive: string;
    pending: string;
    
    // Background and borders
    background: string;
    border: string;
    text: string;
  };
  
  graph: {
    // Node styling
    nodeRadius: number;
    nodeStrokeWidth: number;
    
    // Edge styling
    linkStrokeWidth: number;
    linkOpacity: number;
    
    // Layout settings
    forceStrength: number;
    distanceMultiplier: number;
  };
  
  // Environment-specific settings
  environment: {
    name: string;
    debugMode: boolean;
    performanceMode: boolean;
  };
}

/**
 * Light theme configuration for dependencies
 */
const lightDependencyTheme: DependencyThemeConfig = {
  colors: {
    primary: '#1976d2',
    secondary: '#dc004e',
    success: '#2e7d32',
    warning: '#ed6c02',
    error: '#d32f2f',
    info: '#0288d1',
    
    dependsOn: '#1976d2',
    dependedBy: '#388e3c',
    bidirectional: '#7b1fa2',
    
    active: '#4caf50',
    inactive: '#9e9e9e',
    pending: '#ff9800',
    
    background: '#fafafa',
    border: '#e0e0e0',
    text: '#333333',
  },
  
  graph: {
    nodeRadius: 8,
    nodeStrokeWidth: 2,
    linkStrokeWidth: 1.5,
    linkOpacity: 0.7,
    forceStrength: -300,
    distanceMultiplier: 1.2,
  },
  
  environment: {
    name: 'light',
    debugMode: false,
    performanceMode: false,
  },
};

/**
 * Dark theme configuration for dependencies
 */
const darkDependencyTheme: DependencyThemeConfig = {
  colors: {
    primary: '#90caf9',
    secondary: '#f48fb1',
    success: '#66bb6a',
    warning: '#ffb74d',
    error: '#f44336',
    info: '#29b6f6',
    
    dependsOn: '#90caf9',
    dependedBy: '#81c784',
    bidirectional: '#ba68c8',
    
    active: '#66bb6a',
    inactive: '#757575',
    pending: '#ffb74d',
    
    background: '#121212',
    border: '#424242',
    text: '#ffffff',
  },
  
  graph: {
    nodeRadius: 8,
    nodeStrokeWidth: 2,
    linkStrokeWidth: 1.5,
    linkOpacity: 0.8,
    forceStrength: -300,
    distanceMultiplier: 1.2,
  },
  
  environment: {
    name: 'dark',
    debugMode: false,
    performanceMode: false,
  },
};

/**
 * Development theme configuration with enhanced debugging
 */
const developmentDependencyTheme: DependencyThemeConfig = {
  ...lightDependencyTheme,
  colors: {
    ...lightDependencyTheme.colors,
    // More vibrant colors for development
    primary: '#1565c0',
    dependsOn: '#1565c0',
    dependedBy: '#2e7d32',
    bidirectional: '#6a1b9a',
  },
  graph: {
    ...lightDependencyTheme.graph,
    // Slightly larger nodes for better visibility during development
    nodeRadius: 10,
    nodeStrokeWidth: 2.5,
    linkStrokeWidth: 2,
  },
  environment: {
    name: 'development',
    debugMode: true,
    performanceMode: false,
  },
};

/**
 * Production theme configuration with performance optimizations
 */
const productionDependencyTheme: DependencyThemeConfig = {
  ...lightDependencyTheme,
  graph: {
    ...lightDependencyTheme.graph,
    // Optimized for performance
    nodeRadius: 6,
    nodeStrokeWidth: 1,
    linkStrokeWidth: 1,
    linkOpacity: 0.6,
    forceStrength: -200,
    distanceMultiplier: 1.0,
  },
  environment: {
    name: 'production',
    debugMode: false,
    performanceMode: true,
  },
};

/**
 * Get environment-specific dependency theme configuration
 */
export function getEnvironmentTheme(): DependencyThemeConfig {
  const env = import.meta.env.MODE || 'development';
  const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Check localStorage for saved theme preference
  const savedTheme = localStorage.getItem('yakui-dark-mode');
  const prefersDark = savedTheme ? JSON.parse(savedTheme) : isDark;
  
  let theme: DependencyThemeConfig;
  
  switch (env) {
    case 'development':
      theme = developmentDependencyTheme;
      break;
    case 'production':
      theme = productionDependencyTheme;
      break;
    case 'test':
      theme = lightDependencyTheme;
      break;
    default:
      theme = lightDependencyTheme;
  }
  
  // Apply dark theme colors if preferred
  if (prefersDark) {
    theme = {
      ...theme,
      colors: darkDependencyTheme.colors,
      environment: {
        ...theme.environment,
        name: `${theme.environment.name}-dark`,
      },
    };
  }
  
  return theme;
}

/**
 * React context for dependency theme configuration
 */
export const DependencyThemeContext = createContext<DependencyThemeConfig>(
  getEnvironmentTheme()
);

/**
 * Hook to use dependency theme context
 */
export const useDependencyTheme = (): DependencyThemeConfig => {
  return React.useContext(DependencyThemeContext);
};

/**
 * Default export for convenience
 */
export default {
  DependencyThemeContext,
  getEnvironmentTheme,
  useDependencyTheme,
  lightDependencyTheme,
  darkDependencyTheme,
  developmentDependencyTheme,
  productionDependencyTheme,
};