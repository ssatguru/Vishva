// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from "vitest";
import fc from "fast-check";
import { VTree } from "./VTree";

/**
 * Feature: sensor-mesh-contact, Property 5: VTree parenthesized label behavior
 *
 * For any tree data containing a mix of parenthesized and non-parenthesized leaf labels,
 * VTree SHALL:
 *   (a) apply greyed-out styling (opacity: 0.5, pointer-events: none) to parenthesized labels
 *   (b) not invoke the click listener when a parenthesized label is clicked
 *   (c) invoke the click listener normally when a non-parenthesized label is clicked
 *
 * **Validates: Requirements 5.1, 5.2, 5.4**
 */
describe("Feature: sensor-mesh-contact, Property 5: VTree parenthesized label behavior", () => {

    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        container.id = "test-tree-container";
        document.body.appendChild(container);
    });

    // Generator for a non-parenthesized leaf label (does not start with '(' AND end with ')')
    // Uses alphanumeric chars to avoid jsdom innerText edge cases
    const nonParenLabel = fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9 ,._-]{0,20}$/)
        .filter(s => s.length > 0 && !(s.startsWith("(") && s.endsWith(")")));

    // Generator for a parenthesized leaf label: starts with '(' and ends with ')'
    const parenLabel = fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9 ,._-]{0,18}$/)
        .filter(s => s.length > 0)
        .map(s => "(" + s + ")");

    // Generator for tree data with a guaranteed mix of parenthesized and non-parenthesized leaves
    const mixedTreeData = fc.tuple(
        fc.array(nonParenLabel, { minLength: 1, maxLength: 5 }),
        fc.array(parenLabel, { minLength: 1, maxLength: 5 })
    ).map(([normals, parens]) => {
        // Interleave them
        const result: string[] = [];
        const maxLen = Math.max(normals.length, parens.length);
        for (let i = 0; i < maxLen; i++) {
            if (i < normals.length) result.push(normals[i]);
            if (i < parens.length) result.push(parens[i]);
        }
        return result;
    });

    it("(a) parenthesized leaf nodes have opacity 0.5 and pointer-events none", () => {
        fc.assert(
            fc.property(mixedTreeData, (treeData) => {
                container.innerHTML = "";
                const tree = new VTree(container, treeData);

                const leafLis = container.querySelectorAll("li.treeFile");
                for (let i = 0; i < leafLis.length; i++) {
                    const li = leafLis[i] as HTMLLIElement;
                    const txtSpan = li.querySelector("span.txt") as HTMLSpanElement;
                    // Use innerText because VTree sets text via innerText (textContent is empty in jsdom)
                    const text = txtSpan?.innerText ?? "";
                    const isParenthesized = text.startsWith("(") && text.endsWith(")");

                    if (isParenthesized) {
                        expect(li.style.opacity).toBe("0.5");
                        expect(li.style.pointerEvents).toBe("none");
                    }
                }
            }),
            { numRuns: 100 }
        );
    });

    it("(b) clicking a parenthesized leaf does not invoke the click listener", () => {
        fc.assert(
            fc.property(mixedTreeData, (treeData) => {
                container.innerHTML = "";
                const tree = new VTree(container, treeData);

                let clickedLeaf: string | null = null;
                tree.addClickListener((leaf, path, isLeaf) => {
                    clickedLeaf = leaf;
                });

                // Find all parenthesized leaf nodes and simulate a click on their text span
                const leafLis = container.querySelectorAll("li.treeFile");
                for (let i = 0; i < leafLis.length; i++) {
                    const li = leafLis[i] as HTMLLIElement;
                    const txtSpan = li.querySelector("span.txt") as HTMLSpanElement;
                    const text = txtSpan?.innerText ?? "";

                    if (text.startsWith("(") && text.endsWith(")")) {
                        clickedLeaf = null;
                        // Simulate click event on the text span
                        // Note: in jsdom, pointer-events:none does NOT block event dispatch,
                        // but VTree._treeClick checks the label text and returns early
                        const event = new MouseEvent("click", { bubbles: true });
                        txtSpan.dispatchEvent(event);
                        // The click listener should NOT have been invoked
                        expect(clickedLeaf).toBeNull();
                    }
                }
            }),
            { numRuns: 100 }
        );
    });

    it("(c) clicking a non-parenthesized leaf invokes the click listener", () => {
        fc.assert(
            fc.property(mixedTreeData, (treeData) => {
                container.innerHTML = "";
                const tree = new VTree(container, treeData);

                let clickedLeaf: string | null = null;
                tree.addClickListener((leaf, path, isLeaf) => {
                    clickedLeaf = leaf;
                });

                // Find all non-parenthesized leaf nodes and simulate a click on their text span
                const leafLis = container.querySelectorAll("li.treeFile");
                for (let i = 0; i < leafLis.length; i++) {
                    const li = leafLis[i] as HTMLLIElement;
                    const txtSpan = li.querySelector("span.txt") as HTMLSpanElement;
                    const text = txtSpan?.innerText ?? "";

                    if (!(text.startsWith("(") && text.endsWith(")"))) {
                        clickedLeaf = null;
                        // Simulate click event on the text span
                        const event = new MouseEvent("click", { bubbles: true });
                        txtSpan.dispatchEvent(event);
                        // The click listener SHOULD have been invoked
                        expect(clickedLeaf).not.toBeNull();
                    }
                }
            }),
            { numRuns: 100 }
        );
    });
});
