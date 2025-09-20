#!/bin/bash

echo "🧪 Testing ConfigMap, Secret, and ServiceAccount Dependencies"
echo "============================================================"

# Test 1: Check backend API is running
echo "1. Testing backend API health..."
if curl -s "http://localhost:3001/api/health" > /dev/null; then
    echo "   ✅ Backend API is running"
else
    echo "   ❌ Backend API is not running"
    exit 1
fi

# Test 2: Check if maxNodes parameter is being used
echo "2. Testing maxNodes parameter..."
RESPONSE=$(curl -s "http://localhost:3001/api/dependencies/graph?maxNodes=500")
NODE_COUNT=$(echo "$RESPONSE" | jq '.nodes | length')
echo "   ℹ️  Total nodes returned: $NODE_COUNT"

# Test 3: Check ConfigMap nodes are present
echo "3. Testing ConfigMap nodes..."
CONFIGMAP_COUNT=$(echo "$RESPONSE" | jq '.nodes[] | select(.kind == "ConfigMap") | .kind' | wc -l | tr -d ' ')
echo "   ℹ️  ConfigMap nodes found: $CONFIGMAP_COUNT"
if [ "$CONFIGMAP_COUNT" -gt 0 ]; then
    echo "   ✅ ConfigMaps are present in the graph"
else
    echo "   ❌ No ConfigMaps found in the graph"
fi

# Test 4: Check Secret nodes are present
echo "4. Testing Secret nodes..."
SECRET_COUNT=$(echo "$RESPONSE" | jq '.nodes[] | select(.kind == "Secret") | .kind' | wc -l | tr -d ' ')
echo "   ℹ️  Secret nodes found: $SECRET_COUNT"
if [ "$SECRET_COUNT" -gt 0 ]; then
    echo "   ✅ Secrets are present in the graph"
else
    echo "   ❌ No Secrets found in the graph"
fi

# Test 5: Check ServiceAccount nodes are present
echo "5. Testing ServiceAccount nodes..."
SA_COUNT=$(echo "$RESPONSE" | jq '.nodes[] | select(.kind == "ServiceAccount") | .kind' | wc -l | tr -d ' ')
echo "   ℹ️  ServiceAccount nodes found: $SA_COUNT"
if [ "$SA_COUNT" -gt 0 ]; then
    echo "   ✅ ServiceAccounts are present in the graph"
else
    echo "   ❌ No ServiceAccounts found in the graph"
fi

# Test 6: Check dependency edges to ConfigMaps, Secrets, and ServiceAccounts
echo "6. Testing dependency edges..."
CONFIGMAP_EDGES=$(echo "$RESPONSE" | jq '.edges[] | select(.target | contains("ConfigMap")) | .target' | wc -l | tr -d ' ')
SECRET_EDGES=$(echo "$RESPONSE" | jq '.edges[] | select(.target | contains("Secret")) | .target' | wc -l | tr -d ' ')
SA_EDGES=$(echo "$RESPONSE" | jq '.edges[] | select(.target | contains("ServiceAccount")) | .target' | wc -l | tr -d ' ')

echo "   ℹ️  ConfigMap dependency edges: $CONFIGMAP_EDGES"
echo "   ℹ️  Secret dependency edges: $SECRET_EDGES"
echo "   ℹ️  ServiceAccount dependency edges: $SA_EDGES"

TOTAL_EDGES=$((CONFIGMAP_EDGES + SECRET_EDGES + SA_EDGES))
if [ "$TOTAL_EDGES" -gt 0 ]; then
    echo "   ✅ Dependencies to ConfigMaps, Secrets, and ServiceAccounts are present"
else
    echo "   ❌ No dependency edges found for ConfigMaps, Secrets, or ServiceAccounts"
fi

# Test 7: Check frontend is running
echo "7. Testing frontend availability..."
if curl -s "http://localhost:5173" > /dev/null; then
    echo "   ✅ Frontend is running on http://localhost:5173"
else
    echo "   ⚠️  Frontend is not running on http://localhost:5173"
fi

echo ""
echo "🎯 Summary:"
echo "   • ConfigMaps: $CONFIGMAP_COUNT nodes, $CONFIGMAP_EDGES edges"
echo "   • Secrets: $SECRET_COUNT nodes, $SECRET_EDGES edges" 
echo "   • ServiceAccounts: $SA_COUNT nodes, $SA_EDGES edges"
echo ""
echo "🌐 You can now visit http://localhost:5173/dependencies to view the complete"
echo "   dependency graph including ConfigMaps, Secrets, and ServiceAccounts!"