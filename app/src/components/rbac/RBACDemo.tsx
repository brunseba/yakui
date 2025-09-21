import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Alert,
  Stack,
  Chip
} from '@mui/material';
import {
  SupervisorAccount as ServiceAccountIcon,
  Security as SecurityIcon,
  Group as GroupIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import type {
  ServiceAccount,
  Role,
  ClusterRole,
  RoleBinding,
  ClusterRoleBinding,
  RBACResourceType
} from '../../types/kubernetes';
import RBACResourceDetailDialog from './RBACResourceDetailDialog';

interface DemoConfig {
  serviceAccount: {
    name: string;
    namespace: string;
    appName: string;
  };
  role: {
    name: string;
    namespace: string;
  };
  clusterRole: {
    name: string;
  };
  user: {
    name: string;
  };
  group: {
    name: string;
  };
}

const getDemoConfig = (): DemoConfig => ({
  serviceAccount: {
    name: import.meta.env.VITE_DEMO_SA_NAME || 'demo-service-account',
    namespace: import.meta.env.VITE_DEMO_SA_NAMESPACE || 'default',
    appName: import.meta.env.VITE_DEMO_APP_NAME || 'demo-app',
  },
  role: {
    name: import.meta.env.VITE_DEMO_ROLE_NAME || 'demo-role',
    namespace: import.meta.env.VITE_DEMO_ROLE_NAMESPACE || 'default',
  },
  clusterRole: {
    name: import.meta.env.VITE_DEMO_CLUSTER_ROLE_NAME || 'demo-cluster-role',
  },
  user: {
    name: import.meta.env.VITE_DEMO_USER_NAME || 'demo-user',
  },
  group: {
    name: import.meta.env.VITE_DEMO_GROUP_NAME || 'demo-group',
  },
});

const generateDemoServiceAccount = (config: DemoConfig): ServiceAccount => {
  const now = Date.now();
  const randomId = Math.random().toString(36).substr(2, 9);
  
  return {
    apiVersion: 'v1',
    kind: 'ServiceAccount',
    metadata: {
      name: config.serviceAccount.name,
      namespace: config.serviceAccount.namespace,
      uid: `sa-${randomId}-${Math.random().toString(36).substr(2, 9)}`,
      creationTimestamp: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
      labels: {
        'app.kubernetes.io/name': config.serviceAccount.appName,
        'app.kubernetes.io/version': import.meta.env.VITE_DEMO_APP_VERSION || '1.0.0',
        'environment': import.meta.env.VITE_DEMO_ENVIRONMENT || 'development'
      },
      annotations: {
        'kubernetes.io/service-account.name': config.serviceAccount.name,
        'description': `Service account for ${config.serviceAccount.appName} application`
      }
    },
    automountServiceAccountToken: true,
    secrets: [
      { name: `${config.serviceAccount.name}-token-${randomId}` },
      { name: `${config.serviceAccount.appName}-registry-secret` }
    ],
    imagePullSecrets: [
      { name: `${config.serviceAccount.appName}-registry-secret` }
    ]
  };
};

const generateDemoRole = (config: DemoConfig): Role => {
  const now = Date.now();
  const randomId = Math.random().toString(36).substr(2, 9);
  
  return {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'Role',
    metadata: {
      name: config.role.name,
      namespace: config.role.namespace,
      uid: `role-${randomId}-${Math.random().toString(36).substr(2, 9)}`,
      creationTimestamp: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      labels: {
        'app.kubernetes.io/name': config.serviceAccount.appName,
        'role-type': 'application'
      },
      annotations: {
        'description': 'Role with read-write permissions for pods and services'
      }
    },
    rules: [
      {
        apiGroups: [''],
        resources: ['pods', 'services'],
        verbs: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete']
      },
      {
        apiGroups: ['apps'],
        resources: ['deployments'],
        verbs: ['get', 'list', 'watch']
      },
      {
        apiGroups: [''],
        resources: ['configmaps', 'secrets'],
        verbs: ['get', 'list'],
        resourceNames: [`${config.serviceAccount.appName}-config`, `${config.serviceAccount.appName}-secrets`]
      }
    ]
  };
};

const generateDemoClusterRole = (config: DemoConfig): ClusterRole => {
  const now = Date.now();
  const randomId = Math.random().toString(36).substr(2, 9);
  
  return {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'ClusterRole',
    metadata: {
      name: config.clusterRole.name,
      uid: `clusterrole-${randomId}-${Math.random().toString(36).substr(2, 9)}`,
      creationTimestamp: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
      labels: {
        'component': 'controller',
        'type': 'system'
      },
      annotations: {
        'description': 'Cluster role for system controller with node access'
      }
    },
    rules: [
      {
        apiGroups: [''],
        resources: ['nodes'],
        verbs: ['get', 'list', 'watch']
      },
      {
        apiGroups: [''],
        resources: ['namespaces'],
        verbs: ['get', 'list', 'watch', 'create']
      },
      {
        apiGroups: ['*'],
        resources: ['*'],
        verbs: ['*']
      }
    ]
  };
};

const generateDemoRoleBinding = (config: DemoConfig): RoleBinding => {
  const now = Date.now();
  const randomId = Math.random().toString(36).substr(2, 9);
  
  return {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'RoleBinding',
    metadata: {
      name: `${config.role.name}-binding`,
      namespace: config.role.namespace,
      uid: `rolebinding-${randomId}-${Math.random().toString(36).substr(2, 9)}`,
      creationTimestamp: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      labels: {
        'binding-type': 'application'
      },
      annotations: {
        'description': `Binds ${config.role.name} to ${config.serviceAccount.name}`
      }
    },
    roleRef: {
      apiGroup: 'rbac.authorization.k8s.io',
      kind: 'Role',
      name: config.role.name
    },
    subjects: [
      {
        kind: 'ServiceAccount',
        name: config.serviceAccount.name,
        namespace: config.serviceAccount.namespace
      },
      {
        kind: 'User',
        name: config.user.name,
        apiGroup: 'rbac.authorization.k8s.io'
      },
      {
        kind: 'Group',
        name: config.group.name,
        apiGroup: 'rbac.authorization.k8s.io'
      }
    ]
  };
};

const generateDemoClusterRoleBinding = (config: DemoConfig): ClusterRoleBinding => {
  const now = Date.now();
  const randomId = Math.random().toString(36).substr(2, 9);
  const controllerName = import.meta.env.VITE_DEMO_CONTROLLER_NAME || 'system-controller';
  
  return {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'ClusterRoleBinding',
    metadata: {
      name: `${config.clusterRole.name}-binding`,
      uid: `clusterrolebinding-${randomId}-${Math.random().toString(36).substr(2, 9)}`,
      creationTimestamp: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      labels: {
        'binding-type': 'system'
      },
      annotations: {
        'description': 'Binds cluster role to system controller'
      }
    },
    roleRef: {
      apiGroup: 'rbac.authorization.k8s.io',
      kind: 'ClusterRole',
      name: config.clusterRole.name
    },
    subjects: [
      {
        kind: 'ServiceAccount',
        name: controllerName,
        namespace: 'kube-system'
      }
    ]
  };
};

const RBACDemo: React.FC = () => {
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [selectedResourceType, setSelectedResourceType] = useState<RBACResourceType | null>(null);
  
  // Generate demo resources dynamically
  const demoConfig = getDemoConfig();
  const demoServiceAccount = generateDemoServiceAccount(demoConfig);
  const demoRole = generateDemoRole(demoConfig);
  const demoClusterRole = generateDemoClusterRole(demoConfig);
  const demoRoleBinding = generateDemoRoleBinding(demoConfig);
  const demoClusterRoleBinding = generateDemoClusterRoleBinding(demoConfig);

  const handleViewDetails = (resource: any, resourceType: RBACResourceType) => {
    setSelectedResource(resource);
    setSelectedResourceType(resourceType);
    setDetailDialogOpen(true);
  };

  const demoCards = [
    {
      title: 'Service Account',
      description: 'View detailed information about service accounts including tokens and secrets',
      icon: <ServiceAccountIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      resource: demoServiceAccount,
      resourceType: 'serviceaccount' as const,
      color: 'primary'
    },
    {
      title: 'Role (Namespace)',
      description: 'Examine role permissions and rules within a specific namespace',
      icon: <SecurityIcon sx={{ fontSize: 40, color: 'secondary.main' }} />,
      resource: demoRole,
      resourceType: 'role' as const,
      color: 'secondary'
    },
    {
      title: 'ClusterRole (Global)',
      description: 'Review cluster-wide permissions and administrative access',
      icon: <SecurityIcon sx={{ fontSize: 40, color: 'error.main' }} />,
      resource: demoClusterRole,
      resourceType: 'clusterrole' as const,
      color: 'error'
    },
    {
      title: 'Role Binding',
      description: 'See how roles are bound to users, groups, and service accounts',
      icon: <GroupIcon sx={{ fontSize: 40, color: 'success.main' }} />,
      resource: demoRoleBinding,
      resourceType: 'rolebinding' as const,
      color: 'success'
    },
    {
      title: 'ClusterRole Binding',
      description: 'View cluster-wide role assignments and subjects',
      icon: <GroupIcon sx={{ fontSize: 40, color: 'warning.main' }} />,
      resource: demoClusterRoleBinding,
      resourceType: 'clusterrolebinding' as const,
      color: 'warning'
    }
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        RBAC Resource Detail View Demo
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        This demonstration showcases the detailed view functionality for various RBAC resources. 
        Click "View Details" on any card below to see comprehensive information about the resource 
        including metadata, permissions, subjects, and more.
      </Alert>

      <Grid container spacing={3}>
        {demoCards.map((card, index) => (
          <Grid item xs={12} md={6} lg={4} key={index}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  {card.icon}
                  <Box ml={2}>
                    <Typography variant="h6" component="h2">
                      {card.title}
                    </Typography>
                    <Chip 
                      label={card.resourceType.toUpperCase()}
                      size="small"
                      color={card.color as any}
                      variant="outlined"
                    />
                  </Box>
                </Box>
                
                <Typography variant="body2" color="textSecondary" paragraph>
                  {card.description}
                </Typography>
                
                <Box mt={2}>
                  <Typography variant="caption" color="textSecondary" display="block">
                    <strong>Resource:</strong> {card.resource.metadata?.name}
                  </Typography>
                  {card.resource.metadata?.namespace && (
                    <Typography variant="caption" color="textSecondary" display="block">
                      <strong>Namespace:</strong> {card.resource.metadata.namespace}
                    </Typography>
                  )}
                </Box>
              </CardContent>
              
              <Box p={2} pt={0}>
                <Button
                  variant="contained"
                  color={card.color as any}
                  fullWidth
                  startIcon={<VisibilityIcon />}
                  onClick={() => handleViewDetails(card.resource, card.resourceType)}
                >
                  View Details
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box mt={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Feature Highlights
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Service Accounts & Roles
                </Typography>
                <ul>
                  <li>Complete metadata with labels and annotations</li>
                  <li>Token configuration and security settings</li>
                  <li>Associated secrets and image pull secrets</li>
                  <li>Detailed permission rules with visual indicators</li>
                  <li>Age calculation and creation timestamps</li>
                </ul>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="secondary" gutterBottom>
                  Role Bindings & Security
                </Typography>
                <ul>
                  <li>Subject details (Users, Groups, Service Accounts)</li>
                  <li>Role reference information</li>
                  <li>Scope indicators (Namespace vs Cluster-wide)</li>
                  <li>Risk assessment for privileged permissions</li>
                  <li>Interactive permission matrix</li>
                </ul>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>

      {/* Detail Dialog */}
      <RBACResourceDetailDialog
        open={detailDialogOpen}
        onClose={() => {
          setDetailDialogOpen(false);
          setSelectedResource(null);
          setSelectedResourceType(null);
        }}
        resource={selectedResource}
        resourceType={selectedResourceType!}
      />
    </Box>
  );
};

export default RBACDemo;