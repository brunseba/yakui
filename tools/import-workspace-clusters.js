#!/usr/bin/env node

/**
 * Script to import workspace kubeconfig files into the cluster management system
 * This script reads the kubeconfig files from the workspace directory and creates
 * cluster configurations that can be used by the multi-cluster management feature.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKSPACE_DIR = path.join(__dirname, '..', 'workspace');
const CLUSTER_STORAGE_KEY = 'kubernetes-clusters';

// Kubeconfig files in workspace
const KUBECONFIG_FILES = [
  {
    name: 'Talos 3-Node Cluster',
    file: 'kubeconfig-talos-3-noeuds',
    description: '3-node Talos control plane cluster'
  },
  {
    name: 'Talos Local Cluster',
    file: 'kubeconfig-talosctl-cluster-local', 
    description: 'Local Talos cluster with 1 control plane and 2 workers'
  }
];

function generateId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function parseKubeconfig(kubeconfigContent) {
  try {
    const kubeconfig = yaml.load(kubeconfigContent);
    
    if (!kubeconfig || !kubeconfig.contexts || !kubeconfig.clusters || !kubeconfig.users) {
      throw new Error('Invalid kubeconfig format');
    }

    return kubeconfig;
  } catch (error) {
    throw new Error(`Failed to parse kubeconfig: ${error.message}`);
  }
}

function createClusterFromKubeconfig(kubeconfigFile, description) {
  const kubeconfigPath = path.join(WORKSPACE_DIR, kubeconfigFile.file);
  
  if (!fs.existsSync(kubeconfigPath)) {
    console.warn(`Kubeconfig file not found: ${kubeconfigPath}`);
    return null;
  }

  const kubeconfigContent = fs.readFileSync(kubeconfigPath, 'utf8');
  const kubeconfig = parseKubeconfig(kubeconfigContent);
  
  // Use the first context (there's typically only one in these files)
  const context = kubeconfig.contexts[0];
  const cluster = kubeconfig.clusters.find(c => c.name === context.context.cluster);
  const user = kubeconfig.users.find(u => u.name === context.context.user);
  
  if (!cluster || !user) {
    console.warn(`Invalid kubeconfig structure in ${kubeconfigFile.file}`);
    return null;
  }

  const now = new Date();
  const clusterId = generateId();

  // Extract server URL for provider detection
  const serverUrl = cluster.cluster.server;
  const contextLower = context.name.toLowerCase();
  
  // Determine provider
  let provider = 'local'; // Default for Talos clusters
  if (contextLower.includes('talos')) {
    provider = 'local';
  }

  // Determine environment
  let environment = 'development';
  if (contextLower.includes('prod') || contextLower.includes('production')) {
    environment = 'production';
  } else if (contextLower.includes('staging')) {
    environment = 'staging';
  }

  // Generate display name
  const displayName = kubeconfigFile.name;
  
  return {
    config: {
      id: clusterId,
      name: context.name,
      displayName: displayName,
      description: description || `Imported from ${kubeconfigFile.file}`,
      server: serverUrl,
      provider: provider,
      environment: environment,
      tags: {
        imported: 'true',
        source: 'workspace',
        file: kubeconfigFile.file
      },
      createdAt: now,
      updatedAt: now,
      isDefault: false
    },
    auth: {
      clusterId: clusterId,
      type: 'kubeconfig',
      kubeconfig: kubeconfigContent,
      namespace: context.context.namespace || 'default'
    },
    status: {
      clusterId: clusterId,
      status: 'unknown',
      lastChecked: now
    }
  };
}

async function importClusters() {
  console.log('🚀 Starting cluster import from workspace...');
  
  const clusters = [];
  
  for (const kubeconfigFile of KUBECONFIG_FILES) {
    console.log(`📁 Processing ${kubeconfigFile.file}...`);
    
    try {
      const cluster = createClusterFromKubeconfig(kubeconfigFile, kubeconfigFile.description);
      if (cluster) {
        clusters.push(cluster);
        console.log(`✅ Successfully processed ${kubeconfigFile.name}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${kubeconfigFile.file}:`, error.message);
    }
  }
  
  if (clusters.length === 0) {
    console.log('⚠️ No clusters were imported');
    return;
  }

  // Set the first cluster as default
  if (clusters.length > 0) {
    clusters[0].config.isDefault = true;
    console.log(`🌟 Set ${clusters[0].config.displayName} as default cluster`);
  }

  // Generate the localStorage data structure
  const clusterData = JSON.stringify(clusters, null, 2);
  
  // Output file for manual import
  const outputPath = path.join(__dirname, '..', 'workspace', 'imported-clusters.json');
  fs.writeFileSync(outputPath, clusterData);
  
  console.log(`\n📊 Import Summary:`);
  console.log(`   Total clusters imported: ${clusters.length}`);
  console.log(`   Output file: ${outputPath}`);
  
  clusters.forEach((cluster, index) => {
    console.log(`   ${index + 1}. ${cluster.config.displayName}`);
    console.log(`      Server: ${cluster.config.server}`);
    console.log(`      Provider: ${cluster.config.provider}`);
    console.log(`      Environment: ${cluster.config.environment}`);
    console.log(`      Default: ${cluster.config.isDefault ? 'Yes' : 'No'}`);
  });

  console.log(`\n📋 Next Steps:`);
  console.log(`1. Copy the content from ${outputPath}`);
  console.log(`2. Open the Kubernetes Admin UI in your browser`);
  console.log(`3. Open browser developer tools (F12)`);
  console.log(`4. Go to Application/Storage > Local Storage > http://localhost:5173`);
  console.log(`5. Set key '${CLUSTER_STORAGE_KEY}' with the JSON content`);
  console.log(`6. Refresh the application to see the imported clusters`);
  
  // Also create a ready-to-use localStorage script
  const scriptPath = path.join(__dirname, '..', 'workspace', 'import-clusters.js');
  const scriptContent = `// Paste this in the browser console to import clusters
localStorage.setItem('${CLUSTER_STORAGE_KEY}', ${JSON.stringify(JSON.stringify(clusters))});
console.log('✅ Clusters imported! Refresh the page to see them.');`;
  
  fs.writeFileSync(scriptPath, scriptContent);
  console.log(`\n🚀 Quick import script created: ${scriptPath}`);
  console.log(`   Copy the content and paste it in the browser console`);
}

// Run the import
importClusters().catch(error => {
  console.error('❌ Import failed:', error);
  process.exit(1);
});