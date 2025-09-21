# CRD-to-CRD Graph Analysis

## Overview

The CRD-to-CRD Graph Analysis is an advanced visualization and analysis tool that focuses specifically on relationships between Custom Resource Definitions (CRDs) in your Kubernetes cluster. This feature helps you understand, analyze, and optimize the interdependencies within your custom resources ecosystem.

## 🎯 Key Features

### 1. **CRD-to-CRD Focused Graph Visualization**
- **Pure CRD Relationships**: Filters out schema-level dependencies to show only direct CRD-to-CRD relationships
- **Interactive Graph**: Click nodes to highlight incoming/outgoing relationships
- **Multiple Layout Options**: Circular, hierarchical, and force-based positioning algorithms
- **Centrality Analysis**: Visual indicators for highly connected CRDs

### 2. **Advanced Filtering & Search**
- **Search by CRD Name**: Find specific CRDs quickly
- **Severity-based Filtering**: Focus on high, medium, or low severity relationships
- **Minimum Dependencies Threshold**: Filter CRDs with at least N dependencies
- **Real-time Updates**: All visualizations update instantly as filters change

### 3. **Comprehensive Metrics Dashboard**
- **Real-time Statistics**: CRD count, relationship count, severity distribution
- **Centrality Scoring**: Identifies the most interconnected CRDs
- **Network Analysis**: Calculates network density and complexity metrics
- **Performance Indicators**: Visual progress bars for complexity scores

### 4. **Relationship Insights & Recommendations**
- **Automated Analysis**: Detects coupling issues, circular dependencies, and orphaned CRDs
- **Smart Recommendations**: Actionable insights for improving CRD architecture
- **Complexity Scoring**: Quantifies the overall complexity of your CRD ecosystem
- **Health Indicators**: Color-coded warnings and success messages

## 🚀 Getting Started

### Accessing the Feature

1. Navigate to the CRD Analysis section in your Kubernetes Admin UI
2. Run a CRD dependency analysis to populate data
3. Select the **"CRD-CRD"** view from the analysis views toolbar
4. For insights, switch to the **"Insights"** tab

### Running Your First Analysis

```bash
# The system will automatically detect CRD-to-CRD relationships when you:
# 1. Run "Analyze CRD Dependencies" 
# 2. The analysis discovers relationships between CRDs based on:
#    - Direct references in CRD schemas
#    - Cross-references in resource specifications
#    - Controller-managed relationships
```

## 📊 Understanding the Visualization

### Node Types and Colors

| Node Color | Meaning |
|------------|---------|
| **Blue** (Primary) | Selected/highlighted CRD |
| **Green** (Success) | Source of relationship to selected CRD |
| **Orange** (Warning) | Target of relationship from selected CRD |
| **Light Blue** (Info) | High centrality CRD (well-connected) |
| **White/Gray** | Standard CRD node |

### Node Indicators

- **⭐ Star Badge**: High centrality score (>50% connected)
- **Size Variation**: Node size increases with centrality score
- **Chip Labels**: Show version, dependency count, and centrality percentage

### Edge Properties

| Edge Color | Severity Level |
|------------|---------------|
| 🔴 **Red** | High severity dependencies |
| 🟡 **Yellow** | Medium severity dependencies |
| 🔵 **Blue** | Low severity dependencies |

- **Animated Edges**: High-severity relationships pulse for attention
- **Edge Labels**: Display relationship type when labels are enabled
- **Edge Thickness**: Varies based on severity level

## 🔍 Analysis Features

### 1. Interactive Graph Controls

```typescript
// Control Panel Features
- Search Box: Filter CRDs by name or API group
- Severity Filter: Show only high/medium/low severity relationships  
- Layout Selector: Choose from circular, hierarchical, or force layouts
- Min Dependencies Slider: Filter CRDs with minimum relationship count
- Labels Toggle: Show/hide relationship type labels on edges
- Reset Button: Clear all filters and selections
```

### 2. Statistical Analysis

#### Centrality Scoring
- **Algorithm**: Degree centrality (in-degree + out-degree)
- **Normalization**: Score from 0-1 based on maximum possible connections
- **Visual Indicators**: Nodes with >70% centrality get special highlighting

#### Network Metrics
- **Density**: Ratio of actual relationships to maximum possible
- **Average Dependencies**: Mean CRD-to-CRD relationships per CRD  
- **Complexity Score**: Weighted combination of coupling and density factors

### 3. Relationship Insights

#### Automated Detection
- **High Coupling**: CRDs with >5 dependencies flagged as potential issues
- **Circular Dependencies**: Detected using depth-first search algorithm
- **Orphaned CRDs**: CRDs with no incoming or outgoing relationships
- **Network Density**: Analysis of overall system interconnectedness

#### Recommendations
- **Warning Level**: Issues requiring attention (red indicators)
- **Info Level**: Observations and moderate concerns (blue indicators)  
- **Success Level**: Well-structured aspects of your system (green indicators)

## 📈 Metrics & Analytics

### Key Performance Indicators (KPIs)

1. **CRDs with Relations**: Count of CRDs involved in CRD-to-CRD relationships
2. **Total Relations**: Total number of CRD-to-CRD dependencies discovered
3. **High Severity Count**: Critical relationships requiring attention
4. **Average Centrality**: Mean connectivity across all CRDs

### Complexity Scoring Formula

```typescript
complexityScore = min(100, 
  (highCouplingCRDs / totalCRDs) * 40 +
  (circularDependencies / totalCRDs) * 30 +
  (networkDensity * 30)
)
```

- **0-30**: Well-structured, low complexity ✅
- **31-70**: Moderate complexity, manageable ⚠️  
- **71-100**: High complexity, requires attention ❌

## 🛠️ Advanced Features

### Layout Algorithms

#### 1. Circular Layout
- **Best for**: Moderate numbers of CRDs (5-50)
- **Positioning**: Evenly distributed around circle perimeter
- **Advantage**: Clear overview of all relationships

#### 2. Hierarchical Layout  
- **Best for**: Understanding CRD importance layers
- **Positioning**: Based on centrality score levels
- **Advantage**: Shows dependency hierarchy clearly

#### 3. Force-based Layout
- **Best for**: Large networks (50+ CRDs)
- **Positioning**: Physics simulation for natural clustering
- **Advantage**: Reveals natural groupings and clusters

### Interactive Features

```typescript
// Mouse Interactions
- Click Node: Highlight incoming/outgoing relationships
- Hover Node: Preview relationship counts
- Pan/Zoom: Navigate large networks
- Mini-map: Quick navigation overview

// Keyboard Shortcuts
- Spacebar: Toggle labels on/off
- R: Reset all filters
- F: Fit graph to view
- Escape: Clear node selection
```

## 🎨 Customization Options

### Visual Settings
- **Show Labels**: Toggle edge labels for relationship types
- **Show Mini-map**: Enable/disable navigation mini-map
- **Node Spacing**: Adjust layout density via slider controls
- **Background**: Dots pattern for better visual reference

### Filter Combinations
- **Search + Severity**: Find specific CRDs with certain severity levels
- **Min Dependencies + Layout**: Focus on highly connected CRDs
- **Multiple filters**: All filters work together for precise analysis

## 🚨 Troubleshooting

### Common Issues

#### "No CRD-to-CRD Relationships Found"
- **Cause**: Current filters are too restrictive
- **Solution**: 
  1. Lower minimum dependencies threshold
  2. Change severity filter to "All Severities"
  3. Clear search query
  4. Click Reset button

#### Graph Performance with Large Networks
- **Symptoms**: Slow rendering, laggy interactions
- **Solutions**:
  1. Use minimum dependencies filter to reduce node count
  2. Switch to force-based layout for better performance
  3. Disable labels for faster rendering
  4. Use search to focus on specific CRDs

#### No Data Available
- **Cause**: CRD analysis hasn't been run or contains no CRD-to-CRD relationships
- **Solution**:
  1. Run "Analyze CRD Dependencies" from the main CRD Analysis page
  2. Ensure your cluster has CRDs with cross-references
  3. Check that analysis completed successfully

## 💡 Best Practices

### For Analysis
1. **Start with Overview**: Use circular layout to see the full network
2. **Identify Hubs**: Look for CRDs with high centrality scores
3. **Check Complexity**: Review the complexity score and insights
4. **Focus on Issues**: Use insights tab to prioritize improvements

### For Optimization
1. **Reduce High Coupling**: Break down CRDs with >5 dependencies
2. **Eliminate Circles**: Address circular dependencies immediately
3. **Connect Orphans**: Verify isolated CRDs aren't missing dependencies
4. **Monitor Density**: Keep network density below 30% for maintainability

### For Monitoring
1. **Regular Analysis**: Run CRD analysis weekly or after major changes
2. **Track Complexity**: Monitor complexity score trends over time
3. **Review Insights**: Check insights tab for new recommendations
4. **Document Changes**: Use graph screenshots for architecture documentation

## 🔮 Future Enhancements

### Planned Features
- **Time-series Analysis**: Track relationship changes over time
- **Export Capabilities**: Save graphs as images or data files
- **Integration Alerts**: Automated warnings for architecture anti-patterns  
- **Schema Diff Analysis**: Compare CRD relationships across environments
- **Impact Assessment**: Predict effects of CRD changes on dependencies

### Integration Roadmap
- **GitOps Integration**: Auto-analysis on CRD changes in Git repositories
- **CI/CD Pipeline**: Automated complexity checks in deployment pipelines
- **Monitoring Integration**: Prometheus metrics for CRD relationship health
- **Documentation Generation**: Auto-generated architecture documentation

---

## 📚 Related Documentation

- [CRD Dependencies Table Guide](CRD_DEPENDENCIES_TABLE.md)
- [CRD Analysis Overview](CRD_ANALYSIS_OVERVIEW.md)
- [Kubernetes CRD Best Practices](../guides/CRD_BEST_PRACTICES.md)
- [Network Analysis Theory](../technical/NETWORK_ANALYSIS.md)

---

*This feature is part of the Kubernetes Admin UI's advanced CRD management capabilities, designed to help platform engineers understand and optimize their custom resource ecosystems.*