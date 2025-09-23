/**
 * CRD Composer Service
 * Handles API calls for CRD composition functionality
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export interface CRDTemplate {
  id: string;
  name: string;
  description: string;
  template: {
    metadata: {
      group: string;
      names: {
        kind: string;
        plural: string;
        singular: string;
        shortNames: string[];
      };
    };
    spec: {
      version: string;
      scope: 'Namespaced' | 'Cluster';
    };
    schema: any; // OpenAPI v3 schema
  };
}

export interface CRDGenerateRequest {
  metadata: {
    group: string;
    names: {
      kind: string;
      plural: string;
      singular?: string;
      shortNames?: string[];
    };
  };
  spec: {
    version: string;
    scope: 'Namespaced' | 'Cluster';
    additionalPrinterColumns?: any[];
  };
  schema?: any; // Custom OpenAPI v3 schema
}

export interface CRDValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    validatedAt: string;
  };
}

export interface CRDPreviewResult {
  success: boolean;
  preview: string;
  format: 'json' | 'yaml';
  metadata: {
    generatedAt: string;
    crdName?: string;
    size: number;
  };
}

export interface CRDApplyResult {
  success: boolean;
  action: 'created' | 'updated';
  crd: any;
  message: string;
  dryRun?: boolean;
  crdName?: string;
}

/**
 * Service for CRD Composer API operations
 */
export class CRDComposerService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/composer`;
  }

  /**
   * Get available CRD templates
   */
  async getTemplates(): Promise<{ templates: CRDTemplate[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/templates`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('[CRDComposerService] Failed to get templates:', error);
      throw error;
    }
  }

  /**
   * Generate CRD from composer input
   */
  async generateCRD(composerData: CRDGenerateRequest): Promise<{
    success: boolean;
    crd: any;
    metadata: {
      generatedAt: string;
      crdName: string;
      group: string;
      kind: string;
    };
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(composerData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to generate CRD: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('[CRDComposerService] Failed to generate CRD:', error);
      throw error;
    }
  }

  /**
   * Validate CRD structure
   */
  async validateCRD(crd: any, schemaOnly: boolean = false): Promise<CRDValidationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ crd, schemaOnly }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to validate CRD: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('[CRDComposerService] Failed to validate CRD:', error);
      throw error;
    }
  }

  /**
   * Preview CRD as YAML or JSON
   */
  async previewCRD(crd: any, format: 'json' | 'yaml' = 'json'): Promise<CRDPreviewResult> {
    try {
      const response = await fetch(`${this.baseUrl}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ crd, format }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to preview CRD: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('[CRDComposerService] Failed to preview CRD:', error);
      throw error;
    }
  }

  /**
   * Apply CRD to Kubernetes cluster
   */
  async applyCRD(crd: any, dryRun: boolean = false): Promise<CRDApplyResult> {
    try {
      const response = await fetch(`${this.baseUrl}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ crd, dryRun }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to apply CRD: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('[CRDComposerService] Failed to apply CRD:', error);
      throw error;
    }
  }
}

/**
 * Singleton instance of the CRD Composer service
 */
export const crdComposerService = new CRDComposerService();

/**
 * Default export for easier importing
 */
export default crdComposerService;