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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Stack,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  GetApp as DownloadIcon,
  Upload as UploadIcon,
  History as HistoryIcon,
  Info as InfoIcon,
  PlayArrow as InstallIcon,
  Stop as UninstallIcon,
  Update as UpgradeIcon,
  Undo as RollbackIcon,
  ExpandMore as ExpandMoreIcon,
  Storage as RepoIcon,
  Extension as ChartIcon,
  Layers as ReleaseIcon
} from '@mui/icons-material';
import Editor from '@monaco-editor/react';
import { kubernetesService } from '../../services/kubernetes-api';
import * as yaml from 'js-yaml';

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
      id={`helm-tabpanel-${index}`}
      aria-labelledby={`helm-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const HelmManager: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [repositories, setRepositories] = useState<any[]>([]);
  const [charts, setCharts] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [namespaces, setNamespaces] = useState<string[]>(['default']);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('default');

  // Dialog states
  const [repoDialogOpen, setRepoDialogOpen] = useState(false);
  const [chartDialogOpen, setChartDialogOpen] = useState(false);
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [releaseDetailsDialogOpen, setReleaseDetailsDialogOpen] = useState(false);

  // Form states
  const [repoForm, setRepoForm] = useState({ name: '', url: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChart, setSelectedChart] = useState<any>(null);
  const [chartInfo, setChartInfo] = useState<any>(null);
  const [installForm, setInstallForm] = useState({
    name: '',
    chart: '',
    namespace: 'default',
    values: '',
    version: ''
  });
  const [selectedRelease, setSelectedRelease] = useState<any>(null);
  const [releaseDetails, setReleaseDetails] = useState<any>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (tabValue === 2) { // Releases tab
      fetchReleases();
    }
  }, [tabValue, selectedNamespace]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch namespaces
      const namespacesData = await kubernetesService.getNamespaces();
      const nsNames = namespacesData.map(ns => ns.metadata?.name || '').filter(Boolean);
      setNamespaces(nsNames);

      // Fetch repositories
      await fetchRepositories();

    } catch (err) {
      console.error('Failed to fetch initial data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRepositories = async () => {
    try {
      const repos = await kubernetesService.getHelmRepositories();
      setRepositories(repos);
    } catch (err) {
      console.error('Failed to fetch repositories:', err);
      setError('Failed to fetch Helm repositories');
    }
  };

  const fetchCharts = async (query: string = '') => {
    try {
      setLoading(true);
      const charts = await kubernetesService.searchHelmCharts(query);
      setCharts(charts);
    } catch (err) {
      console.error('Failed to search charts:', err);
      setError('Failed to search Helm charts');
    } finally {
      setLoading(false);
    }
  };

  const fetchReleases = async () => {
    try {
      const releases = await kubernetesService.getHelmReleases(selectedNamespace === 'all' ? undefined : selectedNamespace);
      setReleases(releases);
    } catch (err) {
      console.error('Failed to fetch releases:', err);
      setError('Failed to fetch Helm releases');
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    if (newValue === 1 && charts.length === 0) {
      fetchCharts();
    }
  };

  const handleAddRepository = async () => {
    try {
      setError(null);
      await kubernetesService.addHelmRepository(repoForm.name, repoForm.url);
      await fetchRepositories();
      setRepoDialogOpen(false);
      setRepoForm({ name: '', url: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add repository');
    }
  };

  const handleRemoveRepository = async (repoName: string) => {
    if (!window.confirm(`Are you sure you want to remove the repository "${repoName}"?`)) return;

    try {
      setError(null);
      await kubernetesService.removeHelmRepository(repoName);
      await fetchRepositories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove repository');
    }
  };

  const handleSearchCharts = () => {
    fetchCharts(searchQuery);
  };

  const handleViewChart = async (chart: any) => {
    try {
      setSelectedChart(chart);
      setLoading(true);
      
      // Parse repo/chart from name
      const [repo, chartName] = chart.name.split('/');
      const info = await kubernetesService.getHelmChartInfo(repo, chartName);
      
      setChartInfo(info);
      setInstallForm({
        ...installForm,
        chart: chart.name,
        name: chartName,
        values: info.values || ''
      });
      setChartDialogOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get chart info');
    } finally {
      setLoading(false);
    }
  };

  const handleInstallChart = async () => {
    try {
      setError(null);
      await kubernetesService.installHelmChart({
        name: installForm.name,
        chart: installForm.chart,
        namespace: installForm.namespace,
        values: installForm.values || undefined,
        version: installForm.version || undefined
      });
      
      setInstallDialogOpen(false);
      setChartDialogOpen(false);
      
      // Switch to releases tab and refresh
      setTabValue(2);
      await fetchReleases();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install chart');
    }
  };

  const handleViewRelease = async (release: any) => {
    try {
      setSelectedRelease(release);
      setLoading(true);
      
      const details = await kubernetesService.getHelmReleaseDetails(release.namespace, release.name);
      setReleaseDetails(details);
      setReleaseDetailsDialogOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get release details');
    } finally {
      setLoading(false);
    }
  };

  const handleUninstallRelease = async (release: any) => {
    if (!window.confirm(`Are you sure you want to uninstall the release "${release.name}"? This action cannot be undone.`)) return;

    try {
      setError(null);
      await kubernetesService.uninstallHelmRelease(release.namespace, release.name);
      await fetchReleases();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to uninstall release');
    }
  };

  const handleRollbackRelease = async (release: any, revision?: number) => {
    try {
      setError(null);
      await kubernetesService.rollbackHelmRelease(release.namespace, release.name, revision);
      await fetchReleases();
      setReleaseDetailsDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rollback release');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'deployed':
        return 'success';
      case 'pending-install':
      case 'pending-upgrade':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Helm Management
        </Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Helm Management
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            if (tabValue === 0) fetchRepositories();
            else if (tabValue === 1) fetchCharts(searchQuery);
            else if (tabValue === 2) fetchReleases();
          }}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab 
              icon={<RepoIcon />} 
              iconPosition="start" 
              label={<Badge badgeContent={repositories.length} color="primary">Repositories</Badge>} 
            />
            <Tab 
              icon={<ChartIcon />} 
              iconPosition="start" 
              label={<Badge badgeContent={charts.length} color="primary">Charts</Badge>} 
            />
            <Tab 
              icon={<ReleaseIcon />} 
              iconPosition="start" 
              label={<Badge badgeContent={releases.length} color="primary">Releases</Badge>} 
            />
          </Tabs>
        </Box>

        {/* Repositories Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Helm Repositories
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setRepoDialogOpen(true)}
            >
              Add Repository
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>URL</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {repositories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      <Typography variant="body2" color="textSecondary">
                        No repositories configured. Add your first repository to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  repositories.map((repo) => (
                    <TableRow key={repo.name} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {repo.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {repo.url}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Remove Repository">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleRemoveRepository(repo.name)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Charts Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box mb={3}>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Search Charts"
                variant="outlined"
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ flexGrow: 1 }}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchCharts()}
              />
              <Button
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={handleSearchCharts}
              >
                Search
              </Button>
            </Stack>
          </Box>

          <Grid container spacing={3}>
            {charts.length === 0 ? (
              <Grid item xs={12}>
                <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    No Charts Found
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Search for Helm charts from your configured repositories.
                  </Typography>
                </Paper>
              </Grid>
            ) : (
              charts.map((chart, index) => (
                <Grid item xs={12} md={6} lg={4} key={index}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" component="div" gutterBottom>
                        {chart.name.split('/')[1] || chart.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Repository: {chart.name.split('/')[0]}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Version: {chart.version}
                      </Typography>
                      <Typography variant="body2" paragraph sx={{ 
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {chart.description}
                      </Typography>
                      <Box display="flex" gap={1} mt={2}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<InfoIcon />}
                          onClick={() => handleViewChart(chart)}
                        >
                          View
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<InstallIcon />}
                          onClick={() => {
                            setInstallForm({
                              ...installForm,
                              chart: chart.name,
                              name: chart.name.split('/')[1] || chart.name
                            });
                            setInstallDialogOpen(true);
                          }}
                        >
                          Install
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        </TabPanel>

        {/* Releases Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Helm Releases
            </Typography>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Namespace</InputLabel>
              <Select
                value={selectedNamespace}
                onChange={(e) => setSelectedNamespace(e.target.value)}
              >
                <MenuItem value="all">All Namespaces</MenuItem>
                {namespaces.map((ns) => (
                  <MenuItem key={ns} value={ns}>{ns}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Namespace</TableCell>
                  <TableCell>Chart</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Updated</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {releases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="textSecondary">
                        No Helm releases found in {selectedNamespace === 'all' ? 'any namespace' : `namespace: ${selectedNamespace}`}.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  releases.map((release) => (
                    <TableRow key={`${release.namespace}-${release.name}`} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {release.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{release.namespace}</TableCell>
                      <TableCell>{release.chart}</TableCell>
                      <TableCell>{release.app_version}</TableCell>
                      <TableCell>
                        <Chip 
                          label={release.status} 
                          size="small"
                          color={getStatusColor(release.status) as any}
                        />
                      </TableCell>
                      <TableCell>{new Date(release.updated).toLocaleString()}</TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5}>
                          <Tooltip title="View Details">
                            <IconButton 
                              size="small" 
                              onClick={() => handleViewRelease(release)}
                            >
                              <InfoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Uninstall">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleUninstallRelease(release)}
                            >
                              <UninstallIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Card>

      {/* Add Repository Dialog */}
      <Dialog open={repoDialogOpen} onClose={() => setRepoDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Helm Repository</DialogTitle>
        <DialogContent>
          <TextField
            label="Repository Name"
            fullWidth
            margin="dense"
            value={repoForm.name}
            onChange={(e) => setRepoForm({ ...repoForm, name: e.target.value })}
            placeholder="e.g., stable"
          />
          <TextField
            label="Repository URL"
            fullWidth
            margin="dense"
            value={repoForm.url}
            onChange={(e) => setRepoForm({ ...repoForm, url: e.target.value })}
            placeholder="e.g., https://charts.helm.sh/stable"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRepoDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddRepository} 
            variant="contained"
            disabled={!repoForm.name || !repoForm.url}
          >
            Add Repository
          </Button>
        </DialogActions>
      </Dialog>

      {/* Chart Details Dialog */}
      <Dialog open={chartDialogOpen} onClose={() => setChartDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Chart Details: {selectedChart?.name}
        </DialogTitle>
        <DialogContent>
          {chartInfo && (
            <Box>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Chart Information</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                    {chartInfo.info}
                  </pre>
                </AccordionDetails>
              </Accordion>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Default Values</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Editor
                    height="400px"
                    language="yaml"
                    value={chartInfo.values || ''}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 12
                    }}
                  />
                </AccordionDetails>
              </Accordion>
              
              {chartInfo.readme && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">README</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                      {chartInfo.readme}
                    </pre>
                  </AccordionDetails>
                </Accordion>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChartDialogOpen(false)}>Close</Button>
          <Button 
            onClick={() => {
              setInstallForm({
                ...installForm,
                chart: selectedChart?.name || '',
                name: selectedChart?.name?.split('/')[1] || ''
              });
              setInstallDialogOpen(true);
            }}
            variant="contained"
            startIcon={<InstallIcon />}
          >
            Install Chart
          </Button>
        </DialogActions>
      </Dialog>

      {/* Install Chart Dialog */}
      <Dialog open={installDialogOpen} onClose={() => setInstallDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Install Helm Chart</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Release Name"
                fullWidth
                value={installForm.name}
                onChange={(e) => setInstallForm({ ...installForm, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Chart"
                fullWidth
                value={installForm.chart}
                onChange={(e) => setInstallForm({ ...installForm, chart: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Namespace</InputLabel>
                <Select
                  value={installForm.namespace}
                  onChange={(e) => setInstallForm({ ...installForm, namespace: e.target.value })}
                >
                  {namespaces.map((ns) => (
                    <MenuItem key={ns} value={ns}>{ns}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Version (optional)"
                fullWidth
                value={installForm.version}
                onChange={(e) => setInstallForm({ ...installForm, version: e.target.value })}
                placeholder="Latest"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Custom Values (YAML)
              </Typography>
              <Editor
                height="300px"
                language="yaml"
                value={installForm.values}
                onChange={(value) => setInstallForm({ ...installForm, values: value || '' })}
                options={{
                  minimap: { enabled: false },
                  fontSize: 12
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstallDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleInstallChart}
            variant="contained"
            disabled={!installForm.name || !installForm.chart || !installForm.namespace}
          >
            Install
          </Button>
        </DialogActions>
      </Dialog>

      {/* Release Details Dialog */}
      <Dialog open={releaseDetailsDialogOpen} onClose={() => setReleaseDetailsDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Release Details: {selectedRelease?.name}
        </DialogTitle>
        <DialogContent>
          {releaseDetails && (
            <Box>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Status</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                    {JSON.stringify(releaseDetails.status, null, 2)}
                  </pre>
                </AccordionDetails>
              </Accordion>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Values</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Editor
                    height="300px"
                    language="yaml"
                    value={yaml.dump(releaseDetails.values)}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 12
                    }}
                  />
                </AccordionDetails>
              </Accordion>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">History</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Revision</TableCell>
                          <TableCell>Updated</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Chart</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {releaseDetails.history?.map((revision: any) => (
                          <TableRow key={revision.revision}>
                            <TableCell>{revision.revision}</TableCell>
                            <TableCell>{new Date(revision.updated).toLocaleString()}</TableCell>
                            <TableCell>
                              <Chip label={revision.status} size="small" />
                            </TableCell>
                            <TableCell>{revision.chart}</TableCell>
                            <TableCell>{revision.description}</TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                startIcon={<RollbackIcon />}
                                onClick={() => handleRollbackRelease(selectedRelease, revision.revision)}
                                disabled={revision.revision === releaseDetails.history?.[0]?.revision}
                              >
                                Rollback
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReleaseDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HelmManager;