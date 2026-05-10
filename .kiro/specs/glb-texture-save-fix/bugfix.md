# Bugfix Requirements Document

## Introduction

The standalone world archive save pipeline was correctly saving GLB-imported textures as separate files in the tar archive and loading them back via blob URLs. A subsequent "precision reduction" change to `SaveManager._getWorldZipBlob()` inadvertently reverted the asset pipeline integration. The current code serializes the scene and creates a TAR with only `Vishva.json` + `Scene.babylon` — no asset collection, no embedded texture extraction, no path rewriting, and no texture files bundled in the archive. This causes textures from GLB imports to be missing from saved archives and produces 404 errors when loading those archives.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a world containing GLB-imported textures is saved THEN the system produces a TAR archive that contains only `Vishva.json` and `Scene.babylon` without any files in the `assets/` folder

1.2 WHEN a world containing GLB-imported textures is saved THEN the system leaves base64String data URIs embedded in `Scene.babylon` instead of extracting them to separate asset files

1.3 WHEN a world is saved and loaded on a different server THEN textures that were originally loaded from the previous server (e.g., curated assets) fail to render because they were never bundled in the archive and their server-relative paths are not portable

1.4 WHEN GLB assets are drag-and-dropped into the scene and saved THEN the system embeds their textures as base64String data URIs directly in Scene.babylon, which bloats the file size significantly but does allow them to load on a different server

1.5 WHEN the precision reduction (`_stringifyWithPrecision`) is applied to the scene JSON THEN the system applies it without the asset pipeline having processed embedded textures first, preserving the bloated base64String fields in the output

### Expected Behavior (Correct)

2.1 WHEN a world containing GLB-imported textures is saved THEN the system SHALL extract embedded textures (base64String fields) from the serialized scene, decode them, and include them as separate files under the `assets/` prefix in the TAR archive

2.2 WHEN a world containing GLB-imported textures is saved THEN the system SHALL remove base64String fields from the scene JSON and rewrite texture name/url fields to point to `assets/<filename>` paths

2.3 WHEN a world containing any external asset references (server-loaded textures, curated assets) is saved THEN the system SHALL collect all asset URLs from the serialized scene, rewrite paths to archive-relative `assets/<filename>` format, fetch binary data for non-embedded assets, and bundle them in the TAR archive

2.4 WHEN a saved archive is loaded on a different server or offline THEN the system SHALL render all textures correctly because they are bundled in the archive and served via the AssetResolver

2.5 WHEN the precision reduction is applied THEN the system SHALL apply it AFTER the asset pipeline has processed the scene (after embedded texture extraction, path rewriting, and asset collection are complete)

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a world with no GLB-imported textures and no external assets is saved THEN the system SHALL CONTINUE TO produce a valid TAR archive containing `Vishva.json` and `Scene.babylon`

3.2 WHEN floating point numbers are serialized in the scene JSON THEN the system SHALL CONTINUE TO round them to 4 decimal places for file size reduction

3.3 WHEN a legacy archive (without an `assets/` folder) is loaded THEN the system SHALL CONTINUE TO load it successfully using server-fetch behavior

3.4 WHEN saving to IndexedDB THEN the system SHALL CONTINUE TO use the same pipeline as file download saves (both paths produce identical archive content)

3.5 WHEN a single mesh asset is saved via `saveAsset()` THEN the system SHALL CONTINUE TO apply precision reduction to the mesh JSON output
