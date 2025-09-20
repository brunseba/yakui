# Resource Dependency Browser User Guide

## Overview

The Resource Dependency Browser provides a powerful visual interface for exploring and understanding the relationships between Kubernetes resources in your cluster. This tool helps you:

- **Visualize Dependencies**: See how resources depend on each other
- **Understand Ownership**: Track parent-child relationships through ownerReferences
- **Analyze Connections**: Explore service discovery, volume mounts, and RBAC relationships
- **Debug Issues**: Identify missing dependencies or broken relationships
- **Plan Changes**: Understand the impact of modifications before making them

## Accessing the Dependency Browser

1. **From the Navigation Menu**: Click on "Dependencies" in the left sidebar
2. **From Resource Manager**: Click "View Dependencies" button in the CRDManager header
3. **Direct URL**: Navigate to `/dependencies` in your browser

## Interface Components

### Control Panel

The top control panel allows you to filter and configure the visualization:

#### Filters
- **Namespace**: Select a specific namespace or view all namespaces
- **Resource Types**: Filter by specific Kubernetes resource kinds (Pod, Service, etc.)
- **Dependency Types**: Focus on specific relationship types (ownership, volume, service, etc.)
- **Max Resources**: Limit the number of resources displayed for performance
- **Include Custom Resources**: Toggle to include/exclude CRDs

#### Search
- **Search Bar**: Find specific resources by name, kind, or namespace
- **Real-time Filtering**: Results update as you type

### Graph Visualization

The main graph displays resources as nodes connected by dependency edges:

#### Nodes (Resources)
- **Card Format**: Each resource appears as a colored card
- **Resource Icon**: Visual identifier for the resource type (🚀 for Pods, 🌐 for Services, etc.)
- **Resource Information**:
  - Kind (e.g., Pod, Service, Deployment)
  - Name
  - Namespace (if applicable)
  - Label count
- **Color Coding**: Border color indicates resource health/status
- **Hover Effects**: Cards scale slightly on hover for better interactivity

#### Edges (Dependencies)
- **Connection Lines**: Show relationships between resources
- **Color Coding**: Different colors represent different dependency types
- **Line Styles**:
  - **Solid Lines**: Strong dependencies (required)
  - **Dashed Lines**: Weak dependencies (optional)
- **Direction**: Arrows indicate dependency direction
- **Animation**: Strong dependencies have animated flow

### Statistics Panel

Shows real-time metrics about the current view:
- **Total Resources**: Number of resources displayed
- **Total Dependencies**: Number of relationships shown
- **Strong Dependencies**: Count of required relationships
- **Weak Dependencies**: Count of optional relationships

## Dependency Types

### 🔗 Ownership Dependencies (Red)
- **Description**: Parent-child relationships via `ownerReferences`
- **Examples**:
  - Deployment → ReplicaSet → Pod
  - StatefulSet → Pod
  - Job → Pod
- **Strength**: Always strong
- **Use Case**: Understanding resource lifecycle and garbage collection

### 💾 Volume Dependencies (Teal)
- **Description**: Storage mount relationships
- **Examples**:
  - Pod → PersistentVolumeClaim
  - Pod → ConfigMap
  - Pod → Secret
  - PersistentVolumeClaim → PersistentVolume
- **Strength**: Strong (required for pod operation)
- **Use Case**: Storage troubleshooting and planning

### 🌐 Service Dependencies (Orange)
- **Description**: Network discovery relationships
- **Examples**:
  - Service → Pod (via label selectors)
  - Ingress → Service
- **Strength**: Weak (service discovery)
- **Use Case**: Network connectivity and service mesh understanding

### 👤 Service Account Dependencies (Blue)
- **Description**: Authentication and authorization
- **Examples**:
  - Pod → ServiceAccount
  - ServiceAccount → Role (via RoleBinding)
- **Strength**: Strong (required for authentication)
- **Use Case**: RBAC analysis and security auditing

### 🔍 Selector Dependencies (Green)
- **Description**: Label-based resource selection
- **Examples**:
  - Service → Pod (selector matching)
  - NetworkPolicy → Pod (pod selector)
  - ReplicaSet → Pod (template matching)
- **Strength**: Weak (flexible matching)
- **Use Case**: Understanding label-based relationships

### 🌍 Network Dependencies (Purple)
- **Description**: Network policy and connectivity
- **Examples**:
  - NetworkPolicy → Pod (applies to pods)
  - Ingress → Service (routes traffic)
- **Strength**: Weak (network configuration)
- **Use Case**: Network security and traffic flow analysis

## Navigation and Interaction

### Graph Controls

#### Built-in Controls
- **Zoom In/Out**: Use mouse wheel or control buttons
- **Pan**: Click and drag to move around the graph
- **Fit to View**: Button to center and scale the entire graph
- **Minimap**: Small overview in bottom-right corner

#### Search and Filter
- **Search Box**: Find specific resources quickly
- **Type Filters**: Show only specific resource kinds
- **Dependency Filters**: Focus on specific relationship types
- **Namespace Filter**: Scope to specific namespaces

#### Interactive Elements
- **Click Nodes**: Opens detailed resource information dialog
- **Hover Edges**: Shows dependency metadata (planned feature)
- **Double-click**: Focus on a specific resource and its immediate neighbors

### Resource Detail Dialog

When you click on a resource node:
- **Resource Information**: Kind, name, namespace, creation time
- **Labels**: All attached labels as chips
- **Status**: Current resource state
- **Quick Actions**: Navigate to detailed resource views (planned)

## Tabs and Views

### Cluster Overview
- **Scope**: All resources across all namespaces (up to limit)
- **Best For**: Understanding overall cluster architecture
- **Performance**: May be limited for very large clusters

### Namespace View
- **Scope**: Resources within a specific namespace
- **Best For**: Application-specific dependency analysis
- **Performance**: Faster, more focused view

### Analytics (Future)
- **Dependency Patterns**: Common architectural patterns
- **Complexity Metrics**: Quantify dependency complexity
- **Critical Path Analysis**: Identify key dependencies
- **Orphaned Resources**: Find resources without relationships
- **Circular Dependencies**: Detect problematic cycles

## Use Cases and Workflows

### 1. Application Troubleshooting

**Scenario**: A pod is failing to start
**Workflow**:
1. Search for the failing pod in the dependency browser
2. Examine its incoming dependencies (volume mounts, service accounts)
3. Check if all required resources exist and are healthy
4. Follow ownership chain to find the controlling deployment
5. Verify network policies aren't blocking required connections

### 2. Impact Analysis

**Scenario**: Planning to delete a ConfigMap
**Workflow**:
1. Search for the ConfigMap in the browser
2. Examine all outgoing edges to see which pods mount it
3. Assess the impact scope
4. Plan rolling updates or create replacement ConfigMap
5. Verify no critical applications will be affected

### 3. Security Auditing

**Scenario**: Understanding RBAC relationships
**Workflow**:
1. Filter to show only ServiceAccount and RBAC dependencies
2. Trace service account usage from pods
3. Follow role binding relationships
4. Identify over-privileged service accounts
5. Plan principle of least privilege improvements

### 4. Storage Planning

**Scenario**: Understanding persistent storage usage
**Workflow**:
1. Filter to show volume-related dependencies
2. Examine PVC → PV relationships
3. Identify pods using persistent storage
4. Assess storage class usage patterns
5. Plan storage consolidation or migration

### 5. Network Architecture

**Scenario**: Understanding service connectivity
**Workflow**:
1. Filter to show service and network dependencies
2. Trace service → pod relationships
3. Examine ingress routing
4. Identify network policy applications
5. Plan service mesh or network changes

## Performance Considerations

### Large Clusters
- **Resource Limits**: Use "Max Resources" filter to limit display
- **Namespace Scoping**: Focus on specific namespaces
- **Type Filtering**: Show only relevant resource types
- **Disable Weak Dependencies**: Focus on strong relationships only

### Responsive Design
- **Desktop**: Full feature set with large graph area
- **Tablet**: Condensed controls, maintained functionality
- **Mobile**: Limited support (use desktop for best experience)

## Troubleshooting

### Common Issues

#### Graph Not Loading
- **Check Backend**: Verify API server is running
- **Check Permissions**: Ensure adequate cluster permissions
- **Reduce Scope**: Try limiting to a specific namespace
- **Check Console**: Look for JavaScript errors

#### Missing Dependencies
- **API Limitations**: Some relationships may not be detectable
- **Custom Resources**: May require manual relationship mapping
- **Cross-Namespace**: Some relationships span namespaces

#### Performance Issues
- **Too Many Resources**: Reduce max resource limit
- **Complex Layout**: Switch to hierarchical layout
- **Browser Memory**: Close other browser tabs

### Best Practices

#### Effective Usage
- **Start Small**: Begin with a single namespace
- **Use Filters**: Focus on specific resource types or dependency types
- **Regular Exploration**: Check dependencies before major changes
- **Document Patterns**: Save screenshots of important architectural patterns

#### Performance Optimization
- **Reasonable Limits**: Don't try to visualize entire large clusters at once
- **Targeted Analysis**: Use filters to focus on specific problems
- **Browser Resources**: Use modern browser with sufficient memory

## Future Enhancements

### Planned Features
- **Dependency Analytics**: Advanced pattern recognition
- **Critical Path Analysis**: Identify key dependency chains
- **Change Impact Prediction**: Simulate the effects of changes
- **Export Capabilities**: Save graphs as images or data
- **Integration**: Links to other Kubernetes management tools
- **Custom Layouts**: Alternative graph layout algorithms
- **Time-based View**: Show dependencies over time

### API Extensions
- **Enhanced Relationship Detection**: Better custom resource relationship discovery
- **Performance Optimization**: Server-side graph processing
- **Real-time Updates**: WebSocket-based live dependency updates
- **Historical Data**: Track dependency changes over time

This guide provides comprehensive information about using the Resource Dependency Browser effectively. For technical implementation details, see the [Resource Dependency Analysis](../development/RESOURCE_DEPENDENCY_ANALYSIS.md) documentation.