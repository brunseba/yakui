# Docker Dependencies Management Strategy

## Problem Solved

This project had inconsistent handling of `package-lock.json` in Docker builds, causing:
- Build cache invalidation issues
- Dependency version inconsistencies between local and containerized environments
- Flip-flop behavior where `package-lock.json` was sometimes ignored, sometimes included

## Solution

### 1. Consistent Package Lock Handling

**Files affected:**
- `.dockerignore` - Now includes `package-lock.json` (removed from exclusion list)
- `Dockerfile*` - All Dockerfiles explicitly copy `package.json` and `package-lock.json`
- `docker-compose.override.yml` - File watching triggers rebuild on lock file changes

### 2. Build Strategy

```dockerfile
# ✅ Correct approach in all Dockerfiles
COPY package.json package-lock.json ./
npm ci
```

**Benefits:**
- Uses exact versions from `package-lock.json`
- Better Docker layer caching (dependencies change less frequently than source code)
- Consistent dependency versions across all environments

### 3. Development Workflow

**For normal development:**
```bash
./dev-docker.sh up          # Starts with current dependencies
```

**When adding new dependencies:**
```bash
npm install <package-name>   # Updates package.json and package-lock.json
./dev-docker.sh deps-install # Rebuilds containers with new dependencies
```

**When updating dependencies:**
```bash
./dev-docker.sh deps-update  # Updates all dependencies and rebuilds
```

### 4. File Watching Strategy

**Source code changes:** `sync` action (fast)
- `src/` directory changes are synced without rebuild
- Live reload works immediately

**Dependency changes:** `rebuild` action (slower but necessary)
- `package.json` changes trigger container rebuild
- `package-lock.json` changes trigger container rebuild

## Best Practices

### ✅ DO
- Commit `package-lock.json` to version control
- Use `npm ci` in Dockerfiles for production builds
- Use `./dev-docker.sh deps-install` after adding dependencies
- Keep `package-lock.json` in sync across all environments

### ❌ DON'T
- Don't exclude `package-lock.json` from Docker context
- Don't use `npm install` in Dockerfiles (use `npm ci`)
- Don't manually edit `package-lock.json`
- Don't ignore dependency changes - rebuild when needed

## Troubleshooting

**Issue: Dependencies not updating in container**
```bash
./dev-docker.sh deps-install  # Force rebuild with current dependencies
```

**Issue: Version mismatches**
```bash
./dev-docker.sh reset         # Complete environment reset
```

**Issue: Build cache problems**
```bash
docker-compose build --no-cache  # Force rebuild without cache
```

## Implementation Details

### Docker Layer Optimization
1. Copy `package.json` and `package-lock.json` first
2. Run `npm ci`
3. Copy source code last

This ensures dependency installation is cached separately from source code changes.

### File Watching Configuration
- **Frontend**: Watches `src/`, `public/`, `package.json`, `package-lock.json`
- **Backend**: Watches `dev-server.cjs`, `src/`, `package.json`, `package-lock.json`
- Source changes sync immediately
- Dependency changes trigger rebuild

This strategy eliminates the flip-flop behavior and provides consistent, predictable dependency management across all development environments.