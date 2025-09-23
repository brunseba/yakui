import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Alert,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
  Stack,
  CircularProgress,
  Snackbar
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
  Check as CompleteIcon,
  Settings as ConfigIcon,
  Code as SchemaIcon,
  Visibility as PreviewIcon,
  CloudUpload as ApplyIcon
} from '@mui/icons-material';
import { CRDTemplateSelector } from './CRDTemplateSelector';
import { CRDSchemaEditor, CRDSchemaConfig } from './CRDSchemaEditor';
import { CRDPreviewPanel } from './CRDPreviewPanel';
import { crdComposerService, CRDTemplate } from '../../services/CRDComposerService';

interface CRDMetadata {
  group: string;
  names: {
    kind: string;
    plural: string;
    singular: string;
    shortNames: string[];
  };
}

interface CRDSpecConfig {
  version: string;
  scope: 'Namespaced' | 'Cluster';
  additionalPrinterColumns?: any[];
  subresources?: {
    status?: {};
    scale?: any;
  };
}

interface CRDBuilderState {
  metadata: CRDMetadata;
  spec: CRDSpecConfig;
  schema: CRDSchemaConfig;
  generatedCRD: any | null;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

const steps = [
  { label: 'Basic Configuration', icon: <ConfigIcon /> },
  { label: 'Schema Definition', icon: <SchemaIcon /> },
  { label: 'Preview & Apply', icon: <PreviewIcon /> }
];

export const CRDBuilder: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });

  const [state, setState] = useState<CRDBuilderState>({
    metadata: {
      group: 'example.com',
      names: {
        kind: 'MyResource',
        plural: 'myresources',
        singular: 'myresource',
        shortNames: []
      }
    },
    spec: {
      version: 'v1',
      scope: 'Namespaced',
      subresources: {
        status: {}
      }
    },
    schema: {
      type: 'object',
      description: 'Custom resource specification',
      properties: {},
      required: []
    },
    generatedCRD: null,
    validation: {
      isValid: false,
      errors: [],
      warnings: []
    }
  });

  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setNotification({ open: true, message, severity });
  };

  const handleTemplateSelect = (template: CRDTemplate) => {
    setState({
      ...state,
      metadata: template.template.metadata,
      spec: template.template.spec,
      schema: template.template.schema
    });
    setTemplateSelectorOpen(false);
  };

  const handleMetadataChange = (field: string, value: any) => {
    setState(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [field]: value
      }
    }));
  };

  const handleSpecChange = (field: string, value: any) => {
    setState(prev => ({
      ...prev,
      spec: {
        ...prev.spec,
        [field]: value
      }
    }));
  };

  const handleSchemaChange = (schema: CRDSchemaConfig) => {
    setState(prev => ({
      ...prev,
      schema
    }));
  };

  const validateCurrentStep = () => {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (activeStep) {
      case 0: // Basic Configuration
        if (!state.metadata.group.trim()) {
          errors.push('API Group is required');
        }
        if (!state.metadata.names.kind.trim()) {
          errors.push('Kind is required');
        }
        if (!state.metadata.names.plural.trim()) {
          errors.push('Plural name is required');
        }
        if (!state.spec.version.trim()) {
          errors.push('Version is required');
        }

        // Validate naming conventions
        if (state.metadata.group && !state.metadata.group.match(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/)) {
          errors.push('API Group must be a valid domain name');
        }
        if (state.metadata.names.kind && !state.metadata.names.kind.match(/^[A-Z][a-zA-Z0-9]*$/)) {
          errors.push('Kind must start with uppercase letter and contain only alphanumeric characters');
        }
        if (state.metadata.names.plural && !state.metadata.names.plural.match(/^[a-z][a-z0-9]*$/)) {
          errors.push('Plural name must start with lowercase letter and contain only alphanumeric characters');
        }
        break;

      case 1: // Schema Definition
        if (Object.keys(state.schema.properties).length === 0) {
          warnings.push('No schema properties defined');
        }
        
        Object.entries(state.schema.properties).forEach(([name, property]) => {
          if (!property.description) {
            warnings.push(`Property "${name}" missing description`);
          }
          if (!name.match(/^[a-zA-Z][a-zA-Z0-9_]*$/)) {
            errors.push(`Property "${name}" has invalid name`);
          }
        });
        break;
    }

    return { isValid: errors.length === 0, errors, warnings };
  };

  const generateCRD = useCallback(async () => {
    try {
      setLoading(true);
      const composerData = {
        metadata: state.metadata,
        spec: state.spec,
        schema: state.schema
      };

      const response = await crdComposerService.generateCRD(composerData);
      setState(prev => ({
        ...prev,
        generatedCRD: response.crd
      }));

      // Validate the generated CRD
      const validation = await crdComposerService.validateCRD(response.crd);
      setState(prev => ({
        ...prev,
        validation
      }));
    } catch (error) {
      console.error('Failed to generate CRD:', error);
      showNotification('Failed to generate CRD: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [state.metadata, state.spec, state.schema]);

  const handleNext = async () => {
    const validation = validateCurrentStep();
    if (!validation.isValid) {
      showNotification(`Please fix ${validation.errors.length} error(s) before continuing`, 'error');
      return;
    }

    if (activeStep === 1) {
      // Generate CRD when moving to preview step
      await generateCRD();
    }

    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleApplyToCluster = async () => {
    if (!state.generatedCRD || !state.validation.isValid) {
      showNotification('Cannot apply invalid CRD to cluster', 'error');
      return;
    }

    try {
      setLoading(true);
      const result = await crdComposerService.applyCRD(state.generatedCRD, false);
      showNotification(`CRD ${result.action} successfully in cluster`, 'success');
    } catch (error) {
      console.error('Failed to apply CRD:', error);
      showNotification('Failed to apply CRD to cluster: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Basic CRD Configuration
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="API Group"
                    value={state.metadata.group}
                    onChange={(e) => handleMetadataChange('group', e.target.value)}
                    fullWidth
                    required
                    helperText="e.g., example.com, apps.mycompany.com"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Scope</InputLabel>
                    <Select
                      value={state.spec.scope}
                      label="Scope"
                      onChange={(e) => handleSpecChange('scope', e.target.value)}
                    >
                      <MenuItem value="Namespaced">Namespaced</MenuItem>
                      <MenuItem value="Cluster">Cluster</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Kind"
                    value={state.metadata.names.kind}
                    onChange={(e) => handleMetadataChange('names', {
                      ...state.metadata.names,
                      kind: e.target.value
                    })}
                    fullWidth
                    required
                    helperText="Singular name, PascalCase (e.g., MyResource)"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Plural Name"
                    value={state.metadata.names.plural}
                    onChange={(e) => handleMetadataChange('names', {
                      ...state.metadata.names,
                      plural: e.target.value
                    })}
                    fullWidth
                    required
                    helperText="Plural name, lowercase (e.g., myresources)"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Singular Name"
                    value={state.metadata.names.singular}
                    onChange={(e) => handleMetadataChange('names', {
                      ...state.metadata.names,
                      singular: e.target.value
                    })}
                    fullWidth
                    helperText="Optional, defaults to kind in lowercase"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Version"
                    value={state.spec.version}
                    onChange={(e) => handleSpecChange('version', e.target.value)}
                    fullWidth
                    required
                    helperText="e.g., v1, v1beta1, v2alpha1"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Short Names (comma-separated)"
                    value={state.metadata.names.shortNames.join(', ')}
                    onChange={(e) => handleMetadataChange('names', {
                      ...state.metadata.names,
                      shortNames: e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0)
                    })}
                    fullWidth
                    helperText="Optional kubectl shortcuts (e.g., mr, app)"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!state.spec.subresources?.status}
                        onChange={(e) => handleSpecChange('subresources', {
                          ...state.spec.subresources,
                          status: e.target.checked ? {} : undefined
                        })}
                      />
                    }
                    label="Enable Status Subresource"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        );

      case 1:
        return (
          <CRDSchemaEditor
            schema={state.schema}
            onChange={handleSchemaChange}
            title="Resource Schema Definition"
          />
        );

      case 2:
        return (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12} lg={8}>
                <CRDPreviewPanel
                  crdData={state.generatedCRD}
                  isValid={state.validation.isValid}
                  errors={state.validation.errors}
                  warnings={state.validation.warnings}
                  onApplyToCluster={handleApplyToCluster}
                />
              </Grid>
              <Grid item xs={12} lg={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      CRD Summary
                    </Typography>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Resource Information
                        </Typography>
                        <Typography variant="body2">
                          <strong>Kind:</strong> {state.metadata.names.kind}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Group:</strong> {state.metadata.group}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Version:</strong> {state.spec.version}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Scope:</strong> {state.spec.scope}
                        </Typography>
                      </Box>
                      
                      <Divider />
                      
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Schema Statistics
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Chip 
                            label={`${Object.keys(state.schema.properties).length} Properties`}
                            size="small"
                            color="primary"
                          />
                          <Chip 
                            label={`${state.schema.required?.length || 0} Required`}
                            size="small"
                            color="secondary"
                          />
                        </Stack>
                      </Box>
                      
                      <Divider />
                      
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Validation Status
                        </Typography>
                        <Stack spacing={1}>
                          {state.validation.isValid ? (
                            <Alert severity="success" sx={{ py: 0 }}>
                              CRD is valid and ready to apply
                            </Alert>
                          ) : (
                            <Alert severity="error" sx={{ py: 0 }}>
                              {state.validation.errors.length} errors found
                            </Alert>
                          )}
                          
                          {state.validation.warnings.length > 0 && (
                            <Alert severity="warning" sx={{ py: 0 }}>
                              {state.validation.warnings.length} warnings
                            </Alert>
                          )}
                        </Stack>
                      </Box>
                      
                      <Divider />
                      
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<ApplyIcon />}
                        onClick={handleApplyToCluster}
                        disabled={!state.validation.isValid || loading}
                        color="primary"
                      >
                        {loading ? <CircularProgress size={20} /> : 'Apply to Cluster'}
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return null;
    }
  };

  const currentValidation = validateCurrentStep();

  return (
    <Box sx={{ width: '100%' }}>
      {/* Template Selector */}
      <CRDTemplateSelector
        open={templateSelectorOpen}
        onClose={() => setTemplateSelectorOpen(false)}
        onSelectTemplate={handleTemplateSelect}
      />

      {/* Stepper */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((step, index) => (
            <Step key={step.label} completed={index < activeStep}>
              <StepLabel icon={step.icon}>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Validation Alerts */}
      {currentValidation.errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Please fix the following errors:</Typography>
          <ul style={{ margin: '8px 0', paddingLeft: '16px' }}>
            {currentValidation.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {currentValidation.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Recommendations:</Typography>
          <ul style={{ margin: '8px 0', paddingLeft: '16px' }}>
            {currentValidation.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Step Content */}
      <Box sx={{ mb: 3 }}>
        {renderStepContent()}
      </Box>

      {/* Navigation Buttons */}
      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Button
          startIcon={<BackIcon />}
          onClick={handleBack}
          disabled={activeStep === 0}
        >
          Back
        </Button>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setTemplateSelectorOpen(true)}
          >
            Choose Template
          </Button>
          
          {activeStep < steps.length - 1 ? (
            <Button
              variant="contained"
              endIcon={<NextIcon />}
              onClick={handleNext}
              disabled={!currentValidation.isValid || loading}
            >
              {loading ? <CircularProgress size={20} /> : 'Next'}
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<CompleteIcon />}
              color="success"
              disabled={!state.validation.isValid}
            >
              Complete
            </Button>
          )}
        </Box>
      </Paper>

      {/* Notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert severity={notification.severity} variant="filled">
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CRDBuilder;