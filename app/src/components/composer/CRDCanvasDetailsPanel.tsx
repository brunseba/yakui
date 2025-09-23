import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  CircularProgress,
  Alert,
  Collapse,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Tooltip,
  Badge
} from '@mui/material';
import {
  AccountTree as RelationshipIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
  Storage as SchemaIcon,
  Group as GroupIcon,
  Timeline as TimelineIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  Link as LinkIcon,
  Code as CodeIcon,
  ExpandMore as ExpandMoreIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowRight as ArrowRightIcon
} from '@mui/icons-material';
import { CRDDependencyEdge } from '../../services/crd-analysis';

interface CRDGridItem {
  id: string;
  name: string;
  kind: string;
  group: string;
  version: string;
  scope: 'Cluster' | 'Namespaced';
  plural: string;
  position: {
    row: number;
    col: number;
  };
  schema?: {
    type: string;
    properties: {
      [key: string]: any;
    };
    additionalProperties?: boolean;
  };
}

interface CRDCanvasDetailsPanelProps {
  selectedCRD: CRDGridItem | null;
  relationships: CRDDependencyEdge[];
  canvasCRDs: CRDGridItem[];
  loadingRelationships: boolean;
  onCRDSelect?: (crd: CRDGridItem) => void;
}

// Component to render schema properties recursively
const SchemaPropertyItem: React.FC<{
  name: string;
  property: any;
  level?: number;
}> = ({ name, property, level = 0 }) => {
  const [expanded, setExpanded] = useState(level < 2); // Auto-expand first 2 levels
  const hasChildren = property?.properties && Object.keys(property.properties).length > 0;
  
  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'object': return 'primary';
      case 'array': return 'secondary';
      case 'string': return 'success';
      case 'integer': 
      case 'number': return 'warning';
      case 'boolean': return 'info';
      default: return 'default';
    }
  };
  
  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'object': return '📋';
      case 'array': return '📝';
      case 'string': return '🔤';
      case 'integer':
      case 'number': return '🔢';
      case 'boolean': return '✅';
      default: return '❓';
    }
  };
  
  return (
    <Box sx={{ ml: level * 2 }}>
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1, 
          py: 0.5,
          cursor: hasChildren ? 'pointer' : 'default',
          '&:hover': hasChildren ? { backgroundColor: 'action.hover', borderRadius: 0.5 } : {}
        }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? <ArrowDownIcon fontSize="small" /> : <ArrowRightIcon fontSize="small" />
        ) : (
          <Box sx={{ width: 20 }} /> // Spacer for alignment
        )}
        
        <Typography 
          variant="body2" 
          sx={{ 
            fontFamily: 'monospace', 
            fontWeight: 'medium',
            minWidth: 80
          }}
        >
          {name}:
        </Typography>
        
        <Chip 
          label={property?.type || 'unknown'}
          size="small"
          color={getTypeColor(property?.type) as any}
          variant="outlined"
          sx={{ 
            height: 20, 
            fontSize: '0.65rem',
            '& .MuiChip-label': { px: 0.5 }
          }}
        />
        
        {property?.description && (
          <Tooltip title={property.description} arrow>
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ 
                fontStyle: 'italic',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 120
              }}
            >
              {property.description}
            </Typography>
          </Tooltip>
        )}
        
        {property?.required && (
          <Chip 
            label="required" 
            size="small" 
            color="error" 
            variant="filled"
            sx={{ 
              height: 16, 
              fontSize: '0.6rem',
              '& .MuiChip-label': { px: 0.5 }
            }}
          />
        )}
      </Box>
      
      {hasChildren && expanded && (
        <Collapse in={expanded}>
          <Box sx={{ borderLeft: `2px solid`, borderColor: 'divider', ml: 1, pl: 1 }}>
            {Object.entries(property.properties).map(([childName, childProperty]) => (
              <SchemaPropertyItem 
                key={childName} 
                name={childName} 
                property={childProperty} 
                level={level + 1}
              />
            ))}
          </Box>
        </Collapse>
      )}
    </Box>
  );
};

export const CRDCanvasDetailsPanel: React.FC<CRDCanvasDetailsPanelProps> = ({
  selectedCRD,
  relationships,
  canvasCRDs,
  loadingRelationships,
  onCRDSelect
}) => {
  
  // Get relationships for the selected CRD
  const crdRelationships = useMemo(() => {
    if (!selectedCRD) return [];
    
    const matchesCRD = (identifier: string, crd: CRDGridItem) => {
      const kind = crd.kind.toLowerCase();
      const group = crd.group?.toLowerCase() || 'core';
      const identifier_lower = identifier.toLowerCase();
      
      // Generate possible relationship ID formats that could match this CRD
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
    };
    
    return relationships.filter(rel => 
      matchesCRD(rel.source, selectedCRD) || matchesCRD(rel.target, selectedCRD)
    );
  }, [selectedCRD, relationships]);
  
  // Get relationship statistics
  const relationshipStats = useMemo(() => {
    const stats = {
      total: crdRelationships.length,
      incoming: 0,
      outgoing: 0,
      references: 0,
      dependencies: 0,
      compositions: 0
    };
    
    if (!selectedCRD) return stats;
    
    crdRelationships.forEach(rel => {
      // Check if this CRD is the source or target
      const matchesCRD = (identifier: string, crd: CRDGridItem) => {
        const kind = crd.kind.toLowerCase();
        const group = crd.group?.toLowerCase() || 'core';
        const identifier_lower = identifier.toLowerCase();
        
        const possibleMatches = [
          `crd-${kind}s.${group}`, `crd-${kind}.${group}`,
          `${kind}s.${group}`, `${kind}.${group}`,
          `core-${kind}`, kind, crd.id.toLowerCase()
        ];
        
        return possibleMatches.some(match => 
          identifier_lower.includes(match) || match.includes(identifier_lower)
        );
      };
      
      const isSource = matchesCRD(rel.source, selectedCRD);
      
      if (isSource) {
        stats.outgoing++;
      } else {
        stats.incoming++;
      }
      
      // Count by type
      switch (rel.type.toLowerCase()) {
        case 'reference': stats.references++; break;
        case 'dependency': stats.dependencies++; break;
        case 'composition': stats.compositions++; break;
      }
    });
    
    return stats;
  }, [selectedCRD, crdRelationships]);

  const getRelationshipIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'reference': return <LinkIcon fontSize="small" />;
      case 'custom': return <LinkIcon fontSize="small" />;      // Treat custom as reference
      case 'dependency': return <TimelineIcon fontSize="small" />;
      case 'composition': return <GroupIcon fontSize="small" />;
      default: return <RelationshipIcon fontSize="small" />;
    }
  };

  const getRelationshipColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'reference': return 'primary';
      case 'custom': return 'primary';      // Treat custom as reference
      case 'dependency': return 'warning'; 
      case 'composition': return 'success';
      default: return 'default';
    }
  };

  if (!selectedCRD) {
    return (
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'text.secondary'
        }}>
          <InfoIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
          <Typography variant="h6" gutterBottom>
            No CRD Selected
          </Typography>
          <Typography variant="body2" textAlign="center">
            Click on a CRD in the canvas to view its details and relationships
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2, p: 2, overflow: 'auto' }}>
      {/* CRD Basic Information */}
      <Card>
        <CardContent sx={{ pb: 1 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ 
            fontWeight: 'bold', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1 
          }}>
            <InfoIcon fontSize="small" />
            CRD Information
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {selectedCRD.kind}
            </Typography>
            
            <Typography variant="body2" color="text.secondary">
              {selectedCRD.group}/{selectedCRD.version}
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
              <Chip
                label={selectedCRD.scope}
                size="small"
                color={selectedCRD.scope === 'Cluster' ? 'primary' : 'secondary'}
                variant="outlined"
              />
              <Chip
                label={selectedCRD.plural}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`Position: ${selectedCRD.position.row}, ${selectedCRD.position.col}`}
                size="small"
                variant="outlined"
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Relationship Statistics */}
      <Card>
        <CardContent sx={{ pb: 1 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ 
            fontWeight: 'bold', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1 
          }}>
            <RelationshipIcon fontSize="small" />
            Relationship Overview
          </Typography>
          
          {loadingRelationships ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
              <Typography variant="body2" sx={{ ml: 2 }}>
                Loading relationships...
              </Typography>
            </Box>
          ) : relationshipStats.total === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              No relationships detected
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={`${relationshipStats.total} Total`}
                  size="small"
                  color="default"
                />
                <Chip
                  label={`${relationshipStats.incoming} In`}
                  size="small"
                  color="info"
                  icon={<ArrowBackIcon />}
                />
                <Chip
                  label={`${relationshipStats.outgoing} Out`}
                  size="small"
                  color="info"
                  icon={<ArrowForwardIcon />}
                />
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {relationshipStats.references > 0 && (
                  <Chip
                    label={`${relationshipStats.references} References`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
                {relationshipStats.dependencies > 0 && (
                  <Chip
                    label={`${relationshipStats.dependencies} Dependencies`}
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                )}
                {relationshipStats.compositions > 0 && (
                  <Chip
                    label={`${relationshipStats.compositions} Compositions`}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Detailed Relationships */}
      {crdRelationships.length > 0 && (
        <Card>
          <CardContent sx={{ pb: 1 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ 
              fontWeight: 'bold', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1 
            }}>
              <RelationshipIcon fontSize="small" />
              Relationships ({crdRelationships.length})
            </Typography>
            
            <List dense>
              {crdRelationships.map((relationship, index) => {
                const matchesCRD = (identifier: string, crd: CRDGridItem) => {
                  const kind = crd.kind.toLowerCase();
                  const group = crd.group?.toLowerCase() || 'core';
                  const identifier_lower = identifier.toLowerCase();
                  
                  const possibleMatches = [
                    `crd-${kind}s.${group}`, `crd-${kind}.${group}`,
                    `${kind}s.${group}`, `${kind}.${group}`,
                    `core-${kind}`, kind, crd.id.toLowerCase()
                  ];
                  
                  return possibleMatches.some(match => 
                    identifier_lower.includes(match) || match.includes(identifier_lower)
                  );
                };
                
                const isSource = matchesCRD(relationship.source, selectedCRD);
                const relatedCRDId = isSource ? relationship.target : relationship.source;
                const relatedCRD = canvasCRDs.find(crd => matchesCRD(relatedCRDId, crd));
                
                return (
                  <ListItem 
                    key={`${relationship.id}-${index}`} 
                    sx={{ 
                      px: 0, 
                      cursor: relatedCRD && onCRDSelect ? 'pointer' : 'default',
                      '&:hover': relatedCRD && onCRDSelect ? { 
                        backgroundColor: 'action.hover',
                        borderRadius: 1 
                      } : {}
                    }}
                    onClick={() => relatedCRD && onCRDSelect && onCRDSelect(relatedCRD)}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {getRelationshipIcon(relationship.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2">
                            {isSource ? '→' : '←'} {relatedCRD?.kind || relatedCRDId}
                          </Typography>
                          <Chip 
                            label={relationship.type}
                            size="small"
                            variant="outlined"
                            color={getRelationshipColor(relationship.type) as any}
                          />
                          {relationship.strength === 'strong' && (
                            <Chip 
                              label="Strong"
                              size="small"
                              color="default"
                              variant="filled"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {relationship.metadata?.reason || 
                           relationship.metadata?.field || 
                           'Related resource'}
                        </Typography>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Schema Properties */}
      {selectedCRD.schema && (
        <Card>
          <CardContent sx={{ pb: 1 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ 
              fontWeight: 'bold', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1 
            }}>
              <SchemaIcon fontSize="small" />
              Schema Properties
              <Badge 
                badgeContent={selectedCRD.schema.properties ? Object.keys(selectedCRD.schema.properties).length : 0}
                color="primary"
                showZero
                sx={{ ml: 1 }}
              >
                <Box />
              </Badge>
            </Typography>
            
            <Box sx={{ mt: 1 }}>
              {selectedCRD.schema.properties && Object.keys(selectedCRD.schema.properties).length > 0 ? (
                <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {Object.entries(selectedCRD.schema.properties).map(([propertyName, property]) => (
                    <SchemaPropertyItem 
                      key={propertyName}
                      name={propertyName}
                      property={property}
                    />
                  ))}
                </Box>
              ) : (
                <Alert severity="info" sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    No properties defined in schema
                  </Typography>
                </Alert>
              )}
              
              {selectedCRD.schema.additionalProperties === false && (
                <Box sx={{ mt: 1 }}>
                  <Chip 
                    label="No additional properties allowed" 
                    size="small" 
                    color="warning" 
                    variant="outlined"
                    icon={<CodeIcon />}
                  />
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Debug Schema Info - Temporary */}
      <Card sx={{ bgcolor: '#f5f5f5', border: '1px dashed #ccc' }}>
        <CardContent sx={{ pb: 1 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
            🐛 Debug Info
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
            Has Schema: {selectedCRD.schema ? '✅ Yes' : '❌ No'}<br/>
            Schema Type: {selectedCRD.schema?.type || 'N/A'}<br/>
            Properties Count: {selectedCRD.schema?.properties ? Object.keys(selectedCRD.schema.properties).length : 0}<br/>
            CRD Kind: {selectedCRD.kind}
          </Typography>
        </CardContent>
      </Card>

      {/* Canvas Information */}
      <Card>
        <CardContent sx={{ pb: 1 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ 
            fontWeight: 'bold', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1 
          }}>
            <SettingsIcon fontSize="small" />
            Canvas Info
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              CRD Name: {selectedCRD.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Canvas ID: {selectedCRD.id}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Grid Position: Row {selectedCRD.position.row}, Column {selectedCRD.position.col}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CRDCanvasDetailsPanel;