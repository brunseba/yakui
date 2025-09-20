# CRD Details Fix Summary

## Issue Resolution
Fixed the "string did not match the expected pattern" error when accessing CRD details.

## Root Cause
The issue was caused by two problems:

1. **URL Encoding/Decoding**: CRD names containing dots (like `backups.postgresql.cnpg.io`) needed proper URL encoding for routing
2. **Kubernetes API Client Parameter Format**: The JavaScript Kubernetes client requires the CRD name to be passed as an object parameter `{ name: crdName }` instead of a string

## Changes Made

### Frontend Components
1. **CRDManager.tsx**: Updated navigation calls to URL-encode CRD names:
   ```typescript
   onClick={() => navigate(`/crds/${encodeURIComponent(crd.metadata?.name || '')}`)}
   ```

2. **CRDDetail.tsx**: Added URL parameter decoding:
   ```typescript
   const { name: encodedName } = useParams<{ name: string }>();
   const name = encodedName ? decodeURIComponent(encodedName) : undefined;
   ```

### Backend API
3. **dev-server.cjs**: 
   - Added URL decoding: `const crdName = decodeURIComponent(req.params.name);`
   - Fixed API call format: `apiExtensionsV1Api.readCustomResourceDefinition({ name: crdName })`

## Testing Results

### Before Fix
```bash
curl "http://localhost:3001/api/crds/backups.postgresql.cnpg.io"
# Error: Required parameter name was null or undefined
```

### After Fix
```bash
curl "http://localhost:3001/api/crds/backups.postgresql.cnpg.io" | jq '.metadata.name'
# Output: "backups.postgresql.cnpg.io"

curl "http://localhost:3001/api/crds/buttons.widgets.templates.krateo.io" | jq '.spec.names.kind'
# Output: "Button"
```

## Verification Steps

1. **Start the backend server**:
   ```bash
   node dev-server.cjs
   ```

2. **Test CRD detail endpoint**:
   ```bash
   curl -s "http://localhost:3001/api/crds/$(echo 'backups.postgresql.cnpg.io' | jq -rR @uri)" | jq '.metadata.name'
   ```

3. **Test frontend navigation** (when frontend is running):
   - Navigate to `/crds`
   - Click on any CRD name or the "View Details" icon
   - Should successfully navigate to `/crds/[encoded-crd-name]` and display CRD details

## API Response Structure
The fixed endpoint now returns comprehensive CRD information including:
- Metadata (name, creation timestamp, labels, annotations)
- Spec (group, scope, names, versions)
- Status (conditions, accepted names)
- Schema properties with types and descriptions
- Sample instances (up to 10 for cluster-scoped, 3 per namespace for namespaced)
- Instance counts

## Status
✅ **RESOLVED** - CRD details navigation now works correctly with proper URL encoding and Kubernetes API client usage.