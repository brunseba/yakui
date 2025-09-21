# Namespace Mocking Removal from Workload/Dependencies

This document outlines the changes made to remove hardcoded namespace values from the workload/dependencies functionality, ensuring the system works with actual Kubernetes cluster data instead of mock namespaces.

## Summary of Changes

The dependency and workload components have been updated to remove all hardcoded namespace values and integrate properly with the actual Kubernetes cluster.

## Files Modified

### 1. `app/src/components/dependencies/ResourceDependencyGraph.tsx`

**Before:**
- Contained hardcoded mock data with `namespace: 'demo'` and `@default` namespaces
- Showed mock dependency graph with hardcoded resource names in development mode

**After:**
- Removed all mock dependency data
- Errors now show without fallback to mock data
- Dependencies must come from actual cluster via backend API

**Key Changes:**
```typescript
// REMOVED: Hardcoded mock graph with demo namespaces
// For demo purposes, set some mock data if in development
if (import.meta.env.DEV) {
  const mockGraph: DependencyGraph = {
    metadata: { namespace: 'demo', ... },
    nodes: [
      { id: 'Pod/webapp@default', namespace: 'default', ... }
    ],
    ...
  };
}

// REPLACED WITH: Simple error logging
// Show error without mock data - dependencies should come from actual cluster
console.warn('Dependency graph service unavailable:', errorMessage);
```

### 2. `app/src/components/dependencies/DependencyBrowser.tsx`

**Before:**
- Hardcoded namespace list: `['default', 'kube-system', 'kube-public', 'kube-node-lease']`
- Static namespace dropdown options

**After:**
- Dynamic namespace fetching from Kubernetes cluster
- Integration with `kubernetesService.getNamespaces()`
- Loading states and error handling

**Key Changes:**
```typescript
// BEFORE: Hardcoded namespaces
const namespaces = ['default', 'kube-system', 'kube-public', 'kube-node-lease'];

// AFTER: Dynamic namespace fetching
const [namespaces, setNamespaces] = useState<string[]>([]);
const [loadingNamespaces, setLoadingNamespaces] = useState(true);

// Fetch namespaces from actual Kubernetes cluster
const namespacesData = await kubernetesService.getNamespaces();
const namespaceNames = namespacesData.map(ns => ns.metadata?.name).filter(Boolean);
setNamespaces(namespaceNames);
```

### 3. `app/src/services/dependency-analyzer.test.ts`

**Before:**
- All tests used hardcoded `'default'` namespace values
- Fixed namespace expectations in test assertions

**After:**
- Configurable test namespaces via environment variables
- Uses `VITE_TEST_NAMESPACE` and `VITE_TEST_GRAPH_NAMESPACE`
- More flexible and environment-agnostic tests

**Key Changes:**
```typescript
// BEFORE: Hardcoded default namespace
namespace: 'default',
target: 'ConfigMap/test-config@default',

// AFTER: Configurable test namespace
const testNamespace = process.env.VITE_TEST_NAMESPACE || 'test-ns';
namespace: testNamespace,
target: `ConfigMap/test-config@${testNamespace}`,
```

### 4. `config/.env.development`

**Added:**
```bash
# Test Configuration
VITE_TEST_NAMESPACE=test-ns
VITE_TEST_GRAPH_NAMESPACE=test-graph-ns
```

## Benefits Achieved

### 1. **Real Cluster Integration**
- Dependencies now come from actual Kubernetes cluster
- No more misleading mock data in development
- Proper namespace discovery from cluster state

### 2. **Environment Agnostic**
- Tests work with any namespace configuration
- No hardcoded assumptions about cluster setup
- Configurable test environments

### 3. **Production Ready**
- No dependency on mock or demo data
- Proper error handling when cluster is unavailable
- Clean separation between development and production behavior

### 4. **Improved User Experience**
- Namespace dropdown shows actual cluster namespaces
- Loading states for namespace fetching
- Clear error messages when cluster is unavailable

## Technical Details

### Namespace Fetching Flow

1. **Component Mount**: `DependencyBrowser` component mounts
2. **API Call**: Calls `kubernetesService.getNamespaces()`
3. **Data Processing**: Extracts namespace names from metadata
4. **State Update**: Updates dropdown with actual cluster namespaces
5. **Error Handling**: Shows empty list if cluster unavailable

### Dependency Graph Integration

1. **No Mock Fallback**: Removed development-mode mock data
2. **API Only**: Dependencies come exclusively from backend API
3. **Error Logging**: Proper logging when service unavailable
4. **Clean UI**: No confusing mock data in error states

### Test Configuration

Tests now use environment-configurable namespaces:
- `VITE_TEST_NAMESPACE`: Default test namespace for resources
- `VITE_TEST_GRAPH_NAMESPACE`: Namespace for graph metadata tests

## Migration Impact

### For Developers
- **Development**: Must run backend API to see dependency data
- **Testing**: Can configure test namespaces via environment variables
- **Debugging**: No more confusion between mock and real data

### For Users
- **Real Data**: Dependency browser shows actual cluster relationships
- **Dynamic Namespaces**: Namespace list reflects current cluster state
- **Accurate Visualization**: Dependency graphs represent real workload relationships

## Configuration

### Environment Variables (Optional)
```bash
# For testing only
VITE_TEST_NAMESPACE=your-test-namespace
VITE_TEST_GRAPH_NAMESPACE=your-graph-test-namespace
```

### Backend Requirements
- Backend API must be running for dependency functionality
- `/api/dependencies/*` endpoints must be available
- Kubernetes cluster access required for namespace listing

## Error Handling

The system now properly handles:
- **API Unavailable**: Shows error without mock fallback
- **No Namespaces**: Empty dropdown with appropriate message
- **Network Issues**: Clean error messages and retry options
- **Invalid Clusters**: Graceful degradation without hardcoded data

## Future Enhancements

1. **Caching**: Add namespace caching for performance
2. **Refresh**: Manual refresh button for namespace list
3. **Filtering**: Namespace filtering and search capabilities
4. **Permissions**: Respect RBAC for namespace visibility