# 🔍 Test Guide: Schema Properties in CRD Canvas

## ✅ **Quick Test Steps**

### **Step 1: Access the Canvas**
1. Open http://localhost:5173 in your browser
2. Login (if required)
3. Navigate to **Dictionary** → **Composer**
4. Click **"Canvas Composition"** (blue card with grid icon)

### **Step 2: Check for Sample CRDs**
- You should see **4 sample CNPG CRDs** automatically loaded:
  - Cluster (center-left)
  - Backup (center-right)
  - Pooler (bottom-center) 
  - ScheduledBackup (top-center)

### **Step 3: Test Schema Properties**
1. **Click** on the **Cluster** CRD card to select it
2. Look at the **right panel** (details panel)
3. **Scroll down** in the right panel
4. You should see these sections:
   - ✅ CRD Information
   - ✅ Relationship Overview 
   - ✅ Relationships (if any)
   - ✅ **🆕 Schema Properties** ← **This is what we're testing!**
   - ✅ 🐛 Debug Info (temporary section)
   - ✅ Canvas Info

### **Step 4: Verify Schema Properties Section**
Look for the **"Schema Properties"** section with:
- **📊 Icon** and title "Schema Properties"
- **Badge** showing property count (should show "2" for spec + status)
- **Expandable tree** showing:
  - ▼ **spec**: object (with nested properties)
  - ▼ **status**: object (with nested properties)

### **Step 5: Test Interactive Features**
1. **Click arrows** (▶ ▼) to expand/collapse properties
2. **Hover** over descriptions to see tooltips
3. Look for **colored chips** indicating property types:
   - 🔵 **object** (blue)
   - 🟢 **string** (green)
   - 🟠 **integer** (orange)
   - 🔴 **required** badges

## 🐛 **If Schema Properties Not Visible**

### **Check Debug Info Section**
In the right panel, find the **"🐛 Debug Info"** section (gray box) and verify:
- ✅ **Has Schema: Yes** (should be checkmark)
- ✅ **Schema Type: object** 
- ✅ **Properties Count: 2** (or more)
- ✅ **CRD Kind: Cluster**

### **If Debug Shows "Has Schema: No"**
The schema data isn't being loaded. Check browser console (F12) for errors.

### **If Debug Shows Schema but No Properties Section**
There might be a TypeScript/rendering error. Check browser console.

## 🎯 **Expected Results**

For the **Cluster CRD**, you should see:

```
📊 Schema Properties (2)

▼ spec: object
  ▼ postgresql: object
    └ parameters: object - PostgreSQL configuration parameters
    └ pg_hba: array - PostgreSQL host-based authentication rules  
    └ ldap: object - LDAP configuration for authentication
  ▼ bootstrap: object
    └ initdb: object - Database initialization configuration
    └ recovery: object - Recovery configuration from backup
  └ instances: integer [required] - Number of PostgreSQL instances
  └ primaryUpdateStrategy: string - Update strategy for primary instance
  ▼ monitoring: object
    └ enabled: boolean - Enable monitoring
    └ prometheusRule: object - Prometheus rule configuration

▼ status: object  
  └ phase: string - Current cluster phase
  └ instances: integer - Number of running instances
  └ readyInstances: integer - Number of ready instances
  └ currentPrimary: string - Current primary instance name
  └ targetPrimary: string - Target primary instance name
```

## 🔧 **Troubleshooting**

### **App Not Loading**
```bash
# Check if services are running
curl http://localhost:5173  # Frontend
curl http://localhost:3001  # Backend API
```

### **No CRDs on Canvas**
- Refresh the page to reload sample CRDs
- Check browser console for loading errors

### **Schema Section Missing**
- Make sure you **clicked** on a CRD to select it
- Check the 🐛 Debug Info section first
- Try selecting different CRDs (Backup, Pooler, ScheduledBackup)

### **Browser Console Errors**
- Press F12 → Console tab
- Look for TypeScript or React errors
- Share any error messages for debugging

---

**🎯 Success Indicator**: You should see the interactive Schema Properties tree with expandable sections, type chips, and property descriptions when you select a CRD!

The feature transforms the CRD Canvas into a comprehensive schema explorer! 🚀