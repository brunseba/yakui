import { useState, useEffect } from 'react';
import { getEnvironmentTheme } from '../config/dependency-theme';

interface GraphDimensions {
  height: number;
  nodeWidth: number;
  nodeHeight: number;
}

export const useGraphDimensions = () => {
  const [dimensions, setDimensions] = useState<GraphDimensions>(() => {
    const theme = getEnvironmentTheme();
    return {
      height: Math.max(400, window.innerHeight * 0.6),
      nodeWidth: theme.nodeSize.width,
      nodeHeight: theme.nodeSize.height
    };
  });

  useEffect(() => {
    const theme = getEnvironmentTheme();
    
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      const isTablet = window.innerWidth < 1024;
      
      setDimensions({
        height: Math.max(400, window.innerHeight * (isMobile ? 0.5 : 0.6)),
        nodeWidth: isMobile ? 180 : isTablet ? 220 : theme.nodeSize.width,
        nodeHeight: isMobile ? 120 : isTablet ? 135 : theme.nodeSize.height
      });
    };
    
    // Set initial dimensions
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return dimensions;
};