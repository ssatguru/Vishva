# Implementation Plan: Navbar to Menubar

## Overview

Convert the existing floating navbar into a fixed menu bar above the canvas. The implementation proceeds in layers: constants first, then HTML/CSS restructuring of the navbar, then layout offset logic in VishvaGUI, and finally wiring up resize handling. Tests validate DOM structure and the dialog clamping invariant.

## Tasks

- [x] 1. Add MENU_BAR_HEIGHT constant to UIConst
  - [x] 1.1 Add the MENU_BAR_HEIGHT static property to UIConst class
    - Open `src/gui/UIConst.ts` and add `public static MENU_BAR_HEIGHT: number = 48;` to the `UIConst` class
    - This constant is used as a fallback reference value for the menu bar height
    - _Requirements: 1.1, 2.4_

- [x] 2. Rewrite NavBarML to produce a fixed menu bar
  - [x] 2.1 Replace the floating nav HTML template with a fixed menu bar layout
    - Open `src/gui/NavBarML.ts`
    - Remove the outer wrapper `<div>` with `z-index: 999` and the nested absolutely-positioned `<nav>`
    - Replace with a `<div id="menuBar">` using `position:fixed; top:0; left:0; width:100%; z-index:999; display:flex; align-items:center; padding:0 0.5em; height:48px; box-sizing:border-box`
    - Apply theme colors: `darkColors.b` background, `darkColors.f` foreground, `lightColors.b` 1px bottom border
    - Include the hamburger button (`#showNavMenu`) as the first element
    - Include `<nav id="navMenubar">` with `display:inline-flex; align-items:center; flex-wrap:nowrap` containing all 16 buttons in order
    - Wrap `#navCAssets` and `#AddMenu` in a shared parent div with `position:relative; display:inline-block`
    - Set `#AddMenu` to `display:none; position:absolute; top:100%; left:0; z-index:1000`
    - Preserve all existing button IDs and title attributes
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 6.1, 6.2, 7.1, 7.2_

  - [x] 2.2 Update the NavBar constructor to append the menu bar as the first child of body
    - Ensure the menu bar element is inserted before `#vGUI` and `#vCanvas` in the DOM
    - Verify the hamburger toggle logic still toggles `#navMenubar` between `display: inline-flex` and `display: none`
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

- [x] 3. Update index.html styles for canvas and GUI container offset
  - [x] 3.1 Modify `#vGUI` and `#vCanvas` inline styles in index.html
    - Set both elements to `position:absolute; top:48px; width:100%; height:calc(100% - 48px)`
    - This provides the initial layout before JavaScript runs; the JS resize handler will refine using actual `menuBar.offsetHeight`
    - _Requirements: 1.3, 1.4_

- [x] 4. Implement layout synchronization in VishvaGUI
  - [x] 4.1 Add resize logic in VishvaGUI constructor to sync canvas/GUI offset with menu bar height
    - After the menu bar is appended, get a reference to `document.getElementById("menuBar")`
    - Create an `updateLayout` function that reads `menuBar.offsetHeight` (with fallback to `UIConst.MENU_BAR_HEIGHT` if 0)
    - Set `Vishva.gui.style.top` and `canvas.style.top` to the menu bar height
    - Set `Vishva.gui.style.height` and `canvas.style.height` to `calc(100% - ${h}px)`
    - Call `updateLayout()` immediately after menu bar insertion
    - Register `updateLayout` on `window.addEventListener("resize", ...)`
    - Add defensive null check: if `menuBar` is null, skip layout offset (full-viewport fallback)
    - _Requirements: 1.2, 1.3, 1.4, 5.1, 5.2, 7.3, 7.4_

- [x] 5. Checkpoint - Verify build and basic layout
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Write tests for menu bar DOM structure and behavior
  - [x] 6.1 Write unit tests for NavBarML DOM structure
    - Create `src/gui/NavBarML.test.ts`
    - Test: menu bar contains all 16 buttons by ID
    - Test: buttons appear in correct left-to-right order
    - Test: button title attributes match expected values
    - Test: AddMenu is a sibling of navCAssets within a shared parent
    - Test: menu bar has correct CSS (position:fixed, top:0, width:100%)
    - Test: menu bar uses darkColors.b background, darkColors.f foreground
    - Test: menu bar has 1px bottom border with lightColors.b color
    - Test: hamburger button is first interactive element
    - Test: initial render shows navMenubar visible
    - Test: clicking hamburger toggles navMenubar visibility
    - Test: menu bar remains visible when buttons are hidden
    - Test: menu bar z-index > canvas z-index
    - Test: AddMenu z-index >= menu bar z-index
    - _Requirements: 1.1, 1.2, 2.1, 2.3, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 7.1, 7.2_

  - [x] 6.2 Write property test for dialog clamping invariant
    - Create `src/gui/NavBarML.property.test.ts`
    - Use fast-check to generate random `(top, left)` coordinate pairs and random GUI container offsets (simulating menu bar heights 36–48px)
    - Extract or replicate the VDiag `_moveIt` clamping logic
    - Assert: resulting dialog top position >= GUI container's top offset (menu bar height)
    - Minimum 100 iterations
    - Tag: `Feature: navbar-to-menubar, Property 1: Dialog position clamping respects menu bar boundary`
    - **Property 1: Dialog position clamping respects menu bar boundary**
    - **Validates: Requirements 7.3, 7.4**

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The property test validates the universal correctness property that dialogs never overlap the menu bar
- Unit tests validate specific DOM structure examples and edge cases
- VDiag clamping requires no code change — the existing logic uses `Vishva.gui.offsetTop` which will naturally reflect the new layout
- `engine.resize()` is already called in `Vishva.onWindowResize` — no additional code needed there

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "3.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["4.1"] },
    { "id": 4, "tasks": ["6.1", "6.2"] }
  ]
}
```
