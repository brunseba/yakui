import React from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Tooltip,
  Typography,
  Chip
} from '@mui/material';
import {
  AccountTree as GraphIcon,
  Analytics as InsightsIcon,
  TableChart as TableIcon,
  List as ListIcon,
  Visibility as ViewIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { ViewType } from './CRDAnalysisViews';

interface CRDAnalysisNavigationProps {
  onNavigateToView: (view: ViewType) => void;
  currentView?: ViewType;
  totalCRDs?: number;
  totalDependencies?: number;
  crdToCrdCount?: number;
  variant?: 'full' | 'compact' | 'minimal';
  context?: string;
}

export const CRDAnalysisNavigation: React.FC<CRDAnalysisNavigationProps> = ({
  onNavigateToView,
  currentView,
  totalCRDs = 0,
  totalDependencies = 0,
  crdToCrdCount = 0,
  variant = 'compact',
  context = ''
}) => {
  const getViewConfig = (viewType: ViewType) => {
    const configs = {
      'list': { 
        icon: <ListIcon />, 
        label: 'List View',
        tooltip: 'Detailed list with expandable CRD cards',
        available: totalCRDs > 0
      },
      'table': { 
        icon: <TableIcon />, 
        label: 'Table View',
        tooltip: 'Sortable table with comprehensive dependency information',
        available: totalDependencies > 0
      },
      'crd-graph': { 
        icon: <GraphIcon />, 
        label: 'CRD Graph',
        tooltip: 'Interactive graph showing CRD-to-CRD relationships',
        available: crdToCrdCount > 0
      },
      'insights': { 
        icon: <InsightsIcon />, 
        label: 'Insights',
        tooltip: 'Analysis insights and recommendations',
        available: totalCRDs > 0
      },
      'graph': { 
        icon: <ViewIcon />, 
        label: 'Full Graph',
        tooltip: 'Complete dependency visualization',
        available: totalDependencies > 0
      },
      'grid': { 
        icon: <TrendingUpIcon />, 
        label: 'Grid View',
        tooltip: 'Grid layout for quick overview',
        available: totalCRDs > 0
      }
    };
    return configs[viewType];
  };

  if (variant === 'minimal') {
    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        {crdToCrdCount > 0 && (
          <Tooltip title="View CRD-to-CRD relationships in interactive graph">
            <Button
              size="small"
              variant="outlined"
              startIcon={<GraphIcon />}
              onClick={() => onNavigateToView('crd-graph')}
            >
              Graph
            </Button>
          </Tooltip>
        )}
        {totalDependencies > 0 && (
          <Tooltip title="Get insights and recommendations">
            <Button
              size="small"
              variant="outlined"
              startIcon={<InsightsIcon />}
              onClick={() => onNavigateToView('insights')}
            >
              Insights
            </Button>
          </Tooltip>
        )}
      </Box>
    );
  }

  if (variant === 'compact') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {context && (
          <Typography variant="caption" color="text.secondary">
            {context}
          </Typography>
        )}
        <ButtonGroup size="small" variant="outlined">
          {crdToCrdCount > 0 && (
            <Tooltip title={getViewConfig('crd-graph').tooltip}>
              <Button
                startIcon={getViewConfig('crd-graph').icon}
                onClick={() => onNavigateToView('crd-graph')}
                variant={currentView === 'crd-graph' ? 'contained' : 'outlined'}
              >
                CRD Graph
                {crdToCrdCount > 0 && (
                  <Chip 
                    label={crdToCrdCount} 
                    size="small" 
                    sx={{ ml: 1, height: 16 }}
                  />
                )}
              </Button>
            </Tooltip>
          )}
          {totalDependencies > 0 && (
            <Tooltip title={getViewConfig('table').tooltip}>
              <Button
                startIcon={getViewConfig('table').icon}
                onClick={() => onNavigateToView('table')}
                variant={currentView === 'table' ? 'contained' : 'outlined'}
              >
                Table
              </Button>
            </Tooltip>
          )}
          {totalCRDs > 0 && (
            <Tooltip title={getViewConfig('insights').tooltip}>
              <Button
                startIcon={getViewConfig('insights').icon}
                onClick={() => onNavigateToView('insights')}
                variant={currentView === 'insights' ? 'contained' : 'outlined'}
              >
                Insights
              </Button>
            </Tooltip>
          )}
        </ButtonGroup>
      </Box>
    );
  }

  // Full variant
  const availableViews: ViewType[] = ['list', 'table', 'crd-graph', 'insights'];
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        🧭 Quick Navigation
      </Typography>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1 }}>
        {availableViews.map(viewType => {
          const config = getViewConfig(viewType);
          if (!config.available) return null;
          
          return (
            <Tooltip key={viewType} title={config.tooltip}>
              <Button
                fullWidth
                variant={currentView === viewType ? 'contained' : 'outlined'}
                startIcon={config.icon}
                onClick={() => onNavigateToView(viewType)}
                sx={{ justifyContent: 'flex-start' }}
              >
                {config.label}
                {viewType === 'crd-graph' && crdToCrdCount > 0 && (
                  <Chip 
                    label={crdToCrdCount} 
                    size="small" 
                    sx={{ ml: 'auto' }}
                  />
                )}
                {viewType === 'table' && totalDependencies > 0 && (
                  <Chip 
                    label={totalDependencies} 
                    size="small" 
                    sx={{ ml: 'auto' }}
                  />
                )}
              </Button>
            </Tooltip>
          );
        })}
      </Box>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
        <Chip 
          label={`${totalCRDs} CRDs`} 
          size="small" 
          color="primary" 
        />
        <Chip 
          label={`${totalDependencies} Dependencies`} 
          size="small" 
          color="secondary" 
        />
        {crdToCrdCount > 0 && (
          <Chip 
            label={`${crdToCrdCount} CRD-to-CRD`} 
            size="small" 
            color="info" 
          />
        )}
      </Box>
    </Box>
  );
};

// Helper component for quick CRD-specific actions
export const CRDQuickActions: React.FC<{
  crdName: string;
  dependencyCount: number;
  onNavigateToView: (view: ViewType) => void;
  variant?: 'inline' | 'dropdown';
}> = ({
  crdName,
  dependencyCount,
  onNavigateToView,
  variant = 'inline'
}) => {
  if (variant === 'dropdown') {
    // Could implement a dropdown menu for more actions
    return null;
  }

  return (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      {dependencyCount > 0 && (
        <>
          <Tooltip title={`View ${crdName} in dependency graph`}>
            <Button
              size="small"
              variant="text"
              startIcon={<GraphIcon fontSize="small" />}
              onClick={() => onNavigateToView('crd-graph')}
              sx={{ fontSize: '0.75rem', minWidth: 'unset', padding: '2px 6px' }}
            >
              Graph
            </Button>
          </Tooltip>
          <Tooltip title={`View ${crdName} dependencies in table`}>
            <Button
              size="small"
              variant="text"
              startIcon={<TableIcon fontSize="small" />}
              onClick={() => onNavigateToView('table')}
              sx={{ fontSize: '0.75rem', minWidth: 'unset', padding: '2px 6px' }}
            >
              Table
            </Button>
          </Tooltip>
        </>
      )}
    </Box>
  );
};

export default CRDAnalysisNavigation;