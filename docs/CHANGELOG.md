# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.1.0] - 2025-09-19

### Added
- **Resource Detail Views**: Comprehensive detail views for native Kubernetes resources
  - Pod details with status, containers, and node information
  - Deployment details with replica status and strategy information
  - Service details with configuration and ports table
  - ConfigMap details with data viewer and expandable content
  - Secret details with secure key display (values hidden for security)

- **Interactive Resource Management**: 
  - Tabbed interface showing Details, Events, and Related Resources
  - Resource-specific event filtering and display
  - Related resources discovery and navigation
  - YAML viewer with Monaco editor integration
  - Pod logs viewer with terminal-style interface

- **Enhanced Navigation**:
  - New routing for resource details (`/resources/:type/:namespace/:name`)
  - Resource Manager added to main navigation menu
  - View Details buttons added to all resource types in ResourceManager
  - Proper URL encoding for resource names with special characters

- **Backend API Endpoints**:
  - `GET /api/resources/:type/:namespace/:name` - Get resource details
  - `GET /api/resources/:type/:namespace/:name/events` - Get resource events
  - `GET /api/resources/:type/:namespace/:name/related` - Get related resources
  - `GET /api/resources/pod/:namespace/:name/logs` - Get pod logs
  - `DELETE /api/resources/:type/:namespace/:name` - Delete resource

- **Management Actions**:
  - View resource details with comprehensive information display
  - View YAML definition with syntax highlighting
  - View pod logs for debugging and monitoring
  - Delete resources with confirmation dialogs
  - Edit capability (placeholder for future implementation)

### Enhanced
- **ResourceManager Component**: Added View Details navigation buttons with primary color styling
- **API Service**: Extended kubernetes-api.ts with resource management methods
- **UI/UX**: Responsive design with proper loading states and error handling

### Technical Details
- Supported resource types: pods, deployments, services, configmaps, secrets
- Object parameter format for Kubernetes API calls (fixed compatibility issues)
- Proper URL encoding/decoding for resource names
- Grid v2 migration for Material-UI components

### Breaking Changes
- New API endpoints added for resource management
- Enhanced backend server with resource-specific endpoints

---

## [Unreleased]
- Initial project setup and core functionality (pre-v1.1.0)

[v1.1.0]: https://github.com/user/kubernetes-admin-ui/releases/tag/v1.1.0