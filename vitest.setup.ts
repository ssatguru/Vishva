// Vitest setup: provide a `self` global for modules that reference the browser
// global at load time (e.g. babylonjs-editcontrol, pulled in transitively by the
// Vishva/GUI chain) when running under the node test environment. Without this,
// importing such modules throws "ReferenceError: self is not defined" at
// module-load time.
//
// Suites whose import graph also touches DOM-building GUI modules opt into the
// jsdom environment with a `// @vitest-environment jsdom` docblock; jsdom already
// defines `self`, so this shim only takes effect for node-environment suites.
if (typeof (globalThis as any).self === "undefined") {
    (globalThis as any).self = globalThis;
}
