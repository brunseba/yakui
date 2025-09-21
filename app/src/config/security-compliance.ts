/**
 * Security Compliance Configuration
 * Configurable security items and assessment criteria
 */

import React from 'react';
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

export interface SecurityItem {
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

const iconMap = {
  security: React.createElement(SecurityIcon),
  warning: React.createElement(WarningIcon),
  check: React.createElement(CheckCircleIcon),
  error: React.createElement(ErrorIcon),
  shield: React.createElement(ShieldIcon),
  lock: React.createElement(LockIcon),
  key: React.createElement(KeyIcon),
  bug: React.createElement(BugIcon),
  visibility: React.createElement(VisibilityIcon),
  info: React.createElement(InfoIcon),
  code: React.createElement(CodeIcon),
  build: React.createElement(BuildIcon),
  assessment: React.createElement(AssessmentIcon),
  https: React.createElement(HttpsIcon),
  admin: React.createElement(AdminPanelSettingsIcon),
  token: React.createElement(TokenIcon),
  data: React.createElement(DataObjectIcon),
  api: React.createElement(ApiIcon)
};

interface SecurityItemConfig {
  enabled: boolean;
  category: string;
  name: string;
  implementationType: string;
  securityLevel: string;
  riskLevel: string;
  description: string;
  currentState: string;
  securityConcerns: string[];
  improvements: string[];
  components: string[];
  mockAspects?: string[];
  realAspects?: string[];
  complianceFrameworks: string[];
  priority: string;
  estimatedEffort: string;
  iconKey: keyof typeof iconMap;
}

const getSecurityConfig = (): Record<string, SecurityItemConfig> => ({
  'auth-system': {
    enabled: import.meta.env.VITE_SECURITY_AUTH_ENABLED !== 'false',
    category: 'authentication',
    name: import.meta.env.VITE_SECURITY_AUTH_NAME || 'Authentication System',
    implementationType: import.meta.env.VITE_SECURITY_AUTH_TYPE || 'partial-mock',
    securityLevel: import.meta.env.VITE_SECURITY_AUTH_LEVEL || 'development-only',
    riskLevel: import.meta.env.VITE_SECURITY_AUTH_RISK || 'medium',
    description: import.meta.env.VITE_SECURITY_AUTH_DESC || 'Authentication system with kubeconfig and token support',
    currentState: import.meta.env.VITE_SECURITY_AUTH_STATE || 'Working UI with backend proxy, but limited security hardening',
    securityConcerns: (import.meta.env.VITE_SECURITY_AUTH_CONCERNS || 
      'Tokens stored in localStorage,No token rotation mechanism,Basic session timeout,No multi-factor authentication'
    ).split(','),
    improvements: (import.meta.env.VITE_SECURITY_AUTH_IMPROVEMENTS ||
      'Implement secure token storage,Add token rotation and refresh mechanism,Implement MFA support,Add proper session management'
    ).split(','),
    components: (import.meta.env.VITE_SECURITY_AUTH_COMPONENTS || 'AuthContext.tsx,Login.tsx').split(','),
    mockAspects: (import.meta.env.VITE_SECURITY_AUTH_MOCK_ASPECTS ||
      'Basic CORS allowing any localhost,Simple localStorage persistence'
    ).split(','),
    realAspects: (import.meta.env.VITE_SECURITY_AUTH_REAL_ASPECTS ||
      'Real Kubernetes authentication,Session timeout mechanism,Error handling and validation'
    ).split(','),
    complianceFrameworks: (import.meta.env.VITE_SECURITY_AUTH_FRAMEWORKS || 'CIS,NIST').split(','),
    priority: import.meta.env.VITE_SECURITY_AUTH_PRIORITY || 'high',
    estimatedEffort: import.meta.env.VITE_SECURITY_AUTH_EFFORT || '1-2 weeks',
    iconKey: 'key'
  },
  'input-validation': {
    enabled: import.meta.env.VITE_SECURITY_VALIDATION_ENABLED !== 'false',
    category: 'input-validation',
    name: import.meta.env.VITE_SECURITY_VALIDATION_NAME || 'Input Validation & Sanitization',
    implementationType: import.meta.env.VITE_SECURITY_VALIDATION_TYPE || 'hardened',
    securityLevel: import.meta.env.VITE_SECURITY_VALIDATION_LEVEL || 'production-ready',
    riskLevel: import.meta.env.VITE_SECURITY_VALIDATION_RISK || 'low',
    description: import.meta.env.VITE_SECURITY_VALIDATION_DESC || 'Comprehensive input validation system for Kubernetes resources',
    currentState: import.meta.env.VITE_SECURITY_VALIDATION_STATE || 'Well-implemented validation framework with k8s-specific patterns',
    securityConcerns: (import.meta.env.VITE_SECURITY_VALIDATION_CONCERNS ||
      'No XSS protection headers explicitly set,YAML validation could be more comprehensive'
    ).split(','),
    improvements: (import.meta.env.VITE_SECURITY_VALIDATION_IMPROVEMENTS ||
      'Add CSP headers,Implement more robust YAML parsing,Add rate limiting on validation endpoints'
    ).split(','),
    components: (import.meta.env.VITE_SECURITY_VALIDATION_COMPONENTS ||
      'utils/validation.ts,contexts/ValidationContext.tsx'
    ).split(','),
    realAspects: (import.meta.env.VITE_SECURITY_VALIDATION_REAL_ASPECTS ||
      'Comprehensive regex patterns for k8s resources,Field-level validation rules,YAML syntax checking,Form validation framework'
    ).split(','),
    complianceFrameworks: (import.meta.env.VITE_SECURITY_VALIDATION_FRAMEWORKS || 'OWASP,CIS').split(','),
    priority: import.meta.env.VITE_SECURITY_VALIDATION_PRIORITY || 'medium',
    estimatedEffort: import.meta.env.VITE_SECURITY_VALIDATION_EFFORT || '3-5 days',
    iconKey: 'shield'
  },
  'data-protection': {
    enabled: import.meta.env.VITE_SECURITY_DATA_ENABLED !== 'false',
    category: 'data-protection',
    name: import.meta.env.VITE_SECURITY_DATA_NAME || 'Sensitive Data Protection',
    implementationType: import.meta.env.VITE_SECURITY_DATA_TYPE || 'partial-mock',
    securityLevel: import.meta.env.VITE_SECURITY_DATA_LEVEL || 'needs-hardening',
    riskLevel: import.meta.env.VITE_SECURITY_DATA_RISK || 'high',
    description: import.meta.env.VITE_SECURITY_DATA_DESC || 'Protection of sensitive data like tokens and secrets',
    currentState: import.meta.env.VITE_SECURITY_DATA_STATE || 'Basic masking and sanitization, needs encryption',
    securityConcerns: (import.meta.env.VITE_SECURITY_DATA_CONCERNS ||
      'Secrets stored in browser localStorage,Server URLs partially masked but not encrypted,Console logging may expose sensitive data'
    ).split(','),
    improvements: (import.meta.env.VITE_SECURITY_DATA_IMPROVEMENTS ||
      'Implement client-side encryption for sensitive data,Use secure storage mechanisms,Add data classification and handling policies'
    ).split(','),
    components: (import.meta.env.VITE_SECURITY_DATA_COMPONENTS ||
      'utils/errorHandling.ts,services/kubernetes-api.ts'
    ).split(','),
    mockAspects: (import.meta.env.VITE_SECURITY_DATA_MOCK_ASPECTS ||
      'Basic string masking,Simple log sanitization'
    ).split(','),
    realAspects: (import.meta.env.VITE_SECURITY_DATA_REAL_ASPECTS ||
      'URL masking functionality,Context-aware data sanitization'
    ).split(','),
    complianceFrameworks: (import.meta.env.VITE_SECURITY_DATA_FRAMEWORKS || 'GDPR,SOX,PCI-DSS').split(','),
    priority: import.meta.env.VITE_SECURITY_DATA_PRIORITY || 'high',
    estimatedEffort: import.meta.env.VITE_SECURITY_DATA_EFFORT || '2-3 weeks',
    iconKey: 'lock'
  }
});

export const generateSecurityItems = (): SecurityItem[] => {
  const config = getSecurityConfig();
  
  return Object.entries(config)
    .filter(([_, itemConfig]) => itemConfig.enabled)
    .map(([id, itemConfig]) => ({
      id,
      category: itemConfig.category as SecurityItem['category'],
      name: itemConfig.name,
      implementationType: itemConfig.implementationType as SecurityItem['implementationType'],
      securityLevel: itemConfig.securityLevel as SecurityItem['securityLevel'],
      riskLevel: itemConfig.riskLevel as SecurityItem['riskLevel'],
      description: itemConfig.description,
      currentState: itemConfig.currentState,
      securityConcerns: itemConfig.securityConcerns,
      improvements: itemConfig.improvements,
      components: itemConfig.components,
      mockAspects: itemConfig.mockAspects,
      realAspects: itemConfig.realAspects,
      complianceFrameworks: itemConfig.complianceFrameworks,
      priority: itemConfig.priority as SecurityItem['priority'],
      estimatedEffort: itemConfig.estimatedEffort,
      icon: iconMap[itemConfig.iconKey]
    }));
};

export const getSecurityMetrics = () => {
  const items = generateSecurityItems();
  const totalItems = items.length;
  const fullyImplemented = items.filter(item => item.implementationType === 'fully-implemented').length;
  const hardened = items.filter(item => item.implementationType === 'hardened').length;
  const mockupOnly = items.filter(item => item.implementationType === 'mockup-only').length;
  const partialMock = items.filter(item => item.implementationType === 'partial-mock').length;
  const notImplemented = items.filter(item => item.implementationType === 'not-implemented').length;
  
  const criticalRisks = items.filter(item => item.riskLevel === 'critical').length;
  const highRisks = items.filter(item => item.riskLevel === 'high').length;
  
  const overallSecurityScore = totalItems > 0 ? Math.round(
    ((fullyImplemented * 100) + (hardened * 100) + (partialMock * 50) + (mockupOnly * 20)) / totalItems
  ) : 0;

  return {
    totalItems,
    fullyImplemented,
    hardened,
    mockupOnly,
    partialMock,
    notImplemented,
    criticalRisks,
    highRisks,
    overallSecurityScore
  };
};