import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Tooltip,
  Chip,
  Alert,
  Paper,
  Divider,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Code as CodeIcon,
  DataObject as JsonIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  Visibility as PreviewIcon,
  CheckCircle as ValidIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Fullscreen as FullscreenIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '@mui/material/styles';
import { crdComposerService } from '../../services/CRDComposerService';

interface CRDPreviewPanelProps {
  crdData: any; // The generated CRD object
  isValid: boolean;
  errors: string[];
  warnings: string[];
  onExport?: () => void;
  onApplyToCluster?: () => void;
}

export const CRDPreviewPanel: React.FC<CRDPreviewPanelProps> = ({
  crdData,
  isValid,
  errors,
  warnings,
  onExport,
  onApplyToCluster
}) => {
  const theme = useTheme();
  const [viewMode, setViewMode] = useState<'json' | 'yaml'>('yaml');
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');

  // Generate preview content based on view mode
  const generatePreview = useCallback(async () => {
    if (!crdData) {
      setPreviewContent('// No CRD data to preview');
      return;
    }

    try {
      setGeneratingPreview(true);

      if (viewMode === 'json') {
        setPreviewContent(JSON.stringify(crdData, null, 2));
      } else {
        // Use the backend API to generate YAML preview
        const response = await crdComposerService.previewCRD(crdData, 'yaml');
        setPreviewContent(response.preview);
      }
    } catch (error) {
      console.error('Failed to generate preview:', error);
      setPreviewContent(`# Error generating preview: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGeneratingPreview(false);
    }
  }, [crdData, viewMode]);

  // Update preview when data or view mode changes
  React.useEffect(() => {
    generatePreview();
  }, [generatePreview]);

  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewMode: 'json' | 'yaml'
  ) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(previewContent);
      // Could add a toast notification here
      console.log('Copied to clipboard');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleDownload = () => {
    if (!previewContent || !crdData?.metadata?.name) return;

    const fileName = `${crdData.metadata.name}.${viewMode}`;
    const blob = new Blob([previewContent], { 
      type: viewMode === 'json' ? 'application/json' : 'text/yaml' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getValidationStatusChip = () => {
    if (errors.length > 0) {
      return (
        <Chip
          icon={<ErrorIcon />}
          label={`${errors.length} Errors`}
          color="error"
          size="small"
        />
      );
    } else if (warnings.length > 0) {
      return (
        <Chip
          icon={<WarningIcon />}
          label={`${warnings.length} Warnings`}
          color="warning"
          size="small"
        />
      );
    } else if (isValid) {
      return (
        <Chip
          icon={<ValidIcon />}
          label="Valid"
          color="success"
          size="small"
        />
      );
    }
    return null;
  };

  const renderPreviewContent = () => {
    if (generatingPreview) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
          <CircularProgress size={24} />
          <Typography variant="body2" sx={{ ml: 2 }}>
            Generating {viewMode.toUpperCase()} preview...
          </Typography>
        </Box>
      );
    }

    if (!previewContent) {
      return (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: 300,
          color: 'text.secondary'
        }}>
          <PreviewIcon sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Preview Available
          </Typography>
          <Typography variant="body2">
            Configure your CRD to see the preview
          </Typography>
        </Box>
      );
    }

    return (
      <SyntaxHighlighter
        language={viewMode}
        style={theme.palette.mode === 'dark' ? vscDarkPlus : vs}
        customStyle={{
          margin: 0,
          borderRadius: theme.shape.borderRadius,
          fontSize: '0.875rem',
          lineHeight: '1.4',
          maxHeight: '600px',
          overflow: 'auto'
        }}
        showLineNumbers
        wrapLines
      >
        {previewContent}
      </SyntaxHighlighter>
    );
  };

  const renderFullscreenDialog = () => (
    <Dialog
      open={fullscreenOpen}
      onClose={() => setFullscreenOpen(false)}
      maxWidth="lg"
      fullWidth
      fullScreen
      sx={{
        '& .MuiDialog-paper': {
          backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#ffffff'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f5f5f5'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <PreviewIcon sx={{ mr: 1 }} />
          <Typography variant="h6">
            CRD Preview - {crdData?.metadata?.name || 'Untitled'}
          </Typography>
          {getValidationStatusChip()}
        </Box>
        <Box>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            size="small"
            sx={{ mr: 2 }}
          >
            <ToggleButton value="yaml">
              <CodeIcon sx={{ mr: 0.5 }} />
              YAML
            </ToggleButton>
            <ToggleButton value="json">
              <JsonIcon sx={{ mr: 0.5 }} />
              JSON
            </ToggleButton>
          </ToggleButtonGroup>
          <IconButton onClick={() => setFullscreenOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#ffffff' }}>
        {renderPreviewContent()}
      </DialogContent>
      
      <DialogActions sx={{ backgroundColor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f5f5f5' }}>
        <Button startIcon={<CopyIcon />} onClick={handleCopyToClipboard}>
          Copy
        </Button>
        <Button startIcon={<DownloadIcon />} onClick={handleDownload}>
          Download
        </Button>
        {onApplyToCluster && isValid && (
          <Button 
            variant="contained" 
            onClick={onApplyToCluster}
            disabled={!isValid}
          >
            Apply to Cluster
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );

  return (
    <>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                <PreviewIcon sx={{ mr: 1 }} />
                CRD Preview
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getValidationStatusChip()}
                <Tooltip title="Fullscreen View">
                  <IconButton size="small" onClick={() => setFullscreenOpen(true)}>
                    <FullscreenIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          }
          action={
            <Box>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
                size="small"
              >
                <ToggleButton value="yaml">
                  <CodeIcon sx={{ mr: 0.5 }} />
                  YAML
                </ToggleButton>
                <ToggleButton value="json">
                  <JsonIcon sx={{ mr: 0.5 }} />
                  JSON
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          }
          sx={{ pb: 1 }}
        />

        {/* Validation Status */}
        {(errors.length > 0 || warnings.length > 0) && (
          <Box sx={{ px: 2, pb: 1 }}>
            {errors.length > 0 && (
              <Alert severity="error" sx={{ mb: 1, py: 0 }}>
                <Typography variant="body2">
                  {errors.length} validation error{errors.length > 1 ? 's' : ''} found
                </Typography>
              </Alert>
            )}
            {warnings.length > 0 && (
              <Alert severity="warning" sx={{ py: 0 }}>
                <Typography variant="body2">
                  {warnings.length} warning{warnings.length > 1 ? 's' : ''} found
                </Typography>
              </Alert>
            )}
          </Box>
        )}

        <Divider />

        {/* Preview Content */}
        <CardContent sx={{ flexGrow: 1, p: 0, '&:last-child': { pb: 0 } }}>
          {renderPreviewContent()}
        </CardContent>

        {/* Action Buttons */}
        <Divider />
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Chip
              label={`${previewContent.split('\n').length} lines`}
              size="small"
              variant="outlined"
              sx={{ mr: 1 }}
            />
            <Chip
              label={`${Math.round(previewContent.length / 1024 * 100) / 100} KB`}
              size="small"
              variant="outlined"
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Copy to Clipboard">
              <IconButton size="small" onClick={handleCopyToClipboard}>
                <CopyIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download File">
              <IconButton size="small" onClick={handleDownload}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            {onExport && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={onExport}
              >
                Export
              </Button>
            )}
            {onApplyToCluster && (
              <Button
                variant="contained"
                size="small"
                onClick={onApplyToCluster}
                disabled={!isValid}
                color={isValid ? 'primary' : 'error'}
              >
                Apply to Cluster
              </Button>
            )}
          </Box>
        </Box>
      </Card>

      {renderFullscreenDialog()}
    </>
  );
};

export default CRDPreviewPanel;