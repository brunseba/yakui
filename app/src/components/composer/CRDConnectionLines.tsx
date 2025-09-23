import React from 'react';
import { Box } from '@mui/material';
import { CRDDependencyEdge } from '../../services/crd-analysis';

interface CRDGridItem {
  id: string;
  kind: string;
  position: {
    row: number;
    col: number;
  };
}

interface CanvasState {
  zoom: number;
  pan: { x: number; y: number };
}

interface CRDConnectionLinesProps {
  relationships: CRDDependencyEdge[];
  canvasCRDs: CRDGridItem[];
  canvasState: {
    zoom: number;
    cellSize: number;
    cellGap: number;
  };
  showRelationships: boolean;
  relationshipFilter: string[];
}

export const CRDConnectionLines: React.FC<CRDConnectionLinesProps> = ({
  relationships,
  canvasCRDs,
  canvasState,
  showRelationships,
  relationshipFilter
}) => {
  if (!showRelationships || relationships.length === 0) {
    return null;
  }

  const getConnectionPath = (sourceId: string, targetId: string) => {
    // Enhanced CRD matching logic for relationship IDs
    const findCRDByIdentifier = (identifier: string) => {
      return canvasCRDs.find(crd => {
        const kind = crd.kind.toLowerCase();
        const group = crd.group?.toLowerCase() || 'core';
        const identifier_lower = identifier.toLowerCase();
        
        // Generate possible relationship ID formats that could match this identifier
        const possibleMatches = [
          `crd-${kind}s.${group}`,     // crd-clusters.postgresql.cnpg.io
          `crd-${kind}.${group}`,      // crd-cluster.postgresql.cnpg.io 
          `${kind}s.${group}`,         // clusters.postgresql.cnpg.io
          `${kind}.${group}`,          // cluster.postgresql.cnpg.io
          `core-${kind}`,              // core-Secret
          kind,                        // cluster
          crd.id.toLowerCase()         // original ID
        ];
        
        // Check if identifier matches any of the possible formats
        return possibleMatches.some(match => 
          identifier_lower.includes(match) || match.includes(identifier_lower)
        );
      });
    };
    
    const source = findCRDByIdentifier(sourceId);
    const target = findCRDByIdentifier(targetId);
    
    if (!source || !target) return null;
    
    // Calculate connection points based on grid positions
    const sourceX = source.position.col * (canvasState.cellSize + canvasState.cellGap) + canvasState.cellGap;
    const sourceY = source.position.row * (canvasState.cellSize + canvasState.cellGap) + canvasState.cellGap;
    const targetX = target.position.col * (canvasState.cellSize + canvasState.cellGap) + canvasState.cellGap;
    const targetY = target.position.row * (canvasState.cellSize + canvasState.cellGap) + canvasState.cellGap;
    
    // Center points of the CRD cards
    const sourceCenterX = sourceX + (canvasState.cellSize - canvasState.cellGap) / 2;
    const sourceCenterY = sourceY + (canvasState.cellSize - canvasState.cellGap) / 2;
    const targetCenterX = targetX + (canvasState.cellSize - canvasState.cellGap) / 2;
    const targetCenterY = targetY + (canvasState.cellSize - canvasState.cellGap) / 2;
    
    return { 
      sourceX: sourceCenterX, 
      sourceY: sourceCenterY, 
      targetX: targetCenterX, 
      targetY: targetCenterY 
    };
  };
  
  const getConnectionColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'reference': return '#2196F3';      // Blue
      case 'dependency': return '#FF9800';     // Orange  
      case 'composition': return '#4CAF50';    // Green
      case 'custom': return '#2196F3';        // Blue (treat as reference)
      case 'weak': return '#757575';           // Gray
      case 'field': return '#9C27B0';         // Purple
      case 'schema': return '#FF5722';        // Deep Orange
      default: return '#9C27B0';              // Purple
    }
  };
  
  const getConnectionStroke = (type: string, strength: string) => {
    const baseStroke = strength === 'strong' ? 2 : 1;
    switch (type.toLowerCase()) {
      case 'weak': return `${baseStroke}px dashed`;
      default: return `${baseStroke}px solid`;
    }
  };

  // Filter relationships based on current filter
  const filteredRelationships = relationships.filter(rel => 
    relationshipFilter.includes(rel.type.toLowerCase())
  );
  
  // Debug logging for connection lines
  console.log('[ConnectionLines] Debug Info:', {
    showRelationships,
    totalRelationships: relationships.length,
    filteredRelationships: filteredRelationships.length,
    canvasCRDs: canvasCRDs.length,
    relationshipFilter
  });

  return (
    <svg 
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        pointerEvents: 'none',
        zIndex: 0 
      }}
    >
      <defs>
        {/* Arrow markers for different relationship types */}
        <marker
          id="arrowhead-reference"
          markerWidth="8"
          markerHeight="6" 
          refX="8"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0 0, 8 3, 0 6" fill="#2196F3" />
        </marker>
        <marker
          id="arrowhead-dependency"
          markerWidth="8"
          markerHeight="6" 
          refX="8"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0 0, 8 3, 0 6" fill="#FF9800" />
        </marker>
        <marker
          id="arrowhead-composition"
          markerWidth="8"
          markerHeight="6" 
          refX="8"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0 0, 8 3, 0 6" fill="#4CAF50" />
        </marker>
        <marker
          id="arrowhead-default"
          markerWidth="8"
          markerHeight="6" 
          refX="8"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0 0, 8 3, 0 6" fill="#9C27B0" />
        </marker>
      </defs>
      
      {filteredRelationships.map((relationship, index) => {
        const path = getConnectionPath(relationship.source, relationship.target);
        if (!path) {
          console.log(`[ConnectionLines] ❌ No path found for: ${relationship.source} -> ${relationship.target}`);
          return null;
        }
        
        // Debug: Log successful connections
        if (index < 3) { // Only log first few to avoid spam
          console.log(`[ConnectionLines] ✅ Rendering connection ${index + 1}: ${relationship.source} -> ${relationship.target}`);
        }
        
        const color = getConnectionColor(relationship.type);
        const strokeStyle = getConnectionStroke(relationship.type, relationship.strength);
        const markerId = `arrowhead-${relationship.type.toLowerCase()}`;
        
        // Calculate midpoint for label
        const midX = (path.sourceX + path.targetX) / 2;
        const midY = (path.sourceY + path.targetY) / 2;
        
        return (
          <g key={`${relationship.id}-${index}`}>
            {/* Connection line */}
            <line
              x1={path.sourceX}
              y1={path.sourceY}
              x2={path.targetX}
              y2={path.targetY}
              stroke={color}
              strokeWidth={relationship.strength === 'strong' ? 2 : 1}
              strokeDasharray={relationship.type === 'weak' ? '5,5' : 'none'}
              markerEnd={`url(#${markerId})`}
              opacity={0.7}
            />
            
            {/* Relationship label */}
            <g transform={`translate(${midX}, ${midY})`}>
              {/* Background circle for better readability */}
              <circle
                r="10"
                fill="white"
                stroke={color}
                strokeWidth="1"
                opacity="0.9"
              />
              {/* Relationship type text */}
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="8"
                fill={color}
                fontWeight="bold"
              >
                {relationship.type.charAt(0).toUpperCase()}
              </text>
            </g>
            
            {/* Hover tooltip area (invisible but interactive) */}
            <title>
              {`${relationship.type} (${relationship.strength}): ${relationship.metadata?.reason || 'Related resource'}`}
            </title>
          </g>
        );
      })}
    </svg>
  );
};

export default CRDConnectionLines;