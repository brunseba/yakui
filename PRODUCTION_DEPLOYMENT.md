# Kubernetes Admin UI - Production Deployment Guide

This guide provides comprehensive instructions for deploying the Kubernetes Admin UI in production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Build and Deploy](#build-and-deploy)
3. [Configuration](#configuration)
4. [Security Considerations](#security-considerations)
5. [Monitoring and Observability](#monitoring-and-observability)
6. [Backup and Recovery](#backup-and-recovery)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance](#maintenance)

## Prerequisites

### System Requirements

- **Kubernetes Cluster**: v1.20+ (recommended v1.25+)
- **Node Resources**: Minimum 2 CPU cores and 4GB RAM per node
- **Container Runtime**: Docker, containerd, or CRI-O
- **Ingress Controller**: NGINX Ingress Controller (recommended)
- **TLS/SSL**: Valid SSL certificates for HTTPS

### Required Tools

```bash
# Install required CLI tools
kubectl version --client  # Should be v1.20+
docker --version          # For building images
helm version              # Optional, for Helm deployments
```

### Cluster Permissions

The user deploying the application needs cluster-admin permissions or equivalent permissions to create:
- Namespaces
- ServiceAccounts
- ClusterRoles and ClusterRoleBindings
- Deployments, Services, ConfigMaps
- Ingress resources

## Build and Deploy

### Step 1: Build the Container Image

```bash
# Clone the repository
git clone <repository-url>
cd kubernetes-admin-ui

# Build the optimized production image
docker build -t k8s-admin-ui:v1.0.0 .

# Tag for your registry
docker tag k8s-admin-ui:v1.0.0 your-registry.com/k8s-admin-ui:v1.0.0

# Push to your container registry
docker push your-registry.com/k8s-admin-ui:v1.0.0
```

### Step 2: Update Image Reference

Update the image reference in the Kubernetes manifests:

```bash
# Update the deployment image
sed -i 's|k8s-admin-ui:latest|your-registry.com/k8s-admin-ui:v1.0.0|g' k8s-deployment.yaml
```

### Step 3: Deploy to Kubernetes

```bash
# Apply the complete deployment
kubectl apply -f k8s-deployment.yaml

# Verify deployment
kubectl get all -n k8s-admin-ui

# Check pod status
kubectl get pods -n k8s-admin-ui -w
```

### Step 4: Configure Ingress

Update the Ingress configuration for your domain:

```yaml
# Update in k8s-deployment.yaml
spec:
  tls:
  - hosts:
    - k8s-admin.yourdomain.com
    secretName: k8s-admin-ui-tls
  rules:
  - host: k8s-admin.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: k8s-admin-ui
            port:
              number: 80
```

## Configuration

### Environment Variables

The application supports the following environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Application environment |
| `REACT_APP_VERSION` | `v1.0.0` | Application version |
| `REACT_APP_API_BASE_URL` | `/api` | API base URL |
| `REACT_APP_CLUSTER_NAME` | `default` | Default cluster name |

### ConfigMap Configuration

Update the ConfigMap for custom nginx configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: k8s-admin-ui-config
  namespace: k8s-admin-ui
data:
  # Add custom environment variables
  app.env: |
    REACT_APP_CLUSTER_NAME=production-cluster
    REACT_APP_COMPANY_NAME=Your Company
```

### Resource Limits

For production workloads, adjust resource limits based on your usage:

```yaml
resources:
  limits:
    cpu: 500m      # Adjust based on load
    memory: 512Mi  # Adjust based on usage
  requests:
    cpu: 200m
    memory: 256Mi
```

## Security Considerations

### 1. RBAC Configuration

The deployment uses principle of least privilege:

```yaml
# Review and customize ClusterRole permissions
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps", "secrets"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "daemonsets", "statefulsets"]
  verbs: ["get", "list", "watch"]
```

**Important**: For write operations, additional permissions are required:
- `create`, `update`, `patch`, `delete` verbs
- Specific resource permissions

### 2. Pod Security

- **runAsNonRoot**: Containers run as non-root user
- **readOnlyRootFilesystem**: Root filesystem is read-only
- **seccompProfile**: Uses RuntimeDefault seccomp profile
- **capabilities**: All Linux capabilities are dropped

### 3. Network Security

```yaml
# Add NetworkPolicy for additional security
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: k8s-admin-ui-netpol
  namespace: k8s-admin-ui
spec:
  podSelector:
    matchLabels:
      app: k8s-admin-ui
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - {} # Allow all outbound (adjust as needed)
```

### 4. TLS Configuration

```bash
# Generate TLS certificate (using cert-manager)
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: k8s-admin-ui-tls
  namespace: k8s-admin-ui
spec:
  secretName: k8s-admin-ui-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - k8s-admin.yourdomain.com
EOF
```

## Monitoring and Observability

### 1. Health Checks

The application provides the following endpoints:

- **Health**: `/health` - Returns 200 OK when healthy
- **Readiness**: Used by Kubernetes readiness probe
- **Liveness**: Used by Kubernetes liveness probe

### 2. Prometheus Metrics

Enable Prometheus monitoring:

```yaml
# Add to pod annotations
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "8080"
  prometheus.io/path: "/metrics"
```

### 3. Logging

Application logs are sent to stdout/stderr and can be collected by:

- **Fluentd/Fluent Bit**: For log aggregation
- **ELK Stack**: For log analysis
- **Cloud Provider Logging**: AWS CloudWatch, GCP Cloud Logging, etc.

```bash
# View application logs
kubectl logs -f deployment/k8s-admin-ui -n k8s-admin-ui

# View logs from all pods
kubectl logs -l app=k8s-admin-ui -n k8s-admin-ui --tail=100
```

### 4. Alerting

Set up alerts for:

- **Pod Restart Rate**: High restart frequency
- **Memory Usage**: Memory consumption > 80%
- **CPU Usage**: CPU usage > 80%
- **HTTP Error Rate**: 4xx/5xx responses > 5%
- **Response Time**: P95 response time > 2s

## Backup and Recovery

### 1. Configuration Backup

```bash
# Backup all resources
kubectl get all,configmap,secret,ingress -n k8s-admin-ui -o yaml > k8s-admin-ui-backup.yaml

# Backup RBAC resources
kubectl get clusterrole,clusterrolebinding -l app=k8s-admin-ui -o yaml >> k8s-admin-ui-backup.yaml
```

### 2. Disaster Recovery

```bash
# Restore from backup
kubectl apply -f k8s-admin-ui-backup.yaml

# Verify restoration
kubectl get all -n k8s-admin-ui
```

### 3. Update Strategy

```bash
# Rolling update with zero downtime
kubectl set image deployment/k8s-admin-ui k8s-admin-ui=your-registry.com/k8s-admin-ui:v1.1.0 -n k8s-admin-ui

# Monitor rollout
kubectl rollout status deployment/k8s-admin-ui -n k8s-admin-ui

# Rollback if needed
kubectl rollout undo deployment/k8s-admin-ui -n k8s-admin-ui
```

## Troubleshooting

### Common Issues

#### 1. Pods Not Starting

```bash
# Check pod events
kubectl describe pods -n k8s-admin-ui

# Check pod logs
kubectl logs -l app=k8s-admin-ui -n k8s-admin-ui

# Common causes:
# - Image pull failures
# - Resource constraints
# - Volume mount issues
# - RBAC permissions
```

#### 2. Application Not Accessible

```bash
# Check service status
kubectl get svc -n k8s-admin-ui

# Check ingress status
kubectl get ingress -n k8s-admin-ui
kubectl describe ingress k8s-admin-ui -n k8s-admin-ui

# Test internal connectivity
kubectl port-forward svc/k8s-admin-ui 8080:80 -n k8s-admin-ui
curl http://localhost:8080/health
```

#### 3. Performance Issues

```bash
# Check resource usage
kubectl top pods -n k8s-admin-ui

# Check node resources
kubectl top nodes

# Scale horizontally if needed
kubectl scale deployment k8s-admin-ui --replicas=3 -n k8s-admin-ui
```

#### 4. Security Issues

```bash
# Check RBAC permissions
kubectl auth can-i get pods --as=system:serviceaccount:k8s-admin-ui:k8s-admin-ui

# Check pod security context
kubectl get pod -n k8s-admin-ui -o jsonpath='{.items[0].spec.securityContext}'

# Verify network policies
kubectl get networkpolicy -n k8s-admin-ui
```

## Maintenance

### Regular Tasks

#### 1. Update Dependencies

```bash
# Update base image monthly
docker pull node:18-alpine
docker pull nginx:alpine

# Rebuild with latest base images
docker build --no-cache -t k8s-admin-ui:v1.0.1 .
```

#### 2. Security Updates

```bash
# Scan for vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy k8s-admin-ui:v1.0.0

# Update if vulnerabilities found
kubectl set image deployment/k8s-admin-ui k8s-admin-ui=k8s-admin-ui:v1.0.1 -n k8s-admin-ui
```

#### 3. Certificate Renewal

```bash
# Check certificate expiration (with cert-manager)
kubectl get certificate -n k8s-admin-ui

# Manual renewal if needed
kubectl delete secret k8s-admin-ui-tls -n k8s-admin-ui
kubectl apply -f certificate.yaml
```

#### 4. Log Rotation

```bash
# Container logs are automatically rotated by Kubernetes
# For additional log management, configure your logging solution:

# Example: Set log retention in Fluentd/ELK
# Adjust log levels in application if needed
```

### Performance Optimization

#### 1. Horizontal Pod Autoscaler (HPA)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: k8s-admin-ui-hpa
  namespace: k8s-admin-ui
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: k8s-admin-ui
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

#### 2. Pod Disruption Budget (PDB)

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: k8s-admin-ui-pdb
  namespace: k8s-admin-ui
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: k8s-admin-ui
```

#### 3. Resource Quotas

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: k8s-admin-ui-quota
  namespace: k8s-admin-ui
spec:
  hard:
    requests.cpu: "1"
    requests.memory: 1Gi
    limits.cpu: "2"
    limits.memory: 2Gi
    pods: "10"
```

## Conclusion

This guide provides a comprehensive approach to deploying the Kubernetes Admin UI in production. Always test deployments in a staging environment before applying to production, and follow your organization's security and compliance requirements.

For additional support:

1. Check the application logs
2. Review Kubernetes events
3. Consult the troubleshooting section
4. File issues in the project repository

Remember to keep the application and its dependencies updated regularly for security and performance improvements.