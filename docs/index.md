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

## Documentation Structure

### 📁 Organization

Documentation is organized into the following categories:

#### 🔧 Development
- [RBAC Development Complete](./development/RBAC_DEVELOPMENT_COMPLETE.md) - RBAC feature implementation summary
- [RBAC Manager](./development/RBAC_MANAGER.md) - RBAC management functionality
- [RBAC Detail View](./development/RBAC_DETAIL_VIEW_README.md) - Detailed RBAC resource views
- [Kubernetes Resource Manager](./development/KUBERNETES_RESOURCE_MANAGER_SUMMARY.md) - Resource management features

#### 🔒 Security
- [Security Assessment](./security/SECURITY_ASSESSMENT.md) - Security analysis and vulnerabilities
- [Security Remediation Plan](./security/SECURITY_REMEDIATION_PLAN.md) - Security improvements roadmap
- [Hardening Mitigation Guide](./security/HARDENING_MITIGATION_GUIDE.md) - Security hardening instructions

#### 🚀 Deployment
- [Production Deployment](./deployment/PRODUCTION_DEPLOYMENT.md) - Production deployment guide
- [Docker Dependencies](./deployment/DOCKER_DEPENDENCIES.md) - Container setup and dependencies

#### 📚 Guides
- [Git Workflow](./guides/GIT_WORKFLOW.md) - Development workflow and git conventions
- [Taskfile Guide](./guides/TASKFILE_GUIDE.md) - Task automation with Taskfile
- [Phase 1 Week 1 Quickstart](./guides/PHASE1_WEEK1_QUICKSTART.md) - Getting started guide

#### 🐛 Fixes & Improvements
- [API Base URL Fix](./fixes/API_BASE_URL_FIX_SUMMARY.md) - API URL configuration fixes
- [CRD Details Fix](./fixes/CRD_DETAILS_FIX_SUMMARY.md) - Custom Resource Definition fixes
- [CRD Detail Component](./fixes/CRD_DETAIL_COMPONENT_SUMMARY.md) - CRD detail view implementation
- [Icon Fix](./fixes/ICON_FIX_SUMMARY.md) - UI icon fixes and improvements

#### 📋 Project Files
- [Changelog](./CHANGELOG.md) - Release notes and version history
- [Implementation Roadmap](./IMPLEMENTATION_ROADMAP.md) - Development roadmap
- [Project Completion](./PROJECT_COMPLETION.md) - Project milestones and completion status
- [Samples](./samples.md) - Code examples and samples

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for detailed release notes.

## License

This project is licensed under the MIT License.

---

**Current Version**: v1.1.0  
**Last Updated**: 2025-09-20  
**Kubernetes Compatibility**: v1.24+
