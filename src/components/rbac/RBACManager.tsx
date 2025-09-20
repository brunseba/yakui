import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Grid,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  SupervisorAccount as SupervisorAccountIcon,
  Security as SecurityIcon,
  Group as GroupIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { kubernetesService } from '../../services/kubernetes-api';
import type {
  ServiceAccount,
  Role,
  ClusterRole,
  RoleBinding,
  ClusterRoleBinding,
  RBACResourceType
} from '../../types/kubernetes';
import RBACResourceDetailDialog from './RBACResourceDetailDialog';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`rbac-tabpanel-${index}`}
      aria-labelledby={`rbac-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const RBACManager: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [serviceAccounts, setServiceAccounts] = useState<ServiceAccount[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [clusterRoles, setClusterRoles] = useState<ClusterRole[]>([]);
  const [roleBindings, setRoleBindings] = useState<RoleBinding[]>([]);
  const [clusterRoleBindings, setClusterRoleBindings] = useState<ClusterRoleBinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [selectedResourceType, setSelectedResourceType] = useState<RBACResourceType | null>(null);

  useEffect(() => {
    fetchRBACData();
  }, []);

  const fetchRBACData = async () => {
    try {
      setLoading(true);
      const [
        serviceAccountsData,
        rolesData,
        clusterRolesData,
        roleBindingsData,
        clusterRoleBindingsData
      ] = await Promise.all([
        kubernetesService.getServiceAccounts(),
        kubernetesService.getRoles(),
        kubernetesService.getClusterRoles(),
        kubernetesService.getRoleBindings(),
        kubernetesService.getClusterRoleBindings()
      ]);

      setServiceAccounts(serviceAccountsData);
      setRoles(rolesData);
      setClusterRoles(clusterRolesData);
      setRoleBindings(roleBindingsData);
      setClusterRoleBindings(clusterRoleBindingsData);
    } catch (err) {
      console.error('Failed to fetch RBAC data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load RBAC data');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const formatAge = (creationTimestamp?: string) => {
    if (!creationTimestamp) return 'Unknown';
    
    const created = new Date(creationTimestamp);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}d${diffHours}h`;
    } else {
      return `${diffHours}h`;
    }
  };

  const handleViewDetails = (resource: any, resourceType: RBACResourceType) => {
    setSelectedResource(resource);
    setSelectedResourceType(resourceType);
    setDetailDialogOpen(true);
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          RBAC Management
        </Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          RBAC Management
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        RBAC Management
      </Typography>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="primary">
              {serviceAccounts.length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Service Accounts
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="secondary.main">
              {roles.length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Roles
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="info.main">
              {clusterRoles.length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Cluster Roles
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="success.main">
              {roleBindings.length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Role Bindings
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main">
              {clusterRoleBindings.length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Cluster Role Bindings
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Service Accounts" />
            <Tab label="Roles" />
            <Tab label="Role Bindings" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Service Accounts
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Namespace</TableCell>
                  <TableCell>Secrets</TableCell>
                  <TableCell>Age</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {serviceAccounts.slice(0, 50).map((sa) => (
                  <TableRow key={`${sa.metadata?.namespace}-${sa.metadata?.name}`} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {sa.metadata?.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={sa.metadata?.namespace} size="small" />
                    </TableCell>
                    <TableCell>
                      {sa.secrets?.length || 0}
                    </TableCell>
                    <TableCell>
                      {formatAge(sa.metadata?.creationTimestamp)}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => handleViewDetails(sa, 'serviceaccount')}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Roles & Cluster Roles
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Namespace</TableCell>
                  <TableCell>Rules</TableCell>
                  <TableCell>Age</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[...roles.slice(0, 25), ...clusterRoles.slice(0, 25)].map((role) => (
                  <TableRow key={`${role.metadata?.namespace || 'cluster'}-${role.metadata?.name}`} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {role.metadata?.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={role.metadata?.namespace ? 'Role' : 'ClusterRole'} 
                        size="small"
                        color={role.metadata?.namespace ? 'secondary' : 'primary'}
                      />
                    </TableCell>
                    <TableCell>
                      {role.metadata?.namespace ? (
                        <Chip label={role.metadata.namespace} size="small" />
                      ) : (
                        <Chip label="Cluster" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      {role.rules?.length || 0} rules
                    </TableCell>
                    <TableCell>
                      {formatAge(role.metadata?.creationTimestamp)}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => handleViewDetails(role, role.metadata?.namespace ? 'role' : 'clusterrole')}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Role Bindings & Cluster Role Bindings
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Namespace</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Subjects</TableCell>
                  <TableCell>Age</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[...roleBindings.slice(0, 25), ...clusterRoleBindings.slice(0, 25)].map((binding) => (
                  <TableRow key={`${binding.metadata?.namespace || 'cluster'}-${binding.metadata?.name}`} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {binding.metadata?.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={binding.metadata?.namespace ? 'RoleBinding' : 'ClusterRoleBinding'} 
                        size="small"
                        color={binding.metadata?.namespace ? 'secondary' : 'primary'}
                      />
                    </TableCell>
                    <TableCell>
                      {binding.metadata?.namespace ? (
                        <Chip label={binding.metadata.namespace} size="small" />
                      ) : (
                        <Chip label="Cluster" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {binding.roleRef?.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {binding.subjects?.length || 0} subjects
                    </TableCell>
                    <TableCell>
                      {formatAge(binding.metadata?.creationTimestamp)}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => handleViewDetails(binding, binding.metadata?.namespace ? 'rolebinding' : 'clusterrolebinding')}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Card>

      {/* RBAC Resource Detail Dialog */}
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

export default RBACManager;
