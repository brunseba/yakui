# Add Cluster Feature Documentation

## Overview

The Add Cluster feature provides a comprehensive solution for managing Kubernetes clusters in your admin UI. It allows users to add new clusters through multiple authentication methods and manage them through a user-friendly interface.

## Key Components

### 1. AddClusterForm (`src/components/cluster/AddClusterForm.tsx`)

A comprehensive form component that supports multiple authentication methods:

#### Features:
- **Basic Configuration**: Name, display name, description, server URL, provider, environment, region, version, and tags
- **Multiple Auth Methods**:
  - **Kubeconfig**: Upload file or paste content directly
  - **Token**: Bearer token with optional CA certificate
  - **Certificate**: Client certificate and private key authentication
  - **Service Account**: Service account token authentication
- **Form Validation**: Comprehensive validation for all required fields
- **Connection Testing**: Built-in connection test functionality
- **Tag Management**: Add/remove custom tags for cluster organization

#### Usage:
```tsx
<AddClusterForm
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  onTestConnection={testConnectionFunction}
/>
```

### 2. AddClusterModal (`src/components/cluster/AddClusterModal.tsx`)

A modal wrapper that provides:

#### Features:
- **Responsive Design**: Full-screen on mobile, modal on desktop
- **Success Feedback**: Shows success message after cluster addition
- **Error Handling**: Displays errors with proper user feedback
- **Context Integration**: Automatically updates cluster context state
- **Loading States**: Prevents closing during operations

#### Usage:
```tsx
<AddClusterModal
  open={isOpen}
  onClose={handleClose}
  onSuccess={handleSuccess}
/>
```

### 3. ClusterSelectorWithModal (`src/components/cluster/ClusterSelectorWithModal.tsx`)

A convenience component that combines ClusterSelector with AddClusterModal:

#### Usage:
```tsx
<ClusterSelectorWithModal
  variant="header"
  showAddButton={true}
  onManageClusters={handleManageClusters}
/>
```

## Integration

### ClusterManager Integration

The `ClusterManager` component has been updated to include:
- "Add Cluster" button in the header
- "Add Your First Cluster" button in empty state
- Full integration with the AddClusterModal

### ClusterSelector Integration

The `ClusterSelector` already supports:
- "Add Cluster" option in dropdown menu
- Configurable via `onAddCluster` prop
- Available in all variants (header, sidebar, compact)

## Authentication Methods

### 1. Kubeconfig
- **File Upload**: Drag and drop or browse for kubeconfig files
- **Paste Content**: Direct paste of kubeconfig YAML content
- **Auto-parsing**: Automatically extracts server URL and cluster info
- **Namespace**: Configurable default namespace

### 2. Token Authentication
- **Bearer Token**: JWT or other bearer tokens
- **CA Certificate**: Optional CA certificate for server verification
- **Namespace**: Configurable default namespace

### 3. Certificate Authentication
- **Client Certificate**: PEM-encoded client certificate
- **Private Key**: Corresponding private key
- **CA Certificate**: Optional CA certificate
- **Namespace**: Configurable default namespace

### 4. Service Account
- **Service Account Token**: Token from Kubernetes service account
- **Namespace**: Service account namespace (default: kube-system)
- **Service Account Name**: Name of the service account
- **Default Namespace**: Default namespace for operations

## Data Storage

### LocalStorage Structure
Clusters are stored in localStorage under the key `kubernetes-clusters` with the following structure:

```json
[
  {
    "config": {
      "id": "unique-cluster-id",
      "name": "cluster-name",
      "displayName": "Human Readable Name",
      "description": "Cluster description",
      "server": "https://api.cluster.example.com:6443",
      "provider": "aws|gcp|azure|local|other",
      "environment": "development|staging|production",
      "region": "us-west-2",
      "version": "v1.28.0",
      "tags": { "key": "value" },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "isDefault": false
    },
    "auth": {
      "clusterId": "unique-cluster-id",
      "type": "kubeconfig|token|certificate|serviceaccount",
      "kubeconfig": "base64-encoded-kubeconfig",
      "token": "bearer-token",
      "certificate": "client-certificate",
      "privateKey": "private-key",
      "caCertificate": "ca-certificate",
      "serviceAccount": {
        "namespace": "kube-system",
        "name": "admin-sa",
        "token": "sa-token"
      },
      "namespace": "default"
    },
    "status": {
      "clusterId": "unique-cluster-id",
      "status": "connected|disconnected|error|unknown",
      "lastChecked": "2024-01-01T00:00:00.000Z",
      "responseTime": 45,
      "error": "error-message",
      "version": "v1.28.0",
      "nodeCount": 3,
      "namespaceCount": 12,
      "podCount": 48
    }
  }
]
```

## Service Layer

### ClusterService Updates

The `clusterService` has been updated to:
- **Remove dummy data**: Starts with empty clusters array
- **Proper CRUD operations**: Full create, read, update, delete functionality
- **Health checking**: Simulated cluster health checks
- **Connection testing**: Test cluster connectivity before adding

### Key Methods:
- `addCluster(request: AddClusterRequest): Promise<ClusterConnection>`
- `testConnection(config: ClusterConfig, auth: ClusterAuth): Promise<ConnectionResult>`
- `checkClusterHealth(id: string): Promise<ClusterHealthCheck>`

## Form Validation

### Basic Configuration Validation:
- **Cluster Name**: Required, unique identifier
- **Display Name**: Required, human-readable name
- **Server URL**: Required, valid HTTPS URL format
- **Provider**: Optional, defaults to "other"
- **Environment**: Optional, defaults to "development"

### Authentication Validation:
- **Kubeconfig**: Must contain valid YAML content
- **Token**: Required when token auth is selected
- **Certificate**: Both certificate and private key required
- **Service Account**: Name and token required

## User Experience Features

### Progressive Enhancement:
1. **Form Tabs**: Easy switching between auth methods
2. **File Upload**: Drag-and-drop kubeconfig upload
3. **Auto-completion**: Server URL extraction from kubeconfig
4. **Real-time Validation**: Immediate feedback on form errors
5. **Connection Testing**: Pre-flight connection verification
6. **Success Feedback**: Clear confirmation of cluster addition

### Responsive Design:
- **Mobile-first**: Full-screen modal on small screens
- **Desktop-optimized**: Proper modal sizing on larger screens
- **Touch-friendly**: Appropriate touch targets and spacing

## Security Considerations

### Credential Storage:
- **LocalStorage**: Credentials stored in browser localStorage
- **Base64 Encoding**: Certificates and tokens are base64 encoded
- **No Server Storage**: All data remains client-side

### Connection Testing:
- **Sandbox Environment**: Connection tests run in isolated context
- **Error Handling**: Proper error messages without credential exposure
- **Timeout Protection**: Connection tests have reasonable timeouts

## Future Enhancements

### Planned Features:
1. **Import/Export**: Bulk cluster import/export functionality
2. **Real API Integration**: Connect to actual Kubernetes APIs
3. **Advanced Health Monitoring**: More detailed cluster health metrics
4. **RBAC Integration**: Role-based access control for cluster management
5. **Encrypted Storage**: Client-side encryption for sensitive data

### Potential Improvements:
1. **Kubeconfig Parser**: More robust YAML parsing and validation
2. **Multiple Contexts**: Support for multiple contexts per kubeconfig
3. **Cloud Provider Integration**: Direct integration with cloud provider APIs
4. **Certificate Management**: Automatic certificate renewal
5. **Backup/Restore**: Configuration backup and restore functionality

## Troubleshooting

### Common Issues:

#### 1. Clusters Not Appearing
- **Check localStorage**: Verify data is stored correctly
- **Clear Cache**: Try clearing browser cache and localStorage
- **Console Errors**: Check browser console for JavaScript errors

#### 2. Connection Test Failures
- **Network Connectivity**: Verify cluster is accessible
- **CORS Issues**: Check for cross-origin resource sharing problems
- **Certificate Errors**: Verify certificate validity and format

#### 3. Form Validation Errors
- **Required Fields**: Ensure all required fields are completed
- **Format Issues**: Check URL formats and certificate formatting
- **Character Limits**: Verify field length requirements

### Debug Commands:

```javascript
// Check stored clusters
console.log(JSON.parse(localStorage.getItem('kubernetes-clusters')));

// Clear all clusters
localStorage.removeItem('kubernetes-clusters');

// Test cluster service
import { clusterService } from './services/clusterService';
clusterService.getClusters().then(console.log);
```

## API Reference

### AddClusterRequest Interface:
```typescript
interface AddClusterRequest {
  config: Omit<ClusterConfig, 'id' | 'createdAt' | 'updatedAt'>;
  auth: Omit<ClusterAuth, 'clusterId'>;
}
```

### Connection Test Result:
```typescript
interface ConnectionTestResult {
  success: boolean;
  error?: string;
  version?: string;
}
```

---

This comprehensive add cluster feature provides a solid foundation for multi-cluster Kubernetes management with room for future enhancements and integrations.