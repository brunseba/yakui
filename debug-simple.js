// Simple CNPG relationship debug - run each line separately in browser console

// Step 1: Check if you're on the canvas page
console.log('Step 1: Checking canvas debug data...');
console.log('Debug data available:', !!window.__canvas_debug);

// Step 2: Check CRDs on canvas
console.log('\nStep 2: CRDs on canvas...');
if (window.__canvas_debug) {
  console.log('CRDs count:', window.__canvas_debug.crds.length);
  window.__canvas_debug.crds.forEach((crd, i) => {
    console.log(`${i+1}. ${crd.kind} (${crd.group})`);
  });
} else {
  console.log('No debug data - make sure you are on canvas page with CRDs');
}

// Step 3: Check relationships
console.log('\nStep 3: Relationships...');
if (window.__canvas_debug) {
  console.log('Relationships count:', window.__canvas_debug.relationships.length);
  console.log('Show relationships:', window.__canvas_debug.showRelationships);
  
  // Show first few relationships
  window.__canvas_debug.relationships.slice(0, 5).forEach((rel, i) => {
    console.log(`${i+1}. ${rel.source} -> ${rel.target} (${rel.type})`);
  });
} else {
  console.log('No debug data available');
}

// Step 4: Check API data
console.log('\nStep 4: API relationship data...');
if (window.__debug_relationships) {
  const { allEdges, relevantEdges } = window.__debug_relationships;
  console.log('Total API edges:', allEdges?.length || 0);
  console.log('Relevant edges:', relevantEdges?.length || 0);
  
  // CNPG specific edges
  const cnpgEdges = allEdges?.filter(edge => 
    edge.source.includes('postgresql.cnpg.io') || 
    edge.target.includes('postgresql.cnpg.io')
  ) || [];
  console.log('CNPG edges:', cnpgEdges.length);
  
  cnpgEdges.slice(0, 3).forEach((edge, i) => {
    console.log(`${i+1}. ${edge.source} -> ${edge.target}`);
  });
} else {
  console.log('No API relationship data');
}

// Final status
console.log('\n=== SUMMARY ===');
const hasDebug = !!window.__canvas_debug;
const hasCRDs = hasDebug && window.__canvas_debug.crds.length > 0;
const hasRels = hasDebug && window.__canvas_debug.relationships.length > 0;
const showingRels = hasDebug && window.__canvas_debug.showRelationships;

console.log('✅ Debug data:', hasDebug);
console.log('✅ Has CRDs:', hasCRDs);
console.log('✅ Has relationships:', hasRels);
console.log('✅ Showing relationships:', showingRels);

if (hasDebug && hasCRDs && hasRels && showingRels) {
  console.log('🎉 Everything looks good - you should see relationship lines!');
} else {
  console.log('❌ Missing something - check the steps above');
}