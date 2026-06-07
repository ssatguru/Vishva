# Vishva.ts Refactoring - Phase 1: SaveLoadManager

## Summary
Extracted save/load functionality from Vishva.ts into a dedicated SaveLoadManager module.

## Changes Made

### New Files Created
- `src/managers/SaveLoadManager.ts` - New module handling all save/load operations

### Modified Files
- `src/Vishva.ts` - Updated to use SaveLoadManager

## SaveLoadManager Module

### Responsibilities
- Asset saving (saveAsset)
- World saving (saveWorld)
- Scene serialization preparation
- Shadow management for serialization
- Mesh ID management
- Skeleton cleanup and reset
- Material cleanup
- Sound removal from serialization
- ActuatorTextBar material cleanup

### Methods Extracted
- `saveAsset()` - Save selected mesh as asset file
- `saveWorld()` - Save entire world/scene
- `removeRedundantCameras()` - Clean up unnamed cameras
- `removeInstancesFromShadow()` - Remove instances from shadow casters before save
- `removeFromShadowCasters()` - Remove specific mesh from shadow casters
- `addToShadowCasters()` - Add mesh to shadow casters
- `addInstancesToShadow()` - Restore instances to shadow casters after save
- `renameMeshIds()` - Assign unique IDs to meshes
- `resetSkels()` - Reset skeleton IDs and return to rest pose
- `removeSounds()` - Remove sounds from scene object
- `removeActuatorTextBarMat()` - Remove ActuatorTextBar materials
- `cleanupMats()` - Remove unreferenced materials
- `cleanupSkels()` - Remove unreferenced skeletons

## Vishva.ts Changes

### Added
- Import: `import { SaveLoadManager } from "./managers/SaveLoadManager";`
- Property: `private saveLoadManager: SaveLoadManager;`
- Initialization in constructor: `this.saveLoadManager = new SaveLoadManager(this);`

### Modified
- `saveAsset()` - Now delegates to `saveLoadManager.saveAsset()`
- `saveWorld()` - Now delegates to `saveLoadManager.saveWorld()`
- `_addToShadowCasters()` - Now delegates to `saveLoadManager.addToShadowCasters()`

### Removed
- All private helper methods now in SaveLoadManager (~200 lines removed)

## Benefits
1. **Separation of Concerns** - Save/load logic isolated from main Vishva class
2. **Reduced File Size** - Vishva.ts reduced by ~200 lines
3. **Improved Testability** - SaveLoadManager can be tested independently
4. **Better Maintainability** - Changes to save/load logic contained in one module
5. **Clearer Responsibilities** - Each class has a focused purpose

## Testing Recommendations
1. Test world saving functionality
2. Test asset saving functionality
3. Verify shadow management works correctly
4. Confirm serialization/deserialization works as before
5. Check that all cleanup operations function properly

## Next Steps for Further Refactoring
Consider extracting these modules next:
- **ParticleManager** - Particle system management (~200 lines)
- **TransformManager** - Transform and snapping operations (~150 lines)
- **AnimationManager** - Animation and skeleton management (~300 lines)
- **EnvironmentManager** - Sky, ground, weather, lighting (~400 lines)
- **MeshManager** - Mesh operations (clone, merge, CSG, etc.) (~500 lines)

## Notes
- SaveLoadManager maintains reference to Vishva instance for accessing scene, meshes, etc.
- All existing functionality preserved - this is a pure refactoring
- No breaking changes to public API
