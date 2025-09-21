// Kubernetes client stub for browser compatibility
// This file provides a stub implementation to prevent import errors in the browser

// Throw meaningful errors for any attempt to use Kubernetes client in browser
const throwBrowserError = (method: string) => {
  throw new Error(`${method} is not available in browser environment. Use the API service layer instead.`);
};

// Mock KubeConfig class
export class KubeConfig {
  loadFromDefault() {
    throwBrowserError('KubeConfig.loadFromDefault');
  }
  
  loadFromString() {
    throwBrowserError('KubeConfig.loadFromString');
  }
  
  makeApiClient() {
    throwBrowserError('KubeConfig.makeApiClient');
  }
  
  getCurrentContext() {
    throwBrowserError('KubeConfig.getCurrentContext');
  }
  
  getCurrentUser() {
    throwBrowserError('KubeConfig.getCurrentUser');
  }
  
  getCurrentCluster() {
    throwBrowserError('KubeConfig.getCurrentCluster');
  }
}

// Mock API classes
export class CoreV1Api {
  constructor() {
    throwBrowserError('CoreV1Api constructor');
  }
}

export class AppsV1Api {
  constructor() {
    throwBrowserError('AppsV1Api constructor');
  }
}

export class RbacAuthorizationV1Api {
  constructor() {
    throwBrowserError('RbacAuthorizationV1Api constructor');
  }
}

export class ApiextensionsV1Api {
  constructor() {
    throwBrowserError('ApiextensionsV1Api constructor');
  }
}

export class CustomObjectsApi {
  constructor() {
    throwBrowserError('CustomObjectsApi constructor');
  }
}

export class Metrics {
  constructor() {
    throwBrowserError('Metrics constructor');
  }
}

// Mock interfaces - these should not be used but are here to prevent TypeScript errors
export interface V1Node {}
export interface V1Pod {}
export interface V1Namespace {}
export interface V1Deployment {}
export interface V1Service {}
export interface V1ConfigMap {}
export interface V1Secret {}
export interface V1ServiceAccount {}
export interface V1Role {}
export interface V1ClusterRole {}
export interface V1RoleBinding {}
export interface V1ClusterRoleBinding {}
export interface V1CustomResourceDefinition {}

// Export everything as a wildcard
export default {
  KubeConfig,
  CoreV1Api,
  AppsV1Api,
  RbacAuthorizationV1Api,
  ApiextensionsV1Api,
  CustomObjectsApi,
  Metrics
};