import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  IconButton,
  Tooltip,
  Badge,
  Grid,
  LinearProgress,
  Button,
  ButtonGroup,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  AccountTree as DependencyIcon,
  Code as SchemaIcon,
  Link as ReferenceIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon,
  FileCopyOutlined as CopyIcon,
  AccountTree as GraphIcon,
  Analytics as InsightsIcon
} from '@mui/icons-material';
import {
  CRDAnalysisResult,
  CRDType,
  crdAnalysisService
} from '../../services/crd-analysis';
import { ViewType } from './CRDAnalysisViews';

interface CRDAnalysisResultsProps {
  results: CRDAnalysisResult | null;
  loading?: boolean;
  error?: string | null;
  onNavigateToView?: (view: ViewType) => void;
}

export const CRDAnalysisResults: React.FC<CRDAnalysisResultsProps> = ({
  results,
  loading = false,
  error = null,
  onNavigateToView
}) => {
  const [expandedPanels, setExpandedPanels] = useState<{ [key: string]: boolean }>({});
  const [showAllDependencies, setShowAllDependencies] = useState<{ [key: string]: boolean }>({});

  const handlePanelChange = (panel: string) => {
    setExpandedPanels(prev => ({
      ...prev,
      [panel]: !prev[panel]
    }));
  };

  const toggleShowAllDependencies = (crdKey: string) => {
    setShowAllDependencies(prev => ({
      ...prev,
      [crdKey]: !prev[crdKey]
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
      console.log('Copied to clipboard:', text);
    });
  };

  const getDependencyTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'reference':
        return <ReferenceIcon fontSize="small" />;
      case 'schema':
        return <SchemaIcon fontSize="small" />;
      case 'dependency':
        return <DependencyIcon fontSize="small" />;
      default:
        return <InfoIcon fontSize="small" />;
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  // Helper function to extract CRDs from nodes
  const getCRDsFromResults = (results: CRDAnalysisResult): CRDType[] => {
    if (!results.nodes) return [];
    
    const crdNodes = results.nodes.filter(node => 
      node.labels?.['dictionary.type'] === 'crd-definition'
    );
    
    return crdNodes.map(node => {
      const kind = node.labels?.['crd.kind'] || node.kind || 'Unknown';
      const apiGroup = node.labels?.['api.group'] || 'core';
      
      // Extract dependencies from edges
      const dependencies = results.edges?.filter(edge => edge.source === node.id).map(edge => {
        const targetNode = results.nodes?.find(n => n.id === edge.target);
        const targetKind = targetNode?.labels?.['crd.kind'] || targetNode?.kind || 'Unknown';
        const severity = edge.strength === 'strong' ? 'high' : edge.strength === 'weak' ? 'low' : 'medium';
        
        return {
          type: edge.metadata?.referenceType || edge.type || 'reference',
          target: targetKind,
          path: edge.metadata?.field,
          description: edge.metadata?.reason || `Dependency on ${targetKind}`,
          severity: severity as 'low' | 'medium' | 'high'
        };
      }) || [];
      
      return {
        kind,
        apiGroup: apiGroup === 'core' ? undefined : apiGroup,
        version: 'v1',
        plural: node.name?.split('.')[0] || kind.toLowerCase() + 's',
        description: `Custom Resource Definition for ${kind}`,
        dependencies
      };
    });
  };
  
  const renderSummaryStats = () => {
    if (!results) return null;

    const crds = getCRDsFromResults(results);
    const totalCRDs = crds.length;
    const totalDependencies = crds.reduce((sum, crd) => sum + crd.dependencies.length, 0);
    const crdsByGroup = crds.reduce((acc, crd) => {
      const group = crd.apiGroup || 'core';
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <Paper elevation={1} sx={{ p: 2, mb: 2, backgroundColor: 'background.default' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            📊 Analysis Summary
          </Typography>
          {onNavigateToView && totalDependencies > 0 && (
            <ButtonGroup size="small" variant="outlined">
              <Button
                startIcon={<GraphIcon />}
                onClick={() => onNavigateToView('crd-graph')}
              >
                View Graph
              </Button>
              <Button
                startIcon={<InsightsIcon />}
                onClick={() => onNavigateToView('insights')}
              >
                Get Insights
              </Button>
            </ButtonGroup>
          )}
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="h4" color="primary">{totalCRDs}</Typography>
                <Typography variant="body2" color="text.secondary">CRDs Analyzed</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card variant="outlined" sx={{ position: 'relative' }}>
              <CardContent sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="h4" color="secondary">{totalDependencies}</Typography>
                <Typography variant="body2" color="text.secondary">Dependencies Found</Typography>
                {onNavigateToView && totalDependencies > 0 && (
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<GraphIcon fontSize="small" />}
                    onClick={() => onNavigateToView('table')}
                    sx={{ 
                      mt: 0.5,
                      fontSize: '0.75rem',
                      minWidth: 'unset',
                      padding: '2px 4px'
                    }}
                  >
                    View Table
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="h4" color="info">{Object.keys(crdsByGroup).length}</Typography>
                <Typography variant="body2" color="text.secondary">API Groups</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {Object.keys(crdsByGroup).length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>CRDs by API Group:</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {Object.entries(crdsByGroup).map(([group, count]) => (
                <Chip
                  key={group}
                  label={`${group}: ${count}`}
                  size="small"
                  variant="outlined"
                  color="primary"
                />
              ))}
            </Box>
          </Box>
        )}
      </Paper>
    );
  };

  const renderCRDCard = (crd: CRDType) => {
    const crdKey = `${crd.apiGroup}/${crd.kind}`;
    const showAll = showAllDependencies[crdKey];
    const displayDependencies = showAll ? crd.dependencies : crd.dependencies.slice(0, 5);
    const hasMoreDependencies = crd.dependencies.length > 5;

    return (
      <Accordion 
        key={crdKey}
        expanded={expandedPanels[crdKey] || false}
        onChange={() => handlePanelChange(crdKey)}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {crdAnalysisService.getCRDIcon(crd)}
              <Typography variant="h6">
                {crd.kind}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto', mr: 2 }}>
              <Chip
                label={crd.apiGroup || 'core'}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Badge badgeContent={crd.dependencies.length} color="secondary">
                <DependencyIcon />
              </Badge>
              {crd.version && (
                <Chip
                  label={`v${crd.version}`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        </AccordionSummary>

        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* CRD Details */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Resource Details
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                <Chip
                  label={`Group: ${crd.apiGroup || 'core'}`}
                  size="small"
                  icon={<InfoIcon />}
                />
                <Chip
                  label={`Version: ${crd.version || 'N/A'}`}
                  size="small"
                  icon={<InfoIcon />}
                />
                <Chip
                  label={`Kind: ${crd.kind}`}
                  size="small"
                  icon={<InfoIcon />}
                />
                {crd.plural && (
                  <Chip
                    label={`Plural: ${crd.plural}`}
                    size="small"
                    icon={<InfoIcon />}
                  />
                )}
              </Box>
              {crd.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {crd.description}
                </Typography>
              )}
            </Box>

            <Divider />

            {/* Dependencies */}
            {crd.dependencies.length > 0 ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2">
                    Dependencies ({crd.dependencies.length})
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {onNavigateToView && crd.dependencies.length > 0 && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<GraphIcon />}
                        onClick={() => onNavigateToView('crd-graph')}
                      >
                        View Graph
                      </Button>
                    )}
                    {hasMoreDependencies && (
                      <Button
                        size="small"
                        onClick={() => toggleShowAllDependencies(crdKey)}
                        endIcon={showAll ? <ArrowUpIcon /> : <ArrowDownIcon />}
                      >
                        {showAll ? 'Show Less' : `Show All (${crd.dependencies.length})`}
                      </Button>
                    )}
                  </Box>
                </Box>

                <List dense>
                  {displayDependencies.map((dep, index) => (
                    <ListItem key={index} divider>
                      <ListItemIcon>
                        {getDependencyTypeIcon(dep.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight="bold">
                              {dep.target}
                            </Typography>
                            <Tooltip title="Copy reference">
                              <IconButton
                                size="small"
                                onClick={() => copyToClipboard(dep.target)}
                              >
                                <CopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Chip
                              label={dep.type}
                              size="small"
                              color={getSeverityColor(dep.severity) as any}
                              variant="outlined"
                            />
                            {dep.path && (
                              <Typography variant="caption" color="text.secondary">
                                Path: {dep.path}
                              </Typography>
                            )}
                            {dep.description && (
                              <Typography variant="caption" color="text.secondary">
                                - {dep.description}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>

                {hasMoreDependencies && !showAll && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    ... and {crd.dependencies.length - 5} more dependencies
                  </Typography>
                )}
              </Box>
            ) : (
              <Alert severity="info" sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckIcon sx={{ mr: 1 }} />
                No dependencies found for this CRD
              </Alert>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>
    );
  };

  if (loading) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h6">Analyzing CRD Dependencies...</Typography>
        </Box>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          This may take a few moments depending on the number of CRDs and analysis depth.
        </Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Alert severity="error" sx={{ display: 'flex', alignItems: 'center' }}>
          <WarningIcon sx={{ mr: 1 }} />
          <div>
            <Typography variant="body1" fontWeight="bold">Analysis Failed</Typography>
            <Typography variant="body2">{error}</Typography>
          </div>
        </Alert>
      </Paper>
    );
  }

  if (!results) {
    return (
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Analysis Results
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Run a CRD dependencies analysis to see results here.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Summary Statistics */}
      {renderSummaryStats()}

      {/* Analysis Metadata */}
      {results.metadata && (
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Analysis Metadata
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {results.metadata.analysisTime && (
              <Chip
                label={`Analysis Time: ${results.metadata.analysisTime}ms`}
                size="small"
                variant="outlined"
              />
            )}
            {results.metadata.crdCount !== undefined && (
              <Chip
                label={`CRDs Processed: ${results.metadata.crdCount}`}
                size="small"
                variant="outlined"
              />
            )}
            {results.metadata.dependencyCount !== undefined && (
              <Chip
                label={`Dependencies: ${results.metadata.dependencyCount}`}
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        </Paper>
      )}

      {/* CRD Results */}
      <Paper elevation={2} sx={{ mb: 2 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">
            🔍 CRD Dependencies Analysis Results
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Found {getCRDsFromResults(results).length} CRDs with dependency information
          </Typography>
        </Box>

        {getCRDsFromResults(results).length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Alert severity="info">
              No CRDs found matching the specified criteria.
            </Alert>
          </Box>
        ) : (
          <Box>
            {getCRDsFromResults(results).map((crd) => renderCRDCard(crd))}
          </Box>
        )}
      </Paper>

      {/* Analysis Warnings or Notes - removed as warnings property doesn't exist in simplified structure */}
    </Box>
  );
};

export default CRDAnalysisResults;