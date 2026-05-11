# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Blob URLs Produce Mangled Filenames in AssetCollector
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate blob URLs are incorrectly collected and mangled
  - **Scoped PBT Approach**: Scope the property to scenes containing textures with blob URL `name`/`url` fields (e.g., `blob:http://localhost:8080/<uuid>`)
  - Test file: `src/managers/AssetCollector.blobfix.property.test.ts`
  - Bug Condition from design: `isBugCondition(input)` returns true when `textureEntry.name STARTS_WITH "blob:" OR textureEntry.url STARTS_WITH "blob:"` AND no `base64String` field AND name does not start with `assets/`
  - Generate scenes with blob URL textures using fast-check arbitraries (random UUIDs, various blob URL formats)
  - Assert expected behavior: `AssetCollector.collect()` should NOT return any entries where `originalUrl` starts with `blob:`
  - Assert expected behavior: A separate `collectBlobTextures()` method should return entries with clean `archiveFilename` values (no `blob`, no `http`, no `localhost` in filename)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS because `collect()` currently includes blob URLs and produces mangled filenames like `blob_http___localhost_8080_<uuid>.bin`
  - Document counterexamples found (e.g., "collect() returns entry with archiveFilename containing 'blob_http___'")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.2, 1.3, 2.1_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Blob-URL Asset Collection Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Test file: `src/managers/AssetCollector.blobfix.property.test.ts`
  - Observe: `collect()` on unfixed code with relative URL textures (e.g., `textures/ground.jpg`) returns entries with correct `archiveFilename` and `fetchUrl`
  - Observe: `collect()` on unfixed code with absolute HTTP URL textures (e.g., `http://example.com/tex.png`) returns entries with correct handling
  - Observe: `collect()` on unfixed code with `assets/`-prefixed textures skips them correctly
  - Observe: `collectEmbeddedTextures()` on unfixed code with `base64String` textures returns correct embedded entries
  - Write property-based test: for all scenes where NO texture `name`/`url` starts with `blob:`, the output of `collect(sceneObj, baseUrl)` must be identical before and after the fix
  - Generate random scene objects using fast-check with various non-blob URL patterns: relative paths, absolute HTTP/HTTPS URLs, `assets/`-prefixed paths, data URIs
  - Assert: `collect()` returns the same `AssetEntry[]` (same `originalUrl`, `fetchUrl`, `archiveFilename`) for all non-blob inputs
  - Assert: `collectEmbeddedTextures()` returns the same `EmbeddedTextureEntry[]` for scenes with `base64String` textures
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for blob URL textures leaking into scene serialization

  - [x] 3.1 Add `_isBlobUrl()` helper and skip blob URLs in scanning methods
    - Add private `_isBlobUrl(url: string): boolean` method to `AssetCollector` that returns `true` if URL starts with `blob:`
    - In `_scanTextureArray()`: before adding `tex.name` or `tex.url` to `urls` set, check `_isBlobUrl()` and skip if true
    - In `_scanMaterials()`: before adding `value.name` to `urls` set, check `_isBlobUrl()` and skip if true
    - _Bug_Condition: isBugCondition(input) where textureEntry.name STARTS_WITH "blob:" OR textureEntry.url STARTS_WITH "blob:"_
    - _Expected_Behavior: blob URLs are excluded from the regular external asset collection pipeline_
    - _Preservation: relative URLs, absolute HTTP URLs, data URIs, and assets/-prefixed paths continue to be handled identically_
    - _Requirements: 2.1, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Add `BlobTextureEntry` interface and `collectBlobTextures()` method
    - Export `BlobTextureEntry` interface with fields: `blobUrl: string`, `archiveFilename: string`, `textureObj: Record<string, any>`
    - Add public `collectBlobTextures(sceneObj: object): BlobTextureEntry[]` method that:
      - Scans `textures[]`, `reflectionTextures[]`, and `materials[]` nested texture objects
      - Identifies textures where `name` or `url` starts with `blob:` (and no `base64String`, not `assets/`-prefixed)
      - Derives a clean `archiveFilename` from the texture name (stripping blob URL artifacts, extracting meaningful name)
      - Returns deduplicated `BlobTextureEntry[]` with `blobUrl`, `archiveFilename`, and `textureObj` reference
    - _Bug_Condition: isBugCondition(input) where textureEntry.name STARTS_WITH "blob:"_
    - _Expected_Behavior: collectBlobTextures() returns entries with clean filenames and valid blob URLs for fetching_
    - _Preservation: Does not affect existing collect() or collectEmbeddedTextures() pipelines_
    - _Requirements: 2.2, 2.3_

  - [x] 3.3 Integrate blob texture pipeline into `SaveManager._getWorldZipBlob()`
    - After `assetCollector.stripEmbeddedTextures(embeddedEntries)` and before `assetCollector.collect()`:
      - Call `assetCollector.collectBlobTextures(sceneObj)` to get blob texture entries
      - For each `BlobTextureEntry`, fetch binary data from `entry.blobUrl` via `fetch()`
      - Rewrite `entry.textureObj.name` and `entry.textureObj.url` to `assets/<entry.archiveFilename>`
      - Add fetched binary data to `archiveFiles` array as `{ filename: "assets/" + entry.archiveFilename, data: Uint8Array }`
    - Handle fetch failures gracefully with `console.warn` (same pattern as existing external asset fetch)
    - _Bug_Condition: blob URLs in texture objects at save time_
    - _Expected_Behavior: blob URL binary data is fetched, archived with clean filename, and scene JSON references assets/ path_
    - _Preservation: Non-blob-URL assets continue through existing collect() + fetch pipeline unchanged_
    - _Requirements: 2.2, 2.3, 2.4, 3.1, 3.5_

  - [x] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Blob URLs Produce Clean Archive Entries
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (blob URLs excluded from collect(), collectBlobTextures() returns clean filenames)
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Blob-URL Asset Collection Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all non-blob-URL asset handling is identical after fix
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run `npm test` to execute all unit and property tests
  - Verify bug condition exploration test passes (Property 1)
  - Verify preservation property tests pass (Property 2)
  - Verify existing `AssetCollector.test.ts` and `AssetCollector.property.test.ts` still pass
  - Verify existing `SaveManager.property.test.ts` still passes
  - Ensure no regressions in any other test files
  - Ask the user if questions arise
