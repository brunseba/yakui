import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  MenuItem,
  Checkbox,
  ListItemText,
  Chip,
  Alert,
  Paper,
  Grid,
  Tooltip,
  IconButton,
  InputAdornment,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemIcon
} from '@mui/material';
import {
  SelectAll as SelectAllIcon,
  ClearAll as DeselectAllIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Code as RegexIcon
} from '@mui/icons-material';
import { APIGroupInfo } from '../../services/dependency-analyzer';
import dependencyAnalyzer from '../../services/dependency-analyzer';

export interface CRDAPIGroupSelectorProps {
  selectedGroups: string[];
  onGroupsChange: (groups: string[]) => void;
  disabled?: boolean;
  maxWidth?: number | string;
}

const CRDAPIGroupSelector: React.FC<CRDAPIGroupSelectorProps> = ({
  selectedGroups,
  onGroupsChange,
  disabled = false,
  maxWidth = '100%'
}) => {
  const [apiGroups, setApiGroups] = useState<APIGroupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regexDialogOpen, setRegexDialogOpen] = useState(false);
  const [regexPattern, setRegexPattern] = useState('');
  const [regexError, setRegexError] = useState<string | null>(null);
  const [regexMatches, setRegexMatches] = useState<APIGroupInfo[]>([]);
  
  // Manual pattern input states
  const [manualPattern, setManualPattern] = useState('');
  const [manualPatternError, setManualPatternError] = useState('');
  const [manualMatches, setManualMatches] = useState<APIGroupInfo[]>([]);

  // Fetch API groups from the backend
  const fetchAPIGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const groups = await dependencyAnalyzer.getCRDAPIGroups();
      setApiGroups(groups);
    } catch (err) {
      console.error('Failed to fetch CRD API groups:', err);
      setError(err instanceof Error ? err.message : 'Failed to load API groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAPIGroups();
  }, []);

  const handleGroupChange = (event: any) => {
    const value = typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value;
    onGroupsChange(value);
  };

  const handleSelectAll = () => {
    onGroupsChange(apiGroups.map(group => group.group));
  };

  const handleDeselectAll = () => {
    onGroupsChange([]);
  };

  const handleRefresh = () => {
    fetchAPIGroups();
  };

  const handleSelectFirst = (count: number) => {
    const firstGroups = apiGroups.slice(0, count).map(group => group.group);
    onGroupsChange(firstGroups);
  };

  const handleSelectLargest = (count: number) => {
    const sortedGroups = [...apiGroups].sort((a, b) => b.crdCount - a.crdCount);
    const largestGroups = sortedGroups.slice(0, count).map(group => group.group);
    onGroupsChange(largestGroups);
  };

  const handleRegexPatternChange = (pattern: string) => {
    setRegexPattern(pattern);
    setRegexError(null);
    
    if (!pattern.trim()) {
      setRegexMatches([]);
      return;
    }
    
    try {
      const regex = new RegExp(pattern, 'i'); // Case insensitive
      const matches = apiGroups.filter(group => regex.test(group.group));
      setRegexMatches(matches);
    } catch (error) {
      setRegexError('Invalid regular expression');
      setRegexMatches([]);
    }
  };

  const handleApplyRegexSelection = () => {
    if (regexMatches.length > 0) {
      const matchedGroups = regexMatches.map(group => group.group);
      onGroupsChange(matchedGroups);
    }
    setRegexDialogOpen(false);
    setRegexPattern('');
    setRegexMatches([]);
    setRegexError(null);
  };

  const handleCancelRegexSelection = () => {
    setRegexDialogOpen(false);
    setRegexPattern('');
    setRegexMatches([]);
    setRegexError(null);
  };

  // Manual pattern handlers
  const handleApplyManualPattern = () => {
    if (manualMatches.length > 0 && !manualPatternError) {
      const matchedGroups = manualMatches.map(group => group.group);
      onGroupsChange(matchedGroups);
    }
  };

  // Validate manual pattern and update matches
  useEffect(() => {
    if (!manualPattern.trim()) {
      setManualMatches([]);
      setManualPatternError('');
      return;
    }

    try {
      const regex = new RegExp(manualPattern, 'i'); // Case insensitive
      const matches = apiGroups.filter(group => regex.test(group.group));
      setManualMatches(matches);
      setManualPatternError('');
    } catch (error) {
      setManualPatternError('Invalid regular expression syntax');
      setManualMatches([]);
    }
  }, [manualPattern, apiGroups]);

  const getGroupDisplayName = (group: APIGroupInfo) => {
    return `${group.group} (${group.crdCount} CRDs)`;
  };

  const getGroupSummary = () => {
    if (selectedGroups.length === 0) {
      return 'All API groups selected';
    }
    
    const selectedGroupsInfo = apiGroups.filter(group => selectedGroups.includes(group.group));
    const totalCRDs = selectedGroupsInfo.reduce((sum, group) => sum + group.crdCount, 0);
    
    return `${selectedGroups.length} API group${selectedGroups.length !== 1 ? 's' : ''} selected (${totalCRDs} CRDs)`;
  };

  if (loading) {
    return (
      <Paper sx={{ p: 2, maxWidth }}>
        <Box display="flex" alignItems="center" justifyContent="center" minHeight={100}>
          <CircularProgress size={24} sx={{ mr: 2 }} />
          <Typography variant="body2">Loading API groups...</Typography>
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 2, maxWidth }}>
        <Alert 
          severity="error" 
          action={
            <Button size="small" onClick={handleRefresh} startIcon={<RefreshIcon />}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, maxWidth }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" display="flex" alignItems="center">
          CRD API Group Filter
          <Tooltip title="Select specific API groups to focus the dependency analysis on particular sets of Custom Resource Definitions">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="Select by regular expression">
            <IconButton 
              size="small" 
              onClick={() => setRegexDialogOpen(true)}
              disabled={disabled}
            >
              <RegexIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Select all API groups">
            <IconButton 
              size="small" 
              onClick={handleSelectAll}
              disabled={disabled}
            >
              <SelectAllIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Deselect all API groups">
            <IconButton 
              size="small" 
              onClick={handleDeselectAll}
              disabled={disabled}
            >
              <DeselectAllIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh API groups">
            <IconButton 
              size="small" 
              onClick={handleRefresh}
              disabled={disabled}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Quick Selection Actions */}
      <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Quick Selection:
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={1} mb={1}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => handleSelectFirst(3)}
            disabled={disabled || apiGroups.length < 3}
          >
            First 3 Groups
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => handleSelectFirst(5)}
            disabled={disabled || apiGroups.length < 5}
          >
            First 5 Groups
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => handleSelectLargest(3)}
            disabled={disabled || apiGroups.length < 3}
          >
            3 Largest Groups
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => handleSelectLargest(5)}
            disabled={disabled || apiGroups.length < 5}
          >
            5 Largest Groups
          </Button>
        </Box>
        <Typography variant="caption" color="textSecondary" gutterBottom display="block">
          Pattern Selection:
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            startIcon={<RegexIcon />}
            onClick={() => {
              handleRegexPatternChange('kubevirt');
              if (apiGroups.filter(group => /kubevirt/i.test(group.group)).length > 0) {
                const matches = apiGroups.filter(group => /kubevirt/i.test(group.group));
                onGroupsChange(matches.map(group => group.group));
              }
            }}
            disabled={disabled}
          >
            KubeVirt
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            startIcon={<RegexIcon />}
            onClick={() => {
              const matches = apiGroups.filter(group => /\.io$/i.test(group.group));
              if (matches.length > 0) {
                onGroupsChange(matches.map(group => group.group));
              }
            }}
            disabled={disabled}
          >
            *.io domains
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            startIcon={<RegexIcon />}
            onClick={() => {
              const matches = apiGroups.filter(group => /templates|widgets/i.test(group.group));
              if (matches.length > 0) {
                onGroupsChange(matches.map(group => group.group));
              }
            }}
            disabled={disabled}
          >
            Templates
          </Button>
        </Box>
        
        {/* Manual Pattern Input */}
        <Box display="flex" gap={1} alignItems="flex-end">
          <TextField
            label="Manual Pattern"
            placeholder="Enter regex pattern (e.g., ^app\.|storage|.*\.v1$)"
            value={manualPattern}
            onChange={(e) => setManualPattern(e.target.value)}
            size="small"
            disabled={disabled}
            error={!!manualPatternError}
            helperText={manualPatternError || "Use JavaScript regex syntax"}
            sx={{ flexGrow: 1, minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <RegexIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            color="secondary"
            size="small"
            onClick={handleApplyManualPattern}
            disabled={disabled || !manualPattern.trim() || !!manualPatternError}
            sx={{ minWidth: 80 }}
          >
            Apply
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setManualPattern('');
              setManualPatternError('');
            }}
            disabled={disabled || !manualPattern.trim()}
          >
            Clear
          </Button>
        </Box>
        
        {manualMatches.length > 0 && (
          <Box mt={1}>
            <Typography variant="caption" color="textSecondary">
              Pattern matches: {manualMatches.length} groups
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
              {manualMatches.slice(0, 5).map(group => (
                <Chip
                  key={group.group}
                  label={group.group}
                  size="small"
                  variant="outlined"
                  color="secondary"
                />
              ))}
              {manualMatches.length > 5 && (
                <Chip
                  label={`+${manualMatches.length - 5} more`}
                  size="small"
                  variant="outlined"
                  color="default"
                />
              )}
            </Box>
          </Box>
        )}
      </Box>

      <Grid container spacing={2}>
        <Grid size={12}>
          <FormControl fullWidth disabled={disabled}>
            <InputLabel>Select API Groups</InputLabel>
            <Select
              multiple
              value={selectedGroups}
              onChange={handleGroupChange}
              input={<OutlinedInput label="Select API Groups" />}
              size="medium"
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, minHeight: 40 }}>
                  {selected.map((value) => {
                    const group = apiGroups.find(g => g.group === value);
                    return (
                      <Chip 
                        key={value} 
                        label={`${value} (${group?.crdCount || 0})`}
                        size="medium"
                        color="primary"
                        variant="outlined"
                      />
                    );
                  })}
                </Box>
              )}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 500,
                    width: 600,
                  },
                },
              }}
            >
              {apiGroups.map((group) => (
                <MenuItem key={group.group} value={group.group}>
                  <Checkbox checked={selectedGroups.includes(group.group)} />
                  <ListItemText 
                    primary={
                      <Typography variant="body1" fontWeight="medium">
                        {group.group}
                      </Typography>
                    }
                    secondary={
                      <>
                        <span style={{ display: 'block', fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                          {group.crdCount} CRDs • Versions: {group.versions.join(', ')}
                        </span>
                        {group.crds.length <= 5 && (
                          <span style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                            CRDs: {group.crds.map(crd => crd.kind).join(', ')}
                          </span>
                        )}
                      </>
                    }
                  />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid size={12}>
          <Box display="flex" alignItems="center" justifyContent="center" sx={{ mt: 1 }}>
            <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center' }}>
              {getGroupSummary()}
              {selectedGroups.length === 0 && (
                <Typography component="span" color="warning.main" sx={{ ml: 1 }}>
                  • No filter applied - analyzing all CRDs
                </Typography>
              )}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* API Group Details */}
      {selectedGroups.length > 0 && selectedGroups.length <= 5 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Selected API Groups Details:
          </Typography>
          <Box display="flex" flexDirection="column" gap={1}>
            {selectedGroups.map(groupName => {
              const group = apiGroups.find(g => g.group === groupName);
              if (!group) return null;
              
              return (
                <Box key={groupName} display="flex" alignItems="center" gap={1}>
                  <Chip 
                    label={group.group} 
                    size="small" 
                    color="primary"
                    variant="filled"
                  />
                  <Typography variant="caption" color="textSecondary">
                    {group.crdCount} CRDs: {group.crds.map(crd => crd.kind).join(', ')}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* Total Statistics */}
      <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="textSecondary">
          Total: {apiGroups.length} API groups with {apiGroups.reduce((sum, group) => sum + group.crdCount, 0)} Custom Resource Definitions
        </Typography>
      </Box>
      
      {/* Regex Selection Dialog */}
      <Dialog 
        open={regexDialogOpen} 
        onClose={handleCancelRegexSelection}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Select API Groups by Regular Expression
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Regular Expression Pattern"
              placeholder="e.g., kubevirt|postgresql|.*\.io$"
              value={regexPattern}
              onChange={(e) => handleRegexPatternChange(e.target.value)}
              error={!!regexError}
              helperText={regexError || 'Enter a regular expression to match API group names (case insensitive)'}
              variant="outlined"
              sx={{ mb: 2 }}
            />
            
            {regexMatches.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Matching API Groups ({regexMatches.length}):
                </Typography>
                <List dense sx={{ maxHeight: 300, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  {regexMatches.map((group) => (
                    <ListItem key={group.group}>
                      <ListItemIcon>
                        <Checkbox checked={true} disabled />
                      </ListItemIcon>
                      <ListItemText
                        primary={group.group}
                        secondary={`${group.crdCount} CRDs • ${group.crds.map(crd => crd.kind).join(', ')}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
            
            {regexPattern && regexMatches.length === 0 && !regexError && (
              <Alert severity="info">
                No API groups match the pattern "{regexPattern}"
              </Alert>
            )}
            
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Regular Expression Examples:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                  <code>kubevirt</code> - Match groups containing "kubevirt"
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                  <code>^postgresql</code> - Match groups starting with "postgresql"
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                  <code>\.io$</code> - Match groups ending with ".io"
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                  <code>kubevirt|postgresql</code> - Match groups containing "kubevirt" OR "postgresql"
                </Typography>
                <Typography component="li" variant="body2">
                  <code>.*templates.*</code> - Match groups containing "templates"
                </Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelRegexSelection}>
            Cancel
          </Button>
          <Button 
            onClick={handleApplyRegexSelection}
            variant="contained"
            disabled={regexMatches.length === 0 || !!regexError}
          >
            Select {regexMatches.length} Groups
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default CRDAPIGroupSelector;