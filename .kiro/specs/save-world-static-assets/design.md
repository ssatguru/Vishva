# Save World Static Assets Bugfix Design

## Overview

The standalone archive export pipeline fails to include static assets served from the web server's `vishva/assets` folder. The current `AssetCollector` scans specific fields in the serialized scene JSON (textures[].name, materials[].*.name, etc.) but misses CubeTexture `files` arrays and VishvaSerialized sound/asset references. The fix replaces the field-specific scanning approach with a comprehensive deep-scan of the entire serialized output (both `Scene.babylon` and `Vishva.json`) for any string value starting with the `vishva/` prefix, treating all matches as static assets to fetch and archive.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — when a serialized string value starts with `vishva/` (the server asset path prefix) but is not collected by the current field-specific scanning logic
- **Property (P)**: The desired behavior — all `vishva/`-prefixed strings are collected, fetched, archived in the `assets/` folder, and rewritten to archive-relative paths
- **Preservation**: Existing behavior for embedded textures (base64String), blob URL textures, loaded archive assets (`_loadedAssetMap`), already-rewritten paths (`assets/`), and floating-point precision reduction must remain unchanged
- **AssetCollector**: The class in `src/managers/AssetCollector.ts` that scans serialized scene JSON and produces a deduplicated list of external asset references
- **PathRewriter**: The class in `src/managers/PathRewriter.ts` that deep-traverses the scene object replacing original URLs with archive-relative paths
- **SaveManager**: The class in `src/managers/SaveManager.ts` that orchestrates the full archive export pipeline
- **Server Asset Path Prefix**: The string `vishva/` — all static assets served by the web server are under this path (e.g., `vishva/assets/curated/skyboxes/...`)
- **VishvaSerialized**: The Vishva-specific metadata JSON (avatar settings, SNA behaviors, sounds) serialized as `Vishva.json` in the archive

## Bug Details

### Bug Condition

The bug manifests when the serialized scene or VishvaSerialized metadata contains string values starting with `vishva/` that reference server-served static assets. The current `AssetCollector.collect()` method only scans specific known fields (`textures[].name`, `materials[].*.name`, `particleSystems[].textureName`, `meshes[].delayLoadingFile`, `environmentTexture`, `reflectionTexture.name`) and misses:
1. CubeTexture `files` arrays containing 6 individual face file paths
2. Sound references in VishvaSerialized (avatar footstep sounds, SNA actuator sounds)
3. Any other nested string values that happen to reference server assets

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { sceneObj: object, vishvaObj: object }
  OUTPUT: boolean
  
  LET allStrings = deepCollectAllStringValues(input.sceneObj) 
                   UNION deepCollectAllStringValues(input.vishvaObj)
  LET serverAssetStrings = FILTER allStrings WHERE str.startsWith("vishva/")
  LET collectedByCurrentLogic = AssetCollector.collect(input.sceneObj).map(e => e.originalUrl)
  
  RETURN serverAssetStrings.size > 0
         AND serverAssetStrings IS NOT SUBSET OF collectedByCurrentLogic
END FUNCTION
```

### Examples

- **CubeTexture files array**: A skybox material has `reflectionTexture.files = ["vishva/assets/curated/skyboxes/TropicalSunnyDay/TropicalSunnyDay_px.jpg", ..._py.jpg, ..._pz.jpg, ..._nx.jpg, ..._ny.jpg, ..._nz.jpg]`. Current code collects only `reflectionTexture.name` (the unfetchable base path `vishva/assets/curated/skyboxes/TropicalSunnyDay/TropicalSunnyDay`), missing all 6 actual image files.
- **Avatar footstep sound**: VishvaSerialized contains `avSerialized.settings.sound.name = "vishva/assets/audio/footstep_carpet_000.ogg"`. Current code never scans VishvaSerialized at all.
- **SNA ActuatorSound**: VishvaSerialized SNA data contains `snas[].actuator.props.soundFile.value = "sounds/explosion.ogg"` which gets prefixed to `vishva/assets/sounds/explosion.ogg` at runtime. The serialized form may contain the full path.
- **Edge case — non-fetchable base path**: `reflectionTexture.name = "vishva/assets/curated/skyboxes/TropicalSunnyDay/TropicalSunnyDay"` (no extension) — this is not a real file and will 404. The fix should still attempt it but report the failure.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Embedded textures (base64String from GLB imports) must continue to be extracted, decoded, and included as separate files in the archive
- Blob URL textures (created by AssetResolver during archive load) must continue to be fetched and included
- Assets from a previously loaded archive (`_loadedAssetMap`) must continue to be carried forward on re-save
- Paths already rewritten to `assets/` must continue to be skipped during collection
- Floating-point numbers must continue to be rounded to 4 decimal places
- Valid tar archives must continue to be produced for worlds with no external assets

**Scope:**
All inputs that do NOT contain string values starting with `vishva/` should be completely unaffected by this fix. This includes:
- Embedded textures (base64String data URIs)
- Blob URL textures (`blob:` prefix)
- Already-archived paths (`assets/` prefix)
- Relative paths that don't start with `vishva/`
- Non-string values (numbers, booleans, objects, arrays)

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **Field-specific scanning is incomplete**: `AssetCollector.collect()` scans only a hardcoded set of fields. BabylonJS serializes CubeTextures with a `files` array containing 6 face URLs, but `_scanMaterials()` only reads `value.name` from nested texture objects — it never iterates into arrays within those objects.

2. **VishvaSerialized is never scanned**: The `AssetCollector` only receives the scene object (`sceneObj`). The `VishvaSerialized` object (which becomes `Vishva.json`) is never passed to any asset collection logic, so sound references and other asset paths in it are invisible to the pipeline.

3. **Silent failure on 404**: When the unfetchable CubeTexture base path (without extension) is collected and fetched, the fetch fails with a 404. The current code only does `console.warn()`, providing no user-visible indication that the archive is incomplete.

4. **No generic string scanning**: The architecture assumes all asset references live in known, enumerable fields. A generic deep-scan for the `vishva/` prefix would catch all current and future asset reference patterns without needing to know the exact JSON structure.

## Correctness Properties

Property 1: Bug Condition - Server Asset Collection Completeness

_For any_ serialized scene object or VishvaSerialized object containing string values starting with `vishva/`, the fixed `collectServerAssets` function SHALL return an entry for every unique `vishva/`-prefixed string found anywhere in the object tree, with a resolved fetch URL and a deduplicated archive filename.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Non-Server-Asset Behavior Unchanged

_For any_ serialized scene object that does NOT contain string values starting with `vishva/` (containing only embedded textures, blob URLs, already-archived paths, or no external assets), the fixed code SHALL produce exactly the same archive output as the original code, preserving all existing asset collection, path rewriting, and archive packaging behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/managers/AssetCollector.ts`

**New Method**: `collectServerAssets(obj: object): string[]`

**Specific Changes**:
1. **Add a new `collectServerAssets` method**: Deep-traverses any object/array and collects all unique string values starting with `vishva/`. This replaces the need for field-specific scanning for server assets. Returns a deduplicated array of server-relative URLs.

2. **Add filtering logic**: The method must skip strings that are already rewritten (`assets/` prefix), are data URIs (`data:` prefix), or are blob URLs (`blob:` prefix). It should also skip the `vishva/` prefix if it appears as a substring within a longer non-URL string (though in practice all `vishva/`-prefixed strings in the serialized output are asset URLs).

3. **Build AssetEntry objects**: Convert collected `vishva/`-prefixed strings into `AssetEntry` objects with resolved fetch URLs (using `window.location.href` as base) and deduplicated archive filenames (flattened from the path).

**File**: `src/managers/SaveManager.ts`

**Method**: `_getWorldZipBlob()`

**Specific Changes**:
4. **Scan both sceneObj and vishvaSerialzed**: After serialization but before path rewriting, call the new `collectServerAssets` on both the scene object and the VishvaSerialized object. Merge results into a single deduplicated set.

5. **Fetch server assets with error reporting**: Fetch each collected server asset URL. On failure, accumulate error messages and report them to the user via `progressManager` or `DialogMgr` after save completes, rather than silently skipping.

6. **Rewrite server asset paths**: Use `PathRewriter` (or equivalent deep-traversal) to replace all occurrences of the original `vishva/`-prefixed URLs with their corresponding `assets/<archiveFilename>` paths in BOTH the scene object and the VishvaSerialized object.

7. **Include in archive**: Add fetched server asset binary data to the archive file list alongside embedded, blob, and carried-forward assets.

**File**: `src/managers/PathRewriter.ts`

**Specific Changes**:
5. **Support rewriting VishvaSerialized**: The existing `rewrite()` method already does generic deep-traversal with a URL map. It can be called on the VishvaSerialized object as well — no structural change needed, just an additional call site in SaveManager.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that construct serialized scene objects with `vishva/`-prefixed strings in CubeTexture `files` arrays and VishvaSerialized sound references, then call `AssetCollector.collect()` and verify the URLs are NOT in the returned entries (demonstrating the bug).

**Test Cases**:
1. **CubeTexture files array test**: Create a scene with `materials[].reflectionTexture.files = ["vishva/assets/skybox_px.jpg", ...]` and verify `collect()` does NOT return entries for those URLs (will fail on unfixed code)
2. **VishvaSerialized sound reference test**: Create a VishvaSerialized-like object with `avSerialized.settings.sound.name = "vishva/assets/audio/footstep.ogg"` and verify it is NOT collected (will fail on unfixed code — VishvaSerialized is never scanned)
3. **Nested array string test**: Create a scene with deeply nested arrays containing `vishva/`-prefixed strings and verify they are NOT collected by the field-specific scanner (will fail on unfixed code)
4. **Mixed asset types test**: Create a scene with both known-field assets AND `files` array assets, verify only known-field assets are collected (will fail on unfixed code)

**Expected Counterexamples**:
- `collect()` returns entries only for `textures[].name`, `materials[].*.name`, etc. — never for strings in `files` arrays or VishvaSerialized
- Possible causes: field-specific scanning, VishvaSerialized never passed to collector

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := collectServerAssets_fixed(input.sceneObj)
  LET allServerStrings = deepCollectAllStringValues(input.sceneObj)
                         .filter(s => s.startsWith("vishva/"))
  ASSERT allServerStrings IS SUBSET OF result.map(e => e.originalUrl)
  ASSERT ALL entries have valid fetchUrl (resolves against baseUrl)
  ASSERT ALL entries have unique archiveFilename
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT collectServerAssets(input) = [] (empty — no server assets found)
  ASSERT collect_original(input) = collect_fixed(input) (existing collection unchanged)
  ASSERT pathRewrite_original(input) = pathRewrite_fixed(input) (existing rewriting unchanged)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for scenes with only embedded textures, blob URLs, and already-archived paths, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Embedded texture preservation**: Verify that scenes with only base64String textures produce identical archive output before and after the fix
2. **Blob URL preservation**: Verify that scenes with only blob URL textures continue to be collected and archived identically
3. **Already-archived path preservation**: Verify that paths starting with `assets/` are still skipped during server asset collection
4. **No-external-assets preservation**: Verify that scenes with no external assets produce valid archives with just `Vishva.json` and `Scene.babylon`
5. **Floating-point precision preservation**: Verify that `_stringifyWithPrecision` continues to round numbers to 4 decimal places

### Unit Tests

- Test `collectServerAssets` with a scene containing `vishva/`-prefixed strings in various locations (files arrays, nested objects, top-level fields)
- Test `collectServerAssets` returns empty array for scenes with no `vishva/`-prefixed strings
- Test `collectServerAssets` skips strings starting with `assets/`, `data:`, and `blob:`
- Test filename deduplication when multiple assets have the same basename
- Test URL resolution against a base URL
- Test that fetch failures are accumulated and reported (not silently swallowed)

### Property-Based Tests

- Generate random object trees with arbitrary nesting containing `vishva/`-prefixed strings at random positions, verify `collectServerAssets` finds ALL of them
- Generate random object trees with NO `vishva/`-prefixed strings (only `assets/`, `data:`, `blob:`, or plain strings), verify `collectServerAssets` returns empty
- Generate random scenes with mixed asset types (embedded + blob + server), verify each pipeline handles only its own asset type without interference
- Test that `PathRewriter.rewrite()` correctly replaces all occurrences of collected URLs in arbitrarily nested structures

### Integration Tests

- Test full `_getWorldZipBlob` pipeline with a scene containing CubeTexture `files` arrays — verify all 6 face images appear in the archive
- Test full pipeline with VishvaSerialized containing sound references — verify sound files appear in the archive
- Test that user-visible error reporting occurs when a server asset fetch fails (404)
- Test re-save of an archive that was loaded and contains both carried-forward assets and new server assets
