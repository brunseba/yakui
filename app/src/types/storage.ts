export interface PersistentVolume {
  metadata: {
    name: string;
    namespace?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    creationTimestamp: string;
    uid: string;
  };
  spec: {
    capacity: {
      storage: string;
    };
    accessModes: string[];
    persistentVolumeReclaimPolicy: 'Retain' | 'Delete' | 'Recycle';
    storageClassName?: string;
    volumeMode?: 'Filesystem' | 'Block';
    nodeAffinity?: {
      required?: {
        nodeSelectorTerms: Array<{
          matchExpressions?: Array<{
            key: string;
            operator: string;
            values?: string[];
          }>;
        }>;
      };
    };
    // Volume source types
    awsElasticBlockStore?: {
      volumeID: string;
      fsType?: string;
    };
    azureDisk?: {
      diskName: string;
      diskURI: string;
    };
    gcePersistentDisk?: {
      pdName: string;
      fsType?: string;
    };
    nfs?: {
      server: string;
      path: string;
    };
    hostPath?: {
      path: string;
      type?: string;
    };
    local?: {
      path: string;
    };
    csi?: {
      driver: string;
      volumeHandle: string;
      volumeAttributes?: Record<string, string>;
    };
  };
  status: {
    phase: 'Pending' | 'Available' | 'Bound' | 'Released' | 'Failed';
    message?: string;
    reason?: string;
  };
}

export interface PersistentVolumeClaim {
  metadata: {
    name: string;
    namespace: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    creationTimestamp: string;
    uid: string;
  };
  spec: {
    accessModes: string[];
    resources: {
      requests: {
        storage: string;
      };
      limits?: {
        storage?: string;
      };
    };
    storageClassName?: string;
    volumeName?: string;
    selector?: {
      matchLabels?: Record<string, string>;
      matchExpressions?: Array<{
        key: string;
        operator: string;
        values?: string[];
      }>;
    };
    volumeMode?: 'Filesystem' | 'Block';
    dataSource?: {
      name: string;
      kind: string;
      apiGroup?: string;
    };
  };
  status: {
    phase: 'Pending' | 'Bound' | 'Lost';
    accessModes?: string[];
    capacity?: {
      storage: string;
    };
    conditions?: Array<{
      type: string;
      status: string;
      reason?: string;
      message?: string;
      lastProbeTime?: string;
      lastTransitionTime?: string;
    }>;
  };
}

export interface StorageClass {
  metadata: {
    name: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    creationTimestamp: string;
    uid: string;
  };
  provisioner: string;
  parameters?: Record<string, string>;
  reclaimPolicy?: 'Delete' | 'Retain';
  allowVolumeExpansion?: boolean;
  mountOptions?: string[];
  volumeBindingMode?: 'Immediate' | 'WaitForFirstConsumer';
  allowedTopologies?: Array<{
    matchLabelExpressions?: Array<{
      key: string;
      values: string[];
    }>;
  }>;
}

export interface VolumeSnapshot {
  metadata: {
    name: string;
    namespace: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    creationTimestamp: string;
    uid: string;
  };
  spec: {
    source: {
      persistentVolumeClaimName?: string;
      volumeSnapshotContentName?: string;
    };
    volumeSnapshotClassName?: string;
  };
  status?: {
    boundVolumeSnapshotContentName?: string;
    creationTime?: string;
    readyToUse?: boolean;
    restoreSize?: string;
    error?: {
      message?: string;
      time?: string;
    };
  };
}

export interface StorageStatistics {
  totalPVs: number;
  totalPVCs: number;
  totalStorageClasses: number;
  totalCapacity: string;
  usedCapacity: string;
  availableCapacity: string;
  utilizationPercentage: number;
  pvsByStatus: {
    available: number;
    bound: number;
    released: number;
    failed: number;
  };
  pvcsByStatus: {
    pending: number;
    bound: number;
    lost: number;
  };
  storageClassDistribution: Array<{
    name: string;
    count: number;
    provisioner: string;
  }>;
  topNamespacesByUsage: Array<{
    namespace: string;
    usage: string;
    pvcCount: number;
  }>;
}

export interface StorageFilters {
  status?: string[];
  storageClass?: string[];
  accessMode?: string[];
  namespace?: string[];
  capacity?: {
    min?: string;
    max?: string;
  };
  createdAfter?: string;
  createdBefore?: string;
  search?: string;
}

export interface StorageViewType {
  id: 'overview' | 'persistent-volumes' | 'persistent-volume-claims' | 'storage-classes' | 'volume-snapshots';
  label: string;
  icon: React.ReactElement;
  path: string;
}

// Form interfaces for creating/editing storage resources
export interface PVFormData {
  name: string;
  capacity: string;
  accessModes: string[];
  reclaimPolicy: 'Retain' | 'Delete' | 'Recycle';
  storageClassName?: string;
  volumeMode: 'Filesystem' | 'Block';
  volumeSource: {
    type: 'nfs' | 'hostPath' | 'local' | 'awsEBS' | 'gcePD' | 'azureDisk' | 'csi';
    config: Record<string, any>;
  };
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface PVCFormData {
  name: string;
  namespace: string;
  accessModes: string[];
  storageRequest: string;
  storageClassName?: string;
  volumeMode: 'Filesystem' | 'Block';
  selector?: {
    matchLabels?: Record<string, string>;
  };
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface StorageClassFormData {
  name: string;
  provisioner: string;
  parameters?: Record<string, string>;
  reclaimPolicy: 'Delete' | 'Retain';
  allowVolumeExpansion: boolean;
  volumeBindingMode: 'Immediate' | 'WaitForFirstConsumer';
  mountOptions?: string[];
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}