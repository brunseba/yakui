# Configuration Guide: Externalized Hardcoded Values

This guide documents the removal of hardcoded/mockup values from the frontend and their replacement with configurable environment variables.

## Overview

Previously, the application contained numerous hardcoded values throughout the codebase, making it difficult to adapt for different environments or deployments. This refactoring addresses this by:

1. Moving all hardcoded values to environment variables
2. Creating configurable mock data generation
3. Implementing a centralized configuration system
4. Providing environment-specific defaults

## Changes Made

### 1. Kubernetes Mock Service (`app/src/services/kubernetes-mock.ts`)

**Before:** Hardcoded node names, cluster information, namespaces, and timestamps.

**After:** Dynamic generation based on environment variables:

```typescript
// Example configuration
VITE_MOCK_CLUSTER_NAME=development-cluster
VITE_MOCK_USER_NAME=dev-user
VITE_MOCK_NODE_COUNT=2
VITE_MOCK_NAMESPACES=default,kube-system,monitoring
```

**Key improvements:**
- Node names and IDs are generated dynamically
- Mock data is configurable per environment
- Timestamps are calculated relative to current time
- Cluster information is environment-specific

### 2. RBAC Demo Component (`app/src/components/rbac/RBACDemo.tsx`)

**Before:** Static mock RBAC resources with hardcoded names and properties.

**After:** Dynamic resource generation using configuration:

```typescript
// Configuration variables
VITE_DEMO_SA_NAME=demo-service-account
VITE_DEMO_ROLE_NAME=demo-role
VITE_DEMO_USER_NAME=demo-user
VITE_DEMO_APP_NAME=demo-app
```

**Benefits:**
- Demo resources reflect actual environment naming
- Easy customization for different contexts
- Consistent with actual deployment patterns

### 3. Security Compliance Status (`app/src/components/security/SecurityComplianceStatus.tsx`)

**Before:** Static array of hardcoded security items.

**After:** Configurable security assessment framework:

- New configuration file: `app/src/config/security-compliance.ts`
- Environment-driven security item generation
- Configurable security assessments per environment
- Easy to enable/disable specific security checks

```typescript
// Example security configuration
VITE_SECURITY_AUTH_ENABLED=true
VITE_SECURITY_AUTH_TYPE=partial-mock
VITE_SECURITY_VALIDATION_ENABLED=true
```

### 4. Environment Configuration (`app/src/config/environment.ts`)

**Before:** Hardcoded default values throughout the configuration.

**After:** Complete externalization of configuration:

```typescript
// All values now come from environment variables
baseUrl: import.meta.env.VITE_API_BASE_URL || '/api'
timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000')
enableStubFeatures: import.meta.env.VITE_ENABLE_STUB_FEATURES === 'true'
```

### 5. Resource Manager Templates (`app/src/components/resources/ResourceManager.tsx`)

**Before:** Hardcoded Kubernetes resource templates.

**After:** Configurable template defaults:

```yaml
# Configurable values
VITE_DEFAULT_APP_NAME=sample-app
VITE_DEFAULT_CONTAINER_IMAGE=nginx:latest
VITE_DEFAULT_REPLICAS=3
VITE_DEFAULT_MEMORY_REQUEST=64Mi
```

### 6. Error Boundary (`app/src/components/common/ErrorBoundary.tsx`)

**Before:** Hardcoded support email address.

**After:** Configurable support information:

```typescript
VITE_SUPPORT_EMAIL=support@company.local
VITE_APP_NAME=Kubernetes Admin UI
```

## Environment Files

### Development Configuration
File: `config/.env.development`

Contains development-specific defaults with:
- Mock service enabled
- Verbose logging enabled
- Development-friendly security settings
- Local service endpoints

### Production Configuration Template
File: `config/.env.production.template`

Production-ready template with:
- Security hardening enabled
- Mock services disabled
- Appropriate resource limits
- Production-grade defaults

## Usage

### 1. Development Setup

```bash
# Use existing development configuration
npm run dev

# Or customize with environment variables
VITE_MOCK_CLUSTER_NAME=my-cluster npm run dev
```

### 2. Production Deployment

```bash
# Copy and configure production template
cp config/.env.production.template config/.env.production

# Edit with your production values
vi config/.env.production

# Build for production
npm run build
```

### 3. Custom Environments

```bash
# Create environment-specific configuration
cp config/.env.development config/.env.staging

# Customize for staging environment
# Set MODE=staging for environment-specific config
```

## Configuration Categories

### API Configuration
- `VITE_API_BASE_URL`: Backend API endpoint
- `VITE_API_TIMEOUT`: Request timeout in milliseconds
- `VITE_API_RETRIES`: Number of retry attempts

### Cluster Configuration
- `VITE_CLUSTER_CONTEXT`: Default Kubernetes context
- `VITE_CONNECTION_TIMEOUT`: Cluster connection timeout
- `VITE_SERVER_MASK_PATTERN`: Pattern for masking server URLs

### Feature Flags
- `VITE_DEV_ENABLE_STUB_FEATURES`: Enable development features
- `VITE_PROD_ENABLE_METRICS`: Enable metrics collection
- `VITE_DEV_LOG_SENSITIVE_DATA`: Allow logging sensitive data (dev only)

### Security Configuration
- `VITE_SECURITY_*_ENABLED`: Enable/disable security checks
- `VITE_SECURITY_*_TYPE`: Set implementation type for security features
- `VITE_SECURITY_*_RISK`: Configure risk levels

### Mock Data Configuration
- `VITE_MOCK_CLUSTER_NAME`: Mock cluster name
- `VITE_MOCK_USER_NAME`: Mock user name
- `VITE_MOCK_NODE_COUNT`: Number of mock nodes to generate
- `VITE_MOCK_NAMESPACES`: Comma-separated list of namespaces

### Application Defaults
- `VITE_APP_NAME`: Application display name
- `VITE_SUPPORT_EMAIL`: Support contact email
- `VITE_DEFAULT_*`: Default values for resource templates

## Migration Benefits

1. **Environment Flexibility**: Easy deployment across different environments
2. **Security Improvement**: No hardcoded secrets or sensitive data
3. **Maintainability**: Centralized configuration management
4. **Customization**: Easy adaptation for different use cases
5. **Production Ready**: Proper separation of dev and prod configurations

## Best Practices

1. **Never commit production .env files** - Use templates instead
2. **Use environment-specific prefixes** - `VITE_DEV_*`, `VITE_PROD_*`
3. **Provide sensible defaults** - Application should work with minimal configuration
4. **Document required variables** - Clearly specify mandatory configurations
5. **Validate configuration** - Check for missing required values at startup

## Troubleshooting

### Common Issues

1. **Missing environment variables**: Check that all required variables are set
2. **Default values not working**: Ensure fallback values are appropriate
3. **Build issues**: Verify environment variables are available at build time
4. **Mock data not appearing**: Check mock configuration flags are enabled

### Debugging Configuration

```typescript
// Add to development code for debugging
console.log('Environment:', import.meta.env.MODE);
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);
console.log('Cluster Context:', import.meta.env.VITE_CLUSTER_CONTEXT);
```

## Future Enhancements

1. **Runtime Configuration**: Support for runtime config updates
2. **Configuration Validation**: Schema-based validation of environment variables
3. **Configuration UI**: Admin interface for configuration management
4. **Hot Reloading**: Dynamic configuration updates without restart