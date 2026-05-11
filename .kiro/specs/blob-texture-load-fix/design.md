# Blob Texture Load Fix — Bugfix Design

## Overview

When a world is loaded from an archive, `AssetResolver` creates blob URLs (`blob:http://...`) to serve bundled textures to BabylonJS. BabylonJS stores these blob URLs in texture `name`/`url` fields at runtime. On re-save, `AssetCollector` treats these blob URLs as regular external asset URLs, mangles them into invalid filenames, and the subsequent fetch fails silently — resulting in missing texture data in the archive.

The fix introduces a dedicated blob URL pipeline in `AssetCollector` that detects blob URLs during collection, fetches their binary data (still valid during the save session), archives the data with a clean filename derived from the texture name, and rewrites the scene JSON to reference the proper archive path. This mirrors the existing `collectEmbeddedTextures()` pattern for base64 data URIs.

## Glossary

- **Bug_Condition (C)**: A texture's `name` or `url` field contains a blob URL (starts with `blob:`) at the time of scene serialization and save
- **Property (P)**: The blob URL texture's binary data is fetched, archived with a clean filename, and the scene JSON references the correct `assets/` path
- **Preservation**: All non-blob-URL asset handling (relative URLs, absolute HTTP URLs, data URIs, already-archived `assets/` paths) must remain unchanged
- **AssetCollector**: The class in `src/managers/AssetCollector.ts` that scans serialized scene JSON and produces a deduplicated list of asset references
- **SaveManager._getWorldZipBlob()**: The method in `src/managers/SaveManager.ts` that orchestrates scene serialization, asset collection, fetching, and archive creation
- **PathRewriter**: The class in `src/managers/PathRewriter.ts` that rewrites asset URLs in scene JSON to `assets/<archiveFilename>` paths
- **AssetResolver**: The class in `src/managers/AssetResolver.ts` that intercepts BabylonJS file requests during load and serves assets from the archive via blob URLs
- **Blob URL**: A URL of the form `blob:http://localhost:8080/<uuid>` created by `URL.createObjectURL()` — valid only within the creating browsing context session

## Bug Details

### Bug Condition

The bug manifests when a user loads a world from an archive and then re-saves it. During the save, `AssetCollector._scanTextureArray()` and `_scanMaterials()` collect blob URLs as if they were regular external asset URLs. The `_generateFilename()` method then produces mangled filenames (e.g., `blob_http___localhost_8080_<uuid>.png`) that don't correspond to any fetchable resource via the mangled URL, and the original blob URL is not preserved for fetching.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { sceneObj: SerializedScene, textureEntry: TextureObject }
  OUTPUT: boolean

  RETURN (textureEntry.name STARTS_WITH "blob:" OR textureEntry.url STARTS_WITH "blob:")
         AND textureEntry does NOT have base64String field
         AND textureEntry.name does NOT start with "assets/"
END FUNCTION
```

### Examples

- **Example 1**: Texture with `name: "blob:http://localhost:8080/a1b2c3d4-e5f6-..."` → Currently produces `archiveFilename: "blob_http___localhost_8080_a1b2c3d4-e5f6-_.bin"`, fetch of mangled URL fails → Expected: fetch the blob URL, archive as `assets/rp_dennis_posed_004_dif.png` (derived from original texture name stored elsewhere or from the blob URL's content type)
- **Example 2**: Material's diffuseTexture with `name: "blob:http://localhost:8080/..."` → Currently collected as external URL, mangled filename, fetch fails → Expected: detected as blob URL, binary fetched, archived with clean name
- **Example 3**: Texture with `name: "assets/ground.jpg"` (already archived) → Currently skipped correctly → Expected: continues to be skipped (no change)
- **Example 4**: Texture with `name: "textures/sky.jpg"` (relative URL) → Currently collected and fetched normally → Expected: continues to work normally (no change)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Regular relative URL textures (e.g., `textures/ground.jpg`) must continue to be collected, fetched, archived, and resolved normally via the existing `_scanTextureArray` / `_scanMaterials` / `_buildEntries` pipeline
- Data URI textures with `base64String` fields must continue to be handled by the existing `collectEmbeddedTextures()` pipeline
- Absolute HTTP/HTTPS URL textures must continue to be collected and archived normally
- Textures whose `name`/`url` already starts with `assets/` must continue to be skipped during collection
- The `PathRewriter` must continue to rewrite all collected asset entries (including the new blob URL entries) to `assets/<archiveFilename>` paths
- Worlds with no blob URL textures must produce identical save/load behavior as before the fix

**Scope:**
All inputs that do NOT involve blob URLs in texture `name`/`url` fields should be completely unaffected by this fix. This includes:
- Mouse/keyboard interactions during save
- Non-texture scene data (meshes, lights, cameras, materials without blob textures)
- The archive format (TAR + gzip) and structure
- The `AssetResolver` load-time behavior
- The `LoadManager` decompression and extraction logic

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **No blob URL detection in AssetCollector scanning**: `_scanTextureArray()` and `_scanMaterials()` check for `base64String` data URIs and `assets/` prefixes, but have no check for `blob:` prefixed URLs. Blob URLs pass through as regular external URLs.

2. **Filename generation mangles blob URLs**: `_generateFilename()` strips query strings and extracts the last path segment. For a blob URL like `blob:http://localhost:8080/uuid`, the "last segment" is the UUID, and the `blob:http:` prefix gets mangled by the character replacement logic into an invalid filename.

3. **Fetch of mangled URL fails silently**: In `SaveManager._getWorldZipBlob()`, the fetch loop uses `entry.fetchUrl` (which for blob URLs would be the resolved URL from `_resolveUrl()`). Since `_resolveUrl()` tries `new URL(blobUrl, baseUrl)` which may produce an invalid URL, or the fetch of the original blob URL might work but the `archiveFilename` is still mangled — either way the data is lost or misnamed.

4. **The actual blob URL IS still fetchable**: The blob URLs created by `AssetResolver` during load remain valid until `AssetResolver.deactivate()` is called (which happens after save completes, or not at all if the user saves without reloading). A simple `fetch(blobUrl)` would return the binary data successfully.

## Correctness Properties

Property 1: Bug Condition - Blob URL Textures Are Archived With Valid Data

_For any_ serialized scene containing textures whose `name` or `url` field starts with `blob:`, the fixed save pipeline SHALL fetch the binary data from the blob URL, include it in the archive under a clean filename (derived from the texture name, without blob URL artifacts), and rewrite the texture's `name`/`url` in the scene JSON to reference `assets/<cleanFilename>`.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Non-Blob-URL Asset Handling Unchanged

_For any_ serialized scene containing textures whose `name`/`url` fields are NOT blob URLs (regular relative paths, absolute HTTP URLs, data URIs, or already-archived `assets/` paths), the fixed save pipeline SHALL produce exactly the same `AssetEntry[]` results, the same archive filenames, and the same scene JSON rewrites as the original unfixed code.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/managers/AssetCollector.ts`

**Functions**: `_scanTextureArray`, `_scanMaterials`, `collect` (and new method)

**Specific Changes**:

1. **Add blob URL detection helper**: Create a private `_isBlobUrl(url: string): boolean` method that returns `true` if the URL starts with `blob:`.

2. **Skip blob URLs in `_scanTextureArray()`**: Before adding a texture's `name`/`url` to the `urls` set, check if it's a blob URL. If so, skip it (don't add to the regular external URL set).

3. **Skip blob URLs in `_scanMaterials()`**: Same check — skip blob URLs from the regular collection pipeline.

4. **Add `collectBlobTextures()` method**: New public method that scans the scene for textures with blob URLs and returns a `BlobTextureEntry[]` (new interface) containing:
   - `blobUrl`: the original blob URL
   - `archiveFilename`: a clean filename derived from the texture name (stripping `blob:` prefix, extracting meaningful name)
   - `textureObj`: reference to the texture object for later path rewriting

5. **Add `BlobTextureEntry` interface**: New exported interface with fields: `blobUrl`, `archiveFilename`, `textureObj`.

---

**File**: `src/managers/SaveManager.ts`

**Function**: `_getWorldZipBlob()`

**Specific Changes**:

1. **Collect blob textures**: After `collectEmbeddedTextures()` and `stripEmbeddedTextures()`, call `assetCollector.collectBlobTextures(sceneObj)` to get the list of blob URL textures.

2. **Fetch blob texture data**: For each `BlobTextureEntry`, fetch the blob URL to get the binary data. This is similar to the existing external asset fetch loop but specifically for blob URLs.

3. **Rewrite blob texture paths**: After fetching, update each texture object's `name` and `url` fields to `assets/<archiveFilename>` (similar to `stripEmbeddedTextures()`).

4. **Add blob texture files to archive**: Add the fetched binary data to the `archiveFiles` array with the proper `assets/` prefix.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write unit tests that create scene objects with blob URLs in texture `name`/`url` fields, pass them through `AssetCollector.collect()`, and observe the resulting `AssetEntry[]`. Run these tests on the UNFIXED code to observe that blob URLs produce mangled filenames and invalid fetch URLs.

**Test Cases**:
1. **Blob URL in texture name**: Create a scene with `textures: [{ name: "blob:http://localhost:8080/uuid" }]` and call `collect()` — observe mangled filename (will fail on unfixed code)
2. **Blob URL in material texture**: Create a scene with a material containing a diffuseTexture with a blob URL name — observe it's collected as a regular URL (will fail on unfixed code)
3. **Multiple blob URL textures**: Create a scene with several blob URL textures — observe all produce mangled filenames (will fail on unfixed code)
4. **Mixed blob and regular URLs**: Create a scene with both blob URLs and regular URLs — observe blob URLs contaminate the collection (will fail on unfixed code)

**Expected Counterexamples**:
- `AssetCollector.collect()` returns entries with `archiveFilename` containing `blob_http___` prefixes
- `fetchUrl` for blob entries is either the raw blob URL or a mangled resolved URL
- Possible causes: no blob URL detection in `_scanTextureArray`, no blob URL detection in `_scanMaterials`

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  blobEntries := assetCollector.collectBlobTextures(input.sceneObj)
  ASSERT blobEntries.length > 0
  FOR EACH entry IN blobEntries DO
    ASSERT NOT entry.archiveFilename CONTAINS "blob"
    ASSERT NOT entry.archiveFilename CONTAINS "http"
    ASSERT entry.archiveFilename IS valid_filename
    ASSERT entry.blobUrl STARTS_WITH "blob:"
  END FOR
  
  // After rewriting
  regularEntries := assetCollector.collect(input.sceneObj, baseUrl)
  ASSERT NO entry IN regularEntries WHERE entry.originalUrl STARTS_WITH "blob:"
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT assetCollector_original.collect(input.sceneObj, baseUrl)
       = assetCollector_fixed.collect(input.sceneObj, baseUrl)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (random scene structures with various URL types)
- It catches edge cases that manual unit tests might miss (unusual URL patterns, empty strings, special characters)
- It provides strong guarantees that behavior is unchanged for all non-blob-URL inputs

**Test Plan**: Observe behavior on UNFIXED code first for scenes without blob URLs, then write property-based tests capturing that behavior. Generate random scene objects with various non-blob URL patterns and verify the fixed `collect()` produces identical results.

**Test Cases**:
1. **Relative URL preservation**: Generate random relative URL textures, verify `collect()` output is identical before and after fix
2. **Absolute URL preservation**: Generate random absolute HTTP/HTTPS URL textures, verify identical handling
3. **Data URI preservation**: Generate scenes with `base64String` textures, verify `collectEmbeddedTextures()` is unchanged
4. **Assets-prefix skip preservation**: Generate scenes with `assets/` prefixed URLs, verify they continue to be skipped

### Unit Tests

- Test `_isBlobUrl()` helper with various URL formats (blob:, http:, https:, data:, relative paths)
- Test `collectBlobTextures()` returns correct entries for scenes with blob URL textures
- Test `collectBlobTextures()` returns empty array for scenes without blob URL textures
- Test that `collect()` no longer includes blob URLs in its results
- Test clean filename generation from blob URL textures (extracting meaningful names)
- Test deduplication of blob texture filenames

### Property-Based Tests

- Generate random scene objects with non-blob URLs and verify `collect()` output matches the original implementation (preservation)
- Generate random scene objects with blob URLs and verify `collectBlobTextures()` produces valid, non-mangled filenames
- Generate random mixtures of blob and non-blob URLs and verify correct separation between the two pipelines
- Generate random texture names and verify clean filename derivation produces valid filesystem-safe names

### Integration Tests

- Test full `_getWorldZipBlob()` flow with a scene containing blob URL textures (mock fetch)
- Test that the archive contains the correct binary data for blob URL textures
- Test that the scene JSON in the archive references `assets/<cleanFilename>` instead of blob URLs
- Test round-trip: save a scene with blob URLs → verify archive → load archive → verify textures resolve correctly
