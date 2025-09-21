import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Paper,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Stack,
  Rating
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { generateSecurityItems, getSecurityMetrics, SecurityItem } from '../../config/security-compliance';

// SecurityItem interface is now imported from config

// Security items are now loaded dynamically from configuration

interface SecurityComplianceStatusProps {
  title?: string;
  showOnlyCategory?: string;
  detailedView?: boolean;
}

const SecurityComplianceStatus: React.FC<SecurityComplianceStatusProps> = ({
  title = "Security Compliance Status",
  showOnlyCategory,
  detailedView = false
}) => {
  const [selectedItem, setSelectedItem] = useState<SecurityItem | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>(false);

  // Load security items and metrics from configuration
  const securityItems = generateSecurityItems();
  const metrics = getSecurityMetrics();

  const filteredItems = showOnlyCategory 
    ? securityItems.filter(item => item.category === showOnlyCategory)
    : securityItems;

  const {
    totalItems,
    fullyImplemented,
    hardened,
    mockupOnly,
    partialMock,
    notImplemented,
    criticalRisks,
    highRisks,
    overallSecurityScore
  } = metrics;

  const getImplementationColor = (type: string) => {
    switch (type) {
      case 'fully-implemented': return 'success';
      case 'hardened': return 'success';
      case 'partial-mock': return 'warning';
      case 'mockup-only': return 'error';
      case 'not-implemented': return 'error';
      default: return 'default';
    }
  };

  const getImplementationIcon = (type: string) => {
    switch (type) {
      case 'fully-implemented': return <CheckCircleIcon />;
      case 'hardened': return <ShieldIcon />;
      case 'partial-mock': return <BuildIcon />;
      case 'mockup-only': return <WarningIcon />;
      case 'not-implemented': return <ErrorIcon />;
      default: return <InfoIcon />;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'production-ready': return 'success';
      case 'development-only': return 'warning';
      case 'needs-hardening': return 'warning';
      case 'insecure': return 'error';
      default: return 'default';
    }
  };

  const handleItemClick = (item: SecurityItem) => {
    setSelectedItem(item);
    setDetailDialogOpen(true);
  };

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      
      {/* Security Overview Alert */}
      <Alert 
        severity="warning" 
        sx={{ mb: 3 }}
        icon={<SecurityIcon />}
      >
        <Typography variant="subtitle2" gutterBottom>Security Assessment</Typography>
        <Typography variant="body2">
          This application contains a mix of <strong>mockup UI components</strong> and <strong>real implementations</strong>. 
          Many security features are for demonstration purposes only and require significant hardening for production use.
          Current security score: <strong>{overallSecurityScore}/100</strong>
        </Typography>
      </Alert>
      
      {/* Security Metrics */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Security Implementation Overview</Typography>
          
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="error">
                  {criticalRisks + highRisks}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  High/Critical Risks
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {fullyImplemented + hardened}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Production Ready
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {partialMock}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Partially Mocked
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="error">
                  {mockupOnly + notImplemented}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Mockup/Missing
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Box mb={2}>
            <Typography variant="body2" gutterBottom>
              Overall Security Score: {overallSecurityScore}%
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={overallSecurityScore} 
              sx={{ height: 8, borderRadius: 5 }}
              color={overallSecurityScore > 70 ? 'success' : overallSecurityScore > 40 ? 'warning' : 'error'}
            />
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip 
              icon={<CheckCircleIcon />} 
              label={`${fullyImplemented + hardened} Production Ready`} 
              color="success" 
              size="small"
            />
            <Chip 
              icon={<BuildIcon />} 
              label={`${partialMock} Partial Implementation`} 
              color="warning" 
              size="small"
            />
            <Chip 
              icon={<WarningIcon />} 
              label={`${mockupOnly} Mockup Only`} 
              color="error" 
              size="small"
            />
            <Chip 
              icon={<ErrorIcon />} 
              label={`${notImplemented} Not Implemented`} 
              color="error" 
              size="small"
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Detailed Security Items */}
      {detailedView ? (
        <Box>
          {filteredItems.map((item) => (
            <Accordion
              key={item.id}
              expanded={expandedAccordion === `panel${item.id}`}
              onChange={handleAccordionChange(`panel${item.id}`)}
              sx={{ mb: 1 }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" alignItems="center" gap={2} width="100%">
                  {item.icon}
                  <Box flexGrow={1}>
                    <Typography variant="h6">
                      {item.name}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                      <Chip
                        size="small"
                        icon={getImplementationIcon(item.implementationType)}
                        label={item.implementationType.replace('-', ' ')}
                        color={getImplementationColor(item.implementationType) as any}
                      />
                      <Chip
                        size="small"
                        label={`${item.riskLevel} risk`}
                        color={getRiskColor(item.riskLevel) as any}
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        label={item.securityLevel.replace('-', ' ')}
                        color={getSecurityLevelColor(item.securityLevel) as any}
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleItemClick(item);
                    }}
                  >
                    <InfoIcon />
                  </IconButton>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={8}>
                    <Typography variant="body2" paragraph>
                      {item.description}
                    </Typography>
                    
                    <Typography variant="subtitle2" gutterBottom>Current State:</Typography>
                    <Typography variant="body2" paragraph>
                      {item.currentState}
                    </Typography>

                    {item.securityConcerns && item.securityConcerns.length > 0 && (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2">Security Concerns:</Typography>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {item.securityConcerns.map((concern, idx) => (
                            <li key={idx}><Typography variant="body2">{concern}</Typography></li>
                          ))}
                        </ul>
                      </Alert>
                    )}

                    {item.mockAspects && item.mockAspects.length > 0 && (
                      <Box mb={2}>
                        <Typography variant="subtitle2" gutterBottom>Mockup/Demo Aspects:</Typography>
                        <Box display="flex" flexWrap="wrap" gap={0.5}>
                          {item.mockAspects.map((aspect, idx) => (
                            <Chip key={idx} label={aspect} size="small" color="warning" variant="outlined" />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {item.realAspects && item.realAspects.length > 0 && (
                      <Box mb={2}>
                        <Typography variant="subtitle2" gutterBottom>Real Implementation:</Typography>
                        <Box display="flex" flexWrap="wrap" gap={0.5}>
                          {item.realAspects.map((aspect, idx) => (
                            <Chip key={idx} label={aspect} size="small" color="success" variant="outlined" />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Security Details</Typography>
                      <Typography variant="body2">Priority: {item.priority}</Typography>
                      <Typography variant="body2">Effort: {item.estimatedEffort}</Typography>
                      <Typography variant="body2">Category: {item.category}</Typography>
                      
                      <Box mt={2}>
                        <Typography variant="caption">Compliance:</Typography>
                        {item.complianceFrameworks.map((framework, idx) => (
                          <Chip 
                            key={idx} 
                            label={framework} 
                            size="small" 
                            variant="outlined" 
                            sx={{ mr: 0.5, mt: 0.5 }} 
                          />
                        ))}
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      ) : (
        <List>
          {filteredItems.map((item) => (
            <ListItem 
              key={item.id}
              button
              onClick={() => handleItemClick(item)}
              sx={{ mb: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="h6">
                      {item.name}
                    </Typography>
                    <Chip
                      size="small"
                      icon={getImplementationIcon(item.implementationType)}
                      label={item.implementationType.replace('-', ' ')}
                      color={getImplementationColor(item.implementationType) as any}
                    />
                    <Chip
                      size="small"
                      label={`${item.riskLevel} risk`}
                      color={getRiskColor(item.riskLevel) as any}
                      variant="outlined"
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      {item.currentState}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      {/* Security Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        {selectedItem && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" gap={2}>
                {selectedItem.icon}
                <Box>
                  <Typography variant="h5">{selectedItem.name}</Typography>
                  <Box display="flex" gap={1} mt={1}>
                    <Chip
                      size="small"
                      icon={getImplementationIcon(selectedItem.implementationType)}
                      label={selectedItem.implementationType.replace('-', ' ')}
                      color={getImplementationColor(selectedItem.implementationType) as any}
                    />
                    <Chip
                      size="small"
                      label={`${selectedItem.riskLevel} risk`}
                      color={getRiskColor(selectedItem.riskLevel) as any}
                      variant="outlined"
                    />
                  </Box>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" paragraph>
                {selectedItem.description}
              </Typography>
              
              <Typography variant="h6" gutterBottom>Current Implementation</Typography>
              <Typography variant="body2" paragraph>
                {selectedItem.currentState}
              </Typography>

              <Grid container spacing={3}>
                {selectedItem.securityConcerns && selectedItem.securityConcerns.length > 0 && (
                  <Grid item xs={12}>
                    <Alert severity="error" sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">Security Concerns:</Typography>
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {selectedItem.securityConcerns.map((concern, idx) => (
                          <li key={idx}><Typography variant="body2">{concern}</Typography></li>
                        ))}
                      </ul>
                    </Alert>
                  </Grid>
                )}

                {selectedItem.improvements && selectedItem.improvements.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>Recommended Improvements:</Typography>
                    <ul>
                      {selectedItem.improvements.map((improvement, idx) => (
                        <li key={idx}><Typography variant="body2">{improvement}</Typography></li>
                      ))}
                    </ul>
                  </Grid>
                )}

                <Grid item xs={12} md={6}>
                  {selectedItem.mockAspects && selectedItem.mockAspects.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>Mockup/Demo Only:</Typography>
                      {selectedItem.mockAspects.map((aspect, idx) => (
                        <Chip 
                          key={idx} 
                          label={aspect} 
                          size="small" 
                          color="warning" 
                          variant="outlined"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </Box>
                  )}
                </Grid>

                <Grid item xs={12} md={6}>
                  {selectedItem.realAspects && selectedItem.realAspects.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>Real Implementation:</Typography>
                      {selectedItem.realAspects.map((aspect, idx) => (
                        <Chip 
                          key={idx} 
                          label={aspect} 
                          size="small" 
                          color="success" 
                          variant="outlined"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </Box>
                  )}
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default SecurityComplianceStatus;