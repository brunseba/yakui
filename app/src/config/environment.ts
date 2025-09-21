/**
 * Environment Configuration Management
 * Centralizes all hardcoded values and provides environment-specific configuration
 */

export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
  };
  cluster: {
    defaultContext: string;
    serverMaskPattern: string;
    connectionTimeout: number;
  };
  ui: {
    refreshInterval: number;
    maxLogLines: number;
    defaultPageSize: number;
  };
  security: {
    enableServerMasking: boolean;
    logSensitiveData: boolean;
  };
  features: {
    enableStubFeatures: boolean;
    enableMetrics: boolean;
    enableLogs: boolean;
  };
}

const defaultConfig: AppConfig = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
    retries: parseInt(import.meta.env.VITE_API_RETRIES || '3'),
  },
  cluster: {
    defaultContext: import.meta.env.VITE_CLUSTER_CONTEXT || 'default',
    serverMaskPattern: import.meta.env.VITE_SERVER_MASK_PATTERN || '****',
    connectionTimeout: parseInt(import.meta.env.VITE_CONNECTION_TIMEOUT || '10000'),
  },
  ui: {
    refreshInterval: parseInt(import.meta.env.VITE_REFRESH_INTERVAL || '30000'),
    maxLogLines: parseInt(import.meta.env.VITE_MAX_LOG_LINES || '1000'),
    defaultPageSize: parseInt(import.meta.env.VITE_DEFAULT_PAGE_SIZE || '20'),
  },
  security: {
    enableServerMasking: import.meta.env.VITE_ENABLE_SERVER_MASKING === 'true',
    logSensitiveData: import.meta.env.VITE_LOG_SENSITIVE_DATA === 'true',
  },
  features: {
    enableStubFeatures: import.meta.env.VITE_ENABLE_STUB_FEATURES === 'true',
    enableMetrics: import.meta.env.VITE_ENABLE_METRICS === 'true',
    enableLogs: import.meta.env.VITE_ENABLE_LOGS !== 'false', // Default to true
  },
};

const developmentConfig: Partial<AppConfig> = {
  api: {
    baseUrl: import.meta.env.VITE_DEV_API_BASE_URL || 'http://localhost:3001/api',
    timeout: parseInt(import.meta.env.VITE_DEV_API_TIMEOUT || '30000'),
    retries: parseInt(import.meta.env.VITE_DEV_API_RETRIES || '3'),
  },
  security: {
    enableServerMasking: import.meta.env.VITE_DEV_ENABLE_SERVER_MASKING === 'true',
    logSensitiveData: import.meta.env.VITE_DEV_LOG_SENSITIVE_DATA === 'true',
  },
  features: {
    enableStubFeatures: import.meta.env.VITE_DEV_ENABLE_STUB_FEATURES !== 'false', // Default to true in dev
    enableMetrics: import.meta.env.VITE_DEV_ENABLE_METRICS === 'true',
    enableLogs: import.meta.env.VITE_DEV_ENABLE_LOGS !== 'false', // Default to true in dev
  },
};

const productionConfig: Partial<AppConfig> = {
  security: {
    enableServerMasking: import.meta.env.VITE_PROD_ENABLE_SERVER_MASKING !== 'false', // Default to true in prod
    logSensitiveData: import.meta.env.VITE_PROD_LOG_SENSITIVE_DATA === 'true', // Default to false in prod
  },
  features: {
    enableStubFeatures: import.meta.env.VITE_PROD_ENABLE_STUB_FEATURES === 'true', // Default to false in prod
    enableMetrics: import.meta.env.VITE_PROD_ENABLE_METRICS !== 'false', // Default to true in prod
    enableLogs: import.meta.env.VITE_PROD_ENABLE_LOGS !== 'false', // Default to true in prod
  },
};

const testConfig: Partial<AppConfig> = {
  api: {
    baseUrl: import.meta.env.VITE_TEST_API_BASE_URL || 'http://localhost:3002/api',
    timeout: parseInt(import.meta.env.VITE_TEST_API_TIMEOUT || '5000'),
    retries: parseInt(import.meta.env.VITE_TEST_API_RETRIES || '1'),
  },
  features: {
    enableStubFeatures: import.meta.env.VITE_TEST_ENABLE_STUB_FEATURES !== 'false', // Default to true in test
    enableMetrics: import.meta.env.VITE_TEST_ENABLE_METRICS === 'true', // Default to false in test
    enableLogs: import.meta.env.VITE_TEST_ENABLE_LOGS === 'true', // Default to false in test
  },
};

/**
 * Get environment-specific configuration
 */
export function getConfig(): AppConfig {
  const env = import.meta.env.MODE || 'development';
  
  let config = { ...defaultConfig };
  
  switch (env) {
    case 'development':
      config = { ...config, ...developmentConfig };
      break;
    case 'production':
      config = { ...config, ...productionConfig };
      break;
    case 'test':
      config = { ...config, ...testConfig };
      break;
  }
  
  // Override with environment variables if available
  if (import.meta.env.VITE_API_BASE_URL) {
    config.api.baseUrl = import.meta.env.VITE_API_BASE_URL;
  }
  
  if (import.meta.env.VITE_CLUSTER_CONTEXT) {
    config.cluster.defaultContext = import.meta.env.VITE_CLUSTER_CONTEXT;
  }
  
  return config;
}

/**
 * Validate configuration at startup
 */
export function validateConfig(config: AppConfig): string[] {
  const errors: string[] = [];
  
  if (!config.api.baseUrl) {
    errors.push('API base URL is required');
  }
  
  if (config.api.timeout < 1000) {
    errors.push('API timeout should be at least 1000ms');
  }
  
  if (config.ui.refreshInterval < 5000) {
    errors.push('UI refresh interval should be at least 5000ms');
  }
  
  return errors;
}

export const config = getConfig();