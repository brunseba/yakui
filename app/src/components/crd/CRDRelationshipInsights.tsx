import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Info as InfoIcon,
  AccountTree as RelationIcon,
  Extension as CRDIcon,
  Speed as PerformanceIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import {
  CRDAnalysisResult,
  CRDType
} from '../../services/crd-analysis';

interface CRDRelationshipInsightsProps {
  results: CRDAnalysisResult | null;
}

interface RelationshipInsight {
  type: 'warning' | 'info' | 'success';
  title: string;
  description: string;
  icon: React.ReactNode;
  severity?: number;
}

interface CRDMetrics {
  totalCRDs: number;
  crdToCrdRelations: number;
  highCouplingCRDs: string[];
  orphanedCRDs: string[];
  circularDependencies: string[][];
  complexityScore: number;
  networkDensity: number;
  avgDependenciesPerCRD: number;
}

export const CRDRelationshipInsights: React.FC<CRDRelationshipInsightsProps> = ({
  results
}) => {
  // Helper function to check if a dependency is CRD-to-CRD
  const isCRDToCRD = (dependency: any, allCRDs: CRDType[]): boolean => {
    if (!dependency || !dependency.target) return false;
    
    const targetLower = dependency.target.toLowerCase();
    return allCRDs.some(crd => 
      crd.kind.toLowerCase() === targetLower ||
      targetLower.includes(crd.kind.toLowerCase()) ||
      (crd.apiGroup && targetLower.includes(`${crd.apiGroup}/${crd.kind}`.toLowerCase()))
    );
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

  // Calculate comprehensive metrics
  const metrics = useMemo((): CRDMetrics | null => {
    if (!results || !results.nodes) {
      return null;
    }

    const allCRDs = getCRDsFromResults(results);
    const totalCRDs = allCRDs.length;

    // Find CRD-to-CRD relationships
    const crdToCrdRelations: Array<{source: string, target: string}> = [];
    allCRDs.forEach(crd => {
      const sourceId = `${crd.apiGroup || 'core'}/${crd.kind}`;
      crd.dependencies.forEach(dep => {
        if (isCRDToCRD(dep, allCRDs)) {
          const targetCrd = allCRDs.find(targetCRD =>
            targetCRD.kind.toLowerCase() === dep.target.toLowerCase() ||
            dep.target.toLowerCase().includes(targetCRD.kind.toLowerCase()) ||
            (targetCRD.apiGroup && dep.target.toLowerCase().includes(`${targetCRD.apiGroup}/${targetCRD.kind}`.toLowerCase()))
          );
          if (targetCrd) {
            const targetId = `${targetCrd.apiGroup || 'core'}/${targetCrd.kind}`;
            crdToCrdRelations.push({ source: sourceId, target: targetId });
          }
        }
      });
    });

    // Calculate dependency counts per CRD
    const dependencyCounts = new Map<string, number>();
    allCRDs.forEach(crd => {
      const crdId = `${crd.apiGroup || 'core'}/${crd.kind}`;
      const crdToCrdDeps = crd.dependencies.filter(dep => isCRDToCRD(dep, allCRDs));
      dependencyCounts.set(crdId, crdToCrdDeps.length);
    });

    // Find high coupling CRDs (more than 5 dependencies)
    const highCouplingCRDs = Array.from(dependencyCounts.entries())
      .filter(([_, count]) => count > 5)
      .map(([crdId, _]) => crdId);

    // Find orphaned CRDs (no incoming or outgoing CRD relationships)
    const crdIds = allCRDs.map(crd => `${crd.apiGroup || 'core'}/${crd.kind}`);
    const connectedCRDs = new Set([
      ...crdToCrdRelations.map(r => r.source),
      ...crdToCrdRelations.map(r => r.target)
    ]);
    const orphanedCRDs = crdIds.filter(id => !connectedCRDs.has(id));

    // Simple circular dependency detection
    const circularDependencies: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const detectCycles = (nodeId: string, path: string[]): void => {
      if (recursionStack.has(nodeId)) {
        const cycleStartIndex = path.indexOf(nodeId);
        if (cycleStartIndex !== -1) {
          circularDependencies.push(path.slice(cycleStartIndex).concat(nodeId));
        }
        return;
      }

      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoing = crdToCrdRelations.filter(r => r.source === nodeId);
      outgoing.forEach(rel => {
        detectCycles(rel.target, path.concat(nodeId));
      });

      recursionStack.delete(nodeId);
    };

    crdIds.forEach(id => {
      if (!visited.has(id)) {
        detectCycles(id, []);
      }
    });

    // Calculate network density
    const maxPossibleEdges = totalCRDs * (totalCRDs - 1);
    const networkDensity = maxPossibleEdges > 0 ? crdToCrdRelations.length / maxPossibleEdges : 0;

    // Calculate average dependencies per CRD
    const avgDependenciesPerCRD = dependencyCounts.size > 0 
      ? Array.from(dependencyCounts.values()).reduce((sum, count) => sum + count, 0) / dependencyCounts.size
      : 0;

    // Calculate complexity score (0-100)
    const complexityScore = Math.min(100, 
      (highCouplingCRDs.length / totalCRDs) * 40 +
      (circularDependencies.length / totalCRDs) * 30 +
      (networkDensity * 30)
    );

    return {
      totalCRDs,
      crdToCrdRelations: crdToCrdRelations.length,
      highCouplingCRDs,
      orphanedCRDs,
      circularDependencies,
      complexityScore,
      networkDensity,
      avgDependenciesPerCRD
    };
  }, [results]);

  // Generate insights based on metrics
  const insights = useMemo((): RelationshipInsight[] => {
    if (!metrics) return [];

    const insights: RelationshipInsight[] = [];

    // High coupling warning
    if (metrics.highCouplingCRDs.length > 0) {
      insights.push({
        type: 'warning',
        title: 'High Coupling Detected',
        description: `${metrics.highCouplingCRDs.length} CRDs have more than 5 dependencies, which may indicate tight coupling and reduced maintainability.`,
        icon: <WarningIcon />,
        severity: metrics.highCouplingCRDs.length
      });
    }

    // Circular dependencies warning
    if (metrics.circularDependencies.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Circular Dependencies Found',
        description: `${metrics.circularDependencies.length} circular dependency chains detected. This can lead to installation and update issues.`,
        icon: <WarningIcon />,
        severity: metrics.circularDependencies.length
      });
    }

    // Orphaned CRDs info
    if (metrics.orphanedCRDs.length > 0) {
      insights.push({
        type: 'info',
        title: 'Isolated CRDs',
        description: `${metrics.orphanedCRDs.length} CRDs have no relationships with other CRDs. These might be standalone resources or missing dependencies.`,
        icon: <InfoIcon />
      });
    }

    // Network density analysis
    if (metrics.networkDensity > 0.3) {
      insights.push({
        type: 'warning',
        title: 'High Network Density',
        description: `Network density of ${(metrics.networkDensity * 100).toFixed(1)}% indicates very interconnected CRDs. Consider decomposing dependencies.`,
        icon: <RelationIcon />,
        severity: Math.round(metrics.networkDensity * 10)
      });
    } else if (metrics.networkDensity > 0.1) {
      insights.push({
        type: 'info',
        title: 'Moderate Coupling',
        description: `Network density of ${(metrics.networkDensity * 100).toFixed(1)}% shows moderate interconnection between CRDs.`,
        icon: <RelationIcon />
      });
    }

    // Complexity assessment
    if (metrics.complexityScore > 70) {
      insights.push({
        type: 'warning',
        title: 'High System Complexity',
        description: 'The CRD dependency network shows high complexity. Consider refactoring to reduce interdependencies.',
        icon: <PerformanceIcon />,
        severity: Math.round(metrics.complexityScore / 10)
      });
    } else if (metrics.complexityScore < 30) {
      insights.push({
        type: 'success',
        title: 'Well-Structured Dependencies',
        description: 'The CRD dependency structure shows good separation of concerns with manageable complexity.',
        icon: <SuccessIcon />
      });
    }

    // Positive insights
    if (metrics.crdToCrdRelations > 0 && metrics.circularDependencies.length === 0) {
      insights.push({
        type: 'success',
        title: 'No Circular Dependencies',
        description: 'All CRD relationships are properly structured without circular dependencies.',
        icon: <SuccessIcon />
      });
    }

    return insights.sort((a, b) => {
      const typeOrder = { warning: 0, info: 1, success: 2 };
      return typeOrder[a.type] - typeOrder[b.type];
    });
  }, [metrics]);

  if (!results || !results.nodes) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Alert severity="info">
          <Typography variant="h6" gutterBottom>
            No CRD Analysis Data
          </Typography>
          <Typography variant="body2">
            Run a CRD analysis to see relationship insights and recommendations.
          </Typography>
        </Alert>
      </Paper>
    );
  }

  if (!metrics) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Alert severity="warning">
          <Typography variant="body2">
            Unable to calculate relationship metrics from the current data.
          </Typography>
        </Alert>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Metrics Overview */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RelationIcon />
          CRD Relationship Metrics
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary" fontWeight="bold">
                  {metrics.totalCRDs}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total CRDs
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="secondary" fontWeight="bold">
                  {metrics.crdToCrdRelations}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  CRD-to-CRD Relations
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="info.main" fontWeight="bold">
                  {metrics.avgDependenciesPerCRD.toFixed(1)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg Dependencies
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main" fontWeight="bold">
                  {metrics.complexityScore.toFixed(0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Complexity Score
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={metrics.complexityScore} 
                  sx={{ mt: 1 }}
                  color={metrics.complexityScore > 70 ? 'error' : metrics.complexityScore > 40 ? 'warning' : 'success'}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Insights and Recommendations */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          🔍 Insights & Recommendations
        </Typography>
        
        {insights.length === 0 ? (
          <Alert severity="success">
            <Typography variant="body2">
              No issues detected in your CRD dependency structure. All relationships appear well-organized.
            </Typography>
          </Alert>
        ) : (
          <List>
            {insights.map((insight, index) => (
              <React.Fragment key={index}>
                <ListItem alignItems="flex-start">
                  <ListItemIcon>
                    {React.cloneElement(insight.icon as React.ReactElement, {
                      color: insight.type === 'warning' ? 'error' : 
                             insight.type === 'success' ? 'success' : 'info'
                    })}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {insight.title}
                        </Typography>
                        {insight.severity && (
                          <Chip 
                            label={insight.severity} 
                            size="small" 
                            color={insight.type === 'warning' ? 'error' : 'info'}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {insight.description}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < insights.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>

      {/* Detailed Analysis */}
      {(metrics.highCouplingCRDs.length > 0 || metrics.orphanedCRDs.length > 0 || metrics.circularDependencies.length > 0) && (
        <Paper elevation={2} sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            📊 Detailed Analysis
          </Typography>
          
          <Grid container spacing={3}>
            {metrics.highCouplingCRDs.length > 0 && (
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" color="warning.main" fontWeight="bold" gutterBottom>
                      High Coupling CRDs
                    </Typography>
                    <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                      {metrics.highCouplingCRDs.slice(0, 10).map((crdId, index) => (
                        <Chip 
                          key={index}
                          label={crdId.split('/')[1]} 
                          size="small" 
                          sx={{ m: 0.5 }}
                          color="warning"
                        />
                      ))}
                      {metrics.highCouplingCRDs.length > 10 && (
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                          +{metrics.highCouplingCRDs.length - 10} more...
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {metrics.orphanedCRDs.length > 0 && (
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" color="info.main" fontWeight="bold" gutterBottom>
                      Isolated CRDs
                    </Typography>
                    <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                      {metrics.orphanedCRDs.slice(0, 10).map((crdId, index) => (
                        <Chip 
                          key={index}
                          label={crdId.split('/')[1]} 
                          size="small" 
                          sx={{ m: 0.5 }}
                          color="info"
                        />
                      ))}
                      {metrics.orphanedCRDs.length > 10 && (
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                          +{metrics.orphanedCRDs.length - 10} more...
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {metrics.circularDependencies.length > 0 && (
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" color="error.main" fontWeight="bold" gutterBottom>
                      Circular Dependencies
                    </Typography>
                    <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                      {metrics.circularDependencies.slice(0, 5).map((cycle, index) => (
                        <Box key={index} sx={{ mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Cycle {index + 1}: {cycle.map(id => id.split('/')[1]).join(' → ')}
                          </Typography>
                        </Box>
                      ))}
                      {metrics.circularDependencies.length > 5 && (
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                          +{metrics.circularDependencies.length - 5} more cycles...
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default CRDRelationshipInsights;