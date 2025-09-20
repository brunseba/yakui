# Kubernetes Deployment

This directory contains Kubernetes manifests and deployment configurations for the Kubernetes Admin UI.

## 📁 Files Overview

### 📋 Manifests
- **`k8s-deployment.yaml`** - Complete Kubernetes deployment manifest
- **`namespace.yaml`** - Namespace configuration (if needed)
- **`configmap.yaml`** - Application configuration
- **`service.yaml`** - Service definitions
- **`ingress.yaml`** - Ingress controller configuration
- **`rbac.yaml`** - RBAC permissions for cluster access

## 🚀 Quick Deploy

### Simple Deployment
```bash
# Apply all manifests
kubectl apply -f .

# Check deployment status
kubectl get pods -n kubernetes-admin-ui
kubectl get svc -n kubernetes-admin-ui
```

### Verify Deployment
```bash
# Check pod status
kubectl get pods -l app=kubernetes-admin-ui -o wide

# View logs
kubectl logs -l app=kubernetes-admin-ui -f

# Port forward for testing
kubectl port-forward svc/kubernetes-admin-ui 8080:80
```

## 🏗️ Architecture

### 🌐 Frontend Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: yakui-frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: yakui-frontend
```

### ⚙️ Backend Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: yakui-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: yakui-backend
```

## 🔒 RBAC Configuration

The application requires specific permissions to interact with the Kubernetes API:

### Required Permissions
- **Cluster-wide**: Read access to nodes, namespaces, CRDs
- **Namespaced**: CRUD operations on pods, services, deployments
- **RBAC**: Read access to roles, bindings, service accounts

### Service Account
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kubernetes-admin-ui
  namespace: kubernetes-admin-ui
```

## 🌐 Service Configuration

### ClusterIP Service (Internal)
```yaml
apiVersion: v1
kind: Service
metadata:
  name: yakui-internal
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: 5173
```

### LoadBalancer Service (External)
```yaml
apiVersion: v1
kind: Service
metadata:
  name: yakui-external
spec:
  type: LoadBalancer
  ports:
    - port: 80
      targetPort: 5173
```

## 🔄 Ingress Setup

### Basic Ingress
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kubernetes-admin-ui
spec:
  rules:
    - host: yakui.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: yakui-frontend
                port:
                  number: 80
```

### TLS/SSL Configuration
```yaml
spec:
  tls:
    - hosts:
        - yakui.example.com
      secretName: yakui-tls
```

## ⚙️ Configuration Management

### ConfigMap Example
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: yakui-config
data:
  API_BASE_URL: "http://yakui-backend:3001/api"
  NODE_ENV: "production"
  LOG_LEVEL: "info"
```

### Secret Management
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: yakui-secrets
type: Opaque
data:
  kubeconfig: <base64-encoded-kubeconfig>
```

## 📊 Monitoring & Observability

### Health Checks
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 3001
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Resource Limits
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

## 🔧 Deployment Strategies

### Rolling Update (Default)
```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 1
```

### Blue-Green Deployment
```bash
# Deploy new version with different labels
kubectl apply -f k8s-deployment-v2.yaml

# Switch traffic by updating service selector
kubectl patch service yakui-frontend -p '{"spec":{"selector":{"version":"v2"}}}'
```

## 🚀 Scaling

### Manual Scaling
```bash
# Scale frontend
kubectl scale deployment yakui-frontend --replicas=5

# Scale backend
kubectl scale deployment yakui-backend --replicas=3
```

### Horizontal Pod Autoscaler
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: yakui-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: yakui-frontend
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## 🐛 Troubleshooting

### Debug Commands
```bash
# Check deployment status
kubectl rollout status deployment/yakui-frontend

# View pod details
kubectl describe pod <pod-name>

# Check logs
kubectl logs deployment/yakui-frontend -f

# Debug networking
kubectl exec -it <pod-name> -- nslookup kubernetes.default.svc.cluster.local

# Check RBAC permissions
kubectl auth can-i list pods --as=system:serviceaccount:kubernetes-admin-ui:kubernetes-admin-ui
```

### Common Issues

1. **ImagePullBackOff**: Check image name and registry access
2. **CrashLoopBackOff**: Check application logs and resource limits
3. **Permission Denied**: Verify RBAC configuration
4. **Service Unreachable**: Check service selectors and port configurations

## 🔒 Security Best Practices

- **Least Privilege**: Grant minimal required permissions
- **Network Policies**: Restrict inter-pod communication
- **Pod Security Standards**: Apply security contexts
- **Secret Management**: Use external secret management systems
- **Image Security**: Scan container images for vulnerabilities

## 📝 Environment-Specific Configurations

### Development
- Single replica deployments
- Debug logging enabled
- Permissive RBAC for testing

### Staging
- Multi-replica setup
- Resource limits applied
- Monitoring enabled

### Production
- High availability setup
- Strict resource limits
- Comprehensive monitoring and alerting
- Network policies applied

For detailed production setup, see the [Production Deployment Guide](../../docs/deployment/PRODUCTION_DEPLOYMENT.md).