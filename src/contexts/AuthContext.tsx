import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AuthState } from '../types';
import { kubernetesService } from '../services/kubernetes';

interface AuthContextType {
  state: AuthState;
  login: (config?: string, token?: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction = 
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: AuthState }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  cluster: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return action.payload;
    case 'LOGOUT':
      return initialState;
    default:
      return state;
  }
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const login = async (config?: string, token?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await kubernetesService.initialize(config);
      const authState = await kubernetesService.authenticate(token);
      
      dispatch({ type: 'LOGIN_SUCCESS', payload: authState });
      
      // Store auth state in localStorage
      localStorage.setItem('k8s-auth', JSON.stringify({
        token,
        config,
        timestamp: Date.now()
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('k8s-auth');
    dispatch({ type: 'LOGOUT' });
    setError(null);
  };

  // Try to restore authentication on app start
  useEffect(() => {
    const restoreAuth = async () => {
      const storedAuth = localStorage.getItem('k8s-auth');
      if (!storedAuth) return;

      try {
        const { token, config, timestamp } = JSON.parse(storedAuth);
        
        // Check if stored auth is not too old (24 hours)
        if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
          localStorage.removeItem('k8s-auth');
          return;
        }

        await login(config, token);
      } catch (error) {
        console.error('Failed to restore authentication:', error);
        localStorage.removeItem('k8s-auth');
      }
    };

    restoreAuth();
  }, []);

  const value: AuthContextType = {
    state,
    login,
    logout,
    isLoading,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};