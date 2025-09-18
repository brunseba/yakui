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
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  SupervisorAccount as SupervisorAccountIcon,
  Security as SecurityIcon,
  Group as GroupIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { kubernetesService } from '../../services/kubernetes';
import * as k8s from '@kubernetes/client-node';

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

interface PermissionMatrix {
  [resource: string]: {
    [verb: string]: boolean;
  };
}

interface CreateServiceAccountForm {
  name: string;
  namespace: string;
  labels: Record<string, string>;
}

interface CreateRoleForm {
  name: string;
  namespace: string;
  isClusterRole: boolean;
  rules: Array<{
    apiGroups: string[];
    resources: string[];
    verbs: string[];
    resourceNames?: string[];
  }>;
}

const EnhancedRBACManager: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [serviceAccounts, setServiceAccounts] = useState<k8s.V1ServiceAccount[]>([]);
  const [roles, setRoles] = useState<k8s.V1Role[]>([]);
  const [clusterRoles, setClusterRoles] = useState<k8s.V1ClusterRole[]>([]);
  const [roleBindings, setRoleBindings] = useState<k8s.V1RoleBinding[]>([]);
  const [clusterRoleBindings, setClusterRoleBindings] = useState<k8s.V1ClusterRoleBinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [createSADialogOpen, setCreateSADialogOpen] = useState(false);
  const [createRoleDialogOpen, setCreateRoleDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<k8s.V1Role | k8s.V1ClusterRole | null>(null);

  // Form states
  const [serviceAccountForm, setServiceAccountForm] = useState<CreateServiceAccountForm>({
    name: '',
    namespace: 'default',
    labels: {}
  });

  const [roleForm, setRoleForm] = useState<CreateRoleForm>({
    name: '',
    namespace: 'default',
    isClusterRole: false,
    rules: [{
      apiGroups: [''],
      resources: ['pods'],
      verbs: ['get', 'list']
    }]
  });

  const [namespaces, setNamespaces] = useState<string[]>(['default']);

  useEffect(() => {
    fetchRBACData();
    fetchNamespaces();
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

  const fetchNamespaces = async () => {
    try {
      const namespacesData = await kubernetesService.getNamespaces();
      setNamespaces(namespacesData.map(ns => ns.metadata?.name || '').filter(Boolean));
    } catch (error) {
      console.error('Failed to fetch namespaces:', error);
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

  const handleCreateServiceAccount = async () => {
    try {
      const saManifest: k8s.V1ServiceAccount = {
        apiVersion: 'v1',
        kind: 'ServiceAccount',
        metadata: {
          name: serviceAccountForm.name,
          namespace: serviceAccountForm.namespace,
          labels: serviceAccountForm.labels
        }
      };

      // In a real implementation, you would create the service account
      console.log('Creating Service Account:', saManifest);
      setCreateSADialogOpen(false);
      setServiceAccountForm({ name: '', namespace: 'default', labels: {} });
      await fetchRBACData();
    } catch (error) {
      console.error('Failed to create service account:', error);
    }
  };

  const handleCreateRole = async () => {
    try {
      const roleManifest: k8s.V1Role | k8s.V1ClusterRole = {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: roleForm.isClusterRole ? 'ClusterRole' : 'Role',
        metadata: {
          name: roleForm.name,
          ...(roleForm.isClusterRole ? {} : { namespace: roleForm.namespace })
        },
        rules: roleForm.rules
      };

      // In a real implementation, you would create the role
      console.log('Creating Role:', roleManifest);
      setCreateRoleDialogOpen(false);
      setRoleForm({
        name: '',
        namespace: 'default',
        isClusterRole: false,
        rules: [{ apiGroups: [''], resources: ['pods'], verbs: ['get', 'list'] }]
      });
      await fetchRBACData();
    } catch (error) {
      console.error('Failed to create role:', error);
    }
  };

  const generatePermissionsMatrix = (role: k8s.V1Role | k8s.V1ClusterRole): PermissionMatrix => {
    const matrix: PermissionMatrix = {};
    
    role.rules?.forEach(rule => {
      rule.resources?.forEach(resource => {
        if (!matrix[resource]) {
          matrix[resource] = {};
        }
        rule.verbs?.forEach(verb => {
          matrix[resource][verb] = true;
        });
      });
    });

    return matrix;
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
        Enhanced RBAC Management
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
            <Tab label="Create Resources" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Service Accounts
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateSADialogOpen(true)}
            >
              Create Service Account
            </Button>
          </Box>
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
                        <IconButton size="small">
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error">
                          <DeleteIcon fontSize="small" />
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
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Roles & Cluster Roles
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateRoleDialogOpen(true)}
            >
              Create Role
            </Button>
          </Box>
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
                      <Tooltip title="View Permissions">
                        <IconButton 
                          size="small"
                          onClick={() => {
                            setSelectedRole(role);
                            setPermissionsDialogOpen(true);
                          }}
                        >
                          <SecurityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small">
                          <EditIcon fontSize="small" />
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
                        <IconButton size="small">
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

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Create New RBAC Resources
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Quick Actions
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Create Service Account"
                        secondary="Create a new service account for application authentication"
                      />
                      <ListItemSecondaryAction>
                        <Button
                          variant="outlined"
                          onClick={() => setCreateSADialogOpen(true)}
                        >
                          Create
                        </Button>
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider />
                    <ListItem>
                      <ListItemText
                        primary="Create Role"
                        secondary="Define permissions for resources within a namespace or cluster"
                      />
                      <ListItemSecondaryAction>
                        <Button
                          variant="outlined"
                          onClick={() => setCreateRoleDialogOpen(true)}
                        >
                          Create
                        </Button>
                      </ListItemSecondaryAction>
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    RBAC Best Practices
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="• Use least privilege principle" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="• Prefer namespace-scoped roles over cluster roles" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="• Group related permissions together" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="• Use descriptive names for roles and service accounts" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="• Regularly audit permissions" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>

      {/* Create Service Account Dialog */}
      <Dialog open={createSADialogOpen} onClose={() => setCreateSADialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Service Account</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={serviceAccountForm.name}
            onChange={(e) => setServiceAccountForm({ ...serviceAccountForm, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Namespace</InputLabel>
            <Select
              value={serviceAccountForm.namespace}
              onChange={(e) => setServiceAccountForm({ ...serviceAccountForm, namespace: e.target.value })}
            >
              {namespaces.map((ns) => (
                <MenuItem key={ns} value={ns}>{ns}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateSADialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateServiceAccount} variant="contained" disabled={!serviceAccountForm.name}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Role Dialog */}
      <Dialog open={createRoleDialogOpen} onClose={() => setCreateRoleDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Role</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={roleForm.name}
            onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={roleForm.isClusterRole}
                onChange={(e) => setRoleForm({ ...roleForm, isClusterRole: e.target.checked })}
              />
            }
            label="Cluster Role (applies to all namespaces)"
            sx={{ mb: 2 }}
          />
          {!roleForm.isClusterRole && (
            <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
              <InputLabel>Namespace</InputLabel>
              <Select
                value={roleForm.namespace}
                onChange={(e) => setRoleForm({ ...roleForm, namespace: e.target.value })}
              >
                {namespaces.map((ns) => (
                  <MenuItem key={ns} value={ns}>{ns}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <Typography variant="subtitle1" gutterBottom>
            Rules
          </Typography>
          {roleForm.rules.map((rule, index) => (
            <Accordion key={index}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Rule {index + 1}: {rule.resources.join(', ')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Resources (comma-separated)"
                      fullWidth
                      value={rule.resources.join(', ')}
                      onChange={(e) => {
                        const newRules = [...roleForm.rules];
                        newRules[index] = { ...rule, resources: e.target.value.split(',').map(r => r.trim()) };
                        setRoleForm({ ...roleForm, rules: newRules });
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Verbs (comma-separated)"
                      fullWidth
                      value={rule.verbs.join(', ')}
                      onChange={(e) => {
                        const newRules = [...roleForm.rules];
                        newRules[index] = { ...rule, verbs: e.target.value.split(',').map(v => v.trim()) };
                        setRoleForm({ ...roleForm, rules: newRules });
                      }}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateRoleDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateRole} variant="contained" disabled={!roleForm.name}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permissions Matrix Dialog */}
      <Dialog open={permissionsDialogOpen} onClose={() => setPermissionsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Permissions Matrix: {selectedRole?.metadata?.name}
        </DialogTitle>
        <DialogContent>
          {selectedRole && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Rules Summary
              </Typography>
              {selectedRole.rules?.map((rule, index) => (
                <Accordion key={index}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Rule {index + 1}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant="subtitle2">API Groups:</Typography>
                        {rule.apiGroups?.map((group, i) => (
                          <Chip key={i} label={group || 'core'} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                        ))}
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="subtitle2">Resources:</Typography>
                        {rule.resources?.map((resource, i) => (
                          <Chip key={i} label={resource} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                        ))}
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="subtitle2">Verbs:</Typography>
                        {rule.verbs?.map((verb, i) => (
                          <Chip key={i} label={verb} size="small" color="primary" sx={{ mr: 0.5, mb: 0.5 }} />
                        ))}
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermissionsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnhancedRBACManager;