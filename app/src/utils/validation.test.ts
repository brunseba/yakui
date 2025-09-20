import { describe, it, expect } from 'vitest'
import {
  ValidationPatterns,
  ValidationRules,
  validateField,
  validateForm,
  validateYAML,
  validateK8sResource,
  SecurityValidation,
} from './validation'

describe('ValidationPatterns', () => {
  describe('K8S_NAME', () => {
    it('should accept valid Kubernetes names', () => {
      const validNames = [
        'my-app',
        'web-server-1',
        'test123',
        'a',
        'app-frontend-v2',
      ]
      
      validNames.forEach(name => {
        expect(ValidationPatterns.K8S_NAME.test(name)).toBe(true)
      })
    })

    it('should reject invalid Kubernetes names', () => {
      const invalidNames = [
        'My-App', // uppercase
        'my_app', // underscore
        '-myapp', // starts with hyphen
        'myapp-', // ends with hyphen
        '', // empty
        'my..app', // double dots
      ]
      
      invalidNames.forEach(name => {
        expect(ValidationPatterns.K8S_NAME.test(name)).toBe(false)
      })
    })
  })

  describe('EMAIL', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.user+tag@domain.co.uk',
        'user123@test-domain.com',
      ]
      
      validEmails.forEach(email => {
        expect(ValidationPatterns.EMAIL.test(email)).toBe(true)
      })
    })

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user space@domain.com',
      ]
      
      invalidEmails.forEach(email => {
        expect(ValidationPatterns.EMAIL.test(email)).toBe(false)
      })
    })
  })

  describe('IPV4', () => {
    it('should accept valid IPv4 addresses', () => {
      const validIPs = [
        '192.168.1.1',
        '127.0.0.1',
        '10.0.0.0',
        '0.0.0.0',
        '255.255.255.255',
      ]
      
      validIPs.forEach(ip => {
        expect(ValidationPatterns.IPV4.test(ip)).toBe(true)
      })
    })

    it('should reject invalid IPv4 addresses', () => {
      const invalidIPs = [
        '256.1.1.1',
        '192.168.1',
        '192.168.1.256',
        'not-an-ip',
      ]
      
      invalidIPs.forEach(ip => {
        expect(ValidationPatterns.IPV4.test(ip)).toBe(false)
      })
    })
  })

  describe('PORT', () => {
    it('should accept valid port numbers', () => {
      const validPorts = ['80', '443', '8080', '3000', '65535']
      
      validPorts.forEach(port => {
        expect(ValidationPatterns.PORT.test(port)).toBe(true)
      })
    })

    it('should reject invalid port numbers', () => {
      const invalidPorts = ['0', '65536', '99999', 'abc', '-1']
      
      invalidPorts.forEach(port => {
        expect(ValidationPatterns.PORT.test(port)).toBe(false)
      })
    })
  })
})

describe('ValidationRules', () => {
  describe('required', () => {
    it('should pass for non-empty strings', () => {
      const rule = ValidationRules.required()
      expect(rule.test('hello')).toBe(true)
      expect(rule.test('  test  ')).toBe(true)
    })

    it('should fail for empty strings', () => {
      const rule = ValidationRules.required()
      expect(rule.test('')).toBe(false)
      expect(rule.test('   ')).toBe(false)
    })

    it('should have correct default message', () => {
      const rule = ValidationRules.required()
      expect(rule.message).toBe('This field is required')
    })

    it('should accept custom message', () => {
      const rule = ValidationRules.required('Custom required message')
      expect(rule.message).toBe('Custom required message')
    })
  })

  describe('minLength', () => {
    it('should pass for strings meeting minimum length', () => {
      const rule = ValidationRules.minLength(3)
      expect(rule.test('abc')).toBe(true)
      expect(rule.test('abcd')).toBe(true)
    })

    it('should fail for strings below minimum length', () => {
      const rule = ValidationRules.minLength(3)
      expect(rule.test('ab')).toBe(false)
      expect(rule.test('')).toBe(false)
    })
  })

  describe('maxLength', () => {
    it('should pass for strings within maximum length', () => {
      const rule = ValidationRules.maxLength(5)
      expect(rule.test('abc')).toBe(true)
      expect(rule.test('abcde')).toBe(true)
    })

    it('should fail for strings exceeding maximum length', () => {
      const rule = ValidationRules.maxLength(5)
      expect(rule.test('abcdef')).toBe(false)
    })
  })

  describe('k8sName', () => {
    it('should pass for valid Kubernetes names', () => {
      const rule = ValidationRules.k8sName()
      expect(rule.test('my-app')).toBe(true)
      expect(rule.test('web-server-1')).toBe(true)
    })

    it('should fail for invalid Kubernetes names', () => {
      const rule = ValidationRules.k8sName()
      expect(rule.test('My-App')).toBe(false)
      expect(rule.test('-myapp')).toBe(false)
    })
  })
})

describe('validateField', () => {
  it('should return valid result when all rules pass', () => {
    const rules = [
      ValidationRules.required(),
      ValidationRules.minLength(3),
    ]
    
    const result = validateField('hello', rules)
    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('should return invalid result with errors when rules fail', () => {
    const rules = [
      ValidationRules.required(),
      ValidationRules.minLength(5),
    ]
    
    const result = validateField('hi', rules)
    expect(result.isValid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toBe('Must be at least 5 characters')
  })

  it('should collect all validation errors', () => {
    const rules = [
      ValidationRules.required(),
      ValidationRules.minLength(10),
      ValidationRules.maxLength(5),
    ]
    
    const result = validateField('hello', rules)
    expect(result.isValid).toBe(false)
    expect(result.errors).toHaveLength(1) // minLength fails but maxLength passes
    expect(result.errors[0]).toBe('Must be at least 10 characters')
  })
})

describe('validateForm', () => {
  it('should validate all fields in a form', () => {
    const values = {
      name: 'my-app',
      port: '8080',
    }
    
    const rules = {
      name: [ValidationRules.required(), ValidationRules.k8sName()],
      port: [ValidationRules.required(), ValidationRules.port()],
    }
    
    const results = validateForm(values, rules)
    expect(results.name.isValid).toBe(true)
    expect(results.port.isValid).toBe(true)
  })

  it('should return errors for invalid fields', () => {
    const values = {
      name: 'My-App',
      port: '99999',
    }
    
    const rules = {
      name: [ValidationRules.required(), ValidationRules.k8sName()],
      port: [ValidationRules.required(), ValidationRules.port()],
    }
    
    const results = validateForm(values, rules)
    expect(results.name.isValid).toBe(false)
    expect(results.port.isValid).toBe(false)
  })
})

describe('validateYAML', () => {
  it('should accept valid YAML', () => {
    const validYaml = `
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers:
  - name: test
    image: nginx:latest
`
    const result = validateYAML(validYaml)
    expect(result.isValid).toBe(true)
  })

  it('should reject empty YAML', () => {
    const result = validateYAML('')
    expect(result.isValid).toBe(false)
    expect(result.errors[0]).toBe('YAML content is required')
  })

  it('should reject YAML with tabs', () => {
    const yamlWithTabs = 'apiVersion: v1\n\tkind: Pod'
    const result = validateYAML(yamlWithTabs)
    expect(result.isValid).toBe(false)
    expect(result.errors[0]).toContain('YAML does not allow tabs')
  })

  it('should reject YAML with inconsistent indentation', () => {
    const yamlWithBadIndent = 'apiVersion: v1\n   kind: Pod'
    const result = validateYAML(yamlWithBadIndent)
    expect(result.isValid).toBe(false)
    expect(result.errors[0]).toContain('Inconsistent indentation')
  })
})

describe('validateK8sResource', () => {
  it('should accept valid Kubernetes resource', () => {
    const validResource = `apiVersion: v1
kind: Pod
metadata:
  name: test-pod`
    const result = validateK8sResource(validResource)
    expect(result.isValid).toBe(true)
  })

  it('should reject resource without apiVersion', () => {
    const invalidResource = `kind: Pod
metadata:
  name: test-pod`
    const result = validateK8sResource(invalidResource)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Missing required field: apiVersion')
  })

  it('should reject resource without kind', () => {
    const invalidResource = `apiVersion: v1
metadata:
  name: test-pod`
    const result = validateK8sResource(invalidResource)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Missing required field: kind')
  })

  it('should reject resource without metadata.name', () => {
    const invalidResource = `apiVersion: v1
kind: Pod
metadata:
  labels: {}`
    const result = validateK8sResource(invalidResource)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Missing required field: metadata.name')
  })
})

describe('SecurityValidation', () => {
  describe('validateContainerSecurity', () => {
    it('should pass for secure container configuration', () => {
      const secureConfig = {
        securityContext: {
          runAsUser: 1000,
          privileged: false,
          allowPrivilegeEscalation: false,
          readOnlyRootFilesystem: true,
          runAsNonRoot: true,
        }
      }
      
      const result = SecurityValidation.validateContainerSecurity(secureConfig)
      expect(result.isValid).toBe(true)
    })

    it('should fail for container running as root', () => {
      const insecureConfig = {
        securityContext: {
          runAsUser: 0,
        }
      }
      
      const result = SecurityValidation.validateContainerSecurity(insecureConfig)
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('running as root user')
    })

    it('should fail for privileged container', () => {
      const insecureConfig = {
        securityContext: {
          privileged: true,
        }
      }
      
      const result = SecurityValidation.validateContainerSecurity(insecureConfig)
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('privileged mode')
    })
  })

  describe('validateImageSecurity', () => {
    it('should pass for image with specific tag', () => {
      const result = SecurityValidation.validateImageSecurity('nginx:1.21.0')
      expect(result.isValid).toBe(true)
    })

    it('should fail for image with latest tag', () => {
      const result = SecurityValidation.validateImageSecurity('nginx:latest')
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('latest tag')
    })

    it('should fail for image without tag', () => {
      const result = SecurityValidation.validateImageSecurity('nginx')
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('latest tag or no tag')
    })

    it('should fail for insecure HTTP registry', () => {
      const result = SecurityValidation.validateImageSecurity('http://registry.com/nginx:1.21.0')
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('insecure HTTP registry')
    })
  })

  describe('validateSensitiveData', () => {
    it('should pass for content without sensitive data', () => {
      const content = 'apiVersion: v1\nkind: ConfigMap\ndata:\n  config: value'
      const result = SecurityValidation.validateSensitiveData(content)
      expect(result.isValid).toBe(true)
    })

    it('should fail for content with password', () => {
      const content = 'password: secretpassword123'
      const result = SecurityValidation.validateSensitiveData(content)
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('password exposure')
    })

    it('should fail for content with API key', () => {
      const content = 'api_key: abcd1234567890'
      const result = SecurityValidation.validateSensitiveData(content)
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('API key exposure')
    })

    it('should fail for content with private key', () => {
      const content = '-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgk...'
      const result = SecurityValidation.validateSensitiveData(content)
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('Private key detected')
    })
  })
})