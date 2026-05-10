# Tech Stack & Build System

## Language & Runtime
- TypeScript (target: ES2017), compiled via `ts-loader`
- Runs in the browser (DOM + WebGL)

## Core Libraries
- **BabylonJS v8.47** — 3D engine (core, GUI, loaders, materials, serializers)
- **babylonjs-charactercontroller** — Third-person character controller for the avatar
- **babylonjs-editcontrol** — Gizmo-based transform controls for mesh editing
- **Oimo.js** — Physics engine
- **Cannon.js** — Alternative physics engine (available but not primary)
- **W3.CSS** — Lightweight CSS framework for the editor UI (no React/Vue/Angular)

## Build System
- **Webpack 5** with `webpack-dev-server`
- Entry point: `src/index.ts` + `src/index.html`
- Output: `bin/` directory (bundled `main.js` + assets)
- Loaders: `ts-loader`, `css-loader`, `style-loader`, `file-loader`
- Assets from `src/assets/` and `src/lib/` are copied to `bin/` via `copy-webpack-plugin`
- `terser-webpack-plugin` available for production minification

## TypeScript Config
- `module`: node16, `moduleResolution`: node16
- `noImplicitAny`: false, `strictNullChecks`: false
- Decorators enabled (`experimentalDecorators`, `emitDecoratorMetadata`)
- `allowSyntheticDefaultImports`: true

## Test Framework
- **Vitest 4.1.5** — Test runner (configured for node environment)
- **fast-check 4.7.0** — Property-based testing library
- Config: `vitest.config.ts` includes `src/**/*.test.ts`
- Property tests use `*.property.test.ts` naming convention
- Run tests: `npm test` (executes `vitest --run`)

## Common Commands
```bash
npm install          # Install dependencies
npm run dev          # Start webpack-dev-server at http://localhost:8080 (hot reload)
npm run build        # Production build to bin/
npm test             # Run unit and property tests via Vitest
```

To open an empty world during dev: `http://localhost:8080/bin/?world=empty`
