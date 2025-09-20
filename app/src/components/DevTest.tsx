import React from 'react';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';

const DevTest: React.FC = () => {
  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Kubernetes Admin UI - Development Mode
      </Typography>
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Application Status
          </Typography>
          <Typography variant="body1" paragraph>
            ✅ React App is running successfully
          </Typography>
          <Typography variant="body1" paragraph>
            ✅ Material-UI components are working
          </Typography>
          <Typography variant="body1" paragraph>
            ✅ Theming is applied correctly
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            This is a development test component. In production, you would see the
            login screen and then the full Kubernetes management interface.
          </Typography>
          <Button variant="contained" onClick={() => window.location.href = '/login'}>
            Go to Login
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DevTest;