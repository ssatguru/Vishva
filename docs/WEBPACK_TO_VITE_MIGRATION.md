# Webpack → Vite Migration Guide

## Overview

This document outlines what is required to migrate the Vishva project from Webpack 5 + `webpack-dev-server` to Vite. Overall effort is estimated at **1–2 days**.

---

## What Changes

### Dependencies

Remove from `devDependencies`:
```
webpack
webpack-cli
webpack-dev-server
ts-loader
css-loader
style-loader
file-loader
copy-webpack-plugin
terser-webpack-plugin
uglify-js
```

Add to `devDependencies`:
```
vite
@vitejs/plugin-legacy   (only if emitDecoratorMetadata is needed — see below)
```

### `package.json` Scripts

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

### `vite.config.ts` (new file, replaces `webpack.config.js`)

```ts
import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  publicDir: "../public",
  build: {
    outDir: "../bin",
    emptyOutDir: true,
  },
  server: {
    open: true,
  },
});
```

---

## Friction Points

### 1. `tsconfig.json` — Module System

**Required change.** Vite expects ESNext modules, not Node16.

Current:
```json
"module": "node16",
"moduleResolution": "node16"
```

Change to:
```json
"module": "ESNext",
"moduleResolution": "bundler"
```

---

### 2. `<base href="../" />` in `index.html`

**Required change.** This tag is a webpack workaround for the `/bin/` public path offset. Vite serves directly from the project root (or `src/` if set as root), so this tag must be removed and any relative asset paths that depended on it re-evaluated.

---

### 3. External `<script>` Tags in `index.html`

This is the most significant friction point. The current HTML loads several runtime scripts:

```html
<script src="bin/lib/Oimo.js"></script>
<script src="vishva/config.js"></script>
<script src="vishva/userAssets.js"></script>
<script src="bin/assets/internalAssets.js"></script>
<script src="bin/main.js"></script>
```

`config.js` and `userAssets.js` set globals (`defaultWorld`, `noEditWorlds`, user asset registries) that TypeScript reads via `declare var`. Vite owns `index.html` as the entry point and injects the bundle itself — `bin/main.js` is no longer a manually referenced script.

**Recommended approach:** Move `config.js`, `userAssets.js`, and `internalAssets.js` into the `public/` folder. They will be served as-is at runtime and can still be loaded as plain `<script>` tags in `index.html`. The `declare var` globals in TypeScript remain valid.

`Oimo.js` is already a vendored file in `src/lib/` — move it to `public/lib/` as well.

---

### 4. Static Asset Copying (`copy-webpack-plugin`)

Webpack currently copies `src/assets/**/*` and `src/lib/**/*` to `bin/` via `copy-webpack-plugin`. In Vite, anything placed in the `public/` directory is served and copied to the build output as-is — no plugin needed.

**Action:** Move `src/assets/` and `src/lib/` to a top-level `public/` directory.

```
public/
  assets/
  lib/
    Oimo.js
```

---

### 5. Image Asset Paths (`file-loader`)

Webpack uses `file-loader` with explicit `outputPath: "images"` and `publicPath: "bin/images"`. Vite handles static assets natively — files in `public/` are served at the root, and image imports in TypeScript/CSS resolve automatically without configuration.

Any hardcoded `bin/images/...` paths in the codebase would need to be updated to match the new public path structure.

---

### 6. `emitDecoratorMetadata` and Decorator Support

Vite uses **esbuild** for TypeScript transpilation, which does **not** support `emitDecoratorMetadata`. `experimentalDecorators` is supported.

**Action required:** Check whether any code uses `reflect-metadata` or runtime type reflection (common with dependency injection frameworks). 

- If **nothing** uses `reflect-metadata` at runtime → drop `emitDecoratorMetadata: true` from `tsconfig.json`, no further action needed.
- If something **does** rely on it → add `@vitejs/plugin-legacy` or `vite-plugin-babel` with `babel-plugin-transform-typescript` to restore the behavior.

Given this project has no DI framework, dropping `emitDecoratorMetadata` is likely safe.

---

### 7. Side-Effect Imports (SNA Modules)

No change needed. Vite preserves side-effect imports correctly:

```ts
import "./sna/ActuatorAnimator";
import "./sna/SensorClick";
// etc.
```

These self-registration patterns work identically in Vite.

---

## Migration Checklist

- [ ] Remove webpack-related `devDependencies`, add `vite`
- [ ] Update `package.json` scripts
- [ ] Create `vite.config.ts`
- [ ] Update `tsconfig.json`: `module` + `moduleResolution` → ESNext / bundler
- [ ] Move `src/assets/` and `src/lib/` → `public/`
- [ ] Move `config.js`, `userAssets.js`, `internalAssets.js` → `public/` (or keep alongside `index.html`)
- [ ] Remove `<base href="../" />` from `index.html`
- [ ] Update `index.html` script tags to reflect new paths (remove `bin/main.js`, keep runtime globals)
- [ ] Check and update any hardcoded `bin/images/...` asset paths
- [ ] Verify `emitDecoratorMetadata` is not needed and remove it
- [ ] Delete `webpack.config.js`
- [ ] Test dev server: `vite` → `http://localhost:5173/?world=empty`
- [ ] Test production build: `vite build` → output in `bin/`

---

## Dev URL Change

| Before | After |
|---|---|
| `http://localhost:8080/bin/?world=empty` | `http://localhost:5173/?world=empty` |

The `/bin/` prefix in the URL goes away since Vite serves from the source root directly.
