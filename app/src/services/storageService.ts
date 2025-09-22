import { 
  PersistentVolume, 
  PersistentVolumeClaim, 
  StorageClass, 
  VolumeSnapshot,
  StorageStatistics,
  StorageFilters,
  PVFormData,
  PVCFormData,
  StorageClassFormData
} from '../types/storage';

// Mock data for development
const mockPersistentVolumes: PersistentVolume[] = [
  {
    metadata: {
      name: 'pv-nfs-01',
      labels: { 'type': 'nfs', 'tier': 'standard' },
      annotations: { 'pv.kubernetes.io/provisioned-by': 'manual' },
      creationTimestamp: '2024-01-15T10:30:00Z',
      uid: 'pv-001'
    },
    spec: {
      capacity: { storage: '10Gi' },
      accessModes: ['ReadWriteMany'],
      persistentVolumeReclaimPolicy: 'Retain',
      storageClassName: 'nfs-storage',
      volumeMode: 'Filesystem',
      nfs: {
        server: '192.168.1.100',
        path: '/exports/data'
      }
    },
    status: {
      phase: 'Available'
    }
  },
  {
    metadata: {
      name: 'pv-local-ssd-01',
      labels: { 'type': 'local-ssd', 'tier': 'fast' },
      creationTimestamp: '2024-01-20T14:15:00Z',
      uid: 'pv-002'
    },
    spec: {
      capacity: { storage: '100Gi' },
      accessModes: ['ReadWriteOnce'],
      persistentVolumeReclaimPolicy: 'Delete',
      storageClassName: 'fast-ssd',
      volumeMode: 'Filesystem',
      local: {
        path: '/mnt/fast-ssd'
      },
      nodeAffinity: {
        required: {
          nodeSelectorTerms: [{
            matchExpressions: [{
              key: 'kubernetes.io/hostname',
              operator: 'In',
              values: ['worker-01']
            }]
          }]
        }
      }
    },
    status: {
      phase: 'Bound'
    }
  },
  {
    metadata: {
      name: 'pv-aws-ebs-01',
      labels: { 'type': 'aws-ebs', 'zone': 'us-west-2a' },
      creationTimestamp: '2024-01-25T09:45:00Z',
      uid: 'pv-003'
    },
    spec: {
      capacity: { storage: '50Gi' },
      accessModes: ['ReadWriteOnce'],
      persistentVolumeReclaimPolicy: 'Delete',
      storageClassName: 'gp2',
      awsElasticBlockStore: {
        volumeID: 'vol-1234567890abcdef0',
        fsType: 'ext4'
      }
    },
    status: {
      phase: 'Bound'
    }
  }
];

const mockPersistentVolumeClaims: PersistentVolumeClaim[] = [
  {
    metadata: {
      name: 'webapp-storage',
      namespace: 'default',
      labels: { 'app': 'webapp' },
      creationTimestamp: '2024-01-20T14:20:00Z',
      uid: 'pvc-001'
    },
    spec: {
      accessModes: ['ReadWriteOnce'],
      resources: {
        requests: { storage: '10Gi' }
      },
      storageClassName: 'fast-ssd',
      volumeName: 'pv-local-ssd-01'
    },
    status: {
      phase: 'Bound',
      accessModes: ['ReadWriteOnce'],
      capacity: { storage: '100Gi' }
    }
  },
  {
    metadata: {
      name: 'database-storage',
      namespace: 'production',
      labels: { 'app': 'postgres', 'tier': 'db' },
      creationTimestamp: '2024-01-25T09:50:00Z',
      uid: 'pvc-002'
    },
    spec: {
      accessModes: ['ReadWriteOnce'],
      resources: {
        requests: { storage: '50Gi' }
      },
      storageClassName: 'gp2',
      volumeName: 'pv-aws-ebs-01'
    },
    status: {
      phase: 'Bound',
      accessModes: ['ReadWriteOnce'],
      capacity: { storage: '50Gi' }
    }
  },
  {
    metadata: {
      name: 'shared-storage',
      namespace: 'development',
      labels: { 'shared': 'true' },
      creationTimestamp: '2024-01-15T10:35:00Z',
      uid: 'pvc-003'
    },
    spec: {
      accessModes: ['ReadWriteMany'],
      resources: {
        requests: { storage: '5Gi' }
      },
      storageClassName: 'nfs-storage'
    },
    status: {
      phase: 'Pending'
    }
  }
];

const mockStorageClasses: StorageClass[] = [
  {
    metadata: {
      name: 'standard',
      labels: { 'tier': 'standard' },
      annotations: { 'storageclass.kubernetes.io/is-default-class': 'true' },
      creationTimestamp: '2024-01-01T00:00:00Z',
      uid: 'sc-001'
    },
    provisioner: 'kubernetes.io/gce-pd',
    parameters: {
      'type': 'pd-standard',
      'replication-type': 'none'
    },
    reclaimPolicy: 'Delete',
    allowVolumeExpansion: true,
    volumeBindingMode: 'Immediate'
  },
  {
    metadata: {
      name: 'fast-ssd',
      labels: { 'tier': 'fast' },
      creationTimestamp: '2024-01-01T00:00:00Z',
      uid: 'sc-002'
    },
    provisioner: 'kubernetes.io/gce-pd',
    parameters: {
      'type': 'pd-ssd',
      'replication-type': 'none'
    },
    reclaimPolicy: 'Delete',
    allowVolumeExpansion: true,
    volumeBindingMode: 'WaitForFirstConsumer'
  },
  {
    metadata: {
      name: 'nfs-storage',
      labels: { 'tier': 'shared' },
      creationTimestamp: '2024-01-01T00:00:00Z',
      uid: 'sc-003'
    },
    provisioner: 'cluster.local/nfs-client-provisioner',
    parameters: {
      'archiveOnDelete': 'false'
    },
    reclaimPolicy: 'Delete',
    allowVolumeExpansion: false,
    volumeBindingMode: 'Immediate'
  }
];

class StorageService {
  // Persistent Volumes
  async getPersistentVolumes(filters?: StorageFilters): Promise<PersistentVolume[]> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let filtered = [...mockPersistentVolumes];
    
    if (filters?.status?.length) {
      filtered = filtered.filter(pv => 
        filters.status!.includes(pv.status.phase.toLowerCase())
      );
    }
    
    if (filters?.storageClass?.length) {
      filtered = filtered.filter(pv => 
        pv.spec.storageClassName && 
        filters.storageClass!.includes(pv.spec.storageClassName)
      );
    }
    
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(pv => 
        pv.metadata.name.toLowerCase().includes(search)
      );
    }
    
    return filtered;
  }

  async getPersistentVolume(name: string): Promise<PersistentVolume | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockPersistentVolumes.find(pv => pv.metadata.name === name) || null;
  }

  async createPersistentVolume(data: PVFormData): Promise<PersistentVolume> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const newPV: PersistentVolume = {
      metadata: {
        name: data.name,
        labels: data.labels,
        annotations: data.annotations,
        creationTimestamp: new Date().toISOString(),
        uid: `pv-${Date.now()}`
      },
      spec: {
        capacity: { storage: data.capacity },
        accessModes: data.accessModes,
        persistentVolumeReclaimPolicy: data.reclaimPolicy,
        storageClassName: data.storageClassName,
        volumeMode: data.volumeMode,
        ...(data.volumeSource.type === 'nfs' && {
          nfs: data.volumeSource.config
        }),
        ...(data.volumeSource.type === 'hostPath' && {
          hostPath: data.volumeSource.config
        }),
        ...(data.volumeSource.type === 'local' && {
          local: data.volumeSource.config
        })
      },
      status: {
        phase: 'Available'
      }
    };
    
    mockPersistentVolumes.push(newPV);
    return newPV;
  }

  async deletePersistentVolume(name: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 600));
    const index = mockPersistentVolumes.findIndex(pv => pv.metadata.name === name);
    if (index !== -1) {
      mockPersistentVolumes.splice(index, 1);
    }
  }

  // Persistent Volume Claims
  async getPersistentVolumeClaims(namespace?: string, filters?: StorageFilters): Promise<PersistentVolumeClaim[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let filtered = [...mockPersistentVolumeClaims];
    
    if (namespace && namespace !== 'all') {
      filtered = filtered.filter(pvc => pvc.metadata.namespace === namespace);
    }
    
    if (filters?.status?.length) {
      filtered = filtered.filter(pvc => 
        filters.status!.includes(pvc.status.phase.toLowerCase())
      );
    }
    
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(pvc => 
        pvc.metadata.name.toLowerCase().includes(search) ||
        pvc.metadata.namespace.toLowerCase().includes(search)
      );
    }
    
    return filtered;
  }

  async getPersistentVolumeClaim(namespace: string, name: string): Promise<PersistentVolumeClaim | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockPersistentVolumeClaims.find(pvc => 
      pvc.metadata.namespace === namespace && pvc.metadata.name === name
    ) || null;
  }

  async createPersistentVolumeClaim(data: PVCFormData): Promise<PersistentVolumeClaim> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const newPVC: PersistentVolumeClaim = {
      metadata: {
        name: data.name,
        namespace: data.namespace,
        labels: data.labels,
        annotations: data.annotations,
        creationTimestamp: new Date().toISOString(),
        uid: `pvc-${Date.now()}`
      },
      spec: {
        accessModes: data.accessModes,
        resources: {
          requests: { storage: data.storageRequest }
        },
        storageClassName: data.storageClassName,
        volumeMode: data.volumeMode,
        selector: data.selector
      },
      status: {
        phase: 'Pending'
      }
    };
    
    mockPersistentVolumeClaims.push(newPVC);
    return newPVC;
  }

  async deletePersistentVolumeClaim(namespace: string, name: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 600));
    const index = mockPersistentVolumeClaims.findIndex(pvc => 
      pvc.metadata.namespace === namespace && pvc.metadata.name === name
    );
    if (index !== -1) {
      mockPersistentVolumeClaims.splice(index, 1);
    }
  }

  // Storage Classes
  async getStorageClasses(): Promise<StorageClass[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return [...mockStorageClasses];
  }

  async getStorageClass(name: string): Promise<StorageClass | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockStorageClasses.find(sc => sc.metadata.name === name) || null;
  }

  async createStorageClass(data: StorageClassFormData): Promise<StorageClass> {
    await new Promise(resolve => setTimeout(resolve, 700));
    
    const newSC: StorageClass = {
      metadata: {
        name: data.name,
        labels: data.labels,
        annotations: data.annotations,
        creationTimestamp: new Date().toISOString(),
        uid: `sc-${Date.now()}`
      },
      provisioner: data.provisioner,
      parameters: data.parameters,
      reclaimPolicy: data.reclaimPolicy,
      allowVolumeExpansion: data.allowVolumeExpansion,
      volumeBindingMode: data.volumeBindingMode,
      mountOptions: data.mountOptions
    };
    
    mockStorageClasses.push(newSC);
    return newSC;
  }

  async deleteStorageClass(name: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 600));
    const index = mockStorageClasses.findIndex(sc => sc.metadata.name === name);
    if (index !== -1) {
      mockStorageClasses.splice(index, 1);
    }
  }

  // Statistics and Analytics
  async getStorageStatistics(): Promise<StorageStatistics> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const totalCapacityBytes = mockPersistentVolumes.reduce((total, pv) => {
      const capacity = pv.spec.capacity.storage;
      const sizeInBytes = this.parseStorageSize(capacity);
      return total + sizeInBytes;
    }, 0);
    
    const usedCapacityBytes = mockPersistentVolumeClaims
      .filter(pvc => pvc.status.phase === 'Bound')
      .reduce((total, pvc) => {
        const capacity = pvc.status.capacity?.storage || pvc.spec.resources.requests.storage;
        const sizeInBytes = this.parseStorageSize(capacity);
        return total + sizeInBytes;
      }, 0);
    
    const pvsByStatus = mockPersistentVolumes.reduce((acc, pv) => {
      const status = pv.status.phase.toLowerCase();
      acc[status as keyof typeof acc] = (acc[status as keyof typeof acc] || 0) + 1;
      return acc;
    }, { available: 0, bound: 0, released: 0, failed: 0 });
    
    const pvcsByStatus = mockPersistentVolumeClaims.reduce((acc, pvc) => {
      const status = pvc.status.phase.toLowerCase();
      acc[status as keyof typeof acc] = (acc[status as keyof typeof acc] || 0) + 1;
      return acc;
    }, { pending: 0, bound: 0, lost: 0 });
    
    const storageClassDistribution = mockStorageClasses.map(sc => ({
      name: sc.metadata.name,
      count: mockPersistentVolumes.filter(pv => pv.spec.storageClassName === sc.metadata.name).length,
      provisioner: sc.provisioner
    }));
    
    const namespaceUsage = mockPersistentVolumeClaims.reduce((acc, pvc) => {
      const ns = pvc.metadata.namespace;
      if (!acc[ns]) {
        acc[ns] = { usage: 0, count: 0 };
      }
      acc[ns].count++;
      if (pvc.status.capacity?.storage) {
        acc[ns].usage += this.parseStorageSize(pvc.status.capacity.storage);
      }
      return acc;
    }, {} as Record<string, { usage: number; count: number }>);
    
    const topNamespacesByUsage = Object.entries(namespaceUsage)
      .map(([namespace, data]) => ({
        namespace,
        usage: this.formatStorageSize(data.usage),
        pvcCount: data.count
      }))
      .sort((a, b) => this.parseStorageSize(b.usage) - this.parseStorageSize(a.usage))
      .slice(0, 5);
    
    return {
      totalPVs: mockPersistentVolumes.length,
      totalPVCs: mockPersistentVolumeClaims.length,
      totalStorageClasses: mockStorageClasses.length,
      totalCapacity: this.formatStorageSize(totalCapacityBytes),
      usedCapacity: this.formatStorageSize(usedCapacityBytes),
      availableCapacity: this.formatStorageSize(totalCapacityBytes - usedCapacityBytes),
      utilizationPercentage: totalCapacityBytes > 0 ? (usedCapacityBytes / totalCapacityBytes) * 100 : 0,
      pvsByStatus,
      pvcsByStatus,
      storageClassDistribution,
      topNamespacesByUsage
    };
  }

  // Helper methods
  private parseStorageSize(size: string): number {
    const units = {
      'Ki': 1024,
      'Mi': 1024 ** 2,
      'Gi': 1024 ** 3,
      'Ti': 1024 ** 4,
      'K': 1000,
      'M': 1000 ** 2,
      'G': 1000 ** 3,
      'T': 1000 ** 4,
    };
    
    const match = size.match(/^(\d+(?:\.\d+)?)(.*)?$/);
    if (!match) return 0;
    
    const [, amount, unit] = match;
    const multiplier = units[unit as keyof typeof units] || 1;
    return parseFloat(amount) * multiplier;
  }

  private formatStorageSize(bytes: number): string {
    const units = ['B', 'Ki', 'Mi', 'Gi', 'Ti'];
    let unitIndex = 0;
    let size = bytes;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${Math.round(size * 100) / 100}${units[unitIndex]}`;
  }
}

export const storageService = new StorageService();