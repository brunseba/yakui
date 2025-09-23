# CNPG Canvas Relationship Debug Guide 🔍

## 🎯 **Step-by-Step Debugging**

### **Step 1: Open Browser Console**
1. Open your browser and navigate to http://localhost:5173
2. Open Developer Tools (F12)
3. Go to Console tab

### **Step 2: Navigate to Canvas**
1. Navigate to **CRD Composer** → **Canvas View**
2. Drag some CNPG CRDs to the canvas:
   - Add **Cluster** CRD
   - Add **Backup** CRD 
   - Add **Pooler** CRD

### **Step 3: Check Console Logs**

You should see logs like this:

```
[Canvas] Loading relationships for CRDs: [....]
[Canvas] Available edges: 2560
[Canvas] Canvas CRDs: [{kind: "Cluster", group: "postgresql.cnpg.io"}, ...]
[Canvas] Relevant edges found: X

[ConnectionLines] Debug Info: {
  showRelationships: true,
  totalRelationships: X,
  filteredRelationships: X,
  canvasCRDs: X,
  relationshipFilter: ["reference", "dependency", "composition"]
}
```

### **Step 4: Manual Debug in Console**

Run these commands in the browser console:

```javascript
// 1. Check if debug data is available
console.log('Canvas Debug Data:', window.__canvas_debug);

// 2. Check CRDs on canvas
console.log('CRDs on canvas:', window.__canvas_debug?.crds);

// 3. Check relationships found
console.log('Relationships:', window.__canvas_debug?.relationships);

// 4. Check detailed relationship matching
console.log('Debug relationships:', window.__debug_relationships);

// 5. Verify CRD properties
window.__canvas_debug?.crds?.forEach((crd, i) => {
  console.log(`CRD ${i + 1}:`, {
    kind: crd.kind,
    group: crd.group,
    id: crd.id,
    position: crd.position
  });
});
```

### **Step 5: Check Relationship Matching**

```javascript
// Check what relationships should match
const crds = window.__canvas_debug?.crds || [];
const allEdges = window.__debug_relationships?.allEdges || [];

console.log('=== CNPG Relationship Analysis ===');

// Show CNPG relationships in the API
const cnpgEdges = allEdges.filter(edge => 
  edge.source.includes('postgresql.cnpg.io') || 
  edge.target.includes('postgresql.cnpg.io')
);

console.log('CNPG relationships in API:', cnpgEdges.length);
cnpgEdges.slice(0, 5).forEach((edge, i) => {
  console.log(`${i + 1}. ${edge.source} -> ${edge.target} (${edge.type})`);
});

// Show canvas CRDs
console.log('Canvas CRDs:');
crds.forEach((crd, i) => {
  console.log(`${i + 1}. Kind: ${crd.kind}, Group: ${crd.group}`);
});
```

## 🔧 **Common Issues & Solutions**

### **Issue 1: No Console Logs Appear**
- **Problem**: Canvas code not loading
- **Solution**: Hard refresh browser (Cmd+Shift+R)

### **Issue 2: CRDs Have Wrong Properties**
```javascript
// If you see this in console:
CRD 1: {kind: undefined, group: undefined, id: "..."}

// The CRDs being dragged don't have proper kind/group
// Check the source data in the left ribbon
```

### **Issue 3: No Relationships in API**
```javascript
// If you see:
Available edges: 0

// Backend might not be running or no data
// Check: curl http://localhost:3001/api/dependencies/crd/enhanced
```

### **Issue 4: Relationships Found But Not Rendered**
```javascript
// If you see:
[Canvas] Found 15 relationships
[ConnectionLines] filteredRelationships: 0

// Check relationship filter settings
console.log('Filter:', window.__canvas_debug?.relationshipFilter);

// Or check if connection paths are being calculated
// Look for: "No path found for: ..." messages
```

## 🎯 **Expected Success Output**

When working correctly, you should see:

```
[Canvas] 🎯 SUCCESS: Relationships found and loaded!
[Canvas] Found 15 relationships
[ConnectionLines] ✅ Rendering connection 1: crd-backups.postgresql.cnpg.io -> crd-clusters.postgresql.cnpg.io
[ConnectionLines] ✅ Rendering connection 2: crd-poolers.postgresql.cnpg.io -> crd-clusters.postgresql.cnpg.io
```

And visual blue lines connecting the CRDs on the canvas.

---

**Run through these steps and paste the console output so I can see exactly what's happening! 🔍**