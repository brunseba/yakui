// Utility functions to convert between Node.js Kubernetes client types and browser-compatible types

import type {
  ServiceAccount,
  Role,
  ClusterRole,
  RoleBinding,
  ClusterRoleBinding,
  KubernetesMetadata
} from '../types/kubernetes';

// Convert Date objects to ISO strings for browser compatibility
const convertMetadata = (metadata: any): KubernetesMetadata | undefined => {
  if (!metadata) return undefined;
  
  return {
    ...metadata,
    creationTimestamp: metadata.creationTimestamp instanceof Date 
      ? metadata.creationTimestamp.toISOString() 
      : metadata.creationTimestamp,
    deletionTimestamp: metadata.deletionTimestamp instanceof Date 
      ? metadata.deletionTimestamp.toISOString() 
      : metadata.deletionTimestamp,
  };
};

export const convertServiceAccount = (sa: any): ServiceAccount => {
  return {
    ...sa,
    metadata: convertMetadata(sa.metadata)
  };
};

export const convertRole = (role: any): Role => {
  return {
    ...role,
    metadata: convertMetadata(role.metadata)
  };
};

export const convertClusterRole = (clusterRole: any): ClusterRole => {
  return {
    ...clusterRole,
    metadata: convertMetadata(clusterRole.metadata)
  };
};

export const convertRoleBinding = (roleBinding: any): RoleBinding => {
  return {
    ...roleBinding,
    metadata: convertMetadata(roleBinding.metadata)
  };
};

export const convertClusterRoleBinding = (clusterRoleBinding: any): ClusterRoleBinding => {
  return {
    ...clusterRoleBinding,
    metadata: convertMetadata(clusterRoleBinding.metadata)
  };
};

// Array conversion functions
export const convertServiceAccounts = (serviceAccounts: any[]): ServiceAccount[] => {
  return serviceAccounts.map(convertServiceAccount);
};

export const convertRoles = (roles: any[]): Role[] => {
  return roles.map(convertRole);
};

export const convertClusterRoles = (clusterRoles: any[]): ClusterRole[] => {
  return clusterRoles.map(convertClusterRole);
};

export const convertRoleBindings = (roleBindings: any[]): RoleBinding[] => {
  return roleBindings.map(convertRoleBinding);
};

export const convertClusterRoleBindings = (clusterRoleBindings: any[]): ClusterRoleBinding[] => {
  return clusterRoleBindings.map(convertClusterRoleBinding);
};