import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Help as HelpIcon,
  Close as CloseIcon,
  Circle as CircleIcon,
  Star as StarIcon,
  ArrowForward as ArrowForwardIcon,
  AccountTree as AccountTreeIcon,
  Security as SecurityIcon,
  Visibility as VisibilityIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';

interface CRDGraphHelpProps {
  open: boolean;
  onClose: () => void;
}

export const CRDGraphHelp: React.FC<CRDGraphHelpProps> = ({ open, onClose }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HelpIcon color="primary" />
          <Typography variant="h5" component="span">
            CRD-to-CRD Graph Guide
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" paragraph>
            This guide explains how to interpret the CRD-to-CRD relationship graph and its visual indicators.
          </Typography>
        </Box>

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ArrowForwardIcon color="primary" />
              Edge Colors & Dependency Severity
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              <ListItem>
                <ListItemIcon>
                  <CircleIcon sx={{ color: '#f44336' }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" fontWeight="bold">🔴 High Severity (Red)</Typography>
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" paragraph>
                        <strong>Critical dependencies</strong> that are essential for the system to function.
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Examples:</strong>
                      </Typography>
                      <List dense sx={{ pl: 2 }}>
                        <ListItem sx={{ py: 0 }}>
                          <Typography variant="caption">• Application CRD must reference AppProject CRD</Typography>
                        </ListItem>
                        <ListItem sx={{ py: 0 }}>
                          <Typography variant="caption">• Deployment requires ServiceAccount reference</Typography>
                        </ListItem>
                      </List>
                      <Typography variant="body2" color="error" fontWeight="bold">
                        ⚠️ Breaking these relationships would cause system failures
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
              <Divider />

              <ListItem>
                <ListItemIcon>
                  <CircleIcon sx={{ color: '#ff9800' }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body1" fontWeight="bold">🟡 Medium Severity (Orange)</Typography>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" paragraph>
                        <strong>Important but not critical</strong> dependencies. System could potentially function without them.
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Examples:</strong>
                      </Typography>
                      <List dense sx={{ pl: 2 }}>
                        <ListItem sx={{ py: 0 }}>
                          <Typography variant="caption">• Service references ConfigMap for configuration</Typography>
                        </ListItem>
                        <ListItem sx={{ py: 0 }}>
                          <Typography variant="caption">• Ingress depends on Certificate for TLS</Typography>
                        </ListItem>
                      </List>
                      <Typography variant="body2" color="warning.main" fontWeight="bold">
                        ⚠️ Breaking these might cause degraded functionality
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
              <Divider />

              <ListItem>
                <ListItemIcon>
                  <CircleIcon sx={{ color: '#2196f3' }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body1" fontWeight="bold">🔵 Low Severity (Blue)</Typography>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" paragraph>
                        <strong>Optional or weak</strong> dependencies with minimal impact.
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Examples:</strong>
                      </Typography>
                      <List dense sx={{ pl: 2 }}>
                        <ListItem sx={{ py: 0 }}>
                          <Typography variant="caption">• Metadata or labeling references</Typography>
                        </ListItem>
                        <ListItem sx={{ py: 0 }}>
                          <Typography variant="caption">• Optional feature integrations</Typography>
                        </ListItem>
                      </List>
                      <Typography variant="body2" color="info.main">
                        ℹ️ Breaking these would have minimal impact
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            </List>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StarIcon color="primary" />
              Node Indicators
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              <ListItem>
                <ListItemIcon>
                  <StarIcon sx={{ color: '#f44336' }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body1" fontWeight="bold">⭐ High Centrality Nodes</Typography>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" paragraph>
                        <strong>"Hub nodes"</strong> in the dependency network with many incoming and outgoing relationships.
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Examples:</strong>
                      </Typography>
                      <List dense sx={{ pl: 2 }}>
                        <ListItem sx={{ py: 0 }}>
                          <Typography variant="caption">• ServiceAccount CRDs (many resources depend on them)</Typography>
                        </ListItem>
                        <ListItem sx={{ py: 0 }}>
                          <Typography variant="caption">• Core platform CRDs referenced by applications</Typography>
                        </ListItem>
                      </List>
                      <Typography variant="body2" color="error.main" fontWeight="bold">
                        🎯 Critical architecture components - changes affect many other CRDs
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            </List>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <VisibilityIcon color="primary" />
              Selection Highlighting
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph sx={{ mb: 2 }}>
              Click on any CRD node to highlight its relationships:
            </Typography>
            
            <List>
              <ListItem>
                <ListItemIcon>
                  <CircleIcon sx={{ color: '#4caf50' }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body1" fontWeight="bold">🟢 Sources (Green nodes)</Typography>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" paragraph>
                        CRDs that <strong>depend ON</strong> the selected CRD.
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Relationship:</strong> Source CRD → Selected CRD
                      </Typography>
                      <Card variant="outlined" sx={{ mt: 1, p: 1, backgroundColor: 'action.hover' }}>
                        <Typography variant="caption" fontStyle="italic">
                          <strong>Example:</strong> If you select "AppProject", all "Application" CRDs that reference it turn green.
                        </Typography>
                      </Card>
                      <Typography variant="body2" color="success.main" fontWeight="bold" sx={{ mt: 1 }}>
                        💡 "These CRDs would be affected if the selected CRD changes"
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
              <Divider />

              <ListItem>
                <ListItemIcon>
                  <CircleIcon sx={{ color: '#ff9800' }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body1" fontWeight="bold">🟡 Targets (Yellow nodes)</Typography>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" paragraph>
                        CRDs that the selected CRD <strong>depends ON</strong>.
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Relationship:</strong> Selected CRD → Target CRD
                      </Typography>
                      <Card variant="outlined" sx={{ mt: 1, p: 1, backgroundColor: 'action.hover' }}>
                        <Typography variant="caption" fontStyle="italic">
                          <strong>Example:</strong> If you select "Application", any "AppProject" it references turns yellow.
                        </Typography>
                      </Card>
                      <Typography variant="body2" color="warning.main" fontWeight="bold" sx={{ mt: 1 }}>
                        💡 "The selected CRD needs these CRDs to function"
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            </List>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUpIcon color="primary" />
              Practical Use Cases
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon color="error" />
                </ListItemIcon>
                <ListItemText
                  primary="Impact Analysis"
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" paragraph>
                        <strong>Question:</strong> "If I modify CRD 'X', what else will be affected?"
                      </Typography>
                      <Chip label="Solution: Select node X, look for green nodes (sources)" size="small" color="success" />
                    </Box>
                  }
                />
              </ListItem>
              <Divider />

              <ListItem>
                <ListItemIcon>
                  <AccountTreeIcon color="info" />
                </ListItemIcon>
                <ListItemText
                  primary="Dependency Tracking"
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" paragraph>
                        <strong>Question:</strong> "What does CRD 'Y' need to work properly?"
                      </Typography>
                      <Chip label="Solution: Select node Y, look for yellow nodes (targets)" size="small" color="warning" />
                    </Box>
                  }
                />
              </ListItem>
              <Divider />

              <ListItem>
                <ListItemIcon>
                  <StarIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Architecture Understanding"
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" paragraph>
                        <strong>Question:</strong> "Which CRDs are most central to my system?"
                      </Typography>
                      <Chip label="Solution: Look for nodes with ⭐ (high centrality)" size="small" color="primary" />
                    </Box>
                  }
                />
              </ListItem>
              <Divider />

              <ListItem>
                <ListItemIcon>
                  <CircleIcon sx={{ color: '#f44336' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Risk Assessment"
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" paragraph>
                        <strong>Question:</strong> "Which relationships are most critical?"
                      </Typography>
                      <Chip label="Solution: Focus on red edges (high severity)" size="small" color="error" />
                    </Box>
                  }
                />
              </ListItem>
            </List>
          </AccordionDetails>
        </Accordion>

        <Box sx={{ mt: 3, p: 2, backgroundColor: 'primary.main', color: 'primary.contrastText', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HelpIcon />
            Quick Start Tips
          </Typography>
          <List dense>
            <ListItem sx={{ py: 0, color: 'inherit' }}>
              <Typography variant="body2">1. <strong>Start by examining star nodes (⭐)</strong> - these are your system's architectural foundations</Typography>
            </ListItem>
            <ListItem sx={{ py: 0, color: 'inherit' }}>
              <Typography variant="body2">2. <strong>Click any node</strong> to see its immediate relationships highlighted</Typography>
            </ListItem>
            <ListItem sx={{ py: 0, color: 'inherit' }}>
              <Typography variant="body2">3. <strong>Focus on red edges first</strong> - these represent your most critical dependencies</Typography>
            </ListItem>
            <ListItem sx={{ py: 0, color: 'inherit' }}>
              <Typography variant="body2">4. <strong>Use filters</strong> to reduce complexity and focus on specific relationships</Typography>
            </ListItem>
          </List>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained" color="primary">
          Got it!
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Help button component that can be placed in the graph toolbar
export const CRDGraphHelpButton: React.FC = () => {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <Tooltip title="Show graph legend and help">
        <IconButton
          onClick={() => setHelpOpen(true)}
          size="small"
          sx={{
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': {
              backgroundColor: 'primary.dark',
            },
          }}
        >
          <HelpIcon />
        </IconButton>
      </Tooltip>
      
      <CRDGraphHelp
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </>
  );
};

export default CRDGraphHelp;