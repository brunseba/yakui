# 📋 CRD Schema Details Demo

The right ribbon in the CRD Canvas now shows comprehensive schema property details for any selected CRD!

## 🎯 **New Schema Features**

### ✨ **Interactive Schema Tree**
- **Expandable/collapsible** property hierarchy
- **Type-coded chips** with color coding (object, array, string, number, boolean)
- **Descriptions** with hover tooltips
- **Required field indicators** with red "required" badges
- **Nested property navigation** with visual indentation
- **Property count badges** showing number of schema properties

### 🎨 **Visual Property Types**
- 📋 **Object**: Blue primary color
- 📝 **Array**: Purple secondary color  
- 🔤 **String**: Green success color
- 🔢 **Number/Integer**: Orange warning color
- ✅ **Boolean**: Light blue info color
- ❓ **Unknown**: Default gray color

## 🚀 **How to Use Schema Details**

### **Step 1: Select a CRD**
1. Navigate to Canvas Composition mode
2. **Click** on any CRD card to select it
3. The right panel will show detailed information

### **Step 2: Explore Schema Properties**
1. Scroll down to **"Schema Properties"** section
2. You'll see a **property count badge** (e.g., "2 properties")
3. Each property shows:
   - **Property name** in monospace font
   - **Type chip** with color coding
   - **Description** (hover for full text)
   - **"required" badge** if field is mandatory

### **Step 3: Navigate Nested Properties**
1. **Click** on properties with **arrow icons** (▶ ▼)
2. **Expand/collapse** nested object properties
3. **Visual indentation** shows property hierarchy
4. **Border lines** connect parent-child relationships

## 🧪 **Test with Sample CRDs**

The sample CNPG CRDs have rich schema information:

### **Cluster CRD** (Most Complex)
- **spec.postgresql**: PostgreSQL configuration
- **spec.bootstrap**: Database initialization  
- **spec.instances**: Number of instances (required)
- **spec.monitoring**: Monitoring configuration
- **status**: Runtime status information

### **Backup CRD**
- **spec.cluster.name**: Target cluster (required)
- **spec.method**: Backup method
- **spec.retentionPolicy**: Retention settings
- **status**: Backup execution status

### **Pooler CRD** 
- **spec.cluster.name**: Target cluster (required)
- **spec.pgbouncer**: PgBouncer configuration
- **spec.type**: Pooler type (rw, ro, rw-split)
- **status**: Pooler runtime status

### **ScheduledBackup CRD**
- **spec.schedule**: Cron schedule (required)
- **spec.cluster.name**: Target cluster (required)
- **spec.suspend**: Pause scheduled backups
- **status**: Schedule execution info

## 🎮 **Interactive Demo Steps**

### **1. Basic Schema Viewing**
1. Click **Cluster** CRD
2. Scroll to "Schema Properties" section
3. See **5 properties** badge
4. Expand **spec** → **postgresql** → **parameters**

### **2. Required Fields Testing**
1. Look for red **"required"** badges
2. Find **spec.instances** (required integer)
3. Find **spec.cluster.name** in Backup CRD (required string)

### **3. Property Type Exploration**
1. Notice **type chips** with different colors:
   - Blue "object" for nested configurations
   - Orange "integer" for numeric values  
   - Green "string" for text fields
   - Light blue "boolean" for true/false values

### **4. Description Tooltips**
1. **Hover** over truncated descriptions
2. See full description text in tooltip
3. Understand what each property does

### **5. Nested Navigation**
1. Expand **spec** → **monitoring** → **prometheusRule**
2. Use arrows to collapse/expand sections
3. Navigate deep property hierarchies

## 📱 **Right Panel Sections**

The updated right panel now includes:

1. **CRD Information**: Basic metadata
2. **Relationship Overview**: Connection statistics  
3. **Relationships**: Detailed connection list
4. **🆕 Schema Properties**: Interactive property tree
5. **Canvas Info**: Technical details

## ✅ **Expected Schema Display**

For a **selected Cluster CRD**, you should see:

```
📊 Schema Properties (5)

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

## 🔍 **Troubleshooting Schema Details**

### **No Schema Section Visible?**
- Make sure you've **selected a CRD** (click on a card)
- Check that the CRD has schema information defined
- Try selecting different sample CRDs

### **Properties Not Expanding?**
- **Click directly on the arrow icons** (▶ ▼)
- Make sure you're clicking the property name, not just hovering
- Some properties auto-expand (first 2 levels)

### **Descriptions Cut Off?**
- **Hover** over truncated text to see full description
- Descriptions are intentionally shortened for space
- Tooltip shows complete description text

## 💡 **Schema Details Benefits**

- **📖 Documentation**: Understand CRD structure without external docs
- **🔍 Property Discovery**: Find available configuration options
- **✅ Validation**: See which fields are required
- **🎯 Type Safety**: Know expected data types for each field
- **🏗️ Schema Design**: Analyze CRD architecture and relationships

The schema details feature makes the CRD Canvas a comprehensive tool for understanding, exploring, and working with Custom Resource Definitions! 🎉