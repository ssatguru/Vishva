# Scoped BabylonJS Package Migration — Scope (Option A)

**Date:** 2026-11-18
**Status:** Investigation / scoping complete. No code changes made. This documents what migrating
Vishva from the legacy UMD BabylonJS packages to the scoped ES-module packages would entail, in
order to enable the built-in FBX loader. See `FBX_LOADING_SUPPORT.md` for the broader FBX context.

---

## 1. Background and goal

Vishva uses the **legacy** (non-scoped) BabylonJS package names:
`babylonjs`, `babylonjs-gui`, `babylonjs-loaders`, `babylonjs-materials`, `babylonjs-serializers`,
all at `^9.37.1`.

The built-in FBX loader ships only in the **scoped** `@babylonjs/loaders` package (confirmed:
`@babylonjs/loaders@9.37.1` lists `"FBX/fbxFileLoader.js"` in its `sideEffects`). It peer-depends
on `@babylonjs/core` and registers its plugin on `@babylonjs/core`'s `SceneLoader` — a different
singleton from the legacy `babylonjs` `SceneLoader` Vishva currently uses. So the clean path to
native FBX loading is to migrate Vishva to the scoped packages.

This document scopes that migration. **Per instruction, the `babylonjs-charactercontroller`
(`file:../BabylonJS-CharacterController`) and `babylonjs-editcontrol` dependencies are out of
scope here** — they are flagged in §10 as the dominant remaining risk.

---

## 2. Effort at a glance

| Area | Count | Risk |
|---|---|---|
| Source files importing `from "babylonjs"` | ~60 | Low (mechanical) |
| Source files importing `from "babylonjs-gui"` | 2 | Low |
| Deep-subpath imports (`babylonjs/X`) | 6 across 5 files | Low (verified subpaths exist) |
| Side-effect imports in `index.ts` | 2 (`babylonjs-loaders`, `babylonjs-materials`) | Low |
| `import X = BABYLON.Y` namespace imports | 2 (`WaterMaterial`, `DynamicTerrain`) | Medium / High |
| Runtime `BABYLON.X` references (non-comment) | ~8 across 4 files | Low–Medium |
| Pre-built UMD extension relying on global `BABYLON` | 1 (`misc/babylon.dynamicTerrain.min.js`) | **High** |
| Test files with `vi.mock("babylonjs"/"babylonjs-gui")` | ~16 | Low (mechanical) |
| `webpack.config.js` aliases to update | 5 | Medium |
| `package.json` dependencies to swap | 5 | Low |

---

## 3. `package.json` — swap the five dependencies

Replace (all pinned to `9.37.1`, matching the current `babylonjs` version so there is no API
drift):

```
babylonjs               → @babylonjs/core
babylonjs-gui           → @babylonjs/gui
babylonjs-loaders       → @babylonjs/loaders
babylonjs-materials     → @babylonjs/materials
babylonjs-serializers   → @babylonjs/serializers
```

Notes:
- `@babylonjs/loaders` peer-depends on `@babylonjs/core` and `babylonjs-gltf2interface`. The
  latter stays as-is — it is a shared interface package, not a legacy engine bundle.
- `babylonjs-inspector` is **not** a package dependency — it is loaded dynamically from a CDN
  (see §9.4). It is referenced in `package.json` only via the inspector CDN URL in `Vishva.ts`.

---

## 4. Mechanical import rewrite (the bulk — low risk)

### 4.1 Top-level `babylonjs` → `@babylonjs/core` (~60 files)

Every `import { ... } from "babylonjs";` becomes `from "@babylonjs/core"`. Files span
`avatar/`, `gui/` (incl. `gui/propspanel/`, `gui/components/`), `managers/` (incl.
`managers/spawner/`), `sna/` (all actuators/sensors), `util/`, plus `Vishva.ts`,
`VishvaSerialized.ts`, `CameraController.ts`, `GrndSpread.ts`. This is a find-and-replace; no
symbol names change.

Representative examples found:
- `src/avatar/AvManager.ts:1` — `import { AnimationRange, SceneLoader, ... } from "babylonjs";`
- `src/CameraController.ts:1` — `import { Scene, Camera, ArcRotateCamera, ... } from "babylonjs";`
- `src/Vishva.ts:4–79` — large named import block from `"babylonjs"`.
- `src/managers/SaveManager.ts:2–5` — `import { ..., SceneSerializer, ... } from "babylonjs";`

### 4.2 `babylonjs-gui` → `@babylonjs/gui` (2 files)

- `src/sna/ActuatorPointerLock.ts:6` — `import { Control, Image, Line, Rectangle, AdvancedDynamicTexture, TextBlock } from "babylonjs-gui";`
- `src/sna/ActuatorTextBar.ts:7` — `import { AdvancedDynamicTexture, TextBlock } from "babylonjs-gui";`

### 4.3 Deep-subpath imports → `@babylonjs/core/<same-subpath>` (6 occurrences, 5 files)

The scoped package mirrors the legacy internal path structure. **Verified** against
`@babylonjs/core@9.37.1` on unpkg: `Maths/math.color.js` exists; `Shaders/tonemap.fragment.js`
exists and exports the same `tonemapPixelShader` symbol.

| File | Legacy import | Scoped import |
|---|---|---|
| `src/VishvaSerialized.ts:4` | `babylonjs/Maths/math.color` | `@babylonjs/core/Maths/math.color` |
| `src/util/AnimUtils.ts:3` | `babylonjs/Animations/animationGroup` | `@babylonjs/core/Animations/animationGroup` |
| `src/util/AnimUtils.ts:4` | `babylonjs/Bones/skeleton` | `@babylonjs/core/Bones/skeleton` |
| `src/util/AnimRangeDedup.ts:3` | `babylonjs/Bones/skeleton` | `@babylonjs/core/Bones/skeleton` |
| `src/sna/ActuatorAnimator.ts:8` | `babylonjs/Animations/animationGroup` | `@babylonjs/core/Animations/animationGroup` |
| `src/sna/ActuatorTextBar.ts:8` | `babylonjs/Shaders/tonemap.fragment` | `@babylonjs/core/Shaders/tonemap.fragment` |
| `src/gui/components/VDiag.ts:1` | `babylonjs/Shaders/volumetricLightScatteringPass.vertex` | `@babylonjs/core/Shaders/volumetricLightScatteringPass.vertex` |
| `src/gui/propspanel/AnimationUI.ts:16` | `babylonjs/Meshes/abstractMesh` | `@babylonjs/core/Meshes/abstractMesh` |

> **Verification item:** with `moduleResolution: "node16"` (current tsconfig), deep subpaths
> must be in the package's `exports` map. `@babylonjs/core` has a very broad exports map and these
> are standard paths, but a handful may need adjusting if TypeScript reports them unresolved.
> Low probability.

---

## 5. `src/index.ts` — side-effect imports + FBX registration (lines 10–12)

Current:
```ts
import "babylonjs-loaders";
import "babylonjs-materials";
//import "babylonjs-serializers";   // commented out
```
Change to:
```ts
import "@babylonjs/loaders";          // registers glTF/OBJ/STL/USD/splat plugins
import "@babylonjs/loaders/FBX";      // NEW — registers the built-in FBX plugin
import "@babylonjs/materials";
```
Alternative: `registerBuiltInLoaders()` from `@babylonjs/loaders/dynamic` registers everything
including FBX via dynamic import (lighter bundle, but the static `import "@babylonjs/loaders/FBX"`
is the closer analog to the current setup).

The commented-out `//import "./misc/babylon.dynamicTerrain.min";` and `//import "./misc/perlin";`
(lines 20–21) relate to the DynamicTerrain issue in §7.

---

## 6. Eliminate the global `BABYLON` namespace (medium risk)

The scoped packages do **not** create a global `BABYLON` namespace. Today the legacy bundle
exposes one (the codebase relies on it). Every `BABYLON.X` reference must become an explicit
import. Two patterns exist:

### 6.1 `import X = BABYLON.Y` namespace imports (`src/Vishva.ts:79–80`)

```ts
import WaterMaterial = BABYLON.WaterMaterial;    // from babylonjs-materials
import DynamicTerrain = BABYLON.DynamicTerrain;   // from the UMD extension — see §7
```
- `WaterMaterial` is real and used at runtime (`new WaterMaterial(...)` at `Vishva.ts:4482`,
  `4510`). Convert to `import { WaterMaterial } from "@babylonjs/materials";` — straightforward.
- `DynamicTerrain` is the hard one — see §7.

### 6.2 Runtime `BABYLON.X` references (non-comment, ~8 across 4 files)

| File:line | Current | Replacement |
|---|---|---|
| `Vishva.ts:391` | `new BABYLON.Color3(...)` | `new Color3(...)` (Color3 already imported) |
| `Vishva.ts:4340` | `BABYLON.VertexBuffer.PositionKind` | `VertexBuffer.PositionKind` (VertexBuffer already imported) |
| `Vishva.ts:4341` | `BABYLON.VertexBuffer.NormalKind` | `VertexBuffer.NormalKind` |
| `ActuatorPointerLock.ts:54–55` | `BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER` / `HORIZONTAL_ALIGNMENT_CENTER` | import `Control` from `@babylonjs/gui`, use `Control.VERTICAL_ALIGNMENT_CENTER` |
| `SNA.ts:484` | `mesh instanceof BABYLON.InstancedMesh` | import `InstancedMesh` from `@babylonjs/core`, use `instanceof InstancedMesh` |
| `LightUI.ts:100,101,110` | `BABYLON.Color3.FromHexString(...)` | import `Color3`, use `Color3.FromHexString(...)` |

Note: `SceneSerializer` is used in `SaveManager.ts` and `Vishva.ts` but is imported as a named
import `from "babylonjs"` (not via the global), so it is handled by §4.1 — it lives in
`@babylonjs/core`; no separate serializers package import is needed (the `babylonjs-serializers`
side-effect import is already commented out in `index.ts`).

---

## 7. DynamicTerrain UMD extension — HIGHEST RISK

This is the single hardest part of the migration.

**Facts found:**
- `src/misc/babylon.dynamicTerrain.min.js` is a pre-built UMD minified file that references the
  global `BABYLON` namespace throughout (`BABYLON.Vector3`, `BABYLON.Color4`, `BABYLON.Mesh`,
  etc.). It is a community/extension module, **not** part of any `@babylonjs/*` package.
- `src/d.ts/babylon.dynamicTerrain.d.ts` declares an ambient
  `module BABYLON { class DynamicTerrain { ... } }` to give the code types.
- `Vishva.ts:80` does `import DynamicTerrain = BABYLON.DynamicTerrain;` and **instantiates it at
  runtime**: `let terrain: DynamicTerrain = new DynamicTerrain("t", parms, ...);`
  (`Vishva.ts:4670`), inside `creatDynamicTerrain()` (line 4705).
- **Anomaly:** both the min.js import (`index.ts:21`) and the call site
  `this.creatDynamicTerrain()` (`Vishva.ts:758`) are **commented out**. So either the feature is
  currently dormant, or DynamicTerrain is loaded/triggered through another path. This must be
  clarified first.

**Why it is a blocker:** in the scoped world there is no global `BABYLON` for the min.js to
attach to, and no `@babylonjs/core` subpath that exports `DynamicTerrain`. Options, in increasing
effort:

1. **Confirm it is dormant** — if `creatDynamicTerrain()` is truly unreachable, the min.js, the
   `d.ts`, and the two `import = BABYLON.` lines can be deleted and the feature removed.
   Cheapest, if acceptable.
2. **Keep a synthetic global** — import `@babylonjs/core`, assign it to `globalThis.BABYLON` in
   `index.ts` before importing the min.js, then keep the min.js + `d.ts` as-is. Works but
   reintroduces a global and is fragile (the min.js must touch only APIs that still exist on the
   scoped core — mostly true, but version-sensitive).
3. **Port DynamicTerrain to ESM** against `@babylonjs/core` (replace each `BABYLON.X` inside the
   min with a real import). Most correct, most work; the source is the BabylonJS DynamicTerrain
   community extension.

**Recommendation:** confirm reachability first (§9.1). If the feature is live, option 2 is the
pragmatic bridge; option 3 is the clean endpoint.

---

## 8. `webpack.config.js` — update aliases

Current `resolve.alias` pins all five legacy packages (with `symlinks: false`) to force a single
`babylonjs` instance for the charactercontroller:
```js
resolve: {
  symlinks: false,
  alias: {
    babylonjs: path.resolve(__dirname, "node_modules/babylonjs"),
    "babylonjs-gui": path.resolve(__dirname, "node_modules/babylonjs-gui"),
    "babylonjs-loaders": path.resolve(__dirname, "node_modules/babylonjs-loaders"),
    "babylonjs-materials": path.resolve(__dirname, "node_modules/babylonjs-materials"),
    "babylonjs-serializers": path.resolve(__dirname, "node_modules/babylonjs-serializers"),
  },
}
```
(The inline comment in the file documents that this block + `symlinks: false` exists specifically
to prevent a second `babylonjs` copy from being pulled in via the charactercontroller `file:`
symlink, which broke `instanceof Mesh` checks.)

After migration:
- Repoint aliases at the scoped packages (`@babylonjs/core` → `node_modules/@babylonjs/core`,
  etc.), **or** remove the aliases entirely and rely on normal resolution + npm hoisting for
  single-instance dedup. The right answer depends on how §10 is resolved.
- **ESM handling:** `@babylonjs/core` ships as `"type": "module"` ESM. Webpack 5 handles ESM,
  but the current pipeline is `ts-loader` with `module: "node16"`. Verify the build produces
  working output (tree-shaking, named imports, no CJS/ESM interop errors). This is the main
  build-config risk.
- `symlinks: false` stays relevant only while the charactercontroller `file:` symlink is in
  play (§10).

---

## 9. Other configuration & verification

### 9.1 `tsconfig.json` — likely no change, verify

Current: `"module": "node16"`, `"moduleResolution": "node16"`,
`"allowSyntheticDefaultImports": true`. `node16` resolution is well-suited to scoped packages
with `exports` maps — good. No change expected, but:
- Confirm ts-loader output + webpack interop produces a working bundle (§8).
- `node16` requires explicit `.js` extensions on relative imports in ESM; the codebase already
  uses them (e.g. `from "./LoadManager.js"` in tests) — verify all relative imports are compliant
  (it currently compiles, so likely fine).

### 9.2 Tests — update mocks and imports (~16 files)

Every `vi.mock("babylonjs", ...)` → `vi.mock("@babylonjs/core", ...)` and
`vi.mock("babylonjs-gui", ...)` → `vi.mock("@babylonjs/gui", ...)`; every test
`import { ... } from "babylonjs"` → `from "@babylonjs/core"`.

Files with `vi.mock("babylonjs", ...)`: `AssetResolver.test.ts`,
`AssetResolver.property.test.ts`, `AssetResolver.blobresave.property.test.ts`,
`AssetResolver.blobresave.preservation.property.test.ts`, `AnimationUI.test.ts`,
`LoadManager.clearScene.property.test.ts`, `LoadManager.pageReload.test.ts`,
`LoadManager.preservation.property.test.ts`, `LoadManager.placement.test.ts`,
`proximityCheck.test.ts`, `SensorClick.test.ts`, `SensorKeyboard.test.ts`,
`SensorKeyboard.property.test.ts`, `XRIntegration.test.ts`, `XROptionsHud.test.ts`.

Files with `vi.mock("babylonjs-gui", ...)`: `XRIntegration.test.ts`, `XROptionsHud.test.ts`.

Files that **import** (not mock) babylonjs in tests: `LoadManager.preservation.property.test.ts:104`,
`LoadManager.placement.test.ts:97`, `proximityCheck.test.ts:105`, plus
`SpawnerManager.test.ts` / `XRIntegration.test.ts`.

Mechanical, but the mock factory contents may need symbol additions if scoped-core paths
differ (they should not for the symbols mocked: `Tools`, `SceneLoader`, `Vector3`, `Skeleton`,
`AnimationRange`, `ActionManager`, triggers).

### 9.3 `src/index.html` — no global babylonjs script (good)

`index.html` loads `dist/lib/Oimo.js` (physics), `vishva/config.js`, `vishva/userAssets.js`,
`dist/assets/internalAssets.js`, and `dist/main.js` (the bundle). There is **no** global
`babylonjs` `<script>` tag — the `BABYLON` global comes from the bundled legacy package at
runtime. This means the §6 global-elimination is necessary (nothing external provides the
global in the scoped world).

### 9.4 Verification checklist

1. **DynamicTerrain reachability** — is `creatDynamicTerrain()` / the `new DynamicTerrain(...)`
   path reachable at runtime? Determines whether §7 is a real blocker or dead code.
2. **All deep subpaths resolve** under `node16` against `@babylonjs/core`'s exports map (the 6 in
   §4.3; high confidence, verify).
3. **`@babylonjs/materials` exports `WaterMaterial`** and `@babylonjs/core` exports
   `SceneSerializer`, `OimoJSPlugin`, `SolidParticleSystem`, `DebugLayer`,
   `SSAO2RenderingPipeline`, `CascadedShadowGenerator`, `DepthRenderer` (all currently imported
   from `babylonjs`). High confidence — these are standard core/materials symbols.
4. **Inspector CDN** — `Vishva.ts:4179` sets
   `DebugLayer.InspectorURL = "https://cdn.jsdelivr.net/npm/babylonjs-inspector@${Engine.Version}/babylon.inspector-v2.bundle.js"`.
   The `babylonjs-inspector` (legacy UMD) bundle must still augment the scoped `@babylonjs/core`
   `DebugLayer`. If it does not, switch the URL to `@babylonjs/inspector`'s bundle. Verify the
   inspector opens.
5. **Physics** — `Oimo.js` is loaded via `<script>` in `index.html` and `OimoJSPlugin` (core)
   wraps the global `OIMO`. Independent of the babylonjs migration, but confirm `OimoJSPlugin`
   still finds the global after the swap.
6. **Build produces working bundle** — run `npm run dev` and load a world; the double-instance
   risk (§10) and ESM-interop (§8) are the likely failure modes.
7. **FBX actually loads** — after migration, register `@babylonjs/loaders/FBX`, add `fbx` to the
   five whitelists (see `FBX_LOADING_SUPPORT.md` §4.2), and load
   `vishva/assets/SM_Bld_Apartment_01.fbx` (the FBX file already in the repo).

---

## 10. Out of scope per instruction — but the dominant remaining risk

`babylonjs-charactercontroller` (`file:../BabylonJS-CharacterController`) and
`babylonjs-editcontrol` were not analyzed here. **They are the biggest unknown for whether this
migration actually runs.** If either imports from legacy `babylonjs` and registers/expects a
single shared engine instance, the scoped swap can break `instanceof` checks and
avatar/skeleton wiring — exactly the class of bug the current `webpack.config.js` alias block +
`symlinks: false` comment was written to prevent.

Specifically, the webpack alias comment states that without the single-instance pinning, two
`babylonjs` copies meant two distinct `Mesh` classes, so `instanceof Mesh` checks inside the
CharacterController (in `setCharacter` / `_findSkel`) failed for meshes created with Vishva's
`babylonjs`, surfacing as "root node of the mesh provided is not a mesh" and a missing avatar
skeleton. Any migration to scoped packages must ensure these two libraries resolve against the
same single `@babylonjs/core` instance, which requires knowing how they import BabylonJS today.

The migration plan is incomplete until their compatibility is assessed:
- Do they import `babylonjs` or `@babylonjs/core`?
- Are they source-modifiable (the charactercontroller is a local `file:` checkout; editcontrol is
  a published npm package)?
- Does editcontrol have a scoped-package-compatible published version?

Recommend scoping this as a follow-up **before** starting the migration.

---

## 11. Suggested order of work

1. Resolve §10 first (charactercontroller/editcontrol compatibility) — it gates everything.
2. Clarify §9.4.1 (DynamicTerrain reachability) → decide §7 path.
3. Swap `package.json` (§3) + update `webpack.config.js` aliases (§8).
4. Mechanical import rewrite (§4) + side-effect imports (§5).
5. Global-BABYLON elimination (§6) + DynamicTerrain (§7).
6. Tests (§9.2).
7. Build, verify (§9.4), then add FBX whitelists (per `FBX_LOADING_SUPPORT.md`) and load the
   test FBX.
