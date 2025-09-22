import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Collapse,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Clear as ClearIcon,
  GetApp as DownloadIcon,
} from '@mui/icons-material';

export interface ConnectionLogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  step: string;
  message: string;
  details?: any;
  duration?: number;
}

interface ConnectionLogViewerProps {
  logs: ConnectionLogEntry[];
  isVisible?: boolean;
  onClear?: () => void;
  onDownload?: () => void;
  maxHeight?: number;
}

const ConnectionLogViewer: React.FC<ConnectionLogViewerProps> = ({
  logs,
  isVisible = true,
  onClear,
  onDownload,
  maxHeight = 300,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const getLogIcon = (level: ConnectionLogEntry['level']) => {
    switch (level) {
      case 'success':
        return <SuccessIcon color="success" fontSize="small" />;
      case 'error':
        return <ErrorIcon color="error" fontSize="small" />;
      case 'warning':
        return <WarningIcon color="warning" fontSize="small" />;
      case 'info':
      default:
        return <InfoIcon color="info" fontSize="small" />;
    }
  };

  const getLogColor = (level: ConnectionLogEntry['level']) => {
    switch (level) {
      case 'success':
        return 'success.main';
      case 'error':
        return 'error.main';
      case 'warning':
        return 'warning.main';
      case 'info':
      default:
        return 'info.main';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  const handleDownload = () => {
    const logText = logs
      .map((log) => 
        `[${formatTimestamp(log.timestamp)}] ${log.level.toUpperCase()}: ${log.step} - ${log.message}${
          log.details ? `\nDetails: ${JSON.stringify(log.details, null, 2)}` : ''
        }${log.duration ? `\nDuration: ${log.duration}ms` : ''}`
      )
      .join('\n\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `connection-test-logs-${new Date().toISOString().slice(0, 19)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (onDownload) {
      onDownload();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        mt: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Header */}
      <Box 
        display="flex" 
        alignItems="center" 
        justifyContent="space-between" 
        p={2}
        sx={{ 
          backgroundColor: 'grey.50',
          borderBottom: expanded ? '1px solid' : 'none',
          borderColor: 'divider',
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton 
            size="small" 
            onClick={() => setExpanded(!expanded)}
            sx={{ p: 0.5 }}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
          
          <Typography variant="subtitle2" fontWeight="medium">
            Connection Test Logs
          </Typography>
          
          {logs.length > 0 && (
            <Chip 
              size="small" 
              label={`${logs.length} entries`} 
              color="default"
              variant="outlined"
            />
          )}
        </Box>

        <Box display="flex" alignItems="center" gap={1}>
          {logs.length > 0 && (
            <>
              <Button
                size="small"
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
                variant="outlined"
                sx={{ minWidth: 'auto', px: 1.5 }}
              >
                Export
              </Button>
              
              {onClear && (
                <IconButton 
                  size="small" 
                  onClick={onClear}
                  title="Clear logs"
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* Log Content */}
      <Collapse in={expanded}>
        <Box
          ref={logContainerRef}
          sx={{
            maxHeight,
            overflowY: 'auto',
            backgroundColor: '#fafafa',
          }}
        >
          {logs.length === 0 ? (
            <Box 
              display="flex" 
              alignItems="center" 
              justifyContent="center" 
              py={4}
            >
              <Typography variant="body2" color="text.secondary">
                No connection test logs yet. Click "Test Connection" to see detailed logs.
              </Typography>
            </Box>
          ) : (
            <List dense sx={{ py: 0 }}>
              {logs.map((log, index) => (
                <React.Fragment key={log.id}>
                  <ListItem
                    sx={{
                      py: 1,
                      px: 2,
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {getLogIcon(log.level)}
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography 
                            variant="body2" 
                            component="span"
                            fontWeight="medium"
                            sx={{ color: getLogColor(log.level) }}
                          >
                            {log.step}
                          </Typography>
                          
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            component="span"
                          >
                            {formatTimestamp(log.timestamp)}
                          </Typography>
                          
                          {log.duration && (
                            <Chip 
                              size="small"
                              label={`${log.duration}ms`}
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="body2" component="div">
                            {log.message}
                          </Typography>
                          
                          {log.details && (
                            <Box
                              component="pre"
                              sx={{
                                mt: 1,
                                p: 1,
                                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                                borderRadius: 1,
                                fontSize: '0.75rem',
                                fontFamily: 'monospace',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                maxWidth: '100%',
                                overflow: 'auto',
                              }}
                            >
                              {typeof log.details === 'string' 
                                ? log.details 
                                : JSON.stringify(log.details, null, 2)}
                            </Box>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  
                  {index < logs.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </Collapse>
      
      {/* Auto-scroll toggle (only show when there are logs and expanded) */}
      {logs.length > 0 && expanded && (
        <Box 
          sx={{ 
            p: 1, 
            borderTop: '1px solid', 
            borderColor: 'divider',
            backgroundColor: 'grey.50',
          }}
        >
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ cursor: 'pointer' }}
            onClick={() => setAutoScroll(!autoScroll)}
          >
            {autoScroll ? '🔄 Auto-scroll enabled' : '⏸️ Auto-scroll disabled'}
            <Typography component="span" sx={{ ml: 1, opacity: 0.6 }}>
              (click to toggle)
            </Typography>
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default ConnectionLogViewer;