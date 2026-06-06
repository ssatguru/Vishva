# BabylonJS 8.x → 9.x Upgrade: Feasibility & Risk Assessment

**Date**: June 2026  
**Current Version**: `babylonjs@^8.56.2` (UMD packages)  
**Target Version**: BabylonJS 9.x (released March 2026, currently ~9.5.x)

---

## Current State

Vishva uses the legacy UMD `babylonjs` npm packages with webpack bundling. All imports follow the `import { ... } from "babylonjs"` pattern. Two first-party plugins (`babylonjs-charactercontroller`, `babylonjs-editcontrol`) are critical dependencies.

---

## HIGH RISK: Third-Party Plugin Compatibility

| Package | Current Version | Built Against | Risk |
|---------|----------------|---------------|------|
| `babylonjs-charactercontroller` | 0.4.4 | BabylonJS 7.0 | **HIGH** — no peer deps declared, compiled against v7 internals. Works with 8.x by luck. Unknown whether 9.x internal changes break it. |
| `babylonjs-editcontrol` | 4.0.0 | BabylonJS 8.47 | **MEDIUM-HIGH** — built against 8.47. No guarantee 9.x API surface hasn't shifted. |

Both packages are UMD bundles that reference `babylonjs` as an external — if the global namespace exposure changes (which it did in 9.5.0), they break at load time.

---

## HIGH RISK: UMD Package Breakage in 9.5+

A confirmed regression broke all `babylonjs-*` UMD packages in version 9.5.0. The Rollup build refactoring changed how the global `BABYLON` namespace was exported, causing errors like `ShadersStore undefined` and `Vector2 is not a constructor`.

A [fix PR (#18414)](https://github.com/BabylonJS/Babylon.js/pull/18414) was merged May 2026, but:

- Only upgrade to a version **after** this fix lands in a published release
- The BabylonJS team is actively pushing people toward `@babylonjs/*` ES6 packages, meaning the legacy UMD path is lower priority
- Versions 9.1 through 9.4 had various regressions reported by other users

**The entire Vishva project uses UMD imports** (`import { ... } from "babylonjs"`). This is the package path most at risk of further breakage.

---

## MEDIUM RISK: Deprecated Legacy Audio Engine

Current usage in `Vishva.ts`:
```typescript
this.engine = new Engine(canvas, true, { audioEngine: true, ... });
Engine.audioEngine.useCustomUnlockedButton = true;
```

Usage in `ActuatorSound.ts` and `ActuatorDialog.ts`:
```typescript
Engine.audioEngine.audioContext.state === "suspended"
Engine.audioEngine.unlocked
Engine.audioEngine.unlock()
Engine.audioEngine.audioContext.resume()
```

The legacy audio engine was deprecated in 7.52 and requires the explicit `audioEngine: true` flag (already in place). In 9.x, the new audio engine is the default. The legacy path still works with the flag, but:
- API shape of `Engine.audioEngine` may change or eventually be removed
- Direct access to `audioContext` is fragile

---

## MEDIUM RISK: CSG (Deprecated since 7.31)

`Vishva.ts` uses the legacy CSG class:
```typescript
let csg1: CSG = CSG.FromMesh(<Mesh>this.meshSelected);
let csg2: CSG = CSG.FromMesh(<Mesh>this.meshesPicked[0]);
let csg3 = csg2.subtract(csg1);  // also .intersect(), .union()
let newMesh = csg3.toMesh(name, material, scene, false);
```

The CSG class was deprecated in 7.31 in favor of CSG2. Per a BabylonJS team member: "we will not remove it from the engine" — so it still compiles, but:
- It's unmaintained and marked deprecated
- CSG2 has a different async API (`InitializeCSG2Async()` required first)
- Migration is not drop-in (different method signatures, async init)

---

## LOW RISK: SceneLoader Sync Methods

Current usage in `LoadManager.ts` and `AvManager.ts`:
- `SceneLoader.Append("", data, scene, callback)`
- `SceneLoader.ImportMesh("", folder, file, scene, callback)`
- `SceneLoader.LoadAssetContainer(url, file, scene, callback)`

The breaking change in 7.34 was that these methods no longer *return the plugin synchronously*. Since all usage is callback-style (not capturing the return value), **no impact expected**.

---

## LOW RISK: Other Breaking Changes

| Change | Version | Impact |
|--------|---------|--------|
| `transparencyMode` behavior change | 7.47.3 | Not used in code |
| `overrideMaterialSideOrientation` renamed | 7.11 | Not used |
| WebVR removal | 7.0 | Not used |
| Right-hand camera rotation fix | 8.10.1 | Scene uses `useRightHandedSystem = true` — **review needed** for camera rotation/quaternion setting |
| `forceSRGBBufferSupportState` GLTF texture workaround | ~7.3 | Already have workaround in place, may no longer be needed in 9.x |
| Thin instances staticBuffer default | 7.0 | Not using thin instances |
| Instance parent change | 7.31 | Uses `InstancedMesh` — verify parent behavior |

---

## Notable 9.0 Features (Benefits)

- **Clustered Lighting** — performance with many lights
- **Animation Retargeting** — could benefit multi-character animation sharing system
- **Frame Graph** — GPU memory savings (40%+ reported)
- **Volumetric Lighting** — cinematic light shafts
- **Node Particle Editor** — visual particle authoring
- **Inspector v2** — ground-up rebuild with better DX
- **Large World Rendering** — floating origin for large coordinates
- **Advanced Gaussian Splat** — improved photorealistic captures
- **SDF Text** — resolution-independent 3D text

---

## Recommended Approach

### Phase 1: Prepare Dependencies
1. **Rebuild `babylonjs-charactercontroller` against BabylonJS 9.x** — verify all CC APIs still work (collision, animations, movement)
2. **Rebuild `babylonjs-editcontrol` against BabylonJS 9.x** — verify gizmo/transform controls still work
3. Publish updated versions of both packages

### Phase 2: Upgrade Vishva
4. **Target 9.0.0 specifically** (or the first patch after the UMD fix lands) — avoid 9.1–9.4 based on reported regressions
5. Run the full test suite (`npm test`) after upgrading
6. Manually test: scene loading, avatar movement, mesh editing, CSG operations, sound playback

### Phase 3: Address Deprecations
7. **Migrate CSG → CSG2** — async init, different API
8. **Plan audio engine migration** — replace `Engine.audioEngine.*` usage with new audio engine API when ready
9. **Evaluate right-handed camera rotation** — verify `ArcRotateCamera` rotation/quaternion behavior hasn't shifted

### Phase 4: Future-Proofing (Optional)
10. **Consider migrating to `@babylonjs/*` ES6 packages** — the BabylonJS team is investing less in the legacy UMD path. This would be a larger refactor (all imports change, tree-shaking benefits) but makes future upgrades less fragile.

---

## Risk Summary

| Category | Risk Level | Mitigation |
|----------|-----------|------------|
| Third-party plugins (CC + EditControl) | 🔴 High | Rebuild against 9.x first |
| UMD package format stability | 🔴 High | Wait for post-fix release, consider ES6 migration |
| Legacy audio engine API | 🟡 Medium | Works with flag for now, plan migration |
| CSG deprecation | 🟡 Medium | Still available, plan CSG2 migration |
| Right-handed camera rotation | 🟡 Medium | Test camera behavior after upgrade |
| SceneLoader API | 🟢 Low | Callback-style usage is fine |
| Other breaking changes | 🟢 Low | Minimal surface area |

---

## Overall Verdict

**Feasible but requires preparation.** The two highest risks (first-party plugins + UMD instability) are both within our control since we author the CC and EditControl packages. Rebuild those against 9.x first, then upgrade Vishva. Budget 2–3 days for the full upgrade including debugging UMD/namespace issues, audio engine quirks, and camera behavior validation.
