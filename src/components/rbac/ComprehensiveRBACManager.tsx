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
  AccordionDetails,
  Badge,
  Fab,
  Stack,
  TablePagination,
  Menu,
  ListItemIcon,
  Checkbox,
  FormGroup
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
  Close as CloseIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Filter as FilterIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Assessment as AssessmentIcon,
  Key as KeyIcon,
  VpnKey as TokenIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
import { rbacService, RoleCreationRequest, RoleBindingCreationRequest, ServiceAccountCreationRequest, RBACAnalysis, PermissionMatrix } from '../../services/rbacService';
import type {
  ServiceAccount,
  Role,
  ClusterRole,
  RoleBinding,
  ClusterRoleBinding,
  RBACResourceType
} from '../../types/kubernetes';
import {
  convertServiceAccounts,
  convertRoles,
  convertClusterRoles,
  convertRoleBindings,
  convertClusterRoleBindings
} from '../../utils/rbacTypeConverter';
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

const ComprehensiveRBACManager: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [serviceAccounts, setServiceAccounts] = useState<ServiceAccount[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [clusterRoles, setClusterRoles] = useState<ClusterRole[]>([]);
  const [roleBindings, setRoleBindings] = useState<RoleBinding[]>([]);
  const [clusterRoleBindings, setClusterRoleBindings] = useState<ClusterRoleBinding[]>([]);
  const [namespaces, setNamespaces] = useState<string[]>(['default']);
  const [rbacAnalysis, setRbacAnalysis] = useState<RBACAnalysis | null>(null);

  // Dialog states
  const [createSADialogOpen, setCreateSADialogOpen] = useState(false);
  const [createRoleDialogOpen, setCreateRoleDialogOpen] = useState(false);
  const [createRoleBindingDialogOpen, setCreateRoleBindingDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
  const [roleTemplateDialogOpen, setRoleTemplateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Selection states
  const [selectedRole, setSelectedRole] = useState<Role | ClusterRole | null>(null);
  const [selectedPermissionMatrix, setSelectedPermissionMatrix] = useState<PermissionMatrix>({});
  const [selectedServiceAccount, setSelectedServiceAccount] = useState<ServiceAccount | null>(null);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [selectedResourceType, setSelectedResourceType] = useState<RBACResourceType | null>(null);

  // Form states
  const [serviceAccountForm, setServiceAccountForm] = useState<ServiceAccountCreationRequest>({
    name: '',
    namespace: 'default',
    labels: {},
    annotations: {},
    automountServiceAccountToken: true,
  });

  const [roleForm, setRoleForm] = useState<RoleCreationRequest>({
    name: '',
    namespace: 'default',
    rules: [{
      apiGroups: [''],
      resources: ['pods'],
      verbs: ['get', 'list']
    }]
  });

  const [roleBindingForm, setRoleBindingForm] = useState<RoleBindingCreationRequest>({
    name: '',
    namespace: 'default',
    roleRef: {
      apiGroup: 'rbac.authorization.k8s.io',
      kind: 'Role',
      name: ''
    },
    subjects: [{
      kind: 'ServiceAccount',
      name: '',
      namespace: 'default'
    }]
  });

  // Filter and pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [namespaceFilter, setNamespaceFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Menu states
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    fetchRBACData();
    fetchNamespaces();
  }, []);

  const fetchRBACData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        serviceAccountsData,
        rolesData,
        clusterRolesData,
        roleBindingsData,
        clusterRoleBindingsData,
        analysisData
      ] = await Promise.all([
        rbacService.getServiceAccounts(),
        rbacService.getRoles(),
        rbacService.getClusterRoles(),
        rbacService.getRoleBindings(),
        rbacService.getClusterRoleBindings(),
        rbacService.performRBACAnalysis()
      ]);

      setServiceAccounts(convertServiceAccounts(serviceAccountsData));
      setRoles(convertRoles(rolesData));
      setClusterRoles(convertClusterRoles(clusterRolesData));
      setRoleBindings(convertRoleBindings(roleBindingsData));
      setClusterRoleBindings(convertClusterRoleBindings(clusterRoleBindingsData));
      setRbacAnalysis(analysisData);

    } catch (err) {
      console.error('Failed to fetch RBAC data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load RBAC data');
    } finally {
      setLoading(false);
    }
  };

  const fetchNamespaces = async () => {
    try {
      // This would fetch from kubernetesService.getNamespaces()
      // For now, using mock data
      setNamespaces(['default', 'kube-system', 'kube-public', 'production', 'staging', 'development']);
    } catch (error) {
      console.error('Failed to fetch namespaces:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPage(0); // Reset pagination when switching tabs
  };

  const handleCreateServiceAccount = async () => {
    try {
      await rbacService.createServiceAccount(serviceAccountForm);
      setCreateSADialogOpen(false);
      setServiceAccountForm({
        name: '',
        namespace: 'default',
        labels: {},
        annotations: {},
        automountServiceAccountToken: true,
      });
      await fetchRBACData();
    } catch (error) {
      setError('Failed to create service account');
    }
  };

  const handleCreateRole = async () => {
    try {
      await rbacService.createRole(roleForm);
      setCreateRoleDialogOpen(false);
      setRoleForm({
        name: '',
        namespace: 'default',
        rules: [{
          apiGroups: [''],
          resources: ['pods'],
          verbs: ['get', 'list']
        }]
      });
      await fetchRBACData();
    } catch (error) {
      setError('Failed to create role');
    }
  };

  const handleCreateRoleBinding = async () => {
    try {
      await rbacService.createRoleBinding(roleBindingForm);
      setCreateRoleBindingDialogOpen(false);
      setRoleBindingForm({
        name: '',
        namespace: 'default',
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'Role',
          name: ''
        },
        subjects: [{
          kind: 'ServiceAccount',
          name: '',
          namespace: 'default'
        }]
      });
      await fetchRBACData();
    } catch (error) {
      setError('Failed to create role binding');
    }
  };

  const handleShowPermissions = async (role: Role | ClusterRole) => {
    try {
      // Convert our browser-compatible type back to the format expected by the service
      const roleForAnalysis = {
        ...role,
        metadata: {
          ...role.metadata,
          creationTimestamp: role.metadata?.creationTimestamp 
            ? new Date(role.metadata.creationTimestamp) 
            : undefined
        }
      };
      const matrix = await rbacService.analyzePermissions(roleForAnalysis as any);
      setSelectedRole(role);
      setSelectedPermissionMatrix(matrix);
      setPermissionsDialogOpen(true);
    } catch (error) {
      setError('Failed to analyze permissions');
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, item: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItem(null);
  };

  const handleViewDetails = (resource: any, resourceType: RBACResourceType) => {
    setSelectedResource(resource);
    setSelectedResourceType(resourceType);
    setDetailDialogOpen(true);
    handleMenuClose();
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

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const filterData = (data: any[], searchTerm: string) => {
    if (!searchTerm) return data;
    return data.filter(item => 
      JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const applyNamespaceFilter = (data: any[]) => {
    if (namespaceFilter === 'all') return data;
    return data.filter(item => item.metadata?.namespace === namespaceFilter);
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          RBAC Management
        </Typography>
        <LinearProgress sx={{ mt: 2 }} />
        <Typography variant="body2" sx={{ mt: 1 }}>
          Loading RBAC resources and performing security analysis...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          RBAC Management
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchRBACData}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AssessmentIcon />}
            onClick={() => setAnalysisDialogOpen(true)}
            color="secondary"
          >
            Security Analysis
          </Button>
        </Stack>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Overview Cards */}
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

      {/* Security Alerts */}
      {rbacAnalysis && (
        <Grid container spacing={2} mb={3}>
          {rbacAnalysis.privilegedServiceAccounts.some(sa => sa.riskLevel === 'critical') && (
            <Grid item xs={12} md={6}>
              <Alert severity="error" icon={<WarningIcon />}>
                <Typography variant="subtitle2">Critical Risk Detected</Typography>
                <Typography variant="body2">
                  {rbacAnalysis.privilegedServiceAccounts.filter(sa => sa.riskLevel === 'critical').length} service accounts have critical privileges
                </Typography>
              </Alert>
            </Grid>
          )}
          {rbacAnalysis.orphanedRoles.length > 0 && (
            <Grid item xs={12} md={6}>
              <Alert severity="warning" icon={<InfoIcon />}>
                <Typography variant="subtitle2">Orphaned Roles</Typography>
                <Typography variant="body2">
                  {rbacAnalysis.orphanedRoles.length} roles are not referenced by any bindings
                </Typography>
              </Alert>
            </Grid>
          )}
        </Grid>
      )}

      {/* Filters and Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search RBAC resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Namespace</InputLabel>
                <Select
                  value={namespaceFilter}
                  onChange={(e) => setNamespaceFilter(e.target.value)}
                  label="Namespace"
                >
                  <MenuItem value="all">All Namespaces</MenuItem>
                  {namespaces.map(ns => (
                    <MenuItem key={ns} value={ns}>{ns}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={5}>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                >
                  Export
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<UploadIcon />}
                >
                  Import
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FilterIcon />}
                  onClick={() => setRoleTemplateDialogOpen(true)}
                >
                  Templates
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="RBAC tabs">
            <Tab 
              icon={<SupervisorAccountIcon />} 
              label={`Service Accounts (${serviceAccounts.length})`} 
              id="rbac-tab-0"
              aria-controls="rbac-tabpanel-0"
            />
            <Tab 
              icon={<SecurityIcon />} 
              label={`Roles (${roles.length + clusterRoles.length})`} 
              id="rbac-tab-1"
              aria-controls="rbac-tabpanel-1"
            />
            <Tab 
              icon={<GroupIcon />} 
              label={`Bindings (${roleBindings.length + clusterRoleBindings.length})`} 
              id="rbac-tab-2"
              aria-controls="rbac-tabpanel-2"
            />
            <Tab 
              icon={<AssessmentIcon />} 
              label="Analysis" 
              id="rbac-tab-3"
              aria-controls="rbac-tabpanel-3"
            />
          </Tabs>
        </Box>

        {/* Service Accounts Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Service Accounts</Typography>
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
                  <TableCell>Age</TableCell>
                  <TableCell>Tokens</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {applyNamespaceFilter(filterData(serviceAccounts, searchTerm))
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((sa) => (
                  <TableRow key={`${sa.metadata?.namespace}/${sa.metadata?.name}`}>
                    <TableCell>{sa.metadata?.name}</TableCell>
                    <TableCell>
                      <Chip 
                        label={sa.metadata?.namespace} 
                        size="small" 
                        variant="outlined" 
                      />
                    </TableCell>
                    <TableCell>{formatAge(sa.metadata?.creationTimestamp)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={`${sa.secrets?.length || 0} secrets`} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(sa, 'serviceaccount')}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, sa)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            component="div"
            count={applyNamespaceFilter(filterData(serviceAccounts, searchTerm)).length}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </TabPanel>

        {/* Roles Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Roles & Cluster Roles</Typography>
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
                {[...roles.map(r => ({...r, type: 'Role'})), ...clusterRoles.map(cr => ({...cr, type: 'ClusterRole'}))]
                  .filter(role => 
                    namespaceFilter === 'all' || role.metadata?.namespace === namespaceFilter
                  )
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((role) => (
                  <TableRow key={`${role.type}/${role.metadata?.namespace || 'cluster'}/${role.metadata?.name}`}>
                    <TableCell>{role.metadata?.name}</TableCell>
                    <TableCell>
                      <Chip 
                        label={role.type} 
                        size="small" 
                        color={role.type === 'ClusterRole' ? 'secondary' : 'primary'}
                      />
                    </TableCell>
                    <TableCell>
                      {role.metadata?.namespace ? (
                        <Chip label={role.metadata.namespace} size="small" variant="outlined" />
                      ) : (
                        <Chip label="Cluster-wide" size="small" color="secondary" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={`${role.rules?.length || 0} rules`} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>{formatAge(role.metadata?.creationTimestamp)}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(role, role.type === 'ClusterRole' ? 'clusterrole' : 'role')}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View Permissions">
                          <IconButton
                            size="small"
                            onClick={() => handleShowPermissions(role)}
                          >
                            <SecurityIcon />
                          </IconButton>
                        </Tooltip>
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, role)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Role Bindings Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Role Bindings & Cluster Role Bindings</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateRoleBindingDialogOpen(true)}
            >
              Create Binding
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Subjects</TableCell>
                  <TableCell>Namespace</TableCell>
                  <TableCell>Age</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  ...roleBindings.map(rb => ({...rb, bindingType: 'RoleBinding'})), 
                  ...clusterRoleBindings.map(crb => ({...crb, bindingType: 'ClusterRoleBinding'}))
                ]
                  .filter(binding => 
                    namespaceFilter === 'all' || binding.metadata?.namespace === namespaceFilter
                  )
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((binding) => (
                  <TableRow key={`${binding.bindingType}/${binding.metadata?.namespace || 'cluster'}/${binding.metadata?.name}`}>
                    <TableCell>{binding.metadata?.name}</TableCell>
                    <TableCell>
                      <Chip 
                        label={binding.bindingType} 
                        size="small"
                        color={binding.bindingType === 'ClusterRoleBinding' ? 'secondary' : 'primary'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={`${binding.roleRef.kind}/${binding.roleRef.name}`} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={`${binding.subjects?.length || 0} subjects`} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      {binding.metadata?.namespace ? (
                        <Chip label={binding.metadata.namespace} size="small" variant="outlined" />
                      ) : (
                        <Chip label="Cluster-wide" size="small" color="secondary" />
                      )}
                    </TableCell>
                    <TableCell>{formatAge(binding.metadata?.creationTimestamp)}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(binding, binding.bindingType === 'ClusterRoleBinding' ? 'clusterrolebinding' : 'rolebinding')}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, binding)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Analysis Tab */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>RBAC Security Analysis</Typography>
          
          {rbacAnalysis && (
            <Grid container spacing={3}>
              {/* Privileged Service Accounts */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="error">
                      Privileged Service Accounts
                    </Typography>
                    <List>
                      {rbacAnalysis.privilegedServiceAccounts.slice(0, 5).map((sa, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <AdminIcon color={getRiskLevelColor(sa.riskLevel) as any} />
                          </ListItemIcon>
                          <ListItemText
                            primary={`${sa.namespace}/${sa.name}`}
                            secondary={`${sa.permissions.length} permissions`}
                          />
                          <Chip 
                            label={sa.riskLevel} 
                            size="small" 
                            color={getRiskLevelColor(sa.riskLevel) as any}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              {/* Unused Resources */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="warning.main">
                      Unused Resources
                    </Typography>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="body2">
                          Orphaned Roles: {rbacAnalysis.orphanedRoles.length}
                        </Typography>
                        <Typography variant="body2">
                          Unused Service Accounts: {rbacAnalysis.unusedServiceAccounts.length}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </TabPanel>
      </Card>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => {
          const actions = [
            () => setCreateSADialogOpen(true),
            () => setCreateRoleDialogOpen(true),
            () => setCreateRoleBindingDialogOpen(true),
            () => setAnalysisDialogOpen(true)
          ];
          actions[tabValue]?.();
        }}
      >
        <AddIcon />
      </Fab>

      {/* Dialogs will be added in the next part due to length constraints */}
      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon><EditIcon /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedItem) {
            let resourceType: RBACResourceType;
            if (selectedItem.secrets !== undefined) {
              resourceType = 'serviceaccount';
            } else if (selectedItem.type === 'ClusterRole') {
              resourceType = 'clusterrole';
            } else if (selectedItem.type === 'Role') {
              resourceType = 'role';
            } else if (selectedItem.bindingType === 'ClusterRoleBinding') {
              resourceType = 'clusterrolebinding';
            } else {
              resourceType = 'rolebinding';
            }
            handleViewDetails(selectedItem, resourceType);
          }
        }}>
          <ListItemIcon><VisibilityIcon /></ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon><DeleteIcon /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create Service Account Dialog */}
      <Dialog open={createSADialogOpen} onClose={() => setCreateSADialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Service Account</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                value={serviceAccountForm.name}
                onChange={(e) => setServiceAccountForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Namespace</InputLabel>
                <Select
                  value={serviceAccountForm.namespace}
                  onChange={(e) => setServiceAccountForm(prev => ({ ...prev, namespace: e.target.value }))}
                  label="Namespace"
                >
                  {namespaces.map(ns => (
                    <MenuItem key={ns} value={ns}>{ns}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={serviceAccountForm.automountServiceAccountToken || false}
                    onChange={(e) => setServiceAccountForm(prev => ({ 
                      ...prev, 
                      automountServiceAccountToken: e.target.checked 
                    }))}
                  />
                }
                label="Auto-mount Service Account Token"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateSADialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateServiceAccount} 
            variant="contained"
            disabled={!serviceAccountForm.name}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Role Dialog */}
      <Dialog open={createRoleDialogOpen} onClose={() => setCreateRoleDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Create Role</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                value={roleForm.name}
                onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Namespace</InputLabel>
                <Select
                  value={roleForm.namespace}
                  onChange={(e) => setRoleForm(prev => ({ ...prev, namespace: e.target.value }))}
                  label="Namespace"
                >
                  {namespaces.map(ns => (
                    <MenuItem key={ns} value={ns}>{ns}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Rules</Typography>
              {roleForm.rules.map((rule, index) => (
                <Accordion key={index} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Rule {index + 1}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="API Groups (comma-separated)"
                          value={rule.apiGroups?.join(', ') || ''}
                          onChange={(e) => {
                            const newRules = [...roleForm.rules];
                            newRules[index] = {
                              ...newRules[index],
                              apiGroups: e.target.value.split(',').map(s => s.trim())
                            };
                            setRoleForm(prev => ({ ...prev, rules: newRules }));
                          }}
                          placeholder="e.g., '', 'apps', 'extensions'"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Resources (comma-separated)"
                          value={rule.resources?.join(', ') || ''}
                          onChange={(e) => {
                            const newRules = [...roleForm.rules];
                            newRules[index] = {
                              ...newRules[index],
                              resources: e.target.value.split(',').map(s => s.trim())
                            };
                            setRoleForm(prev => ({ ...prev, rules: newRules }));
                          }}
                          placeholder="e.g., pods, services, deployments"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Verbs (comma-separated)"
                          value={rule.verbs?.join(', ') || ''}
                          onChange={(e) => {
                            const newRules = [...roleForm.rules];
                            newRules[index] = {
                              ...newRules[index],
                              verbs: e.target.value.split(',').map(s => s.trim())
                            };
                            setRoleForm(prev => ({ ...prev, rules: newRules }));
                          }}
                          placeholder="e.g., get, list, create, update, delete"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Button
                          color="error"
                          onClick={() => {
                            const newRules = roleForm.rules.filter((_, i) => i !== index);
                            setRoleForm(prev => ({ ...prev, rules: newRules }));
                          }}
                          disabled={roleForm.rules.length === 1}
                        >
                          Remove Rule
                        </Button>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}
              <Button
                startIcon={<AddIcon />}
                onClick={() => {
                  setRoleForm(prev => ({
                    ...prev,
                    rules: [
                      ...prev.rules,
                      {
                        apiGroups: [''],
                        resources: ['pods'],
                        verbs: ['get', 'list']
                      }
                    ]
                  }));
                }}
              >
                Add Rule
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateRoleDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateRole} 
            variant="contained"
            disabled={!roleForm.name || roleForm.rules.length === 0}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Role Binding Dialog */}
      <Dialog open={createRoleBindingDialogOpen} onClose={() => setCreateRoleBindingDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Role Binding</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                value={roleBindingForm.name}
                onChange={(e) => setRoleBindingForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Namespace</InputLabel>
                <Select
                  value={roleBindingForm.namespace}
                  onChange={(e) => setRoleBindingForm(prev => ({ ...prev, namespace: e.target.value }))}
                  label="Namespace"
                >
                  {namespaces.map(ns => (
                    <MenuItem key={ns} value={ns}>{ns}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Role Reference</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Kind</InputLabel>
                <Select
                  value={roleBindingForm.roleRef.kind}
                  onChange={(e) => setRoleBindingForm(prev => ({
                    ...prev,
                    roleRef: { ...prev.roleRef, kind: e.target.value }
                  }))}
                  label="Kind"
                >
                  <MenuItem value="Role">Role</MenuItem>
                  <MenuItem value="ClusterRole">ClusterRole</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Role Name"
                value={roleBindingForm.roleRef.name}
                onChange={(e) => setRoleBindingForm(prev => ({
                  ...prev,
                  roleRef: { ...prev.roleRef, name: e.target.value }
                }))}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Subjects</Typography>
              {roleBindingForm.subjects.map((subject, index) => (
                <Card key={index} sx={{ mb: 2, p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth>
                        <InputLabel>Kind</InputLabel>
                        <Select
                          value={subject.kind}
                          onChange={(e) => {
                            const newSubjects = [...roleBindingForm.subjects];
                            newSubjects[index] = { ...newSubjects[index], kind: e.target.value };
                            setRoleBindingForm(prev => ({ ...prev, subjects: newSubjects }));
                          }}
                          label="Kind"
                        >
                          <MenuItem value="ServiceAccount">ServiceAccount</MenuItem>
                          <MenuItem value="User">User</MenuItem>
                          <MenuItem value="Group">Group</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Name"
                        value={subject.name}
                        onChange={(e) => {
                          const newSubjects = [...roleBindingForm.subjects];
                          newSubjects[index] = { ...newSubjects[index], name: e.target.value };
                          setRoleBindingForm(prev => ({ ...prev, subjects: newSubjects }));
                        }}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        label="Namespace"
                        value={subject.namespace || ''}
                        onChange={(e) => {
                          const newSubjects = [...roleBindingForm.subjects];
                          newSubjects[index] = { ...newSubjects[index], namespace: e.target.value };
                          setRoleBindingForm(prev => ({ ...prev, subjects: newSubjects }));
                        }}
                        disabled={subject.kind !== 'ServiceAccount'}
                      />
                    </Grid>
                    <Grid item xs={12} sm={1}>
                      <IconButton
                        color="error"
                        onClick={() => {
                          const newSubjects = roleBindingForm.subjects.filter((_, i) => i !== index);
                          setRoleBindingForm(prev => ({ ...prev, subjects: newSubjects }));
                        }}
                        disabled={roleBindingForm.subjects.length === 1}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Card>
              ))}
              <Button
                startIcon={<AddIcon />}
                onClick={() => {
                  setRoleBindingForm(prev => ({
                    ...prev,
                    subjects: [
                      ...prev.subjects,
                      {
                        kind: 'ServiceAccount',
                        name: '',
                        namespace: 'default'
                      }
                    ]
                  }));
                }}
              >
                Add Subject
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateRoleBindingDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateRoleBinding} 
            variant="contained"
            disabled={!roleBindingForm.name || !roleBindingForm.roleRef.name || roleBindingForm.subjects.some(s => !s.name)}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={permissionsDialogOpen} onClose={() => setPermissionsDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Permissions Analysis - {selectedRole?.metadata?.name}
        </DialogTitle>
        <DialogContent>
          {selectedRole && (
            <Box>
              <Typography variant="h6" gutterBottom>Role Details</Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>Name:</strong> {selectedRole.metadata?.name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Namespace:</strong> {selectedRole.metadata?.namespace || 'Cluster-wide'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2">
                    <strong>Created:</strong> {formatAge(selectedRole.metadata?.creationTimestamp)}
                  </Typography>
                </Grid>
              </Grid>
              
              <Typography variant="h6" gutterBottom>Rules</Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>API Groups</TableCell>
                      <TableCell>Resources</TableCell>
                      <TableCell>Verbs</TableCell>
                      <TableCell>Resource Names</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedRole.rules?.map((rule, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {rule.apiGroups?.map((group, i) => (
                            <Chip key={i} label={group || '(core)'} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                          ))}
                        </TableCell>
                        <TableCell>
                          {rule.resources?.map((resource, i) => (
                            <Chip key={i} label={resource} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                          ))}
                        </TableCell>
                        <TableCell>
                          {rule.verbs?.map((verb, i) => (
                            <Chip key={i} label={verb} size="small" color="primary" sx={{ mr: 0.5, mb: 0.5 }} />
                          ))}
                        </TableCell>
                        <TableCell>
                          {rule.resourceNames?.map((name, i) => (
                            <Chip key={i} label={name} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />
                          )) || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermissionsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Security Analysis Dialog */}
      <Dialog open={analysisDialogOpen} onClose={() => setAnalysisDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>RBAC Security Analysis Report</DialogTitle>
        <DialogContent>
          {rbacAnalysis && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="error">
                        High Risk Service Accounts
                      </Typography>
                      <List>
                        {rbacAnalysis.privilegedServiceAccounts
                          .filter(sa => sa.riskLevel === 'high' || sa.riskLevel === 'critical')
                          .slice(0, 10)
                          .map((sa, index) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <AdminIcon color={getRiskLevelColor(sa.riskLevel) as any} />
                            </ListItemIcon>
                            <ListItemText
                              primary={`${sa.namespace}/${sa.name}`}
                              secondary={`Risk: ${sa.riskLevel} - ${sa.permissions.length} permissions`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="warning.main">
                        Cleanup Recommendations
                      </Typography>
                      <Stack spacing={2}>
                        <Alert severity="warning">
                          <Typography variant="subtitle2">Orphaned Resources</Typography>
                          <Typography variant="body2">
                            {rbacAnalysis.orphanedRoles.length} roles are not referenced by any bindings
                          </Typography>
                        </Alert>
                        <Alert severity="info">
                          <Typography variant="subtitle2">Unused Service Accounts</Typography>
                          <Typography variant="body2">
                            {rbacAnalysis.unusedServiceAccounts.length} service accounts have no role bindings
                          </Typography>
                        </Alert>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnalysisDialogOpen(false)}>Close</Button>
          <Button variant="contained" color="secondary">
            Export Report
          </Button>
        </DialogActions>
      </Dialog>

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

export default ComprehensiveRBACManager;
