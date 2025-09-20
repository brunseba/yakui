# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2025-09-20

### ✨ Major New Features

#### Enhanced CRD Dependency Analysis
- **Multi-API Group Selection**: Advanced filtering and selection of API groups for targeted analysis
- **Enhanced Dependency Browser**: New comprehensive CRD dependency browser with real-time statistics
- **Advanced Visualization**: Configurable analysis depth with shallow/deep schema traversal
- **API Group Selector**: Interactive component with real-time CRD counts and metadata
- **Dependency Table**: Enhanced filtering and sorting capabilities for dependency relationships

#### Data Export & Analytics System
- **Multi-Format Export**: Support for JSON, CSV, Excel, PDF, and Markdown export formats
- **Advanced Analytics**: Dependency complexity metrics, circular dependency detection, isolation analysis
- **Metadata Tracking**: Comprehensive export metadata with timestamp, cluster info, and analysis options
- **Core Resources Config**: Built-in configuration for 20+ standard Kubernetes resource types
- **Schema Analysis**: OpenAPI v3 schema support with property traversal and validation

#### Infrastructure & Production Readiness
- **Environment Configuration**: Production-ready `.env.example` with comprehensive documentation
- **Configuration Validation**: Robust validation utilities for runtime configuration
- **Testing Infrastructure**: Automated dependency validation test suite (`test-dependencies.sh`)
- **Graph Dimensions Hook**: Responsive layout support for various screen sizes
- **Enhanced Error Handling**: Improved validation context with better error boundaries

### 🐛 Critical Bug Fixes

#### JavaScript/TypeScript Compatibility
- **Deprecated Method Fixes**: Replaced all `substr()` usage with modern `substring()` method
- **Type Safety Improvements**: Added comprehensive string type validation before method calls
- **Error Boundary Enhancements**: Improved exception handling and recovery mechanisms
- **Parsing Safety**: Enhanced dependency analyzer with null/undefined checking

### 📚 Documentation & Assets

#### Comprehensive Documentation
- **Enhanced CRD Dependencies Guide**: Complete implementation documentation with usage examples
- **Substring Fixes Documentation**: Detailed analysis of fixes and prevention strategies
- **Production Deployment Checklist**: Step-by-step production deployment guidelines
- **Cluster Context Changes**: Documentation for cluster configuration management
- **Development Remediation Plan**: Dependency feature development and maintenance guide

#### Brand Assets
- **yakui Logo**: Official PNG logo and XCF source files for consistent branding
- **Visual Identity**: Integration of yakui branding throughout the application

### 🔧 Developer Experience

#### Enhanced Development Workflow
- **Modular Architecture**: Clean separation of concerns with extensible component design
- **TypeScript Enhancements**: Comprehensive type definitions for export and analysis systems
- **Configuration-Driven**: Flexible analysis parameters with environment-based configuration
- **Robust Testing**: Cluster validation and dependency testing infrastructure
- **Error Handling**: Enhanced logging and graceful error recovery

### Technical Details

#### New Components Added
- `CRDAPIGroupSelector.tsx` - Multi-select interface for API groups
- `CRDDependencyBrowser.tsx` - Enhanced dependency browsing with advanced controls
- `CRDDetailSelector.tsx` - Detailed CRD selection and configuration
- `CRDDictionaryVisualization.tsx` - Schema-aware dependency visualization
- `DependencyTable.tsx` - Enhanced tabular dependency view
- `EnhancedCRDDependencyVisualization.tsx` - Advanced visualization with statistics

#### New APIs and Utilities
- `export.ts` - Comprehensive export type definitions
- `config-validation.ts` - Runtime configuration validation
- `dependency-theme.ts` - Theming support for dependency visualization
- `useGraphDimensions.ts` - Responsive graph layout hook
- `core-resources.json` - Standard Kubernetes resources configuration

#### Infrastructure Files
- `.env.example` - Production-ready environment template
- `test-dependencies.sh` - Automated testing script for dependency validation

### Migration Notes

This is a backwards-compatible enhancement release. Existing functionality remains unchanged while adding significant new capabilities.

#### For Users
- All existing features continue to work as before
- New enhanced CRD analysis features are available as optional improvements
- Export functionality provides new ways to share and analyze dependency data

#### For Developers
- New TypeScript types provide better development experience
- Enhanced error handling improves application reliability
- Modular architecture makes customization and extension easier

### Performance Improvements

- **Configurable Limits**: Environment-aware limits prevent resource exhaustion
- **Depth-Limited Traversal**: Prevents infinite recursion in complex schemas
- **Smart Filtering**: API group filtering reduces analysis scope and improves performance
- **Efficient Pattern Matching**: Optimized field name and description analysis

---

## [2.0.0] - 2025-09-20

### ⚠️ BREAKING CHANGES

- **Project Structure Reorganization**: Complete restructuring of project directories to improve maintainability and organization.

### Changed

- **Project Structure**: Reorganized entire codebase into logical directories:
  - `app/` - Contains application source code (`src/`, `public/`, `index.html`)
  - `config/` - Contains all configuration files (tsconfig, vite, eslint, nginx, etc.)
  - `tools/` - Contains development tools, scripts, and Taskfile
  - `deployment/` - Docker and Kubernetes deployment configs (unchanged)
  - `docs/` - Documentation (unchanged)

- **Build Configuration**: Updated all build tools and configurations:
  - Updated `package.json` scripts to reference new paths
  - Modified Vite configuration for new app directory structure
  - Updated TypeScript configurations with new paths and references
  - Moved and updated ESLint configuration
  - Updated Vitest configuration for new test paths

- **Docker Configuration**: Updated all Docker-related files:
  - Modified Dockerfiles to copy from correct source directories
  - Updated docker-compose.yml with new contexts and volumes
  - Updated .dockerignore patterns for new structure

- **Development Tools**: Updated development workflow:
  - Moved Taskfile to `tools/` directory with updated paths
  - Moved development server to `tools/dev-server.cjs`
  - Updated all scripts to work with new directory structure
  - Updated process management in Taskfile for new paths

### Technical Details

- All relative imports within the codebase remain unchanged
- Development workflow commands (`npm run dev`, `npm run build`) work as before
- Docker builds and deployment processes maintain compatibility
- API development server tested and verified working

### Migration Notes

For users updating from v1.x:
- No action required for normal development workflow
- Custom scripts referencing specific file paths may need updating
- CI/CD configurations should verify file paths are still correct

### Benefits

- **Better Organization**: Clear separation of concerns
- **Improved Maintainability**: Easier to locate and manage different file types
- **Enhanced Developer Experience**: Logical grouping reduces cognitive load
- **Future-Proofing**: Structure supports scaling and potential monorepo patterns

### Related

- GitHub Issue: [#2 - Project Structure Reorganization](https://github.com/brunseba/yakui/issues/2)
- Commit: `14dd625` - "refactor: reorganize project structure into logical directories"

---

## [1.0.0] - Previous releases

Previous version history before the major restructuring.