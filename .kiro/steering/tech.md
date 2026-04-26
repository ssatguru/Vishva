# Tech Stack & Build System

## Language & Runtime
- TypeScript (target: ES2017), compiled via `ts-loader`
- Runs in the browser (DOM + WebGL)

## Core Libraries
- **BabylonJS v8.47** — 3D engine (core, GUI, loaders, materials, serializers)
- **babylonjs-charactercontroller** — Third-person character controller for the avatar
- **babylonjs-editcontrol** — Gizmo-based transform controls for mesh editing
- **Oimo.js** — Physics engine
- **W3.CSS** — Lightweight CSS framework for the editor UI (no React/Vue/Angular)

## Build System
- **Webpack 5** with `webpack-dev-server`
- Entry point: `src/index.ts` + `src/index.html`
- Output: `bin/` directory (bundled `main.js` + assets)
- Loaders: `ts-loader`, `css-loader`, `style-loader`, `file-loader`
- Assets from `src/assets/` and `src/lib/` are copied to `bin/` via `copy-webpack-plugin`

## TypeScript Config
- `module`: node16, `moduleResolution`: node16
- `noImplicitAny`: false, `strictNullChecks`: false
- Decorators enabled (`experimentalDecorators`, `emitDecoratorMetadata`)

## Common Commands
```bash
npm install          # Install dependencies
npm run dev          # Start webpack-dev-server at http://localhost:8080 (hot reload)
npm run build        # Production build to bin/
```

To open an empty world during dev: `http://localhost:8080/bin/?world=empty`

## No Test Framework
There is currently no test runner or test suite configured in this project.
