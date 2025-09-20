import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Extension as CRDIcon,
  Hub as K8sIcon,
  Link as RelationIcon,
  Schema as SchemaIcon
} from '@mui/icons-material';
import { DependencyGraph, DependencyGraphNode, DependencyGraphEdge } from '../../services/dependency-analyzer';
import { CRDWithInstances } from '../../types/dev';

interface CRDDictionaryConfig {
  maxNodes: number;
  analysisMode: 'definitions';
  includeNativeResources: boolean;
}

interface CRDDictionaryVisualizationProps {
  crds: CRDWithInstances[];
  config: CRDDictionaryConfig;
  onCRDClick?: (crd: CRDWithInstances) => void;
}

interface CRDDefinitionSummary {
  name: string;
  group: string;
  versions: string[];
  kind: string;
  scope: 'Namespaced' | 'Cluster';
  instanceCount: number;
  description?: string;
  categories: string[];
}

const CRDDictionaryVisualization: React.FC<CRDDictionaryVisualizationProps> = ({
  crds,
  config,
  onCRDClick
}) => {
  const [expandedCRD, setExpandedCRD] = useState<string | false>(false);

  // Process CRD data to extract definitions and statistics
  const { crdDefinitions, apiGroups, totalInstances } = useMemo(() => {
    const definitions: CRDDefinitionSummary[] = [];
    const groups = new Set<string>();
    let instances = 0;

    crds.forEach(crd => {
      if (crd && crd.crd) {
        const spec = crd.crd.spec;
        if (spec) {
          const definition: CRDDefinitionSummary = {
            name: crd.crd.metadata?.name || 'unknown',
            group: spec.group || 'unknown',
            versions: spec.versions?.map(v => v.name) || ['v1'],
            kind: spec.names?.kind || 'Unknown',
            scope: spec.scope || 'Namespaced',
            instanceCount: crd.instances?.length || 0,
            description: spec.names?.shortNames?.join(', ') || `Custom Resource: ${spec.names?.kind}`,
            categories: spec.names?.categories || []
          };
          definitions.push(definition);
          groups.add(spec.group || 'unknown');
          instances += definition.instanceCount;
        }
      }
    });

    return {
      crdDefinitions: definitions,
      apiGroups: Array.from(groups).sort(),
      totalInstances: instances
    };
  }, [crds]);

  const handleAccordionChange = (crdName: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedCRD(isExpanded ? crdName : false);
  };

  const handleCRDClick = (definition: CRDDefinitionSummary) => {
    const crdData = crds.find(c => c.crd?.metadata?.name === definition.name);
    if (crdData && onCRDClick) {
      onCRDClick(crdData);
    }
  };

  if (crdDefinitions.length === 0) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        <Typography variant="body2">
          No Custom Resource Definitions found in the cluster. CRDs are required for dictionary analysis.
        </Typography>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Summary Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <CRDIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" color="primary">
                  {crdDefinitions.length}
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary">
                CRD Definitions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <K8sIcon sx={{ mr: 1, color: 'secondary.main' }} />
                <Typography variant="h6" color="secondary">
                  {apiGroups.length}
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary">
                API Groups
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <RelationIcon sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6" color="success.main">
                  {totalInstances}
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary">
                Custom Resource Instances
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* CRD Definitions List */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
        Custom Resource Definitions
      </Typography>
      
      {crdDefinitions.map((crd) => (
        <Accordion 
          key={crd.name}
          expanded={expandedCRD === crd.name}
          onChange={handleAccordionChange(crd.name)}
          sx={{ mb: 1 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" width="100%">
              <CRDIcon sx={{ mr: 2, color: 'primary.main' }} />
              <Box flexGrow={1}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {crd.kind}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {crd.group} • {crd.versions.join(', ')}
                </Typography>
              </Box>
              <Box display="flex" gap={1}>
                <Chip 
                  size="small" 
                  label={`${crd.instanceCount} Instances`}
                  color="secondary"
                  variant="outlined"
                />
                <Chip 
                  size="small" 
                  label={crd.scope}
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  <SchemaIcon sx={{ mr: 1, fontSize: 16 }} />
                  CRD Definition Details
                </Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    <Chip label={`Group: ${crd.group}`} size="small" variant="outlined" />
                    <Chip label={`Versions: ${crd.versions.join(', ')}`} size="small" variant="outlined" />
                    <Chip label={`Scope: ${crd.scope}`} size="small" variant="outlined" />
                  </Box>
                  {crd.categories.length > 0 && (
                    <Box>
                      <Typography variant="caption" color="textSecondary">Categories:</Typography>
                      <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                        {crd.categories.map(cat => (
                          <Chip key={cat} label={cat} size="small" color="info" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  <K8sIcon sx={{ mr: 1, fontSize: 16 }} />
                  Instance Information
                </Typography>
                <Box>
                  <Typography variant="body2" color={crd.instanceCount > 0 ? 'success.main' : 'textSecondary'}>
                    {crd.instanceCount > 0 ? (
                      `${crd.instanceCount} active instances found in cluster`
                    ) : (
                      'No instances currently deployed'
                    )}
                  </Typography>
                  {crd.description && (
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }} fontStyle="italic">
                      {crd.description}
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* API Groups Summary */}
      <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2 }}>
        API Groups
      </Typography>
      <Paper sx={{ p: 2 }}>
        <Box display="flex" flexWrap="wrap" gap={1}>
          {apiGroups.map(group => {
            const groupCRDs = crdDefinitions.filter(crd => crd.group === group);
            return (
              <Chip 
                key={group}
                label={`${group} (${groupCRDs.length})`}
                color="secondary"
                variant="outlined"
                onClick={() => {
                  console.log(`API group ${group} contains CRDs:`, groupCRDs.map(c => c.name));
                }}
              />
            );
          })}
        </Box>
        {apiGroups.length === 0 && (
          <Typography variant="body2" color="textSecondary" fontStyle="italic">
            No Custom Resource Definitions found
          </Typography>
        )}
      </Paper>

      {/* CRD Instance Summary */}
      {totalInstances > 0 && (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2 }}>
            CRD Instance Summary
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>CRD Name</strong></TableCell>
                  <TableCell><strong>Kind</strong></TableCell>
                  <TableCell><strong>API Group</strong></TableCell>
                  <TableCell><strong>Instances</strong></TableCell>
                  <TableCell><strong>Scope</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {crdDefinitions
                  .filter(crd => crd.instanceCount > 0)
                  .slice(0, 20)
                  .map((crd, index) => (
                  <TableRow key={index} hover>
                    <TableCell>{crd.name}</TableCell>
                    <TableCell>
                      <Chip 
                        size="small" 
                        label={crd.kind}
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={crd.group} variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="success.main">
                        {crd.instanceCount}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={crd.scope} color={crd.scope === 'Cluster' ? 'warning' : 'default'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {crdDefinitions.filter(crd => crd.instanceCount > 0).length > 20 && (
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
              Showing first 20 CRDs with instances
            </Typography>
          )}
        </>
      )}
    </Box>
  );
};

export default CRDDictionaryVisualization;