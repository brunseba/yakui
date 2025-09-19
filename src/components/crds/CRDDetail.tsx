import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Divider
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  Extension as ExtensionIcon,
  Code as CodeIcon,
  Storage as StorageIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  Schema as SchemaIcon,
  ViewList as InstancesIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { kubernetesService } from '../../services/kubernetes-api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ paddingTop: '16px' }}>
    {value === index && children}
  </div>
);

const CRDDetail: React.FC = () => {
  const { name: encodedName } = useParams<{ name: string }>();
  const navigate = useNavigate();
  
  // Decode the URL-encoded name
  const name = encodedName ? decodeURIComponent(encodedName) : undefined;
  
  const [crdDetails, setCrdDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (name) {
      fetchCRDDetails();
    }
  }, [name]);

  const fetchCRDDetails = async () => {
    if (!name) return;

    try {
      setLoading(true);
      setError(null);
      const details = await kubernetesService.getCRDDetails(name);
      setCrdDetails(details);
    } catch (err) {
      console.error('Failed to fetch CRD details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load CRD details');
    } finally {
      setLoading(false);
    }
  };

  const formatAge = (timestamp?: string) => {
    if (!timestamp) return 'Unknown';
    
    const created = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) return `${diffDays}d ${diffHours}h`;
    if (diffHours > 0) return `${diffHours}h ${diffMinutes}m`;
    return `${diffMinutes}m`;
  };

  const getConditionStatus = (condition: any) => {
    if (condition.status === 'True') return 'success';
    if (condition.status === 'False') return 'error';
    return 'warning';
  };

  const getConditionIcon = (condition: any) => {
    if (condition.status === 'True') return <CheckCircleIcon color="success" />;
    if (condition.status === 'False') return <ErrorIcon color="error" />;
    return <WarningIcon color="warning" />;
  };

  if (loading) {
    return (
      <Box>
        <Box display="flex" alignItems="center" mb={3}>
          <IconButton onClick={() => navigate('/crds')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">
            Loading CRD Details...
          </Typography>
        </Box>
        <LinearProgress />
      </Box>
    );
  }

  if (error || !crdDetails) {
    return (
      <Box>
        <Box display="flex" alignItems="center" mb={3}>
          <IconButton onClick={() => navigate('/crds')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">
            CRD Details
          </Typography>
        </Box>
        <Alert severity="error">
          {error || 'CRD not found'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center">
          <IconButton onClick={() => navigate('/crds')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">
            {crdDetails.spec?.names?.kind || name}
          </Typography>
          <Chip 
            label={crdDetails.spec?.scope || 'Unknown'} 
            color={crdDetails.spec?.scope === 'Cluster' ? 'primary' : 'secondary'}
            size="small" 
            sx={{ ml: 2 }} 
          />
          <Chip 
            label={`${crdDetails.instances || 0} instances`} 
            color="info" 
            size="small" 
            sx={{ ml: 1 }} 
          />
        </Box>
        
        <Box display="flex" gap={1}>
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchCRDDetails}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ExtensionIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6">{crdDetails.spec?.names?.kind}</Typography>
              <Typography variant="body2" color="textSecondary">Kind</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <InstancesIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4">{crdDetails.instances || 0}</Typography>
              <Typography variant="body2" color="textSecondary">Instances</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <StorageIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6">{crdDetails.spec?.scope}</Typography>
              <Typography variant="body2" color="textSecondary">Scope</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <SchemaIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6">{crdDetails.schema?.version || 'v1'}</Typography>
              <Typography variant="body2" color="textSecondary">Version</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Basic Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Basic Information</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">Group</Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                {crdDetails.spec?.group}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">Plural Name</Typography>
              <Typography variant="body1">
                {crdDetails.spec?.names?.plural}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">Singular Name</Typography>
              <Typography variant="body1">
                {crdDetails.spec?.names?.singular}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">Created</Typography>
              <Typography variant="body1">
                {formatAge(crdDetails.metadata?.creationTimestamp)} ago
              </Typography>
            </Grid>
            {crdDetails.spec?.names?.shortNames && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">Short Names</Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {crdDetails.spec.names.shortNames.map((shortName: string) => (
                    <Chip key={shortName} label={shortName} size="small" variant="outlined" />
                  ))}
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Status Conditions */}
      {crdDetails.conditions && crdDetails.conditions.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Conditions</Typography>
            <List>
              {crdDetails.conditions.map((condition: any, index: number) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    {getConditionIcon(condition)}
                  </ListItemIcon>
                  <ListItemText
                    primary={condition.type}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          {condition.message || condition.reason}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Last transition: {formatAge(condition.lastTransitionTime)} ago
                        </Typography>
                      </Box>
                    }
                  />
                  <Chip
                    label={condition.status}
                    size="small"
                    color={getConditionStatus(condition)}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Tabbed Content */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label={`Instances (${crdDetails.sampleInstances?.length || 0})`} />
            <Tab label={`Schema (${crdDetails.schema?.properties?.length || 0})`} />
            <Tab label="Versions" />
          </Tabs>
        </Box>

        {/* Instances Tab */}
        <TabPanel value={tabValue} index={0}>
          <CardContent>
            {crdDetails.sampleInstances && crdDetails.sampleInstances.length > 0 ? (
              <Box>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Showing sample instances (total: {crdDetails.instances})
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        {crdDetails.spec?.scope === 'Namespaced' && <TableCell>Namespace</TableCell>}
                        <TableCell>Status</TableCell>
                        <TableCell>Age</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {crdDetails.sampleInstances.map((instance: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell sx={{ fontFamily: 'monospace' }}>
                            {instance.name}
                          </TableCell>
                          {crdDetails.spec?.scope === 'Namespaced' && (
                            <TableCell>
                              <Chip label={instance.namespace} size="small" variant="outlined" />
                            </TableCell>
                          )}
                          <TableCell>
                            <Chip 
                              label={typeof instance.status === 'string' ? instance.status : 'Unknown'} 
                              size="small" 
                              color="info"
                            />
                          </TableCell>
                          <TableCell>{formatAge(instance.age)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ) : (
              <Typography color="textSecondary">
                No instances found for this CRD
              </Typography>
            )}
          </CardContent>
        </TabPanel>

        {/* Schema Tab */}
        <TabPanel value={tabValue} index={1}>
          <CardContent>
            {crdDetails.schema?.properties && crdDetails.schema.properties.length > 0 ? (
              <Box>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  OpenAPI v3 Schema Properties
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Property</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Required</TableCell>
                        <TableCell>Description</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {crdDetails.schema.properties.map((property: any) => (
                        <TableRow key={property.name}>
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                            {property.name}
                          </TableCell>
                          <TableCell>
                            <Chip label={property.type} size="small" color="primary" />
                          </TableCell>
                          <TableCell>
                            {property.required ? (
                              <CheckCircleIcon color="warning" fontSize="small" />
                            ) : (
                              <Typography variant="body2" color="textSecondary">-</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="textSecondary">
                              {property.description || 'No description available'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ) : (
              <Typography color="textSecondary">
                No schema information available for this CRD
              </Typography>
            )}
          </CardContent>
        </TabPanel>

        {/* Versions Tab */}
        <TabPanel value={tabValue} index={2}>
          <CardContent>
            {crdDetails.spec?.versions && crdDetails.spec.versions.length > 0 ? (
              <List>
                {crdDetails.spec.versions.map((version: any, index: number) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CodeIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                            {version.name}
                          </Typography>
                          {version.storage && (
                            <Chip label="Storage" color="success" size="small" />
                          )}
                          {version.served && (
                            <Chip label="Served" color="info" size="small" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="textSecondary">
                          {version.deprecated ? 'Deprecated' : 'Active'}
                          {version.deprecationWarning && ` - ${version.deprecationWarning}`}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="textSecondary">
                No version information available
              </Typography>
            )}
          </CardContent>
        </TabPanel>
      </Card>
    </Box>
  );
};

export default CRDDetail;