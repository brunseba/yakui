import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  Fade,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  List as ListIcon,
  AccountTree as GraphIcon,
  TableChart as TableIcon,
  ViewModule as GridIcon,
  AccountTree,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import {
  CRDAnalysisResult
} from '../../services/crd-analysis';
import CRDAnalysisResults from './CRDAnalysisResults';
import CRDDependencyGraphSimple from './CRDDependencyGraphSimple';
import CRDDependenciesTable from './CRDDependenciesTable';
import CRDToCRDGraphAnalysis from './CRDToCRDGraphAnalysis';
import CRDRelationshipInsights from './CRDRelationshipInsights';

export type ViewType = 'list' | 'graph' | 'crd-graph' | 'insights' | 'table' | 'grid';

interface CRDAnalysisViewsProps {
  results: CRDAnalysisResult | null;
  loading?: boolean;
  error?: string | null;
  onViewChange?: (view: ViewType) => void;
}

export const CRDAnalysisViews: React.FC<CRDAnalysisViewsProps> = ({
  results,
  loading = false,
  error = null,
  onViewChange
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [currentView, setCurrentView] = useState<ViewType>('list');

  const handleViewChange = (event: React.MouseEvent<HTMLElement>, newView: ViewType | null) => {
    if (newView !== null) {
      setCurrentView(newView);
      onViewChange?.(newView);
    }
  };

  const navigateToView = (view: ViewType) => {
    setCurrentView(view);
    onViewChange?.(view);
  };

  const renderViewContent = () => {
    switch (currentView) {
      case 'graph':
        return (
          <Fade in={currentView === 'graph'} timeout={300}>
            <Box>
              <CRDDependencyGraphSimple 
                results={results} 
                height={isMobile ? 500 : 700}
              />
            </Box>
          </Fade>
        );
      
      case 'crd-graph':
        return (
          <Fade in={currentView === 'crd-graph'} timeout={300}>
            <Box>
              <CRDToCRDGraphAnalysis 
                results={results} 
                height={isMobile ? 500 : 750}
              />
            </Box>
          </Fade>
        );
      
      case 'insights':
        return (
          <Fade in={currentView === 'insights'} timeout={300}>
            <Box>
              <CRDRelationshipInsights 
                results={results} 
              />
            </Box>
          </Fade>
        );
      
      case 'table':
        return (
          <Fade in={currentView === 'table'} timeout={300}>
            <Box>
              <CRDDependenciesTable 
                results={results} 
                loading={loading} 
                error={error} 
                onNavigateToView={navigateToView}
              />
            </Box>
          </Fade>
        );
      
      case 'grid':
        return (
          <Fade in={currentView === 'grid'} timeout={300}>
            <Box>
              <CRDAnalysisGrid results={results} loading={loading} error={error} />
            </Box>
          </Fade>
        );
      
      case 'list':
      default:
        return (
          <Fade in={currentView === 'list'} timeout={300}>
            <Box>
              <CRDAnalysisResults 
                results={results} 
                loading={loading} 
                error={error} 
                onNavigateToView={navigateToView}
              />
            </Box>
          </Fade>
        );
    }
  };

  return (
    <Box>
      {/* View Selector */}
      <Paper elevation={1} sx={{ mb: 2, p: 2 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 2
        }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            📊 Analysis Views
          </Typography>
          
          <ToggleButtonGroup
            value={currentView}
            exclusive
            onChange={handleViewChange}
            aria-label="analysis view"
            size={isMobile ? 'small' : 'medium'}
            color="primary"
          >
            <ToggleButton value="list" aria-label="list view">
              <ListIcon sx={{ mr: isMobile ? 0 : 1 }} />
              {!isMobile && 'List'}
            </ToggleButton>
            <ToggleButton value="graph" aria-label="graph view">
              <GraphIcon sx={{ mr: isMobile ? 0 : 1 }} />
              {!isMobile && 'Graph'}
            </ToggleButton>
            <ToggleButton value="crd-graph" aria-label="crd to crd graph view">
              <AccountTree sx={{ mr: isMobile ? 0 : 1 }} />
              {!isMobile && 'CRD-CRD'}
            </ToggleButton>
            <ToggleButton value="insights" aria-label="insights view">
              <AnalyticsIcon sx={{ mr: isMobile ? 0 : 1 }} />
              {!isMobile && 'Insights'}
            </ToggleButton>
            <ToggleButton value="table" aria-label="table view">
              <TableIcon sx={{ mr: isMobile ? 0 : 1 }} />
              {!isMobile && 'Table'}
            </ToggleButton>
            <ToggleButton value="grid" aria-label="grid view">
              <GridIcon sx={{ mr: isMobile ? 0 : 1 }} />
              {!isMobile && 'Grid'}
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        
        {/* View descriptions */}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {(() => {
            switch (currentView) {
              case 'graph':
                return 'Interactive dependency graph visualization showing all CRD relationships';
              case 'crd-graph':
                return 'Focused analysis of CRD-to-CRD relationships with centrality scoring and advanced filtering';
              case 'insights':
                return 'Comprehensive analysis with metrics, insights, and recommendations for CRD relationships';
              case 'table':
                return 'Comprehensive table with sortable columns, search, and detailed dependency information';
              case 'grid':
                return 'Grid layout with dependency cards for quick overview';
              case 'list':
              default:
                return 'Detailed list view with expandable CRD information and dependencies';
            }
          })()}
        </Typography>
      </Paper>

      {/* View Content */}
      {renderViewContent()}
    </Box>
  );
};


// Simple grid view component (placeholder for now)
const CRDAnalysisGrid: React.FC<{
  results: CRDAnalysisResult | null;
  loading?: boolean;
  error?: string | null;
}> = ({ results, loading, error }) => {
  return (
    <Paper elevation={2} sx={{ p: 3, minHeight: 400 }}>
      <Typography variant="h6" gutterBottom>
        🔧 CRD Dependencies Grid
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Grid view coming soon - this will show CRDs as cards in a responsive grid layout.
      </Typography>
      {results && (
        <Typography variant="caption" display="block" sx={{ mt: 2 }}>
          Found {results.nodes?.filter(n => n.labels?.['dictionary.type'] === 'crd-definition').length || 0} CRDs with {results.edges?.length || 0} total dependencies
        </Typography>
      )}
    </Paper>
  );
};

export default CRDAnalysisViews;