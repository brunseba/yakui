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
  Security as SecurityIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Shield as ShieldIcon,
  Lock as LockIcon,
  VpnKey as KeyIcon,
  BugReport as BugIcon,
  Visibility as VisibilityIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Code as CodeIcon,
  Build as BuildIcon,
  Assessment as AssessmentIcon,
  Https as HttpsIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Token as TokenIcon,
  DataObject as DataObjectIcon,
  Api as ApiIcon
} from '@mui/icons-material';

interface SecurityItem {
  id: string;
  category: 'authentication' | 'authorization' | 'data-protection' | 'input-validation' | 'transport' | 'logging' | 'network' | 'secrets';
  name: string;
  implementationType: 'fully-implemented' | 'mockup-only' | 'partial-mock' | 'hardened' | 'not-implemented';
  securityLevel: 'production-ready' | 'development-only' | 'insecure' | 'needs-hardening';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  currentState: string;
  securityConcerns: string[];
  improvements: string[];
  components: string[];
  mockAspects?: string[];
  realAspects?: string[];
  complianceFrameworks: string[];
  priority: 'high' | 'medium' | 'low';
  estimatedEffort: string;
  icon: React.ReactElement;
}

const securityItems: SecurityItem[] = [
  {
    id: 'auth-system',
    category: 'authentication',
    name: 'Authentication System',
    implementationType: 'partial-mock',
    securityLevel: 'development-only',
    riskLevel: 'medium',
    description: 'Authentication system with kubeconfig and token support',
    currentState: 'Working UI with backend proxy, but limited security hardening',
    securityConcerns: [
      'Tokens stored in localStorage (not httpOnly cookies)',
      'No token rotation mechanism',
      'Basic session timeout (24h hardcoded)',
      'No multi-factor authentication',
      'CORS configured for any localhost port in development'
    ],
    improvements: [
      'Implement secure token storage (httpOnly cookies)',
      'Add token rotation and refresh mechanism',
      'Implement MFA support',
      'Add proper session management',
      'Harden CORS configuration for production'
    ],
    components: ['AuthContext.tsx', 'Login.tsx', 'dev-server.cjs'],
    mockAspects: [
      'Basic CORS allowing any localhost',
      'Simple localStorage persistence',
      'No advanced auth protocols (OAuth2/OIDC)'
    ],
    realAspects: [
      'Real Kubernetes authentication',
      'Session timeout mechanism',
      'Error handling and validation'
    ],
    complianceFrameworks: ['CIS', 'NIST'],
    priority: 'high',
    estimatedEffort: '1-2 weeks',
    icon: <KeyIcon />
  },
  {
    id: 'input-validation',
    category: 'input-validation',
    name: 'Input Validation & Sanitization',
    implementationType: 'hardened',
    securityLevel: 'production-ready',
    riskLevel: 'low',
    description: 'Comprehensive input validation system for Kubernetes resources',
    currentState: 'Well-implemented validation framework with k8s-specific patterns',
    securityConcerns: [
      'No XSS protection headers explicitly set',
      'YAML validation could be more comprehensive'
    ],
    improvements: [
      'Add CSP headers',
      'Implement more robust YAML parsing',
      'Add rate limiting on validation endpoints'
    ],
    components: ['utils/validation.ts', 'contexts/ValidationContext.tsx'],
    realAspects: [
      'Comprehensive regex patterns for k8s resources',
      'Field-level validation rules',
      'YAML syntax checking',
      'Form validation framework'
    ],
    complianceFrameworks: ['OWASP', 'CIS'],
    priority: 'medium',
    estimatedEffort: '3-5 days',
    icon: <ShieldIcon />
  },
  {
    id: 'data-protection',
    category: 'data-protection',
    name: 'Sensitive Data Protection',
    implementationType: 'partial-mock',
    securityLevel: 'needs-hardening',
    riskLevel: 'high',
    description: 'Protection of sensitive data like tokens and secrets',
    currentState: 'Basic masking and sanitization, needs encryption',
    securityConcerns: [
      'Secrets stored in browser localStorage',
      'Server URLs partially masked but not encrypted',
      'Console logging may expose sensitive data',
      'No data encryption at rest or in transit verification'
    ],
    improvements: [
      'Implement client-side encryption for sensitive data',
      'Use secure storage mechanisms',
      'Add data classification and handling policies',
      'Implement proper secret management integration'
    ],
    components: ['utils/errorHandling.ts', 'services/kubernetes-api.ts'],
    mockAspects: [
      'Basic string masking (****)',
      'Simple log sanitization'
    ],
    realAspects: [
      'URL masking functionality',
      'Context-aware data sanitization'
    ],
    complianceFrameworks: ['GDPR', 'SOX', 'PCI-DSS'],
    priority: 'high',
    estimatedEffort: '2-3 weeks',
    icon: <LockIcon />
  },
  {
    id: 'transport-security',
    category: 'transport',
    name: 'Transport Security',
    implementationType: 'mockup-only',
    securityLevel: 'development-only',
    riskLevel: 'high',
    description: 'HTTPS/TLS configuration and secure communications',
    currentState: 'HTTP only in development, no HTTPS enforcement',
    securityConcerns: [
      'All communications over HTTP in development',
      'No HTTPS enforcement',
      'No TLS certificate validation',
      'Missing security headers (HSTS, CSP, etc.)',
      'No certificate pinning'
    ],
    improvements: [
      'Implement HTTPS in development and production',
      'Add security headers middleware',
      'Implement certificate validation',
      'Add HSTS and other security headers',
      'Configure proper TLS settings'
    ],
    components: ['dev-server.cjs', 'vite.config.ts'],
    mockAspects: [
      'HTTP-only development server',
      'Permissive CORS configuration',
      'No security headers'
    ],
    complianceFrameworks: ['NIST', 'ISO 27001'],
    priority: 'high',
    estimatedEffort: '1 week',
    icon: <HttpsIcon />
  },
  {
    id: 'rbac-implementation',
    category: 'authorization',
    name: 'RBAC & Authorization',
    implementationType: 'mockup-only',
    securityLevel: 'development-only',
    riskLevel: 'critical',
    description: 'Role-based access control and authorization mechanisms',
    currentState: 'UI mockup with no real authorization enforcement',
    securityConcerns: [
      'No actual RBAC enforcement in frontend',
      'Missing role-based route protection',
      'No permission validation before operations',
      'Cluster admin privileges assumed',
      'No audit logging for authorization decisions'
    ],
    improvements: [
      'Implement real RBAC enforcement',
      'Add role-based route guards',
      'Validate permissions before API calls',
      'Implement least-privilege principle',
      'Add authorization audit logging'
    ],
    components: ['rbac/RBACManager.tsx', 'rbac/EnhancedRBACManager.tsx'],
    mockAspects: [
      'UI components for RBAC management',
      'Mock permission displays',
      'Simulated role assignments'
    ],
    complianceFrameworks: ['CIS', 'NIST', 'SOC2'],
    priority: 'high',
    estimatedEffort: '3-4 weeks',
    icon: <AdminPanelSettingsIcon />
  },
  {
    id: 'api-security',
    category: 'network',
    name: 'API Security',
    implementationType: 'partial-mock',
    securityLevel: 'needs-hardening',
    riskLevel: 'medium',
    description: 'API endpoint security and request validation',
    currentState: 'Basic API structure with minimal security controls',
    securityConcerns: [
      'No rate limiting implemented',
      'Missing API authentication headers',
      'No request size limits',
      'No API versioning strategy',
      'Limited error handling exposes internal details'
    ],
    improvements: [
      'Implement rate limiting',
      'Add API key authentication',
      'Set request size limits',
      'Implement proper error handling',
      'Add API monitoring and alerting'
    ],
    components: ['services/kubernetes-api.ts', 'dev-server.cjs'],
    realAspects: [
      'Request/response handling',
      'Error propagation',
      'Timeout management'
    ],
    mockAspects: [
      'Basic CORS configuration',
      'Simple error responses',
      'No authentication middleware'
    ],
    complianceFrameworks: ['OWASP API', 'NIST'],
    priority: 'medium',
    estimatedEffort: '1-2 weeks',
    icon: <ApiIcon />
  },
  {
    id: 'security-monitoring',
    category: 'logging',
    name: 'Security Monitoring & Logging',
    implementationType: 'mockup-only',
    securityLevel: 'development-only',
    riskLevel: 'medium',
    description: 'Security event logging and monitoring capabilities',
    currentState: 'Basic console logging with minimal security focus',
    securityConcerns: [
      'No structured security logging',
      'Missing security event correlation',
      'No intrusion detection',
      'Limited audit trail',
      'No alerting on security events'
    ],
    improvements: [
      'Implement structured security logging',
      'Add security event monitoring',
      'Create audit trail for all actions',
      'Implement alerting system',
      'Add threat detection capabilities'
    ],
    components: ['utils/errorHandling.ts', 'SecurityDashboard.tsx'],
    mockAspects: [
      'Mock security dashboard',
      'Simulated security findings',
      'Static compliance checks'
    ],
    realAspects: [
      'Error logging framework',
      'Basic context sanitization'
    ],
    complianceFrameworks: ['SOC2', 'ISO 27001', 'NIST'],
    priority: 'medium',
    estimatedEffort: '2-3 weeks',
    icon: <AssessmentIcon />
  },
  {
    id: 'secrets-management',
    category: 'secrets',
    name: 'Secrets Management',
    implementationType: 'not-implemented',
    securityLevel: 'insecure',
    riskLevel: 'critical',
    description: 'Secure handling of Kubernetes secrets and sensitive configuration',
    currentState: 'No dedicated secrets management, plain text storage',
    securityConcerns: [
      'No integration with secret management systems',
      'Secrets potentially logged or exposed',
      'No secret rotation capabilities',
      'No encryption of sensitive data',
      'Missing secure secret distribution'
    ],
    improvements: [
      'Integrate with HashiCorp Vault or similar',
      'Implement secret rotation',
      'Add encryption for sensitive data',
      'Create secure secret injection',
      'Add secret scanning and detection'
    ],
    components: ['Not implemented'],
    complianceFrameworks: ['CIS', 'NIST', 'PCI-DSS'],
    priority: 'high',
    estimatedEffort: '4-6 weeks',
    icon: <TokenIcon />
  }
];

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

  const filteredItems = showOnlyCategory 
    ? securityItems.filter(item => item.category === showOnlyCategory)
    : securityItems;

  // Calculate overall security metrics
  const totalItems = securityItems.length;
  const fullyImplemented = securityItems.filter(item => item.implementationType === 'fully-implemented').length;
  const hardened = securityItems.filter(item => item.implementationType === 'hardened').length;
  const mockupOnly = securityItems.filter(item => item.implementationType === 'mockup-only').length;
  const partialMock = securityItems.filter(item => item.implementationType === 'partial-mock').length;
  const notImplemented = securityItems.filter(item => item.implementationType === 'not-implemented').length;
  
  const criticalRisks = securityItems.filter(item => item.riskLevel === 'critical').length;
  const highRisks = securityItems.filter(item => item.riskLevel === 'high').length;
  
  const overallSecurityScore = Math.round(
    ((fullyImplemented * 100) + (hardened * 100) + (partialMock * 50) + (mockupOnly * 20)) / totalItems
  );

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