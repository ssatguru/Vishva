# Blob URL Resave Fix — Bugfix Design

## Overview

After a save-load-save cycle, SNA actuator asset references (e.g., `ActDialogParm.htmlFile.value`) are serialized as blob URLs instead of their original `vishva/assets/...` paths. This renders the assets unfindable on subsequent loads because blob URLs are session-scoped and expire when the page is unloaded.

The fix introduces a reverse-mapping mechanism so that at save time, blob URLs in SNA actuator properties can be translated back to their original asset paths. This ensures that `Vishva.json` always contains portable `vishva/assets/...` paths regardless of how many save-load cycles have occurred, while preserving the runtime blob URL resolution that actuators depend on.

## Glossary

- **Bug_Condition (C)**: A VishvaSerialized object contains blob URL strings (starting with `blob:`) in SNA actuator property values at serialization time, caused by `resolveAssetPaths()` mutating the live object in-place during load
- **Property (P)**: At save time, all asset references in VishvaSerialized SHALL contain their original `vishva/assets/...` paths, not blob URLs
- **Preservation**: Runtime blob URL resolution for actuators must continue to work — actuators must still receive working blob URLs for XHR/fetch operations; `AssetCollector.collectServerAssets()` must continue to find `vishva/`-prefixed paths; first-time saves (no prior load) must work unchanged
- **resolveAssetPaths()**: Method on `AssetResolver` in `src/managers/AssetResolver.ts` that deep-traverses an object tree replacing `vishva/assets/...` strings with blob URLs for runtime use
- **serializeSnAs()**: Method on `SNAManager` in `src/sna/SNA.ts` that serializes all sensor/actuator properties from live mesh objects
- **FileInputType**: A property type used by SNA actuators (e.g., `ActDialogParm.htmlFile`) whose `.value` field holds an asset path string
- **AssetStore**: IndexedDB-backed storage (`VishvaAssetStore` database) with `session` and `saved` object stores for asset binary data

## Bug Details

### Bug Condition

The bug manifests when a world containing SNA actuator asset references is loaded from IndexedDB (or a tar.gz archive) and then re-saved. The `AssetResolver.resolveAssetPaths()` method mutates the parsed `VishvaSerialized` JSON object in-place, replacing `"vishva/assets/..."` path strings with blob URLs. This mutated object is then assigned to `this.vishva.vishvaSerialized` and its SNA data is used to create live actuator instances. When the world is subsequently saved, `SNAManager.serializeSnAs()` reads the live actuator properties which now contain blob URLs, and these are serialized verbatim into `Vishva.json`.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { vishvaSerialized: VishvaSerialized, saveContext: "indexeddb" | "download" }
  OUTPUT: boolean
  
  RETURN EXISTS property IN deepTraverse(input.vishvaSerialized.snas[*].properties)
         WHERE typeof property.value === "string"
         AND property.value.startsWith("blob:")
         AND property.value was originally a "vishva/assets/" path before resolveAssetPaths() mutated it
END FUNCTION
```

### Examples

- **Dialog actuator HTML file**: `ActDialogParm.htmlFile.value` is `"vishva/assets/html/introScreen.html"` on first save. After load, it becomes `"blob:http://localhost:8080/9ff8355a-..."`. On re-save, the blob URL is written to Vishva.json. On next load, the blob URL is invalid → dialog shows nothing.
- **Sound actuator file**: `ActSoundParm.soundFile.value` is `"vishva/assets/audio/ambient.ogg"`. After load-save cycle, becomes a dead blob URL.
- **Multiple actuators on same mesh**: A mesh with both a Dialog and Sound actuator — both asset references become blob URLs after one load-save cycle.
- **Edge case — no asset references**: An actuator with no `FileInputType` properties (e.g., `ActuatorMover`) is unaffected because it has no `vishva/assets/` strings to resolve.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `AssetResolver.resolveAssetPaths()` must continue to provide working blob URLs to actuators at runtime (XHR requests to fetch HTML content, sound file loading, etc. must succeed)
- `AssetCollector.collectServerAssets()` must continue to correctly identify and collect `vishva/`-prefixed paths with file extensions from VishvaSerialized
- First-time saves (world has never been loaded from IndexedDB) must continue to serialize original asset paths directly without any reverse-mapping step
- `Tools.PreprocessUrl` and `Tools.LoadFile` overrides must continue to intercept and serve assets from the AssetStore via blob URLs for BabylonJS texture loading
- `AssetResolver.deactivate()` must continue to revoke blob URLs and restore original BabylonJS tool functions after scene loading completes
- Scene.babylon texture `name` and `url` fields must continue to contain original asset paths, not blob URLs

**Scope:**
All inputs that do NOT involve SNA actuator properties containing blob URLs should be completely unaffected by this fix. This includes:
- Scene texture serialization (already handled correctly by `Tools.PreprocessUrl` interception pattern)
- Non-asset SNA properties (signal IDs, numeric values, vectors, booleans)
- Worlds loaded from server (no `AssetResolver` activation, no blob URL resolution)
- JSON-only saves (no asset bundling, paths remain as-is)

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **In-place mutation without reverse mapping**: `AssetResolver.resolveAssetPaths()` (line 121 of `AssetResolver.ts`) replaces `vishva/assets/...` strings with blob URLs directly in the object tree. It does not record the original path → blob URL mapping anywhere accessible at save time.

2. **Live object reference chain**: In `LoadManager.loadVishvaPartFromObjects()` (line 747), the mutated `vishvaData` is assigned to `this.vishva.vishvaSerialized`. The SNA data within it (`vishvaData.snas`) is then passed to `SNAManager.unMarshal()` which creates actuator instances with properties pointing to the same mutated objects. When `serializeSnAs()` later calls `actuator.getProperties()`, it returns these same objects — now containing blob URLs.

3. **AssetCollector correctly rejects blob URLs**: `AssetCollector._isServerAssetString()` returns `false` for strings starting with `blob:`, so the blob URLs are never collected as assets and pass through to the serialized output unchanged.

4. **No blob-to-path reverse lookup at save time**: The `SaveManager.saveWorldToIndexedDB()` path calls `assetCollector.collectServerAssets(vishvaSerialzed)` on the freshly-created `VishvaSerialized`, but `serializeSnAs()` has already captured the blob URLs from the live actuator properties. There is no mechanism to translate them back.

## Correctness Properties

Property 1: Bug Condition - Blob URLs are reverse-mapped to original paths at save time

_For any_ VishvaSerialized object produced by the save pipeline (IndexedDB save or archive download) where the world was previously loaded from IndexedDB with asset resolution, the serialized output SHALL NOT contain any string values starting with `blob:` in the `snas[*].properties` subtree. All asset references SHALL be `vishva/assets/...` paths.

**Validates: Requirements 2.1, 2.3**

Property 2: Preservation - Non-blob asset paths and runtime behavior unchanged

_For any_ input where the SNA actuator properties do NOT contain blob URLs (first-time save, server-loaded world, or properties without asset references), the fixed save pipeline SHALL produce exactly the same serialized output as the original code, preserving all existing `vishva/assets/...` paths and non-asset property values unchanged.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/managers/AssetResolver.ts`

**Function**: `resolveAssetPaths()`

**Specific Changes**:

1. **Maintain a blob-to-path reverse map**: When `resolveAssetPaths()` replaces a `vishva/assets/...` string with a blob URL, record the mapping in a `Map<string, string>` (blobUrl → originalPath). This map persists for the lifetime of the `AssetResolver` instance (until `deactivate()` is called).

2. **Expose a `reverseBlobUrl(blobUrl: string): string | null` method**: Given a blob URL, returns the original `vishva/assets/...` path, or `null` if the blob URL is not recognized. This is used by the save pipeline.

3. **Expose a `reverseAllBlobUrls(obj: any): void` method**: Deep-traverses an object tree (same pattern as `resolveAssetPaths`) and replaces any blob URL strings that exist in the reverse map with their original paths. This is the inverse operation of `resolveAssetPaths()`.

**File**: `src/managers/SaveManager.ts`

**Functions**: `saveWorldToIndexedDB()`, `_getWorldZipBlob()`, `saveWorldAsJson()`, `saveWorldToIndexedDBAsJson()`

**Specific Changes**:

4. **Reverse blob URLs in serialized SNA properties before writing**: After `SNAManager.serializeSnAs()` produces the SNA array (which may contain blob URLs in actuator properties), call `assetResolver.reverseAllBlobUrls(vishvaSerialized.snas)` to restore original paths. The `AssetResolver` instance is available via `this.vishva._assetResolver` (stored at load time).

5. **Store AssetResolver reference on Vishva instance**: In `LoadManager.loadVishvaPartFromObjects()`, store the `assetResolver` instance on `this.vishva._assetResolver` so it remains accessible at save time (it is currently only referenced locally and deactivated after scene load — but the reverse map should survive deactivation, or the reference should be stored before deactivation).

**Alternative approach** (simpler, no AssetResolver changes needed):

4b. **Store the original VishvaSerialized before mutation**: In `LoadManager.loadVishvaPartFromObjects()`, deep-clone `vishvaData` before calling `resolveAssetPaths()` and store it as `this.vishva._originalVishvaSerialized`. At save time, use this pristine copy to look up original paths for any blob URLs found in the live actuator properties.

5b. **Build a blobUrl→path map from the AssetResolver's internal state**: Since `AssetResolver` already has `assetMap` (key → Uint8Array) and creates blob URLs via `createBlobUrl()`, extend it to also maintain a `blobUrlToKey` map. Expose this map (or a lookup method) for save-time use.

**Recommended approach**: Option 1 (reverse map in AssetResolver) is cleaner because:
- It keeps the mapping logic co-located with the resolution logic
- It doesn't require deep-cloning potentially large objects
- It survives even if actuator properties are modified at runtime (the blob URL is still the key)
- The reverse map is lightweight (just string→string entries)

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate the load-save cycle: create a VishvaSerialized with `vishva/assets/...` paths in SNA properties, call `resolveAssetPaths()` to mutate them to blob URLs, then simulate `serializeSnAs()` by reading back the properties. Assert that the serialized output contains blob URLs (demonstrating the bug on unfixed code).

**Test Cases**:
1. **Dialog actuator htmlFile**: Create SNA with `htmlFile.value = "vishva/assets/html/intro.html"`, resolve, serialize → blob URL appears (will fail on unfixed code to demonstrate bug)
2. **Sound actuator soundFile**: Create SNA with `soundFile.value = "vishva/assets/audio/ambient.ogg"`, resolve, serialize → blob URL appears
3. **Multiple actuators**: Multiple actuators with different asset paths all get blob URLs after resolution
4. **Nested object traversal**: Asset path buried in a nested property structure still gets mutated

**Expected Counterexamples**:
- After `resolveAssetPaths()`, all `vishva/assets/...` strings in the SNA properties subtree are replaced with `blob:...` URLs
- `serializeSnAs()` (or equivalent property read-back) captures these blob URLs verbatim
- Possible root cause confirmed: in-place mutation with no reverse mapping

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := savePipeline_fixed(input)
  ASSERT NOT containsBlobUrls(result.vishvaSerialized.snas)
  ASSERT allAssetPaths(result.vishvaSerialized.snas) START WITH "vishva/assets/"
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT savePipeline_original(input) = savePipeline_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (various SNA property shapes, nested structures, mixed asset/non-asset values)
- It catches edge cases that manual unit tests might miss (e.g., strings that look like blob URLs but aren't from resolution, empty property objects)
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for non-blob inputs (first-time saves, server-loaded worlds), then write property-based tests capturing that behavior.

**Test Cases**:
1. **First-time save preservation**: Verify that a world with `vishva/assets/...` paths that was never loaded from IndexedDB serializes identically before and after the fix
2. **Non-asset property preservation**: Verify that SNA properties without asset references (numbers, vectors, booleans, signal IDs) are unchanged by the fix
3. **AssetCollector preservation**: Verify that `collectServerAssets()` still finds all `vishva/`-prefixed paths in VishvaSerialized after the fix
4. **Runtime blob URL preservation**: Verify that actuators still receive working blob URLs for XHR/fetch operations after the fix

### Unit Tests

- Test `reverseAllBlobUrls()` correctly restores original paths from blob URLs in a nested object tree
- Test `reverseBlobUrl()` returns `null` for unrecognized blob URLs
- Test that the reverse map is populated correctly during `resolveAssetPaths()`
- Test the full load-save cycle: resolve → serialize → reverse → verify original paths restored
- Test edge cases: empty SNA array, actuator with no asset properties, multiple actuators sharing same asset path

### Property-Based Tests

- Generate random VishvaSerialized structures with `vishva/assets/...` paths, resolve them, reverse them, and verify round-trip equality
- Generate random SNA property objects mixing asset paths with non-asset values, verify only asset paths are affected by resolve/reverse
- Generate random blob URL strings and verify that only those produced by `resolveAssetPaths()` are reversed (foreign blob URLs are left unchanged)

### Integration Tests

- Test full save-load-save cycle with a world containing Dialog actuator with HTML file reference
- Test that after fix, a world can survive multiple save-load cycles without path degradation
- Test that downloaded archive (tar.gz) after a load cycle contains correct `vishva/assets/...` paths in Vishva.json
