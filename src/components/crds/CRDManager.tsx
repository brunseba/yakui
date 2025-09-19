import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  Tabs,
  Tab
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Extension as ExtensionIcon,
  Schema as SchemaIcon,
  Visibility as VisibilityIcon,
  Storage as StorageIcon,
  Public as PublicIcon,
  Language as LanguageIcon,
  Apps as AppsIcon,
  Security as SecurityIcon,
  Router as NetworkIcon,
  Computer as CoreIcon
} from '@mui/icons-material';
import { kubernetesService } from '../../services/kubernetes-api';
import { CRDWithInstances } from '../../types/dev';

interface KubernetesResource {
  group: string;
  version: string;
  kind: string;
  plural: string;
  namespaced: boolean;
  description: string;
  isCustom: boolean;
  crdName?: string;
}

const CRDManager: React.FC = () => {
  const navigate = useNavigate();
  const [resources, setResources] = useState<KubernetesResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const resourcesData = await kubernetesService.getKubernetesResources();
      setResources(resourcesData);
    } catch (err) {
      console.error('Failed to fetch resources:', err);
      setError(err instanceof Error ? err.message : 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  const getScopeColor = (namespaced: boolean) => {
    return namespaced ? 'secondary' : 'primary';
  };

  const getGroupIcon = (group: string) => {
    if (group === 'core') return <CoreIcon />;
    if (group.includes('apps')) return <AppsIcon />;
    if (group.includes('rbac') || group.includes('security')) return <SecurityIcon />;
    if (group.includes('networking')) return <NetworkIcon />;
    if (group.includes('extension') || group.includes('custom')) return <ExtensionIcon />;
    if (group.includes('storage')) return <StorageIcon />;
    return <SchemaIcon />;
  };

  const groupResourcesByGroup = (resources: KubernetesResource[]) => {
    const groups: Record<string, KubernetesResource[]> = {};
    
    resources.forEach(resource => {
      const group = resource.group || 'core';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(resource);
    });

    return groups;
  };

  const filterResources = (resources: KubernetesResource[]) => {
    if (tabValue === 0) return resources; // All resources
    if (tabValue === 1) return resources.filter(r => !r.isCustom); // Core resources
    if (tabValue === 2) return resources.filter(r => r.isCustom); // Custom resources
    return resources;
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Kubernetes Resources
        </Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Kubernetes Resources
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  const filteredResources = filterResources(resources);
  const resourceGroups = groupResourcesByGroup(filteredResources);
  const coreResources = resources.filter(r => !r.isCustom);
  const customResources = resources.filter(r => r.isCustom);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Kubernetes Resources
      </Typography>

      {/* Tabs for filtering */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label={`All Resources (${resources.length})`} />
          <Tab label={`Core Resources (${coreResources.length})`} />
          <Tab label={`Custom Resources (${customResources.length})`} />
        </Tabs>
      </Box>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="primary">
              {filteredResources.length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {tabValue === 0 ? 'Total Resources' : tabValue === 1 ? 'Core Resources' : 'Custom Resources'}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="success.main">
              {filteredResources.filter(resource => !resource.namespaced).length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Cluster Scoped
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="secondary.main">
              {filteredResources.filter(resource => resource.namespaced).length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Namespaced
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="info.main">
              {Object.keys(resourceGroups).length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              API Groups
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Resources by API Group
          </Typography>

          {Object.entries(resourceGroups).map(([group, groupResources]) => (
            <Accordion key={group} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" alignItems="center" width="100%">
                  {getGroupIcon(group)}
                  <Box sx={{ ml: 1, flexGrow: 1 }}>
                    <Typography variant="h6">
                      {group}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {group === 'core' ? 'Core Kubernetes API' : 
                       groupResources.some(r => r.isCustom) ? 'Custom Resources' : 'Extended API'}
                    </Typography>
                  </Box>
                  <Chip 
                    label={`${groupResources.length} resources`} 
                    size="small" 
                    color={group === 'core' ? 'primary' : groupResources.some(r => r.isCustom) ? 'secondary' : 'default'}
                    sx={{ mr: 2 }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Resource</TableCell>
                        <TableCell>Kind</TableCell>
                        <TableCell>Version</TableCell>
                        <TableCell>Scope</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {groupResources.map((resource) => (
                        <TableRow key={`${resource.group}-${resource.kind}`} hover>
                          <TableCell>
                            <Box>
                              <Typography 
                                variant="body2" 
                                sx={{ fontWeight: 'medium' }}
                              >
                                {resource.plural}
                              </Typography>
                              <Typography 
                                variant="caption" 
                                color="textSecondary"
                              >
                                {resource.description}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {resource.kind}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={resource.version}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={resource.namespaced ? 'Namespaced' : 'Cluster'}
                              size="small"
                              color={getScopeColor(resource.namespaced) as any}
                              icon={resource.namespaced ? <LanguageIcon /> : <PublicIcon />}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={resource.isCustom ? 'Custom' : 'Core'}
                              size="small"
                              color={resource.isCustom ? 'secondary' : 'primary'}
                              variant={resource.isCustom ? 'filled' : 'outlined'}
                            />
                          </TableCell>
                          <TableCell>
                            {resource.isCustom && resource.crdName ? (
                              <Tooltip title="View CRD Details">
                                <IconButton
                                  size="small"
                                  onClick={() => navigate(`/crds/${encodeURIComponent(resource.crdName || '')}`)}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Tooltip title="Core Kubernetes resource">
                                <IconButton size="small" disabled>
                                  <SchemaIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          ))}
        </CardContent>
      </Card>

    </Box>
  );
};

export default CRDManager;