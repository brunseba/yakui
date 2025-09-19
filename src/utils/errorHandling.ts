/**
 * Enhanced Error Handling & Fallback Mechanisms
 * Provides robust error handling, graceful degradation, and fallback strategies
 */

import { config } from '../config/environment';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AppError {
  code: string;
  message: string;
  severity: ErrorSeverity;
  timestamp: Date;
  context?: Record<string, any>;
  recoverable: boolean;
  fallbackValue?: any;
}

export interface FallbackStrategy<T = any> {
  value: T;
  reason: string;
  timestamp: Date;
}

/**
 * Create standardized application error
 */
export function createAppError(
  code: string,
  message: string,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  context?: Record<string, any>,
  fallbackValue?: any
): AppError {
  return {
    code,
    message,
    severity,
    timestamp: new Date(),
    context,
    recoverable: severity !== ErrorSeverity.CRITICAL,
    fallbackValue
  };
}

/**
 * Fallback values for critical data
 */
export const fallbackValues = {
  cluster: {
    version: {
      major: 'unknown',
      minor: 'unknown',
      gitVersion: 'unknown',
      buildDate: 'unknown',
      platform: 'unknown'
    },
    info: {
      name: 'disconnected-cluster',
      server: 'unknown',
      nodes: 0,
      namespaces: 0
    }
  },
  user: {
    username: 'anonymous',
    email: null,
    groups: [],
    permissions: []
  },
  emptyResponse: {
    serviceAccounts: [],
    roles: [],
    roleBindings: [],
    clusterRoles: [],
    clusterRoleBindings: [],
    events: [],
    pods: [],
    deployments: [],
    services: [],
    resourceMetrics: []
  }
};

/**
 * Retry mechanism with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = config.api.retries,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw createAppError(
          'RETRY_EXHAUSTED',
          `Operation failed after ${maxRetries} attempts: ${lastError.message}`,
          ErrorSeverity.HIGH,
          { attempts: maxRetries, lastError: lastError.message }
        );
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Create fallback strategy for failed operations
 */
export function createFallbackStrategy<T>(
  value: T,
  reason: string
): FallbackStrategy<T> {
  return {
    value,
    reason,
    timestamp: new Date()
  };
}

/**
 * Safe API call with fallback
 */
export async function safeApiCall<T>(
  operation: () => Promise<T>,
  fallback: T,
  errorCode: string,
  context?: Record<string, any>
): Promise<{ data: T; fallback?: FallbackStrategy<T>; error?: AppError }> {
  try {
    const data = await withRetry(operation);
    return { data };
  } catch (error) {
    const appError = createAppError(
      errorCode,
      error instanceof Error ? error.message : 'Unknown error',
      ErrorSeverity.MEDIUM,
      context,
      fallback
    );
    
    const fallbackStrategy = createFallbackStrategy(
      fallback,
      `API call failed: ${appError.message}`
    );
    
    return {
      data: fallback,
      fallback: fallbackStrategy,
      error: appError
    };
  }
}

/**
 * Graceful degradation for stub implementations
 */
export function handleStubImplementation<T>(
  featureName: string,
  fallbackValue: T,
  isEnabled: boolean = config.features.enableStubFeatures
): { data: T; fallback?: FallbackStrategy<T> } {
  if (isEnabled) {
    const fallbackStrategy = createFallbackStrategy(
      fallbackValue,
      `Feature '${featureName}' is not yet implemented - using stub data`
    );
    
    return {
      data: fallbackValue,
      fallback: fallbackStrategy
    };
  }
  
  throw createAppError(
    'FEATURE_NOT_IMPLEMENTED',
    `Feature '${featureName}' is not implemented and stub features are disabled`,
    ErrorSeverity.HIGH,
    { featureName }
  );
}

/**
 * Validate and sanitize server URL for security
 */
export function maskServerUrl(serverUrl: string): string {
  if (!config.security.enableServerMasking) {
    return serverUrl;
  }
  
  try {
    const url = new URL(serverUrl);
    const parts = url.hostname.split('.');
    
    if (parts.length > 1) {
      // Mask middle parts: example.com -> e*****.com
      return `${url.protocol}//${parts[0]}${config.cluster.serverMaskPattern}${parts[parts.length - 1]}:${url.port}`;
    } else {
      // Mask IP or single hostname
      return `${url.protocol}//${config.cluster.serverMaskPattern}:${url.port}`;
    }
  } catch {
    return config.cluster.serverMaskPattern;
  }
}

/**
 * Health check for critical services
 */
export async function performHealthCheck(): Promise<{
  healthy: boolean;
  services: Record<string, boolean>;
  errors: AppError[];
}> {
  const services: Record<string, boolean> = {};
  const errors: AppError[] = [];
  
  // Check API connectivity
  try {
    const response = await fetch(`${config.api.baseUrl}/health`, {
      timeout: config.cluster.connectionTimeout
    });
    services.api = response.ok;
  } catch (error) {
    services.api = false;
    errors.push(createAppError(
      'HEALTH_CHECK_API',
      'API health check failed',
      ErrorSeverity.HIGH,
      { error: error instanceof Error ? error.message : 'Unknown' }
    ));
  }
  
  const healthy = Object.values(services).every(status => status);
  
  return { healthy, services, errors };
}

/**
 * Log error with appropriate level
 */
export function logError(error: AppError): void {
  const logLevel = {
    [ErrorSeverity.LOW]: 'log',
    [ErrorSeverity.MEDIUM]: 'warn',
    [ErrorSeverity.HIGH]: 'error',
    [ErrorSeverity.CRITICAL]: 'error'
  }[error.severity];
  
  const logMessage = `[${error.code}] ${error.message}`;
  const logData = {
    severity: error.severity,
    timestamp: error.timestamp,
    context: error.context,
    recoverable: error.recoverable
  };
  
  if (config.security.logSensitiveData) {
    console[logLevel](logMessage, logData);
  } else {
    // Sanitize sensitive data
    const sanitizedData = { ...logData };
    if (sanitizedData.context?.token) {
      sanitizedData.context.token = '***';
    }
    if (sanitizedData.context?.password) {
      sanitizedData.context.password = '***';
    }
    console[logLevel](logMessage, sanitizedData);
  }
}