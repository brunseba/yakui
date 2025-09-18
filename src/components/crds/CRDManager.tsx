import React, { useEffect, useState } from 'react';
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
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Extension as ExtensionIcon,
  Schema as SchemaIcon,
  Visibility as VisibilityIcon,
  Storage as StorageIcon,
  Public as PublicIcon,
  Language as LanguageIcon
} from '@mui/icons-material';
import { kubernetesService } from '../../services/kubernetes';
import { CRDWithInstances } from '../../types';

const CRDManager: React.FC = () => {
  const [crds, setCrds] = useState<CRDWithInstances[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCRD, setSelectedCRD] = useState<CRDWithInstances | null>(null);

  useEffect(() => {
    fetchCRDs();
  }, []);

  const fetchCRDs = async () => {
    try {
      setLoading(true);
      const crdsData = await kubernetesService.getCRDs();
      setCrds(crdsData);
    } catch (err) {
      console.error('Failed to fetch CRDs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load CRDs');
    } finally {
      setLoading(false);
    }
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

  const getScopeColor = (scope: string) => {
    return scope === 'Cluster' ? 'primary' : 'secondary';
  };

  const groupCRDsByGroup = (crds: CRDWithInstances[]) => {
    const groups: Record<string, CRDWithInstances[]> = {};
    
    crds.forEach(crd => {
      const group = crd.spec?.group || 'core';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(crd);
    });

    return groups;
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Custom Resource Definitions
        </Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Custom Resource Definitions
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  const crdGroups = groupCRDsByGroup(crds);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Custom Resource Definitions
      </Typography>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="primary">
              {crds.length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Total CRDs
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="success.main">
              {crds.filter(crd => crd.scope === 'Cluster').length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Cluster Scoped
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="secondary.main">
              {crds.filter(crd => crd.scope === 'Namespaced').length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Namespaced
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="info.main">
              {Object.keys(crdGroups).length}
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
            CRDs by API Group
          </Typography>

          {Object.entries(crdGroups).map(([group, groupCrds]) => (
            <Accordion key={group} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" alignItems="center" width="100%">
                  <ExtensionIcon sx={{ mr: 1 }} />
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    {group}
                  </Typography>
                  <Chip 
                    label={`${groupCrds.length} resources`} 
                    size="small" 
                    sx={{ mr: 2 }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Kind</TableCell>
                        <TableCell>Scope</TableCell>
                        <TableCell>Versions</TableCell>
                        <TableCell>Instances</TableCell>
                        <TableCell>Age</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {groupCrds.map((crd) => (
                        <TableRow key={crd.metadata?.name} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                              {crd.spec?.names?.plural}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {crd.metadata?.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {crd.spec?.names?.kind}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={crd.scope}
                              size="small"
                              color={getScopeColor(crd.scope) as any}
                              icon={crd.scope === 'Cluster' ? <PublicIcon /> : <LanguageIcon />}
                            />
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={0.5} flexWrap="wrap">
                              {crd.spec?.versions?.map((version) => (
                                <Chip
                                  key={version.name}
                                  label={version.name}
                                  size="small"
                                  variant={version.served ? 'filled' : 'outlined'}
                                  color={version.storage ? 'primary' : 'default'}
                                />
                              ))}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={crd.instances || 0}
                              size="small"
                              color={crd.instances && crd.instances > 0 ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatAge(crd.metadata?.creationTimestamp)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={() => setSelectedCRD(crd)}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
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

      {/* CRD Details Panel */}
      {selectedCRD && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              CRD Details: {selectedCRD.spec?.names?.kind}
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Basic Information
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <ExtensionIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Name"
                      secondary={selectedCRD.metadata?.name}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <SchemaIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Kind"
                      secondary={selectedCRD.spec?.names?.kind}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <StorageIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Plural"
                      secondary={selectedCRD.spec?.names?.plural}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <PublicIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Scope"
                      secondary={selectedCRD.scope}
                    />
                  </ListItem>
                </List>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Versions
                </Typography>
                <List dense>
                  {selectedCRD.spec?.versions?.map((version) => (
                    <ListItem key={version.name}>
                      <ListItemText
                        primary={version.name}
                        secondary={
                          <Box display="flex" gap={1}>
                            <Chip
                              label={version.served ? 'Served' : 'Not Served'}
                              size="small"
                              color={version.served ? 'success' : 'error'}
                            />
                            {version.storage && (
                              <Chip
                                label="Storage"
                                size="small"
                                color="primary"
                              />
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>
            </Grid>

            {selectedCRD.spec?.names && (
              <Box mt={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Name Variations
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  <Chip label={`Singular: ${selectedCRD.spec.names.singular}`} variant="outlined" />
                  <Chip label={`Plural: ${selectedCRD.spec.names.plural}`} variant="outlined" />
                  {selectedCRD.spec.names.shortNames?.map((shortName) => (
                    <Chip key={shortName} label={`Short: ${shortName}`} variant="outlined" />
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default CRDManager;