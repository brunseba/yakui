# Icon Alternatives for AddClusterForm

If you encounter any issues with the current icons, here are safe alternatives that are commonly available in Material-UI:

## Current Icons and Alternatives:

### Test Connection Icon
**Current**: `NetworkCheck as TestIcon`
**Alternatives**:
- `PlayArrow as TestIcon` - Play button (suggests action)
- `Refresh as TestIcon` - Refresh/retry symbol
- `CheckCircle as TestIcon` - Check symbol
- `Link as TestIcon` - Link/connection symbol
- `Settings as TestIcon` - Settings gear
- `Launch as TestIcon` - Launch/external link

### Other Icons
**Upload**: `Upload as UploadIcon` → `CloudUpload as UploadIcon`
**Add**: `Add as AddIcon` ✅ (commonly available)
**Delete**: `Delete as DeleteIcon` ✅ (commonly available)
**Close**: `Close as CloseIcon` ✅ (commonly available)

## Quick Fix Options:

### Option 1: Use PlayArrow (most reliable)
```typescript
import {
  Upload as UploadIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as TestIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
```

### Option 2: Use CheckCircle
```typescript
import {
  Upload as UploadIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckCircle as TestIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
```

### Option 3: Use simple icons
```typescript
import {
  CloudUpload as UploadIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as TestIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
```

## How to Check Available Icons:

1. Open browser console
2. Run: `Object.keys(await import('@mui/icons-material')).filter(icon => icon.includes('Test'))`
3. Or check Material-UI documentation: https://mui.com/material-ui/material-icons/

## Current Status:

The `NetworkCheck` icon should work in most Material-UI installations. If it doesn't, use `PlayArrow` as the most reliable alternative.