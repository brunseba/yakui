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

// Mock data for demonstration
const mockServiceAccount: ServiceAccount = {
  apiVersion: 'v1',
  kind: 'ServiceAccount',
  metadata: {
    name: 'demo-service-account',
    namespace: 'default',
    uid: '12345678-1234-5678-9012-123456789012',
    creationTimestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    labels: {
      'app.kubernetes.io/name': 'demo-app',
      'app.kubernetes.io/version': '1.0.0',
      'environment': 'production'
    },
    annotations: {
      'kubernetes.io/service-account.name': 'demo-service-account',
      'description': 'Service account for demo application'
    }
  },
  automountServiceAccountToken: true,
  secrets: [
    { name: 'demo-service-account-token-abc123' },
    { name: 'demo-registry-secret' }
  ],
  imagePullSecrets: [
    { name: 'demo-registry-secret' }
  ]
};

const mockRole: Role = {
  apiVersion: 'rbac.authorization.k8s.io/v1',
  kind: 'Role',
  metadata: {
    name: 'demo-role',
    namespace: 'default',
    uid: '87654321-4321-8765-2109-876543210987',
    creationTimestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    labels: {
      'app.kubernetes.io/name': 'demo-app',
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
      resourceNames: ['app-config', 'app-secrets']
    }
  ]
};

const mockClusterRole: ClusterRole = {
  apiVersion: 'rbac.authorization.k8s.io/v1',
  kind: 'ClusterRole',
  metadata: {
    name: 'demo-cluster-role',
    uid: '11223344-5566-7788-9900-112233445566',
    creationTimestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
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

const mockRoleBinding: RoleBinding = {
  apiVersion: 'rbac.authorization.k8s.io/v1',
  kind: 'RoleBinding',
  metadata: {
    name: 'demo-role-binding',
    namespace: 'default',
    uid: '99887766-5544-3322-1100-998877665544',
    creationTimestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    labels: {
      'binding-type': 'application'
    },
    annotations: {
      'description': 'Binds demo-role to demo-service-account'
    }
  },
  roleRef: {
    apiGroup: 'rbac.authorization.k8s.io',
    kind: 'Role',
    name: 'demo-role'
  },
  subjects: [
    {
      kind: 'ServiceAccount',
      name: 'demo-service-account',
      namespace: 'default'
    },
    {
      kind: 'User',
      name: 'demo-user',
      apiGroup: 'rbac.authorization.k8s.io'
    },
    {
      kind: 'Group',
      name: 'demo-group',
      apiGroup: 'rbac.authorization.k8s.io'
    }
  ]
};

const mockClusterRoleBinding: ClusterRoleBinding = {
  apiVersion: 'rbac.authorization.k8s.io/v1',
  kind: 'ClusterRoleBinding',
  metadata: {
    name: 'demo-cluster-role-binding',
    uid: '55664433-2211-0099-8877-556644332211',
    creationTimestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
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
    name: 'demo-cluster-role'
  },
  subjects: [
    {
      kind: 'ServiceAccount',
      name: 'system-controller',
      namespace: 'kube-system'
    }
  ]
};

const RBACDemo: React.FC = () => {
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [selectedResourceType, setSelectedResourceType] = useState<RBACResourceType | null>(null);

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
      resource: mockServiceAccount,
      resourceType: 'serviceaccount' as const,
      color: 'primary'
    },
    {
      title: 'Role (Namespace)',
      description: 'Examine role permissions and rules within a specific namespace',
      icon: <SecurityIcon sx={{ fontSize: 40, color: 'secondary.main' }} />,
      resource: mockRole,
      resourceType: 'role' as const,
      color: 'secondary'
    },
    {
      title: 'ClusterRole (Global)',
      description: 'Review cluster-wide permissions and administrative access',
      icon: <SecurityIcon sx={{ fontSize: 40, color: 'error.main' }} />,
      resource: mockClusterRole,
      resourceType: 'clusterrole' as const,
      color: 'error'
    },
    {
      title: 'Role Binding',
      description: 'See how roles are bound to users, groups, and service accounts',
      icon: <GroupIcon sx={{ fontSize: 40, color: 'success.main' }} />,
      resource: mockRoleBinding,
      resourceType: 'rolebinding' as const,
      color: 'success'
    },
    {
      title: 'ClusterRole Binding',
      description: 'View cluster-wide role assignments and subjects',
      icon: <GroupIcon sx={{ fontSize: 40, color: 'warning.main' }} />,
      resource: mockClusterRoleBinding,
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