# Kubernetes Admin UI

A comprehensive web-based administration interface for Kubernetes clusters, providing enterprise-grade resource management capabilities.

## Latest Release: v1.1.0

### 🎉 Resource Detail Actions

The latest release introduces comprehensive resource detail views and management capabilities:

#### ✨ Key Features

- **📋 Resource Detail Views**: In-depth views for pods, deployments, services, configmaps, and secrets
- **📊 Tabbed Interface**: Organized display of resource details, events, and related resources
- **🔍 YAML Viewer**: Integrated Monaco editor with syntax highlighting
- **📝 Pod Logs**: Terminal-style log viewer for debugging and monitoring
- **🔗 Navigation**: Enhanced resource browsing with detailed navigation
- **⚡ Management Actions**: View, edit, and delete resources with confirmation dialogs

#### 🚀 Resource Types Supported

| Resource Type | Detail View | Events | Logs | YAML | Actions |
|---------------|-------------|---------|------|------|---------|
| **Pods** | ✅ Status, containers, node info | ✅ | ✅ | ✅ | View, Delete |
| **Deployments** | ✅ Replicas, strategy, template | ✅ | ❌ | ✅ | View, Delete |
| **Services** | ✅ Configuration, ports, IPs | ✅ | ❌ | ✅ | View, Delete |
| **ConfigMaps** | ✅ Data viewer, keys | ✅ | ❌ | ✅ | View, Delete |
| **Secrets** | ✅ Secure key display | ✅ | ❌ | ✅ | View, Delete |

## Getting Started

### Prerequisites

- Node.js 18+
- Access to a Kubernetes cluster
- Valid kubeconfig file

### Installation

```bash
# Clone the repository
git clone https://github.com/user/kubernetes-admin-ui.git
cd kubernetes-admin-ui

# Install dependencies
npm install

# Start development servers
npm run dev:full
```

### Usage

1. **Access the UI**: Open `http://localhost:5173`
2. **Navigate Resources**: Use the sidebar menu to access "Resource Manager"
3. **View Details**: Click the "View Details" button (🔍) on any resource
4. **Explore Features**: Use tabs to see Details, Events, and Related Resources

## Architecture

### Frontend
- **React 18** with TypeScript
- **Material-UI v5** for components
- **Monaco Editor** for YAML editing
- **React Router** for navigation

### Backend
- **Express.js** API server
- **Kubernetes JavaScript Client** for cluster communication
- **RESTful API** endpoints for resource management

### API Endpoints

```
GET    /api/resources/:type/:namespace/:name          # Resource details
GET    /api/resources/:type/:namespace/:name/events   # Resource events
GET    /api/resources/:type/:namespace/:name/related  # Related resources
GET    /api/resources/pod/:namespace/:name/logs       # Pod logs
DELETE /api/resources/:type/:namespace/:name          # Delete resource
```

## Development

### Project Structure

```
src/
├── components/
│   ├── resources/
│   │   ├── ResourceManager.tsx     # Resource listing and management
│   │   └── ResourceDetail.tsx      # Detailed resource views
│   ├── namespaces/                 # Namespace management
│   ├── crds/                       # Custom Resource Definitions
│   └── layout/                     # Application layout
├── services/
│   └── kubernetes-api.ts           # API service layer
└── types/                          # TypeScript definitions
```

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/new-feature`
3. Follow conventional commits: `feat(scope): description`
4. Submit a pull request

## Changelog

See [CHANGELOG.md](../CHANGELOG.md) for detailed release notes.

## License

This project is licensed under the MIT License.

---

**Current Version**: v1.1.0  
**Last Updated**: 2025-09-19  
**Kubernetes Compatibility**: v1.24+