import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Stack,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  SupervisorAccount as ServiceAccountIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Key as KeyIcon,
  Schedule as ScheduleIcon,
  Label as LabelIcon,
  Code as CodeIcon,
  Visibility as VisibilityIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import type {
  ServiceAccount,
  Role,
  ClusterRole,
  RoleBinding,
  ClusterRoleBinding,
  RBACResourceType,
  getResourceAge,
  formatTimestamp
} from '../../types/kubernetes';

interface RBACResourceDetailDialogProps {
  open: boolean;
  onClose: () => void;
  resource: ServiceAccount | Role | ClusterRole | RoleBinding | ClusterRoleBinding | null;
  resourceType: RBACResourceType;
}

const RBACResourceDetailDialog: React.FC<RBACResourceDetailDialogProps> = ({
  open,
  onClose,
  resource,
  resourceType
}) => {
  if (!resource) return null;

  // Import utility functions from the types module
  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getResourceAge = (creationTimestamp?: string) => {
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

  const renderLabelsAndAnnotations = (metadata: any) => (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Typography variant="h6" gutterBottom>
          <LabelIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Labels
        </Typography>
        <Paper variant="outlined" sx={{ p: 2, minHeight: 100 }}>
          {metadata?.labels && Object.keys(metadata.labels).length > 0 ? (
            <Box>
              {Object.entries(metadata.labels).map(([key, value]) => (
                <Chip
                  key={key}
                  label={`${key}: ${value}`}
                  size="small"
                  sx={{ mr: 1, mb: 1 }}
                  variant="outlined"
                />
              ))}
            </Box>
          ) : (
            <Typography color="textSecondary" fontStyle="italic">
              No labels
            </Typography>
          )}
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Typography variant="h6" gutterBottom>
          <CodeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Annotations
        </Typography>
        <Paper variant="outlined" sx={{ p: 2, minHeight: 100 }}>
          {metadata?.annotations && Object.keys(metadata.annotations).length > 0 ? (
            <Box>
              {Object.entries(metadata.annotations).map(([key, value]) => (
                <Box key={key} sx={{ mb: 1 }}>
                  <Typography variant="caption" color="primary" display="block">
                    {key}
                  </Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                    {String(value)}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography color="textSecondary" fontStyle="italic">
              No annotations
            </Typography>
          )}
        </Paper>
      </Grid>
    </Grid>
  );

  const renderServiceAccountDetails = () => {
    const sa = resource as ServiceAccount;
    
    return (
      <Box>
        {/* Basic Information */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <ServiceAccountIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Service Account Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Name</Typography>
                <Typography variant="body1">{sa.metadata?.name}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Namespace</Typography>
                <Chip label={sa.metadata?.namespace || 'default'} size="small" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Created</Typography>
                <Typography variant="body1">{formatTimestamp(sa.metadata?.creationTimestamp)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Age</Typography>
                <Typography variant="body1">{getResourceAge(sa.metadata?.creationTimestamp)}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">UID</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {sa.metadata?.uid}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Token Settings */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <KeyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Token Configuration
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box display="flex" alignItems="center">
                  <Typography variant="subtitle2" sx={{ mr: 2 }}>
                    Auto-mount Service Account Token:
                  </Typography>
                  <Chip
                    label={sa.automountServiceAccountToken !== false ? 'Enabled' : 'Disabled'}
                    color={sa.automountServiceAccountToken !== false ? 'success' : 'warning'}
                    size="small"
                  />
                </Box>
              </Grid>
              {sa.secrets && sa.secrets.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Associated Secrets
                  </Typography>
                  <List dense>
                    {sa.secrets.map((secret, index) => (
                      <ListItem key={index} sx={{ py: 0.5 }}>
                        <ListItemIcon>
                          <LockIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={secret.name} />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              )}
              {sa.imagePullSecrets && sa.imagePullSecrets.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Image Pull Secrets
                  </Typography>
                  <List dense>
                    {sa.imagePullSecrets.map((secret, index) => (
                      <ListItem key={index} sx={{ py: 0.5 }}>
                        <ListItemIcon>
                          <LockIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={secret.name} />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>

        {/* Labels and Annotations */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Metadata</Typography>
            {renderLabelsAndAnnotations(sa.metadata)}
          </CardContent>
        </Card>
      </Box>
    );
  };

  const renderRoleDetails = () => {
    const role = resource as Role | ClusterRole;
    const isClusterRole = resourceType === 'clusterrole';

    return (
      <Box>
        {/* Basic Information */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              {isClusterRole ? 'Cluster Role' : 'Role'} Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Name</Typography>
                <Typography variant="body1">{role.metadata?.name}</Typography>
              </Grid>
              {!isClusterRole && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Namespace</Typography>
                  <Chip label={role.metadata?.namespace || 'default'} size="small" />
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Created</Typography>
                <Typography variant="body1">{formatTimestamp(role.metadata?.creationTimestamp)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Age</Typography>
                <Typography variant="body1">{getResourceAge(role.metadata?.creationTimestamp)}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Scope</Typography>
                <Chip
                  label={isClusterRole ? 'Cluster-wide' : 'Namespace-scoped'}
                  color={isClusterRole ? 'secondary' : 'primary'}
                  size="small"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Rules */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <VisibilityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Permissions Rules ({role.rules?.length || 0})
            </Typography>
            {role.rules && role.rules.length > 0 ? (
              <Box>
                {role.rules.map((rule, index) => (
                  <Accordion key={index} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">
                        Rule {index + 1}
                        {rule.verbs?.includes('*') && (
                          <Chip 
                            label="Full Access" 
                            color="error" 
                            size="small" 
                            sx={{ ml: 1 }} 
                          />
                        )}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                            API Groups
                          </Typography>
                          <Box>
                            {rule.apiGroups?.map((group, i) => (
                              <Chip
                                key={i}
                                label={group === '' ? '(core)' : group}
                                size="small"
                                sx={{ mr: 0.5, mb: 0.5 }}
                                color="primary"
                                variant="outlined"
                              />
                            )) || <Typography variant="body2" color="textSecondary">None</Typography>}
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                            Resources
                          </Typography>
                          <Box>
                            {rule.resources?.map((resource, i) => (
                              <Chip
                                key={i}
                                label={resource}
                                size="small"
                                sx={{ mr: 0.5, mb: 0.5 }}
                                color="info"
                                variant="outlined"
                              />
                            )) || <Typography variant="body2" color="textSecondary">None</Typography>}
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                            Verbs
                          </Typography>
                          <Box>
                            {rule.verbs?.map((verb, i) => (
                              <Chip
                                key={i}
                                label={verb}
                                size="small"
                                sx={{ mr: 0.5, mb: 0.5 }}
                                color={verb === '*' ? 'error' : 'success'}
                                variant={verb === '*' ? 'filled' : 'outlined'}
                              />
                            )) || <Typography variant="body2" color="textSecondary">None</Typography>}
                          </Box>
                        </Grid>
                        {rule.resourceNames && rule.resourceNames.length > 0 && (
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                              Resource Names
                            </Typography>
                            <Box>
                              {rule.resourceNames.map((name, i) => (
                                <Chip
                                  key={i}
                                  label={name}
                                  size="small"
                                  sx={{ mr: 0.5, mb: 0.5 }}
                                  color="warning"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          </Grid>
                        )}
                        {rule.nonResourceURLs && rule.nonResourceURLs.length > 0 && (
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                              Non-Resource URLs
                            </Typography>
                            <Box>
                              {rule.nonResourceURLs.map((url, i) => (
                                <Chip
                                  key={i}
                                  label={url}
                                  size="small"
                                  sx={{ mr: 0.5, mb: 0.5 }}
                                  color="secondary"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          </Grid>
                        )}
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            ) : (
              <Alert severity="info">This role has no permission rules defined.</Alert>
            )}
          </CardContent>
        </Card>

        {/* Labels and Annotations */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Metadata</Typography>
            {renderLabelsAndAnnotations(role.metadata)}
          </CardContent>
        </Card>
      </Box>
    );
  };

  const renderRoleBindingDetails = () => {
    const binding = resource as RoleBinding | ClusterRoleBinding;
    const isClusterBinding = resourceType === 'clusterrolebinding';

    return (
      <Box>
        {/* Basic Information */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <GroupIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              {isClusterBinding ? 'Cluster Role Binding' : 'Role Binding'} Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Name</Typography>
                <Typography variant="body1">{binding.metadata?.name}</Typography>
              </Grid>
              {!isClusterBinding && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Namespace</Typography>
                  <Chip label={binding.metadata?.namespace || 'default'} size="small" />
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Created</Typography>
                <Typography variant="body1">{formatTimestamp(binding.metadata?.creationTimestamp)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Age</Typography>
                <Typography variant="body1">{getResourceAge(binding.metadata?.creationTimestamp)}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Scope</Typography>
                <Chip
                  label={isClusterBinding ? 'Cluster-wide' : 'Namespace-scoped'}
                  color={isClusterBinding ? 'secondary' : 'primary'}
                  size="small"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Role Reference */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Role Reference
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" color="textSecondary">Kind</Typography>
                <Chip 
                  label={binding.roleRef.kind} 
                  color={binding.roleRef.kind === 'ClusterRole' ? 'secondary' : 'primary'}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" color="textSecondary">Name</Typography>
                <Typography variant="body1">{binding.roleRef.name}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" color="textSecondary">API Group</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {binding.roleRef.apiGroup}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Subjects */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <GroupIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Subjects ({binding.subjects?.length || 0})
            </Typography>
            {binding.subjects && binding.subjects.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Kind</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Namespace</TableCell>
                      <TableCell>API Group</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {binding.subjects.map((subject, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            {subject.kind === 'ServiceAccount' && <ServiceAccountIcon sx={{ mr: 1 }} fontSize="small" />}
                            {subject.kind === 'User' && <PersonIcon sx={{ mr: 1 }} fontSize="small" />}
                            {subject.kind === 'Group' && <GroupIcon sx={{ mr: 1 }} fontSize="small" />}
                            <Chip 
                              label={subject.kind} 
                              size="small"
                              color={
                                subject.kind === 'ServiceAccount' ? 'primary' :
                                subject.kind === 'User' ? 'info' : 'secondary'
                              }
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{subject.name}</Typography>
                        </TableCell>
                        <TableCell>
                          {subject.namespace ? (
                            <Chip label={subject.namespace} size="small" variant="outlined" />
                          ) : (
                            <Typography variant="body2" color="textSecondary">-</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {subject.apiGroup || '-'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="warning">This binding has no subjects defined.</Alert>
            )}
          </CardContent>
        </Card>

        {/* Labels and Annotations */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Metadata</Typography>
            {renderLabelsAndAnnotations(binding.metadata)}
          </CardContent>
        </Card>
      </Box>
    );
  };

  const getDialogTitle = () => {
    const name = resource.metadata?.name || 'Unknown';
    const namespace = resource.metadata?.namespace;
    
    switch (resourceType) {
      case 'serviceaccount':
        return `Service Account: ${namespace}/${name}`;
      case 'role':
        return `Role: ${namespace}/${name}`;
      case 'clusterrole':
        return `Cluster Role: ${name}`;
      case 'rolebinding':
        return `Role Binding: ${namespace}/${name}`;
      case 'clusterrolebinding':
        return `Cluster Role Binding: ${name}`;
      default:
        return `Resource: ${name}`;
    }
  };

  const renderContent = () => {
    switch (resourceType) {
      case 'serviceaccount':
        return renderServiceAccountDetails();
      case 'role':
      case 'clusterrole':
        return renderRoleDetails();
      case 'rolebinding':
      case 'clusterrolebinding':
        return renderRoleBindingDetails();
      default:
        return <Typography>Unknown resource type</Typography>;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{getDialogTitle()}</Typography>
          <Tooltip title="Close">
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ maxHeight: '70vh' }}>
        {renderContent()}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default RBACResourceDetailDialog;