import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Toolbar,
  Tooltip
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  AccountTree as ComposerIcon
} from '@mui/icons-material';
import { CRDBuilder } from './CRDBuilder';
import { CRDCanvasComposer } from './CRDCanvasComposer';
import { CRDModeSelector, CRDCreationMode } from './CRDModeSelector';
import { ComposerCRD } from './types/composer';

interface CRDComposerProps {
  // Optional props for customization
  initialCRDs?: ComposerCRD[];
  readOnly?: boolean;
}

export const CRDComposer: React.FC<CRDComposerProps> = ({
  initialCRDs = [],
  readOnly = false
}) => {
  const [selectedMode, setSelectedMode] = useState<CRDCreationMode | null>(null);

  console.log(`[CRD Composer] Current mode: ${selectedMode || 'mode-selection'}`);

  // Handle mode selection
  const handleModeSelect = (mode: CRDCreationMode) => {
    console.log(`[CRD Composer] Selected mode: ${mode}`);
    setSelectedMode(mode);
  };

  // Handle back to mode selection
  const handleBack = () => {
    setSelectedMode(null);
  };

  // Mode Selection View
  if (!selectedMode) {
    return <CRDModeSelector onModeSelect={handleModeSelect} />;
  }

  // Canvas Mode (Phase 2)
  if (selectedMode === 'canvas') {
    return (
      <CRDCanvasComposer 
        initialCRDs={initialCRDs}
        readOnly={readOnly}
        onBack={handleBack}
      />
    );
  }

  // Wizard Mode (Phase 3)
  if (selectedMode === 'wizard') {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Paper elevation={1} sx={{ zIndex: 1 }}>
          <Toolbar>
            <Tooltip title="Back to Mode Selection">
              <IconButton onClick={handleBack} sx={{ mr: 1 }}>
                <BackIcon />
              </IconButton>
            </Tooltip>
            <ComposerIcon sx={{ mr: 2 }} color="primary" />
            <Typography variant="h6" sx={{ flex: 1 }}>
              CRD Wizard Builder
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
              ✨ Phase 3: Advanced UI Features
            </Typography>
          </Toolbar>
        </Paper>

        {/* CRD Builder */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          <CRDBuilder />
        </Box>
      </Box>
    );
  }

  return null;
};
