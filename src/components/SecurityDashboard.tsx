import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Button,
  LinearProgress,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Shield as ShieldIcon,
  BugReport as BugReportIcon,
  Policy as PolicyIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  GetApp as DownloadIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import type { ValidationResult } from '../utils/validation';

interface SecurityScan {
  id: string;
  timestamp: string;
  status: 'running' | 'completed' | 'failed';
  findings: SecurityFinding[];
  score: number;
  duration: number;
}

interface SecurityFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'vulnerability' | 'misconfiguration' | 'secret' | 'compliance' | 'network';
  title: string;
  description: string;
  resource: {
    kind: string;
    name: string;
    namespace?: string;
  };
  remediation: string;
  cve?: string;
  score: number;
}

interface ComplianceCheck {
  id: string;
  framework: 'CIS' | 'NSA' | 'PCI-DSS' | 'SOC2' | 'NIST';
  control: string;
  title: string;
  status: 'pass' | 'fail' | 'warning' | 'not-applicable';
  description: string;
  remediation: string;
  resources: string[];
}

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
      id={`security-tabpanel-${index}`}
      aria-labelledby={`security-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function SecurityDashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [securityScans, setSecurityScans] = useState<SecurityScan[]>([]);
  const [complianceChecks, setComplianceChecks] = useState<ComplianceCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<SecurityFinding | null>(null);
  const [findingDialog, setFindingDialog] = useState(false);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      // Simulate loading security data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data - in real implementation, this would come from security scanning tools
      setSecurityScans([
        {
          id: 'scan-1',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: 'completed',
          duration: 45,
          score: 72,
          findings: [
            {
              id: 'finding-1',
              severity: 'critical',
              category: 'vulnerability',
              title: 'Critical vulnerability in nginx container',
              description: 'CVE-2023-44487 - HTTP/2 Rapid Reset attack vulnerability',
              resource: { kind: 'Deployment', name: 'nginx-deployment', namespace: 'default' },
              remediation: 'Update nginx image to version 1.25.3 or later',
              cve: 'CVE-2023-44487',
              score: 9.8
            },
            {
              id: 'finding-2',
              severity: 'high',
              category: 'misconfiguration',
              title: 'Container running as root',
              description: 'Container is configured to run as root user (UID 0)',
              resource: { kind: 'Deployment', name: 'redis-deployment', namespace: 'database' },
              remediation: 'Set securityContext.runAsNonRoot: true and specify a non-root user',
              score: 7.5
            },
            {
              id: 'finding-3',
              severity: 'medium',
              category: 'secret',
              title: 'Hardcoded credentials detected',
              description: 'Database password found in environment variables',
              resource: { kind: 'ConfigMap', name: 'app-config', namespace: 'default' },
              remediation: 'Move sensitive data to Kubernetes Secrets',
              score: 5.2
            }
          ]
        }
      ]);

      setComplianceChecks([
        {
          id: 'cis-1',
          framework: 'CIS',
          control: '5.1.1',
          title: 'Minimize cluster admin role bindings',
          status: 'fail',
          description: 'Ensure that cluster admin privileges are only assigned when necessary',
          remediation: 'Review and remove unnecessary cluster admin bindings',
          resources: ['ClusterRoleBinding/cluster-admin-binding']
        },
        {
          id: 'nsa-1',
          framework: 'NSA',
          control: 'Network-1',
          title: 'Use network policies',
          status: 'warning',
          description: 'Network policies should be implemented to restrict pod-to-pod communication',
          remediation: 'Create NetworkPolicy resources to control traffic flow',
          resources: ['Namespace/default', 'Namespace/production']
        },
        {
          id: 'cis-2',
          framework: 'CIS',
          control: '5.7.3',
          title: 'Minimize container root privileges',
          status: 'pass',
          description: 'Containers should not run as root user',
          remediation: 'N/A - All containers are running as non-root',
          resources: []
        }
      ]);

    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runSecurityScan = async () => {
    setScanning(true);
    try {
      // Simulate security scan
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Add new scan result
      const newScan: SecurityScan = {
        id: `scan-${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: 'completed',
        duration: Math.floor(Math.random() * 60) + 30,
        score: Math.floor(Math.random() * 40) + 60,
        findings: []
      };

      setSecurityScans(prev => [newScan, ...prev.slice(0, 4)]);
    } catch (error) {
      console.error('Security scan failed:', error);
    } finally {
      setScanning(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <ErrorIcon />;
      case 'high': return <WarningIcon />;
      case 'medium': return <InfoIcon />;
      case 'low': return <CheckCircleIcon />;
      default: return <InfoIcon />;
    }
  };

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'success';
      case 'fail': return 'error';
      case 'warning': return 'warning';
      case 'not-applicable': return 'default';
      default: return 'default';
    }
  };

  const handleFindingClick = (finding: SecurityFinding) => {
    setSelectedFinding(finding);
    setFindingDialog(true);
  };

  const renderSecurityOverview = () => {
    const latestScan = securityScans[0];
    const criticalFindings = latestScan?.findings?.filter(f => f.severity === 'critical').length || 0;
    const highFindings = latestScan?.findings?.filter(f => f.severity === 'high').length || 0;
    const totalFindings = latestScan?.findings?.length || 0;

    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <SecurityIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Security Score</Typography>
              </Box>
              <Typography variant="h3" color="primary">
                {latestScan?.score || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Last scan: {latestScan ? new Date(latestScan.timestamp).toLocaleString() : 'Never'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <ErrorIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="h6">Critical Issues</Typography>
              </Box>
              <Typography variant="h3" color="error.main">
                {criticalFindings}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Require immediate attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <WarningIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">High Priority</Typography>
              </Box>
              <Typography variant="h3" color="warning.main">
                {highFindings}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Should be addressed soon
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <BugReportIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Findings</Typography>
              </Box>
              <Typography variant="h3" color="info.main">
                {totalFindings}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                All security issues found
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
                <Typography variant="h6">Recent Security Scans</Typography>
                <Button
                  variant="contained"
                  startIcon={scanning ? <LinearProgress size="small" /> : <RefreshIcon />}
                  onClick={runSecurityScan}
                  disabled={scanning}
                >
                  {scanning ? 'Scanning...' : 'Run Security Scan'}
                </Button>
              </Box>

              {scanning && (
                <Box mb={2}>
                  <Alert severity="info">
                    <AlertTitle>Security Scan in Progress</AlertTitle>
                    Analyzing cluster resources for vulnerabilities and misconfigurations...
                  </Alert>
                  <LinearProgress sx={{ mt: 1 }} />
                </Box>
              )}

              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Score</TableCell>
                      <TableCell>Findings</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {securityScans.map((scan) => (
                      <TableRow key={scan.id}>
                        <TableCell>
                          {new Date(scan.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={scan.status}
                            color={scan.status === 'completed' ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            color={scan.score >= 80 ? 'success.main' : scan.score >= 60 ? 'warning.main' : 'error.main'}
                          >
                            {scan.score}/100
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Badge badgeContent={scan.findings.length} color="error">
                            <BugReportIcon />
                          </Badge>
                        </TableCell>
                        <TableCell>{scan.duration}s</TableCell>
                        <TableCell>
                          <IconButton size="small">
                            <DownloadIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderVulnerabilities = () => {
    const allFindings = securityScans.flatMap(scan => scan.findings);
    const vulnerabilities = allFindings.filter(f => f.category === 'vulnerability');

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Vulnerability Findings
          </Typography>
          
          {vulnerabilities.length === 0 ? (
            <Alert severity="success">
              <AlertTitle>No Vulnerabilities Found</AlertTitle>
              Your cluster appears to be free of known vulnerabilities.
            </Alert>
          ) : (
            <List>
              {vulnerabilities.map((finding) => (
                <ListItem
                  key={finding.id}
                  button
                  onClick={() => handleFindingClick(finding)}
                >
                  <ListItemIcon>
                    {getSeverityIcon(finding.severity)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body1">{finding.title}</Typography>
                        <Chip
                          label={finding.severity.toUpperCase()}
                          color={getSeverityColor(finding.severity) as any}
                          size="small"
                        />
                        {finding.cve && (
                          <Chip label={finding.cve} variant="outlined" size="small" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          {finding.description}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Resource: {finding.resource.kind}/{finding.resource.name}
                          {finding.resource.namespace && ` (${finding.resource.namespace})`}
                        </Typography>
                      </Box>
                    }
                  />
                  <IconButton>
                    <VisibilityIcon />
                  </IconButton>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderCompliance = () => {
    const frameworks = ['CIS', 'NSA', 'PCI-DSS', 'SOC2', 'NIST'];
    
    return (
      <Grid container spacing={3}>
        {frameworks.map((framework) => {
          const checks = complianceChecks.filter(c => c.framework === framework);
          const passCount = checks.filter(c => c.status === 'pass').length;
          const failCount = checks.filter(c => c.status === 'fail').length;
          const warningCount = checks.filter(c => c.status === 'warning').length;

          return (
            <Grid item xs={12} md={6} lg={4} key={framework}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <PolicyIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">{framework} Compliance</Typography>
                  </Box>
                  
                  <Box mb={2}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Compliance Score
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LinearProgress
                        variant="determinate"
                        value={(passCount / Math.max(checks.length, 1)) * 100}
                        sx={{ flexGrow: 1 }}
                      />
                      <Typography variant="body2">
                        {Math.round((passCount / Math.max(checks.length, 1)) * 100)}%
                      </Typography>
                    </Box>
                  </Box>

                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Typography variant="caption" display="block" color="success.main">
                        Pass: {passCount}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" display="block" color="error.main">
                        Fail: {failCount}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" display="block" color="warning.main">
                        Warning: {warningCount}
                      </Typography>
                    </Grid>
                  </Grid>

                  {checks.length > 0 && (
                    <Box mt={2}>
                      {checks.map((check) => (
                        <Accordion key={check.id}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box display="flex" alignItems="center" gap={1} width="100%">
                              <Chip
                                label={check.status}
                                color={getComplianceStatusColor(check.status) as any}
                                size="small"
                              />
                              <Typography variant="body2" sx={{ flexGrow: 1 }}>
                                {check.control}: {check.title}
                              </Typography>
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Typography variant="body2" paragraph>
                              {check.description}
                            </Typography>
                            <Typography variant="subtitle2" gutterBottom>
                              Remediation:
                            </Typography>
                            <Typography variant="body2" color="textSecondary" paragraph>
                              {check.remediation}
                            </Typography>
                            {check.resources.length > 0 && (
                              <>
                                <Typography variant="subtitle2" gutterBottom>
                                  Affected Resources:
                                </Typography>
                                <List dense>
                                  {check.resources.map((resource, index) => (
                                    <ListItem key={index}>
                                      <ListItemText primary={resource} />
                                    </ListItem>
                                  ))}
                                </List>
                              </>
                            )}
                          </AccordionDetails>
                        </Accordion>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Security Dashboard
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadSecurityData}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Overview" />
        <Tab label="Vulnerabilities" />
        <Tab label="Compliance" />
        <Tab label="Policies" />
      </Tabs>

      <TabPanel value={activeTab} index={0}>
        {renderSecurityOverview()}
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {renderVulnerabilities()}
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {renderCompliance()}
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <Alert severity="info">
          <AlertTitle>Security Policies</AlertTitle>
          Policy management features are coming soon. This will include Pod Security Standards, 
          Network Policies, and admission controllers configuration.
        </Alert>
      </TabPanel>

      <Dialog
        open={findingDialog}
        onClose={() => setFindingDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            {selectedFinding && getSeverityIcon(selectedFinding.severity)}
            Security Finding Details
            {selectedFinding && (
              <Chip
                label={selectedFinding.severity.toUpperCase()}
                color={getSeverityColor(selectedFinding.severity) as any}
                size="small"
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedFinding && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedFinding.title}
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedFinding.description}
              </Typography>

              <Typography variant="subtitle2" gutterBottom>
                Affected Resource:
              </Typography>
              <Typography variant="body2" paragraph>
                {selectedFinding.resource.kind}/{selectedFinding.resource.name}
                {selectedFinding.resource.namespace && ` in namespace ${selectedFinding.resource.namespace}`}
              </Typography>

              {selectedFinding.cve && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    CVE ID:
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {selectedFinding.cve} (Score: {selectedFinding.score}/10)
                  </Typography>
                </>
              )}

              <Typography variant="subtitle2" gutterBottom>
                Remediation:
              </Typography>
              <Typography variant="body2">
                {selectedFinding.remediation}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFindingDialog(false)}>Close</Button>
          <Button variant="contained" onClick={() => setFindingDialog(false)}>
            Mark as Resolved
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}