# FBX Loading Support — Investigation Findings & Required Changes

**Date:** 2026-11-18
**Status:** Investigation complete. No code changes made. This document records findings and the change inventory needed to enable FBX loading in Vishva.

---

## 1. Background

Vishva currently loads 3D model files via BabylonJS `SceneLoader` through one central module
(`src/managers/LoadManager.ts`). Supported formats are gated by a handful of hard-coded
extension whitelists. FBX (`.fbx`) is not among them. This investigation answers two questions:

1. What would need to change to allow Vishva to load FBX files?
2. Which dependency provides FBX loading, and is it compatible with Vishva's current setup?

A telling signal: an FBX file already exists in the user assets folder
(`vishva/assets/SM_Bld_Apartment_01.fbx`), placed there but currently un-loadable through any
UI path (no FBX loader is registered, and no extension whitelist recognizes `.fbx`).

---

## 2. Key finding — there is no FBX loader installed

Vishva uses the **legacy** (non-scoped) BabylonJS package names: `babylonjs`, `babylonjs-gui`,
`babylonjs-loaders`, `babylonjs-materials`, `babylonjs-serializers`, all at `^9.37.1`.

The installed `babylonjs-loaders` package was inspected directly:
- `node_modules/babylonjs-loaders/src/` contains only: `bvhFileLoader.ts`, `glTF1FileLoader.ts`,
  `glTF2FileLoader.ts`, `glTFFileLoader.ts`, `objFileLoader.ts`, `stlFileLoader.ts`, `index.ts`.
- Grepping the bundle `node_modules/babylonjs-loaders/babylonjs.loaders.js` for `fbx`/`FBX`
  (case-insensitive) returns **zero matches**.

So the legacy `babylonjs-loaders` bundle registers glTF1/glTF2, OBJ, STL, and BVH loader plugins
**only**. There is no FBX plugin anywhere in `node_modules`.

---

## 3. Which dependency provides FBX, and the compatibility catch

BabylonJS **does** ship a mature, built-in FBX loader — but in the **scoped**
`@babylonjs/loaders` package, not the legacy bundle.

Evidence:
- `@babylonjs/loaders@9.37.1` (the latest; matches Vishva's `babylonjs` version exactly) lists
  `"FBX/fbxFileLoader.js"` in its package `sideEffects` array alongside OBJ/STL/glTF/USD/splat.
- The official typedoc documents a feature-rich `FBXFileLoaderOptions` interface:
  `preset: "compatible" | "full"`, `materials: "auto" | "standard" | "pbr"`,
  `rebaseAnimations`, `shareGeometry`, `unitScale: "preserve" | "meters"`,
  `normalMapCoordinateSystem`, `constraints`, `curves`, `nurbsSubdivision`, etc.
- It is imported as `import "@babylonjs/loaders/FBX";` (or via `registerBuiltInLoaders()`
  from `@babylonjs/loaders/dynamic`).

### The catch: legacy and scoped packages do not mix cleanly

- Vishva's code imports `SceneLoader` from the legacy `babylonjs` package
  (`import { SceneLoader } from "babylonjs"` in `LoadManager.ts`).
- The scoped `@babylonjs/loaders` FBX loader peer-depends on `@babylonjs/core` and registers
  its plugin on `@babylonjs/core`'s `SceneLoader` — a **different singleton** from the legacy
  `babylonjs` `SceneLoader`.
- Dropping `@babylonjs/loaders` in alongside legacy `babylonjs` would register the FBX plugin on
  the wrong `SceneLoader`; Vishva's `SceneLoader.ImportMesh(...)` calls would not see it. It would
  also pull a second full copy of the engine into the bundle.
- The official `loadingFileTypes` doc page does not list FBX (it lists gltf/usd/obj/stl/ply/splat),
  even though the package ships it — the page is simply out of date.

### Approaches considered

| Option | What it is | Tradeoff |
|---|---|---|
| **A. Migrate to scoped packages** | Replace `babylonjs`→`@babylonjs/core`, `babylonjs-loaders`→`@babylonjs/loaders`, etc. (all 9.37.1), then `import "@babylonjs/loaders/FBX"`. | Only clean way to use the built-in FBX loader. Codebase-wide migration (every BabylonJS import changes). See `SCOPED_BABYLONJS_MIGRATION_SCOPE.md` for the full scope. |
| **B. Hybrid bridge** | Keep legacy `babylonjs`, add `@babylonjs/loaders`, but route FBX loads through `@babylonjs/core`'s `SceneLoader`. | Avoids full migration, but ships two engine instances (bundle size + singleton conflicts on meshes/scenes). Fragile; not recommended. |
| **C. Third-party legacy-compatible loader** | `babylon-fbx-loader` / `Benjythebee/babylonjs-fbx-loader` (extracted from the BabylonJS Editor loader). | Unmaintained, incomplete (geometry + bones only, standard materials only), and also built against `@babylonjs/core` so it has the same legacy/scoped problem. |
| **D. Convert FBX→glTF at import** | Run `fbx2gltf` (or Blender's FBX→glTF export) to turn `.fbx` into `.glb`, then use the existing glTF pipeline. | Sidesteps the loader problem entirely; no new engine copy. But it's a conversion step, not native `.fbx` loading, and `fbx2gltf` is unmaintained. |

**Recommendation:** Option A is the only robust path to native in-app `.fbx` loading. Option D
is the pragmatic fallback (zero code changes — Vishva's glTF pipeline already works).

> The detailed scope of Option A is documented separately in
> `docs/SCOPED_BABYLONJS_MIGRATION_SCOPE.md`.

---

## 4. Change inventory — changes needed to allow FBX

Regardless of which loader approach is chosen, the following locations in Vishva must be
updated so `.fbx` is accepted, shown, and round-tripped. These are the gates that currently
reject or hide FBX files.

> The first item (the loader dependency) depends on the approach chosen in §3. Items 2–7 are
> the same regardless of approach.

### 4.1 BLOCKER — add an FBX loader (see §3)

- **`package.json`** — add the FBX-capable loader dependency (under Option A:
  `@babylonjs/loaders` at `9.37.1`; under Option C: a third-party loader).
- **`src/index.ts:10`** — `import "babylonjs-loaders";` currently registers the bundled
  loaders. An explicit FBX loader import must be added here. Under Option A:
  `import "@babylonjs/loaders/FBX";` (or `registerBuiltInLoaders()` from
  `@babylonjs/loaders/dynamic`).

Without a registered FBX plugin, `SceneLoader.ImportMesh(..., ".fbx")` cannot resolve a loader.

### 4.2 Extension whitelists (five hard-coded lists — the gates that reject `.fbx`)

There is no central constant; the supported-formats list is duplicated across five locations.
Every one must gain `fbx`.

**(a) `src/managers/LoadManager.ts:833`** — inside `loadDroppedAsset()`, the validation gate
right before `SceneLoader.ImportMesh`. A dropped/uploaded `.fbx` is rejected with an alert.
```ts
const fileExtension = file.name.split('.').pop()?.toLowerCase();
const supportedFormats = ['gltf', 'glb', 'obj', 'babylon', 'stl'];
if (!supportedFormats.includes(fileExtension || '')) {
    alert(`Unsupported file format. Supported formats: ${supportedFormats.join(', ')}`);
    return;
}
```
The extension is also passed to `SceneLoader.ImportMesh` as `"." + fileExtension` (line 877),
which is how BabylonJS selects the loader plugin — so the FBX plugin from §4.1 must be
registered for this to resolve.

**(b) `src/managers/LoadManager.ts:1549`** — inside `processDroppedFiles()`, a second,
duplicated copy of the same list. Filters a multi-file drop into "model files" before calling
`loadDroppedAsset()` per file. Without `fbx` here, FBX files are silently dropped before
reaching the loader.
```ts
const modelExtensions = ['gltf', 'glb', 'obj', 'babylon', 'stl'];
const modelFiles = files.filter(f => { ... return ext && modelExtensions.includes(ext); });
```

**(c) `src/gui/InternalAssetsUI.ts:189`** — `_isAsset()`. Decides whether a file in a
curated-asset subfolder gets a clickable thumbnail ID. Space-delimited string; add `fbx`.
```ts
private _isAsset(fileName: String): boolean {
    let ft = fileName.split(".")[1];
    if (ft != null) { if ("babylon glb gltf obj".search(ft) > -1) return true; }
    return false;
}
```
Note: this list omits `stl`, so STL is already not recognized here — worth aligning.

**(d) `src/gui/InternalAssetsUI.ts:223`** — `_isDoubleExtAssetImage()`. Recognizes the flat
thumbnail convention `Name.fbx.png` (inner ext = model type, outer = image). Add `"fbx"` to
`assetExts`.
```ts
const assetExts = ["gltf", "glb", "babylon", "obj"];
return imageExts.includes(imgExt) && assetExts.includes(assetExt);
```
Drives both the gallery filter (line 80) and the click→`loadCurAsset(...,true)` routing
(line 206).

**(e) `src/gui/VishvaGUI.ts:279`** — all-assets tree leaf-click handler. The file browser tree
only triggers `loadUserAsset()` for these four extensions. Add a `.fbx` check.
```ts
this._allAssetsVTDiag.addTreeListener((f, p, l) => {
    if (l) {
        if (f.indexOf(".obj") > 0 || f.indexOf(".babylon") > 0 || f.indexOf(".glb") > 0 || f.indexOf(".gltf") > 0) {
            this._vishva.loadManager.loadUserAsset(p, f);
        }
    }
});
```
Note: this list also omits `.stl`.

### 4.3 MIME → extension mapping (for save/reload round-trip)

**`src/managers/AssetCollector.ts:784–785`** — `_mimeToExtension()`. Used when ingesting
assets back out of a saved world archive (blobs get their file extension from MIME type). FBX
files typically report `application/octet-stream`, which currently maps to `.bin` — wrong
for FBX.
```ts
"application/octet-stream": ".bin",
"model/gltf-binary": ".glb",
"model/gltf+json": ".gltf",
```
Add a `"model/fbx": ".fbx"` entry (and/or a more specific FBX MIME if the chosen loader tags
it). Without this, FBX assets may not survive a world save→reload through the archive/blob
pipeline.

### 4.4 Optional — format-specific post-load fixups (pattern to follow)

**`src/managers/LoadManager.ts:1000–1004`** — inside `onMeshLoaded()`. OBJ files get a dedicated
`fixObj()` correction pass. This is the established pattern for format-specific fixes.
```ts
if (file.split(".")[1] == "obj") { this.fixObj(meshes); }
```
FBX commonly needs coordinate-handedness/scale/material corrections depending on source. If
the chosen FBX loader produces meshes needing correction, add an analogous
`if (file.split(".")[1] == "fbx") { this.fixFbx(meshes); }` branch here. Note: the
`split(".")[1]` check breaks on multi-dot filenames (`My.Model.fbx` → `"Model"`) — a latent
bug worth fixing for FBX.

**`src/managers/FileValidator.ts`** — optional centralization. Currently validates only world
files (`.tar.gz`, `.json`). The two LoadManager whitelists (§4.2a/4.2b) are duplicated. If
centralized, reusable model-format validation is desired, add an `isModelFile()`/`FBX_REGEX`
here and have LoadManager consume it, eliminating the duplication.

### 4.5 Tests (update for consistency so FBX is covered)

- **`src/gui/UploadUI.property.test.ts`** — line 14
  (`const modelExtensions = ["gltf", "glb", "obj", "babylon", "stl"];`) and line 121
  (`const supportedExtensions = [...]`). These mirror the LoadManager lists and encode the
  supported-set invariant in property tests.
- **`src/managers/LoadManager.preservation.property.test.ts:489`** —
  `const assetExtensionArb = fc.constantFrom("glb", "gltf", "obj", "babylon", "stl");`, the
  generator driving the "loadDroppedAsset appends to scene" property test.

The `AssetCollector.*.test.ts` property tests also list extensions in their generators, but
those cover the world-archive collection pipeline (textures/audio/env included), not strictly
the importable model-format set — update only if FBX coverage in those tests is wanted.

### 4.6 Verified no-change locations

| Location | Why no change |
|---|---|
| `src/gui/UploadUI.ts` | File `<input>` has **no `accept` filter** by design (users pick models + dependency files). Any extension is already selectable. |
| `src/gui/WorldLauncher.ts` | Its input `accept=".tar.gz"` is world-archive-only. Do **not** add `.fbx`. |
| `src/managers/FileValidator.ts` | Model-format validation doesn't live here today (world-files only). Optional to add, not required. |
| `src/avatar/AvManager.ts` | Loads `starterAvatars.babylon` only — not a user-facing model import path. |
| `src/gui/NavBarML.ts` / `src/index.html` | Structural markup; no extension strings. |
| `src/managers/AssetStore.ts` | IndexedDB keyed by path string; format-agnostic. |
| `src/managers/AssetResolver.ts` / `PathRewriter.ts` | Path mechanics; format-agnostic. (Verify the chosen FBX loader's texture-URL scheme is compatible.) |
| `src/Vishva.ts` save path | BabylonJS serializer always emits `.babylon` regardless of import source. FBX *export* would need a separate serializer (out of scope). |

---

## 5. Change checklist (summary)

1. ☐ `package.json` — add FBX loader dependency (approach-dependent; Option A → `@babylonjs/loaders@9.37.1`).
2. ☐ `src/index.ts:10` — register the FBX loader (Option A → `import "@babylonjs/loaders/FBX";`).
3. ☐ `src/managers/LoadManager.ts:833` — add `fbx` to `supportedFormats`.
4. ☐ `src/managers/LoadManager.ts:1549` — add `fbx` to `modelExtensions`.
5. ☐ `src/gui/InternalAssetsUI.ts:189` — add `fbx` to the `_isAsset` string.
6. ☐ `src/gui/InternalAssetsUI.ts:223` — add `fbx` to `assetExts`.
7. ☐ `src/gui/VishvaGUI.ts:279` — add `.fbx` check to the tree handler.
8. ☐ `src/managers/AssetCollector.ts:784` — add FBX MIME → `.fbx` mapping.
9. ☐ (optional) `src/managers/LoadManager.ts:1000` — add `fixFbx` post-load branch.
10. ☐ (optional) `src/managers/FileValidator.ts` — centralize model validation.
11. ☐ Tests — `src/gui/UploadUI.property.test.ts` + `src/managers/LoadManager.preservation.property.test.ts:489`.

**Verification item (not a code change):** confirm the chosen FBX loader's texture-URL
resolution is compatible with Vishva's `AssetResolver`/`PathRewriter` and the dropped-file
blob-URL interception in `LoadManager.setupCustomFileHandler()`.

---

## 6. Relationship to the scoped-package migration

Items 1 and 2 above are gated on choosing a loader approach. The recommended approach (Option A)
requires migrating Vishva from the legacy to the scoped BabylonJS packages first. The full scope
of that migration is documented in `docs/SCOPED_BABYLONJS_MIGRATION_SCOPE.md`.

The remaining items (3–11) are independent of the loader approach and can be done once the
loader is in place.
