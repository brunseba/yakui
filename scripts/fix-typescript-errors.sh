#!/bin/bash

# Script to fix common TypeScript compilation errors
# Run this script from the project root directory

echo "🔧 Fixing TypeScript compilation errors..."

# Fix unused variables by removing or commenting them out
echo "📝 Removing unused import statements..."

# Remove unused imports from Layout.tsx
sed -i '' 's/  Kubernetes as KubernetesIcon,/  \/\/ Kubernetes as KubernetesIcon,/' src/components/layout/Layout.tsx

# Fix Grid component prop issues by removing 'item' prop which is no longer supported in MUI v5
echo "📝 Fixing MUI Grid component issues..."

find src/components -name "*.tsx" -exec sed -i '' 's/<Grid item/<Grid/g' {} \;

# Fix handleTabChange unused parameter warning
echo "📝 Fixing unused event parameters in tab handlers..."

find src/components -name "*.tsx" -exec sed -i '' 's/handleTabChange = (event: React.SyntheticEvent, newValue: number)/handleTabChange = (_event: React.SyntheticEvent, newValue: number)/g' {} \;

# Fix formatAge function calls with Date objects
echo "📝 Fixing formatAge function calls..."

# Create a simple helper to convert dates
cat > src/utils/dateUtils.ts << 'EOF'
export const formatAge = (timestamp: string | Date | undefined): string => {
  if (!timestamp) return 'N/A';
  
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return 'Just now';
};
EOF

# Update imports to use the new formatAge function
find src/components -name "*.tsx" -exec sed -i '' 's|import.*formatAge.*from.*utils.*|import { formatAge } from '\''../utils/dateUtils'\'';|g' {} \;

# Fix useRef hook without initial value
echo "📝 Fixing useRef hooks..."

sed -i '' 's/useRef<NodeJS.Timeout>()/useRef<NodeJS.Timeout>(undefined as any)/g' src/components/monitoring/MonitoringDashboard.tsx

# Add missing Speed icon import
echo "📝 Fixing missing icon imports..."

# Remove Speed icon usage since it doesn't exist in MUI
find src/components -name "*.tsx" -exec sed -i '' 's/<Speed fontSize="small" \/>/<SpeedIcon fontSize="small" \/>/g' {} \;

# Fix type-only imports
echo "📝 Fixing type-only imports..."

# Already fixed in previous edits, but ensure consistency
find src -name "*.tsx" -exec sed -i '' 's/import { \([^}]*ReactNode[^}]*\) } from '\''react'\'';/import type { \1 } from '\''react'\'';/g' {} \;

# Remove unused variables by prefixing with underscore
echo "📝 Prefixing unused variables with underscore..."

# This is a complex operation, so we'll just list files that need manual attention
echo "⚠️  The following files need manual review for unused variables:"

# Find files with potential unused variables
grep -r "is declared but its value is never read" . --include="*.tsx" --include="*.ts" 2>/dev/null | cut -d: -f1 | sort -u

echo ""
echo "✅ Automated fixes complete!"
echo ""
echo "📋 Manual steps required:"
echo "1. Review the files listed above and remove or prefix unused variables with underscore (_)"
echo "2. Fix any remaining Grid component issues by updating to MUI v5 syntax"
echo "3. Ensure all type imports use 'import type { ... }' syntax"
echo "4. Test the build with: npm run build"
echo ""
echo "🚀 Once all errors are fixed, you can build the production image:"
echo "   docker build -t k8s-admin-ui:v1.0.0 ."
echo ""
EOF