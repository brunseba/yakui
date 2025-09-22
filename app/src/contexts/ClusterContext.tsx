import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import {
  ClusterContextValue,
  ClusterContextState,
  ClusterConnection,
  ClusterConfig,
  ClusterAuth,
  AddClusterRequest,
  UpdateClusterRequest,
  ClusterSwitchEvent
} from '../types/cluster';
import { backendClusterService } from '../services/backendClusterService';

// Action types
type ClusterAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | undefined }
  | { type: 'SET_CLUSTERS'; payload: ClusterConnection[] }
  | { type: 'SET_CURRENT_CLUSTER'; payload: ClusterConnection | undefined }
  | { type: 'ADD_CLUSTER'; payload: ClusterConnection }
  | { type: 'UPDATE_CLUSTER'; payload: { id: string; cluster: ClusterConnection } }
  | { type: 'REMOVE_CLUSTER'; payload: string }
  | { type: 'UPDATE_CLUSTER_STATUS'; payload: { id: string; status: any } };

// Initial state
const initialState: ClusterContextState = {
  clusters: [],
  currentCluster: undefined,
  isLoading: false,
  error: undefined,
};

// Reducer
function clusterReducer(state: ClusterContextState, action: ClusterAction): ClusterContextState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'SET_CLUSTERS':
      return { ...state, clusters: action.payload, isLoading: false, error: undefined };
    
    case 'SET_CURRENT_CLUSTER':
      return { ...state, currentCluster: action.payload };
    
    case 'ADD_CLUSTER':
      return { 
        ...state, 
        clusters: [...state.clusters, action.payload],
        error: undefined 
      };
    
    case 'UPDATE_CLUSTER':
      return {
        ...state,
        clusters: state.clusters.map(cluster =>
          cluster.config.id === action.payload.id ? action.payload.cluster : cluster
        ),
        currentCluster: state.currentCluster?.config.id === action.payload.id 
          ? action.payload.cluster 
          : state.currentCluster,
        error: undefined
      };
    
    case 'REMOVE_CLUSTER':
      const remainingClusters = state.clusters.filter(cluster => cluster.config.id !== action.payload);
      return {
        ...state,
        clusters: remainingClusters,
        currentCluster: state.currentCluster?.config.id === action.payload 
          ? (remainingClusters.length > 0 ? remainingClusters[0] : undefined)
          : state.currentCluster,
        error: undefined
      };
    
    case 'UPDATE_CLUSTER_STATUS':
      return {
        ...state,
        clusters: state.clusters.map(cluster =>
          cluster.config.id === action.payload.id
            ? { ...cluster, status: action.payload.status }
            : cluster
        ),
        currentCluster: state.currentCluster?.config.id === action.payload.id
          ? { ...state.currentCluster, status: action.payload.status }
          : state.currentCluster,
      };
    
    default:
      return state;
  }
}

// Create context
const ClusterContext = createContext<ClusterContextValue | undefined>(undefined);

// Event emitter for cluster switch events
const emitClusterSwitchEvent = (event: ClusterSwitchEvent) => {
  // In a real app, this could emit to an event bus or analytics
  console.log('Cluster switched:', event);
  
  // Emit custom event for other parts of the app to listen to
  const customEvent = new CustomEvent('cluster-switch', { detail: event });
  window.dispatchEvent(customEvent);
};

// Provider props
interface ClusterProviderProps {
  children: ReactNode;
}

// Provider component
export const ClusterProvider: React.FC<ClusterProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(clusterReducer, initialState);

  // Load clusters on mount
  useEffect(() => {
    loadClusters();
  }, []);

  // Set up periodic health checks
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.clusters.length > 0) {
        refreshAllClusters();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [state.clusters.length]);

  // Load clusters from service
  const loadClusters = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const clusters = await backendClusterService.getClusters();
      dispatch({ type: 'SET_CLUSTERS', payload: clusters });
      
      // Set current cluster if none selected
      if (!state.currentCluster) {
        const defaultCluster = await backendClusterService.getDefaultCluster();
        if (defaultCluster) {
          dispatch({ type: 'SET_CURRENT_CLUSTER', payload: defaultCluster });
          
          // Emit cluster switch event
          const switchEvent: ClusterSwitchEvent = {
            from: undefined,
            to: defaultCluster,
            timestamp: new Date(),
          };
          emitClusterSwitchEvent(switchEvent);
        }
      }
    } catch (error) {
      console.error('Error loading clusters:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load clusters' });
    }
  }, [state.currentCluster]);

  // Add cluster - overloaded method
  const addCluster = useCallback(async (clusterOrConfig: ClusterConnection | ClusterConfig, auth?: ClusterAuth) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      let cluster: ClusterConnection;
      
      // Check if first parameter is a full ClusterConnection (already created)
      if ('config' in clusterOrConfig && 'auth' in clusterOrConfig && 'status' in clusterOrConfig) {
        // It's a ClusterConnection, just add it to state
        cluster = clusterOrConfig as ClusterConnection;
      } else {
        // It's a ClusterConfig, create the cluster via service
        const config = clusterOrConfig as ClusterConfig;
        if (!auth) {
          throw new Error('Auth is required when providing ClusterConfig');
        }
        const request: AddClusterRequest = { config, auth };
        cluster = await backendClusterService.addCluster(request);
      }
      
      dispatch({ type: 'ADD_CLUSTER', payload: cluster });
      
      // Set as current cluster if it's the first one or marked as default
      if (state.clusters.length === 0 || cluster.config.isDefault) {
        dispatch({ type: 'SET_CURRENT_CLUSTER', payload: cluster });
        
        const switchEvent: ClusterSwitchEvent = {
          from: state.currentCluster,
          to: cluster,
          timestamp: new Date(),
        };
        emitClusterSwitchEvent(switchEvent);
      }
    } catch (error) {
      console.error('Error adding cluster:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to add cluster' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.clusters.length, state.currentCluster]);

  // Update cluster
  const updateCluster = useCallback(async (
    id: string, 
    config: Partial<ClusterConfig>, 
    auth?: Partial<ClusterAuth>
  ) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const request: UpdateClusterRequest = { config, auth };
      const cluster = await backendClusterService.updateCluster(id, request);
      
      dispatch({ type: 'UPDATE_CLUSTER', payload: { id, cluster } });
    } catch (error) {
      console.error('Error updating cluster:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update cluster' });
      throw error;
    }
  }, []);

  // Remove cluster
  const removeCluster = useCallback(async (id: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      await backendClusterService.removeCluster(id);
      dispatch({ type: 'REMOVE_CLUSTER', payload: id });
      
      // If we removed the current cluster, emit switch event
      if (state.currentCluster?.config.id === id) {
        const newCurrentCluster = state.clusters.find(c => c.config.id !== id);
        if (newCurrentCluster) {
          const switchEvent: ClusterSwitchEvent = {
            from: state.currentCluster,
            to: newCurrentCluster,
            timestamp: new Date(),
          };
          emitClusterSwitchEvent(switchEvent);
        }
      }
    } catch (error) {
      console.error('Error removing cluster:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to remove cluster' });
      throw error;
    }
  }, [state.currentCluster, state.clusters]);

  // Switch cluster
  const switchCluster = useCallback(async (id: string) => {
    try {
      const cluster = state.clusters.find(c => c.config.id === id);
      if (!cluster) {
        throw new Error(`Cluster with id ${id} not found`);
      }

      dispatch({ type: 'SET_LOADING', payload: true });
      const previousCluster = state.currentCluster;
      
      // Switch backend cluster context
      console.log(`[ClusterContext] 🔄 Switching to cluster: ${cluster.config.name}`);
      const backendResult = await backendClusterService.switchBackendCluster(id);
      
      if (backendResult.success) {
        // Update frontend state
        dispatch({ type: 'SET_CURRENT_CLUSTER', payload: cluster });
        
        // Emit cluster switch event
        const switchEvent: ClusterSwitchEvent = {
          from: previousCluster,
          to: cluster,
          timestamp: new Date(),
        };
        emitClusterSwitchEvent(switchEvent);
        
        // Update cluster status with backend info
        if (backendResult.nodes !== undefined || backendResult.namespaces !== undefined) {
          dispatch({
            type: 'UPDATE_CLUSTER_STATUS',
            payload: {
              id,
              status: {
                clusterId: id,
                status: 'connected',
                lastChecked: new Date(),
                version: backendResult.version,
                nodeCount: backendResult.nodes,
                namespaceCount: backendResult.namespaces,
              }
            }
          });
        }
        
        console.log(`[ClusterContext] ✅ Successfully switched to cluster: ${cluster.config.name}`);
      } else {
        throw new Error(backendResult.error || 'Backend cluster switch failed');
      }
      
    } catch (error) {
      console.error('Error switching cluster:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to switch cluster' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.clusters, state.currentCluster]);

  // Refresh cluster
  const refreshCluster = useCallback(async (id: string) => {
    try {
      const healthCheck = await backendClusterService.checkClusterHealth(id);
      
      // Update cluster status in state
      dispatch({ 
        type: 'UPDATE_CLUSTER_STATUS', 
        payload: { 
          id, 
          status: {
            clusterId: id,
            status: healthCheck.healthy ? 'connected' : 'error',
            lastChecked: healthCheck.timestamp,
            error: healthCheck.healthy ? undefined : healthCheck.errors?.[0],
          }
        } 
      });
      
    } catch (error) {
      console.error(`Error refreshing cluster ${id}:`, error);
      
      // Update status to error
      dispatch({ 
        type: 'UPDATE_CLUSTER_STATUS', 
        payload: { 
          id, 
          status: {
            clusterId: id,
            status: 'error',
            lastChecked: new Date(),
            error: 'Health check failed',
          }
        } 
      });
    }
  }, []);

  // Refresh all clusters
  const refreshAllClusters = useCallback(async () => {
    try {
      await backendClusterService.refreshAllClusters();
      // Reload clusters to get updated statuses
      const clusters = await backendClusterService.getClusters();
      dispatch({ type: 'SET_CLUSTERS', payload: clusters });
    } catch (error) {
      console.error('Error refreshing all clusters:', error);
    }
  }, []);

  // Set default cluster
  const setDefaultCluster = useCallback(async (id: string) => {
    try {
      await backendClusterService.setDefaultCluster(id);
      
      // Update clusters in state
      const updatedClusters = state.clusters.map(cluster => ({
        ...cluster,
        config: {
          ...cluster.config,
          isDefault: cluster.config.id === id,
          updatedAt: cluster.config.id === id ? new Date() : cluster.config.updatedAt,
        }
      }));
      
      dispatch({ type: 'SET_CLUSTERS', payload: updatedClusters });
      
    } catch (error) {
      console.error('Error setting default cluster:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to set default cluster' });
      throw error;
    }
  }, [state.clusters]);

  // Emit cluster switch event (for other components to listen)
  const emitClusterSwitchEvent = useCallback((event: ClusterSwitchEvent) => {
    // Emit custom event that other components can listen to
    window.dispatchEvent(new CustomEvent('clusterSwitch', { detail: event }));
    
    // Also log for debugging
    console.log('Cluster switched:', {
      from: event.from?.config.displayName || event.from?.config.name,
      to: event.to.config.displayName || event.to.config.name,
      timestamp: event.timestamp,
    });
  }, []);

  // Context value
  const contextValue: ClusterContextValue = {
    // State
    clusters: state.clusters,
    currentCluster: state.currentCluster,
    isLoading: state.isLoading,
    error: state.error,
    
    // Actions
    addCluster,
    updateCluster,
    removeCluster,
    switchCluster,
    refreshCluster,
    refreshAllClusters,
    setDefaultCluster,
  };

  return (
    <ClusterContext.Provider value={contextValue}>
      {children}
    </ClusterContext.Provider>
  );
};

// Hook to use cluster context
export const useCluster = (): ClusterContextValue => {
  const context = useContext(ClusterContext);
  if (context === undefined) {
    throw new Error('useCluster must be used within a ClusterProvider');
  }
  return context;
};

// Hook to get current cluster
export const useCurrentCluster = () => {
  const { currentCluster } = useCluster();
  return currentCluster;
};

// Hook to listen to cluster switch events
export const useClusterSwitchListener = (callback: (event: ClusterSwitchEvent) => void) => {
  useEffect(() => {
    const handleClusterSwitch = (event: CustomEvent<ClusterSwitchEvent>) => {
      callback(event.detail);
    };

    window.addEventListener('clusterSwitch', handleClusterSwitch as EventListener);
    return () => {
      window.removeEventListener('clusterSwitch', handleClusterSwitch as EventListener);
    };
  }, [callback]);
};