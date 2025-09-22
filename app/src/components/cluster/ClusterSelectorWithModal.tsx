import React, { useState } from 'react';
import ClusterSelector from './ClusterSelector';
import AddClusterModal from './AddClusterModal';
import { ClusterConnection } from '../../types/cluster';

interface ClusterSelectorWithModalProps {
  variant?: 'header' | 'sidebar' | 'compact';
  showAddButton?: boolean;
  onManageClusters?: () => void;
}

/**
 * ClusterSelectorWithModal - A composed component that includes both
 * the ClusterSelector and AddClusterModal for easy integration
 */
const ClusterSelectorWithModal: React.FC<ClusterSelectorWithModalProps> = ({
  variant = 'header',
  showAddButton = true,
  onManageClusters,
}) => {
  const [addClusterModalOpen, setAddClusterModalOpen] = useState(false);

  const handleAddCluster = () => {
    setAddClusterModalOpen(true);
  };

  const handleClusterAdded = (cluster: ClusterConnection) => {
    console.log('New cluster added:', cluster.config.displayName);
    // Modal will auto-close after successful addition
  };

  return (
    <>
      <ClusterSelector
        variant={variant}
        showAddButton={showAddButton}
        onAddCluster={handleAddCluster}
        onManageClusters={onManageClusters}
      />
      
      <AddClusterModal
        open={addClusterModalOpen}
        onClose={() => setAddClusterModalOpen(false)}
        onSuccess={handleClusterAdded}
      />
    </>
  );
};

export default ClusterSelectorWithModal;