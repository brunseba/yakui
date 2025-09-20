/**
 * Runtime Configuration Validation
 * 
 * Validates environment configuration on application startup
 * and provides helpful error messages for missing or invalid values.
 */

interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface RequiredConfig {
  name: string;
  envVar: string;
  description: string;
  isRequired: boolean;
  validate?: (value: string) => boolean;
  defaultValue?: string;
}

// Configuration schema
const configSchema: RequiredConfig[] = [
  {
    name: 'API Base URL',
    envVar: 'VITE_API_BASE_URL',
    description: 'Backend API server URL',
    isRequired: !window.location.hostname.includes('localhost'), // Only required in production
    validate: (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }
  },
  {
    name: 'API Timeout',
    envVar: 'VITE_API_TIMEOUT',
    description: 'API request timeout in milliseconds',
    isRequired: false,
    defaultValue: '30000',
    validate: (value) => {
      const num = parseInt(value);
      return !isNaN(num) && num > 0 && num <= 300000; // Max 5 minutes
    }
  },
  {
    name: 'Max Retries',
    envVar: 'VITE_API_MAX_RETRIES',
    description: 'Maximum number of API retry attempts',
    isRequired: false,
    defaultValue: '3',
    validate: (value) => {
      const num = parseInt(value);
      return !isNaN(num) && num >= 0 && num <= 10;
    }
  },
  {
    name: 'Retry Delay',
    envVar: 'VITE_API_RETRY_DELAY',
    description: 'Delay between retry attempts in milliseconds',
    isRequired: false,
    defaultValue: '1000',
    validate: (value) => {
      const num = parseInt(value);
      return !isNaN(num) && num >= 100 && num <= 10000;
    }
  }
];

/**
 * Validate frontend configuration
 */
export const validateFrontendConfig = (): ConfigValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const config of configSchema) {
    const value = import.meta.env[config.envVar];
    
    if (!value && config.isRequired) {
      errors.push(
        `❌ ${config.name} (${config.envVar}) is required but not set.\n` +
        `   Description: ${config.description}\n` +
        `   Please set this environment variable before starting the application.`
      );
      continue;
    }

    if (!value && !config.isRequired) {
      warnings.push(
        `⚠️  ${config.name} (${config.envVar}) not set, using default: ${config.defaultValue}\n` +
        `   Description: ${config.description}`
      );
      continue;
    }

    if (value && config.validate && !config.validate(value)) {
      errors.push(
        `❌ ${config.name} (${config.envVar}) has invalid value: "${value}"\n` +
        `   Description: ${config.description}\n` +
        `   Please check the value format and try again.`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validate theme configuration
 */
export const validateThemeConfig = (): ConfigValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate theme colors JSON if provided
  const themeColors = import.meta.env.VITE_DEPENDENCY_THEME_COLORS;
  if (themeColors) {
    try {
      const parsed = JSON.parse(themeColors);
      if (typeof parsed !== 'object' || parsed === null) {
        errors.push(
          `❌ VITE_DEPENDENCY_THEME_COLORS must be a valid JSON object.\n` +
          `   Current value: "${themeColors}"`
        );
      }
    } catch (error) {
      errors.push(
        `❌ VITE_DEPENDENCY_THEME_COLORS contains invalid JSON.\n` +
        `   Current value: "${themeColors}"\n` +
        `   Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Validate numeric dimension values
  const dimensionVars = [
    { name: 'VITE_DEPENDENCY_NODE_WIDTH', min: 100, max: 500 },
    { name: 'VITE_DEPENDENCY_NODE_HEIGHT', min: 80, max: 300 },
    { name: 'VITE_DEPENDENCY_GRAPH_HEIGHT', min: 200, max: 2000 }
  ];

  for (const dimVar of dimensionVars) {
    const value = import.meta.env[dimVar.name];
    if (value) {
      const num = parseInt(value);
      if (isNaN(num) || num < dimVar.min || num > dimVar.max) {
        errors.push(
          `❌ ${dimVar.name} must be a number between ${dimVar.min} and ${dimVar.max}.\n` +
          `   Current value: "${value}"`
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validate complete application configuration
 */
export const validateAppConfig = (): ConfigValidationResult => {
  const frontendResult = validateFrontendConfig();
  const themeResult = validateThemeConfig();

  return {
    isValid: frontendResult.isValid && themeResult.isValid,
    errors: [...frontendResult.errors, ...themeResult.errors],
    warnings: [...frontendResult.warnings, ...themeResult.warnings]
  };
};

/**
 * Log configuration validation results
 */
export const logConfigValidation = (result: ConfigValidationResult) => {
  console.log('\n🔧 Configuration Validation Results:');
  
  if (result.isValid) {
    console.log('✅ All configuration is valid!');
  } else {
    console.log('❌ Configuration validation failed!');
    console.log('\nErrors:');
    result.errors.forEach(error => console.log(`\n${error}`));
  }

  if (result.warnings.length > 0) {
    console.log('\nWarnings:');
    result.warnings.forEach(warning => console.log(`\n${warning}`));
  }

  if (!result.isValid) {
    console.log('\n📋 Configuration Help:');
    console.log('• Copy .env.example to .env.local and configure your values');
    console.log('• Check the PRODUCTION DEPLOYMENT CHECKLIST in .env.example');
    console.log('• Ensure your Kubernetes cluster context is accessible');
    console.log('• Test cluster connectivity: kubectl get nodes\n');
  }

  console.log(''); // Empty line for readability
};

/**
 * Get current configuration summary for debugging
 */
export const getConfigSummary = () => {
  const summary = {
    frontend: {
      apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '(not set)',
      apiTimeout: import.meta.env.VITE_API_TIMEOUT || '(using default)',
      maxRetries: import.meta.env.VITE_API_MAX_RETRIES || '(using default)',
      retryDelay: import.meta.env.VITE_API_RETRY_DELAY || '(using default)'
    },
    theme: {
      customColors: import.meta.env.VITE_DEPENDENCY_THEME_COLORS ? '(custom)' : '(default)',
      nodeWidth: import.meta.env.VITE_DEPENDENCY_NODE_WIDTH || '(default)',
      nodeHeight: import.meta.env.VITE_DEPENDENCY_NODE_HEIGHT || '(default)',
      graphHeight: import.meta.env.VITE_DEPENDENCY_GRAPH_HEIGHT || '(default)'
    },
    environment: {
      mode: import.meta.env.MODE,
      dev: import.meta.env.DEV,
      prod: import.meta.env.PROD
    }
  };

  return summary;
};