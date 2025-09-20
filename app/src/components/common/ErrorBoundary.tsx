import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  BugReport as BugReportIcon
} from '@mui/icons-material';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error for monitoring
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In a real app, you would send this to your error tracking service
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // Example: Send to error tracking service
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errorId: this.state.errorId
    };

    console.log('Error logged:', errorData);
    // fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorData) });
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  handleReportBug = () => {
    const { error, errorInfo, errorId } = this.state;

    // Create a mailto link or open issue tracker
    const subject = encodeURIComponent(`Bug Report: ${error?.message || 'Unexpected Error'}`);
    const body = encodeURIComponent(`
Error ID: ${errorId}
Message: ${error?.message}
Time: ${new Date().toISOString()}
URL: ${window.location.href}

Stack Trace:
${error?.stack || 'Not available'}

Component Stack:
${errorInfo?.componentStack || 'Not available'}

Please describe what you were doing when this error occurred:
[Your description here]
    `);

    window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="50vh"
          p={3}
        >
          <Card sx={{ maxWidth: 600, width: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <ErrorIcon color="error" sx={{ mr: 1, fontSize: 32 }} />
                <Typography variant="h5" component="h2">
                  Oops! Something went wrong
                </Typography>
              </Box>

              <Alert severity="error" sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {this.state.error?.name || 'Application Error'}
                </Typography>
                <Typography variant="body2">
                  {this.state.error?.message || 'An unexpected error occurred while rendering this component.'}
                </Typography>
              </Alert>

              <Typography variant="body1" color="textSecondary" paragraph>
                Don't worry, this error has been logged and we'll investigate it. 
                You can try refreshing the page or contact support if the problem persists.
              </Typography>

              <Box display="flex" gap={2} mb={3}>
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleRetry}
                >
                  Try Again
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<BugReportIcon />}
                  onClick={this.handleReportBug}
                >
                  Report Bug
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </Button>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Technical Details (Error ID: {this.state.errorId})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Error Message:
                    </Typography>
                    <Box
                      component="pre"
                      sx={{
                        backgroundColor: 'grey.100',
                        p: 1,
                        borderRadius: 1,
                        mb: 2,
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {this.state.error?.message || 'No error message available'}
                    </Box>

                    <Typography variant="subtitle2" gutterBottom>
                      Stack Trace:
                    </Typography>
                    <Box
                      component="pre"
                      sx={{
                        backgroundColor: 'grey.100',
                        p: 1,
                        borderRadius: 1,
                        mb: 2,
                        overflow: 'auto',
                        maxHeight: 200,
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {this.state.error?.stack || 'No stack trace available'}
                    </Box>

                    {this.state.errorInfo?.componentStack && (
                      <>
                        <Typography variant="subtitle2" gutterBottom>
                          Component Stack:
                        </Typography>
                        <Box
                          component="pre"
                          sx={{
                            backgroundColor: 'grey.100',
                            p: 1,
                            borderRadius: 1,
                            overflow: 'auto',
                            maxHeight: 200,
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {this.state.errorInfo.componentStack}
                        </Box>
                      </>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;