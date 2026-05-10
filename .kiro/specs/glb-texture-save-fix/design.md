# GLB Texture Save Fix — Bugfix Design

## Overview

The asset pipeline (embedded texture extraction, external asset collection, path rewriting, and binary bundling) was removed from `SaveManager._getWorldZipBlob()` when the precision reduction feature was added. The fix re-integrates the existing pipeline components — `AssetCollector`, `PathRewriter`, and fetch logic — into the save method, ensuring all textures and assets are bundled in the TAR archive as separate files. The precision reduction is moved to execute AFTER the asset pipeline completes, preventing corruption of base64 data or interference with URL matching.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — saving a world that contains any textures or external assets (GLB-imported textures with base64String, or server-loaded assets with fetchable URLs)
- **Property (P)**: The desired behavior — all assets are extracted, paths rewritten, binary data bundled in the archive under `assets/`, and Scene.babylon contains no base64String fields
- **Preservation**: Worlds with no assets continue to save correctly; precision reduction still applies; legacy archive loading is unaffected; IndexedDB and file-download paths produce identical output
- **`_getWorldZipBlob()`**: The method in `src/managers/SaveManager.ts` that serializes the scene and produces the gzip-compressed TAR archive
- **`collectEmbeddedTextures()`**: Method on `AssetCollector` that finds textures with `base64String` fields in the serialized scene JSON and decodes them
- **`stripEmbeddedTextures()`**: Method on `AssetCollector` that removes `base64String` from texture objects and rewrites their `name`/`url` to `assets/<filename>`
- **`collect()`**: Method on `AssetCollector` that scans the scene JSON for remaining external asset URLs (skips textures that have `base64String`)
- **`PathRewriter.rewrite()`**: Rewrites all collected asset URLs in the scene JSON to `assets/<archiveFilename>` format

## Bug Details

### Bug Condition

The bug manifests when a user saves a world that contains any textures or external assets. The `_getWorldZipBlob()` method serializes the scene but does not invoke the asset pipeline, so no textures are extracted, no paths are rewritten, and no asset files are included in the archive.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type SerializedSceneObject
  OUTPUT: boolean
  
  RETURN hasEmbeddedTextures(input)
         OR hasExternalAssetUrls(input)
END FUNCTION

FUNCTION hasEmbeddedTextures(sceneObj)
  FOR EACH material IN sceneObj.materials DO
    FOR EACH property IN material DO
      IF property IS object AND property.base64String starts with "data:" THEN
        RETURN true
      END IF
    END FOR
  END FOR
  FOR EACH texture IN sceneObj.textures DO
    IF texture.base64String starts with "data:" THEN
      RETURN true
    END IF
  END FOR
  RETURN false
END FUNCTION

FUNCTION hasExternalAssetUrls(sceneObj)
  FOR EACH texture IN sceneObj.textures DO
    IF texture.name IS non-empty string AND NOT starts with "data:" THEN
      RETURN true
    END IF
  END FOR
  RETURN false
END FUNCTION
```

### Examples

- **GLB texture (base64String)**: A sofa GLB is dragged into the scene. After serialization, `materials[0].albedoTexture.base64String` contains `"data:image/webp;base64,UklGR..."`. Expected: extracted to `assets/Leather_Diffuse.webp`, base64String removed, name/url rewritten. Actual: base64String remains in Scene.babylon, no file in assets/.
- **Curated asset texture**: A tree mesh loaded from `http://localhost:8080/assets/curated/trees/oak/bark.jpg`. Expected: fetched, bundled as `assets/bark.jpg`, path rewritten. Actual: original server URL left in Scene.babylon, no file bundled.
- **World with no textures**: An empty world with only primitive boxes. Expected: archive contains only `Vishva.json` + `Scene.babylon` (no assets/ folder needed). Actual: same — this case works correctly today.
- **Multiple GLB textures with same base name**: Two GLBs both have a texture named `diffuse`. Expected: disambiguated as `assets/diffuse.webp` and `assets/diffuse_1.webp`. Actual: both left as base64String in Scene.babylon.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Worlds with no textures or external assets continue to produce a valid TAR archive with only `Vishva.json` and `Scene.babylon`
- Floating point precision reduction (4 decimal places) continues to apply to all numeric values in the output JSON
- Legacy archives (without `assets/` folder) continue to load successfully via server-fetch behavior
- IndexedDB saves and file-download saves produce identical archive content
- `saveAsset()` (single mesh export) continues to work with precision reduction only
- The `LoadManager` pipeline (AssetResolver activation/deactivation) remains unchanged
- Scene cleanup steps (camera removal, skeleton reset, material cleanup, shadow list management) continue to execute in the same order

**Scope:**
All inputs that do NOT involve textures or external assets should be completely unaffected by this fix. This includes:
- Worlds containing only primitive meshes with default materials
- The VishvaSerialized JSON (Vishva.json) — only Scene.babylon is processed by the asset pipeline
- The gzip compression step — operates on the final TAR regardless of content

## Hypothesized Root Cause

Based on the bug description and code history, the root cause is clear:

1. **Missing Pipeline Integration**: The precision reduction change replaced the entire `_getWorldZipBlob()` implementation. The new version serializes the scene and immediately applies `_stringifyWithPrecision()` without calling any asset pipeline methods. The pipeline components (`AssetCollector`, `PathRewriter`) exist and are tested but are simply not invoked.

2. **Ordering Violation**: Even if the pipeline were partially present, applying `_stringifyWithPrecision()` before asset processing would corrupt base64 data (the precision replacer would attempt to parse base64 characters as numbers) and interfere with URL string matching (truncating numeric segments in URLs).

3. **No Import Statements**: `SaveManager.ts` does not import `AssetCollector` or `PathRewriter`, confirming the pipeline was completely removed rather than partially broken.

## Correctness Properties

Property 1: Bug Condition - Asset Pipeline Produces Bundled Archive

_For any_ serialized scene object where the bug condition holds (hasEmbeddedTextures OR hasExternalAssetUrls), the fixed `_getWorldZipBlob()` function SHALL produce a TAR archive that contains all referenced assets as separate files under the `assets/` prefix, with base64String fields removed from Scene.babylon and all texture/asset paths rewritten to `assets/<filename>` format.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Non-Asset Worlds Unchanged

_For any_ serialized scene object where the bug condition does NOT hold (no embedded textures AND no external asset URLs), the fixed `_getWorldZipBlob()` function SHALL produce the same archive structure as the original function — containing only `Vishva.json` and `Scene.babylon` with precision-reduced numeric values.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/managers/SaveManager.ts`

**Function**: `_getWorldZipBlob()`

**Specific Changes**:

1. **Add Imports**: Import `AssetCollector`, `AssetEntry`, `EmbeddedTextureEntry` from `./AssetCollector` and `PathRewriter` from `./PathRewriter`

2. **Collect Embedded Textures**: After `SceneSerializer.Serialize()` and cleanup steps (`removeSounds`, `removeActuatorTextBarMat`), call `assetCollector.collectEmbeddedTextures(sceneObj)` to find all base64String textures and decode their binary data

3. **Strip Embedded Textures**: Call `assetCollector.stripEmbeddedTextures(embeddedEntries)` to remove base64String fields and update name/url to `assets/<filename>`

4. **Collect External Assets**: Call `assetCollector.collect(sceneObj, baseUrl)` to find remaining external asset URLs. The `baseUrl` should be `window.location.href` (or the scene's base URL). Note: `collect()` already skips textures with base64String, so after `stripEmbeddedTextures()` the rewritten `assets/` paths won't be re-collected because they don't exist on the server — they're just local archive paths.

5. **Rewrite Paths**: Call `pathRewriter.rewrite(sceneObj, externalEntries)` to rewrite all external asset URLs to `assets/<archiveFilename>` format

6. **Fetch External Asset Data**: For each external asset entry that does NOT have `decodedData` (i.e., not a data URI), fetch the binary data from `entry.fetchUrl`. Use try/catch per fetch — log a warning and skip on failure (don't fail the entire save).

7. **Build Archive File List**: Combine embedded texture files (from `embeddedEntries[].decodedData` with filename `assets/<archiveFilename>`) and fetched external asset files into the TAR file list alongside `Vishva.json` and `Scene.babylon`

8. **Apply Precision Reduction AFTER Pipeline**: Move `_stringifyWithPrecision()` calls to AFTER steps 2-6 are complete. The scene object must be fully processed (base64 stripped, paths rewritten) before numeric precision reduction is applied.

9. **Update Progress Reporting**: Add progress stages for "Collecting assets...", "Fetching assets...", etc. to reflect the new pipeline steps

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Construct a mock serialized scene object with embedded textures (base64String fields) and external asset URLs. Call the current `_getWorldZipBlob()` logic and inspect the resulting archive to confirm assets are missing.

**Test Cases**:
1. **Embedded Texture Test**: Create a scene with a material containing `base64String: "data:image/webp;base64,..."`. Verify the archive does NOT contain an `assets/` file (will fail on unfixed code)
2. **External Asset Test**: Create a scene with a texture referencing `http://server/texture.jpg`. Verify the archive does NOT contain `assets/texture.jpg` (will fail on unfixed code)
3. **Base64 Preservation Test**: Verify that `Scene.babylon` in the archive still contains the raw `base64String` field (demonstrates the bug — data not extracted)
4. **Path Not Rewritten Test**: Verify that texture URLs in `Scene.babylon` still point to original server paths (demonstrates the bug — paths not rewritten)

**Expected Counterexamples**:
- Archive contains only `Vishva.json` and `Scene.babylon` with no `assets/` entries
- `Scene.babylon` contains base64String fields and original server URLs
- Root cause confirmed: no pipeline methods are called in `_getWorldZipBlob()`

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL sceneObj WHERE isBugCondition(sceneObj) DO
  archive := _getWorldZipBlob_fixed(sceneObj)
  archiveFiles := extractTarArchive(archive)
  
  // All embedded textures extracted
  FOR EACH embeddedTexture IN collectEmbeddedTextures(originalSceneObj) DO
    ASSERT archiveFiles.has("assets/" + embeddedTexture.archiveFilename)
    ASSERT archiveFiles.get("assets/" + embeddedTexture.archiveFilename) == embeddedTexture.decodedData
  END FOR
  
  // Scene.babylon has no base64String fields
  sceneBabylon := JSON.parse(archiveFiles.get("Scene.babylon"))
  ASSERT NOT hasEmbeddedTextures(sceneBabylon)
  
  // All paths rewritten to assets/ format
  FOR EACH texture IN sceneBabylon.textures DO
    IF texture.name is non-empty THEN
      ASSERT texture.name starts with "assets/"
    END IF
  END FOR
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL sceneObj WHERE NOT isBugCondition(sceneObj) DO
  ASSERT _getWorldZipBlob_original(sceneObj) structurally equals _getWorldZipBlob_fixed(sceneObj)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many scene configurations without textures/assets automatically
- It catches edge cases where the pipeline might accidentally modify non-asset data
- It provides strong guarantees that precision reduction and archive structure are unchanged

**Test Plan**: Generate random scene objects with only primitive meshes (no textures, no external URLs). Verify the fixed function produces archives with only `Vishva.json` and `Scene.babylon`, with identical precision-reduced content.

**Test Cases**:
1. **Empty Scene Preservation**: Verify an empty scene (no meshes, no textures) produces the same archive structure
2. **Primitives-Only Preservation**: Verify a scene with box/sphere meshes and default materials produces the same output
3. **Precision Reduction Preservation**: Verify floating point values are still rounded to 4 decimal places in the output
4. **Archive Format Preservation**: Verify the TAR structure and gzip compression produce valid archives

### Unit Tests

- Test that `collectEmbeddedTextures()` correctly identifies base64String fields in materials and textures arrays
- Test that `stripEmbeddedTextures()` removes base64String and rewrites name/url
- Test that `collect()` skips textures that had base64String (after strip, they have `assets/` paths)
- Test that `PathRewriter.rewrite()` correctly maps all external URLs to archive paths
- Test that precision reduction does not corrupt asset paths or filenames
- Test error handling: fetch failure for one asset doesn't prevent other assets from being saved

### Property-Based Tests

- Generate random scene objects with varying numbers of embedded textures and verify all are extracted and stripped
- Generate random external asset URLs and verify all are collected, rewritten, and (mock) fetched
- Generate scenes with no assets and verify the pipeline is a no-op (preservation)
- Generate mixed scenes (some embedded, some external, some with no textures) and verify correct handling of each category

### Integration Tests

- Save a world with a GLB-imported mesh, extract the archive, verify texture files exist under `assets/`
- Save a world with curated assets, extract the archive, verify server-loaded textures are bundled
- Save and reload a world with GLB textures, verify textures render correctly (round-trip test)
- Save to IndexedDB and reload, verify identical behavior to file-download save
