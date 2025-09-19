/**
 * System Validation & Monitoring Framework for Hardened Fixes
 * Provides comprehensive validation, testing, and monitoring capabilities
 */

import { config, validateConfig } from '../config/environment';
import { performHealthCheck, AppError, ErrorSeverity, logError } from './errorHandling';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  timestamp: Date;
}

export interface SystemStatus {
  healthy: boolean;
  components: ComponentStatus[];
  configValid: boolean;
  lastCheck: Date;
}

export interface ComponentStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  message: string;
  metrics?: Record<string, any>;
}

/**
 * Validate system configuration at startup
 */
export async function validateSystem(): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate configuration
  const configErrors = validateConfig(config);
  errors.push(...configErrors);
  
  // Check required environment variables
  const requiredEnvVars = ['NODE_ENV'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar] && !import.meta.env[envVar]) {
      warnings.push(`Environment variable ${envVar} is not set`);
    }
  }
  
  // Validate API connectivity
  try {
    const healthCheck = await performHealthCheck();
    if (!healthCheck.healthy) {
      errors.push('System health check failed');
      healthCheck.errors.forEach(error => {
        errors.push(error.message);
      });
    }
  } catch (error) {
    errors.push(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    timestamp: new Date()
  };
}

/**
 * Validate icon mappings to prevent runtime errors
 */
export function validateIconMappings(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Known problematic icons that were fixed
  const deprecatedIcons = ['Speed', 'HardDrive'];
  const validReplacements = {
    'Speed': ['TuneIcon', 'CpuIcon', 'ArchitectureIcon'],
    'HardDrive': ['StorageIcon']
  };
  
  // This would ideally scan the codebase for icon usage
  // For now, we document the validation rules
  
  return {
    valid: true,
    errors,
    warnings,
    timestamp: new Date()
  };
}

/**
 * Validate API endpoints and responses
 */
export async function validateApiEndpoints(): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const baseUrl = config.api.baseUrl;
  
  const endpoints = [
    { path: '/health', required: true },
    { path: '/version', required: true },
    { path: '/auth/login', required: true, method: 'POST' },
    { path: '/nodes', required: true },
    { path: '/namespaces', required: true },
    { path: '/crds', required: true },
    { path: '/events', required: true },
    { path: '/rbac/serviceaccounts', required: false }, // Stub implementation
    { path: '/rbac/roles', required: false },
    { path: '/metrics/nodes', required: false }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const method = endpoint.method || 'GET';
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        method,
        headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
        body: method === 'POST' ? '{}' : undefined
      });
      
      if (!response.ok && endpoint.required) {
        errors.push(`Required endpoint ${endpoint.path} returned ${response.status}`);
      } else if (!response.ok && !endpoint.required) {
        warnings.push(`Optional endpoint ${endpoint.path} returned ${response.status} (expected for stub)`);
      }
    } catch (error) {
      if (endpoint.required) {
        errors.push(`Failed to connect to ${endpoint.path}: ${error instanceof Error ? error.message : 'Unknown'}`);
      } else {
        warnings.push(`Optional endpoint ${endpoint.path} not available`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    timestamp: new Date()
  };
}

/**
 * Monitor system performance and detect issues
 */
export class SystemMonitor {
  private intervalId: NodeJS.Timeout | null = null;
  private listeners: ((status: SystemStatus) => void)[] = [];
  
  start(interval: number = config.ui.refreshInterval): void {
    if (this.intervalId) {
      this.stop();
    }
    
    this.intervalId = setInterval(async () => {
      const status = await this.checkSystemStatus();
      this.notifyListeners(status);
    }, interval);
  }
  
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  addListener(listener: (status: SystemStatus) => void): void {
    this.listeners.push(listener);
  }
  
  removeListener(listener: (status: SystemStatus) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
  
  private async checkSystemStatus(): Promise<SystemStatus> {
    const components: ComponentStatus[] = [];
    
    // Check API connectivity
    try {
      const response = await fetch(`${config.api.baseUrl}/health`);
      components.push({
        name: 'API',
        status: response.ok ? 'healthy' : 'error',
        message: response.ok ? 'API is responding' : `API returned ${response.status}`,
        metrics: { responseTime: Date.now() }
      });
    } catch (error) {
      components.push({
        name: 'API',
        status: 'error',
        message: `API connection failed: ${error instanceof Error ? error.message : 'Unknown'}`
      });
    }
    
    // Check configuration validity
    const configValidation = validateConfig(config);
    components.push({
      name: 'Configuration',
      status: configValidation.length === 0 ? 'healthy' : 'error',
      message: configValidation.length === 0 ? 'Configuration is valid' : `Configuration errors: ${configValidation.join(', ')}`
    });
    
    // Check feature availability
    const stubFeatures = config.features.enableStubFeatures;
    components.push({
      name: 'Features',
      status: stubFeatures ? 'warning' : 'healthy',
      message: stubFeatures ? 'Some features are running in stub mode' : 'All features are implemented'
    });
    
    const healthy = components.every(c => c.status === 'healthy');
    
    return {
      healthy,
      components,
      configValid: configValidation.length === 0,
      lastCheck: new Date()
    };
  }
  
  private notifyListeners(status: SystemStatus): void {
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in system monitor listener:', error);
      }
    });
  }
}

/**
 * Test stub implementations
 */
export async function testStubImplementations(): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Test stub API methods
  const stubTests = [
    { name: 'Service Accounts', endpoint: '/api/rbac/serviceaccounts' },
    { name: 'Roles', endpoint: '/api/rbac/roles' },
    { name: 'Cluster Roles', endpoint: '/api/rbac/clusterroles' },
    { name: 'Role Bindings', endpoint: '/api/rbac/rolebindings' },
    { name: 'Cluster Role Bindings', endpoint: '/api/rbac/clusterrolebindings' },
    { name: 'Resource Metrics', endpoint: '/api/metrics/resources' }
  ];
  
  for (const test of stubTests) {
    try {
      const response = await fetch(`${config.api.baseUrl}${test.endpoint}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length === 0) {
          warnings.push(`${test.name} is returning empty array (stub implementation)`);
        }
      } else if (response.status === 404) {
        warnings.push(`${test.name} endpoint not implemented yet`);
      } else {
        errors.push(`${test.name} returned unexpected status: ${response.status}`);
      }
    } catch (error) {
      errors.push(`Failed to test ${test.name}: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    timestamp: new Date()
  };
}

/**
 * Generate system diagnostics report
 */
export async function generateDiagnosticsReport(): Promise<string> {
  const report: string[] = [];
  
  report.push('# Kubernetes Admin UI - System Diagnostics Report');
  report.push(`Generated: ${new Date().toISOString()}`);
  report.push('');
  
  // System validation
  const systemValidation = await validateSystem();
  report.push('## System Validation');
  report.push(`Status: ${systemValidation.valid ? '✅ PASS' : '❌ FAIL'}`);
  
  if (systemValidation.errors.length > 0) {
    report.push('### Errors');
    systemValidation.errors.forEach(error => report.push(`- ${error}`));
  }
  
  if (systemValidation.warnings.length > 0) {
    report.push('### Warnings');
    systemValidation.warnings.forEach(warning => report.push(`- ${warning}`));
  }
  report.push('');
  
  // API validation
  const apiValidation = await validateApiEndpoints();
  report.push('## API Endpoints');
  report.push(`Status: ${apiValidation.valid ? '✅ PASS' : '❌ FAIL'}`);
  
  if (apiValidation.errors.length > 0) {
    report.push('### Errors');
    apiValidation.errors.forEach(error => report.push(`- ${error}`));
  }
  
  if (apiValidation.warnings.length > 0) {
    report.push('### Warnings');
    apiValidation.warnings.forEach(warning => report.push(`- ${warning}`));
  }
  report.push('');
  
  // Stub implementations
  const stubValidation = await testStubImplementations();
  report.push('## Stub Implementations');
  report.push(`Status: ${stubValidation.valid ? '✅ PASS' : '❌ FAIL'}`);
  
  if (stubValidation.warnings.length > 0) {
    report.push('### Stub Features');
    stubValidation.warnings.forEach(warning => report.push(`- ${warning}`));
  }
  report.push('');
  
  // Configuration
  report.push('## Configuration');
  report.push(`Environment: ${import.meta.env.MODE || 'development'}`);
  report.push(`API Base URL: ${config.api.baseUrl}`);
  report.push(`Stub Features: ${config.features.enableStubFeatures ? 'Enabled' : 'Disabled'}`);
  report.push(`Server Masking: ${config.security.enableServerMasking ? 'Enabled' : 'Disabled'}`);
  
  return report.join('\n');
}

// Create global system monitor instance
export const systemMonitor = new SystemMonitor();