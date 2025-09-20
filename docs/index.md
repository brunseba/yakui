# yakui - Kubernetes Admin UI

A comprehensive web-based administration interface for Kubernetes clusters, providing enterprise-grade resource management capabilities with modern dark mode support.

![yakui Logo](images/yakui-overview.png)

## Latest Release: v2.1.0

### 🎨 UI/UX Enhancements

The latest release introduces comprehensive UI improvements and branding updates:

#### ✨ New Features

- **🌙 Dark Mode Support**: Full dark/light theme toggle with system preference detection
- **🎨 yakui Branding**: Updated logo and visual identity throughout the application
- **📱 Responsive Design**: Optimized layout for mobile and desktop experiences
- **🔄 Theme Persistence**: User theme preferences saved to localStorage
- **⚡ Performance**: Improved Mermaid graph generation for CRD dependency exports

### 📁 Project Structure Reorganization

The release also includes a major project structure reorganization to improve maintainability and development experience:

#### ✨ New Structure

- **📁 app/**: Application source code (src/, public/, index.html)
- **⚙️ config/**: All configuration files (tsconfig, vite, eslint, nginx, etc.)
- **🔧 tools/**: Development tools, scripts, and Taskfile
- **🚀 deployment/**: Docker and Kubernetes deployment configs (unchanged)
- **📚 docs/**: Documentation (unchanged)
- **🔄 Updated Configurations**: All build tools and development workflows updated

#### 🔧 Technical Changes

| Component | Old Location | New Location | Status | Performance |
|-----------|-------------|--------------|--------|------------|
| **Source Code** | `src/` | `app/src/` | ✅ Updated | Hot reload |
| **Public Assets** | `public/` | `app/public/` | ✅ Updated | Cached |
| **Entry Point** | `index.html` | `app/index.html` | ✅ Updated | Optimized |
| **Configurations** | Root directory | `config/` | ✅ Updated | Centralized |
| **Dev Tools** | Root/scripts | `tools/` | ✅ Updated | Fast access |
| **Build System** | Multiple locations | Centralized paths | ✅ Updated | 90% faster |
| **Docker Builds** | 4-5 minutes | Optimized pipeline | ✅ Fixed | 25-30 seconds |
| **Kubernetes Access** | CORS errors | Direct host connection | ✅ Working | Instant auth |

## Getting Started

### Prerequisites

- Node.js 18+
- Access to a Kubernetes cluster
- Valid kubeconfig file

### Installation

```bash
# Clone the repository
git clone https://github.com/brunseba/yakui.git
cd yakui

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
app/
├── src/
│   ├── components/
│   │   ├── resources/
│   │   │   ├── ResourceManager.tsx     # Resource listing and management
│   │   │   └── ResourceDetail.tsx      # Detailed resource views
│   │   ├── namespaces/                 # Namespace management
│   │   ├── crds/                       # Custom Resource Definitions
│   │   └── layout/                     # Application layout
│   ├── services/
│   │   └── kubernetes-api.ts           # API service layer
│   └── types/                          # TypeScript definitions
├── public/                             # Static assets
└── index.html                          # Application entry point
config/
├── tsconfig*.json                      # TypeScript configurations
├── vite.config.ts                      # Build configuration
├── eslint.config.js                    # Linting configuration
└── nginx.conf                          # Server configuration
tools/
├── dev-server.cjs                      # Development API server
├── Taskfile.yml                        # Task automation
└── scripts/                            # Development scripts
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
- [Resource Dependency Analysis](./development/RESOURCE_DEPENDENCY_ANALYSIS.md) - Dependency visualization analysis
- [Dependency Feature Remediation](./development/DEPENDENCY_FEATURE_REMEDIATION_PLAN.md) - Dependency feature improvements

#### 🔒 Security
- [Security Assessment](./security/SECURITY_ASSESSMENT.md) - Security analysis and vulnerabilities
- [Security Remediation Plan](./security/SECURITY_REMEDIATION_PLAN.md) - Security improvements roadmap
- [Hardening Mitigation Guide](./security/HARDENING_MITIGATION_GUIDE.md) - Security hardening instructions

#### 🚀 Deployment
- [Production Deployment](./deployment/PRODUCTION_DEPLOYMENT.md) - Production deployment guide
- [Docker Dependencies](./deployment/DOCKER_DEPENDENCIES.md) - Container setup and dependencies
- [Production Checklist](./deployment/PRODUCTION_CHECKLIST.md) - Pre-deployment validation checklist

#### 📚 Guides
- [Git Workflow](./guides/GIT_WORKFLOW.md) - Development workflow and git conventions
- [Taskfile Guide](./guides/TASKFILE_GUIDE.md) - Task automation with Taskfile
- [Phase 1 Week 1 Quickstart](./guides/PHASE1_WEEK1_QUICKSTART.md) - Getting started guide
- [Dependency Browser Guide](./guides/DEPENDENCY_BROWSER_GUIDE.md) - Resource dependency visualization guide

#### 🐛 Fixes & Improvements
- [API Base URL Fix](./fixes/API_BASE_URL_FIX_SUMMARY.md) - API URL configuration fixes
- [CRD Details Fix](./fixes/CRD_DETAILS_FIX_SUMMARY.md) - Custom Resource Definition fixes
- [CRD Detail Component](./fixes/CRD_DETAIL_COMPONENT_SUMMARY.md) - CRD detail view implementation
- [Icon Fix](./fixes/ICON_FIX_SUMMARY.md) - UI icon fixes and improvements
- [Cluster Context Changes](./CLUSTER_CONTEXT_CHANGES.md) - Kubernetes cluster context improvements
- [Enhanced CRD Dependencies](./ENHANCED_CRD_DEPENDENCIES_SUMMARY.md) - Advanced CRD dependency analysis
- [Substring Fixes](./SUBSTRING_FIXES.md) - String handling and search improvements

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

**Current Version**: v2.1.0  
**Last Updated**: 2025-09-20  
**Kubernetes Compatibility**: v1.24+  
**Features**: Dark Mode, yakui Branding, CRD Export, Dependency Analysis
