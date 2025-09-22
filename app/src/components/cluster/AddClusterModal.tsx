import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Slide,
  useTheme,
  useMediaQuery,
  Alert,
  Snackbar,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';
import AddClusterForm from './AddClusterForm';
import { AddClusterRequest, ClusterConnection } from '../../types/cluster';
import { clusterService } from '../../services/clusterService';
import { useCluster } from '../../contexts/ClusterContext';

interface AddClusterModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (cluster: ClusterConnection) => void;
}

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const AddClusterModal: React.FC<AddClusterModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const { addCluster } = useCluster();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleClose = () => {
    if (loading) return; // Prevent closing while loading
    setError(null);
    setSuccessMessage(null);
    onClose();
  };

  const handleSubmit = async (request: AddClusterRequest) => {
    setLoading(true);
    setError(null);

    try {
      // Add cluster via service
      const newCluster = await clusterService.addCluster(request);
      
      // Add to context state
      addCluster(newCluster);
      
      // Show success message
      setSuccessMessage(`Cluster "${newCluster.config.displayName}" added successfully!`);
      
      // Call success callback
      if (onSuccess) {
        onSuccess(newCluster);
      }
      
      // Close modal after short delay to show success message
      setTimeout(() => {
        handleClose();
      }, 1500);
      
    } catch (err) {
      console.error('Failed to add cluster:', err);
      setError(err instanceof Error ? err.message : 'Failed to add cluster');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    handleClose();
  };

  const handleCloseSnackbar = () => {
    setSuccessMessage(null);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        TransitionComponent={Transition}
        fullScreen={fullScreen}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: fullScreen ? '100vh' : '80vh',
            maxHeight: fullScreen ? '100vh' : '90vh',
          },
        }}
        disableEscapeKeyDown={loading}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          Add New Cluster
          <IconButton
            aria-label="close"
            onClick={handleClose}
            disabled={loading}
            sx={{
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{
            p: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {error && (
            <Alert 
              severity="error" 
              sx={{ m: 2, mb: 0 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          <div style={{ 
            flex: 1, 
            overflow: 'auto', 
            padding: theme.spacing(2),
          }}>
            <AddClusterForm
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              onTestConnection={clusterService.testConnection.bind(clusterService)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default AddClusterModal;