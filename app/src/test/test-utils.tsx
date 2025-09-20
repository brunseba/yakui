import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { ValidationProvider } from '../contexts/ValidationContext'
import type { AuthState } from '../types'

// Create test theme
const testTheme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
})

// Mock auth state
const mockAuthState: AuthState = {
  isAuthenticated: true,
  user: {
    username: 'test-user',
    email: 'test@example.com',
    roles: ['admin'],
  },
  cluster: {
    name: 'test-cluster',
    server: 'https://kubernetes.example.com',
    nodes: 3,
    namespaces: 5,
    version: 'v1.28.0',
  },
  token: 'mock-jwt-token',
  loading: false,
  error: null,
}

// Create test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialAuthState?: Partial<AuthState>
  queryClient?: QueryClient
  route?: string
  withRouter?: boolean
  routerType?: 'memory' | 'browser'
}

// Custom render function with all providers
const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const {
    initialAuthState = mockAuthState,
    queryClient = createTestQueryClient(),
    route = '/',
    withRouter = true,
    routerType = 'memory',
    ...renderOptions
  } = options

  // Set initial route for browser router
  if (routerType === 'browser') {
    window.history.pushState({}, 'Test page', route)
  }

  const RouterWrapper = ({ children }: { children: React.ReactNode }) => {
    if (!withRouter) {
      return <>{children}</>
    }
    if (routerType === 'browser') {
      return <BrowserRouter>{children}</BrowserRouter>
    }
    return <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
  }

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={testTheme}>
        <CssBaseline />
        <ValidationProvider>
          <AuthProvider initialState={initialAuthState}>
            <RouterWrapper>{children}</RouterWrapper>
          </AuthProvider>
        </ValidationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  }
}

// Mock Kubernetes API responses
export const mockKubernetesResponses = {
  nodes: {
    body: {
      items: [
        {
          metadata: { name: 'node-1', creationTimestamp: new Date('2023-01-01') },
          status: { 
            conditions: [{ type: 'Ready', status: 'True' }],
            nodeInfo: { kubeletVersion: 'v1.28.0' }
          },
        },
        {
          metadata: { name: 'node-2', creationTimestamp: new Date('2023-01-01') },
          status: { 
            conditions: [{ type: 'Ready', status: 'True' }],
            nodeInfo: { kubeletVersion: 'v1.28.0' }
          },
        },
      ],
    },
  },
  namespaces: {
    body: {
      items: [
        {
          metadata: { name: 'default', creationTimestamp: new Date('2023-01-01') },
          status: { phase: 'Active' },
        },
        {
          metadata: { name: 'kube-system', creationTimestamp: new Date('2023-01-01') },
          status: { phase: 'Active' },
        },
      ],
    },
  },
  pods: {
    body: {
      items: [
        {
          metadata: { 
            name: 'test-pod-1', 
            namespace: 'default',
            creationTimestamp: new Date('2023-01-01')
          },
          status: { phase: 'Running' },
        },
        {
          metadata: { 
            name: 'test-pod-2', 
            namespace: 'default',
            creationTimestamp: new Date('2023-01-01')
          },
          status: { phase: 'Running' },
        },
      ],
    },
  },
  deployments: {
    body: {
      items: [
        {
          metadata: { 
            name: 'test-deployment', 
            namespace: 'default',
            creationTimestamp: new Date('2023-01-01')
          },
          status: { replicas: 3, readyReplicas: 3 },
          spec: { replicas: 3 },
        },
      ],
    },
  },
  services: {
    body: {
      items: [
        {
          metadata: { 
            name: 'test-service', 
            namespace: 'default',
            creationTimestamp: new Date('2023-01-01')
          },
          spec: { 
            type: 'ClusterIP',
            ports: [{ port: 80, targetPort: 8080 }]
          },
        },
      ],
    },
  },
  configMaps: {
    body: {
      items: [
        {
          metadata: { 
            name: 'test-config', 
            namespace: 'default',
            creationTimestamp: new Date('2023-01-01')
          },
          data: { 'config.yaml': 'test: value' },
        },
      ],
    },
  },
  secrets: {
    body: {
      items: [
        {
          metadata: { 
            name: 'test-secret', 
            namespace: 'default',
            creationTimestamp: new Date('2023-01-01')
          },
          type: 'Opaque',
          data: {},
        },
      ],
    },
  },
  serviceAccounts: {
    body: {
      items: [
        {
          metadata: { 
            name: 'default', 
            namespace: 'default',
            creationTimestamp: new Date('2023-01-01')
          },
        },
      ],
    },
  },
  clusterRoles: {
    body: {
      items: [
        {
          metadata: { 
            name: 'cluster-admin',
            creationTimestamp: new Date('2023-01-01')
          },
          rules: [
            {
              apiGroups: ['*'],
              resources: ['*'],
              verbs: ['*'],
            },
          ],
        },
      ],
    },
  },
  events: {
    body: {
      items: [
        {
          metadata: { 
            name: 'test-event',
            namespace: 'default',
            creationTimestamp: new Date('2023-01-01')
          },
          type: 'Normal',
          reason: 'Started',
          message: 'Container started successfully',
          involvedObject: {
            name: 'test-pod',
            kind: 'Pod',
          },
        },
      ],
    },
  },
}

// Utility functions for tests
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0))
}

export const createMockError = (message: string) => ({
  response: {
    statusCode: 500,
    body: { message },
  },
})

// Custom matchers for testing
export const customMatchers = {
  toBeInTheDocument: expect.extend({
    toBeInTheDocument(received) {
      const pass = received !== null
      return {
        message: () => `expected element ${pass ? 'not ' : ''}to be in the document`,
        pass,
      }
    },
  }),
}

// Export everything
export * from '@testing-library/react'
export { customRender as render }
export { testTheme, mockAuthState, createTestQueryClient }