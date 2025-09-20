# Monitoring Deployment

This directory contains monitoring and observability configurations for the Kubernetes Admin UI deployment.

## 📁 Files Overview

### 📊 Prometheus Configuration
- **`prometheus.yml`** - Main Prometheus configuration with scrape targets
- **`grafana/`** - Grafana dashboards and configuration (when available)
- **`alertmanager/`** - Alert rules and notification configuration (when available)

## 🚀 Quick Start

### Docker Compose Monitoring
```bash
# Start with monitoring stack
cd deployment/docker/
docker compose --profile monitoring up -d

# Access monitoring services
open http://localhost:9090  # Prometheus
open http://localhost:3000  # Grafana (if configured)
```

### Kubernetes Monitoring
```bash
# Deploy monitoring stack
kubectl apply -f deployment/monitoring/k8s-monitoring.yaml

# Port forward for access
kubectl port-forward svc/prometheus 9090:9090
kubectl port-forward svc/grafana 3000:3000
```

## 📊 Monitoring Architecture

### 🎯 Metrics Collection
- **Prometheus** - Time-series database and alerting
- **Node Exporter** - System and hardware metrics
- **Application Metrics** - Custom application performance metrics

### 📈 Visualization
- **Grafana** - Rich dashboards and visualization
- **Built-in Prometheus UI** - Query interface and basic graphs

### 🔔 Alerting
- **Alertmanager** - Alert routing and notifications
- **Custom Rules** - Application-specific alert conditions

## 🎛️ Monitored Services

### Frontend Metrics (`frontend:5173/metrics`)
- **HTTP Requests**: Request count, duration, status codes
- **Bundle Size**: JavaScript bundle metrics
- **User Experience**: Core web vitals, error rates
- **Browser Performance**: Memory usage, rendering metrics

### Backend API Metrics (`backend:3001/api/metrics`)
- **API Performance**: Response times, throughput
- **Kubernetes API**: Cluster operation metrics
- **Database**: Connection pool, query performance
- **Resource Usage**: Memory, CPU, file descriptors

### System Metrics
- **Container Resources**: CPU, memory, disk, network
- **Kubernetes Cluster**: Node status, pod metrics
- **Application Health**: Health checks, startup times

## 📋 Default Scrape Configuration

```yaml
scrape_configs:
  - job_name: 'yakui-frontend'
    static_configs:
      - targets: ['frontend:5173']
    scrape_interval: 30s
    
  - job_name: 'yakui-backend'  
    static_configs:
      - targets: ['backend:3001']
    scrape_interval: 15s
    
  - job_name: 'yakui-redis'
    static_configs:
      - targets: ['redis:6379']
    scrape_interval: 30s
```

## 🔧 Configuration

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `PROMETHEUS_RETENTION` | Data retention period | `15d` |
| `SCRAPE_INTERVAL` | Default scrape interval | `15s` |
| `EVALUATION_INTERVAL` | Rule evaluation interval | `15s` |

### Custom Metrics
Add custom application metrics by extending the configuration:

```yaml
# Custom scrape config
- job_name: 'custom-app'
  static_configs:
    - targets: ['custom-service:8080']
  metrics_path: '/custom/metrics'
  scrape_interval: 10s
```

## 🚨 Alerting Rules

### Critical Alerts
- **High Error Rate**: >5% HTTP 5xx responses
- **High Response Time**: >2s average response time
- **Memory Usage**: >90% memory utilization
- **Disk Space**: >85% disk usage

### Warning Alerts  
- **Moderate Error Rate**: >2% HTTP 4xx responses
- **Increased Latency**: >1s average response time
- **Resource Pressure**: >75% CPU/memory usage

### Example Alert Rule
```yaml
groups:
  - name: yakui-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"
```

## 📈 Dashboard Examples

### System Overview Dashboard
- **Service Health**: All service status indicators
- **Resource Usage**: CPU, memory, disk, network
- **Request Metrics**: Traffic patterns, response times
- **Error Tracking**: Error rates and types

### Application Performance Dashboard
- **API Performance**: Endpoint response times
- **Database Metrics**: Query performance, connections
- **Cache Performance**: Hit rates, memory usage
- **User Experience**: Frontend performance metrics

## 🛠️ Development Setup

### Local Prometheus
```bash
# Run Prometheus locally
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v $(pwd)/deployment/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

### Local Grafana
```bash
# Run Grafana locally
docker run -d \
  --name grafana \
  -p 3000:3000 \
  -e "GF_SECURITY_ADMIN_PASSWORD=admin" \
  grafana/grafana
```

## 🐛 Troubleshooting

### Common Issues

1. **Targets Down**:
   ```bash
   # Check service connectivity
   curl http://frontend:5173/metrics
   curl http://backend:3001/api/metrics
   ```

2. **Missing Metrics**:
   ```bash
   # Verify scrape configuration
   curl http://localhost:9090/api/v1/targets
   ```

3. **High Resource Usage**:
   ```bash
   # Check retention settings
   docker compose exec prometheus \
     promtool query instant 'prometheus_tsdb_retention_limit_bytes'
   ```

### Debug Commands
```bash
# Check Prometheus configuration
docker compose exec prometheus promtool check config /etc/prometheus/prometheus.yml

# View active targets
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets'

# Test metric queries
curl -s 'http://localhost:9090/api/v1/query?query=up' | jq
```

## 🔒 Security Considerations

### Authentication
- **Basic Auth**: Configure username/password for Prometheus
- **OAuth Integration**: Use external identity providers
- **Network Policies**: Restrict access to monitoring services

### Data Protection
- **TLS Encryption**: Enable HTTPS for all monitoring endpoints
- **Data Retention**: Configure appropriate retention policies
- **Access Control**: Role-based access to sensitive metrics

## 📚 Additional Resources

- **[Prometheus Documentation](https://prometheus.io/docs/)**
- **[Grafana Documentation](https://grafana.com/docs/)**
- **[Docker Monitoring Guide](../docker/README.md#monitoring-integration)**
- **[Kubernetes Monitoring](../kub/README.md#monitoring--observability)**

## 🤝 Contributing

When adding new monitoring configurations:

1. **Update scrape configs** in `prometheus.yml`
2. **Add corresponding dashboards** in Grafana
3. **Define appropriate alerts** for new services
4. **Document custom metrics** and their purpose
5. **Test configurations** in development environment

For more details, see the [Git Workflow Guide](../../docs/guides/GIT_WORKFLOW.md).