import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Construction as ConstructionIcon,
  GitHub as GitHubIcon,
  Code as CodeIcon,
  Api as ApiIcon
} from '@mui/icons-material';

interface ComingSoonProps {
  feature: string;
  description?: string;
  requiredBackendEndpoints?: string[];
  requiredComponents?: string[];
  expectedRelease?: string;
}

const ComingSoon: React.FC<ComingSoonProps> = ({
  feature,
  description,
  requiredBackendEndpoints = [],
  requiredComponents = [],
  expectedRelease = "Next Release"
}) => {
  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <ScheduleIcon color="warning" sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" gutterBottom>
                {feature}
              </Typography>
              <Chip 
                icon={<ConstructionIcon />} 
                label="Under Development" 
                color="warning" 
                variant="outlined" 
              />
            </Box>
          </Box>

          {description && (
            <Alert severity="info" sx={{ mb: 3 }}>
              {description}
            </Alert>
          )}

          <Typography variant="h6" gutterBottom>
            Development Status:
          </Typography>

          {requiredBackendEndpoints.length > 0 && (
            <Box mb={3}>
              <Typography variant="subtitle1" gutterBottom>
                <ApiIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Required Backend Endpoints:
              </Typography>
              <List dense>
                {requiredBackendEndpoints.map((endpoint, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CodeIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={endpoint}
                      primaryTypographyProps={{ fontFamily: 'monospace' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {requiredComponents.length > 0 && (
            <Box mb={3}>
              <Typography variant="subtitle1" gutterBottom>
                <ConstructionIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Required Frontend Components:
              </Typography>
              <List dense>
                {requiredComponents.map((component, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CodeIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={component} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          <Box display="flex" justifyContent="space-between" alignItems="center" mt={4}>
            <Typography variant="body2" color="textSecondary">
              Expected: {expectedRelease}
            </Typography>
            
            <Button
              variant="outlined"
              startIcon={<GitHubIcon />}
              onClick={() => window.open('https://github.com', '_blank')}
            >
              Contribute
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ComingSoon;