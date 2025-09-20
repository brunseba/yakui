// Browser-compatible Kubernetes types
// This file provides type definitions for Kubernetes resources without Node.js dependencies

export interface KubernetesMetadata {
  name?: string;
  namespace?: string;
  uid?: string;
  resourceVersion?: string;
  generation?: number;
  creationTimestamp?: string;
  deletionTimestamp?: string;
  labels?: { [key: string]: string };
  annotations?: { [key: string]: string };
  ownerReferences?: Array<{
    apiVersion: string;
    kind: string;
    name: string;
    uid: string;
    controller?: boolean;
    blockOwnerDeletion?: boolean;
  }>;
  finalizers?: string[];
}

export interface ServiceAccount {
  apiVersion?: string;
  kind?: string;
  metadata?: KubernetesMetadata;
  automountServiceAccountToken?: boolean;
  secrets?: Array<{
    name?: string;
  }>;
  imagePullSecrets?: Array<{
    name?: string;
  }>;
}

export interface PolicyRule {
  verbs?: string[];
  apiGroups?: string[];
  resources?: string[];
  resourceNames?: string[];
  nonResourceURLs?: string[];
}

export interface Role {
  apiVersion?: string;
  kind?: string;
  metadata?: KubernetesMetadata;
  rules?: PolicyRule[];
}

export interface ClusterRole {
  apiVersion?: string;
  kind?: string;
  metadata?: KubernetesMetadata;
  rules?: PolicyRule[];
  aggregationRule?: {
    clusterRoleSelectors?: Array<{
      matchLabels?: { [key: string]: string };
      matchExpressions?: Array<{
        key: string;
        operator: string;
        values?: string[];
      }>;
    }>;
  };
}

export interface RoleRef {
  apiGroup: string;
  kind: string;
  name: string;
}

export interface Subject {
  kind: string;
  name: string;
  namespace?: string;
  apiGroup?: string;
}

export interface RoleBinding {
  apiVersion?: string;
  kind?: string;
  metadata?: KubernetesMetadata;
  subjects?: Subject[];
  roleRef: RoleRef;
}

export interface ClusterRoleBinding {
  apiVersion?: string;
  kind?: string;
  metadata?: KubernetesMetadata;
  subjects?: Subject[];
  roleRef: RoleRef;
}

export interface Namespace {
  apiVersion?: string;
  kind?: string;
  metadata?: KubernetesMetadata;
  spec?: {
    finalizers?: string[];
  };
  status?: {
    phase?: string;
    conditions?: Array<{
      type: string;
      status: string;
      lastTransitionTime?: string;
      reason?: string;
      message?: string;
    }>;
  };
}

// Union type for all RBAC resources
export type RBACResource = ServiceAccount | Role | ClusterRole | RoleBinding | ClusterRoleBinding;

// Resource type identifiers
export type RBACResourceType = 'serviceaccount' | 'role' | 'clusterrole' | 'rolebinding' | 'clusterrolebinding';

// Helper type guards
export const isServiceAccount = (resource: any): resource is ServiceAccount => {
  return resource && (resource.kind === 'ServiceAccount' || resource.secrets !== undefined);
};

export const isRole = (resource: any): resource is Role => {
  return resource && resource.kind === 'Role';
};

export const isClusterRole = (resource: any): resource is ClusterRole => {
  return resource && resource.kind === 'ClusterRole';
};

export const isRoleBinding = (resource: any): resource is RoleBinding => {
  return resource && resource.kind === 'RoleBinding';
};

export const isClusterRoleBinding = (resource: any): resource is ClusterRoleBinding => {
  return resource && resource.kind === 'ClusterRoleBinding';
};

// Utility functions
export const getResourceAge = (creationTimestamp?: string): string => {
  if (!creationTimestamp) return 'Unknown';
  
  const created = new Date(creationTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffDays > 0) {
    return `${diffDays} days, ${diffHours} hours`;
  } else if (diffHours > 0) {
    return `${diffHours} hours, ${diffMinutes} minutes`;
  } else {
    return `${diffMinutes} minutes`;
  }
};

export const formatTimestamp = (timestamp?: string): string => {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  return date.toLocaleString();
};