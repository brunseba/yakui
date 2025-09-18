import { useState, useCallback } from 'react';

// Common validation patterns
export const ValidationPatterns = {
  // Kubernetes resource names (RFC 1123)
  K8S_NAME: /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/,
  // Kubernetes labels and annotations
  K8S_LABEL_KEY: /^([a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*\/)?[a-z0-9]([-a-z0-9]*[a-z0-9])?$/,
  K8S_LABEL_VALUE: /^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$/,
  // Container image
  CONTAINER_IMAGE: /^([a-z0-9.-]+)(:[0-9]+)?\/[a-z0-9._-]+\/[a-z0-9._-]+(:[a-z0-9._-]+)?$/i,
  // Email
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  // URL
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  // IP Address (IPv4)
  IPV4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  // Port number
  PORT: /^([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/
};

// Validation rule types
export interface ValidationRule {
  test: (value: string) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Common validation rules
export const ValidationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    test: (value: string) => value.trim().length > 0,
    message
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    test: (value: string) => value.length >= min,
    message: message || `Must be at least ${min} characters`
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    test: (value: string) => value.length <= max,
    message: message || `Must be no more than ${max} characters`
  }),

  pattern: (pattern: RegExp, message: string): ValidationRule => ({
    test: (value: string) => pattern.test(value),
    message
  }),

  k8sName: (message = 'Must be a valid Kubernetes name (lowercase alphanumeric and hyphens)'): ValidationRule => ({
    test: (value: string) => ValidationPatterns.K8S_NAME.test(value),
    message
  }),

  k8sLabelKey: (message = 'Must be a valid Kubernetes label key'): ValidationRule => ({
    test: (value: string) => ValidationPatterns.K8S_LABEL_KEY.test(value),
    message
  }),

  k8sLabelValue: (message = 'Must be a valid Kubernetes label value'): ValidationRule => ({
    test: (value: string) => ValidationPatterns.K8S_LABEL_VALUE.test(value),
    message
  }),

  containerImage: (message = 'Must be a valid container image reference'): ValidationRule => ({
    test: (value: string) => ValidationPatterns.CONTAINER_IMAGE.test(value) || value.includes(':'),
    message
  }),

  email: (message = 'Must be a valid email address'): ValidationRule => ({
    test: (value: string) => ValidationPatterns.EMAIL.test(value),
    message
  }),

  url: (message = 'Must be a valid URL'): ValidationRule => ({
    test: (value: string) => ValidationPatterns.URL.test(value),
    message
  }),

  ipv4: (message = 'Must be a valid IPv4 address'): ValidationRule => ({
    test: (value: string) => ValidationPatterns.IPV4.test(value),
    message
  }),

  port: (message = 'Must be a valid port number (1-65535)'): ValidationRule => ({
    test: (value: string) => ValidationPatterns.PORT.test(value),
    message
  }),

  custom: (validator: (value: string) => boolean, message: string): ValidationRule => ({
    test: validator,
    message
  })
};

// Validation utility functions
export const validateField = (value: string, rules: ValidationRule[]): ValidationResult => {
  const errors: string[] = [];

  for (const rule of rules) {
    if (!rule.test(value)) {
      errors.push(rule.message);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateForm = (values: Record<string, string>, rules: Record<string, ValidationRule[]>): Record<string, ValidationResult> => {
  const results: Record<string, ValidationResult> = {};

  for (const [field, fieldRules] of Object.entries(rules)) {
    const value = values[field] || '';
    results[field] = validateField(value, fieldRules);
  }

  return results;
};

// YAML validation
export const validateYAML = (yaml: string): ValidationResult => {
  if (!yaml.trim()) {
    return { isValid: false, errors: ['YAML content is required'] };
  }

  try {
    // Basic YAML syntax check (you might want to use a proper YAML parser)
    const lines = yaml.split('\n');
    const errors: string[] = [];

    // Check for common YAML issues
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Check for tabs (YAML uses spaces)
      if (line.includes('\t')) {
        errors.push(`Line ${lineNumber}: YAML does not allow tabs, use spaces for indentation`);
      }

      // Check for consistent indentation (basic check)
      if (line.trim() && line.match(/^\s+/) && line.length > 0) {
        const indent = line.match(/^\s*/)?.[0].length || 0;
        if (indent % 2 !== 0) {
          errors.push(`Line ${lineNumber}: Inconsistent indentation (use 2 spaces per level)`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [`Invalid YAML syntax: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
};

// Kubernetes resource validation
export const validateK8sResource = (yaml: string): ValidationResult => {
  const yamlValidation = validateYAML(yaml);
  if (!yamlValidation.isValid) {
    return yamlValidation;
  }

  const errors: string[] = [];

  try {
    // Parse as JSON-like structure for basic validation
    const lines = yaml.split('\n');
    let hasApiVersion = false;
    let hasKind = false;
    let hasMetadataName = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('apiVersion:')) {
        hasApiVersion = true;
      }
      if (trimmed.startsWith('kind:')) {
        hasKind = true;
      }
      if (trimmed.startsWith('name:') && line.includes('metadata')) {
        hasMetadataName = true;
      }
    }

    if (!hasApiVersion) {
      errors.push('Missing required field: apiVersion');
    }
    if (!hasKind) {
      errors.push('Missing required field: kind');
    }
    if (!hasMetadataName) {
      errors.push('Missing required field: metadata.name');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [`Resource validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
};

// React hook for form validation
export interface UseValidationOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export interface UseValidationReturn {
  values: Record<string, string>;
  errors: Record<string, string[]>;
  isValid: boolean;
  setValue: (field: string, value: string) => void;
  setValues: (values: Record<string, string>) => void;
  validateField: (field: string) => boolean;
  validateAll: () => boolean;
  reset: () => void;
  getFieldProps: (field: string) => {
    value: string;
    onChange: (value: string) => void;
    onBlur: () => void;
    error: boolean;
    helperText: string;
  };
}

export const useValidation = (
  initialValues: Record<string, string> = {},
  validationRules: Record<string, ValidationRule[]> = {},
  options: UseValidationOptions = {}
): UseValidationReturn => {
  const [values, setValuesState] = useState<Record<string, string>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateFieldInternal = useCallback((field: string, value: string): boolean => {
    const rules = validationRules[field] || [];
    const result = validateField(value, rules);
    
    setErrors(prev => ({
      ...prev,
      [field]: result.errors
    }));

    return result.isValid;
  }, [validationRules]);

  const setValue = useCallback((field: string, value: string) => {
    setValuesState(prev => ({ ...prev, [field]: value }));
    
    if (options.validateOnChange && touched[field]) {
      validateFieldInternal(field, value);
    }
  }, [options.validateOnChange, touched, validateFieldInternal]);

  const setValues = useCallback((newValues: Record<string, string>) => {
    setValuesState(newValues);
  }, []);

  const validateFieldPublic = useCallback((field: string): boolean => {
    const value = values[field] || '';
    return validateFieldInternal(field, value);
  }, [values, validateFieldInternal]);

  const validateAll = useCallback((): boolean => {
    const results = validateForm(values, validationRules);
    const newErrors: Record<string, string[]> = {};
    let isFormValid = true;

    for (const [field, result] of Object.entries(results)) {
      newErrors[field] = result.errors;
      if (!result.isValid) {
        isFormValid = false;
      }
    }

    setErrors(newErrors);
    return isFormValid;
  }, [values, validationRules]);

  const reset = useCallback(() => {
    setValuesState(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const getFieldProps = useCallback((field: string) => ({
    value: values[field] || '',
    onChange: (value: string) => setValue(field, value),
    onBlur: () => {
      setTouched(prev => ({ ...prev, [field]: true }));
      if (options.validateOnBlur) {
        validateFieldPublic(field);
      }
    },
    error: touched[field] && errors[field]?.length > 0,
    helperText: touched[field] ? errors[field]?.join(', ') || '' : ''
  }), [values, errors, touched, setValue, validateFieldPublic, options.validateOnBlur]);

  const isValid = Object.values(errors).every(fieldErrors => fieldErrors.length === 0);

  return {
    values,
    errors,
    isValid,
    setValue,
    setValues,
    validateField: validateFieldPublic,
    validateAll,
    reset,
    getFieldProps
  };
};

// Security validation utilities
export const SecurityValidation = {
  // Check for potential security issues in container configurations
  validateContainerSecurity: (containerConfig: any): ValidationResult => {
    const errors: string[] = [];
    
    if (containerConfig.securityContext?.runAsUser === 0) {
      errors.push('Security Warning: Container running as root user (UID 0)');
    }
    
    if (containerConfig.securityContext?.privileged === true) {
      errors.push('Security Warning: Container running in privileged mode');
    }
    
    if (containerConfig.securityContext?.allowPrivilegeEscalation !== false) {
      errors.push('Security Warning: Privilege escalation not explicitly disabled');
    }
    
    if (!containerConfig.securityContext?.readOnlyRootFilesystem) {
      errors.push('Security Warning: Root filesystem is not read-only');
    }
    
    if (!containerConfig.securityContext?.runAsNonRoot) {
      errors.push('Security Warning: runAsNonRoot not set to true');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Check for insecure image references
  validateImageSecurity: (image: string): ValidationResult => {
    const errors: string[] = [];
    
    if (!image.includes(':') || image.endsWith(':latest')) {
      errors.push('Security Warning: Using latest tag or no tag specified');
    }
    
    if (image.startsWith('http://')) {
      errors.push('Security Warning: Using insecure HTTP registry');
    }
    
    if (!image.includes('/')) {
      errors.push('Security Warning: Using Docker Hub implicit registry');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Check for sensitive data exposure
  validateSensitiveData: (content: string): ValidationResult => {
    const errors: string[] = [];
    const sensitivePatterns = [
      { pattern: /password\s*[:=]\s*[^*\s]{3,}/gi, message: 'Potential password exposure' },
      { pattern: /api[_-]?key\s*[:=]\s*[^*\s]{8,}/gi, message: 'Potential API key exposure' },
      { pattern: /secret\s*[:=]\s*[^*\s]{8,}/gi, message: 'Potential secret exposure' },
      { pattern: /token\s*[:=]\s*[^*\s]{8,}/gi, message: 'Potential token exposure' },
      { pattern: /-----BEGIN\s+(PRIVATE\s+KEY|RSA\s+PRIVATE\s+KEY)/gi, message: 'Private key detected' }
    ];

    for (const { pattern, message } of sensitivePatterns) {
      if (pattern.test(content)) {
        errors.push(`Security Warning: ${message}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};