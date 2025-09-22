/**
 * Multicluster Integration Test Component
 * 
 * This component provides comprehensive testing for the integrated
 * multicluster management and backend authentication system.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Grid,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  PlayArrow as PlayArrowIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useCluster } from '../../contexts/ClusterContext';
import { backendClusterService } from '../../services/backendClusterService';
import { clusterAwareApiService } from '../../services/clusterAwareApiService';

interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'warning' | 'error';
  message: string;
  details?: any;
  duration?: number;
  timestamp?: Date;
}

interface TestSuite {
  id: string;
  name: string;
  description: string;
  tests: TestResult[];
  overallStatus: 'pending' | 'running' | 'success' | 'warning' | 'error';
}

const MulticlusterIntegrationTest: React.FC = () => {
  const { clusters, currentCluster, switchCluster } = useCluster();
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<string>('');

  // Initialize test suites
  useEffect(() => {
    initializeTestSuites();
  }, []);

  const initializeTestSuites = () => {
    const suites: TestSuite[] = [
      {
        id: 'backend-auth',
        name: 'Backend Authentication',
        description: 'Test backend cluster authentication and context switching',
        overallStatus: 'pending',
        tests: [
          { id: 'backend-current', name: 'Get Current Backend Cluster', status: 'pending', message: 'Not started' },
          { id: 'backend-switch', name: 'Switch Backend Cluster', status: 'pending', message: 'Not started' },
          { id: 'backend-test', name: 'Test Cluster Connectivity', status: 'pending', message: 'Not started' },
          { id: 'backend-info', name: 'Verify Cluster Information', status: 'pending', message: 'Not started' },
        ]
      },
      {
        id: 'frontend-integration',
        name: 'Frontend Integration',
        description: 'Test frontend cluster context integration with backend',
        overallStatus: 'pending',
        tests: [
          { id: 'frontend-load', name: 'Load Clusters from Service', status: 'pending', message: 'Not started' },
          { id: 'frontend-switch', name: 'Frontend Cluster Switch', status: 'pending', message: 'Not started' },
          { id: 'frontend-sync', name: 'Backend-Frontend Sync', status: 'pending', message: 'Not started' },
          { id: 'frontend-events', name: 'Cluster Switch Events', status: 'pending', message: 'Not started' },
        ]
      },
      {
        id: 'api-routing',
        name: 'API Routing',
        description: 'Test cluster-aware API routing through backend',
        overallStatus: 'pending',
        tests: [
          { id: 'api-cluster-check', name: 'Cluster Context Verification', status: 'pending', message: 'Not started' },
          { id: 'api-resources', name: 'Kubernetes API Resources', status: 'pending', message: 'Not started' },
          { id: 'api-namespaces', name: 'Get Namespaces', status: 'pending', message: 'Not started' },
          { id: 'api-nodes', name: 'Get Nodes', status: 'pending', message: 'Not started' },
        ]
      },
      {
        id: 'multicluster-workflow',
        name: 'Multicluster Workflow',
        description: 'Test end-to-end multicluster management workflow',
        overallStatus: 'pending',
        tests: [
          { id: 'workflow-multiple', name: 'Multiple Cluster Access', status: 'pending', message: 'Not started' },
          { id: 'workflow-switching', name: 'Cross-Cluster Switching', status: 'pending', message: 'Not started' },
          { id: 'workflow-isolation', name: 'Cluster Context Isolation', status: 'pending', message: 'Not started' },
          { id: 'workflow-persistence', name: 'State Persistence', status: 'pending', message: 'Not started' },
        ]
      }
    ];

    setTestSuites(suites);
  };

  const updateTestResult = (suiteId: string, testId: string, updates: Partial<TestResult>) => {
    setTestSuites(prev => prev.map(suite => {
      if (suite.id !== suiteId) return suite;

      const updatedTests = suite.tests.map(test => 
        test.id === testId 
          ? { ...test, ...updates, timestamp: new Date() }
          : test
      );

      // Update overall status
      const hasError = updatedTests.some(t => t.status === 'error');
      const hasWarning = updatedTests.some(t => t.status === 'warning');
      const hasRunning = updatedTests.some(t => t.status === 'running');
      const allSuccess = updatedTests.every(t => t.status === 'success');

      let overallStatus: TestSuite['overallStatus'] = 'pending';
      if (hasError) overallStatus = 'error';
      else if (hasWarning) overallStatus = 'warning';
      else if (hasRunning) overallStatus = 'running';
      else if (allSuccess) overallStatus = 'success';

      return { ...suite, tests: updatedTests, overallStatus };
    }));
  };

  const runBackendAuthTests = async (suiteId: string) => {
    const tests = testSuites.find(s => s.id === suiteId)?.tests || [];

    for (const test of tests) {
      updateTestResult(suiteId, test.id, { status: 'running', message: 'Running...' });
      const startTime = Date.now();

      try {
        switch (test.id) {
          case 'backend-current': {
            const result = await backendClusterService.getCurrentBackendCluster();
            updateTestResult(suiteId, test.id, {
              status: result.success ? 'success' : 'warning',
              message: result.success 
                ? `Current: ${result.context || result.server}` 
                : result.error || 'No current cluster',
              details: result,
              duration: Date.now() - startTime
            });
            break;
          }

          case 'backend-switch': {
            if (clusters.length === 0) {
              updateTestResult(suiteId, test.id, {
                status: 'warning',
                message: 'No clusters available for switching',
                duration: Date.now() - startTime
              });
              break;
            }

            const targetCluster = clusters[0];
            const result = await backendClusterService.switchBackendCluster(targetCluster.config.id);
            updateTestResult(suiteId, test.id, {
              status: result.success ? 'success' : 'error',
              message: result.success 
                ? `Switched to ${targetCluster.config.name}` 
                : result.error || 'Switch failed',
              details: result,
              duration: Date.now() - startTime
            });
            break;
          }

          case 'backend-test': {
            if (clusters.length === 0) {
              updateTestResult(suiteId, test.id, {
                status: 'warning',
                message: 'No clusters available for testing',
                duration: Date.now() - startTime
              });
              break;
            }

            const targetCluster = clusters[0];
            const result = await backendClusterService.testClusterConnectivity(targetCluster);
            updateTestResult(suiteId, test.id, {
              status: result.success ? 'success' : 'error',
              message: result.success 
                ? `Connected to ${result.context}` 
                : result.error || 'Connectivity test failed',
              details: result,
              duration: Date.now() - startTime
            });
            break;
          }

          case 'backend-info': {
            const current = await backendClusterService.getCurrentBackendCluster();
            if (current.success) {
              updateTestResult(suiteId, test.id, {
                status: 'success',
                message: `Verified: ${current.nodes} nodes, ${current.namespaces} namespaces`,
                details: current,
                duration: Date.now() - startTime
              });
            } else {
              updateTestResult(suiteId, test.id, {
                status: 'error',
                message: current.error || 'Failed to get cluster info',
                duration: Date.now() - startTime
              });
            }
            break;
          }
        }
      } catch (error) {
        updateTestResult(suiteId, test.id, {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - startTime
        });
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const runFrontendIntegrationTests = async (suiteId: string) => {
    const tests = testSuites.find(s => s.id === suiteId)?.tests || [];

    for (const test of tests) {
      updateTestResult(suiteId, test.id, { status: 'running', message: 'Running...' });
      const startTime = Date.now();

      try {
        switch (test.id) {
          case 'frontend-load': {
            const loadedClusters = await backendClusterService.getClusters();
            updateTestResult(suiteId, test.id, {
              status: 'success',
              message: `Loaded ${loadedClusters.length} clusters`,
              details: { count: loadedClusters.length },
              duration: Date.now() - startTime
            });
            break;
          }

          case 'frontend-switch': {
            if (clusters.length < 2) {
              updateTestResult(suiteId, test.id, {
                status: 'warning',
                message: 'Need at least 2 clusters for switch test',
                duration: Date.now() - startTime
              });
              break;
            }

            const currentId = currentCluster?.config.id;
            const targetCluster = clusters.find(c => c.config.id !== currentId) || clusters[0];
            
            await switchCluster(targetCluster.config.id);
            updateTestResult(suiteId, test.id, {
              status: 'success',
              message: `Switched from ${currentId} to ${targetCluster.config.id}`,
              duration: Date.now() - startTime
            });
            break;
          }

          case 'frontend-sync': {
            const backendCurrent = await backendClusterService.getCurrentBackendCluster();
            const frontendCurrentId = currentCluster?.config.id;
            const backendActiveId = backendClusterService.getActiveClusterId();

            const synced = frontendCurrentId === backendActiveId;
            updateTestResult(suiteId, test.id, {
              status: synced ? 'success' : 'warning',
              message: synced 
                ? 'Frontend and backend are synchronized' 
                : `Sync mismatch: frontend=${frontendCurrentId}, backend=${backendActiveId}`,
              details: { frontendCurrentId, backendActiveId },
              duration: Date.now() - startTime
            });
            break;
          }

          case 'frontend-events': {
            // Test event emission (this is more of a verification that events are working)
            let eventReceived = false;
            
            const eventListener = () => {
              eventReceived = true;
            };

            window.addEventListener('clusterSwitch', eventListener);
            
            // Trigger a switch if possible
            if (clusters.length > 0) {
              await switchCluster(currentCluster?.config.id || clusters[0].config.id);
            }

            setTimeout(() => {
              window.removeEventListener('clusterSwitch', eventListener);
              updateTestResult(suiteId, test.id, {
                status: eventReceived ? 'success' : 'warning',
                message: eventReceived 
                  ? 'Cluster switch events working' 
                  : 'No cluster switch events detected',
                duration: Date.now() - startTime
              });
            }, 1000);
            break;
          }
        }
      } catch (error) {
        updateTestResult(suiteId, test.id, {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - startTime
        });
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const runApiRoutingTests = async (suiteId: string) => {
    const tests = testSuites.find(s => s.id === suiteId)?.tests || [];

    for (const test of tests) {
      updateTestResult(suiteId, test.id, { status: 'running', message: 'Running...' });
      const startTime = Date.now();

      try {
        switch (test.id) {
          case 'api-cluster-check': {
            const result = await clusterAwareApiService.healthCheck();
            updateTestResult(suiteId, test.id, {
              status: result.success ? 'success' : 'warning',
              message: result.success ? 'API service healthy' : 'Health check failed',
              details: result,
              duration: Date.now() - startTime
            });
            break;
          }

          case 'api-resources': {
            const result = await clusterAwareApiService.getClusterInfo();
            updateTestResult(suiteId, test.id, {
              status: result.success ? 'success' : 'error',
              message: result.success 
                ? 'Successfully accessed cluster API' 
                : result.error || 'API access failed',
              details: result,
              duration: Date.now() - startTime
            });
            break;
          }

          case 'api-namespaces': {
            const result = await clusterAwareApiService.getNamespaces();
            const namespaceCount = result.data?.items?.length || 0;
            updateTestResult(suiteId, test.id, {
              status: result.success ? 'success' : 'error',
              message: result.success 
                ? `Found ${namespaceCount} namespaces` 
                : result.error || 'Failed to get namespaces',
              details: result,
              duration: Date.now() - startTime
            });
            break;
          }

          case 'api-nodes': {
            const result = await clusterAwareApiService.getNodes();
            const nodeCount = result.data?.items?.length || 0;
            updateTestResult(suiteId, test.id, {
              status: result.success ? 'success' : 'error',
              message: result.success 
                ? `Found ${nodeCount} nodes` 
                : result.error || 'Failed to get nodes',
              details: result,
              duration: Date.now() - startTime
            });
            break;
          }
        }
      } catch (error) {
        updateTestResult(suiteId, test.id, {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - startTime
        });
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const runMulticlusterWorkflowTests = async (suiteId: string) => {
    const tests = testSuites.find(s => s.id === suiteId)?.tests || [];

    for (const test of tests) {
      updateTestResult(suiteId, test.id, { status: 'running', message: 'Running...' });
      const startTime = Date.now();

      try {
        switch (test.id) {
          case 'workflow-multiple': {
            const clusterCount = clusters.length;
            updateTestResult(suiteId, test.id, {
              status: clusterCount > 1 ? 'success' : 'warning',
              message: clusterCount > 1 
                ? `${clusterCount} clusters available` 
                : `Only ${clusterCount} cluster(s) available`,
              details: { clusterCount },
              duration: Date.now() - startTime
            });
            break;
          }

          case 'workflow-switching': {
            if (clusters.length < 2) {
              updateTestResult(suiteId, test.id, {
                status: 'warning',
                message: 'Need multiple clusters for switching test',
                duration: Date.now() - startTime
              });
              break;
            }

            let switchCount = 0;
            const originalCluster = currentCluster;
            
            // Try switching between clusters
            for (const cluster of clusters.slice(0, Math.min(3, clusters.length))) {
              await switchCluster(cluster.config.id);
              const backendCurrent = await backendClusterService.getCurrentBackendCluster();
              if (backendCurrent.success) {
                switchCount++;
              }
              await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Switch back to original
            if (originalCluster) {
              await switchCluster(originalCluster.config.id);
            }

            updateTestResult(suiteId, test.id, {
              status: switchCount > 1 ? 'success' : 'warning',
              message: `Successfully switched between ${switchCount} clusters`,
              details: { switchCount },
              duration: Date.now() - startTime
            });
            break;
          }

          case 'workflow-isolation': {
            // Test that API calls are properly isolated by cluster context
            if (clusters.length < 2) {
              updateTestResult(suiteId, test.id, {
                status: 'warning',
                message: 'Need multiple clusters for isolation test',
                duration: Date.now() - startTime
              });
              break;
            }

            const results: any[] = [];
            
            for (const cluster of clusters.slice(0, 2)) {
              await switchCluster(cluster.config.id);
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              const namespacesResult = await clusterAwareApiService.getNamespaces();
              results.push({
                clusterId: cluster.config.id,
                namespaces: namespacesResult.data?.items?.length || 0,
                success: namespacesResult.success
              });
            }

            const differentResults = results.length > 1 && results[0].namespaces !== results[1].namespaces;
            updateTestResult(suiteId, test.id, {
              status: differentResults ? 'success' : 'warning',
              message: differentResults 
                ? 'Cluster contexts properly isolated' 
                : 'Context isolation unclear (same results)',
              details: results,
              duration: Date.now() - startTime
            });
            break;
          }

          case 'workflow-persistence': {
            // Test that cluster selections persist
            const originalCluster = currentCluster?.config.id;
            const persistenceData = localStorage.getItem('kubernetes-clusters');
            
            updateTestResult(suiteId, test.id, {
              status: persistenceData ? 'success' : 'warning',
              message: persistenceData 
                ? 'Cluster data persisted in localStorage' 
                : 'No persistence data found',
              details: { originalCluster, hasPersistence: !!persistenceData },
              duration: Date.now() - startTime
            });
            break;
          }
        }
      } catch (error) {
        updateTestResult(suiteId, test.id, {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - startTime
        });
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const runTestSuite = async (suiteId: string) => {
    switch (suiteId) {
      case 'backend-auth':
        await runBackendAuthTests(suiteId);
        break;
      case 'frontend-integration':
        await runFrontendIntegrationTests(suiteId);
        break;
      case 'api-routing':
        await runApiRoutingTests(suiteId);
        break;
      case 'multicluster-workflow':
        await runMulticlusterWorkflowTests(suiteId);
        break;
    }
  };

  const runAllTests = async () => {
    setIsRunningTests(true);
    
    for (const suite of testSuites) {
      setExpandedPanel(suite.id);
      await runTestSuite(suite.id);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setIsRunningTests(false);
  };

  const resetTests = () => {
    initializeTestSuites();
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'running':
        return <CircularProgress size={20} />;
      default:
        return <InfoIcon color="action" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'running': return 'primary';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Multicluster Integration Testing
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        This component tests the integration between backend authentication, 
        frontend cluster management, and API routing in the multicluster system.
      </Alert>

      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          onClick={runAllTests}
          disabled={isRunningTests}
          startIcon={isRunningTests ? <CircularProgress size={16} /> : <PlayArrowIcon />}
        >
          {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
        </Button>
        
        <Button
          variant="outlined"
          onClick={resetTests}
          disabled={isRunningTests}
          startIcon={<RefreshIcon />}
        >
          Reset Tests
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {testSuites.map((suite) => (
            <Accordion
              key={suite.id}
              expanded={expandedPanel === suite.id}
              onChange={(_, expanded) => setExpandedPanel(expanded ? suite.id : '')}
              sx={{ mb: 2 }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  {getStatusIcon(suite.overallStatus)}
                  <Typography variant="h6">{suite.name}</Typography>
                  <Chip 
                    label={suite.overallStatus}
                    color={getStatusColor(suite.overallStatus) as any}
                    size="small"
                    sx={{ ml: 'auto' }}
                  />
                </Box>
              </AccordionSummary>
              
              <AccordionDetails>
                <Typography color="text.secondary" paragraph>
                  {suite.description}
                </Typography>
                
                <List>
                  {suite.tests.map((test) => (
                    <ListItem key={test.id} divider>
                      <ListItemIcon>
                        {getStatusIcon(test.status)}
                      </ListItemIcon>
                      
                      <ListItemText
                        primary={test.name}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {test.message}
                            </Typography>
                            {test.duration && (
                              <Typography variant="caption" color="text.secondary">
                                Duration: {test.duration}ms
                              </Typography>
                            )}
                            {test.timestamp && (
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                                {test.timestamp.toLocaleTimeString()}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>

                <Button
                  size="small"
                  onClick={() => runTestSuite(suite.id)}
                  disabled={isRunningTests}
                  sx={{ mt: 2 }}
                >
                  Run This Suite
                </Button>
              </AccordionDetails>
            </Accordion>
          ))}
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Summary
              </Typography>
              
              {testSuites.map((suite) => (
                <Box key={suite.id} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2">{suite.name}</Typography>
                    <Chip 
                      label={suite.overallStatus}
                      color={getStatusColor(suite.overallStatus) as any}
                      size="small"
                    />
                  </Box>
                  
                  <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {['success', 'error', 'warning', 'running', 'pending'].map((status) => {
                      const count = suite.tests.filter(t => t.status === status).length;
                      return count > 0 ? (
                        <Chip
                          key={status}
                          label={`${count} ${status}`}
                          size="small"
                          color={getStatusColor(status as any) as any}
                          variant="outlined"
                        />
                      ) : null;
                    })}
                  </Box>
                  
                  {suite.id !== testSuites[testSuites.length - 1].id && (
                    <Divider sx={{ mt: 2 }} />
                  )}
                </Box>
              ))}

              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Current Cluster State
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Frontend: {currentCluster?.config.name || 'None'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Backend: {backendClusterService.getActiveClusterId() || 'None'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Available: {clusters.length} clusters
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MulticlusterIntegrationTest;