# GLB Texture Save Pipeline — Investigation Notes

## Problem Statement

When a GLB file is drag-and-dropped into an empty Vishva world and the user saves, the asset pipeline fails to include the GLB's textures in the archive. The textures exist only in GPU memory and cannot be fetched from the server (404 errors).

## Context

The standalone-world-archive spec (`.kiro/specs/standalone-world-archive/`) defines a pipeline that:
1. Serializes the scene
2. Collects asset URLs from the serialized JSON (AssetCollector)
3. Rewrites paths to `assets/<filename>` (PathRewriter)
4. Fetches asset binary data from the server
5. Bundles everything into a TAR/gzip archive

This pipeline works for assets that exist on the server (curated assets, previously loaded worlds). It breaks for GLB-imported textures because those textures were embedded in the GLB binary and never existed as separate files on the server.

## Root Cause Analysis

### How BabylonJS handles GLB textures

When a GLB is loaded via `SceneLoader.ImportMesh`:
1. BabylonJS extracts embedded textures from the GLB binary
2. Textures are uploaded to the GPU
3. The texture's `name` property is set to something like `Fringe (Base Color)` (no extension, no path)
4. The texture's `_buffer` may be released after GPU upload (implementation-dependent)
5. The texture's `url` is NOT a fetchable server path

### What happens during serialization

When `SceneSerializer.Serialize()` is called:
- `Texture.ForceSerializeBuffers = false`: Textures without `_buffer` or data URI `url` get serialized with just their `name` field — no `base64String` is included
- `Texture.ForceSerializeBuffers = true`: BabylonJS checks if `this._buffer` is a data URI string OR if `this.url` starts with "data:" AND `_buffer` is a Uint8Array. For GLB textures where the buffer was released, NEITHER condition is met, so no base64String is serialized even with the flag set to true.

### BabylonJS source (from `babylon.max.js`):
```javascript
if(t.SerializeBuffers || t.ForceSerializeBuffers)
  if("string" == typeof this._buffer && this._buffer.startsWith("data:"))
    o.base64String = this._buffer
  else if(this.url && this.url.startsWith("data:") && this._buffer instanceof Uint8Array)
    // encode as base64...
```

### The naming mismatch problem

Even when texture data IS successfully captured from GPU, there's a naming mismatch:
- BabylonJS texture `name` property: `Fringe (Base Color)` (no extension)
- After `collectEmbeddedTextures` + `stripEmbeddedTextures`: textures get rewritten to `assets/Fringe (Base Color).webp`
- The `collect()` method then finds `assets/Fringe (Base Color).webp` as the `originalUrl`
- The pre-captured cache is keyed by `Fringe (Base Color)` (the BabylonJS name)
- Lookup fails because `assets/Fringe (Base Color).webp` ≠ `Fringe (Base Color)`

## Approaches Tried

### Approach 1: Set `ForceSerializeBuffers = true`
**Result: Failed**
- BabylonJS only serializes buffers if `_buffer` is a data URI string or `url` starts with "data:" with a Uint8Array buffer
- For GLB textures where the buffer was released after GPU upload, neither condition is met
- No `base64String` gets serialized, so `collectEmbeddedTextures` finds nothing

### Approach 2: GPU readback via `texture.readPixels()`
**Result: Partially failed**
- WebGL errors: `GL_INVALID_OPERATION: glFramebufferTexture2D: Invalid or unsupported texture target`
- `GL_INVALID_FRAMEBUFFER_OPERATION: glReadPixelsRobustANGLE: Framebuffer is incomplete`
- These errors indicate the textures use compressed formats (like ASTC, ETC2, or BC) that can't be read back directly via `readPixels()`
- The `readPixels()` call returns null or empty data for these textures

### Approach 3: Access `internalTexture._bufferView`
**Result: Partially successful**
- Strategy: check `texture.getInternalTexture()._bufferView` for the original binary data
- This DID capture 24 textures successfully (confirmed via debug log)
- But the naming mismatch (see above) prevented the fallback from being used during fetch

### Approach 4: Name matching with prefix/extension stripping
**Result: Failed**
- Tried stripping `assets/` prefix and file extension from `originalUrl` to match cache keys
- Still didn't match — likely because the `originalUrl` at fetch time has already been through the rewrite step, or there's an additional transformation happening

## Key Findings

1. **The texture data IS accessible** — `_bufferView` on the internal texture captured 24 textures successfully
2. **The problem is purely a naming/lookup mismatch** — the cache is keyed by BabylonJS's `texture.name` but the lookup uses the `originalUrl` from the asset collector which has been transformed
3. **The `runtime.lastError` message is a Chrome extension issue** — unrelated to the code
4. **The GL errors during readPixels are for compressed textures** — but `_bufferView` works as an alternative

## Recommended Next Steps

### Option A: Fix the naming mismatch (most promising)

The capture works. The issue is matching captured names to asset entries. To fix:

1. During `_captureTextureData()`, also store textures by variations of their name:
   - `texture.name` → e.g., `Fringe (Base Color)`
   - `texture.name + extension` → e.g., `Fringe (Base Color).webp`
   - `assets/ + texture.name + extension` → e.g., `assets/Fringe (Base Color).webp`

2. OR: Build the lookup map AFTER asset collection, using the `originalUrl` from each AssetEntry as the key, and matching it back to scene textures by comparing basenames.

3. OR: Change the pipeline order — capture texture data AFTER serialization and asset collection, using the `originalUrl` values as keys directly by finding the corresponding texture in the scene.

### Option B: Capture at load time

Instead of capturing at save time, intercept texture data when the GLB is first loaded:
- Override the GLB loader's texture creation to store the original binary data
- Keep a persistent `Map<string, Uint8Array>` on the Vishva instance
- Use this map during save

This is more invasive but avoids all timing/naming issues since you capture the data at the moment it's available.

### Option C: Use `SceneSerializer.SerializeAsync`

BabylonJS has an async serializer that might handle texture buffer readback differently. Worth investigating if it produces `base64String` for GLB textures.

## Current State (as of revert)

- SaveManager has only the **precision reduction** change (4 decimal places)
- No asset pipeline integration in SaveManager
- All pipeline files exist and pass tests: AssetCollector.ts, PathRewriter.ts, AssetResolver.ts, TarUtils.ts
- LoadManager has the pipeline integration (loads archives with bundled assets correctly)
- The pipeline worked in a previous session — the exact conditions that made it work then are unclear (possibly the GLB textures still had `_buffer` available at that time)

## Files Involved

- `src/managers/SaveManager.ts` — needs pipeline integration
- `src/managers/AssetCollector.ts` — collects asset URLs from serialized scene
- `src/managers/PathRewriter.ts` — rewrites URLs to archive-relative paths
- `src/managers/AssetResolver.ts` — serves assets from archive during load
- `src/managers/TarUtils.ts` — TAR archive creation/extraction
- `src/managers/LoadManager.ts` — already has pipeline integration for loading
- `.kiro/specs/standalone-world-archive/` — full spec with design and tasks
