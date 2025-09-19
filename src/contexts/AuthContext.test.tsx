import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import type { ReactNode } from 'react'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('provides initial auth state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.state.isAuthenticated).toBe(false)
    expect(result.current.state.loading).toBe(false)
    expect(result.current.state.user).toBeNull()
    expect(result.current.state.cluster).toBeNull()
    expect(result.current.state.token).toBeNull()
    expect(result.current.state.error).toBeNull()
  })

  it('handles successful login', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    const mockCredentials = {
      kubeconfig: 'mock-kubeconfig',
      context: 'test-context',
    }

    await act(async () => {
      await result.current.login(mockCredentials)
    })

    expect(result.current.state.isAuthenticated).toBe(true)
    expect(result.current.state.user).toEqual({
      username: 'admin',
      email: 'admin@kubernetes.local',
      roles: ['cluster-admin'],
    })
    expect(result.current.state.cluster).toEqual({
      name: 'test-cluster',
      server: 'https://kubernetes.example.com',
      nodes: 3,
      namespaces: 12,
      version: 'v1.28.0',
    })
    expect(result.current.state.token).toBe('mock-jwt-token-12345')
  })

  it('handles login failure', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    const invalidCredentials = {
      kubeconfig: 'invalid-config',
      context: 'invalid-context',
    }

    await act(async () => {
      await result.current.login(invalidCredentials)
    })

    expect(result.current.state.isAuthenticated).toBe(false)
    expect(result.current.state.error).toBe('Invalid kubeconfig or context')
    expect(result.current.state.user).toBeNull()
  })

  it('sets loading state during login', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    const mockCredentials = {
      kubeconfig: 'mock-kubeconfig',
      context: 'test-context',
    }

    act(() => {
      result.current.login(mockCredentials)
    })

    expect(result.current.state.loading).toBe(true)

    // Wait for login to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.state.loading).toBe(false)
  })

  it('handles logout', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    // First login
    act(async () => {
      await result.current.login({
        kubeconfig: 'mock-kubeconfig',
        context: 'test-context',
      })
    })

    // Then logout
    act(() => {
      result.current.logout()
    })

    expect(result.current.state.isAuthenticated).toBe(false)
    expect(result.current.state.user).toBeNull()
    expect(result.current.state.cluster).toBeNull()
    expect(result.current.state.token).toBeNull()
    expect(result.current.state.error).toBeNull()
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('k8s-admin-token')
  })

  it('clears error state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    // Set error state
    act(async () => {
      await result.current.login({
        kubeconfig: 'invalid-config',
        context: 'invalid-context',
      })
    })

    expect(result.current.state.error).toBe('Invalid kubeconfig or context')

    // Clear error
    act(() => {
      result.current.clearError()
    })

    expect(result.current.state.error).toBeNull()
  })

  it('restores auth state from localStorage on mount', () => {
    const mockToken = 'stored-jwt-token'
    const mockUser = {
      username: 'stored-user',
      email: 'stored@example.com',
      roles: ['admin'],
    }
    const mockCluster = {
      name: 'stored-cluster',
      server: 'https://stored.example.com',
      nodes: 5,
      namespaces: 8,
      version: 'v1.27.0',
    }

    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === 'k8s-admin-token') return mockToken
      if (key === 'k8s-admin-user') return JSON.stringify(mockUser)
      if (key === 'k8s-admin-cluster') return JSON.stringify(mockCluster)
      return null
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.state.isAuthenticated).toBe(true)
    expect(result.current.state.token).toBe(mockToken)
    expect(result.current.state.user).toEqual(mockUser)
    expect(result.current.state.cluster).toEqual(mockCluster)
  })

  it('handles corrupted localStorage data gracefully', () => {
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === 'k8s-admin-token') return 'valid-token'
      if (key === 'k8s-admin-user') return 'invalid-json'
      if (key === 'k8s-admin-cluster') return 'invalid-json'
      return null
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    // Should not crash and should remain unauthenticated
    expect(result.current.state.isAuthenticated).toBe(false)
    expect(result.current.state.user).toBeNull()
    expect(result.current.state.cluster).toBeNull()
  })

  it('updates cluster info', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    const newClusterInfo = {
      name: 'updated-cluster',
      server: 'https://updated.example.com',
      nodes: 10,
      namespaces: 20,
      version: 'v1.29.0',
    }

    act(() => {
      result.current.updateClusterInfo(newClusterInfo)
    })

    expect(result.current.state.cluster).toEqual(newClusterInfo)
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'k8s-admin-cluster',
      JSON.stringify(newClusterInfo)
    )
  })

  it('throws error when used outside provider', () => {
    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within an AuthProvider')
  })

  it('accepts initial state override', () => {
    const initialState = {
      isAuthenticated: true,
      user: {
        username: 'test-user',
        email: 'test@example.com',
        roles: ['viewer'],
      },
      cluster: null,
      token: 'test-token',
      loading: false,
      error: null,
    }

    const customWrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider initialState={initialState}>{children}</AuthProvider>
    )

    const { result } = renderHook(() => useAuth(), { wrapper: customWrapper })

    expect(result.current.state.isAuthenticated).toBe(true)
    expect(result.current.state.user).toEqual(initialState.user)
    expect(result.current.state.token).toBe('test-token')
  })

  it('validates token on app start', async () => {
    const mockToken = 'test-token'
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === 'k8s-admin-token') return mockToken
      return null
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    // Should attempt to validate token
    expect(result.current.state.loading).toBe(true)

    // Wait for validation to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    expect(result.current.state.loading).toBe(false)
  })
})