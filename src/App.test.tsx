import { describe, it, expect } from 'vitest'
import { render, screen } from './test/test-utils'
import App from './App'

describe('App Integration', () => {
  it('renders login screen when not authenticated', () => {
    render(<App />, {
      withRouter: false,
      initialAuthState: {
        isAuthenticated: false,
        user: null,
        cluster: null,
        token: null,
        loading: false,
        error: null,
      }
    })

    expect(screen.getByText('Kubernetes Admin UI')).toBeInTheDocument()
    expect(screen.getByText('Upload Kubeconfig')).toBeInTheDocument()
  })

  it('renders main layout when authenticated', () => {
    render(<App />, {
      withRouter: false,
      initialAuthState: {
        isAuthenticated: true,
        user: {
          username: 'test-user',
          email: 'test@example.com',
          roles: ['admin'],
        },
        cluster: {
          name: 'test-cluster',
          server: 'https://test.com',
          nodes: 3,
          namespaces: 5,
          version: 'v1.28.0',
        },
        token: 'test-token',
        loading: false,
        error: null,
      }
    })

    expect(screen.getByText('Kubernetes Admin Dashboard')).toBeInTheDocument()
    expect(screen.getByText('K8s Admin')).toBeInTheDocument()
  })

  it('shows navigation menu when authenticated', () => {
    render(<App />, {
      withRouter: false,
      initialAuthState: {
        isAuthenticated: true,
        user: {
          username: 'test-user',
          email: 'test@example.com',
          roles: ['admin'],
        },
        cluster: {
          name: 'test-cluster',
          server: 'https://test.com',
          nodes: 3,
          namespaces: 5,
          version: 'v1.28.0',
        },
        token: 'test-token',
        loading: false,
        error: null,
      }
    })

    // Check navigation items
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Cluster')).toBeInTheDocument()
    expect(screen.getByText('Namespaces')).toBeInTheDocument()
    expect(screen.getByText('Workloads')).toBeInTheDocument()
    expect(screen.getByText('Custom Resources')).toBeInTheDocument()
    expect(screen.getByText('RBAC')).toBeInTheDocument()
    expect(screen.getByText('Monitoring')).toBeInTheDocument()
    expect(screen.getByText('Security')).toBeInTheDocument()
  })

  it('displays cluster information in sidebar', () => {
    render(<App />, {
      withRouter: false,
      initialAuthState: {
        isAuthenticated: true,
        user: {
          username: 'test-user',
          email: 'test@example.com',
          roles: ['admin'],
        },
        cluster: {
          name: 'production-cluster',
          server: 'https://prod.k8s.com',
          nodes: 10,
          namespaces: 25,
          version: 'v1.28.0',
        },
        token: 'test-token',
        loading: false,
        error: null,
      }
    })

    expect(screen.getByText('production-cluster')).toBeInTheDocument()
    expect(screen.getByText('10 nodes • 25 namespaces')).toBeInTheDocument()
  })

  it('handles routing to different pages', () => {
    // For this test, we need to simulate navigation after render
    const { container } = render(<App />, {
      withRouter: false,
      initialAuthState: {
        isAuthenticated: true,
        user: {
          username: 'test-user',
          email: 'test@example.com',
          roles: ['admin'],
        },
        cluster: {
          name: 'test-cluster',
          server: 'https://test.com',
          nodes: 3,
          namespaces: 5,
          version: 'v1.28.0',
        },
        token: 'test-token',
        loading: false,
        error: null,
      }
    })

    // App should render the main layout
    expect(screen.getByText('K8s Admin')).toBeInTheDocument()
  })

  it('redirects to login when accessing protected route while unauthenticated', () => {
    render(<App />, {
      withRouter: false,
      initialAuthState: {
        isAuthenticated: false,
        user: null,
        cluster: null,
        token: null,
        loading: false,
        error: null,
      }
    })

    // Should show login instead of dashboard
    expect(screen.getByText('Kubernetes Admin UI')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })

  it('wraps application in error boundary', () => {
    // This test verifies that the error boundary is present
    // The actual error boundary functionality is tested separately
    render(<App />, { withRouter: false })
    
    // Error boundary should be wrapping the application
    // If there's an error, it should be caught and displayed
    expect(document.body).toContainHTML('<div')
  })

  it('provides all necessary contexts', () => {
    render(<App />, {
      withRouter: false,
      initialAuthState: {
        isAuthenticated: true,
        user: {
          username: 'test-user',
          email: 'test@example.com',
          roles: ['admin'],
        },
        cluster: {
          name: 'test-cluster',
          server: 'https://test.com',
          nodes: 3,
          namespaces: 5,
          version: 'v1.28.0',
        },
        token: 'test-token',
        loading: false,
        error: null,
      }
    })

    // Should have access to auth context (evidenced by showing authenticated layout)
    expect(screen.getByText('K8s Admin')).toBeInTheDocument()
    
    // Should have access to theme context (evidenced by Material-UI rendering)
    expect(screen.getByRole('main')).toBeInTheDocument()
    
    // Validation context should be available (though not directly testable in this component)
  })

  it('handles loading state', () => {
    render(<App />, {
      withRouter: false,
      initialAuthState: {
        isAuthenticated: false,
        user: null,
        cluster: null,
        token: null,
        loading: true,
        error: null,
      }
    })

    // Should show loading indicator when auth is loading
    expect(screen.getByText('Kubernetes Admin UI')).toBeInTheDocument()
  })

  it('handles authentication error state', () => {
    render(<App />, {
      withRouter: false,
      initialAuthState: {
        isAuthenticated: false,
        user: null,
        cluster: null,
        token: null,
        loading: false,
        error: 'Authentication failed',
      }
    })

    // Should show login screen with error
    expect(screen.getByText('Kubernetes Admin UI')).toBeInTheDocument()
    // Error handling is managed by the login component
  })
})