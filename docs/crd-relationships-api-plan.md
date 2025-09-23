# CRD-to-CRD Relationships API Implementation Plan

## Phase 1: Backend Implementation (1-2 hours)

### Step 1.1: Create Optimized CRD Analysis Function
```javascript
// New function in dev-server.cjs
const analyzeCRDToNFLYRelationships = async (options = {}) => {
  const {
    apiGroups = [],
    crds = [],
    maxRelationships = 100,
    relationshipTypes = ['reference', 'composition', 'dependency'],
    includeMetadata = true
  } = options;
  
  // Performance optimizations:
  // 1. Pre-filter CRDs by API groups
  // 2. Use efficient string matching algorithms
  // 3. Cache schema analysis results
  // 4. Early exit when maxRelationships reached
};
```

### Step 1.2: Implement Smart Relationship Detection
```javascript
const detectCRDRelationships = (sourceCRD, targetCRD) => {
  const relationships = [];
  
  // 1. Direct field references (strongest)
  // Look for: spec.clusterRef, spec.backupCluster, etc.
  
  // 2. Schema property names (strong)
  // Look for: properties matching target CRD kind
  
  // 3. Description mentions (medium)
  // Look for: target CRD kind in field descriptions
  
  // 4. Enum values (weak)
  // Look for: target CRD name in enum values
  
  return relationships;
};
```

### Step 1.3: Add New API Route
```javascript
app.get('/api/dependencies/crd-relationships', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const params = extractQueryParams(req.query);
    const result = await analyzeCRDToNFLYRelationships(params);
    
    res.json({
      ...result,
      metadata: {
        ...result.metadata,
        analysisTimeMs: Date.now() - startTime
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Phase 2: Frontend Integration (30 minutes)

### Step 2.1: Update CRD Analysis Service
```typescript
// Add to crd-analysis.ts
async getCRDRelationships(options: CRDRelationshipOptions): Promise<CRDRelationshipsResponse> {
  const params = new URLSearchParams();
  // ... build params
  
  const response = await axios.get(
    `${API_BASE_URL}/dependencies/crd-relationships?${params}`,
    { timeout: 5000 } // Much faster than current 30s
  );
  
  return response.data;
}
```

### Step 2.2: Update Canvas Composer
```typescript
// Replace existing loadRelationships in CRDCanvasComposer.tsx
const loadRelationships = useCallback(async (crdIds: string[]) => {
  setLoadingRelationships(true);
  try {
    const result = await crdAnalysisService.getCRDRelationships({
      crds: crdIds,
      maxRelationships: 50,
      includeMetadata: true
    });
    
    setRelationships(result.relationships);
    // Process result.crds for additional CRD metadata
  } catch (error) {
    // Handle with existing error handling
  } finally {
    setLoadingRelationships(false);
  }
}, []);
```

## Phase 3: Performance Optimizations (30 minutes)

### Step 3.1: Implement Caching
```javascript
// Add to backend
const crdRelationshipCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCachedCRDRelationships = (cacheKey) => {
  const cached = crdRelationshipCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};
```

### Step 3.2: Add Request Debouncing
```typescript
// Add to frontend service
private relationshipRequests = new Map();

async getCRDRelationshipsDebounced(options: CRDRelationshipOptions): Promise<CRDRelationshipsResponse> {
  const cacheKey = JSON.stringify(options);
  
  // If same request is already in flight, return existing promise
  if (this.relationshipRequests.has(cacheKey)) {
    return this.relationshipRequests.get(cacheKey);
  }
  
  const promise = this.getCRDRelationships(options);
  this.relationshipRequests.set(cacheKey, promise);
  
  try {
    const result = await promise;
    return result;
  } finally {
    this.relationshipRequests.delete(cacheKey);
  }
}
```

## Phase 4: Enhanced Features (Optional - 1 hour)

### Step 4.1: Relationship Confidence Scoring
```javascript
const calculateRelationshipConfidence = (relationship) => {
  let confidence = 0.1; // Base confidence
  
  // Strong indicators
  if (relationship.metadata.sourceField?.includes('Ref')) confidence += 0.8;
  if (relationship.metadata.sourceField?.endsWith('Name')) confidence += 0.6;
  
  // Medium indicators  
  if (relationship.metadata.reason.includes('schema')) confidence += 0.4;
  
  // Weak indicators
  if (relationship.metadata.reason.includes('description')) confidence += 0.2;
  
  return Math.min(confidence, 1.0);
};
```

### Step 4.2: Relationship Validation
```javascript
const validateRelationship = async (relationship, crdInstances) => {
  // Check if relationship actually exists in cluster instances
  // This provides real-world validation of detected relationships
  
  const sourceInstances = await getCustomResourceInstances(relationship.source);
  const targetInstances = await getCustomResourceInstances(relationship.target);
  
  // Look for actual references in instance data
  let validated = false;
  // ... validation logic
  
  return { ...relationship, validated };
};
```

## Expected Performance Improvements

### Current State (Enhanced Analysis):
- **Response Time**: 30,000ms (timeout)
- **Data Processing**: All relationships (CRD + Core)
- **Memory Usage**: High (full cluster analysis)
- **Frontend Filtering**: Required

### New CRD-Only API:
- **Response Time**: ~200-500ms
- **Data Processing**: CRD relationships only
- **Memory Usage**: Low (focused analysis)
- **Frontend Filtering**: None needed

## Testing Strategy

### Phase 1: Unit Tests
- Test CRD relationship detection algorithms
- Test query parameter parsing
- Test response format validation

### Phase 2: Integration Tests  
- Test with real CNPG CRDs
- Test with various API groups
- Test performance with large CRD sets

### Phase 3: Frontend Tests
- Test Canvas Composer integration
- Test error handling and fallbacks
- Test user experience improvements

## Migration Strategy

### Step 1: Parallel Implementation
- Keep existing `/api/dependencies/crd/enhanced` endpoint
- Add new `/api/dependencies/crd-relationships` endpoint
- Update frontend to use new endpoint

### Step 2: Gradual Rollout
- Monitor performance improvements
- Collect user feedback
- Compare relationship accuracy

### Step 3: Deprecation (Optional)
- After successful validation, consider deprecating old endpoint
- Maintain backward compatibility for other features

## Success Metrics

### Performance Targets:
- **API Response Time**: < 1 second (vs current 30s timeout)
- **Relationship Accuracy**: > 95% precision for strong relationships
- **User Experience**: < 3 second total loading time in UI

### Quality Targets:
- **False Positives**: < 5% for strong relationships
- **Coverage**: Detect all major relationship types (ref, composition, dependency)
- **Maintainability**: Clean, well-documented code with good test coverage