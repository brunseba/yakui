/**
 * Kubernetes Configuration Manager
 * 
 * This module provides dynamic kubeconfig management capabilities,
 * allowing the backend to switch between different cluster configurations
 * based on user authentication requests.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const yaml = require('js-yaml');

class KubeconfigManager {
  constructor() {
    this.activeConfig = null;
    this.activeContext = null;
    this.k8s = null;
  }

  /**
   * Initialize the manager with the Kubernetes client library
   * @param {object} k8sClient - The @kubernetes/client-node module
   */
  async initialize(k8sClient) {
    this.k8s = k8sClient;
    console.log('🔧 KubeconfigManager initialized');
  }

  /**
   * Load kubeconfig from various sources
   * @param {object} options - Configuration options
   * @param {string} options.type - 'default' | 'custom' | 'token'
   * @param {string} options.content - Custom kubeconfig YAML content (for type: 'custom')
   * @param {string} options.token - Service account token (for type: 'token')
   * @param {string} options.server - API server URL (for type: 'token')
   * @param {string} options.context - Specific context to use
   * @param {boolean} options.insecure - Skip TLS verification (development only)
   * @returns {object} Kubernetes client APIs
   */
  async loadKubeconfig(options = {}) {
    const { type = 'default', content, token, server, context, insecure = true } = options;
    
    console.log(`🔄 Loading kubeconfig - Type: ${type}`, {
      hasContent: !!content,
      hasToken: !!token,
      hasServer: !!server,
      context
    });

    if (!this.k8s) {
      throw new Error('KubeconfigManager not initialized. Call initialize() first.');
    }

    const kc = new this.k8s.KubeConfig();

    try {
      switch (type) {
        case 'default':
          await this.loadDefaultKubeconfig(kc, context);
          break;
        
        case 'custom':
          if (!content) {
            throw new Error('Custom kubeconfig content is required');
          }
          await this.loadCustomKubeconfig(kc, content, context, insecure);
          break;
        
        case 'token':
          if (!token || !server) {
            throw new Error('Token and server URL are required for token authentication');
          }
          await this.loadTokenBasedConfig(kc, token, server);
          break;
        
        default:
          throw new Error(`Unsupported kubeconfig type: ${type}`);
      }

      // Create API clients
      const apis = this.createApiClients(kc);
      
      // Test the connection with insecure flag
      await this.testConnection(apis.coreV1Api, insecure);
      
      // Store active configuration
      this.activeConfig = kc;
      this.activeContext = kc.getCurrentContext();
      
      console.log('✅ Kubeconfig loaded successfully', {
        context: this.activeContext,
        cluster: kc.getCurrentCluster()?.server,
        user: kc.getCurrentUser()?.name
      });

      return apis;

    } catch (error) {
      console.error('❌ Failed to load kubeconfig:', error.message);
      throw error;
    }
  }

  /**
   * Load default kubeconfig from ~/.kube/config
   */
  async loadDefaultKubeconfig(kc, context) {
    console.log('📂 Loading default kubeconfig...');
    
    kc.loadFromDefault();
    
    if (context) {
      console.log(`🎯 Switching to context: ${context}`);
      const contexts = kc.getContexts();
      const contextExists = contexts.some(ctx => ctx.name === context);
      
      if (!contextExists) {
        throw new Error(`Context '${context}' not found. Available contexts: ${contexts.map(c => c.name).join(', ')}`);
      }
      
      kc.setCurrentContext(context);
    } else {
      // Auto-detect: use first available context if no current context
      const currentContext = kc.getCurrentContext();
      if (!currentContext) {
        const contexts = kc.getContexts();
        if (contexts.length > 0) {
          console.log(`🔍 Auto-detecting context: using ${contexts[0].name}`);
          kc.setCurrentContext(contexts[0].name);
        }
      }
    }
    
    console.log('✅ Default kubeconfig loaded');
  }

  /**
   * Load custom kubeconfig from YAML content
   */
  async loadCustomKubeconfig(kc, yamlContent, context, insecure = true) {
    console.log('📝 Loading custom kubeconfig from YAML content...');
    
    try {
      // Validate YAML syntax
      const configObject = yaml.load(yamlContent);
      if (!configObject || typeof configObject !== 'object') {
        throw new Error('Invalid YAML content');
      }

      // Validate kubeconfig structure
      this.validateKubeconfigStructure(configObject);
      
      // Add insecure-skip-tls-verify for development clusters with weak certificates
      if (insecure) {
        console.log('⚠️ Adding insecure-skip-tls-verify for development cluster');
        configObject.clusters.forEach(cluster => {
          if (cluster.cluster) {
            cluster.cluster['insecure-skip-tls-verify'] = true;
            // Remove certificate-authority-data to skip cert validation
            delete cluster.cluster['certificate-authority-data'];
            delete cluster.cluster['certificate-authority'];
          }
        });
        // Convert back to YAML
        yamlContent = yaml.dump(configObject);
      }
      
      // Create temporary file for the custom kubeconfig
      const tempConfigPath = await this.createTempKubeconfig(yamlContent);
      
      try {
        // Load from temporary file
        kc.loadFromFile(tempConfigPath);
        
        if (context) {
          console.log(`🎯 Switching to context: ${context}`);
          const contexts = kc.getContexts();
          const contextExists = contexts.some(ctx => ctx.name === context);
          
          if (!contextExists) {
            throw new Error(`Context '${context}' not found in custom kubeconfig. Available contexts: ${contexts.map(c => c.name).join(', ')}`);
          }
          
          kc.setCurrentContext(context);
        }
        
        console.log('✅ Custom kubeconfig loaded');
        
      } finally {
        // Clean up temporary file
        this.cleanupTempFile(tempConfigPath);
      }
      
    } catch (error) {
      if (error.message.includes('YAMLException')) {
        throw new Error(`Invalid YAML syntax in kubeconfig: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Load token-based configuration
   */
  async loadTokenBasedConfig(kc, token, server) {
    console.log('🔑 Loading token-based configuration...');
    
    // Create minimal kubeconfig for token authentication
    const config = {
      apiVersion: 'v1',
      kind: 'Config',
      clusters: [{
        cluster: {
          server: server,
          'insecure-skip-tls-verify': true // For development - should be false in production
        },
        name: 'token-cluster'
      }],
      contexts: [{
        context: {
          cluster: 'token-cluster',
          user: 'token-user'
        },
        name: 'token-context'
      }],
      'current-context': 'token-context',
      users: [{
        name: 'token-user',
        user: {
          token: token
        }
      }]
    };
    
    const yamlContent = yaml.dump(config);
    const tempConfigPath = await this.createTempKubeconfig(yamlContent);
    
    try {
      kc.loadFromFile(tempConfigPath);
      console.log('✅ Token-based configuration loaded');
    } finally {
      this.cleanupTempFile(tempConfigPath);
    }
  }

  /**
   * Create API clients from kubeconfig
   */
  createApiClients(kc) {
    console.log('🔨 Creating Kubernetes API clients...');
    
    const apis = {
      kc,
      coreV1Api: kc.makeApiClient(this.k8s.CoreV1Api),
      appsV1Api: kc.makeApiClient(this.k8s.AppsV1Api),
      rbacV1Api: kc.makeApiClient(this.k8s.RbacAuthorizationV1Api),
      apiExtensionsV1Api: kc.makeApiClient(this.k8s.ApiextensionsV1Api),
      customObjectsApi: kc.makeApiClient(this.k8s.CustomObjectsApi),
      storageV1Api: kc.makeApiClient(this.k8s.StorageV1Api)
    };

    // Try to create metrics API (might not be available)
    try {
      apis.metricsV1Api = new this.k8s.Metrics(kc);
    } catch (err) {
      console.log('ℹ️ Metrics API not available:', err.message);
      apis.metricsV1Api = null;
    }

    console.log('✅ API clients created');
    return apis;
  }

  /**
   * Test connection to the cluster
   */
  async testConnection(coreV1Api, insecure = true) {
    console.log('🔍 Testing cluster connection...');
    
    // Set TLS environment before making any requests
    const originalTlsReject = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    if (insecure) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
    
    try {
      // Try a simple API call
      const response = await coreV1Api.getAPIResources();
      console.log('✅ Cluster connection test successful');
      return true;
    } catch (error) {
      console.log('⚠️ Primary connection test failed, trying alternative...');
      
      // Try alternative test
      try {
        const namespaces = await coreV1Api.listNamespace();
        console.log('✅ Alternative connection test successful');
        return true;
      } catch (altError) {
        console.error('❌ All connection tests failed');
        throw new Error(`Cluster connection failed: ${error.message}`);
      }
    } finally {
      // Restore original TLS setting
      if (originalTlsReject !== undefined) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalTlsReject;
      } else {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      }
    }
  }

  /**
   * Validate kubeconfig structure
   */
  validateKubeconfigStructure(config) {
    const requiredFields = ['apiVersion', 'kind', 'clusters', 'contexts', 'users'];
    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Invalid kubeconfig structure. Missing fields: ${missingFields.join(', ')}`);
    }

    if (!Array.isArray(config.clusters) || config.clusters.length === 0) {
      throw new Error('Kubeconfig must contain at least one cluster');
    }

    if (!Array.isArray(config.contexts) || config.contexts.length === 0) {
      throw new Error('Kubeconfig must contain at least one context');
    }

    if (!Array.isArray(config.users) || config.users.length === 0) {
      throw new Error('Kubeconfig must contain at least one user');
    }

    console.log('✅ Kubeconfig structure validated');
  }

  /**
   * Create temporary kubeconfig file
   */
  async createTempKubeconfig(yamlContent) {
    const tempDir = os.tmpdir();
    const tempFileName = `kubeconfig-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const tempPath = path.join(tempDir, tempFileName);
    
    fs.writeFileSync(tempPath, yamlContent, { mode: 0o600 });
    console.log(`📝 Created temporary kubeconfig: ${tempPath}`);
    
    return tempPath;
  }

  /**
   * Clean up temporary file
   */
  cleanupTempFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🧹 Cleaned up temporary file: ${filePath}`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to cleanup temporary file ${filePath}:`, error.message);
    }
  }

  /**
   * Get current configuration info
   */
  getCurrentConfigInfo() {
    if (!this.activeConfig) {
      return null;
    }

    return {
      context: this.activeContext,
      cluster: this.activeConfig.getCurrentCluster(),
      user: this.activeConfig.getCurrentUser(),
      contexts: this.activeConfig.getContexts().map(ctx => ctx.name)
    };
  }

  /**
   * Get available contexts from default kubeconfig
   */
  getAvailableContexts() {
    try {
      const kc = new this.k8s.KubeConfig();
      kc.loadFromDefault();
      const contexts = kc.getContexts();
      const currentContext = kc.getCurrentContext();
      
      return {
        contexts: contexts.map(ctx => ({
          name: ctx.name,
          cluster: ctx.cluster,
          user: ctx.user,
          namespace: ctx.namespace,
          isCurrent: ctx.name === currentContext
        })),
        currentContext
      };
    } catch (error) {
      console.error('❌ Failed to get available contexts:', error.message);
      return {
        contexts: [],
        currentContext: null
      };
    }
  }

  /**
   * Get cluster version information
   */
  async getClusterVersion(coreV1Api) {
    try {
      console.log('📊 Fetching cluster version...');
      const versionApi = this.activeConfig.makeApiClient(this.k8s.VersionApi);
      const response = await versionApi.getCode();
      const version = response.body || response;
      
      return {
        major: version.major || 'unknown',
        minor: version.minor || 'unknown',
        gitVersion: version.gitVersion || 'unknown',
        buildDate: version.buildDate || 'unknown',
        platform: version.platform || 'unknown'
      };
    } catch (error) {
      console.error('❌ Failed to get cluster version:', error.message);
      return {
        major: 'unknown',
        minor: 'unknown', 
        gitVersion: 'unknown',
        buildDate: 'unknown',
        platform: 'unknown'
      };
    }
  }
}

module.exports = { KubeconfigManager };