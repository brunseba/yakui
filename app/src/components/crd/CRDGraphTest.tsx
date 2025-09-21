import React from 'react';
import { CRDToCRDGraphAnalysis } from './CRDToCRDGraphAnalysis';
import { CRDAnalysisResult, CRDType } from '../../services/crd-analysis';

// Mock data for testing CRD-to-CRD graph
const mockCRDData: CRDAnalysisResult & { crds: CRDType[] } = {
  metadata: {
    namespace: 'test',
    nodeCount: 4,
    edgeCount: 2,
    timestamp: new Date().toISOString(),
    crdCount: 2,
    dependencyCount: 2
  },
  nodes: [
    {
      id: 'node1',
      name: 'applications.argoproj.io',
      kind: 'Application',
      labels: {
        'dictionary.type': 'crd-definition',
        'api.group': 'argoproj.io',
        'crd.kind': 'Application'
      }
    },
    {
      id: 'node2', 
      name: 'appprojects.argoproj.io',
      kind: 'AppProject',
      labels: {
        'dictionary.type': 'crd-definition',
        'api.group': 'argoproj.io',
        'crd.kind': 'AppProject'
      }
    }
  ],
  edges: [
    {
      id: 'edge1',
      source: 'node1',
      target: 'node2',
      type: 'reference',
      strength: 'strong',
      metadata: {
        referenceType: 'spec.project',
        reason: 'Application references AppProject'
      }
    }
  ],
  crds: [
    {
      kind: 'Application',
      apiGroup: 'argoproj.io',
      version: 'v1alpha1',
      plural: 'applications',
      description: 'ArgoCD Application CRD',
      dependencies: [
        {
          type: 'reference',
          target: 'AppProject',
          path: 'spec.project',
          description: 'References an AppProject for configuration',
          severity: 'high'
        }
      ]
    },
    {
      kind: 'AppProject',
      apiGroup: 'argoproj.io', 
      version: 'v1alpha1',
      plural: 'appprojects',
      description: 'ArgoCD AppProject CRD',
      dependencies: []
    }
  ]
};

export const CRDGraphTest: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '800px', padding: '20px' }}>
      <h2>CRD-to-CRD Graph Test</h2>
      <p>This test shows a mock ArgoCD Application → AppProject relationship</p>
      <CRDToCRDGraphAnalysis results={mockCRDData} height={700} />
    </div>
  );
};

export default CRDGraphTest;