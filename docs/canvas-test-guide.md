# CRD Canvas Test Guide

## 🎯 How to Access the Canvas

1. **Start the app**: 
   ```bash
   npm run dev
   ```

2. **Navigate to**: http://localhost:5173

3. **Login** (if required)

4. **Go to CRD Composer**:
   - In the sidebar, go to **Dictionary** → **Composer**
   - Or directly navigate to: http://localhost:5173/dictionary/composer

5. **Select Canvas Mode**:
   - Click on **"Canvas Composition"** card
   - This will show the interactive grid canvas

## 🎮 Testing the Canvas Features

### Step 1: Add CRDs
- Click the **"Add CRD"** button in the toolbar
- Fill in the form:
  - **Kind**: `Cluster`
  - **API Group**: `postgresql.cnpg.io` 
  - **Version**: `v1`
- Click **"Create CRD"**
- Repeat for more CRDs like `Backup`, `Pooler`, etc.

### Step 2: Test Drag and Drop
- **Click and hold** any CRD card
- **Drag** it around the canvas
- **Watch** for blue/red preview feedback
- **Release** to drop in new position

### Step 3: Test Other Features
- **Zoom**: Use zoom in/out buttons
- **Auto-layout**: Try grid layout button
- **Relationships**: Toggle relationship view
- **Selection**: Click CRDs to see details in sidebar

## 🔍 Expected Behavior

### ✅ What Should Work
- **Add CRD button** visible in toolbar
- **Drag and drop** moves CRDs to new positions
- **Visual feedback** during drag (blue=valid, red=occupied)
- **Grid snapping** aligns CRDs to grid
- **Tooltips** show "drag to move" instructions
- **Status bar** shows drag state and instructions

### ❌ Troubleshooting

If **"Add CRD" button not visible**:
- Make sure you selected "Canvas Composition" mode
- Check browser console for errors
- Refresh the page

If **drag not working**:
- Ensure you're clicking on the card body (not the action buttons)
- Check if `readOnly` mode is enabled
- Try refreshing the page

If **no visual feedback**:
- Check browser console for JavaScript errors
- Make sure zoom level is appropriate
- Try different CRD positions

## 🧪 Test Scenarios

### Basic Drag Test
1. Create 2-3 CRDs
2. Drag one to a different position
3. ✅ Should see success notification
4. ✅ CRD should snap to grid

### Collision Test  
1. Create 2 CRDs
2. Try to drag one onto the other
3. ✅ Should see red preview outline
4. ✅ Should show "Position occupied" warning

### Zoom Test
1. Create some CRDs
2. Zoom in/out using toolbar buttons
3. Try dragging at different zoom levels
4. ✅ Drag should work accurately at all zoom levels

### Multi-CRD Test
1. Create 5+ CRDs
2. Use auto-layout button
3. Try dragging multiple CRDs around
4. ✅ No conflicts, smooth interactions

## 📱 Access URLs

- **App**: http://localhost:5173
- **CRD Composer**: http://localhost:5173/dictionary/composer
- **Direct Canvas** (won't work - needs mode selection): http://localhost:5173/dictionary/composer?mode=canvas

## 🛠️ Debug Commands

If issues occur, run these in browser console:

```javascript
// Check if canvas debug data exists
console.log('Canvas debug:', window.__canvas_debug);

// Check drag state
console.log('Drag state:', window.__canvas_debug?.dragState);

// Manual drag test
console.log('CRDs:', window.__canvas_debug?.crds);
```

---

**Note**: The canvas is Phase 2 of the CRD Composer. Make sure you select "Canvas Composition" from the mode selector to access the drag-and-drop functionality!