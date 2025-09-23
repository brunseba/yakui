import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  useTheme,
  alpha,
  Chip,
  Stack
} from '@mui/material';
import {
  GridOn as CanvasIcon,
  AutoFixHigh as WizardIcon,
  ArrowForward as ArrowIcon
} from '@mui/icons-material';

export type CRDCreationMode = 'canvas' | 'wizard';

interface CRDModeSelectorProps {
  onModeSelect: (mode: CRDCreationMode) => void;
}

interface ModeOption {
  id: CRDCreationMode;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  color: string;
  phase: string;
}

export const CRDModeSelector: React.FC<CRDModeSelectorProps> = ({ onModeSelect }) => {
  const theme = useTheme();

  const modes: ModeOption[] = [
    {
      id: 'canvas',
      title: 'Canvas Composition',
      subtitle: 'Visual Grid-Based Designer',
      description: 'Build CRD relationships using an interactive canvas with drag-and-drop functionality',
      icon: <CanvasIcon sx={{ fontSize: 48 }} />,
      features: [
        'Interactive grid layout',
        'Drag and drop CRDs',
        'Visual relationship mapping',
        'Zoom and pan controls',
        'Auto-layout algorithms'
      ],
      color: theme.palette.info.main,
      phase: 'Phase 2'
    },
    {
      id: 'wizard',
      title: 'Wizard Creation',
      subtitle: 'Guided Step-by-Step Builder',
      description: 'Create CRDs through a structured wizard with templates, validation, and live preview',
      icon: <WizardIcon sx={{ fontSize: 48 }} />,
      features: [
        'Template-based creation',
        'Interactive schema editor',
        'Real-time preview',
        'Comprehensive validation',
        'Direct cluster deployment'
      ],
      color: theme.palette.primary.main,
      phase: 'Phase 3'
    }
  ];

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.50',
        p: 3
      }}
    >
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold', color: 'text.primary' }}>
          CRD Composer
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          Choose your preferred CRD creation experience
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Select between visual composition or guided wizard creation
        </Typography>
      </Box>

      {/* Mode Selection Cards */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} sx={{ maxWidth: 1000 }}>
        {modes.map((mode) => (
          <Card
            key={mode.id}
            sx={{
              minWidth: 400,
              minHeight: 500,
              position: 'relative',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              border: `2px solid transparent`,
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: theme.shadows[8],
                border: `2px solid ${alpha(mode.color, 0.3)}`
              }
            }}
            onClick={() => onModeSelect(mode.id)}
          >
            {/* Phase Badge */}
            <Chip
              label={mode.phase}
              size="small"
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                bgcolor: alpha(mode.color, 0.1),
                color: mode.color,
                fontWeight: 'bold'
              }}
            />

            <CardContent sx={{ p: 4, textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Icon */}
              <Box
                sx={{
                  mb: 3,
                  p: 2,
                  borderRadius: '50%',
                  bgcolor: alpha(mode.color, 0.1),
                  color: mode.color,
                  width: 80,
                  height: 80,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto'
                }}
              >
                {mode.icon}
              </Box>

              {/* Title & Subtitle */}
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: mode.color }}>
                {mode.title}
              </Typography>
              
              <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
                {mode.subtitle}
              </Typography>

              {/* Description */}
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4, flexGrow: 1 }}>
                {mode.description}
              </Typography>

              {/* Features */}
              <Box sx={{ textAlign: 'left', mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontSize: '1.1rem' }}>
                  Key Features:
                </Typography>
                <Stack spacing={1}>
                  {mode.features.map((feature, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: mode.color,
                          mr: 1.5,
                          flexShrink: 0
                        }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {feature}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </CardContent>

            {/* Action */}
            <CardActions sx={{ p: 4, pt: 0 }}>
              <Button
                variant="contained"
                fullWidth
                endIcon={<ArrowIcon />}
                sx={{
                  bgcolor: mode.color,
                  color: 'white',
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  '&:hover': {
                    bgcolor: mode.color,
                    filter: 'brightness(1.1)'
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onModeSelect(mode.id);
                }}
              >
                Start {mode.title}
              </Button>
            </CardActions>
          </Card>
        ))}
      </Stack>

      {/* Additional Information */}
      <Box sx={{ textAlign: 'center', mt: 6, maxWidth: 600 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Both modes support full CRD creation, validation, and deployment to Kubernetes clusters. 
          Choose based on your preferred workflow and experience level.
        </Typography>
      </Box>
    </Box>
  );
};