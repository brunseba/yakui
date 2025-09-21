import { kubernetesService } from './kubernetes-api';
import { V1ServiceAccount, V1Role, V1ClusterRole, V1RoleBinding, V1ClusterRoleBinding } from '../types';

export interface RBACRule {
  apiGroups: string[];
  resources: string[];
  verbs: string[];
  resourceNames?: string[];
  nonResourceURLs?: string[];
}

export interface RoleCreationRequest {
  name: string;
  namespace?: string;
  rules: RBACRule[];
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface RoleBindingCreationRequest {
  name: string;
  namespace?: string;
  roleRef: {
    apiGroup: string;
    kind: 'Role' | 'ClusterRole';
    name: string;
  };
  subjects: Array<{
    kind: 'User' | 'Group' | 'ServiceAccount';
    name: string;
    namespace?: string;
  }>;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ServiceAccountCreationRequest {
  name: string;
  namespace: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  automountServiceAccountToken?: boolean;
  imagePullSecrets?: Array<{ name: string }>;
  secrets?: Array<{ name: string }>;
}

export interface PermissionMatrix {
  [resource: string]: {
    [verb: string]: boolean;
  };
}

export interface RBACAnalysis {
  totalServiceAccounts: number;
  totalRoles: number;
  totalClusterRoles: number;
  totalRoleBindings: number;
  totalClusterRoleBindings: number;
  privilegedServiceAccounts: Array<{
    name: string;
    namespace?: string;
    permissions: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }>;
  orphanedRoles: Array<V1Role | V1ClusterRole>;
  unusedServiceAccounts: V1ServiceAccount[];
  overprivilegedBindings: Array<V1RoleBinding | V1ClusterRoleBinding>;
}

export class RBACService {
  // Service Accounts
  async getServiceAccounts(namespace?: string): Promise<V1ServiceAccount[]> {
    return await kubernetesService.getServiceAccounts(namespace);
  }

  async createServiceAccount(request: ServiceAccountCreationRequest): Promise<V1ServiceAccount> {
    const serviceAccount: V1ServiceAccount = {
      apiVersion: 'v1',
      kind: 'ServiceAccount',
      metadata: {
        name: request.name,
        namespace: request.namespace,
        labels: request.labels,
        annotations: request.annotations,
      },
      automountServiceAccountToken: request.automountServiceAccountToken,
      imagePullSecrets: request.imagePullSecrets,
      secrets: request.secrets,
    };

    const result = await kubernetesService.createServiceAccount(serviceAccount);
    console.log('Created service account:', result.metadata?.name);
    return result;
  }

  async deleteServiceAccount(name: string, namespace: string): Promise<void> {
    await kubernetesService.deleteServiceAccount(name, namespace);
    console.log(`Deleted service account: ${namespace}/${name}`);
  }

  async getServiceAccountToken(name: string, namespace: string): Promise<string | null> {
    try {
      // Create a token for the service account by creating a secret
      const tokenSecret = {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name: `${name}-token`,
          namespace: namespace,
          annotations: {
            'kubernetes.io/service-account.name': name
          }
        },
        type: 'kubernetes.io/service-account-token'
      };
      
      const result = await kubernetesService.createResource('secret', tokenSecret, namespace);
      console.log(`Created token for service account: ${namespace}/${name}`);
      
      // In a real implementation, this would return the actual token
      // For now, return a placeholder since token extraction requires additional API calls
      return result?.data?.token || 'token-placeholder';
    } catch (error) {
      console.error(`Failed to create token for service account ${namespace}/${name}:`, error);
      return null;
    }
  }

  // Roles
  async getRoles(namespace?: string): Promise<V1Role[]> {
    return await kubernetesService.getRoles(namespace);
  }

  async getClusterRoles(): Promise<V1ClusterRole[]> {
    return await kubernetesService.getClusterRoles();
  }

  async createRole(request: RoleCreationRequest): Promise<V1Role | V1ClusterRole> {
    const roleSpec = {
      apiVersion: 'rbac.authorization.k8s.io/v1',
      metadata: {
        name: request.name,
        namespace: request.namespace,
        labels: request.labels,
        annotations: request.annotations,
      },
      rules: request.rules,
    };

    if (request.namespace) {
      // Creating a namespaced Role
      const role: V1Role = {
        ...roleSpec,
        kind: 'Role',
      };
      const result = await kubernetesService.createRole(role);
      console.log('Created role:', result.metadata?.name);
      return result;
    } else {
      // Creating a ClusterRole
      const clusterRole: V1ClusterRole = {
        ...roleSpec,
        kind: 'ClusterRole',
      };
      const result = await kubernetesService.createRole(clusterRole);
      console.log('Created cluster role:', result.metadata?.name);
      return result;
    }
  }

  async updateRole(
    name: string,
    namespace: string | undefined,
    rules: RBACRule[]
  ): Promise<V1Role | V1ClusterRole> {
    console.log(`Updating ${namespace ? 'role' : 'cluster role'}: ${namespace ? namespace + '/' : ''}${name}`);
    
    // First get the existing role
    const existingRoles = namespace ? await this.getRoles(namespace) : await this.getClusterRoles();
    const existingRole = existingRoles.find(r => r.metadata?.name === name);
    
    if (!existingRole) {
      throw new Error(`${namespace ? 'Role' : 'ClusterRole'} '${name}' not found`);
    }

    // Update the rules
    const updatedRole = {
      ...existingRole,
      rules,
    };

    // For simplicity, we'll delete and recreate the role
    // In a real implementation, you'd use a PATCH operation
    await this.deleteRole(name, namespace);
    
    const createRequest: RoleCreationRequest = {
      name,
      namespace,
      rules,
      labels: existingRole.metadata?.labels,
      annotations: existingRole.metadata?.annotations,
    };
    
    return await this.createRole(createRequest);
  }

  async deleteRole(name: string, namespace?: string): Promise<void> {
    await kubernetesService.deleteRole(name, namespace);
    console.log(`Deleted ${namespace ? 'role' : 'cluster role'}: ${namespace ? namespace + '/' : ''}${name}`);
  }

  // Role Bindings
  async getRoleBindings(namespace?: string): Promise<k8s.V1RoleBinding[]> {
    return await kubernetesService.getRoleBindings(namespace);
  }

  async getClusterRoleBindings(): Promise<k8s.V1ClusterRoleBinding[]> {
    return await kubernetesService.getClusterRoleBindings();
  }

  async createRoleBinding(request: RoleBindingCreationRequest): Promise<k8s.V1RoleBinding | k8s.V1ClusterRoleBinding> {
    const bindingSpec = {
      apiVersion: 'rbac.authorization.k8s.io/v1',
      metadata: {
        name: request.name,
        namespace: request.namespace,
        labels: request.labels,
        annotations: request.annotations,
      },
      roleRef: request.roleRef,
      subjects: request.subjects,
    };

    if (request.namespace) {
      // Creating a namespaced RoleBinding
      const roleBinding: k8s.V1RoleBinding = {
        ...bindingSpec,
        kind: 'RoleBinding',
      };
      const result = await kubernetesService.createRoleBinding(roleBinding);
      console.log('Created role binding:', result.metadata?.name);
      return result;
    } else {
      // Creating a ClusterRoleBinding
      const clusterRoleBinding: k8s.V1ClusterRoleBinding = {
        ...bindingSpec,
        kind: 'ClusterRoleBinding',
      };
      const result = await kubernetesService.createRoleBinding(clusterRoleBinding);
      console.log('Created cluster role binding:', result.metadata?.name);
      return result;
    }
  }

  async deleteRoleBinding(name: string, namespace?: string): Promise<void> {
    await kubernetesService.deleteRoleBinding(name, namespace);
    console.log(`Deleted ${namespace ? 'role binding' : 'cluster role binding'}: ${namespace ? namespace + '/' : ''}${name}`);
  }

  // Permission Analysis
  async analyzePermissions(role: k8s.V1Role | k8s.V1ClusterRole): Promise<PermissionMatrix> {
    const matrix: PermissionMatrix = {};

    if (!role.rules) return matrix;

    for (const rule of role.rules) {
      for (const resource of rule.resources || []) {
        if (!matrix[resource]) {
          matrix[resource] = {};
        }
        for (const verb of rule.verbs || []) {
          matrix[resource][verb] = true;
        }
      }
    }

    return matrix;
  }

  async getRolesByServiceAccount(
    serviceAccountName: string,
    namespace: string
  ): Promise<Array<k8s.V1Role | k8s.V1ClusterRole>> {
    const roles: Array<k8s.V1Role | k8s.V1ClusterRole> = [];
    
    // Get all role bindings
    const [roleBindings, clusterRoleBindings] = await Promise.all([
      this.getRoleBindings(),
      this.getClusterRoleBindings(),
    ]);

    // Find bindings that reference this service account
    const relevantBindings = [
      ...roleBindings.filter(rb => 
        rb.subjects?.some(subject => 
          subject.kind === 'ServiceAccount' && 
          subject.name === serviceAccountName && 
          subject.namespace === namespace
        )
      ),
      ...clusterRoleBindings.filter(crb => 
        crb.subjects?.some(subject => 
          subject.kind === 'ServiceAccount' && 
          subject.name === serviceAccountName && 
          subject.namespace === namespace
        )
      ),
    ];

    // Get the roles referenced by these bindings
    const [allRoles, allClusterRoles] = await Promise.all([
      this.getRoles(),
      this.getClusterRoles(),
    ]);

    for (const binding of relevantBindings) {
      if (binding.roleRef.kind === 'Role') {
        const role = allRoles.find(r => 
          r.metadata?.name === binding.roleRef.name &&
          r.metadata?.namespace === binding.metadata?.namespace
        );
        if (role) roles.push(role);
      } else if (binding.roleRef.kind === 'ClusterRole') {
        const clusterRole = allClusterRoles.find(cr => 
          cr.metadata?.name === binding.roleRef.name
        );
        if (clusterRole) roles.push(clusterRole);
      }
    }

    return roles;
  }

  async getSubjectsForRole(
    roleName: string,
    namespace?: string
  ): Promise<Array<{ kind: string; name: string; namespace?: string }>> {
    const subjects: Array<{ kind: string; name: string; namespace?: string }> = [];

    const [roleBindings, clusterRoleBindings] = await Promise.all([
      this.getRoleBindings(),
      this.getClusterRoleBindings(),
    ]);

    const relevantBindings = [
      ...roleBindings.filter(rb => 
        rb.roleRef.name === roleName && 
        (namespace ? rb.metadata?.namespace === namespace : true)
      ),
      ...clusterRoleBindings.filter(crb => 
        crb.roleRef.name === roleName && !namespace
      ),
    ];

    for (const binding of relevantBindings) {
      if (binding.subjects) {
        subjects.push(...binding.subjects.map(subject => ({
          kind: subject.kind || '',
          name: subject.name,
          namespace: subject.namespace,
        })));
      }
    }

    return subjects;
  }

  // RBAC Analysis
  async performRBACAnalysis(): Promise<RBACAnalysis> {
    const [
      serviceAccounts,
      roles,
      clusterRoles,
      roleBindings,
      clusterRoleBindings,
    ] = await Promise.all([
      this.getServiceAccounts(),
      this.getRoles(),
      this.getClusterRoles(),
      this.getRoleBindings(),
      this.getClusterRoleBindings(),
    ]);

    // Analyze privileged service accounts
    const privilegedServiceAccounts = [];
    for (const sa of serviceAccounts) {
      if (!sa.metadata?.name || !sa.metadata?.namespace) continue;
      
      const roles = await this.getRolesByServiceAccount(sa.metadata.name, sa.metadata.namespace);
      const permissions = [];
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

      for (const role of roles) {
        if (role.rules) {
          for (const rule of role.rules) {
            if (rule.verbs?.includes('*') || rule.resources?.includes('*')) {
              riskLevel = 'critical';
            } else if (rule.verbs?.includes('create') && rule.verbs?.includes('delete')) {
              riskLevel = riskLevel === 'critical' ? 'critical' : 'high';
            }
            permissions.push(...(rule.resources || []));
          }
        }
      }

      if (roles.length > 0) {
        privilegedServiceAccounts.push({
          name: sa.metadata.name,
          namespace: sa.metadata.namespace,
          permissions: [...new Set(permissions)],
          riskLevel,
        });
      }
    }

    // Find orphaned roles (roles not referenced by any bindings)
    const referencedRoleNames = new Set([
      ...roleBindings.map(rb => `${rb.metadata?.namespace}/${rb.roleRef.name}`),
      ...clusterRoleBindings.map(crb => crb.roleRef.name),
    ]);

    const orphanedRoles = [
      ...roles.filter(role => 
        !referencedRoleNames.has(`${role.metadata?.namespace}/${role.metadata?.name}`)
      ),
      ...clusterRoles.filter(clusterRole => 
        !referencedRoleNames.has(clusterRole.metadata?.name || '')
      ),
    ];

    // Find unused service accounts (not referenced by any bindings)
    const referencedServiceAccounts = new Set([
      ...roleBindings.flatMap(rb => 
        rb.subjects?.filter(s => s.kind === 'ServiceAccount')
          .map(s => `${s.namespace}/${s.name}`) || []
      ),
      ...clusterRoleBindings.flatMap(crb => 
        crb.subjects?.filter(s => s.kind === 'ServiceAccount')
          .map(s => `${s.namespace}/${s.name}`) || []
      ),
    ]);

    const unusedServiceAccounts = serviceAccounts.filter(sa =>
      !referencedServiceAccounts.has(`${sa.metadata?.namespace}/${sa.metadata?.name}`)
    );

    // Find overprivileged bindings (bindings with wildcard permissions)
    const overprivilegedBindings = [];
    for (const binding of [...roleBindings, ...clusterRoleBindings]) {
      const roleName = binding.roleRef.name;
      const role = [...roles, ...clusterRoles].find(r => r.metadata?.name === roleName);
      
      if (role?.rules?.some(rule => 
        rule.verbs?.includes('*') || rule.resources?.includes('*') || rule.apiGroups?.includes('*')
      )) {
        overprivilegedBindings.push(binding);
      }
    }

    return {
      totalServiceAccounts: serviceAccounts.length,
      totalRoles: roles.length,
      totalClusterRoles: clusterRoles.length,
      totalRoleBindings: roleBindings.length,
      totalClusterRoleBindings: clusterRoleBindings.length,
      privilegedServiceAccounts,
      orphanedRoles,
      unusedServiceAccounts,
      overprivilegedBindings,
    };
  }

  // Validation
  async validateRoleBinding(request: RoleBindingCreationRequest): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if role exists
    try {
      if (request.roleRef.kind === 'Role' && request.namespace) {
        const roles = await this.getRoles(request.namespace);
        if (!roles.find(r => r.metadata?.name === request.roleRef.name)) {
          errors.push(`Role '${request.roleRef.name}' not found in namespace '${request.namespace}'`);
        }
      } else if (request.roleRef.kind === 'ClusterRole') {
        const clusterRoles = await this.getClusterRoles();
        if (!clusterRoles.find(cr => cr.metadata?.name === request.roleRef.name)) {
          errors.push(`ClusterRole '${request.roleRef.name}' not found`);
        }
      }
    } catch (error) {
      errors.push('Failed to validate role reference');
    }

    // Check if subjects exist
    for (const subject of request.subjects) {
      if (subject.kind === 'ServiceAccount') {
        try {
          const serviceAccounts = await this.getServiceAccounts(subject.namespace);
          if (!serviceAccounts.find(sa => sa.metadata?.name === subject.name)) {
            warnings.push(`ServiceAccount '${subject.name}' not found in namespace '${subject.namespace}'`);
          }
        } catch (error) {
          warnings.push(`Failed to validate ServiceAccount '${subject.name}'`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Common RBAC Patterns
  getCommonRoleTemplates(): Array<{
    name: string;
    description: string;
    rules: RBACRule[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }> {
    return [
      {
        name: 'Pod Reader',
        description: 'Can read pods in a namespace',
        riskLevel: 'low',
        rules: [
          {
            apiGroups: [''],
            resources: ['pods'],
            verbs: ['get', 'list', 'watch'],
          },
        ],
      },
      {
        name: 'Pod Manager',
        description: 'Can manage pods in a namespace',
        riskLevel: 'medium',
        rules: [
          {
            apiGroups: [''],
            resources: ['pods'],
            verbs: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete'],
          },
        ],
      },
      {
        name: 'Deployment Manager',
        description: 'Can manage deployments and related resources',
        riskLevel: 'medium',
        rules: [
          {
            apiGroups: ['apps'],
            resources: ['deployments', 'replicasets'],
            verbs: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete'],
          },
          {
            apiGroups: [''],
            resources: ['pods'],
            verbs: ['get', 'list', 'watch'],
          },
        ],
      },
      {
        name: 'Namespace Admin',
        description: 'Administrative access to all resources in a namespace',
        riskLevel: 'high',
        rules: [
          {
            apiGroups: ['*'],
            resources: ['*'],
            verbs: ['*'],
          },
        ],
      },
      {
        name: 'Cluster Viewer',
        description: 'Read-only access to most cluster resources',
        riskLevel: 'low',
        rules: [
          {
            apiGroups: ['*'],
            resources: ['*'],
            verbs: ['get', 'list', 'watch'],
          },
        ],
      },
      {
        name: 'Cluster Admin',
        description: 'Full administrative access to the entire cluster',
        riskLevel: 'critical',
        rules: [
          {
            apiGroups: ['*'],
            resources: ['*'],
            verbs: ['*'],
          },
        ],
      },
    ];
  }
}

export const rbacService = new RBACService();