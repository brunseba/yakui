import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock the Kubernetes client
vi.mock('@kubernetes/client-node', () => ({
  KubeConfig: vi.fn().mockImplementation(() => ({
    loadFromDefault: vi.fn(),
    loadFromString: vi.fn(),
    makeApiClient: vi.fn(),
  })),
  CoreV1Api: vi.fn().mockImplementation(() => ({
    listNode: vi.fn(),
    listNamespacedPod: vi.fn(),
    listNamespace: vi.fn(),
    listPodForAllNamespaces: vi.fn(),
    listNamespacedService: vi.fn(),
    listNamespacedConfigMap: vi.fn(),
    listNamespacedSecret: vi.fn(),
  })),
  AppsV1Api: vi.fn().mockImplementation(() => ({
    listNamespacedDeployment: vi.fn(),
    listNamespacedDaemonSet: vi.fn(),
    listNamespacedStatefulSet: vi.fn(),
  })),
  RbacAuthorizationV1Api: vi.fn().mockImplementation(() => ({
    listServiceAccountForAllNamespaces: vi.fn(),
    listClusterRole: vi.fn(),
    listClusterRoleBinding: vi.fn(),
    listRoleForAllNamespaces: vi.fn(),
    listRoleBindingForAllNamespaces: vi.fn(),
  })),
  ApiextensionsV1Api: vi.fn().mockImplementation(() => ({
    listCustomResourceDefinition: vi.fn(),
  })),
  MetricsV1beta1Api: vi.fn().mockImplementation(() => ({
    listNodeMetrics: vi.fn(),
    listPodMetricsForAllNamespaces: vi.fn(),
  })),
  Metrics: {
    listNodeMetrics: vi.fn(),
    listPodMetricsForAllNamespaces: vi.fn(),
  },
}))

// Mock Chart.js
vi.mock('chart.js', () => ({
  Chart: vi.fn(),
  registerables: [],
}))

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  __esModule: true,
  default: vi.fn().mockImplementation(({ onChange, value }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  )),
}))

// Global test utilities
declare global {
  interface Window {
    ResizeObserver: typeof ResizeObserver
  }
}

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

window.ResizeObserver = MockResizeObserver

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
})

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
})