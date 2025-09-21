import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Collapse,
  Button,
  Card,
  CardContent,
  ButtonGroup
} from '@mui/material';
import {
  Search as SearchIcon,
  FileCopyOutlined as CopyIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  AccountTree as GraphIcon,
  Analytics as InsightsIcon,
  KeyboardArrowUp as ExpandLessIcon,
  AccountTree as DependencyIcon,
  Code as SchemaIcon,
  Link as ReferenceIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import {
  CRDAnalysisResult,
  CRDType,
  crdAnalysisService
} from '../../services/crd-analysis';
import { ViewType } from './CRDAnalysisViews';

interface DependencyRow {
  id: string;
  sourceCRD: string;
  sourceApiGroup: string;
  targetResource: string;
  dependencyType: string;
  severity: 'low' | 'medium' | 'high';
  path?: string;
  description: string;
  crdData: CRDType;
}

type SortableField = 'sourceCRD' | 'sourceApiGroup' | 'targetResource' | 'dependencyType' | 'severity';
type SortOrder = 'asc' | 'desc';

interface CRDDependenciesTableProps {
  results: CRDAnalysisResult | null;
  loading?: boolean;
  error?: string | null;
  onNavigateToView?: (view: ViewType) => void;
}

export const CRDDependenciesTable: React.FC<CRDDependenciesTableProps> = ({
  results,
  loading = false,
  error = null,
  onNavigateToView
}) => {
  const [sortField, setSortField] = useState<SortableField>('sourceCRD');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Helper functions to categorize dependencies
  const isCRDToCRD = (type: string) => {
    if (!type || typeof type !== 'string') return false;
    const lowerType = type.toLowerCase();
    return lowerType.includes('crd') || 
           lowerType === 'reference' || 
           lowerType === 'crd-to-crd' ||
           lowerType === 'dependency';
  };

  const isSchemaDep = (type: string) => {
    if (!type || typeof type !== 'string') return false;
    const lowerType = type.toLowerCase();
    return lowerType.includes('schema') || 
           lowerType.includes('field') ||
           lowerType === 'schema-field';
  };

  const getDependencyTypeIcon = (type: string) => {
    if (!type || typeof type !== 'string') return <InfoIcon fontSize="small" />;
    switch (type.toLowerCase()) {
      case 'reference': return <ReferenceIcon fontSize="small" />;
      case 'schema': return <SchemaIcon fontSize="small" />;
      case 'dependency': return <DependencyIcon fontSize="small" />;
      case 'cross-reference': return <ReferenceIcon fontSize="small" />;
      case 'field': return <SchemaIcon fontSize="small" />;
      default: return <InfoIcon fontSize="small" />;
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

  // Transform CRD data into table rows
  const dependencyRows = useMemo((): DependencyRow[] => {
    if (!results) return [];
    
    const allCRDs = getCRDsFromResults(results);
    if (!allCRDs.length) return [];

    const rows: DependencyRow[] = [];
    
    allCRDs.forEach((crd: CRDType) => {
      crd.dependencies.forEach((dep, index) => {
        const rowId = `${crd.apiGroup || 'core'}/${crd.kind}-${index}`;
        rows.push({
          id: rowId,
          sourceCRD: crd.kind,
          sourceApiGroup: crd.apiGroup || 'core',
          targetResource: dep.target,
          dependencyType: dep.type,
          severity: dep.severity || 'medium',
          path: dep.path,
          description: dep.description || `Dependency on ${dep.target}`,
          crdData: crd
        });
      });
    });

    return rows;
  }, [results]);

  // Filter and sort data
  const filteredAndSortedRows = useMemo(() => {
    let filtered = dependencyRows;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(row =>
        row.sourceCRD.toLowerCase().includes(query) ||
        row.sourceApiGroup.toLowerCase().includes(query) ||
        row.targetResource.toLowerCase().includes(query) ||
        row.dependencyType.toLowerCase().includes(query) ||
        row.description.toLowerCase().includes(query)
      );
    }

    // Apply severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(row => row.severity === severityFilter);
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(row => row.dependencyType === typeFilter);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'crd-to-crd') {
        filtered = filtered.filter(row => isCRDToCRD(row.dependencyType));
      } else if (categoryFilter === 'schema') {
        filtered = filtered.filter(row => isSchemaDep(row.dependencyType));
      }
    }

    // Sort data
    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [dependencyRows, searchQuery, severityFilter, typeFilter, categoryFilter, sortField, sortOrder]);

  // Get unique values for filters
  const uniqueTypes = useMemo(() => {
    const types = new Set(dependencyRows.map(row => row.dependencyType));
    return Array.from(types).sort();
  }, [dependencyRows]);


  const handleSort = (field: SortableField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleRowExpand = (rowId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copied to clipboard:', text);
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };


  if (loading) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6">Loading dependencies table...</Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  if (!results || !results.nodes || dependencyRows.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Alert severity="info">
          <Typography variant="body1">No dependencies found</Typography>
          <Typography variant="body2">
            Run a CRD analysis to populate the dependencies table.
          </Typography>
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper elevation={2}>
      {/* Header and Summary */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            📋 CRD Dependencies Table
          </Typography>
          {onNavigateToView && (
            <ButtonGroup size="small" variant="outlined">
              <Button
                startIcon={<GraphIcon />}
                onClick={() => onNavigateToView('crd-graph')}
              >
                CRD Graph
              </Button>
              <Button
                startIcon={<InsightsIcon />}
                onClick={() => onNavigateToView('insights')}
              >
                Insights
              </Button>
            </ButtonGroup>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary">
          {filteredAndSortedRows.length} of {dependencyRows.length} dependencies
        </Typography>
      </Box>

      {/* Summary Statistics */}
      <Box sx={{ p: 2, backgroundColor: 'background.default' }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <Card variant="outlined" sx={{ textAlign: 'center', flex: '1 1 120px', minWidth: '120px' }}>
            <CardContent sx={{ py: 1 }}>
              <Typography variant="h6" color="primary">
                {getCRDsFromResults(results).length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                CRDs
              </Typography>
            </CardContent>
          </Card>
          
          <Card variant="outlined" sx={{ textAlign: 'center', flex: '1 1 120px', minWidth: '120px', position: 'relative' }}>
            <CardContent sx={{ py: 1 }}>
              <Typography variant="h6" color="secondary">
                {dependencyRows.filter(r => isCRDToCRD(r.dependencyType)).length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                CRD-to-CRD
              </Typography>
              {onNavigateToView && dependencyRows.filter(r => isCRDToCRD(r.dependencyType)).length > 0 && (
                <Button
                  size="small"
                  variant="text"
                  startIcon={<GraphIcon fontSize="small" />}
                  onClick={() => onNavigateToView('crd-graph')}
                  sx={{ 
                    mt: 0.5,
                    fontSize: '0.75rem',
                    minWidth: 'unset',
                    padding: '2px 4px'
                  }}
                >
                  View Graph
                </Button>
              )}
            </CardContent>
          </Card>
          
          <Card variant="outlined" sx={{ textAlign: 'center', flex: '1 1 120px', minWidth: '120px' }}>
            <CardContent sx={{ py: 1 }}>
              <Typography variant="h6" color="info">
                {dependencyRows.filter(r => isSchemaDep(r.dependencyType)).length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Schema Deps
              </Typography>
            </CardContent>
          </Card>
          
          <Card variant="outlined" sx={{ textAlign: 'center', flex: '1 1 120px', minWidth: '120px' }}>
            <CardContent sx={{ py: 1 }}>
              <Typography variant="h6" color="error">
                {dependencyRows.filter(r => r.severity === 'high').length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                High Severity
              </Typography>
            </CardContent>
          </Card>
          
          <Card variant="outlined" sx={{ textAlign: 'center', flex: '1 1 120px', minWidth: '120px' }}>
            <CardContent sx={{ py: 1 }}>
              <Typography variant="h6" color="success">
                {uniqueTypes.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Dep Types
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search dependencies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250 }}
        />
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Severity</InputLabel>
          <Select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            label="Severity"
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="low">Low</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            label="Category"
          >
            <MenuItem value="all">All Categories</MenuItem>
            <MenuItem value="crd-to-crd">🔗 CRD-to-CRD</MenuItem>
            <MenuItem value="schema">📋 Schema</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Specific Type</InputLabel>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            label="Specific Type"
          >
            <MenuItem value="all">All Types</MenuItem>
            {uniqueTypes.map(type => (
              <MenuItem key={type} value={type}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getDependencyTypeIcon(type)}
                  {type}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            setSearchQuery('');
            setSeverityFilter('all');
            setTypeFilter('all');
            setCategoryFilter('all');
          }}
        >
          Clear Filters
        </Button>
      </Box>

      {/* Table */}
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell width={40}></TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'sourceCRD'}
                  direction={sortField === 'sourceCRD' ? sortOrder : 'asc'}
                  onClick={() => handleSort('sourceCRD')}
                >
                  Source CRD
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'sourceApiGroup'}
                  direction={sortField === 'sourceApiGroup' ? sortOrder : 'asc'}
                  onClick={() => handleSort('sourceApiGroup')}
                >
                  API Group
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'targetResource'}
                  direction={sortField === 'targetResource' ? sortOrder : 'asc'}
                  onClick={() => handleSort('targetResource')}
                >
                  Target Resource
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'dependencyType'}
                  direction={sortField === 'dependencyType' ? sortOrder : 'asc'}
                  onClick={() => handleSort('dependencyType')}
                >
                  Type
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'severity'}
                  direction={sortField === 'severity' ? sortOrder : 'asc'}
                  onClick={() => handleSort('severity')}
                >
                  Severity
                </TableSortLabel>
              </TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndSortedRows.map((row) => (
              <React.Fragment key={row.id}>
                <TableRow hover>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleRowExpand(row.id)}
                    >
                      {expandedRows.has(row.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {crdAnalysisService.getCRDIcon(row.crdData)}
                      <Typography variant="body2" fontWeight="bold">
                        {row.sourceCRD}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.sourceApiGroup}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {row.targetResource}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getDependencyTypeIcon(row.dependencyType)}
                      <Typography variant="body2">
                        {row.dependencyType}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.severity.toUpperCase()}
                      size="small"
                      color={getSeverityColor(row.severity) as any}
                      variant="filled"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Copy target resource">
                      <IconButton
                        size="small"
                        onClick={() => copyToClipboard(row.targetResource)}
                      >
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 0 }}>
                    <Collapse in={expandedRows.has(row.id)} timeout="auto" unmountOnExit>
                      <Box sx={{ p: 2, backgroundColor: 'background.default' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Dependency Details
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <Box sx={{ flex: 1, minWidth: '300px' }}>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Description:</strong> {row.description}
                            </Typography>
                            {row.path && (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                <strong>Schema Path:</strong> {row.path}
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: '300px' }}>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Source CRD Version:</strong> {row.crdData.version || 'N/A'}
                            </Typography>
                            {row.crdData.plural && (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                <strong>Plural Name:</strong> {row.crdData.plural}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredAndSortedRows.length === 0 && dependencyRows.length > 0 && (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Alert severity="info">
            No dependencies match the current filters. Try adjusting your search criteria.
          </Alert>
        </Box>
      )}
    </Paper>
  );
};

export default CRDDependenciesTable;