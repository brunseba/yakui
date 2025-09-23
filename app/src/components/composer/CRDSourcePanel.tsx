import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Divider,
  Tooltip,
  IconButton,
  Badge,
  InputAdornment
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Extension as ExtensionIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Public as ClusterIcon,
  Language as NamespacedIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { ComposerCRD, CRDFilterOptions } from './types/composer';
import { crdAnalysisService } from '../../services/crd-analysis';

interface CRDSourcePanelProps {
  availableCRDs: ComposerCRD[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onDragStart: (crd: ComposerCRD) => void;
}

export const CRDSourcePanel: React.FC<CRDSourcePanelProps> = ({
  availableCRDs,
  loading,
  error,
  onRefresh,
  onDragStart
}) => {
  const [filters, setFilters] = useState<CRDFilterOptions>({
    searchTerm: '',
    selectedApiGroups: [],
    showCustomOnly: true,
    showCoreOnly: false,
    scopeFilter: 'all'
  });
  const [apiGroups, setApiGroups] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['custom']));

  // Load available API groups
  useEffect(() => {
    const loadApiGroups = async () => {
      try {
        const groups = await crdAnalysisService.getApiGroups();
        const groupNames = groups.map(g => g.group).sort();
        setApiGroups(groupNames);
      } catch (error) {
        console.error('[CRD Source Panel] Failed to load API groups:', error);
      }
    };
    
    loadApiGroups();
  }, []);

  // Extract unique API groups from available CRDs
  const crdApiGroups = useMemo(() => {
    const groups = new Map<string, { crds: ComposerCRD[]; count: number }>();
    
    availableCRDs.forEach(crd => {
      const group = crd.group || 'core';
      if (!groups.has(group)) {
        groups.set(group, { crds: [], count: 0 });
      }
      const groupData = groups.get(group)!;
      groupData.crds.push(crd);
      groupData.count++;
    });
    
    return groups;
  }, [availableCRDs]);

  // Filter CRDs based on current filters
  const filteredCRDs = useMemo(() => {
    return availableCRDs.filter(crd => {
      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        if (!crd.kind.toLowerCase().includes(searchLower) &&
            !crd.name.toLowerCase().includes(searchLower) &&
            !crd.group.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // API group filter
      if (filters.selectedApiGroups.length > 0 && 
          !filters.selectedApiGroups.includes(crd.group)) {
        return false;
      }

      // Custom/Core filter
      if (filters.showCustomOnly && !crd.isCustom) return false;
      if (filters.showCoreOnly && crd.isCustom) return false;

      // Scope filter
      if (filters.scopeFilter !== 'all') {
        if (filters.scopeFilter === 'cluster' && crd.scope !== 'Cluster') return false;
        if (filters.scopeFilter === 'namespaced' && crd.scope !== 'Namespaced') return false;
      }

      return true;
    });
  }, [availableCRDs, filters]);

  const handleDragStart = (e: React.DragEvent, crd: ComposerCRD) => {
    e.dataTransfer.setData('application/json', JSON.stringify(crd));
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart(crd);
  };

  const handleFilterChange = (key: keyof CRDFilterOptions, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      selectedApiGroups: [],
      showCustomOnly: true,
      showCoreOnly: false,
      scopeFilter: 'all'
    });
  };

  const toggleGroupExpansion = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  const getScopeIcon = (scope: 'Cluster' | 'Namespaced') => {
    return scope === 'Cluster' ? <ClusterIcon /> : <NamespacedIcon />;
  };

  const getScopeColor = (scope: 'Cluster' | 'Namespaced') => {
    return scope === 'Cluster' ? 'primary' : 'secondary';
  };

  return (
    <Box sx={{ 
      width: 300, 
      height: '100%', 
      borderRight: '1px solid', 
      borderColor: 'divider',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ExtensionIcon color="primary" />
            CRD Library
          </Typography>
          <Tooltip title="Refresh CRDs">
            <IconButton size="small" onClick={onRefresh} disabled={loading}>
              {loading ? <CircularProgress size={16} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Search */}
        <TextField
          size="small"
          fullWidth
          placeholder="Search CRDs..."
          value={filters.searchTerm}
          onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: filters.searchTerm && (
              <InputAdornment position="end">
                <IconButton 
                  size="small" 
                  onClick={() => handleFilterChange('searchTerm', '')}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </Box>

      {/* Filters */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon fontSize="small" />
            Filters
          </Typography>
          <Tooltip title="Clear all filters">
            <IconButton size="small" onClick={clearFilters}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Scope Filter */}
        <FormControl size="small" fullWidth sx={{ mb: 2 }}>
          <InputLabel>Scope</InputLabel>
          <Select
            value={filters.scopeFilter}
            onChange={(e) => handleFilterChange('scopeFilter', e.target.value)}
            label="Scope"
          >
            <MenuItem value="all">All Scopes</MenuItem>
            <MenuItem value="cluster">Cluster Scoped</MenuItem>
            <MenuItem value="namespaced">Namespaced</MenuItem>
          </Select>
        </FormControl>

        {/* API Groups Filter */}
        {apiGroups.length > 0 && (
          <FormControl size="small" fullWidth>
            <InputLabel>API Groups</InputLabel>
            <Select
              multiple
              value={filters.selectedApiGroups}
              onChange={(e) => handleFilterChange('selectedApiGroups', e.target.value)}
              label="API Groups"
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {apiGroups.map((group) => (
                <MenuItem key={group} value={group}>
                  {group}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* CRD List */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {/* Summary */}
            <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="caption" color="text.secondary">
                Showing {filteredCRDs.length} of {availableCRDs.length} CRDs
              </Typography>
            </Box>

            {/* CRDs grouped by API Group */}
            {Array.from(crdApiGroups.entries())
              .filter(([group, data]) => {
                // Filter groups that have matching CRDs
                return data.crds.some(crd => filteredCRDs.includes(crd));
              })
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([group, data]) => {
                const groupCRDs = data.crds.filter(crd => filteredCRDs.includes(crd));
                if (groupCRDs.length === 0) return null;

                return (
                  <Accordion
                    key={group}
                    expanded={expandedGroups.has(group)}
                    onChange={() => toggleGroupExpansion(group)}
                    disableGutters
                    elevation={0}
                    sx={{ '&:before': { display: 'none' } }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box display="flex" alignItems="center" width="100%">
                        <Typography variant="subtitle2" sx={{ flex: 1 }}>
                          {group || 'core'}
                        </Typography>
                        <Badge badgeContent={groupCRDs.length} color="primary" />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                      <List dense>
                        {groupCRDs.map((crd) => (
                          <ListItem 
                            key={crd.id} 
                            disablePadding
                            draggable
                            onDragStart={(e) => handleDragStart(e, crd)}
                            sx={{
                              cursor: 'grab',
                              '&:hover': { bgcolor: 'action.hover' },
                              '&:active': { cursor: 'grabbing' }
                            }}
                          >
                            <ListItemButton>
                              <ListItemIcon>
                                {getScopeIcon(crd.scope)}
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                      {crd.kind}
                                    </Typography>
                                    <Chip
                                      label={crd.scope}
                                      size="small"
                                      color={getScopeColor(crd.scope)}
                                      variant="outlined"
                                    />
                                  </Box>
                                }
                                secondary={
                                  <Typography variant="caption" color="text.secondary">
                                    {crd.description}
                                  </Typography>
                                }
                              />
                            </ListItemButton>
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                );
              })}

            {filteredCRDs.length === 0 && !loading && (
              <Box p={4} textAlign="center">
                <Typography color="text.secondary">
                  No CRDs found matching the current filters
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};