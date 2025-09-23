# 🚀 Quick Start: CRD Canvas Drag & Drop

## **Step 1: Start the App**
```bash
npm run dev
```
The app will be available at: http://localhost:5173

## **Step 2: Navigate to Canvas**
1. Open http://localhost:5173 in your browser
2. Login (if required)
3. Go to **Dictionary** → **Composer** in the sidebar
4. Click **"Canvas Composition"** (the blue card with grid icon)

## **Step 3: Test Drag & Drop** 🎯

You'll immediately see **4 sample CNPG CRDs** on the canvas:
- **Cluster** (center-left)
- **Backup** (center-right)  
- **Pooler** (bottom-center)
- **ScheduledBackup** (top-center)

### **Try These Actions:**

#### ✨ **Basic Drag**
- **Click and hold** any CRD card
- **Drag** it to a new position
- **Release** to drop
- ✅ **Success!** You should see a green notification

#### 🎨 **Visual Feedback** 
- **Blue dashed outline** = Valid drop position
- **Red dashed outline** = Position occupied (try dropping on another CRD)
- **Semi-transparent card** = The item being dragged

#### ⚡ **Other Features**
- **Zoom**: Use +/- buttons in toolbar
- **Auto-layout**: Grid icon for automatic arrangement
- **Relationships**: Toggle relationship lines
- **Add more CRDs**: Use "Add CRD" button
- **Schema Details**: Click any CRD to see detailed schema properties in right panel

## **Step 4: Test Scenarios** 🧪

### **Collision Test**
1. Drag one CRD onto another
2. Should see **red outline** and warning message

### **Zoom Test**  
1. Zoom in/out using toolbar buttons
2. Try dragging at different zoom levels
3. Should work smoothly at all zoom levels

### **Multi-drag Test**
1. Drag several CRDs to different positions
2. Use auto-layout to reorganize
3. Should handle multiple operations smoothly

## **🔧 Troubleshooting**

### **"Add CRD" button not visible?**
- Make sure you selected "Canvas Composition" mode (not "Wizard")
- Check browser console for errors
- Try refreshing the page

### **Drag not working?**
- Click on the **card body**, not the action buttons at bottom
- Make sure you're not in read-only mode
- Check browser console for JavaScript errors

### **No sample CRDs?**
- Refresh the page to reload sample CRDs
- Check browser console for loading errors

## **🎉 Expected Results**

When everything works correctly:
- ✅ 4 CNPG CRDs visible on canvas
- ✅ Smooth drag and drop with visual feedback  
- ✅ Grid snapping and collision detection
- ✅ Status bar shows "Click and drag CRDs to move them around!"
- ✅ Relationship lines between related CRDs
- ✅ Zoom and auto-layout features work
- ✅ **Right panel shows detailed schema properties** when CRD is selected
- ✅ **Expandable property tree** with types, descriptions, and required fields

## **🔍 Debug Console**

If issues occur, open browser DevTools (F12) and run:
```javascript
// Check canvas state
console.log('Canvas debug:', window.__canvas_debug);

// Check CRDs
console.log('CRDs on canvas:', window.__canvas_debug?.crds);

// Check drag state
console.log('Drag state:', window.__canvas_debug?.dragState);
```

---

**🎯 Success Indicator**: You should be able to drag the sample CRDs around the canvas with smooth visual feedback and see success notifications when dropping them in new positions!

The drag and drop functionality is now fully implemented and ready for testing. Enjoy exploring the interactive CRD Canvas! 🎨✨