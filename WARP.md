# Warp AI Agent Rules - YAKUI (Kubernetes Admin UI)

Project-specific rules for AI assistants working on the YAKUI (Yet Another Kubernetes UI) repository.

---

## Project Overview

**Repository**: kubernetes-admin-ui (YAKUI)  
**Purpose**: Modern React-based web interface for Kubernetes cluster administration with full-stack API integration  
**Frontend**: React 19 + TypeScript + Material-UI v7 + Vite  
**Backend**: Node.js Express + Kubernetes Client Node  
**Key Feature**: CRD Canvas Composer - Interactive visual editor for Custom Resource Definitions  
**Architecture**: Full-stack with separate frontend/backend, Docker deployment, Kubernetes manifests

---

## Development Standards

### Technology Stack

**Frontend Technologies**:
- **React 19** with TypeScript (strict mode)
- **Material-UI (MUI) v7** - Material Design components
- **React Router v7** - Client-side routing
- **TanStack Query v5** - Server state management
- **Monaco Editor** - YAML/JSON editing
- **@xyflow/react** - Interactive CRD canvas diagrams
- **Vite** - Build tool and dev server

**Backend Technologies**:
- **Node.js 18+** with Express
- **@kubernetes/client-node** - Native Kubernetes client
- **CORS** enabled for development
- **TypeScript** for type safety

**Testing & Quality**:
- **Vitest** - Unit testing framework
- **React Testing Library** - Component testing
- **ESLint** - Code quality
- **TypeScript** - Type checking

### Project Structure

```
kubernetes-admin-ui/
├── app/                        # Application source
│   ├── src/                    # React TypeScript source
│   │   ├── components/         # React components
│   │   ├── contexts/           # React contexts
│   │   ├── hooks/              # Custom React hooks
│   │   ├── pages/              # Page components
│   │   ├── services/           # API services
│   │   ├── types/              # TypeScript types
│   │   └── utils/              # Utility functions
│   ├── public/                 # Static assets
│   └── index.html              # Entry HTML
├── config/                     # All configuration files
│   ├── vite.config.ts          # Vite build config
│   ├── tsconfig*.json          # TypeScript configs
│   ├── eslint.config.js        # ESLint config
│   └── vitest.config.ts        # Vitest config
├── tools/                      # Development tools
│   ├── dev-server.cjs          # Express API server
│   ├── Taskfile.yml            # Task automation
│   └── scripts/                # Build/deploy scripts
├── deployment/                 # Deployment configs
│   ├── docker/                 # Docker files (90% faster builds!)
│   └── kub/                    # Kubernetes manifests
├── docs/                       # Documentation
└── workspace/                  # Temporary workspace
```

---

## Code Organization Rules

### Frontend Structure (app/src/)

1. **Components** (`components/`):
   - One component per file
   - Use functional components with hooks
   - Include TypeScript interfaces for props
   - Export component as default
   - Keep components under 300 lines

2. **Pages** (`pages/`):
   - Top-level route components
   - Compose smaller components
   - Handle page-level state and data fetching

3. **Hooks** (`hooks/`):
   - Custom React hooks for reusable logic
   - Prefix with `use` (e.g., `useKubernetes`, `useAuth`)
   - Include TypeScript types for return values

4. **Services** (`services/`):
   - API client functions
   - Use axios for HTTP requests
   - Handle errors consistently
   - Return typed responses

5. **Types** (`types/`):
   - TypeScript interfaces and types
   - Group related types in files
   - Export all types explicitly

6. **Contexts** (`contexts/`):
   - React Context providers
   - Include hooks for consuming context
   - Separate context definition from provider

### Backend Structure (tools/)

1. **API Server** (`dev-server.cjs`):
   - Express.js REST API
   - Route handlers organized by resource type
   - Middleware for authentication and error handling
   - Kubernetes client integration

2. **Routes Organization**:
   - `/api/auth/*` - Authentication endpoints
   - `/api/resources/*` - Kubernetes resource management
   - `/api/crds/*` - Custom Resource Definitions
   - `/api/dependencies/*` - CRD relationship analysis
   - `/api/namespaces/*` - Namespace management
   - `/api/nodes` - Cluster nodes
   - `/api/events` - Cluster events

---

## Git Workflow

### Conventional Commits (REQUIRED)

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature (component, page, API endpoint)
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: UI/styling changes (no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance (dependencies, config)
- `ci`: CI/CD changes

**Scopes**:
- `frontend`: Frontend changes
- `backend`: Backend API changes
- `canvas`: CRD Canvas Composer
- `crd`: CRD-related features
- `auth`: Authentication
- `ui`: UI/UX improvements
- `docker`: Docker configuration
- `k8s`: Kubernetes manifests
- `docs`: Documentation
- `deps`: Dependencies

**Examples**:
```bash
feat(canvas): add drag-and-drop CRD relationship editor
fix(backend): resolve kubeconfig permission issues
docs(readme): update Docker deployment instructions
style(ui): improve responsive layout for mobile devices
refactor(frontend): migrate to TanStack Query v5
test(canvas): add unit tests for CRD analysis
chore(deps): update Material-UI to v7
```

**Co-authorship**:
```
feat(canvas): add interactive CRD schema explorer

- Add schema property tree view
- Include field type visualization
- Support nested schema navigation

Co-Authored-By: Warp <agent@warp.dev>
```

### Branching Strategy

- `main` - Production-ready code
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates
- `refactor/*` - Code refactoring

### Pre-commit Checklist

Before committing:
1. TypeScript compiles: `npm run build`
2. Linting passes: `npm run lint`
3. Tests pass: `npm run test:run`
4. Code formatted (auto-format on save recommended)
5. No console.log statements in production code

---

## Frontend Development Standards

### React Component Guidelines

**Functional Components with Hooks**:
```typescript
import React from 'react';
import { Box, Typography } from '@mui/material';

interface DeploymentCardProps {
  name: string;
  replicas: number;
  namespace: string;
  onScale?: (newReplicas: number) => void;
}

export const DeploymentCard: React.FC<DeploymentCardProps> = ({
  name,
  replicas,
  namespace,
  onScale
}) => {
  const handleScale = () => {
    onScale?.(replicas + 1);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6">{name}</Typography>
      <Typography variant="body2">
        Namespace: {namespace} | Replicas: {replicas}
      </Typography>
    </Box>
  );
};
```

**Custom Hooks**:
```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchDeployments } from '../services/kubernetes';

export const useDeployments = (namespace?: string) => {
  return useQuery({
    queryKey: ['deployments', namespace],
    queryFn: () => fetchDeployments(namespace),
    refetchInterval: 30000, // 30 seconds
    staleTime: 15000
  });
};
```

**State Management**:
- Use React Context for global state (auth, theme)
- Use TanStack Query for server state
- Use local state for component-specific state
- Avoid prop drilling - use context or composition

### Material-UI Standards

**Component Styling**:
```typescript
import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';

// Prefer sx prop for one-off styles
<Box sx={{ display: 'flex', gap: 2, p: 3 }}>
  {children}
</Box>

// Use styled() for reusable styled components
const StyledCard = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  }
}));
```

**Responsive Design**:
```typescript
<Box
  sx={{
    display: 'flex',
    flexDirection: { xs: 'column', md: 'row' },
    gap: { xs: 1, md: 2 },
    p: { xs: 2, sm: 3, md: 4 }
  }}
>
  {children}
</Box>
```

### TypeScript Guidelines

**Strict Type Safety**:
```typescript
// Define interfaces for all props
interface ResourceDetailProps {
  resourceType: string;
  namespace: string;
  name: string;
}

// Type API responses
interface DeploymentResponse {
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp: string;
  };
  spec: {
    replicas: number;
  };
  status: {
    availableReplicas: number;
    readyReplicas: number;
  };
}

// Use generics for reusable functions
function fetchResource<T>(url: string): Promise<T> {
  return axios.get<T>(url).then(res => res.data);
}
```

**Avoid `any` type**:
- Use `unknown` for truly unknown types
- Define proper interfaces
- Use utility types: `Partial<T>`, `Pick<T, K>`, `Omit<T, K>`

---

## Backend Development Standards

### API Endpoint Structure

```javascript
// Express route handler
router.get('/api/resources/deployments', async (req, res) => {
  try {
    const { namespace } = req.query;
    
    // Validate input
    if (namespace && typeof namespace !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid namespace parameter' 
      });
    }

    // Use Kubernetes client
    const k8sApi = kc.makeApiClient(k8s.AppsV1Api);
    
    // Fetch data
    const response = namespace
      ? await k8sApi.listNamespacedDeployment(namespace)
      : await k8sApi.listDeploymentForAllNamespaces();

    // Transform response
    const deployments = response.body.items.map(item => ({
      name: item.metadata.name,
      namespace: item.metadata.namespace,
      replicas: item.spec.replicas,
      availableReplicas: item.status.availableReplicas
    }));

    res.json({ items: deployments });
    
  } catch (error) {
    console.error('Error fetching deployments:', error);
    res.status(500).json({ 
      error: 'Failed to fetch deployments',
      message: error.message 
    });
  }
});
```

### Error Handling

**Consistent Error Responses**:
```javascript
// Standard error format
{
  "error": "Human-readable error message",
  "message": "Technical details",
  "code": "ERROR_CODE" // optional
}
```

**Error Middleware**:
```javascript
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});
```

---

## Testing Standards

### Component Testing

**Test Structure**:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeploymentCard } from './DeploymentCard';

describe('DeploymentCard', () => {
  it('renders deployment information', () => {
    render(
      <DeploymentCard 
        name="my-app" 
        replicas={3} 
        namespace="default" 
      />
    );
    
    expect(screen.getByText('my-app')).toBeInTheDocument();
    expect(screen.getByText(/Replicas: 3/)).toBeInTheDocument();
  });

  it('calls onScale when scale button clicked', async () => {
    const onScale = vi.fn();
    const user = userEvent.setup();
    
    render(
      <DeploymentCard 
        name="my-app" 
        replicas={3} 
        namespace="default"
        onScale={onScale}
      />
    );
    
    await user.click(screen.getByRole('button', { name: /scale/i }));
    
    expect(onScale).toHaveBeenCalledWith(4);
  });
});
```

### Testing Commands

```bash
# Run tests in watch mode
npm run test

# Run tests with UI
npm run test:ui

# Run tests once (CI mode)
npm run test:run

# Generate coverage report
npm run test:coverage
```

### Coverage Requirements

- **Target**: ≥70% overall coverage
- **Components**: ≥80% coverage for critical components
- **Services**: 100% coverage for API client functions
- **Utils**: 90% coverage for utility functions

---

## Docker Development

### Docker Optimization (90% Faster!)

The project includes optimized Docker configurations:

**Build Performance**:
- Original: 4-5 minutes
- Optimized: 25-30 seconds (90% faster!)
- Features: BuildKit, smart caching, multi-stage builds

**Development Modes**:

1. **Hybrid (Recommended)**:
   ```bash
   cd deployment/docker
   ./build-fast.sh
   # Frontend in container, backend on host
   ```

2. **Full Docker**:
   ```bash
   docker compose -f deployment/docker/docker-compose.fast.yml up
   ```

3. **Host Development**:
   ```bash
   npm run dev:full
   ```

### Docker Commands

```bash
# Build optimized images
export DOCKER_BUILDKIT=1
docker build -f deployment/docker/Dockerfile.dev-frontend -t yakui-frontend .

# Start services
docker compose -f deployment/docker/docker-compose.fast.yml up

# View logs
docker compose -f deployment/docker/docker-compose.fast.yml logs -f

# Execute commands
docker compose -f deployment/docker/docker-compose.fast.yml exec frontend npm test
```

---

## CRD Canvas Composer

### Key Features

The CRD Canvas Composer is a major feature requiring special attention:

1. **Interactive Visual Editor**:
   - Drag-and-drop CRD nodes
   - Automatic relationship detection
   - Smart grid layout with auto-positioning

2. **Relationship Analysis**:
   - API endpoint: `GET /api/dependencies/crd-relationships`
   - Detects CRD-to-CRD references in schemas
   - Optimized backend analysis

3. **Schema Explorer**:
   - Property tree visualization
   - Field type inspection
   - Nested schema navigation

### Working with Canvas

**Component Structure**:
```
app/src/pages/CRDCanvas/
├── CRDCanvasPage.tsx       # Main canvas component
├── CRDNode.tsx             # Individual CRD node
├── CRDEdge.tsx             # Relationship edge
├── CanvasToolbar.tsx       # Canvas controls
└── hooks/
    ├── useCRDCanvas.ts     # Canvas state management
    └── useCRDRelationships.ts  # Relationship fetching
```

**Development Guidelines**:
- Use `@xyflow/react` for canvas rendering
- Optimize performance for large CRD graphs (>50 nodes)
- Implement debouncing for auto-save
- Cache CRD analysis results

---

## Documentation Standards

### Code Documentation

**Component Documentation**:
```typescript
/**
 * DeploymentCard displays information about a Kubernetes Deployment
 * and provides controls for scaling.
 * 
 * @component
 * @example
 * ```tsx
 * <DeploymentCard
 *   name="my-app"
 *   replicas={3}
 *   namespace="default"
 *   onScale={(newReplicas) => console.log(newReplicas)}
 * />
 * ```
 */
export const DeploymentCard: React.FC<DeploymentCardProps> = (props) => {
  // Implementation
};
```

**Function Documentation**:
```typescript
/**
 * Fetches deployments from the Kubernetes cluster
 * 
 * @param namespace - Optional namespace filter
 * @returns Promise resolving to array of deployments
 * @throws {KubernetesError} When API request fails
 */
export async function fetchDeployments(
  namespace?: string
): Promise<Deployment[]> {
  // Implementation
}
```

### Documentation Files

**Location**: `docs/` directory

**Key Documentation**:
- `docs/QUICK-START.md` - Getting started guide
- `docs/CONFIGURATION_GUIDE.md` - Configuration options
- `docs/CRD_COMPOSER_PHASE_3_SUMMARY.md` - Canvas feature guide
- `docs/ARCHITECTURE.md` - System architecture
- `deployment/docker/README.md` - Docker deployment
- `deployment/kub/README.md` - Kubernetes deployment

**When to Update Docs**:
- New features added
- API endpoints changed
- Configuration options modified
- Deployment process updated

---

## Task Automation

### Taskfile Usage

The project uses [Taskfile.dev](https://taskfile.dev/) for automation:

**Common Tasks**:
```bash
task fresh          # Fresh development start (install + start)
task dev            # Start development servers
task clean:dev      # Clean and restart
task ports          # Check port usage
task health         # Check application health
task --list         # Show all tasks
```

**Task Configuration**: `tools/Taskfile.yml`

---

## AI Assistant Behavior Guidelines

### When Working on This Project

1. **Frontend Development**:
   - Use Material-UI components consistently
   - Follow React 19 best practices (no class components)
   - Implement proper TypeScript typing
   - Use TanStack Query for data fetching
   - Keep components under 300 lines
   - Write tests for new components

2. **Backend Development**:
   - Validate all input parameters
   - Return consistent error responses
   - Use Kubernetes client correctly
   - Handle RBAC permissions properly
   - Add error logging
   - Document API endpoints

3. **CRD Canvas Features**:
   - Test with multiple CRDs (10+, 50+, 100+ nodes)
   - Optimize performance for large graphs
   - Cache analysis results
   - Implement proper loading states
   - Handle CRD schema edge cases

4. **Docker & Deployment**:
   - Use optimized Dockerfile configurations
   - Test in Docker before committing
   - Update deployment manifests when needed
   - Document environment variables

5. **Testing Requirements**:
   - Write tests for new features
   - Maintain ≥70% coverage
   - Test error cases
   - Mock external dependencies (Kubernetes API)

### What to Avoid

- ❌ Using `any` type in TypeScript
- ❌ Class components (use functional components)
- ❌ Inline styles (use Material-UI sx prop or styled())
- ❌ Hard-coded API URLs (use environment config)
- ❌ Committing console.log statements
- ❌ Large components (>300 lines - split into smaller ones)
- ❌ Tight coupling between components
- ❌ Missing error handling
- ❌ Breaking Docker development workflow
- ❌ Reducing test coverage

### Feature Development Workflow

1. **Planning Phase**:
   - Review existing components and patterns
   - Check Material-UI component library
   - Plan component hierarchy
   - Consider responsive design

2. **Implementation Phase**:
   - Create TypeScript interfaces first
   - Build components bottom-up
   - Add TanStack Query hooks for data
   - Implement error boundaries
   - Write tests alongside code

3. **Backend Phase** (if API changes needed):
   - Define API endpoint structure
   - Implement Kubernetes client calls
   - Add error handling
   - Test with real cluster
   - Update API documentation

4. **Testing Phase**:
   - Write component tests
   - Test API endpoints
   - Check responsive behavior
   - Test error scenarios
   - Run full test suite

5. **Documentation Phase**:
   - Add JSDoc comments
   - Update relevant docs in `docs/`
   - Add examples if new feature
   - Update README if significant

6. **Review Phase**:
   - Run linting: `npm run lint`
   - Build check: `npm run build`
   - Test in Docker
   - Verify on real Kubernetes cluster
   - Commit with conventional commit message

---

## Environment Configuration

### Environment Variables

**Development** (`.env.development`):
```bash
VITE_API_URL=http://localhost:3001
VITE_ENABLE_MOCK_API=false
```

**Backend Configuration**:
- `PORT` - API server port (default: 3001)
- `KUBECONFIG` - Path to kubeconfig file
- `LOG_LEVEL` - Logging level (debug, info, warn, error)

### Configuration Files

**Location**: `config/` directory

**Key Configs**:
- `vite.config.ts` - Vite build and dev server
- `tsconfig.app.json` - TypeScript for app
- `tsconfig.node.json` - TypeScript for Node.js
- `eslint.config.js` - Linting rules
- `vitest.config.ts` - Test configuration

---

## Performance Optimization

### Frontend Performance

**Code Splitting**:
```typescript
import { lazy, Suspense } from 'react';

const CRDCanvasPage = lazy(() => import('./pages/CRDCanvas/CRDCanvasPage'));

<Suspense fallback={<LoadingSpinner />}>
  <CRDCanvasPage />
</Suspense>
```

**Memoization**:
```typescript
import { useMemo, useCallback } from 'react';

const filteredItems = useMemo(
  () => items.filter(item => item.status === 'active'),
  [items]
);

const handleClick = useCallback(
  (id: string) => {
    updateItem(id);
  },
  [updateItem]
);
```

**TanStack Query Optimization**:
```typescript
useQuery({
  queryKey: ['deployments', namespace],
  queryFn: fetchDeployments,
  staleTime: 30000,        // Don't refetch for 30s
  cacheTime: 300000,       // Keep in cache for 5min
  refetchInterval: 60000,  // Auto-refetch every 60s
  refetchOnWindowFocus: false
});
```

### Backend Performance

**Response Caching**:
```javascript
const cache = new Map();

router.get('/api/crds', async (req, res) => {
  const cacheKey = 'all-crds';
  
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < 60000) { // 1 minute
      return res.json(cached.data);
    }
  }
  
  const data = await fetchCRDs();
  cache.set(cacheKey, { data, timestamp: Date.now() });
  res.json(data);
});
```

---

## Security Considerations

### Frontend Security

- Validate all user input
- Sanitize YAML/JSON before rendering
- Use Content Security Policy (CSP)
- No sensitive data in localStorage
- Proper CORS configuration

### Backend Security

- Validate Kubernetes RBAC permissions
- Never log sensitive data (tokens, kubeconfig)
- Use HTTPS in production
- Implement rate limiting
- Sanitize error messages (don't expose internals)

### Kubernetes Security

- Use service accounts with minimal RBAC
- Read-only permissions by default
- Never store kubeconfig in code
- Secure token handling
- Pod security contexts in deployments

---

## Key Repository Information

**URLs**:
- Repository: https://github.com/brunseba/yakui
- Issues: https://github.com/brunseba/yakui/issues
- Documentation: `docs/` directory

**Technology Stack**:
- React: 19
- Material-UI: 7
- TypeScript: 5.8
- Vite: 7
- Node.js: 18+
- Kubernetes Client: @kubernetes/client-node

**Development Servers**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/api/health

**Quality Targets**:
- Test Coverage: ≥70%
- Component Size: <300 lines
- Build Time: <30 seconds (Docker optimized)
- Type Safety: Strict TypeScript

---

**Last Updated**: December 2025  
**Version**: 1.0
