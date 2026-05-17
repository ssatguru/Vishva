# IndexedDB Asset Storage & Structured Paths — Discussion Notes

**Date:** May 11, 2026  
**Status:** Future work — not yet specced

---

## Problem Statement

When a world is loaded, the `.tar.gz` is fetched, decompressed, and all assets are held in a `Map<string, Uint8Array>` in memory for the entire session. This can consume significant memory for large worlds (50MB+ of textures/models).

Additionally, assets are stored in a flat `assets/` folder structure in the archive, which can cause filename collisions and makes debugging harder.

---

## Idea 1: IndexedDB-Based Asset Storage

Instead of holding all decompressed assets in memory, decompress the tar and store each asset in browser IndexedDB, then serve assets on-demand from there.

### Current Flow
1. Fetch `.tar.gz` → decompress → full tar as `Uint8Array`
2. `extractTarArchive` parses tar → `Map<string, Uint8Array>` (all assets in JS heap)
3. Asset map persists for entire session (`vishva._loadedAssetMap`) because `SaveManager` needs it for re-save
4. `AssetResolver` creates Blob URLs from the map on demand (momentary duplication)
5. Peak memory: **all assets in Map + Blob copies of actively-loading assets**

### Proposed Flow
1. Fetch `.tar.gz` → decompress → extract tar
2. Store each asset individually in IndexedDB (keyed by path)
3. On asset request, read from IndexedDB → create Blob URL → serve to BabylonJS
4. Only actively-loading assets consume JS heap memory

### Trade-offs

| Aspect | Current (in-memory) | IndexedDB |
|--------|---------------------|-----------|
| Peak heap usage | All assets in RAM simultaneously | Only assets actively being loaded |
| Initial load time | Fast (already in memory) | Slightly slower per-asset (~1-5ms IDB read) |
| Complexity | Simple | More complex (async reads, transaction management) |
| Re-save support | Easy (map is right there) | Need to read back from IDB or track stored keys |
| Browser storage limits | N/A | Typically 50%+ of disk, but user can clear it |

### Where It Helps Most
- Large worlds (>20MB of assets)
- Worlds with many assets where only a subset is visible at any time

### Where It Might Not Help
- Small worlds where IDB transaction overhead outweighs memory savings
- Initial scene load that requests many assets simultaneously

### Recommendation
A **hybrid approach**: decompress tar into IndexedDB on first load, then serve assets from IDB on demand with a small LRU cache in memory for hot assets.

---

## Idea 2: Preserve Server Folder Structure in Archive

Instead of flattening all assets into `assets/<filename>`, preserve the relative path structure: `assets/audio/footstep.ogg`, `assets/textures/ground.jpg`, etc.

### Current Behavior
- `AssetCollector._generateFilename` strips paths, keeps only basename
- `vishva/assets/audio/footstep.ogg` → `assets/footstep.ogg` in archive
- Collisions handled by disambiguation suffixes (`brick.jpg`, `brick_1.jpg`)

### Proposed Behavior
- Preserve relative path segments: `assets/audio/footstep.ogg`, `assets/textures/brick.jpg`
- No more collision disambiguation needed for same-named files in different directories

### Advantages
1. **No filename collisions** — paths are naturally distinct
2. **Easier debugging** — archive structure mirrors server
3. **Simpler AssetResolver matching** — match full relative path, no ambiguity
4. **Better IndexedDB organization** — structured keys enable category-based queries
5. **Simpler path rewriting** — strip server base URL, keep relative path as-is

### Potential Issues
1. **Backward compatibility** — existing archives use flat structure; loader must handle both
2. **TAR path length** — basic TAR header has 100-byte filename limit; deep paths may need UStar long-name support
3. **Path normalization** — need consistent forward slashes and decoded URI components

---

## Implementation Notes

### Key Files to Modify
- `src/managers/AssetCollector.ts` — `_generateFilename` to preserve path segments
- `src/managers/AssetResolver.ts` — match on relative paths instead of basenames
- `src/managers/LoadManager.ts` — add IndexedDB storage after extraction, backward-compat for flat archives
- `src/managers/TarUtils.ts` — possibly extend for longer path names
- `src/managers/SaveManager.ts` — read assets from IndexedDB for re-save

### The Two Changes Complement Each Other
Structured keys in IndexedDB + structured paths in the archive make the whole system more predictable and debuggable.

---

## Next Steps
- Spec this out as a feature when ready to implement
- Consider whether to do IndexedDB and structured paths together or separately
- Prototype IDB read latency with realistic asset counts to validate the hybrid cache approach
