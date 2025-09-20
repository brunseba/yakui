# Phase 1 Week 1 Quick Start: HTTPS Implementation

## Overview
This guide will help you implement HTTPS and security headers for the Kubernetes Admin UI. This is the critical first step in the security remediation plan.

**Timeline**: 3-4 days  
**Effort**: 16-20 hours  
**Priority**: CRITICAL

## Prerequisites

### Install Required Tools
```bash
# Install mkcert for local certificate generation
brew install mkcert

# Install additional npm packages
cd /Users/brun_s/sandbox/kubernetes-admin-ui
npm install helmet https
npm install --save-dev mkcert
```

## Step 1: Generate Development Certificates (30 minutes)

### Setup Local Certificate Authority
```bash
# Install local CA
mkcert -install

# Generate certificates for development
mkcert localhost 127.0.0.1 ::1

# Move certificates to security folder
mkdir -p security/certificates
mv localhost+2.pem security/certificates/
mv localhost+2-key.pem security/certificates/

# Verify certificates were created
ls -la security/certificates/
```

## Step 2: Create HTTPS Development Server (2-3 hours)

### Create `dev-server-https.cjs`
```javascript
const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const port = process.env.API_PORT || 3001;
const httpsPort = process.env.HTTPS_API_PORT || 3443;

// Load SSL certificates
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, 'security/certificates/localhost+2-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'security/certificates/localhost+2.pem'))
};

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "https://localhost:*"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration for HTTPS
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow HTTPS localhost on any port for development
    if (origin.match(/^https:\/\/localhost:\d+$/)) {
      return callback(null, true);
    }
    
    console.log('CORS rejected origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    secure: true,
    protocol: 'https'
  });
});

// Start HTTPS server
https.createServer(sslOptions, app).listen(httpsPort, () => {
  console.log(`🔒 HTTPS API Server running on https://localhost:${httpsPort}`);
  console.log(`🛡️  Security headers enabled`);
});

// Redirect HTTP to HTTPS
const httpApp = express();
httpApp.use((req, res) => {
  res.redirect(301, `https://localhost:${httpsPort}${req.url}`);
});

httpApp.listen(port, () => {
  console.log(`🔀 HTTP redirect server running on http://localhost:${port} -> https://localhost:${httpsPort}`);
});
```

## Step 3: Create HTTPS Vite Configuration (1 hour)

### Create `vite.config.https.ts`
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, 'security/certificates/localhost+2-key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, 'security/certificates/localhost+2.pem')),
    },
    host: true,
    port: 5173
  },
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify('https://localhost:3443/api')
  }
})
```

## Step 4: Update Package.json Scripts (15 minutes)

### Add HTTPS Scripts
```json
{
  "scripts": {
    "dev": "vite --port 5173",
    "dev:api": "node dev-server.cjs",
    "dev:full": "concurrently \"npm run dev:api\" \"npm run dev\" --kill-others-on-fail",
    "dev:https": "vite --config vite.config.https.ts --host",
    "dev:api:https": "node dev-server-https.cjs",
    "dev:full:https": "concurrently \"npm run dev:api:https\" \"npm run dev:https\" --kill-others-on-fail",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Step 5: Update Environment Configuration (1 hour)

### Update `src/config/environment.ts`
```typescript
export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
    secure: boolean;
  };
  security: {
    enableServerMasking: boolean;
    logSensitiveData: boolean;
    enforceHttps: boolean;
    strictTransportSecurity: boolean;
  };
  // ... existing config
}

const httpsConfig = {
  api: {
    baseUrl: 'https://localhost:3443/api',
    secure: true,
  },
  security: {
    enforceHttps: true,
    strictTransportSecurity: true,
    enableServerMasking: true,
    logSensitiveData: false,
  }
};

export function getConfig(): AppConfig {
  const env = import.meta.env.MODE || 'development';
  const isSecure = import.meta.env.VITE_SECURE === 'true' || false;
  
  let config = { ...defaultConfig };
  
  if (isSecure) {
    config = { ...config, ...httpsConfig };
  }
  
  // ... rest of existing logic
  
  return config;
}
```

## Step 6: Update Backend Security Middleware (2-3 hours)

### Update `dev-server.cjs` with Security Enhancements
```javascript
// Add to existing dev-server.cjs
const helmet = require('helmet');

// Add security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-eval'"], // For development only
      connectSrc: ["'self'", "ws://localhost:*", "wss://localhost:*"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: false, // Disable for HTTP development server
}));

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
```

## Step 7: Update Frontend Service Configuration (1 hour)

### Update `src/services/kubernetes-api.ts`
```typescript
import { config } from '../config/environment';

class KubernetesApiService {
  private isInitialized = false;
  private readonly apiBaseUrl = config.api.baseUrl; // Now uses HTTPS URL

  async initialize(kubeConfig?: string): Promise<boolean> {
    console.log('[K8s API] Initializing Kubernetes API service...');
    console.log('[K8s API] API Base URL:', this.apiBaseUrl);
    console.log('[K8s API] Secure mode:', config.api.secure);
    
    try {
      // Test backend connection with HTTPS
      const response = await fetch(`${this.apiBaseUrl}/health`, {
        signal: AbortSignal.timeout(config.api.timeout),
        // For development, accept self-signed certificates
        ...(process.env.NODE_ENV === 'development' && {
          agent: new (await import('https')).Agent({
            rejectUnauthorized: false
          })
        })
      });
      
      if (!response.ok) {
        throw new Error(`Backend API not available: ${response.status}`);
      }
      
      const health = await response.json();
      console.log('[K8s API] Backend health check:', health);
      console.log('[K8s API] Secure connection established:', health.secure);
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      // ... error handling
    }
  }
}
```

## Step 8: Testing & Validation (2-3 hours)

### Test HTTPS Setup
```bash
# Test HTTPS development server
npm run dev:full:https

# In another terminal, test the endpoints
curl -k https://localhost:3443/api/health
curl -k https://localhost:5173

# Check security headers
curl -k -I https://localhost:3443/api/health
curl -k -I https://localhost:5173
```

### Verify Security Headers
Expected headers:
- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`  
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy`

### Browser Testing Checklist
- [ ] Application loads over HTTPS
- [ ] No mixed content warnings
- [ ] Certificate is trusted (after mkcert install)
- [ ] API calls work over HTTPS
- [ ] No console security errors
- [ ] Login flow works with HTTPS

## Step 9: Documentation Updates (30 minutes)

### Update README.md
```markdown
## Development Setup

### Standard Development (HTTP)
npm run dev:full

### Secure Development (HTTPS)
npm run dev:full:https

Note: HTTPS development requires certificate setup. Run:
```bash
brew install mkcert
mkcert -install
mkcert localhost 127.0.0.1 ::1
```
```

## Troubleshooting

### Common Issues

1. **Certificate not trusted**
   ```bash
   mkcert -install
   ```

2. **CORS errors with HTTPS**
   - Check that frontend is using `https://localhost:5173`
   - Verify backend CORS allows HTTPS origins

3. **Mixed content errors**
   - Ensure all API calls use HTTPS
   - Check no HTTP resources loaded

4. **Performance issues**
   - HTTPS adds ~10-15ms latency in development
   - This is normal and acceptable

### Verification Commands
```bash
# Check if certificates exist
ls -la security/certificates/

# Test HTTPS endpoint
curl -k -v https://localhost:3443/api/health

# Check security headers
curl -k -I https://localhost:3443/api/health | grep -E "(Strict-Transport|X-|Content-Security)"
```

## Success Criteria

- [ ] ✅ All development traffic uses HTTPS
- [ ] ✅ Security headers present in responses
- [ ] ✅ No certificate warnings in browser
- [ ] ✅ API endpoints accessible over HTTPS
- [ ] ✅ Frontend loads without mixed content errors
- [ ] ✅ Login flow works with secure cookies
- [ ] ✅ Performance impact < 50ms

## Next Steps

After completing Week 1:
1. **Week 2**: Implement secure authentication with httpOnly cookies
2. **Week 3**: Add RBAC authorization enforcement
3. Continue with Phase 1 security foundation

---

## Quick Commands Summary

```bash
# Setup (one-time)
brew install mkcert
mkcert -install
mkcert localhost 127.0.0.1 ::1
npm install helmet https

# Daily development
npm run dev:full:https

# Testing
curl -k https://localhost:3443/api/health
```

**🎯 Goal**: Secure foundation with HTTPS communications and security headers implemented!