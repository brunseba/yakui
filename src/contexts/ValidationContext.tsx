import React, { createContext, useContext, useState, useCallback } from 'react';
import { 
  validateField, 
  validateForm,
  validateYAML,
  validateK8sResource,
  SecurityValidation
} from '../utils/validation';
import type { ValidationResult, ValidationRule } from '../utils/validation';

interface ValidationContextType {
  // Field validation
  validateFieldValue: (value: string, rules: ValidationRule[]) => ValidationResult;
  
  // Form validation
  validateFormValues: (values: Record<string, string>, rules: Record<string, ValidationRule[]>) => Record<string, ValidationResult>;
  
  // YAML validation
  validateYAMLContent: (yaml: string) => ValidationResult;
  
  // Kubernetes resource validation
  validateK8sResourceContent: (yaml: string) => ValidationResult;
  
  // Security validation
  validateContainerSecurity: (containerConfig: any) => ValidationResult;
  validateImageSecurity: (image: string) => ValidationResult;
  validateSensitiveData: (content: string) => ValidationResult;
  
  // Global validation state
  globalValidationEnabled: boolean;
  setGlobalValidationEnabled: (enabled: boolean) => void;
  
  // Validation history
  validationHistory: ValidationHistoryEntry[];
  addValidationToHistory: (entry: ValidationHistoryEntry) => void;
  clearValidationHistory: () => void;
}

interface ValidationHistoryEntry {
  id: string;
  timestamp: Date;
  type: 'field' | 'form' | 'yaml' | 'k8s-resource' | 'security';
  context: string;
  result: ValidationResult;
  details?: any;
}

const ValidationContext = createContext<ValidationContextType | undefined>(undefined);

export const useValidation = () => {
  const context = useContext(ValidationContext);
  if (!context) {
    throw new Error('useValidation must be used within a ValidationProvider');
  }
  return context;
};

interface ValidationProviderProps {
  children: React.ReactNode;
}

export const ValidationProvider: React.FC<ValidationProviderProps> = ({ children }) => {
  const [globalValidationEnabled, setGlobalValidationEnabled] = useState(true);
  const [validationHistory, setValidationHistory] = useState<ValidationHistoryEntry[]>([]);

  const addValidationToHistory = useCallback((entry: ValidationHistoryEntry) => {
    setValidationHistory(prev => [entry, ...prev.slice(0, 99)]); // Keep last 100 entries
  }, []);

  const clearValidationHistory = useCallback(() => {
    setValidationHistory([]);
  }, []);

  const validateFieldValue = useCallback((value: string, rules: ValidationRule[]): ValidationResult => {
    if (!globalValidationEnabled) {
      return { isValid: true, errors: [] };
    }

    const result = validateField(value, rules);
    
    const historyEntry: ValidationHistoryEntry = {
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: 'field',
      context: 'Field validation',
      result,
      details: { value, rulesCount: rules.length }
    };
    
    addValidationToHistory(historyEntry);
    return result;
  }, [globalValidationEnabled, addValidationToHistory]);

  const validateFormValues = useCallback((
    values: Record<string, string>, 
    rules: Record<string, ValidationRule[]>
  ): Record<string, ValidationResult> => {
    if (!globalValidationEnabled) {
      const emptyResults: Record<string, ValidationResult> = {};
      Object.keys(rules).forEach(key => {
        emptyResults[key] = { isValid: true, errors: [] };
      });
      return emptyResults;
    }

    const results = validateForm(values, rules);
    
    const totalErrors = Object.values(results).reduce((sum, result) => sum + result.errors.length, 0);
    const historyEntry: ValidationHistoryEntry = {
      id: `form-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: 'form',
      context: 'Form validation',
      result: { 
        isValid: totalErrors === 0, 
        errors: [`${totalErrors} total errors across ${Object.keys(results).length} fields`] 
      },
      details: { fieldCount: Object.keys(values).length, totalErrors }
    };
    
    addValidationToHistory(historyEntry);
    return results;
  }, [globalValidationEnabled, addValidationToHistory]);

  const validateYAMLContent = useCallback((yaml: string): ValidationResult => {
    if (!globalValidationEnabled) {
      return { isValid: true, errors: [] };
    }

    const result = validateYAML(yaml);
    
    const historyEntry: ValidationHistoryEntry = {
      id: `yaml-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: 'yaml',
      context: 'YAML validation',
      result,
      details: { length: yaml.length, lines: yaml.split('\n').length }
    };
    
    addValidationToHistory(historyEntry);
    return result;
  }, [globalValidationEnabled, addValidationToHistory]);

  const validateK8sResourceContent = useCallback((yaml: string): ValidationResult => {
    if (!globalValidationEnabled) {
      return { isValid: true, errors: [] };
    }

    const result = validateK8sResource(yaml);
    
    const historyEntry: ValidationHistoryEntry = {
      id: `k8s-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: 'k8s-resource',
      context: 'Kubernetes resource validation',
      result,
      details: { length: yaml.length, lines: yaml.split('\n').length }
    };
    
    addValidationToHistory(historyEntry);
    return result;
  }, [globalValidationEnabled, addValidationToHistory]);

  const validateContainerSecurity = useCallback((containerConfig: any): ValidationResult => {
    if (!globalValidationEnabled) {
      return { isValid: true, errors: [] };
    }

    const result = SecurityValidation.validateContainerSecurity(containerConfig);
    
    const historyEntry: ValidationHistoryEntry = {
      id: `security-container-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: 'security',
      context: 'Container security validation',
      result,
      details: { containerConfig }
    };
    
    addValidationToHistory(historyEntry);
    return result;
  }, [globalValidationEnabled, addValidationToHistory]);

  const validateImageSecurity = useCallback((image: string): ValidationResult => {
    if (!globalValidationEnabled) {
      return { isValid: true, errors: [] };
    }

    const result = SecurityValidation.validateImageSecurity(image);
    
    const historyEntry: ValidationHistoryEntry = {
      id: `security-image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: 'security',
      context: 'Image security validation',
      result,
      details: { image }
    };
    
    addValidationToHistory(historyEntry);
    return result;
  }, [globalValidationEnabled, addValidationToHistory]);

  const validateSensitiveData = useCallback((content: string): ValidationResult => {
    if (!globalValidationEnabled) {
      return { isValid: true, errors: [] };
    }

    const result = SecurityValidation.validateSensitiveData(content);
    
    const historyEntry: ValidationHistoryEntry = {
      id: `security-sensitive-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: 'security',
      context: 'Sensitive data validation',
      result,
      details: { contentLength: content.length }
    };
    
    addValidationToHistory(historyEntry);
    return result;
  }, [globalValidationEnabled, addValidationToHistory]);

  const value: ValidationContextType = {
    validateFieldValue,
    validateFormValues,
    validateYAMLContent,
    validateK8sResourceContent,
    validateContainerSecurity,
    validateImageSecurity,
    validateSensitiveData,
    globalValidationEnabled,
    setGlobalValidationEnabled,
    validationHistory,
    addValidationToHistory,
    clearValidationHistory
  };

  return (
    <ValidationContext.Provider value={value}>
      {children}
    </ValidationContext.Provider>
  );
};