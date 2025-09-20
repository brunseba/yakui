import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  Box,
  TableSortLabel,
  TablePagination,
  IconButton,
  Tooltip,
  Collapse
} from '@mui/material';
import {
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowRight as ExpandLessIcon,
  ArrowRightAlt as ArrowIcon
} from '@mui/icons-material';
import { DependencyGraphNode, DependencyGraphEdge, dependencyAnalyzer } from '../../services/dependency-analyzer';
import { useDependencyTheme } from '../../config/dependency-theme';

type Order = 'asc' | 'desc';
type OrderBy = 'source' | 'target' | 'type' | 'strength';

interface DependencyTableProps {
  nodes: DependencyGraphNode[];
  edges: DependencyGraphEdge[];
}

interface EnhancedDependency {
  id: string;
  sourceNode: DependencyGraphNode;
  targetNode: DependencyGraphNode;
  edge: DependencyGraphEdge;
  sourceName: string;
  targetName: string;
}

const DependencyTable: React.FC<DependencyTableProps> = ({ nodes, edges }) => {
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<OrderBy>('source');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  const theme = useDependencyTheme();

  // Create a map for quick node lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, DependencyGraphNode>();
    nodes.forEach(node => {
      if (node && node.id) {
        map.set(node.id, node);
      }
    });
    return map;
  }, [nodes]);

  // Transform edges into enhanced dependencies with node information
  const enhancedDependencies = useMemo(() => {
    return edges
      .filter(edge => edge && edge.id && edge.source && edge.target && edge.type)
      .map(edge => {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);
        
        if (!sourceNode || !targetNode) {
          return null;
        }

        return {
          id: edge.id,
          sourceNode,
          targetNode,
          edge,
          sourceName: `${sourceNode.kind}/${sourceNode.name}${sourceNode.namespace ? `@${sourceNode.namespace}` : ''}`,
          targetName: `${targetNode.kind}/${targetNode.name}${targetNode.namespace ? `@${targetNode.namespace}` : ''}`
        };
      })
      .filter((dep): dep is EnhancedDependency => dep !== null);
  }, [edges, nodeMap]);

  // Sorting logic
  const handleRequestSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedDependencies = useMemo(() => {
    return [...enhancedDependencies].sort((a, b) => {
      let aValue: string;
      let bValue: string;

      switch (orderBy) {
        case 'source':
          aValue = a.sourceName;
          bValue = b.sourceName;
          break;
        case 'target':
          aValue = a.targetName;
          bValue = b.targetName;
          break;
        case 'type':
          aValue = a.edge.type;
          bValue = b.edge.type;
          break;
        case 'strength':
          aValue = a.edge.strength || 'weak';
          bValue = b.edge.strength || 'weak';
          break;
        default:
          aValue = a.sourceName;
          bValue = b.sourceName;
      }

      if (order === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  }, [enhancedDependencies, order, orderBy]);

  // Pagination
  const paginatedDependencies = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return sortedDependencies.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedDependencies, page, rowsPerPage]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const toggleRowExpansion = (dependencyId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (expandedRows.has(dependencyId)) {
      newExpandedRows.delete(dependencyId);
    } else {
      newExpandedRows.add(dependencyId);
    }
    setExpandedRows(newExpandedRows);
  };

  const formatResourceName = (node: DependencyGraphNode) => {
    const icon = theme.icons[node.kind?.toLowerCase()] || theme.icons.unknown;
    return (
      <Box display="flex" alignItems="center">
        <Typography variant="body2" component="span" mr={1}>
          {icon}
        </Typography>
        <Box>
          <Typography variant="body2" fontWeight="bold">
            {node.kind}/{node.name}
          </Typography>
          {node.namespace && (
            <Typography variant="caption" color="textSecondary">
              namespace: {node.namespace}
            </Typography>
          )}
        </Box>
      </Box>
    );
  };

  const renderDependencyType = (edge: DependencyGraphEdge) => {
    const color = theme.colors[edge.type] || '#666666';
    const description = dependencyAnalyzer.getDependencyTypeDescription(edge.type);
    
    return (
      <Tooltip title={description} arrow>
        <Chip
          label={edge.type}
          size="small"
          sx={{
            backgroundColor: color,
            color: 'white',
            fontWeight: 'bold',
            '&:hover': {
              backgroundColor: color,
              filter: 'brightness(1.1)',
            }
          }}
        />
      </Tooltip>
    );
  };

  const renderStrength = (strength: string) => {
    const isStrong = strength === 'strong';
    return (
      <Chip
        label={strength}
        size="small"
        variant={isStrong ? 'filled' : 'outlined'}
        color={isStrong ? 'success' : 'default'}
        sx={{
          fontWeight: isStrong ? 'bold' : 'normal'
        }}
      />
    );
  };

  if (enhancedDependencies.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="textSecondary">
          No dependencies to display
        </Typography>
        <Typography variant="body2" color="textSecondary" mt={1}>
          Try adjusting your filters or check if resources have relationships
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ width: '100%', mt: 3 }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" component="div" display="flex" alignItems="center">
          📊 Dependencies Table
          <Typography variant="body2" color="textSecondary" ml={2}>
            ({enhancedDependencies.length} relationships)
          </Typography>
        </Typography>
        <Typography variant="body2" color="textSecondary" mt={0.5}>
          Detailed view of all resource dependencies shown in the graph above
        </Typography>
      </Box>
      
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width="40px">
                {/* Expand/Collapse column */}
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'source'}
                  direction={orderBy === 'source' ? order : 'asc'}
                  onClick={() => handleRequestSort('source')}
                >
                  Source Resource
                </TableSortLabel>
              </TableCell>
              <TableCell width="60px" align="center">
                {/* Arrow column */}
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'target'}
                  direction={orderBy === 'target' ? order : 'asc'}
                  onClick={() => handleRequestSort('target')}
                >
                  Target Resource
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'type'}
                  direction={orderBy === 'type' ? order : 'asc'}
                  onClick={() => handleRequestSort('type')}
                >
                  Dependency Type
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'strength'}
                  direction={orderBy === 'strength' ? order : 'asc'}
                  onClick={() => handleRequestSort('strength')}
                >
                  Strength
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedDependencies.map((dependency) => (
              <React.Fragment key={dependency.id}>
                <TableRow
                  hover
                  sx={{ 
                    '&:hover': { backgroundColor: 'action.hover' },
                    borderLeft: `4px solid ${theme.colors[dependency.edge.type] || '#666666'}`
                  }}
                >
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => toggleRowExpansion(dependency.id)}
                      aria-label="expand row"
                    >
                      {expandedRows.has(dependency.id) ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    {formatResourceName(dependency.sourceNode)}
                  </TableCell>
                  <TableCell align="center">
                    <ArrowIcon color="action" />
                  </TableCell>
                  <TableCell>
                    {formatResourceName(dependency.targetNode)}
                  </TableCell>
                  <TableCell>
                    {renderDependencyType(dependency.edge)}
                  </TableCell>
                  <TableCell>
                    {renderStrength(dependency.edge.strength || 'weak')}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={expandedRows.has(dependency.id)} timeout="auto" unmountOnExit>
                      <Box sx={{ margin: 1, p: 2, backgroundColor: 'grey.50' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Dependency Details
                        </Typography>
                        <Box display="flex" flexDirection="column" gap={1}>
                          <Typography variant="body2">
                            <strong>Description:</strong> {dependencyAnalyzer.getDependencyTypeDescription(dependency.edge.type)}
                          </Typography>
                          {dependency.edge.metadata?.reason && (
                            <Typography variant="body2">
                              <strong>Reason:</strong> {dependency.edge.metadata.reason}
                            </Typography>
                          )}
                          {dependency.edge.metadata?.field && (
                            <Typography variant="body2">
                              <strong>Field:</strong> {dependency.edge.metadata.field}
                            </Typography>
                          )}
                          {dependency.edge.metadata?.controller !== undefined && (
                            <Typography variant="body2">
                              <strong>Controller:</strong> {dependency.edge.metadata.controller ? 'Yes' : 'No'}
                            </Typography>
                          )}
                          {dependency.sourceNode.labels && Object.keys(dependency.sourceNode.labels).length > 0 && (
                            <Box>
                              <Typography variant="body2" component="div">
                                <strong>Source Labels:</strong>
                              </Typography>
                              <Box sx={{ mt: 0.5 }}>
                                {Object.entries(dependency.sourceNode.labels).map(([key, value]) => (
                                  <Chip 
                                    key={key} 
                                    label={`${key}=${value}`} 
                                    size="small" 
                                    variant="outlined"
                                    sx={{ mr: 0.5, mb: 0.5 }} 
                                  />
                                ))}
                              </Box>
                            </Box>
                          )}
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
      
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={enhancedDependencies.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default DependencyTable;