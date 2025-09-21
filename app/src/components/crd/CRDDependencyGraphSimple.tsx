import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert
} from '@mui/material';
import { AccountTree as DependencyIcon } from '@mui/icons-material';

interface CRDDependencyGraphSimpleProps {
  results: any;
  height?: number;
}

export const CRDDependencyGraphSimple: React.FC<CRDDependencyGraphSimpleProps> = ({
  results,
  height = 600
}) => {

  if (!results) {
    return (
      <Paper elevation={2} sx={{ p: 3, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Alert severity="info" sx={{ maxWidth: 400 }}>
          <Typography variant="h6" gutterBottom>
            No CRD Dependencies to Visualize
          </Typography>
          <Typography variant="body2">
            Run a CRD analysis to see the dependency graph visualization here.
          </Typography>
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ height, position: 'relative', overflow: 'hidden' }}>
      {/* Graph Title */}
      <Box sx={{ 
        position: 'absolute', 
        top: 10, 
        left: 10, 
        zIndex: 1000, 
        backgroundColor: 'background.paper',
        p: 2,
        borderRadius: 1,
        boxShadow: 2
      }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DependencyIcon />
          CRD Dependency Graph
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Graph visualization coming soon
        </Typography>
      </Box>

      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%' 
      }}>
        <Typography variant="h6" color="text.secondary">
          🚀 Interactive graph visualization will be displayed here
        </Typography>
      </Box>
    </Paper>
  );
};

export default CRDDependencyGraphSimple;