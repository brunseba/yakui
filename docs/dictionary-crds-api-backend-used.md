# API Backend Endpoints for Dictionary/CRDs Page

## Overview

This document lists all the API backend endpoints used by the `http://localhost:5173/dictionary/crds` page and its related functionality in the Kubernetes Admin UI (YAKUI).

## **API Backend Endpoints for `/dictionary/crds`**

The `/dictionary/crds` page (`CRDManager` component) and its related functionality uses the following backend API endpoints:

### **1. Core CRD Management Endpoints**
```http
GET  /api/resources                    # Get all Kubernetes resources (core + custom)
GET  /api/crds                        # Get list of CRDs with instance counts
GET  /api/crds/:name                  # Get detailed CRD information (for CRD detail view)
```

### **2. CRD Dictionary Analysis Endpoints**
```http
GET  /api/dependencies/crd/apigroups     # Get available API groups for CRD filtering
GET  /api/dependencies/crd/enhanced      # Enhanced CRD dependency analysis with options
GET  /api/dependencies/dictionary        # Legacy CRD dictionary analysis
GET  /api/dependencies/crd/export        # Export CRD analysis in various formats
```

### **3. Cluster Switching Endpoints (Multicluster Support)**
```http
POST /api/cluster/switch                 # Switch active cluster context  
POST /api/cluster/test                   # Test cluster connectivity
GET  /api/cluster/current                # Get current cluster information
```

### **4. Health & System Endpoints**
```http
GET  /api/health                        # Backend health check
GET  /api/version                       # Get cluster version information
```

## **API Details**

### **Primary Data Source: `/api/resources`**
This is the **main endpoint** that powers the CRD dictionary page. It returns:
```json
[
  {
    "group": "string",
    "version": "string", 
    "kind": "string",
    "plural": "string",
    "namespaced": boolean,
    "description": "string",
    "isCustom": boolean,
    "crdName": "string"
  }
]
```

**Used by:**
- `CRDManager.tsx` component
- Route: `/dictionary/crds`
- Service: `kubernetesService.getKubernetesResources()`

### **CRD Details: `/api/crds/:name`**
Used when navigating to individual CRD details, providing:
- CRD metadata and specifications
- Schema information and properties
- Sample instances and counts
- Status conditions

**Used by:**
- `CRDDetail.tsx` component  
- Route: `/dictionary/crds/:name`
- Service: `kubernetesService.getCRDDetails(name)`

**Response Structure:**
```json
{
  "metadata": { "name": "string", "creationTimestamp": "string", ... },
  "spec": { 
    "group": "string", 
    "scope": "string", 
    "names": { "kind": "string", "plural": "string", "singular": "string", "shortNames": ["string"] },
    "versions": [{ "name": "string", "served": boolean, "storage": boolean, "deprecated": boolean }]
  },
  "instances": "number",
  "sampleInstances": [{ "name": "string", "namespace": "string", "age": "string", "status": "string" }],
  "schema": {
    "version": "string", 
    "properties": [{ "name": "string", "type": "string", "description": "string", "required": boolean }]
  },
  "conditions": [{ "type": "string", "status": "string", "message": "string", "reason": "string", "lastTransitionTime": "string" }]
}
```

### **CRD Analysis: `/api/dependencies/crd/enhanced`**
Used by the CRD Analysis component (`/crd-analysis` route) with query parameters:

**Query Parameters:**
- `apiGroups` - Comma-separated list of API groups to filter
- `maxCRDs` - Maximum number of CRDs to analyze (default: 100)
- `includeNative` - Include native Kubernetes resources (default: true)
- `depth` - Analysis depth: 'shallow' or 'deep' (default: deep)

**Used by:**
- `CRDAnalysis.tsx` component
- Route: `/crd-analysis`  
- Service: `crdAnalysisService.getEnhancedCRDAnalysis(options)`

**Response Structure:**
```json
{
  "metadata": {
    "namespace": "string",
    "nodeCount": "number",
    "edgeCount": "number", 
    "timestamp": "string",
    "apiGroups": ["string"],
    "apiGroupStats": { "group": { "count": "number" } },
    "analysisOptions": "object",
    "analysisTime": "number",
    "crdCount": "number",
    "dependencyCount": "number"
  },
  "nodes": [
    {
      "id": "string",
      "name": "string", 
      "kind": "string",
      "labels": { "dictionary.type": "string", ... },
      "metadata": "object"
    }
  ],
  "edges": [
    {
      "id": "string",
      "source": "string",
      "target": "string", 
      "type": "string",
      "strength": "strong|weak",
      "metadata": {
        "reason": "string",
        "field": "string"
      }
    }
  ]
}
```

### **API Groups: `/api/dependencies/crd/apigroups`**
Returns available API groups for CRD filtering:

**Used by:**
- `CRDAnalysisFilters.tsx` component
- Service: `crdAnalysisService.getApiGroups()`

**Response Structure:**
```json
[
  {
    "group": "string",
    "crdCount": "number",
    "crds": [
      {
        "name": "string",
        "kind": "string", 
        "scope": "string"
      }
    ],
    "versions": ["string"]
  }
]
```

### **Export Functionality: `/api/dependencies/crd/export`**
Supports exporting analysis results with query parameters:

**Query Parameters:**
- `format` - Export format: 'json', 'csv', 'markdown' (default: json)
- `includeSchemaDetails` - Include detailed schema information (default: false)
- `includeDependencyMetadata` - Include dependency metadata (default: false) 
- `focusOnCRDs` - Focus export on CRDs only (default: false)
- `apiGroups` - Comma-separated API groups to include

**Used by:**
- `CRDAnalysis.tsx` component export functionality
- Service: `crdAnalysisService.exportCRDAnalysis(options)`

### **Legacy Dictionary: `/api/dependencies/dictionary`**
Legacy CRD dictionary analysis endpoint for backward compatibility.

**Used by:**
- Legacy support in `crdAnalysisService.getLegacyCRDAnalysis()`

## **Frontend Services**

The frontend uses these TypeScript services to communicate with the backend:

### **1. KubernetesApiService (`kubernetes-api.ts`)**
Main API service for standard Kubernetes operations:
- `getKubernetesResources()` → `/api/resources`
- `getCRDs()` → `/api/crds`
- `getCRDDetails(name)` → `/api/crds/:name`

### **2. CRDAnalysisService (`crd-analysis.ts`)**
Specialized service for CRD dependency analysis:
- `getApiGroups()` → `/api/dependencies/crd/apigroups`
- `getEnhancedCRDAnalysis(options)` → `/api/dependencies/crd/enhanced`
- `exportCRDAnalysis(options)` → `/api/dependencies/crd/export`
- `getLegacyCRDAnalysis()` → `/api/dependencies/dictionary`

## **Configuration**

### **API Base URL**
- Environment variable: `VITE_API_BASE_URL`
- Default: `http://localhost:3001/api`

### **Request Timeouts**
- Default timeout: 30,000ms (30 seconds)
- Configurable via service instances

### **Error Handling**
All API calls include:
- Timeout handling with AbortSignal
- Comprehensive error logging
- Fallback mechanisms for failed requests
- User-friendly error messages

## **Routing Structure**

The dictionary/CRDs functionality is accessible via these routes:

```typescript
// Primary routes
/dictionary/crds                    // CRD Manager (list view)
/dictionary/crds/:name             // CRD Detail view
/crd-analysis                      // CRD Analysis with dependencies

// Legacy redirects for backward compatibility  
/crds                             // → /dictionary/crds
/workloads/crds                   // → /dictionary/crds
/crds/:name                       // → /dictionary/crds/:name
/workloads/crds/:name            // → /dictionary/crds/:name
```

## **Backend Implementation**

All endpoints are implemented in:
- **File**: `tools/dev-server.cjs`
- **Port**: 3001 (default)
- **Framework**: Express.js
- **Kubernetes Client**: `@kubernetes/client-node`

### **Key Backend Features**
- Dynamic kubeconfig management
- Multicluster support with context switching
- Performance limits and configurable timeouts
- Comprehensive logging and error handling
- OpenAPI v3 schema parsing for CRDs
- Instance counting and sampling

## **Performance Considerations**

### **Configurable Limits**
```javascript
const MAX_RESOURCES_PER_TYPE = 100
const MAX_NAMESPACES_TO_SCAN = 10  
const MAX_NODES_TO_INCLUDE = 50
const MAX_CRD_INSTANCES_PER_NS = 5
const MAX_CRD_SAMPLE_INSTANCES = 10
```

### **Optimization Features**
- Lazy loading of CRD instances
- Pagination support for large result sets
- Caching mechanisms for repeated requests
- Efficient API group filtering
- Memory-conscious dependency analysis

---

**Last Updated**: September 22, 2025  
**Author**: Generated from codebase analysis  
**Related Files**: 
- `app/src/components/crds/CRDManager.tsx`
- `app/src/components/crds/CRDDetail.tsx`  
- `app/src/components/crd/CRDAnalysis.tsx`
- `app/src/services/kubernetes-api.ts`
- `app/src/services/crd-analysis.ts`
- `tools/dev-server.cjs`