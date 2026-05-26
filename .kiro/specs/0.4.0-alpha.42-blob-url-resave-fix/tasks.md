# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Blob URLs Leak Into Serialized SNA Properties After Load-Save Cycle
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate blob URLs appear in serialized SNA actuator properties after resolveAssetPaths() mutates the live object
  - **Scoped PBT Approach**: Scope the property to concrete failing cases — SNA property objects containing `vishva/assets/...` strings that get resolved to blob URLs, then read back via serialization
  - **Test file**: `src/managers/AssetResolver.blobresave.property.test.ts`
  - **Setup**: Create a VishvaSerialized-like object with SNA properties containing `vishva/assets/html/intro.html` and `vishva/assets/audio/ambient.ogg` paths
  - **Bug condition from design**: `isBugCondition(input)` — EXISTS property IN deepTraverse(input.vishvaSerialized.snas[*].properties) WHERE typeof property.value === "string" AND property.value.startsWith("blob:")
  - **Test steps**:
    1. Populate an AssetStore session with test assets (HTML file, audio file)
    2. Create AssetResolver, call resolveAssetPaths() on the SNA property tree
    3. Read back the property values (simulating serializeSnAs() reading live actuator properties)
    4. Assert that ALL asset references in the serialized output are `vishva/assets/...` paths (NOT blob URLs)
  - **Expected behavior assertion**: For all inputs satisfying the bug condition, the serialized output SHALL NOT contain any `blob:` prefixed strings — all asset references SHALL be `vishva/assets/...` paths
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists because resolveAssetPaths mutates in-place with no reverse mapping)
  - Document counterexamples found (e.g., "After resolveAssetPaths(), property.value is 'blob:http://localhost/...' instead of 'vishva/assets/html/intro.html'")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 2.1, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Blob Inputs and Runtime Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - **Test file**: `src/managers/AssetResolver.blobresave.preservation.property.test.ts`
  - **Observation phase** (run on UNFIXED code):
    - Observe: SNA properties without asset references (numbers, vectors, booleans, signal IDs) pass through resolveAssetPaths() unchanged
    - Observe: First-time save (no AssetResolver activation) serializes original `vishva/assets/...` paths directly
    - Observe: Strings that do NOT match `vishva/assets/...` pattern are left untouched by resolveAssetPaths()
    - Observe: Non-string property values (objects, arrays, numbers, booleans) are unaffected
  - **Property-based tests** (using fast-check):
    1. For all SNA property objects where NO value is a `vishva/assets/...` string, resolveAssetPaths() leaves them completely unchanged (identity property)
    2. For all arbitrary string values that do NOT start with `vishva/assets/`, resolveAssetPaths() leaves them unchanged
    3. For all non-string property values (fc.oneof: integer, boolean, object, array), resolveAssetPaths() preserves them exactly
    4. For all VishvaSerialized objects with no SNA asset references, the save pipeline produces identical output before and after the fix
  - **Non-bug condition from design**: Cases where `isBugCondition` returns false — properties without blob URLs (first-time save, server-loaded world, non-asset properties)
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix for blob URL leaking into serialized SNA properties after load-save cycle

  - [x] 3.1 Add blobUrl→originalPath reverse map to AssetResolver
    - Add a `private _reverseMap: Map<string, string>` field to AssetResolver (blobUrl → originalPath)
    - In `resolveAssetPaths()`, when replacing a `vishva/assets/...` string with a blob URL, record the mapping: `this._reverseMap.set(blobUrl, originalPath)`
    - Ensure the reverse map survives `deactivate()` — blob URLs are revoked but the string mapping remains valid for save-time lookup
    - _Bug_Condition: isBugCondition(input) where snas[*].properties contain blob: prefixed strings that were originally vishva/assets/ paths_
    - _Expected_Behavior: reverseBlobUrl(blobUrl) returns the original vishva/assets/ path for any blob URL produced by resolveAssetPaths()_
    - _Preservation: Non-asset strings and non-string values are never added to the reverse map_
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.2 Add reverseBlobUrl() and reverseAllBlobUrls() methods to AssetResolver
    - Implement `reverseBlobUrl(blobUrl: string): string | null` — returns original path or null if not recognized
    - Implement `reverseAllBlobUrls(obj: any): void` — deep-traverses an object tree (same pattern as resolveAssetPaths) and replaces any blob URL strings found in the reverse map with their original paths
    - Handle edge cases: null/undefined values, circular references (if applicable), arrays of properties
    - _Bug_Condition: After resolveAssetPaths(), blob URLs exist in the object tree that need reversal_
    - _Expected_Behavior: reverseAllBlobUrls(snas) restores all blob URLs to their original vishva/assets/ paths_
    - _Preservation: Strings not in the reverse map (foreign blob URLs, non-blob strings) are left unchanged_
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Store AssetResolver reference on Vishva instance for save-time access
    - In `LoadManager.loadVishvaPartFromObjects()`, store the AssetResolver instance on `this.vishva._assetResolver` before or after calling resolveAssetPaths()
    - Add `_assetResolver: AssetResolver | null` field to Vishva class (or use existing pattern)
    - Ensure the reference persists after deactivate() so the reverse map is accessible at save time
    - _Bug_Condition: At save time, SaveManager needs access to the reverse map but AssetResolver was only a local variable in LoadManager_
    - _Expected_Behavior: this.vishva._assetResolver is available and its reverseMap is populated_
    - _Preservation: Worlds loaded from server (no AssetResolver activation) have _assetResolver as null — save pipeline handles this gracefully_
    - _Requirements: 2.1, 2.2_

  - [x] 3.4 Call reverseAllBlobUrls() in SaveManager before writing serialized data
    - In `saveWorldToIndexedDB()`: after `SNAManager.serializeSnAs()` produces the SNA array, call `this.vishva._assetResolver?.reverseAllBlobUrls(vishvaSerialized.snas)` to restore original paths
    - In `_getWorldZipBlob()`: same reversal before packaging into archive
    - In `saveWorldAsJson()` and `saveWorldToIndexedDBAsJson()`: same reversal for JSON-only saves
    - Guard with null check: if `_assetResolver` is null (first-time save, server-loaded world), skip reversal — paths are already correct
    - _Bug_Condition: serializeSnAs() captures blob URLs from live actuator properties_
    - _Expected_Behavior: After reverseAllBlobUrls(), all snas[*].properties asset references are vishva/assets/ paths_
    - _Preservation: First-time saves (no _assetResolver) skip reversal and work unchanged; non-asset properties are untouched by reversal_
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 3.3_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Blob URLs Are Reverse-Mapped to Original Paths at Save Time
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior: serialized SNA properties SHALL NOT contain blob URLs
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed — all blob URLs are reversed to original paths)
    - _Requirements: 2.1, 2.3_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Blob Inputs and Runtime Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — non-asset properties, first-time saves, and runtime blob URL delivery are all unchanged)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite: `npm test`
  - Verify bug condition exploration test passes (Property 1)
  - Verify preservation property tests pass (Property 2)
  - Verify existing tests in `AssetResolver.property.test.ts`, `AssetCollector.property.test.ts`, `SaveManager.property.test.ts`, and `LoadManager.preservation.property.test.ts` still pass
  - Ensure no regressions in any other test files
  - Ask the user if questions arise



