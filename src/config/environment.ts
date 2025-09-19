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
    baseUrl: 'http://localhost:3001/api',
    timeout: 30000,
    retries: 3,
  },
  cluster: {
    defaultContext: 'kind-krateo-quickstart',
    serverMaskPattern: '****',
    connectionTimeout: 10000,
  },
  ui: {
    refreshInterval: 30000,
    maxLogLines: 1000,
    defaultPageSize: 20,
  },
  security: {
    enableServerMasking: true,
    logSensitiveData: false,
  },
  features: {
    enableStubFeatures: true,
    enableMetrics: false,
    enableLogs: true,
  },
};

const developmentConfig: Partial<AppConfig> = {
  security: {
    enableServerMasking: false,
    logSensitiveData: true,
  },
  features: {
    enableStubFeatures: true,
    enableMetrics: true,
    enableLogs: true,
  },
};

const productionConfig: Partial<AppConfig> = {
  security: {
    enableServerMasking: true,
    logSensitiveData: false,
  },
  features: {
    enableStubFeatures: false,
    enableMetrics: true,
    enableLogs: true,
  },
};

const testConfig: Partial<AppConfig> = {
  api: {
    baseUrl: 'http://localhost:3002/api',
    timeout: 5000,
    retries: 1,
  },
  features: {
    enableStubFeatures: true,
    enableMetrics: false,
    enableLogs: false,
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