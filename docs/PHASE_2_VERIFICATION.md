# Phase 2 Verification

## Changes Made

### 1. SaveManager.ts - Imports Updated
- Added `Tags` to babylonjs imports
- Added `ObjectIdMap` and `MeshMetadata` to VishvaSerialized imports

### 2. SaveManager.ts - Metadata Capture Logic Added

The following logic was added in `_getWorldZipBlob()` method after SNA serialization:

#### Object IDs Capture
Captures IDs of special Vishva objects:
- Avatar mesh ID
- Avatar skeleton ID
- Skybox mesh ID
- Ground mesh ID
- Sun light ID
- Camera ID
- Spawn point mesh ID (searched by tag)

#### Mesh Metadata Capture
Iterates through all scene meshes and captures:
- `isPrimitive` - from "Vishva.prim" tag
- `isInternal` - from "Vishva.internal" tag
- `isInvisible` - from "invisible" tag
- `vishvaUid` - from "Vishva.uid.<timestamp>" tag

Only stores metadata for meshes that have at least one of these properties set.

## Code Flow

```
saveWorld() / saveWorldToIndexedDB()
  ↓
_getWorldZipBlob()
  ↓
Create VishvaSerialized object
  ↓
Set basic properties (versions, settings, etc.)
  ↓
Serialize SNAs
  ↓
[NEW] Capture objectIds from Vishva properties
  ↓
[NEW] Search for spawn point by tag
  ↓
[NEW] Iterate meshes and capture metadata from tags
  ↓
Serialize scene
  ↓
Create TAR archive
  ↓
Compress with GZIP
```

## What Gets Saved

### Before Phase 2
- Only tags were saved (as part of Babylon.js scene serialization)
- No explicit object ID mapping
- No structured metadata

### After Phase 2
- Tags are still saved (backward compatibility)
- Object IDs are explicitly captured in `objectIds` property
- Mesh metadata is captured in `meshMetadata` property
- Both structures are serialized to Vishva.json

## Example Serialized Data

```json
{
  "bVer": "5.x.x",
  "vVer": "0.4.0",
  "objectIds": {
    "avatarId": "123",
    "skeletonId": "456",
    "skyboxId": "789",
    "groundId": "012",
    "sunId": "345",
    "cameraId": "678"
  },
  "meshMetadata": {
    "123": {
      "meshId": "123",
      "isInternal": true
    },
    "234": {
      "meshId": "234",
      "isPrimitive": true,
      "isInternal": true
    },
    "345": {
      "meshId": "345",
      "isInvisible": true
    },
    "456": {
      "meshId": "456",
      "vishvaUid": "Vishva.uid.1234567890"
    }
  },
  "settings": { ... },
  "misc": { ... },
  "snas": [ ... ]
}
```

## Backward Compatibility

✓ Tags are still present in the scene (not removed)
✓ Old worlds without objectIds/meshMetadata will still load (Phase 3 will handle fallback)
✓ New worlds can be loaded by old code (will ignore new properties)

## Testing Checklist

- [ ] Save a world with avatar
- [ ] Save a world with primitives
- [ ] Save a world with invisible meshes
- [ ] Save a world with ground/sky
- [ ] Verify objectIds are populated in saved file
- [ ] Verify meshMetadata is populated in saved file
- [ ] Verify tags are still present in Scene.babylon
- [ ] Load saved world (will test in Phase 3)

## Files Modified

1. `src/managers/SaveManager.ts`
   - Imports: Added Tags, ObjectIdMap, MeshMetadata
   - Method: `_getWorldZipBlob()` - Added metadata capture logic

## No Breaking Changes

✓ All existing functionality preserved
✓ No changes to public APIs
✓ No changes to file format structure (only additions)
✓ TypeScript compilation successful
✓ No diagnostics errors

## Next Phase

Phase 3 will modify LoadManager to:
- Read objectIds and meshMetadata from saved files
- Use IDs to find objects instead of tags
- Restore metadata to runtime structures
- Maintain tag fallback for backward compatibility
