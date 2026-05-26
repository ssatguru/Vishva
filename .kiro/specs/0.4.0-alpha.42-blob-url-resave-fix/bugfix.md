# Bugfix Requirements Document

## Introduction

When a world is saved to IndexedDB, loaded, and then re-saved, SNA actuator asset references (like `htmlFile.value` in ActuatorDialog) are serialized as blob URLs instead of their original asset paths. This causes the assets to be unfindable on subsequent loads, breaking actuator functionality after a save-load-save cycle.

The root cause is that `AssetResolver.resolveAssetPaths()` mutates the live `VishvaSerialized` object in-place, replacing `"vishva/assets/..."` paths with blob URLs for runtime use. When the world is subsequently saved, `SNAManager.serializeSnAs()` captures these blob URLs verbatim because the original path information has been destroyed. The `AssetCollector` correctly rejects blob URLs (they aren't server-fetchable), so the blob URL is serialized as-is into Vishva.json, rendering the asset reference broken on the next load.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a world containing SNA actuator asset references (e.g., `ActDialogParm.htmlFile.value = "vishva/assets/html/introScreen.html"`) is saved to IndexedDB, loaded, and then saved again THEN the system serializes the asset reference as a blob URL (e.g., `"blob:http://localhost:8080/9ff8355a-..."`) instead of the original asset path

1.2 WHEN a world with blob URL asset references in Vishva.json is loaded THEN the system cannot resolve the asset because the blob URL from the previous session is no longer valid, causing the actuator to fail silently (e.g., the Dialog actuator cannot fetch the HTML file)

1.3 WHEN the world is downloaded as a zip/tar archive after a load cycle THEN the `_getWorldZipBlob` path also serializes blob URLs in VishvaSerialized, producing a broken portable archive

### Expected Behavior (Correct)

2.1 WHEN a world containing SNA actuator asset references is saved to IndexedDB after a load cycle THEN the system SHALL serialize the original asset path (e.g., `"vishva/assets/html/introScreen.html"`) regardless of how many save-load cycles have occurred

2.2 WHEN a world is loaded from IndexedDB and the SNA properties contain `"vishva/assets/..."` paths THEN the system SHALL resolve those paths to blob URLs for runtime use while preserving the ability to recover the original path at save time

2.3 WHEN the world is downloaded as a zip/tar archive after a load cycle THEN the system SHALL serialize original asset paths in VishvaSerialized, not blob URLs

2.4 WHEN a world is saved to IndexedDB after a load cycle THEN the system SHALL include the binary data of all assets referenced by VishvaSerialized (e.g., HTML files, sound files) in the saved entries, sourcing the data from the session store or the active blob URL — the system SHALL NOT rely on the server since the asset may be a user-uploaded file or the original server file may have been deleted or moved

2.5 WHEN a world is downloaded as a zip/tar archive after a load cycle THEN the system SHALL include the binary data of all assets referenced by VishvaSerialized in the archive file, sourcing from the session store or active blob URL — the archive SHALL be fully self-contained since the server cannot be assumed to still have the original asset

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `AssetResolver.resolveAssetPaths()` resolves asset paths to blob URLs at load time THEN the system SHALL CONTINUE TO provide working blob URLs to actuators for runtime use (e.g., XHR requests to fetch HTML content succeed)

3.2 WHEN `AssetCollector.collectServerAssets()` scans VishvaSerialized for server asset paths THEN the system SHALL CONTINUE TO correctly identify and collect paths prefixed with `"vishva/"` that have file extensions

3.3 WHEN a world is saved for the first time (no prior load from IndexedDB) THEN the system SHALL CONTINUE TO serialize the original asset paths directly without any reverse-mapping step

3.4 WHEN scene textures are resolved via `Tools.PreprocessUrl` and `Tools.LoadFile` overrides THEN the system SHALL CONTINUE TO intercept and serve assets from the AssetStore via blob URLs as before

3.5 WHEN `AssetResolver.deactivate()` is called after scene loading completes THEN the system SHALL CONTINUE TO revoke blob URLs and restore original BabylonJS tool functions

3.6 WHEN Scene.babylon is serialized after a load cycle THEN the system SHALL CONTINUE TO serialize original asset paths (e.g., `"vishva/assets/textures/wood.jpg"`) in texture `name` and `url` fields, not blob URLs — the `Tools.PreprocessUrl` and `Tools.LoadFile` overrides intercept at fetch time only and SHALL NOT modify the stored texture object properties
