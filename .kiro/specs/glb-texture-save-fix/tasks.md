# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Asset Pipeline Missing From Save
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists — the save pipeline does not bundle assets
  - **Scoped PBT Approach**: Generate serialized scene objects that satisfy `isBugCondition` (contain embedded textures with base64String fields OR external asset URLs). Test that the archive produced by the current `_getWorldZipBlob()` logic contains asset files under `assets/` prefix and that Scene.babylon has no remaining base64String fields.
  - **Test file**: `src/managers/SaveManager.property.test.ts`
  - **Generator**: Create scenes with random embedded textures (materials with `base64String: "data:image/webp;base64,..."`) and/or external texture URLs. Use fast-check to generate varying numbers of textures and asset references.
  - **Assertions** (expected behavior from design):
    - Archive MUST contain `assets/<archiveFilename>` entries for each embedded texture
    - Archive MUST contain `assets/<archiveFilename>` entries for each external asset
    - `Scene.babylon` in the archive MUST NOT contain any `base64String` fields
    - All texture name/url fields in `Scene.babylon` MUST start with `assets/`
  - **Testing approach**: Extract the core pipeline logic into a testable function that takes a serialized scene object and returns the archive file list. This avoids needing to mock the full Vishva/BabylonJS runtime.
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists: no pipeline is called, so no assets are bundled)
  - Document counterexamples found to understand root cause
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Asset Worlds Produce Unchanged Output
  - **IMPORTANT**: Follow observation-first methodology
  - **Test file**: `src/managers/SaveManager.property.test.ts`
  - **Observation**: On unfixed code, scenes with no embedded textures and no external asset URLs produce a TAR archive containing only `Vishva.json` and `Scene.babylon` with precision-reduced numeric values
  - **Generator**: Generate random serialized scene objects that do NOT satisfy `isBugCondition` — scenes with only primitive meshes, no textures array, no materials with base64String, no external URLs. Include random floating point values to verify precision reduction.
  - **Assertions** (from Preservation Requirements in design):
    - Archive contains exactly 2 files: `Vishva.json` and `Scene.babylon`
    - No `assets/` entries exist in the archive
    - Floating point numbers in Scene.babylon are rounded to 4 decimal places
    - Archive is a valid TAR structure (correct headers, padding)
  - Verify test passes on UNFIXED code (confirms baseline behavior to preserve)
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.4_

- [x] 3. Implement the asset pipeline integration in SaveManager._getWorldZipBlob()

  - [x] 3.1 Add imports and instantiate pipeline components
    - Add `import { AssetCollector, AssetEntry, EmbeddedTextureEntry } from "./AssetCollector.js";` to SaveManager.ts
    - Add `import { PathRewriter } from "./PathRewriter.js";` to SaveManager.ts
    - Instantiate `const assetCollector = new AssetCollector();` and `const pathRewriter = new PathRewriter();` at the start of `_getWorldZipBlob()`
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.2 Integrate embedded texture extraction after serialization
    - After `SceneSerializer.Serialize()` and cleanup (`removeSounds`, `removeActuatorTextBarMat`), call `assetCollector.collectEmbeddedTextures(sceneObj)` to find and decode all base64String textures
    - Call `assetCollector.stripEmbeddedTextures(embeddedEntries)` to remove base64String fields and rewrite name/url to `assets/<filename>`
    - _Bug_Condition: isBugCondition(input) where hasEmbeddedTextures(sceneObj) is true_
    - _Expected_Behavior: embedded textures extracted, base64String removed, paths rewritten to assets/<filename>_
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Integrate external asset collection and path rewriting
    - Call `assetCollector.collect(sceneObj, baseUrl)` to find remaining external asset URLs (uses `window.location.href` as baseUrl)
    - Call `pathRewriter.rewrite(sceneObj, externalEntries)` to rewrite all external URLs to `assets/<archiveFilename>`
    - Note: `collect()` already skips textures with base64String, so stripped textures won't be re-collected
    - _Bug_Condition: isBugCondition(input) where hasExternalAssetUrls(sceneObj) is true_
    - _Expected_Behavior: external URLs collected, paths rewritten to assets/<archiveFilename>_
    - _Requirements: 2.3_

  - [x] 3.4 Fetch external asset binary data with error handling
    - For each external asset entry without `decodedData`, fetch binary from `entry.fetchUrl`
    - Use try/catch per fetch — log warning and skip on failure (don't fail entire save)
    - Collect successful fetches as `{ filename: "assets/" + entry.archiveFilename, data: Uint8Array }`
    - _Expected_Behavior: binary data fetched for all reachable external assets_
    - _Preservation: fetch failures are logged but don't abort the save_
    - _Requirements: 2.3_

  - [x] 3.5 Build archive file list with all assets
    - Combine embedded texture files (`embeddedEntries.map(e => { filename: "assets/" + e.archiveFilename, data: e.decodedData })`)
    - Add fetched external asset files
    - Add data URI assets from external entries that have `decodedData`
    - Include `Vishva.json` and `Scene.babylon` (with precision reduction applied AFTER pipeline)
    - _Expected_Behavior: archive contains all asset files under assets/ prefix plus Vishva.json and Scene.babylon_
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [x] 3.6 Move _stringifyWithPrecision() to AFTER pipeline completion
    - Move the `_stringifyWithPrecision(sceneObj)` call to AFTER embedded texture extraction, stripping, external collection, and path rewriting are complete
    - This prevents precision reduction from corrupting base64 data or interfering with URL matching
    - `_stringifyWithPrecision(vishvaSerialzed)` can remain where it is (Vishva.json is not processed by asset pipeline)
    - _Bug_Condition: precision reduction applied before pipeline corrupts base64/URLs_
    - _Expected_Behavior: precision reduction applied only after all asset processing is complete_
    - _Preservation: floating point values still rounded to 4 decimal places in final output_
    - _Requirements: 2.5, 3.2_

  - [x] 3.7 Update progress reporting
    - Add progress stages: "Collecting assets..." (~55%), "Fetching assets..." (~65%), "Building archive..." (~80%)
    - Adjust existing progress percentages to accommodate new stages
    - _Requirements: 2.1_

  - [x] 3.8 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Asset Pipeline Produces Bundled Archive
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.9 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Asset Worlds Produce Unchanged Output
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Run `npx vitest --run` to execute all tests in the project
  - Verify existing tests pass: AssetCollector.test.ts, AssetCollector.property.test.ts, PathRewriter.test.ts, PathRewriter.property.test.ts, AssetResolver.test.ts, AssetResolver.property.test.ts, AssetPresenceDetection.property.test.ts, TarRoundTrip.property.test.ts
  - Verify new SaveManager.property.test.ts passes (both Property 1 and Property 2)
  - Ensure no regressions in any existing functionality
  - Ask the user if questions arise
