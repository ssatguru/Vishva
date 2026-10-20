// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Unit tests for NavBarML DOM structure and behavior.
 *
 * Validates: Requirements 1.1, 1.2, 2.1, 2.2, 2.3, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 7.1, 7.2
 */

import { computeXRButtonState, XRButtonState } from "./XRButtonState";

// ─── Mock Vishva ────────────────────────────────────────────────────────────

vi.mock("../Vishva", () => ({
    Vishva: {
        theme: {
            darkColors: { b: "#333333", f: "#ffffff" },
            lightColors: { b: "#cccccc", f: "#000000" },
        },
    },
}));

// ─── Mock VButton ───────────────────────────────────────────────────────────

vi.mock("./components/VButton", () => ({
    VButton: {
        styleThem: vi.fn(),
    },
}));

// ─── Constants ──────────────────────────────────────────────────────────────

const EXPECTED_BUTTON_IDS = [
    "worldLauncher",
    "downWorld",
    "saveWorld",
    "uploadAsset",
    "navWorldAssets",
    "navAllAssets",
    "navCAssets",
    "navPrim",
    "navEdit",
    "navAV",
    "navEnv",
    "navAddSpawner",
    "navSettings",
    "navEnterVR",
    "navEnterAR",
    "debugLink",
    "helpLink",
    "pauseActuators",
];

const EXPECTED_TITLES = [
    "world launcher",
    "download world",
    "save world to browser",
    "load assets or world",
    "list items in world",
    "all files",
    "curated assets",
    "add primitives",
    "edit",
    "character controller",
    "environment",
    "add spawner",
    "settings",
    "enter VR",
    "enter AR",
    "inspector",
    "help",
    "pause actuators",
];

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("NavBarML - DOM Structure", () => {
    let navBar: any;

    beforeEach(async () => {
        document.body.innerHTML = "";
        const { NavBar } = await import("./NavBarML");
        navBar = new NavBar();

        // Wire up the hamburger toggle (normally done by VishvaGUI._createNavMenu)
        const showNavMenu = document.getElementById("showNavMenu")!;
        const nm = document.getElementById("navMenubar")!;
        showNavMenu.onclick = () => {
            if (nm.style.display === "inline-flex") {
                nm.style.display = "none";
            } else {
                nm.style.display = "inline-flex";
            }
        };
    });

    afterEach(() => {
        document.body.innerHTML = "";
        vi.restoreAllMocks();
    });

    // ─── Requirement 3.1, 3.3: Menu bar contains all buttons by ID ───

    it("should contain all buttons by ID", () => {
        for (const id of EXPECTED_BUTTON_IDS) {
            const btn = document.getElementById(id);
            expect(btn, `Button #${id} should exist`).not.toBeNull();
            expect(btn!.tagName.toLowerCase()).toBe("button");
        }
    });

    // ─── Requirement 3.2: Buttons appear in correct left-to-right order ─

    it("should render buttons in correct left-to-right order", () => {
        const navMenubar = document.getElementById("navMenubar")!;
        // Collect all buttons inside navMenubar (including nested ones)
        const allButtons = navMenubar.querySelectorAll("button");
        const buttonIds = Array.from(allButtons).map((btn) => btn.id);

        // Filter to only the 16 expected buttons (in case there are others)
        const orderedIds = buttonIds.filter((id) => EXPECTED_BUTTON_IDS.includes(id));
        expect(orderedIds).toEqual(EXPECTED_BUTTON_IDS);
    });

    // ─── Requirement 3.4: Button title attributes match expected values ──

    it("should have correct title attributes on all buttons", () => {
        for (let i = 0; i < EXPECTED_BUTTON_IDS.length; i++) {
            const btn = document.getElementById(EXPECTED_BUTTON_IDS[i])!;
            expect(btn.getAttribute("title"), `Title for #${EXPECTED_BUTTON_IDS[i]}`).toBe(
                EXPECTED_TITLES[i]
            );
        }
    });

    // ─── Requirement 3.5: AddMenu is a sibling of navCAssets within a shared parent ─

    it("should have AddMenu as a sibling of navCAssets within a shared parent", () => {
        const navCAssets = document.getElementById("navCAssets")!;
        const addMenu = document.getElementById("AddMenu")!;

        expect(navCAssets).not.toBeNull();
        expect(addMenu).not.toBeNull();

        // They should share the same parent element
        expect(navCAssets.parentElement).toBe(addMenu.parentElement);
        // The parent should not be the navMenubar itself (it's a wrapper div)
        expect(navCAssets.parentElement!.id).not.toBe("navMenubar");
    });

    // ─── Requirement 1.1, 1.2, 2.1: Menu bar has correct CSS ────────────

    it("should have position:fixed, top:0, width:100%", () => {
        const menuBar = document.getElementById("menuBar")!;
        expect(menuBar.style.position).toBe("fixed");
        expect(menuBar.style.top).toBe("0px");
        expect(menuBar.style.width).toBe("100%");
    });

    // ─── Requirement 2.5: Menu bar uses darkColors.b background, darkColors.f foreground ─

    it("should use darkColors.b as background and darkColors.f as foreground", () => {
        const menuBar = document.getElementById("menuBar")!;
        // Now uses CSS custom properties for dynamic theming
        expect(menuBar.style.backgroundColor).toBe("var(--v-dark-bg)");
        expect(menuBar.style.color).toBe("var(--v-dark-fg)");
    });

    // ─── Requirement 2.3: Menu bar has 1px bottom border with lightColors.b ─

    it("should have 1px bottom border with lightColors.b color", () => {
        const menuBar = document.getElementById("menuBar")!;
        // Now uses CSS custom properties for dynamic theming
        expect(menuBar.style.borderBottom).toBe("1px solid var(--v-light-bg)");
    });

    // ─── Requirement 4.1: Hamburger button is first interactive element ──

    it("should have hamburger button as first interactive element", () => {
        const menuBar = document.getElementById("menuBar")!;
        const firstButton = menuBar.querySelector("button");
        expect(firstButton).not.toBeNull();
        expect(firstButton!.id).toBe("showNavMenu");
    });

    // ─── Requirement 4.2: Initial render shows navMenubar visible ────────

    it("should show navMenubar as visible on initial render", () => {
        const navMenubar = document.getElementById("navMenubar")!;
        expect(navMenubar.style.display).toBe("inline-flex");
    });

    // ─── Requirement 4.3, 4.4: Clicking hamburger toggles navMenubar visibility ─

    it("should toggle navMenubar visibility when hamburger is clicked", () => {
        const hamburger = document.getElementById("showNavMenu")!;
        const navMenubar = document.getElementById("navMenubar")!;

        // Initially visible
        expect(navMenubar.style.display).toBe("inline-flex");

        // Click to hide
        hamburger.click();
        expect(navMenubar.style.display).toBe("none");

        // Click to show again
        hamburger.click();
        expect(navMenubar.style.display).toBe("inline-flex");
    });

    // ─── Requirement 4.5: Menu bar remains visible when buttons are hidden ─

    it("should keep menu bar visible when buttons are hidden", () => {
        const hamburger = document.getElementById("showNavMenu")!;
        const menuBar = document.getElementById("menuBar")!;

        // Hide buttons
        hamburger.click();

        // Menu bar itself should still be visible (display:flex)
        expect(menuBar.style.display).toBe("flex");
    });

    // ─── Requirement 7.1: Menu bar z-index > canvas z-index ─────────────

    it("should have menu bar z-index > canvas z-index", () => {
        const menuBar = document.getElementById("menuBar")!;
        const menuBarZIndex = parseInt(menuBar.style.zIndex, 10);

        // Canvas default z-index is 0 (or unset), menu bar should be higher
        expect(menuBarZIndex).toBeGreaterThan(0);
        expect(menuBarZIndex).toBe(999);
    });

    // ─── Requirement 7.2: AddMenu z-index >= menu bar z-index ───────────

    it("should have AddMenu z-index >= menu bar z-index", () => {
        const menuBar = document.getElementById("menuBar")!;
        const addMenu = document.getElementById("AddMenu")!;

        const menuBarZIndex = parseInt(menuBar.style.zIndex, 10);
        const addMenuZIndex = parseInt(addMenu.style.zIndex, 10);

        expect(addMenuZIndex).toBeGreaterThanOrEqual(menuBarZIndex);
        expect(addMenuZIndex).toBe(1000);
    });
});

// ─── XR Enter Buttons: presence + gating logic ──────────────────────────────

/**
 * Mirror of VishvaGUI._applyXRButtonState: apply an XRButtonState to the
 * Enter VR/AR NavBar buttons. A mode's button is shown only when visible, and
 * disabled when not enabled. This is the gating logic under test — kept in sync
 * with the production implementation so the test reflects real behavior.
 *
 * Validates: Requirements 2.2, 2.3
 */
function applyXRButtonState(state: XRButtonState) {
    const navEnterVR = document.getElementById("navEnterVR") as HTMLButtonElement;
    const navEnterAR = document.getElementById("navEnterAR") as HTMLButtonElement;
    if (navEnterVR != null) {
        navEnterVR.style.display = state.vr.visible ? "" : "none";
        navEnterVR.disabled = !state.vr.enabled;
    }
    if (navEnterAR != null) {
        navEnterAR.style.display = state.ar.visible ? "" : "none";
        navEnterAR.disabled = !state.ar.enabled;
    }
}

describe("NavBarML - XR Enter Buttons", () => {
    beforeEach(async () => {
        document.body.innerHTML = "";
        const { NavBar } = await import("./NavBarML");
        new NavBar();
    });

    afterEach(() => {
        document.body.innerHTML = "";
        vi.restoreAllMocks();
    });

    // ─── Requirement 2.1: Enter VR / Enter AR buttons exist with titles ──

    it("should contain #navEnterVR button with title 'enter VR'", () => {
        const btn = document.getElementById("navEnterVR");
        expect(btn, "Button #navEnterVR should exist").not.toBeNull();
        expect(btn!.tagName.toLowerCase()).toBe("button");
        expect(btn!.getAttribute("title")).toBe("enter VR");
    });

    it("should contain #navEnterAR button with title 'enter AR'", () => {
        const btn = document.getElementById("navEnterAR");
        expect(btn, "Button #navEnterAR should exist").not.toBeNull();
        expect(btn!.tagName.toLowerCase()).toBe("button");
        expect(btn!.getAttribute("title")).toBe("enter AR");
    });

    // ─── Requirement 2.1: both XR buttons live inside navMenubar ─────────

    it("should place both XR buttons inside navMenubar", () => {
        const navMenubar = document.getElementById("navMenubar")!;
        const vr = document.getElementById("navEnterVR")!;
        const ar = document.getElementById("navEnterAR")!;
        expect(navMenubar.contains(vr)).toBe(true);
        expect(navMenubar.contains(ar)).toBe(true);
    });

    // ─── Requirement 2.2, 2.3: gating maps computed state to DOM ─────────
    // computeXRButtonState makes a mode visible+enabled iff supported, so the
    // four support combinations exercise every visibility/enabled outcome.

    const cases: Array<{ vrSupported: boolean; arSupported: boolean }> = [
        { vrSupported: true, arSupported: true },
        { vrSupported: true, arSupported: false },
        { vrSupported: false, arSupported: true },
        { vrSupported: false, arSupported: false },
    ];

    for (const support of cases) {
        it(`should gate buttons for vr=${support.vrSupported}, ar=${support.arSupported}`, () => {
            applyXRButtonState(computeXRButtonState(support));

            const vr = document.getElementById("navEnterVR") as HTMLButtonElement;
            const ar = document.getElementById("navEnterAR") as HTMLButtonElement;

            // Requirement 2.2: VR hidden + disabled when unsupported, shown + enabled otherwise.
            expect(vr.style.display).toBe(support.vrSupported ? "" : "none");
            expect(vr.disabled).toBe(!support.vrSupported);

            // Requirement 2.3: AR hidden + disabled when unsupported, shown + enabled otherwise.
            expect(ar.style.display).toBe(support.arSupported ? "" : "none");
            expect(ar.disabled).toBe(!support.arSupported);
        });
    }

    // ─── Requirement 2.2: unsupported VR is never left interactive ───────

    it("should hide and disable #navEnterVR when VR is unsupported", () => {
        applyXRButtonState(computeXRButtonState({ vrSupported: false, arSupported: true }));
        const vr = document.getElementById("navEnterVR") as HTMLButtonElement;
        expect(vr.style.display).toBe("none");
        expect(vr.disabled).toBe(true);
    });

    // ─── Requirement 2.3: unsupported AR is never left interactive ───────

    it("should hide and disable #navEnterAR when AR is unsupported", () => {
        applyXRButtonState(computeXRButtonState({ vrSupported: true, arSupported: false }));
        const ar = document.getElementById("navEnterAR") as HTMLButtonElement;
        expect(ar.style.display).toBe("none");
        expect(ar.disabled).toBe(true);
    });
});
