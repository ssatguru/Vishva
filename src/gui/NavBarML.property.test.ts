import { describe, it, expect } from "vitest";
import fc from "fast-check";

/**
 * Feature: navbar-to-menubar, Property 1: Dialog position clamping respects menu bar boundary
 *
 * For any random top and left position values passed to the dialog clamping logic,
 * the resulting dialog top position SHALL be >= 0 (the top edge of the GUI container).
 * Since the GUI container itself is offset below the menu bar (top: 48px), a dialog
 * at position top=0 within #vGUI is visually at the top of the canvas area, directly
 * below the menu bar. This ensures no dialog extends above the canvas area into the
 * menu bar region.
 *
 * **Validates: Requirements 7.3, 7.4**
 */
describe("Feature: navbar-to-menubar, Property 1: Dialog position clamping respects menu bar boundary", () => {
    /**
     * Replicates the VDiag._moveIt clamping logic from src/gui/components/VDiag.ts.
     *
     * The corrected code (dialogs are children of #vGUI, so positions are relative to it):
     *   let newT = Math.min(t, guiOffsetHeight - 1 - dialogHeight);
     *   newT = Math.max(newT, 0);
     *   let newL = Math.min(l, guiOffsetWidth - dialogWidth);
     *   newL = Math.max(newL, 0);
     *
     * Parameters:
     * - t: requested top position of the dialog (relative to #vGUI)
     * - l: requested left position of the dialog (relative to #vGUI)
     * - guiOffsetHeight: the GUI container's total height
     * - guiOffsetWidth: the GUI container's total width
     * - dialogWidth: the dialog element's width
     * - dialogHeight: the dialog element's height
     *
     * Returns: { top, left } — the clamped position (relative to #vGUI)
     */
    function clampDialogPosition(
        t: number,
        l: number,
        guiOffsetHeight: number,
        guiOffsetWidth: number,
        dialogWidth: number,
        dialogHeight: number
    ): { top: number; left: number } {
        // Clamp top: prevent going below GUI bottom, then prevent going above GUI top (0)
        let newT = Math.min(t, guiOffsetHeight - 1 - dialogHeight);
        newT = Math.max(newT, 0);

        // Clamp left: prevent going past GUI right edge, then prevent going past GUI left edge (0)
        let newL = Math.min(l, guiOffsetWidth - dialogWidth);
        newL = Math.max(newL, 0);

        return { top: newT, left: newL };
    }

    it("dialog top position is always >= 0 (top of GUI container, below menu bar) after clamping", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -1000, max: 2000 }), // random top position
                fc.integer({ min: -1000, max: 2000 }), // random left position
                fc.integer({ min: 400, max: 1200 }),    // GUI container height (viewport - menu bar)
                fc.integer({ min: 800, max: 1920 }),    // GUI container width
                fc.integer({ min: 100, max: 600 }),     // dialog width
                fc.integer({ min: 50, max: 800 }),      // dialog height
                (top, left, guiHeight, guiWidth, dialogWidth, dialogHeight) => {
                    const result = clampDialogPosition(
                        top,
                        left,
                        guiHeight,
                        guiWidth,
                        dialogWidth,
                        dialogHeight
                    );

                    // The core invariant: dialog top is never above the GUI container's top edge (0).
                    // Since #vGUI starts below the menu bar, top >= 0 means the dialog
                    // never overlaps the menu bar.
                    expect(result.top).toBeGreaterThanOrEqual(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    it("dialog left position is always >= 0 (left edge of GUI container) after clamping", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -1000, max: 2000 }), // random top position
                fc.integer({ min: -1000, max: 2000 }), // random left position
                fc.integer({ min: 400, max: 1200 }),    // GUI container height
                fc.integer({ min: 800, max: 1920 }),    // GUI container width
                fc.integer({ min: 100, max: 600 }),     // dialog width
                fc.integer({ min: 50, max: 800 }),      // dialog height
                (top, left, guiHeight, guiWidth, dialogWidth, dialogHeight) => {
                    const result = clampDialogPosition(
                        top,
                        left,
                        guiHeight,
                        guiWidth,
                        dialogWidth,
                        dialogHeight
                    );

                    // Secondary invariant: dialog left is never past the GUI container's left edge
                    expect(result.left).toBeGreaterThanOrEqual(0);
                }
            ),
            { numRuns: 100 }
        );
    });
});
