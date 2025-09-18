# Kubernetes Admin UI

A modern, React-based web interface for Kubernetes cluster administration with native API integration, RBAC authentication, and comprehensive cluster management capabilities.

![Kubernetes Admin UI](https://img.shields.io/badge/Kubernetes-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Material-UI](https://img.shields.io/badge/Material--UI-0081CB?style=for-the-badge&logo=material-ui&logoColor=white)

## Features

### 🔐 Authentication & Security
- **Native Kubernetes RBAC Integration**: Uses Kubernetes service accounts and RBAC for authentication
- **Multiple Authentication Methods**: 
  - Default kubeconfig (`~/.kube/config`)
  - Custom kubeconfig content
  - Service account tokens
- **Secure Design**: Built with security-first principles

### 🌐 Cluster Management
- **Cluster Topology Visualization**: Interactive cluster node visualization with health status
- **Real-time Dashboard**: Cluster overview with key metrics and recent events
- **Node Management**: View node details, resource capacity, and health status

### 🏗️ Namespace & Resource Management
- **Namespace CRUD Operations**: Create, view, and delete namespaces with labels
- **Resource Overview**: Monitor pods, resource quotas, and usage per namespace
- **Custom Resource Definitions (CRDs)**: Discover and manage CRDs by API groups

### 👥 RBAC Administration
- **Service Account Management**: View and manage service accounts across namespaces
- **Role & Role Binding Management**: Comprehensive RBAC role administration
- **Permissions Matrix**: Visual representation of permissions and bindings

### 🔍 Monitoring & Observability
- **Cluster Events**: Real-time cluster events monitoring
- **Resource Metrics**: CPU, memory, and storage utilization (when metrics-server is available)
- **Logs Viewer**: Pod logs viewing with filtering capabilities

### 💻 Modern UI/UX
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Hamburger Menu Navigation**: Collapsible sidebar with organized menu structure
- **Material Design**: Modern Material-UI components with consistent theming
- **Dark/Light Theme Support**: Adaptable to user preferences

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Access to a Kubernetes cluster
- kubectl configured with appropriate permissions

### Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Access the application**
   - Open http://localhost:5173
   - The app will use your default kubeconfig

### Authentication Methods

#### Method 1: Default Kubeconfig (Recommended for local development)
- Select "Default Config" tab
- Click "Connect to Cluster"
- Uses `~/.kube/config` automatically

#### Method 2: Custom Kubeconfig
- Select "Custom Config" tab
- Paste your kubeconfig YAML content
- Click "Connect to Cluster"

#### Method 3: Service Account Token
- Select "Token Auth" tab
- Enter your service account token
- Click "Connect to Cluster"

## Production Deployment

### Docker Build
```bash
# Build the Docker image
docker build -t k8s-admin-ui:latest .

# Run locally
docker run -p 8080:8080 k8s-admin-ui:latest
```

### Kubernetes Deployment
```bash
# Deploy to Kubernetes
kubectl apply -f k8s-deployment.yaml

# Port forward for local access
kubectl port-forward -n k8s-admin-ui service/k8s-admin-ui 8080:80
```

## Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Architecture

Built with modern web technologies:
- **Frontend**: React 18+ with TypeScript
- **UI Framework**: Material-UI (MUI) v5
- **State Management**: React Query + Context API
- **Kubernetes Client**: `@kubernetes/client-node`
- **Build Tool**: Vite
- **Containerization**: Docker with multi-stage builds

## Security

The application implements security best practices:
- RBAC-based authentication
- Read-only permissions by default
- Secure container configuration
- Security headers and CSP

## Components Implemented

✅ **Dashboard**: Cluster overview with metrics and events  
✅ **Cluster Topology**: Interactive node visualization  
✅ **Namespace Manager**: CRUD operations for namespaces  
✅ **CRD Manager**: Custom Resource Definition discovery  
✅ **RBAC Manager**: Service accounts, roles, and bindings  
✅ **Authentication**: Multiple auth methods with persistent sessions  
✅ **Responsive Layout**: Material-UI with hamburger menu  

## License

MIT License - see [LICENSE](LICENSE) file for details.
