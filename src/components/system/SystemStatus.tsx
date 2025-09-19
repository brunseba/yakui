import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  CheckCircle as HealthyIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  BugReport as DiagnosticsIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { SystemStatus as SystemStatusType, ComponentStatus, systemMonitor, generateDiagnosticsReport } from '../../utils/systemValidation';
import { config } from '../../config/environment';

interface SystemStatusProps {
  showDetails?: boolean;
  refreshInterval?: number;
}

const SystemStatus: React.FC<SystemStatusProps> = ({ 
  showDetails = false,
  refreshInterval = config.ui.refreshInterval 
}) => {
  const [systemStatus, setSystemStatus] = useState<SystemStatusType | null>(null);
  const [loading, setLoading] = useState(true);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [diagnosticsReport, setDiagnosticsReport] = useState<string>('');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    // Start monitoring
    const handleStatusUpdate = (status: SystemStatusType) => {
      setSystemStatus(status);
      setLoading(false);
      setLastRefresh(new Date());
    };

    systemMonitor.addListener(handleStatusUpdate);
    systemMonitor.start(refreshInterval);

    // Initial status check
    systemMonitor['checkSystemStatus']?.().then(handleStatusUpdate);

    return () => {
      systemMonitor.removeListener(handleStatusUpdate);
      systemMonitor.stop();
    };
  }, [refreshInterval]);

  const getStatusIcon = (status: ComponentStatus['status']) => {
    switch (status) {
      case 'healthy':
        return <HealthyIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const getStatusColor = (status: ComponentStatus['status']) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Force a status check
      const status = await systemMonitor['checkSystemStatus']?.();
      if (status) {
        setSystemStatus(status);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Failed to refresh system status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDiagnostics = async () => {
    try {
      const report = await generateDiagnosticsReport();
      setDiagnosticsReport(report);
      setDiagnosticsOpen(true);
    } catch (error) {
      console.error('Failed to generate diagnostics:', error);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(diagnosticsReport);
  };

  if (loading && !systemStatus) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            System Status
          </Typography>
          <LinearProgress />
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Checking system health...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (!systemStatus) {
    return (
      <Alert severity="warning">
        System status unavailable. Monitoring service may be offline.
      </Alert>
    );
  }

  const overallStatus = systemStatus.healthy ? 'healthy' : 
    systemStatus.components.some(c => c.status === 'error') ? 'error' : 'warning';

  return (
    <Box>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              System Status
            </Typography>
            <Box display="flex" gap={1} alignItems="center">
              <Chip
                icon={getStatusIcon(overallStatus)}
                label={systemStatus.healthy ? 'Healthy' : 'Issues Detected'}
                color={getStatusColor(overallStatus)}
                size="small"
              />
              <Button
                size="small"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button
                size="small"
                startIcon={<DiagnosticsIcon />}
                onClick={handleGenerateDiagnostics}
                variant="outlined"
              >
                Diagnostics
              </Button>
            </Box>
          </Box>

          {/* System Overview */}
          <Box mb={2}>
            <Typography variant="body2" color="textSecondary">
              Last Check: {systemStatus.lastCheck.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Configuration: {systemStatus.configValid ? '✅ Valid' : '❌ Invalid'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Environment: {import.meta.env.MODE || 'development'}
            </Typography>
          </Box>

          {/* Component Status */}
          {showDetails && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">
                  Component Details ({systemStatus.components.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {systemStatus.components.map((component, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        {getStatusIcon(component.status)}
                      </ListItemIcon>
                      <ListItemText
                        primary={component.name}
                        secondary={component.message}
                      />
                      <Chip
                        label={component.status}
                        size="small"
                        color={getStatusColor(component.status)}
                        variant="outlined"
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Simple Component List */}
          {!showDetails && (
            <List dense>
              {systemStatus.components.map((component, index) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {getStatusIcon(component.status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={component.name}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                  <Chip
                    label={component.status}
                    size="small"
                    color={getStatusColor(component.status)}
                    variant="outlined"
                  />
                </ListItem>
              ))}
            </List>
          )}

          {/* Warnings */}
          {!systemStatus.healthy && (
            <Alert 
              severity={overallStatus === 'error' ? 'error' : 'warning'} 
              sx={{ mt: 2 }}
            >
              <Typography variant="body2">
                {overallStatus === 'error' 
                  ? 'System has critical issues that require attention.'
                  : 'Some components are experiencing issues but the system is functional.'
                }
              </Typography>
            </Alert>
          )}

          {/* Feature Status */}
          {config.features.enableStubFeatures && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Development mode: Some features are running with stub implementations.
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Diagnostics Dialog */}
      <Dialog 
        open={diagnosticsOpen} 
        onClose={() => setDiagnosticsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          System Diagnostics Report
        </DialogTitle>
        <DialogContent>
          <Box mb={2}>
            <Typography variant="body2" color="textSecondary">
              Generated at: {new Date().toLocaleString()}
            </Typography>
          </Box>
          <Box
            sx={{
              backgroundColor: 'grey.100',
              p: 2,
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap',
              maxHeight: 400,
              overflow: 'auto'
            }}
          >
            {diagnosticsReport}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={copyToClipboard}>
            Copy to Clipboard
          </Button>
          <Button onClick={() => setDiagnosticsOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SystemStatus;