import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Alert,
  Snackbar,
  IconButton,
  Fab,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Close as CloseIcon,
  KeyboardArrowUp as ScrollUpIcon
} from '@mui/icons-material';
import {
  CRDAnalysisOptions,
  CRDAnalysisResult,
  CRDExportOptions,
  crdAnalysisService
} from '../../services/crd-analysis';
import CRDAnalysisFilters from './CRDAnalysisFilters';
import CRDAnalysisViews from './CRDAnalysisViews';

export const CRDAnalysis: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Analysis state
  const [analysisOptions, setAnalysisOptions] = useState<CRDAnalysisOptions>({
    maxCRDs: 50,
    includeNativeResources: true,
    analysisDepth: 'deep'
  });
  const [analysisResults, setAnalysisResults] = useState<CRDAnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  // Handle scroll to show scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setShowScrollTop(scrollTop > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const showNotification = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setNotification({
      open: true,
      message,
      severity
    });
  }, []);

  const handleCloseNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, open: false }));
  }, []);

  const handleAnalysisOptionsChange = useCallback((options: CRDAnalysisOptions) => {
    setAnalysisOptions(options);
    console.log('Analysis options updated:', options);
  }, []);

  const handleRunAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Running CRD analysis with options:', analysisOptions);
      showNotification('Starting CRD dependencies analysis...', 'info');
      
      const startTime = Date.now();
      const result = await crdAnalysisService.getEnhancedCRDAnalysis(analysisOptions);
      const analysisTime = Date.now() - startTime;
      
      // Add timing metadata if not already present
      if (result.metadata) {
        result.metadata.analysisTime = result.metadata.analysisTime || analysisTime;
      } else {
        result.metadata = {
          namespace: 'default',
          nodeCount: result.nodes?.length || 0,
          edgeCount: result.edges?.length || 0,
          timestamp: new Date().toISOString(),
          analysisTime
        };
      }
      
      setAnalysisResults(result);
      
      // Count CRD nodes and edges for notification
      const crdNodes = result.nodes?.filter(node => 
        node.labels?.['dictionary.type'] === 'crd-definition'
      ) || [];
      const crdCount = crdNodes.length;
      const depCount = result.edges?.length || 0;
      
      showNotification(
        `Analysis completed! Found ${crdCount} CRDs with ${depCount} dependencies (${analysisTime}ms)`,
        'success'
      );
      
      console.log('CRD analysis completed:', result);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze CRD dependencies';
      setError(errorMessage);
      showNotification(`Analysis failed: ${errorMessage}`, 'error');
      console.error('CRD analysis failed:', err);
    } finally {
      setLoading(false);
    }
  }, [analysisOptions, showNotification]);

  const handleExport = useCallback(async (exportOptions: CRDExportOptions) => {
    if (!analysisResults) {
      showNotification('No analysis results to export. Run an analysis first.', 'warning');
      return;
    }

    try {
      showNotification('Preparing export...', 'info');
      
      const exportData = await crdAnalysisService.exportCRDAnalysis(exportOptions);
      
      // Create and trigger download
      const blob = new Blob([exportData.content], { type: exportData.mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = exportData.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showNotification(
        `Analysis exported as ${exportOptions.format?.toUpperCase() || 'JSON'} (${exportData.filename})`,
        'success'
      );
      
      console.log('Export completed:', exportData.filename);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export analysis';
      showNotification(`Export failed: ${errorMessage}`, 'error');
      console.error('Export failed:', err);
    }
  }, [analysisResults, showNotification]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography 
          variant={isMobile ? 'h4' : 'h3'} 
          component="h1" 
          gutterBottom
          sx={{ 
            fontWeight: 'bold',
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1
          }}
        >
          🔧 CRD Dependencies Analysis
        </Typography>
        <Typography 
          variant="h6" 
          color="text.secondary" 
          sx={{ maxWidth: 800, mx: 'auto', lineHeight: 1.6 }}
        >
          Analyze Custom Resource Definition (CRD) schema dependencies and relationships 
          to understand your Kubernetes application architecture
        </Typography>
      </Box>

      {/* Global Error Alert */}
      {error && !loading && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }} 
          onClose={() => setError(null)}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => setError(null)}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
        >
          <Typography variant="body1" fontWeight="bold">
            Analysis Error
          </Typography>
          <Typography variant="body2">
            {error}
          </Typography>
        </Alert>
      )}

      {/* Analysis Filters */}
      <CRDAnalysisFilters
        onAnalysisOptionsChange={handleAnalysisOptionsChange}
        onRunAnalysis={handleRunAnalysis}
        onExport={handleExport}
        loading={loading}
      />

      {/* Analysis Views */}
      <CRDAnalysisViews
        results={analysisResults}
        loading={loading}
        error={error}
      />

      {/* Scroll to Top FAB */}
      {showScrollTop && (
        <Fab
          color="primary"
          size="medium"
          onClick={scrollToTop}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000
          }}
        >
          <ScrollUpIcon />
        </Fab>
      )}

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        action={
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={handleCloseNotification}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CRDAnalysis;