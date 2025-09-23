# CRD Canvas Drag & Drop Demo

The CRD Canvas now supports full drag and drop functionality to move CRDs around the grid!

## 🎯 New Features Added

### ✨ **Drag and Drop**
- **Click and drag** any CRD card to move it to a new position
- **Real-time preview** shows where the CRD will be dropped
- **Visual feedback** with ghost preview and occupied position warnings
- **Grid snapping** automatically aligns CRDs to the grid
- **Collision detection** prevents dropping on occupied positions

### 🎨 **Enhanced UX**
- **Grab cursor** indicates draggable items
- **Grabbing cursor** during active drag operations
- **Smooth animations** for non-dragged items
- **Elevated shadows** for dragged items
- **Opacity effects** during drag
- **Tooltips** with drag instructions

### 📊 **Status Feedback**
- **Status bar** shows drag instructions and current drag state
- **Notifications** confirm successful moves or warn about conflicts
- **Grid coordinates** displayed in move confirmations

## 🚀 How to Use

### 1. **Start Dragging**
```
Click and hold on any CRD card → Cursor changes to "grabbing"
```

### 2. **Move Around**
```
Drag the CRD across the canvas → See real-time preview of drop position
```

### 3. **Visual Feedback**
- **Blue dashed outline**: Valid drop position
- **Red dashed outline**: Position occupied (invalid)
- **Semi-transparent card**: The item being dragged

### 4. **Drop**
```
Release mouse button → CRD snaps to grid position
```

## 🎮 Demo Instructions

1. **Open the Canvas**:
   ```bash
   npm run dev
   ```
   Navigate to CRD Composer → Canvas View

2. **Add some CRDs**:
   - Click "Add CRD" button
   - Create a few different CRDs (e.g., Cluster, Backup, Pooler)

3. **Try dragging**:
   - Click and hold any CRD card
   - Move it around the canvas
   - Watch the preview feedback
   - Drop it in a new position

4. **Test scenarios**:
   - ✅ Move to empty position → Success notification
   - ❌ Try to drop on occupied position → Warning notification
   - 🔄 Use auto-layout buttons to rearrange
   - 🔍 Zoom in/out and try dragging

## 📋 Technical Details

### **Grid System**
- 8 rows × 12 columns grid
- Each cell: 120px × 120px (scaled by zoom)
- 8px gap between cells
- Automatic grid snapping

### **Collision Detection**
- Prevents overlapping CRDs
- Shows visual warning for occupied positions
- Cancels drop if position is taken

### **Responsive Design**
- Works with zoom levels (50% - 200%)
- Maintains drag accuracy across zoom levels
- Grid positioning scales correctly

### **Performance**
- Efficient drag calculations
- Minimal re-renders during drag
- Smooth 60fps animations

## 🧪 Test Cases

### ✅ **Basic Functionality**
- [ ] Can drag CRDs to new positions
- [ ] Grid snapping works correctly  
- [ ] Position conflicts are detected
- [ ] Notifications show for moves/conflicts

### ✅ **Visual Feedback**
- [ ] Drag preview appears during drag
- [ ] Invalid positions show red outline
- [ ] Valid positions show blue outline
- [ ] Cursors change appropriately

### ✅ **Edge Cases**
- [ ] Dragging near canvas edges
- [ ] Dragging with different zoom levels
- [ ] Read-only mode disables dragging
- [ ] Multiple rapid drag operations

### ✅ **Integration**
- [ ] Relationships update after moves
- [ ] Auto-layout still works
- [ ] Export includes new positions
- [ ] Undo/redo (if implemented)

## 💡 Next Steps

### **Potential Enhancements**
1. **Multi-select drag** - Move multiple CRDs at once
2. **Snap to relationships** - Magnetic attraction to related CRDs  
3. **Drag from palette** - Drag new CRDs directly from sidebar
4. **Keyboard shortcuts** - Arrow keys for fine positioning
5. **Drag handles** - Specific drag areas on cards
6. **Animation trails** - Visual effects during drag

### **Accessibility**
1. **Keyboard navigation** - Tab to select, arrows to move
2. **Screen reader support** - Announce position changes
3. **High contrast mode** - Better drag preview visibility
4. **Reduced motion** - Respect user motion preferences

---

The drag and drop functionality makes the CRD Canvas much more interactive and user-friendly! Users can now easily organize their CRDs visually and create custom layouts that make sense for their specific use cases. 🎉