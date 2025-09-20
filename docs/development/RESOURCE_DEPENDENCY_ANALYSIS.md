# Kubernetes Resource Interdependency Analysis

## Overview

This document analyzes how Kubernetes resources relate to each other through various mechanisms, enabling us to build a comprehensive dependency visualization system.

## Resource Relationship Patterns

### 1. Owner References (`metadata.ownerReferences`)

**Purpose**: Establishes parent-child relationships and controls garbage collection.

**Examples**:
- `ReplicaSet` → owns → `Pod`
- `Deployment` → owns → `ReplicaSet`
- `StatefulSet` → owns → `Pod`
- `Job` → owns → `Pod`
- `PersistentVolumeClaim` → owns → `PersistentVolume`

**API Fields**:
```yaml
metadata:
  ownerReferences:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-deployment
      uid: 12345-67890
      controller: true
      blockOwnerDeletion: true
```

### 2. Finalizers (`metadata.finalizers`)

**Purpose**: Prevents deletion until cleanup tasks are complete.

**Examples**:
- `kubernetes.io/pv-protection`
- `kubernetes.io/pvc-protection`
- `foregroundDeletion`
- Custom CRD finalizers

### 3. Label Selectors

**Purpose**: Resources that select other resources based on labels.

**Examples**:
- `Service` → selects → `Pod` (via `spec.selector`)
- `NetworkPolicy` → selects → `Pod` (via `spec.podSelector`)
- `Deployment` → selects → `ReplicaSet` (via `spec.selector`)
- `Ingress` → references → `Service`

**API Fields**:
```yaml
spec:
  selector:
    matchLabels:
      app: my-app
    matchExpressions:
      - key: tier
        operator: In
        values: ["frontend", "backend"]
```

### 4. Volume References

**Purpose**: Pods reference storage resources.

**Examples**:
- `Pod` → mounts → `PersistentVolumeClaim`
- `Pod` → mounts → `ConfigMap`
- `Pod` → mounts → `Secret`
- `PersistentVolumeClaim` → claims → `PersistentVolume`

### 5. Service Account References

**Purpose**: Authentication and authorization relationships.

**Examples**:
- `Pod` → uses → `ServiceAccount`
- `ServiceAccount` → bound to → `Role/ClusterRole` (via `RoleBinding/ClusterRoleBinding`)

### 6. Custom Resource Dependencies

**Purpose**: CRDs often reference built-in resources or other CRDs.

**Examples**:
- `Ingress` CRDs → reference → `Service`
- Database CRDs → create → `Service`, `Secret`, `ConfigMap`
- Operator CRDs → manage → multiple resource types

### 7. Admission Controller Dependencies

**Purpose**: Some resources are created/modified by admission controllers.

**Examples**:
- `MutatingAdmissionWebhook` → modifies → various resources
- `ValidatingAdmissionWebhook` → validates → various resources

## Resource Dependency Categories

### Hierarchical Dependencies (Parent-Child)
- **Direct Ownership**: Via `ownerReferences`
- **Composition**: Resources that are part of a larger construct
- **Lifecycle Management**: Parent controls child lifecycle

### Operational Dependencies (Peer-to-Peer)
- **Service Discovery**: Service → Pod relationships
- **Configuration**: ConfigMap/Secret → Pod relationships
- **Storage**: PVC → PV relationships
- **Networking**: NetworkPolicy → Pod relationships

### Cross-Cutting Dependencies
- **RBAC**: ServiceAccount → Role/ClusterRole relationships
- **Scheduling**: Node affinity, pod affinity/anti-affinity
- **Resource Quotas**: ResourceQuota affects resource creation

## Dependency Traversal Algorithm

### Forward Traversal (What does this resource depend on?)
1. Check `spec` fields for references to other resources
2. Check volume mounts for ConfigMap, Secret, PVC references
3. Check service account references
4. Check image pull secrets
5. Check node selectors and affinity rules

### Backward Traversal (What depends on this resource?)
1. Find resources with `ownerReferences` pointing to this resource
2. Find resources with label selectors matching this resource's labels
3. Find pods mounting this resource (for ConfigMap, Secret, PVC)
4. Find services selecting this resource (for pods)
5. Find network policies applying to this resource

### Relationship Types

#### Strong Dependencies (Required)
- Owner references
- Volume mounts
- Service account references
- Required configMaps/secrets

#### Weak Dependencies (Optional)
- Label selections
- Network policies
- Resource quotas
- Admission webhooks

#### Bidirectional Dependencies
- Service ↔ Pod (service selects pods, pods can reference service)
- PVC ↔ PV (claim is bound to volume, volume is claimed)

## Implementation Strategy

### 1. Resource Collection
```typescript
interface ResourceCollection {
  namespace: string;
  resources: {
    [kind: string]: KubernetesResource[];
  };
}
```

### 2. Dependency Graph Structure
```typescript
interface DependencyNode {
  id: string;
  kind: string;
  name: string;
  namespace?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

interface DependencyEdge {
  source: string;
  target: string;
  type: DependencyType;
  strength: 'strong' | 'weak';
  bidirectional: boolean;
  metadata: {
    field?: string;
    reason: string;
  };
}

type DependencyType = 
  | 'owner'
  | 'selector'
  | 'volume'
  | 'serviceAccount'
  | 'network'
  | 'custom';
```

### 3. Analysis Functions
```typescript
class ResourceDependencyAnalyzer {
  analyzeResource(resource: KubernetesResource): DependencyEdge[]
  findOwnerReferences(resource: KubernetesResource): DependencyEdge[]
  findSelectorDependencies(resource: KubernetesResource): DependencyEdge[]
  findVolumeDependencies(resource: KubernetesResource): DependencyEdge[]
  findServiceAccountDependencies(resource: KubernetesResource): DependencyEdge[]
  findCustomDependencies(resource: KubernetesResource): DependencyEdge[]
}
```

## Visualization Considerations

### Graph Layout
- **Hierarchical**: Top-down for ownership relationships
- **Force-directed**: For complex interconnected resources
- **Circular**: For namespace-scoped resource groups

### Node Styling
- **Size**: Based on resource importance or connection count
- **Color**: Based on resource type or health status
- **Shape**: Different shapes for different resource kinds

### Edge Styling
- **Thickness**: Based on dependency strength
- **Color**: Based on dependency type
- **Style**: Solid for strong, dashed for weak dependencies
- **Direction**: Arrows showing dependency direction

### Interaction Features
- **Hover**: Show detailed dependency information
- **Click**: Navigate to resource details
- **Filter**: By resource type, namespace, dependency type
- **Search**: Find specific resources in the graph
- **Zoom/Pan**: Navigate large dependency graphs

## Common Dependency Patterns

### Application Deployment Pattern
```
Deployment → ReplicaSet → Pod
                      ↓
Service ←――――――――――――――
                      ↓
ConfigMap ←―――――――――――――
                      ↓
Secret ←――――――――――――――――
                      ↓
PVC → PV
```

### Operator Pattern
```
CustomResource (CR)
       ↓
Operator Pod → ServiceAccount → Role
       ↓              ↓
   Deployment → ReplicaSet → Pod
       ↓
   Service + ConfigMap + Secret
```

### StatefulSet Pattern
```
StatefulSet → Pod (ordered)
       ↓         ↓
   Service ←―――――――
       ↓         ↓
   PVC → PV (persistent)
```

This analysis forms the foundation for implementing a comprehensive resource dependency visualization system.