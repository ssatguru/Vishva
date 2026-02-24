# Migration Plan: Moving Vishva Meta Information from Tags to VishvaSerialized

## Executive Summary

Currently, Vishva stores critical meta information using Babylon.js Tags API. This analysis identifies all tag usage and provides a comprehensive migration plan to move this information into the VishvaSerialized structure.

## Current Tag Usage Analysis

### 1. **Object Identification Tags** (Critical - Used for Scene Loading)

These tags identify special Vishva objects during scene loading:

| Tag | Purpose | Location Used | Current Behavior |
|-----|---------|---------------|------------------|
| `Vishva.avatar` | Identifies the avatar mesh | Vishva.ts:409, AvManager.ts:94, SensorContact.ts:83 | Used to find avatar on load |
| `Vishva.skeleton` | Identifies the avatar skeleton | Vishva.ts:437, AvManager.ts:95 | Used to find skeleton on load |
| `Vishva.sky` | Identifies the skybox mesh | Vishva.ts:416 | Used to find skybox on load |
| `Vishva.ground` | Identifies the ground mesh | Vishva.ts:420, multiple ground creation methods | Used to find ground on load |
| `Vishva.spawnPoint` | Identifies spawn point mesh | Vishva.ts:426 | Used to set spawn position on load |
| `Vishva.sun` | Identifies the sun light | Vishva.ts:448 | Used to find sun light on load |
| `Vishva.camera` | Identifies the main camera | Vishva.ts:524 | Used to find camera on load |

### 2. **Object Classification Tags**

| Tag | Purpose | Location Used | Current Behavior |
|-----|---------|---------------|------------------|
| `Vishva.prim` | Marks primitive objects | Vishva.ts:1465 | Identifies user-created primitives |
| `Vishva.internal` | Marks Vishva-created objects | Multiple locations | Distinguishes internal vs user objects |

### 3. **Object State Tags**

| Tag | Purpose | Location Used | Current Behavior |
|-----|---------|---------------|------------------|
| `invisible` | Marks invisible meshes | Vishva.ts:1754, 1770, 1779, 1804, 1819 | Tracks visibility state beyond Babylon's isVisible |

### 4. **Unique Identifier Tags**

| Tag Pattern | Purpose | Location Used | Current Behavior |
|-------------|---------|---------------|------------------|
| `Vishva.uid.<timestamp>` | Unique mesh identifier for SNA system | SNA.ts:420-434 | Used for sensor/actuator mesh references |

## Migration Strategy

### Phase 1: Extend VishvaSerialized Structure

Add new properties to `VishvaSerialized.ts`:

```typescript
export class VishvaSerialized {
    // ... existing properties ...
    
    // NEW: Object identification map
    public objectIds: ObjectIdMap;
    
    // NEW: Mesh metadata
    public meshMetadata: MeshMetadataMap;
}

export class ObjectIdMap {
    public avatarId?: string;          // ID of avatar mesh
    public skeletonId?: string;        // ID of avatar skeleton
    public skyboxId?: string;          // ID of skybox mesh
    public groundId?: string;          // ID of ground mesh
    public spawnPointId?: string;      // ID of spawn point mesh
    public sunId?: string;             // ID of sun light
    public cameraId?: string;          // ID of main camera
}

export class MeshMetadata {
    public meshId: string;
    public isPrimitive: boolean;       // Was tagged "Vishva.prim"
    public isInternal: boolean;        // Was tagged "Vishva.internal"
    public isInvisible: boolean;       // Was tagged "invisible"
    public vishvaUid?: string;         // Was tagged "Vishva.uid.<timestamp>"
}

export type MeshMetadataMap = { [meshId: string]: MeshMetadata };
```

### Phase 2: Modify SaveManager

**File: `src/managers/SaveManager.ts`**

Add serialization logic in `_getWorldZipBlob()` method after line 119:

```typescript
// NEW: Capture object IDs
vishvaSerialzed.objectIds = new ObjectIdMap();
if (this.vishva.avatar) vishvaSerialzed.objectIds.avatarId = this.vishva.avatar.id;
if (this.vishva.avatarSkeleton) vishvaSerialzed.objectIds.skeletonId = this.vishva.avatarSkeleton.id;
if (this.vishva.skybox) vishvaSerialzed.objectIds.skyboxId = this.vishva.skybox.id;
if (this.vishva.ground) vishvaSerialzed.objectIds.groundId = this.vishva.ground.id;
if (this.vishva.sun) vishvaSerialzed.objectIds.sunId = this.vishva.sun.id;
if (this.vishva.arcCamera) vishvaSerialzed.objectIds.cameraId = this.vishva.arcCamera.id;

// NEW: Capture mesh metadata from tags
vishvaSerialzed.meshMetadata = {};
for (let mesh of this.vishva.scene.meshes) {
    if (Tags.HasTags(mesh)) {
        const tags = Tags.GetTags(mesh, true).split(" ");
        const metadata = new MeshMetadata();
        metadata.meshId = mesh.id;
        
        for (let tag of tags) {
            if (tag === "Vishva.prim") metadata.isPrimitive = true;
            if (tag === "Vishva.internal") metadata.isInternal = true;
            if (tag === "invisible") metadata.isInvisible = true;
            if (tag.startsWith("Vishva.uid.")) metadata.vishvaUid = tag;
        }
        
        if (metadata.isPrimitive || metadata.isInternal || 
            metadata.isInvisible || metadata.vishvaUid) {
            vishvaSerialzed.meshMetadata[mesh.id] = metadata;
        }
    }
}

// NEW: Capture spawn point position if exists
for (let mesh of this.vishva.scene.meshes) {
    if (Tags.HasTags(mesh) && Tags.MatchesQuery(mesh, "Vishva.spawnPoint")) {
        vishvaSerialzed.objectIds.spawnPointId = mesh.id;
        break;
    }
}
```

### Phase 3: Modify LoadManager

**File: `src/managers/LoadManager.ts`**

Modify `loadVishvaPartFromObjects()` method (around line 322) to restore metadata:

```typescript
private loadVishvaPartFromObjects(vishvaData: any, sceneData: any) {
    // ... existing code ...
    
    // NEW: Store object IDs and metadata for later use
    this.vishva._objectIds = vishvaData.objectIds || new ObjectIdMap();
    this.vishva._meshMetadata = vishvaData.meshMetadata || {};
    
    // ... rest of existing code ...
}
```

### Phase 4: Modify Vishva.ts - loadBabylonjsPart()

**File: `src/Vishva.ts`**

Replace tag-based object finding (lines 407-527) with ID-based lookup:

```typescript
private loadBabylonjsPart(scene: Scene, empty: boolean = false) {
    // ... existing code before mesh finding ...
    
    // NEW: Use stored IDs instead of tags
    if (this._objectIds) {
        // Find avatar by ID
        if (this._objectIds.avatarId) {
            this.avatar = <Mesh>scene.getMeshByID(this._objectIds.avatarId);
            if (this.avatar) {
                avFound = true;
                this.avatar.ellipsoid = this._avEllipsoid;
            }
        }
        
        // Find skybox by ID
        if (this._objectIds.skyboxId) {
            this.skybox = <Mesh>scene.getMeshByID(this._objectIds.skyboxId);
            if (this.skybox) {
                skyFound = true;
                this.skybox.isPickable = false;
            }
        }
        
        // Find ground by ID
        if (this._objectIds.groundId) {
            this.ground = <Mesh>scene.getMeshByID(this._objectIds.groundId);
            if (this.ground) {
                groundFound = true;
                this.ground.isPickable = true;
            }
        }
        
        // Find spawn point by ID
        if (this._objectIds.spawnPointId) {
            const spawnMesh = scene.getMeshByID(this._objectIds.spawnPointId);
            if (spawnMesh) {
                spawnPointFound = true;
                this.spawnPosition = spawnMesh.position.clone();
            }
        }
        
        // Find skeleton by ID
        if (this._objectIds.skeletonId) {
            this.avatarSkeleton = scene.getSkeletonByID(this._objectIds.skeletonId);
            if (this.avatarSkeleton) {
                skelFound = true;
            }
        }
        
        // Find sun by ID
        if (this._objectIds.sunId) {
            this.sun = <HemisphericLight>scene.getLightByID(this._objectIds.sunId);
            if (this.sun) {
                sunFound = true;
            }
        }
        
        // Find camera by ID
        if (this._objectIds.cameraId) {
            this.arcCamera = <ArcRotateCamera>scene.getCameraByID(this._objectIds.cameraId);
            if (this.arcCamera) {
                cameraFound = true;
            }
        }
    }
    
    // FALLBACK: Keep tag-based finding for backward compatibility
    if (!avFound || !skyFound || !groundFound || !skelFound || !sunFound || !cameraFound) {
        // ... keep existing tag-based code as fallback ...
    }
    
    // NEW: Restore mesh metadata
    if (this._meshMetadata) {
        for (let meshId in this._meshMetadata) {
            const mesh = scene.getMeshByID(meshId);
            if (mesh) {
                const metadata = this._meshMetadata[meshId];
                
                // Restore tags for backward compatibility
                if (metadata.isPrimitive) Tags.AddTagsTo(mesh, "Vishva.prim");
                if (metadata.isInternal) Tags.AddTagsTo(mesh, "Vishva.internal");
                if (metadata.isInvisible) {
                    Tags.AddTagsTo(mesh, "invisible");
                    mesh.isVisible = false;
                }
                if (metadata.vishvaUid) Tags.AddTagsTo(mesh, metadata.vishvaUid);
            }
        }
    }
    
    // ... rest of existing code ...
}
```

Add new properties to Vishva class:

```typescript
class Vishva {
    // ... existing properties ...
    
    // NEW: Loaded object IDs and metadata
    private _objectIds: ObjectIdMap;
    private _meshMetadata: MeshMetadataMap;
    
    // ... rest of class ...
}
```

### Phase 5: Update Visibility Methods

**File: `src/Vishva.ts`**

Modify visibility methods to use metadata:

```typescript
public isVisible(): boolean {
    if (this._meshMetadata && this._meshMetadata[this.meshSelected.id]) {
        return !this._meshMetadata[this.meshSelected.id].isInvisible;
    }
    // Fallback to tags
    if (Tags.HasTags(this.meshSelected)) {
        if (Tags.MatchesQuery(this.meshSelected, "invisible")) {
            return false;
        }
    }
    return true;
}

public makeVisibile(yes: boolean) {
    var mesh = this.meshSelected;
    
    // Update metadata
    if (!this._meshMetadata) this._meshMetadata = {};
    if (!this._meshMetadata[mesh.id]) {
        this._meshMetadata[mesh.id] = new MeshMetadata();
        this._meshMetadata[mesh.id].meshId = mesh.id;
    }
    
    if (yes) {
        this._meshMetadata[mesh.id].isInvisible = false;
        // Also update tag for backward compatibility
        if (Tags.HasTags(mesh) && Tags.MatchesQuery(mesh, "invisible")) {
            Tags.RemoveTagsFrom(this.meshSelected, "invisible");
        }
        this.meshSelected.isVisible = true;
        this.meshSelected.isPickable = true;
        if (this.revealingInvisibles) {
            this.unHighLight(mesh);
        }
    } else {
        this._meshMetadata[mesh.id].isInvisible = true;
        // Also update tag for backward compatibility
        Tags.AddTagsTo(this.meshSelected, "invisible");
        // ... rest of existing code ...
    }
}

public revealInvisibles() {
    this.revealingInvisibles = true;
    
    // Use metadata if available
    if (this._meshMetadata) {
        for (let meshId in this._meshMetadata) {
            if (this._meshMetadata[meshId].isInvisible) {
                const mesh = this.scene.getMeshByID(meshId);
                if (mesh) {
                    mesh.isVisible = true;
                    this.highLight(mesh, this._revelColor);
                }
            }
        }
    } else {
        // Fallback to tags
        for (var i = 0; i < this.scene.meshes.length; i++) {
            var mesh = this.scene.meshes[i];
            if (Tags.HasTags(mesh)) {
                if (Tags.MatchesQuery(mesh, "invisible")) {
                    mesh.isVisible = true;
                    this.highLight(mesh, this._revelColor);
                }
            }
        }
    }
}

public hideInvisibles() {
    this.revealingInvisibles = false;
    
    // Use metadata if available
    if (this._meshMetadata) {
        for (let meshId in this._meshMetadata) {
            if (this._meshMetadata[meshId].isInvisible) {
                const mesh = this.scene.getMeshByID(meshId);
                if (mesh) {
                    mesh.isVisible = false;
                    this.unHighLight(mesh);
                }
            }
        }
    } else {
        // Fallback to tags
        for (var i = 0; i < this.scene.meshes.length; i++) {
            var mesh = this.scene.meshes[i];
            if (Tags.HasTags(mesh)) {
                if (Tags.MatchesQuery(mesh, "invisible")) {
                    mesh.isVisible = false;
                    this.unHighLight(mesh);
                }
            }
        }
    }
}
```

### Phase 6: Update Primitive Creation

**File: `src/Vishva.ts`**

Modify `setPrimProperties()` method (line 1450):

```typescript
private setPrimProperties(mesh: Mesh) {
    // ... existing code ...
    
    // NEW: Store in metadata
    if (!this._meshMetadata) this._meshMetadata = {};
    this._meshMetadata[mesh.id] = new MeshMetadata();
    this._meshMetadata[mesh.id].meshId = mesh.id;
    this._meshMetadata[mesh.id].isPrimitive = true;
    this._meshMetadata[mesh.id].isInternal = true;
    
    // Keep tags for backward compatibility
    Tags.AddTagsTo(mesh, "Vishva.prim Vishva.internal");
    
    // ... rest of existing code ...
}
```

### Phase 7: Update Ground Switching

**File: `src/Vishva.ts`**

Modify `switchGround()` method (line 1538):

```typescript
public switchGround(): string {
    // ... existing code ...
    
    if (this.ground != null) {
        // Update metadata
        if (this._objectIds) {
            this._objectIds.groundId = null;
        }
        // Keep tag removal for backward compatibility
        Tags.RemoveTagsFrom(this.ground, "Vishva.ground");
        this.ground.isPickable = true;
    }
    
    this.ground = <Mesh>this.meshSelected;
    
    // Update metadata
    if (!this._objectIds) this._objectIds = new ObjectIdMap();
    this._objectIds.groundId = this.ground.id;
    
    // Keep tag for backward compatibility
    this.ground.isPickable = false;
    this.ground.receiveShadows = true;
    Tags.AddTagsTo(this.ground, "Vishva.ground");
    
    // ... rest of existing code ...
}
```

### Phase 8: Update SNA System

**File: `src/sna/SNA.ts`**

Modify `getMeshVishvaUid()` method (line 416):

```typescript
private getMeshVishvaUid(mesh: TransformNode): string {
    // NEW: Check metadata first
    if (Vishva.vishva._meshMetadata && Vishva.vishva._meshMetadata[mesh.id]) {
        const uid = Vishva.vishva._meshMetadata[mesh.id].vishvaUid;
        if (uid) return uid;
    }
    
    // Fallback to tags
    if (!(mesh instanceof BABYLON.InstancedMesh) && (Tags.HasTags(mesh))) {
        var tags: string[] = (<string>Tags.GetTags(mesh, true)).split(" ");
        for (let tag of tags) {
            var i: number = tag.indexOf("Vishva.uid.");
            if (i >= 0) return tag;
        }
    }
    
    // Generate new UID
    var uid: string;
    uid = "Vishva.uid." + (<number>new Number(Date.now())).toString();
    while ((uid === this.prevUID)) {
        uid = "Vishva.uid." + (<number>new Number(Date.now())).toString();
    };
    this.prevUID = uid;
    
    // Store in metadata
    if (!Vishva.vishva._meshMetadata) Vishva.vishva._meshMetadata = {};
    if (!Vishva.vishva._meshMetadata[mesh.id]) {
        Vishva.vishva._meshMetadata[mesh.id] = new MeshMetadata();
        Vishva.vishva._meshMetadata[mesh.id].meshId = mesh.id;
    }
    Vishva.vishva._meshMetadata[mesh.id].vishvaUid = uid;
    
    if (mesh instanceof InstancedMesh) {
        mesh.name = mesh.name + "." + uid;
        return mesh.name;
    } else {
        // Keep tag for backward compatibility
        Tags.AddTagsTo(mesh, uid);
        return uid;
    }
}
```

### Phase 9: Update AvManager

**File: `src/avatar/AvManager.ts`**

Modify avatar switching methods:

```typescript
// In method that creates/sets avatar (around line 94)
Tags.AddTagsTo(avatar, "Vishva.avatar");
Tags.AddTagsTo(avatarSkeleton, "Vishva.skeleton");

// NEW: Update object IDs
if (!Vishva.vishva._objectIds) Vishva.vishva._objectIds = new ObjectIdMap();
Vishva.vishva._objectIds.avatarId = avatar.id;
Vishva.vishva._objectIds.skeletonId = avatarSkeleton.id;

// In method that removes avatar (around line 206)
Tags.RemoveTagsFrom(this.avatar, "Vishva.avatar");
if (this.avatarSkeleton != null) {
    Tags.RemoveTagsFrom(this.avatarSkeleton, "Vishva.skeleton");
}

// NEW: Clear object IDs
if (Vishva.vishva._objectIds) {
    Vishva.vishva._objectIds.avatarId = null;
    Vishva.vishva._objectIds.skeletonId = null;
}

// In method that sets new avatar (around line 217)
Tags.AddTagsTo(this.avatar, "Vishva.avatar");
if (this.avatarSkeleton != null) {
    Tags.AddTagsTo(this.avatarSkeleton, "Vishva.skeleton");
}

// NEW: Update object IDs
if (!Vishva.vishva._objectIds) Vishva.vishva._objectIds = new ObjectIdMap();
Vishva.vishva._objectIds.avatarId = this.avatar.id;
if (this.avatarSkeleton) {
    Vishva.vishva._objectIds.skeletonId = this.avatarSkeleton.id;
}
```

### Phase 10: Update Ground Creation Methods

**File: `src/Vishva.ts`**

Update all ground creation methods:

1. `createGround()` (line 3861)
2. `_createPlaneGround()` (line 3887)
3. `createGround_htmap()` (line 3906)
4. `creatDynamicTerrain()` (line 3994)

Add after each `Tags.AddTagsTo(grnd, "Vishva.ground Vishva.internal")`:

```typescript
// NEW: Update object IDs and metadata
if (!this._objectIds) this._objectIds = new ObjectIdMap();
this._objectIds.groundId = grnd.id;

if (!this._meshMetadata) this._meshMetadata = {};
this._meshMetadata[grnd.id] = new MeshMetadata();
this._meshMetadata[grnd.id].meshId = grnd.id;
this._meshMetadata[grnd.id].isInternal = true;
```

### Phase 11: Update Skybox Creation

**File: `src/Vishva.ts`**

Modify `createSkyBox()` method (line 4013):

```typescript
Tags.AddTagsTo(skybox, "Vishva.sky Vishva.internal");

// NEW: Update object IDs and metadata
if (!this._objectIds) this._objectIds = new ObjectIdMap();
this._objectIds.skyboxId = skybox.id;

if (!this._meshMetadata) this._meshMetadata = {};
this._meshMetadata[skybox.id] = new MeshMetadata();
this._meshMetadata[skybox.id].meshId = skybox.id;
this._meshMetadata[skybox.id].isInternal = true;
```

### Phase 12: Update Camera Creation

**File: `src/Vishva.ts`**

Modify `createCamera()` method (line 4263):

```typescript
Tags.AddTagsTo(camera, "Vishva.camera");

// NEW: Update object IDs
if (!this._objectIds) this._objectIds = new ObjectIdMap();
this._objectIds.cameraId = camera.id;
```

### Phase 13: Update Sun Creation

**File: `src/Vishva.ts`**

Modify sun creation (around line 486):

```typescript
Tags.AddTagsTo(this.sun, "Vishva.sun");

// NEW: Update object IDs
if (!this._objectIds) this._objectIds = new ObjectIdMap();
this._objectIds.sunId = this.sun.id;
```

## Files That Need Modification

### Core Files
1. **src/VishvaSerialized.ts** - Add new data structures
2. **src/Vishva.ts** - Major changes to object finding, creation, and state management
3. **src/managers/SaveManager.ts** - Add metadata capture during save
4. **src/managers/LoadManager.ts** - Add metadata restoration during load

### Supporting Files
5. **src/sna/SNA.ts** - Update UID management
6. **src/avatar/AvManager.ts** - Update avatar/skeleton ID tracking
7. **src/gui/propspanel/GrndDimUI.ts** - Update ground creation (line 81)

### Files That Reference Tags (No Changes Needed - Read Only)
- **src/sna/SensorContact.ts** - Only reads avatar tag
- **src/VishvaSerialized.ts** - Only reads animation group tags

## Backward Compatibility Strategy

To ensure smooth migration:

1. **Dual Write**: Write both to metadata AND tags during save
2. **Dual Read**: Read from metadata first, fallback to tags if not found
3. **Version Detection**: Check for presence of `objectIds` in VishvaSerialized to determine file version
4. **Gradual Migration**: Old files will continue to work using tag fallback

## Testing Checklist

- [ ] Save a world with all object types (avatar, ground, sky, primitives, invisible objects)
- [ ] Load the saved world and verify all objects are found correctly
- [ ] Test backward compatibility by loading old world files
- [ ] Test visibility toggle (reveal/hide invisibles)
- [ ] Test ground switching
- [ ] Test primitive creation
- [ ] Test avatar switching
- [ ] Test SNA system with mesh UIDs
- [ ] Test save/load cycle multiple times
- [ ] Verify no tags are lost during migration

## Benefits of Migration

1. **Performance**: Direct ID lookup is faster than tag iteration
2. **Reliability**: IDs are more stable than tag strings
3. **Maintainability**: Centralized metadata management
4. **Extensibility**: Easy to add new metadata fields
5. **Debugging**: Easier to inspect metadata in serialized files
6. **Type Safety**: Strongly typed metadata vs string tags

## Risks and Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking old worlds | Maintain tag fallback for loading |
| Missing metadata during save | Validate metadata before save |
| ID conflicts | Use Babylon's built-in ID system |
| Performance regression | Profile before/after migration |
| Data loss | Comprehensive testing |

## Implementation Order

1. Phase 1: Extend VishvaSerialized (foundation)
2. Phase 2-3: Save/Load infrastructure
3. Phase 4: Core object finding (most critical)
4. Phase 5-6: State management (visibility, primitives)
5. Phase 7-13: Individual object types
6. Testing and validation
7. Remove tag fallback code (future phase)

## Estimated Effort

- **Development**: 3-5 days
- **Testing**: 2-3 days
- **Documentation**: 1 day
- **Total**: 6-9 days

## Future Enhancements

Once migration is complete:

1. Remove tag fallback code (breaking change)
2. Add metadata validation
3. Add metadata migration tools
4. Extend metadata for additional features
5. Add metadata versioning
