# CNPG Relationship Debug Commands

Run these commands one by one in your browser console (F12) while on the Canvas page:

## 1. Check Debug Data
```javascript
console.log('Debug data available:', !!window.__canvas_debug);
```

## 2. Check CRDs on Canvas  
```javascript
if (window.__canvas_debug) {
  console.log('CRDs:', window.__canvas_debug.crds.length);
  window.__canvas_debug.crds.forEach((crd, i) => console.log(`${i+1}. ${crd.kind} (${crd.group})`));
} else {
  console.log('No debug data');
}
```

## 3. Check Relationships
```javascript
if (window.__canvas_debug) {
  console.log('Relationships:', window.__canvas_debug.relationships.length);
  console.log('Show toggle:', window.__canvas_debug.showRelationships);
  window.__canvas_debug.relationships.slice(0, 5).forEach((r, i) => console.log(`${i+1}. ${r.source} -> ${r.target} (${r.type})`));
}
```

## 4. Check API Data
```javascript
if (window.__debug_relationships) {
  const { allEdges } = window.__debug_relationships;
  console.log('API edges:', allEdges?.length || 0);
  const cnpg = allEdges?.filter(e => e.source.includes('postgresql.cnpg.io') || e.target.includes('postgresql.cnpg.io')) || [];
  console.log('CNPG edges:', cnpg.length);
  cnpg.slice(0, 3).forEach((e, i) => console.log(`${i+1}. ${e.source} -> ${e.target}`));
}
```

## 5. Quick Status Check
```javascript
const debug = window.__canvas_debug;
console.log('Status:', {
  hasDebug: !!debug,
  crdCount: debug?.crds?.length || 0,
  relCount: debug?.relationships?.length || 0,
  showing: debug?.showRelationships || false
});
```

## 6. Toggle Relationships (if they're hidden)
```javascript
// If relationships are hidden, try clicking the toggle button
document.querySelector('[aria-label*="relationship"]')?.click();
```

---

## Expected Results:
- **Debug data**: `true` 
- **CRDs**: Should show CNPG CRDs like Cluster, Backup, etc.
- **Relationships**: Should show connections between CRDs
- **Show toggle**: Should be `true`
- **API edges**: Should show CNPG relationships from backend

If any step fails, that's where the issue is!