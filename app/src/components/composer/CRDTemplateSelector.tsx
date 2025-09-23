import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Paper,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  Visibility as PreviewIcon,
  GetApp as UseTemplateIcon,
  Extension as ExtensionIcon,
  Apps as ApplicationIcon,
  Settings as ConfigIcon,
  Code as SchemaIcon
} from '@mui/icons-material';
import { crdComposerService, CRDTemplate } from '../../services/CRDComposerService';

interface CRDTemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectTemplate: (template: CRDTemplate) => void;
}

export const CRDTemplateSelector: React.FC<CRDTemplateSelectorProps> = ({
  open,
  onClose,
  onSelectTemplate
}) => {
  const [templates, setTemplates] = useState<CRDTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<CRDTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await crdComposerService.getTemplates();
      setTemplates(response.templates);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const getTemplateIcon = (templateId: string) => {
    switch (templateId) {
      case 'basic':
        return <ExtensionIcon color="primary" />;
      case 'application':
        return <ApplicationIcon color="secondary" />;
      case 'configuration':
        return <ConfigIcon color="info" />;
      default:
        return <SchemaIcon color="default" />;
    }
  };

  const getTemplateColor = (templateId: string) => {
    switch (templateId) {
      case 'basic':
        return 'primary';
      case 'application':
        return 'secondary';
      case 'configuration':
        return 'info';
      default:
        return 'default';
    }
  };

  const handleUseTemplate = (template: CRDTemplate) => {
    onSelectTemplate(template);
    onClose();
  };

  const handlePreviewTemplate = (template: CRDTemplate) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  const renderTemplateCard = (template: CRDTemplate) => (
    <Grid item xs={12} sm={6} md={4} key={template.id}>
      <Card 
        elevation={2}
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            elevation: 4,
            transform: 'translateY(-2px)'
          }
        }}
      >
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ mr: 2, mt: 0.5 }}>
              {getTemplateIcon(template.id)}
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" component="h3" gutterBottom>
                {template.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {template.description}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Chip
              label={template.template.metadata.group}
              size="small"
              variant="outlined"
              sx={{ mr: 1, mb: 1 }}
            />
            <Chip
              label={template.template.spec.scope}
              size="small"
              color={getTemplateColor(template.id) as any}
              sx={{ mr: 1, mb: 1 }}
            />
            <Chip
              label={`v${template.template.spec.version}`}
              size="small"
              variant="outlined"
              sx={{ mb: 1 }}
            />
          </Box>

          <Typography variant="subtitle2" gutterBottom>
            Resource Details:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Kind:</strong> {template.template.metadata.names.kind}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Plural:</strong> {template.template.metadata.names.plural}
          </Typography>
          {template.template.metadata.names.shortNames?.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              <strong>Short Names:</strong> {template.template.metadata.names.shortNames.join(', ')}
            </Typography>
          )}
        </CardContent>

        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
          <Button
            size="small"
            startIcon={<PreviewIcon />}
            onClick={() => handlePreviewTemplate(template)}
          >
            Preview
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<UseTemplateIcon />}
            onClick={() => handleUseTemplate(template)}
            color={getTemplateColor(template.id) as any}
          >
            Use Template
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );

  const renderTemplatePreview = () => {
    if (!selectedTemplate) return null;

    return (
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {getTemplateIcon(selectedTemplate.id)}
            <Typography variant="h6" sx={{ ml: 1 }}>
              {selectedTemplate.name} Preview
            </Typography>
          </Box>
          <IconButton onClick={() => setPreviewOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body1" paragraph>
            {selectedTemplate.description}
          </Typography>
          
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Schema Properties:
          </Typography>
          
          <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
            {selectedTemplate.template.schema.properties && 
             Object.entries(selectedTemplate.template.schema.properties).map(([key, prop]: [string, any]) => (
              <Box key={key} sx={{ mb: 1 }}>
                <Typography variant="body2" component="span" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                  {key}:
                </Typography>
                <Typography variant="body2" component="span" sx={{ ml: 1 }}>
                  {prop.type}
                  {prop.required && <Chip label="required" size="small" color="warning" sx={{ ml: 1, height: 16 }} />}
                </Typography>
                {prop.description && (
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 2 }}>
                    {prop.description}
                  </Typography>
                )}
              </Box>
            ))}
          </Paper>

          <Typography variant="h6" gutterBottom>
            Metadata:
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2"><strong>API Group:</strong> {selectedTemplate.template.metadata.group}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2"><strong>Version:</strong> {selectedTemplate.template.spec.version}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2"><strong>Scope:</strong> {selectedTemplate.template.spec.scope}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2"><strong>Kind:</strong> {selectedTemplate.template.metadata.names.kind}</Typography>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>
            Close
          </Button>
          <Button
            variant="contained"
            startIcon={<UseTemplateIcon />}
            onClick={() => {
              handleUseTemplate(selectedTemplate);
              setPreviewOpen(false);
            }}
            color={getTemplateColor(selectedTemplate.id) as any}
          >
            Use This Template
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5" component="h2">
            🎨 Choose a CRD Template
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Typography variant="body1" color="text.secondary" paragraph>
            Start with a pre-built template to quickly create your Custom Resource Definition.
            Each template includes a complete schema and best practices.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
              <CircularProgress />
              <Typography variant="body1" sx={{ ml: 2 }}>
                Loading templates...
              </Typography>
            </Box>
          ) : templates.length > 0 ? (
            <Grid container spacing={3}>
              {templates.map(renderTemplateCard)}
            </Grid>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <ExtensionIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No templates available
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Templates could not be loaded from the backend.
              </Typography>
              <Button
                variant="outlined"
                onClick={fetchTemplates}
                sx={{ mt: 2 }}
              >
                Retry
              </Button>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
            💡 You can also start from scratch without a template
          </Typography>
          <Button onClick={onClose} variant="outlined">
            Start From Scratch
          </Button>
        </DialogActions>
      </Dialog>

      {renderTemplatePreview()}
    </>
  );
};

export default CRDTemplateSelector;