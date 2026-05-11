# Bugfix Requirements Document

## Introduction

When a world is loaded from an archive (via upload or from browser storage), the `AssetResolver` serves bundled textures to BabylonJS via temporary blob URLs. BabylonJS then stores these blob URLs as the texture's `name`/`url` fields in its runtime objects. When the user subsequently re-saves the world (via download or to browser storage), `_getWorldZipBlob()` re-serializes the scene from scratch. The `AssetCollector` picks up the blob URLs as if they were regular asset URLs, `_generateFilename()` mangles them into invalid filenames (e.g., `blob_http___localhost_8080_rp_dennis_posed_004_dif.png`), and the fetch for the mangled URL fails silently. The result is an archive where the scene JSON references `assets/blob_http___localhost_8080_...png` but no actual texture binary data exists for those entries. On the next load, these references produce 404 errors.

This is a **re-save problem**: the original texture data from the first archive is lost because the save pipeline doesn't recognize blob URLs as already-archived assets that need their data preserved.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a world is loaded from an archive, `AssetResolver` creates blob URLs to serve bundled textures to BabylonJS, and BabylonJS stores these blob URLs in the texture's `name`/`url` fields at runtime

1.2 WHEN the user re-saves the world, `AssetCollector._scanTextureArray()` and `_scanMaterials()` collect these blob URLs as regular external asset URLs

1.3 WHEN a blob URL is passed to `AssetCollector._generateFilename()` THEN the system produces a mangled filename (e.g., `blob_http___localhost_8080_rp_dennis_posed_004_dif.png`) that does not correspond to any fetchable resource

1.4 WHEN `SaveManager` attempts to fetch the mangled blob-derived URL THEN the fetch fails silently (logged as a warning) and no texture data is included in the archive

1.5 WHEN the re-saved world is loaded, the scene JSON references mangled `assets/` paths that have no corresponding data in the archive, resulting in 404 errors and missing textures

### Expected Behavior (Correct)

2.1 WHEN a texture has a blob URL in its `name` or `url` field THEN the system SHALL skip it during external asset URL collection in `AssetCollector._scanTextureArray()` and `_scanMaterials()`

2.2 WHEN a texture has a blob URL THEN the system SHALL fetch the actual texture binary data from the blob URL (which is still valid during the save session) and include it as an embedded asset in the archive with a clean filename derived from the texture name

2.3 WHEN a blob URL texture's data is fetched and archived THEN the system SHALL rewrite the texture's `name` and `url` fields in the scene JSON to point to the archived asset path (e.g., `assets/rp_dennis_posed_004_dif.png`)

2.4 WHEN the re-saved world is loaded THEN the system SHALL resolve the archived blob-texture assets via `AssetResolver` using their proper archive filenames, and textures SHALL display correctly

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a texture has a regular relative URL (e.g., `textures/ground.jpg`) THEN the system SHALL CONTINUE TO collect, fetch, archive, and resolve it normally

3.2 WHEN a texture has a data URI (`data:image/png;base64,...`) in its `base64String` field THEN the system SHALL CONTINUE TO handle it via the existing `collectEmbeddedTextures()` pipeline

3.3 WHEN a texture has an absolute HTTP/HTTPS URL (e.g., `http://example.com/texture.png`) THEN the system SHALL CONTINUE TO collect and archive it normally

3.4 WHEN a texture's URL already starts with `assets/` (previously archived) THEN the system SHALL CONTINUE TO skip it during collection

3.5 WHEN a world with no blob URL textures is saved and loaded THEN the system SHALL CONTINUE TO produce identical save/load behavior as before the fix
