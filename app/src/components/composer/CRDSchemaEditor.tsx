import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  Button,
  IconButton,
  Paper,
  Divider,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Alert,
  Tooltip,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  DragIndicator as DragIcon
} from '@mui/icons-material';

// Schema property types supported
const PROPERTY_TYPES = [
  { value: 'string', label: 'String' },
  { value: 'integer', label: 'Integer' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'array', label: 'Array' },
  { value: 'object', label: 'Object' }
];

// String formats
const STRING_FORMATS = [
  { value: '', label: 'None' },
  { value: 'date-time', label: 'Date-Time' },
  { value: 'email', label: 'Email' },
  { value: 'hostname', label: 'Hostname' },
  { value: 'uri', label: 'URI' },
  { value: 'uuid', label: 'UUID' }
];

export interface SchemaProperty {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: string[];
  items?: SchemaProperty; // For arrays
  properties?: { [key: string]: SchemaProperty }; // For objects
  default?: any;
}

export interface CRDSchemaConfig {
  type: 'object';
  description?: string;
  properties: { [key: string]: SchemaProperty };
  required?: string[];
}

interface CRDSchemaEditorProps {
  schema: CRDSchemaConfig;
  onChange: (schema: CRDSchemaConfig) => void;
  title?: string;
}

export const CRDSchemaEditor: React.FC<CRDSchemaEditorProps> = ({
  schema,
  onChange,
  title = 'Schema Configuration'
}) => {
  const [expandedProperties, setExpandedProperties] = useState<{ [key: string]: boolean }>({});

  const handleDescriptionChange = (description: string) => {
    onChange({
      ...schema,
      description
    });
  };

  const handleAddProperty = () => {
    const newPropertyName = `property${Object.keys(schema.properties).length + 1}`;
    const newProperty: SchemaProperty = {
      name: newPropertyName,
      type: 'string',
      description: '',
      required: false
    };

    onChange({
      ...schema,
      properties: {
        ...schema.properties,
        [newPropertyName]: newProperty
      }
    });
  };

  const handlePropertyChange = (propertyName: string, property: SchemaProperty) => {
    const updatedProperties = { ...schema.properties };
    
    // If the name changed, we need to update the key
    if (property.name !== propertyName) {
      delete updatedProperties[propertyName];
      updatedProperties[property.name] = property;
      
      // Update required array if the property was required
      const updatedRequired = schema.required?.map(name => 
        name === propertyName ? property.name : name
      ) || [];
      
      onChange({
        ...schema,
        properties: updatedProperties,
        required: updatedRequired
      });
    } else {
      updatedProperties[propertyName] = property;
      onChange({
        ...schema,
        properties: updatedProperties
      });
    }
  };

  const handleDeleteProperty = (propertyName: string) => {
    const updatedProperties = { ...schema.properties };
    delete updatedProperties[propertyName];
    
    const updatedRequired = schema.required?.filter(name => name !== propertyName) || [];
    
    onChange({
      ...schema,
      properties: updatedProperties,
      required: updatedRequired
    });
  };

  const handleRequiredChange = (propertyName: string, required: boolean) => {
    const currentRequired = schema.required || [];
    let updatedRequired: string[];
    
    if (required) {
      updatedRequired = [...currentRequired, propertyName];
    } else {
      updatedRequired = currentRequired.filter(name => name !== propertyName);
    }
    
    onChange({
      ...schema,
      required: updatedRequired
    });
  };

  const togglePropertyExpanded = (propertyName: string) => {
    setExpandedProperties(prev => ({
      ...prev,
      [propertyName]: !prev[propertyName]
    }));
  };

  const renderPropertyEditor = (propertyName: string, property: SchemaProperty) => {
    const isRequired = schema.required?.includes(propertyName) || false;
    const isExpanded = expandedProperties[propertyName];

    return (
      <Card key={propertyName} variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <DragIcon sx={{ color: 'text.secondary', mr: 1, cursor: 'grab' }} />
            <TextField
              label="Property Name"
              value={property.name}
              onChange={(e) => handlePropertyChange(propertyName, { ...property, name: e.target.value })}
              size="small"
              sx={{ flexGrow: 1, mr: 2 }}
            />
            <FormControl size="small" sx={{ minWidth: 120, mr: 2 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={property.type}
                label="Type"
                onChange={(e) => handlePropertyChange(propertyName, { ...property, type: e.target.value })}
              >
                {PROPERTY_TYPES.map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={isRequired}
                  onChange={(e) => handleRequiredChange(propertyName, e.target.checked)}
                  size="small"
                />
              }
              label="Required"
              sx={{ mr: 1 }}
            />
            <Tooltip title="Advanced Options">
              <IconButton
                onClick={() => togglePropertyExpanded(propertyName)}
                size="small"
                sx={{ mr: 1 }}
              >
                <ExpandMoreIcon sx={{ 
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Property">
              <IconButton
                onClick={() => handleDeleteProperty(propertyName)}
                size="small"
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <TextField
            label="Description"
            value={property.description || ''}
            onChange={(e) => handlePropertyChange(propertyName, { ...property, description: e.target.value })}
            multiline
            rows={2}
            fullWidth
            size="small"
            sx={{ mb: isExpanded ? 2 : 0 }}
          />

          {isExpanded && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Advanced Configuration
              </Typography>
              
              <Grid container spacing={2}>
                {/* String-specific fields */}
                {property.type === 'string' && (
                  <>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Format</InputLabel>
                        <Select
                          value={property.format || ''}
                          label="Format"
                          onChange={(e) => handlePropertyChange(propertyName, { ...property, format: e.target.value })}
                        >
                          {STRING_FORMATS.map(format => (
                            <MenuItem key={format.value} value={format.value}>
                              {format.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Min Length"
                        type="number"
                        value={property.minLength || ''}
                        onChange={(e) => handlePropertyChange(propertyName, { 
                          ...property, 
                          minLength: e.target.value ? parseInt(e.target.value) : undefined 
                        })}
                        size="small"
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Max Length"
                        type="number"
                        value={property.maxLength || ''}
                        onChange={(e) => handlePropertyChange(propertyName, { 
                          ...property, 
                          maxLength: e.target.value ? parseInt(e.target.value) : undefined 
                        })}
                        size="small"
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Pattern (RegEx)"
                        value={property.pattern || ''}
                        onChange={(e) => handlePropertyChange(propertyName, { ...property, pattern: e.target.value })}
                        size="small"
                        fullWidth
                        placeholder="^[a-z0-9-]+$"
                      />
                    </Grid>
                  </>
                )}

                {/* Number/Integer-specific fields */}
                {(property.type === 'number' || property.type === 'integer') && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Minimum"
                        type="number"
                        value={property.minimum || ''}
                        onChange={(e) => handlePropertyChange(propertyName, { 
                          ...property, 
                          minimum: e.target.value ? parseFloat(e.target.value) : undefined 
                        })}
                        size="small"
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Maximum"
                        type="number"
                        value={property.maximum || ''}
                        onChange={(e) => handlePropertyChange(propertyName, { 
                          ...property, 
                          maximum: e.target.value ? parseFloat(e.target.value) : undefined 
                        })}
                        size="small"
                        fullWidth
                      />
                    </Grid>
                  </>
                )}

                {/* Default value field for all types */}
                <Grid item xs={12}>
                  <TextField
                    label="Default Value"
                    value={property.default || ''}
                    onChange={(e) => {
                      let defaultValue: any = e.target.value;
                      
                      // Try to parse based on type
                      if (property.type === 'boolean') {
                        defaultValue = e.target.value === 'true';
                      } else if (property.type === 'integer') {
                        defaultValue = e.target.value ? parseInt(e.target.value) : undefined;
                      } else if (property.type === 'number') {
                        defaultValue = e.target.value ? parseFloat(e.target.value) : undefined;
                      }
                      
                      handlePropertyChange(propertyName, { ...property, default: defaultValue });
                    }}
                    size="small"
                    fullWidth
                    helperText={`Default value for ${property.type} type`}
                  />
                </Grid>

                {/* Enum values for string types */}
                {property.type === 'string' && (
                  <Grid item xs={12}>
                    <TextField
                      label="Enum Values (comma-separated)"
                      value={property.enum?.join(', ') || ''}
                      onChange={(e) => {
                        const enumValues = e.target.value
                          .split(',')
                          .map(v => v.trim())
                          .filter(v => v.length > 0);
                        handlePropertyChange(propertyName, { 
                          ...property, 
                          enum: enumValues.length > 0 ? enumValues : undefined 
                        });
                      }}
                      size="small"
                      fullWidth
                      helperText="Restrict values to specific options"
                    />
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const getSchemaValidation = () => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check if there are any properties
    if (Object.keys(schema.properties).length === 0) {
      warnings.push('No properties defined. Consider adding at least one property.');
    }
    
    // Validate property names
    Object.entries(schema.properties).forEach(([name, property]) => {
      if (!name.match(/^[a-zA-Z][a-zA-Z0-9_]*$/)) {
        errors.push(`Property "${name}" has invalid name. Must start with letter and contain only alphanumeric characters and underscores.`);
      }
      
      if (!property.description) {
        warnings.push(`Property "${name}" missing description.`);
      }
    });
    
    return { errors, warnings };
  };

  const validation = getSchemaValidation();

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <CodeIcon sx={{ mr: 1 }} />
        {title}
      </Typography>

      {/* Validation Alerts */}
      {validation.errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Schema Errors:</Typography>
          <ul style={{ margin: '8px 0', paddingLeft: '16px' }}>
            {validation.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {validation.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Recommendations:</Typography>
          <ul style={{ margin: '8px 0', paddingLeft: '16px' }}>
            {validation.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Schema Description */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            label="Schema Description"
            value={schema.description || ''}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            multiline
            rows={3}
            fullWidth
            helperText="Describe what this custom resource represents"
          />
        </CardContent>
      </Card>

      {/* Properties Section */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Properties ({Object.keys(schema.properties).length})
          </Typography>
          <Button
            startIcon={<AddIcon />}
            onClick={handleAddProperty}
            variant="contained"
            size="small"
          >
            Add Property
          </Button>
        </Box>

        {Object.keys(schema.properties).length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
            <CodeIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Properties Defined
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Add properties to define the structure of your custom resource.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddProperty}
            >
              Add Your First Property
            </Button>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {Object.entries(schema.properties).map(([propertyName, property]) =>
              renderPropertyEditor(propertyName, property)
            )}
          </Stack>
        )}
      </Box>

      {/* Schema Summary */}
      {Object.keys(schema.properties).length > 0 && (
        <Card variant="outlined" sx={{ bgcolor: 'primary.50' }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Schema Summary
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Chip 
                label={`${Object.keys(schema.properties).length} Properties`} 
                color="primary" 
                size="small" 
              />
              <Chip 
                label={`${schema.required?.length || 0} Required`} 
                color="secondary" 
                size="small" 
              />
              {validation.errors.length > 0 && (
                <Chip 
                  label={`${validation.errors.length} Errors`} 
                  color="error" 
                  size="small" 
                  icon={<WarningIcon />}
                />
              )}
              {validation.warnings.length > 0 && (
                <Chip 
                  label={`${validation.warnings.length} Warnings`} 
                  color="warning" 
                  size="small" 
                  icon={<InfoIcon />}
                />
              )}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default CRDSchemaEditor;