# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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