import React, { useEffect, useState, useRef } from 'react';
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
  ListItemIcon,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete,
  FormGroup,
  Checkbox
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  GetApp as GetAppIcon,
  FilterList as FilterListIcon,
  Timeline as TimelineIcon,
  Monitor as MonitorIcon,
  Event as EventIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { kubernetesService } from '../../services/kubernetes';
import type { ClusterEvent } from '../../types';

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
      id={`monitoring-tabpanel-${index}`}
      aria-labelledby={`monitoring-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  source: string;
}

interface MetricData {
  timestamp: string;
  cpu: number;
  memory: number;
  network: number;
}

interface PodInfo {
  name: string;
  namespace: string;
  containers: string[];
}

const MonitoringDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Events state
  const [events, setEvents] = useState<ClusterEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<ClusterEvent[]>([]);
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [eventSearch, setEventSearch] = useState<string>('');

  // Logs state
  const [pods, setPods] = useState<PodInfo[]>([]);
  const [selectedPod, setSelectedPod] = useState<PodInfo | null>(null);
  const [selectedContainer, setSelectedContainer] = useState<string>('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [logLines, setLogLines] = useState<number>(1000);
  const [logLevel, setLogLevel] = useState<string>('all');

  // Metrics state
  const [metricsData, setMetricsData] = useState<MetricData[]>([]);
  const [namespaces, setNamespaces] = useState<string[]>(['default']);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('default');

  const logContainerRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetchInitialData();
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, eventFilter, eventSearch]);

  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        if (selectedPod) {
          fetchPodLogs();
        }
      }, 2000);
    } else if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, selectedPod]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [namespacesData, eventsData] = await Promise.all([
        kubernetesService.getNamespaces(),
        kubernetesService.getEvents()
      ]);

      const nsNames = namespacesData.map(ns => ns.metadata?.name || '').filter(Boolean);
      setNamespaces(nsNames);
      setEvents(eventsData);
      
      // Generate sample metrics data
      generateSampleMetrics();
    } catch (err) {
      console.error('Failed to fetch monitoring data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  };

  const generateSampleMetrics = () => {
    const now = Date.now();
    const data: MetricData[] = [];
    
    for (let i = 29; i >= 0; i--) {
      const timestamp = new Date(now - i * 60000).toISOString();
      data.push({
        timestamp,
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        network: Math.random() * 1000
      });
    }
    
    setMetricsData(data);
  };

  const fetchPodLogs = async () => {
    if (!selectedPod) return;

    try {
      // In a real implementation, you would call kubernetesService.getPodLogs
      // For demo purposes, generate sample logs
      const sampleLogs: LogEntry[] = [
        {
          timestamp: new Date().toISOString(),
          level: 'INFO',
          message: 'Application started successfully',
          source: selectedContainer || 'container'
        },
        {
          timestamp: new Date(Date.now() - 30000).toISOString(),
          level: 'WARN',
          message: 'Memory usage is high: 85%',
          source: selectedContainer || 'container'
        },
        {
          timestamp: new Date(Date.now() - 60000).toISOString(),
          level: 'ERROR',
          message: 'Failed to connect to database: connection timeout',
          source: selectedContainer || 'container'
        },
        {
          timestamp: new Date(Date.now() - 90000).toISOString(),
          level: 'DEBUG',
          message: 'Processing request ID: req-12345',
          source: selectedContainer || 'container'
        }
      ];

      setLogs(prev => [...sampleLogs, ...prev].slice(0, logLines));

      // Auto-scroll to bottom
      if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  const filterEvents = () => {
    let filtered = events;

    // Filter by type
    if (eventFilter !== 'all') {
      filtered = filtered.filter(event => event.type.toLowerCase() === eventFilter);
    }

    // Filter by search
    if (eventSearch) {
      const searchLower = eventSearch.toLowerCase();
      filtered = filtered.filter(event =>
        event.reason.toLowerCase().includes(searchLower) ||
        event.message.toLowerCase().includes(searchLower) ||
        event.object.toLowerCase().includes(searchLower)
      );
    }

    setFilteredEvents(filtered);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleViewPodLogs = (pod: PodInfo) => {
    setSelectedPod(pod);
    setSelectedContainer(pod.containers[0] || '');
    setLogs([]);
    setLogDialogOpen(true);
    fetchPodLogs();
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getEventIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <CheckCircleIcon color="success" />;
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'error';
      case 'WARN':
        return 'warning';
      case 'INFO':
        return 'info';
      case 'DEBUG':
        return 'default';
      default:
        return 'default';
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Monitoring & Logging
      </Typography>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab icon={<EventIcon />} label="Events" />
            <Tab icon={<GetAppIcon />} label="Logs" />
            <Tab icon={<TimelineIcon />} label="Metrics" />
            <Tab icon={<MonitorIcon />} label="Health" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Cluster Events
            </Typography>
            <Box display="flex" gap={2} alignItems="center">
              <TextField
                size="small"
                placeholder="Search events..."
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                sx={{ minWidth: 200 }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Filter</InputLabel>
                <Select
                  value={eventFilter}
                  onChange={(e) => setEventFilter(e.target.value)}
                >
                  <MenuItem value="all">All Events</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => kubernetesService.getEvents().then(setEvents)}
              >
                Refresh
              </Button>
            </Box>
          </Box>

          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {filteredEvents.length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Total Events
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {filteredEvents.filter(e => e.type === 'Warning').length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Warnings
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {filteredEvents.filter(e => e.type === 'Normal').length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Normal
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="info.main">
                  {Math.max(...filteredEvents.map(e => e.count))}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Max Count
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Object</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell>Count</TableCell>
                  <TableCell>First Seen</TableCell>
                  <TableCell>Last Seen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEvents.slice(0, 100).map((event, index) => (
                  <TableRow key={index} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getEventIcon(event.type)}
                        <Chip 
                          label={event.type} 
                          size="small"
                          color={event.type === 'Warning' ? 'warning' : 'success'}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {event.reason}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {event.object}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          maxWidth: 300, 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {event.message}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={event.count} size="small" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatTimestamp(event.firstTimestamp)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatTimestamp(event.lastTimestamp)}
                      </Typography>
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
              Pod Logs
            </Typography>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Namespace</InputLabel>
              <Select
                value={selectedNamespace}
                onChange={(e) => setSelectedNamespace(e.target.value)}
              >
                {namespaces.map((ns) => (
                  <MenuItem key={ns} value={ns}>{ns}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Sample pods list - in real implementation, this would come from the API */}
          <Grid container spacing={3}>
            {[
              { name: 'nginx-deployment-123', namespace: selectedNamespace, containers: ['nginx'] },
              { name: 'api-server-456', namespace: selectedNamespace, containers: ['api', 'sidecar'] },
              { name: 'database-789', namespace: selectedNamespace, containers: ['postgres'] }
            ].map((pod) => (
              <Grid item xs={12} md={4} key={pod.name}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {pod.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Namespace: {pod.namespace}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Containers: {pod.containers.join(', ')}
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleViewPodLogs(pod)}
                      sx={{ mt: 1 }}
                    >
                      View Logs
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Resource Metrics
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    CPU Usage Over Time
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metricsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                      />
                      <YAxis />
                      <RechartsTooltip 
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                        formatter={(value: number) => [`${value.toFixed(2)}%`, 'CPU Usage']}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="cpu" stroke="#8884d8" name="CPU %" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Memory Usage
                  </Typography>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={metricsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                      />
                      <YAxis />
                      <RechartsTooltip 
                        formatter={(value: number) => [`${value.toFixed(2)}%`, 'Memory Usage']}
                      />
                      <Line type="monotone" dataKey="memory" stroke="#82ca9d" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Network I/O
                  </Typography>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={metricsData.slice(-10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                      />
                      <YAxis />
                      <RechartsTooltip 
                        formatter={(value: number) => [`${value.toFixed(0)} MB/s`, 'Network I/O']}
                      />
                      <Bar dataKey="network" fill="#ffc658" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Cluster Health Overview
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    System Health
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="API Server" 
                        secondary="Healthy - Response time: 45ms" 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="etcd" 
                        secondary="Healthy - 3/3 members available" 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <WarningIcon color="warning" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Node Health" 
                        secondary="2/3 nodes ready - 1 node under maintenance" 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="DNS" 
                        secondary="Healthy - CoreDNS pods running" 
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Resource Allocation
                  </Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Used', value: 65 },
                          { name: 'Available', value: 35 }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        <Cell fill={COLORS[0]} />
                        <Cell fill={COLORS[1]} />
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>

      {/* Pod Logs Dialog */}
      <Dialog 
        open={logDialogOpen} 
        onClose={() => setLogDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{ style: { minHeight: '80vh' } }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Logs: {selectedPod?.name}
            </Typography>
            <Box display="flex" gap={1}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Container</InputLabel>
                <Select
                  value={selectedContainer}
                  onChange={(e) => setSelectedContainer(e.target.value)}
                >
                  {selectedPod?.containers.map((container) => (
                    <MenuItem key={container} value={container}>{container}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                  />
                }
                label="Auto-refresh"
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={fetchPodLogs}
              >
                Refresh
              </Button>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box
            ref={logContainerRef}
            sx={{
              height: '60vh',
              bgcolor: 'grey.900',
              color: 'white',
              fontFamily: 'monospace',
              fontSize: '12px',
              overflowY: 'auto',
              p: 2
            }}
          >
            {logs.map((log, index) => (
              <Box key={index} sx={{ mb: 1 }}>
                <Box component="span" sx={{ color: 'grey.400', mr: 1 }}>
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </Box>
                <Chip 
                  label={log.level} 
                  size="small" 
                  color={getLogLevelColor(log.level) as any}
                  sx={{ mr: 1, fontSize: '10px' }}
                />
                <Box component="span">
                  {log.message}
                </Box>
              </Box>
            ))}
            {logs.length === 0 && (
              <Typography color="grey.400">
                No logs available or still loading...
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            startIcon={<DownloadIcon />}
            onClick={() => {
              const logText = logs.map(log => `[${log.timestamp}] ${log.level}: ${log.message}`).join('\n');
              const blob = new Blob([logText], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${selectedPod?.name}-logs.txt`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download
          </Button>
          <Button onClick={() => setLogDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MonitoringDashboard;