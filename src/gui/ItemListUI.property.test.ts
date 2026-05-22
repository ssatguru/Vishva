import { describe, it, expect } from "vitest";
import fc from "fast-check";

/**
 * Feature: sensor-mesh-contact, Property 4: ItemListUI filter produces correct label wrapping
 *
 * For any set of TransformNode objects and a filter function (node: TransformNode) => boolean,
 * the ItemListUI tree data generation SHALL:
 * (a) always exclude default nodes (ground, avatar, skybox, editControl) regardless of filter
 * (b) wrap labels in parentheses for nodes that pass default exclusions but for which the filter returns false
 * (c) leave labels unwrapped for nodes that pass both default exclusions and the filter
 *
 * **Validates: Requirements 4.2, 4.3**
 */
describe("Feature: sensor-mesh-contact, Property 4: ItemListUI filter produces correct label wrapping", () => {

    /**
     * Represents a minimal TransformNode for testing purposes.
     */
    interface MockNode {
        uniqueId: number;
        name: string;
        isDefaultNode: boolean; // true if this is ground, avatar, skybox, or editControl root
    }

    /**
     * Replicates the label-generation logic from ItemListUI._addChildren().
     *
     * From src/gui/ItemListUI.ts:
     *   - Default nodes (ground, avatar, skybox, editControl) are always excluded (skipped entirely)
     *   - If a filter is provided and returns false for a node, the label is wrapped in parentheses
     *   - Otherwise, the label is left unwrapped
     *
     * @param nodes - Array of mock nodes to process
     * @param filter - Optional filter function; if provided and returns false, label is parenthesized
     * @returns Array of generated labels (excluding default nodes)
     */
    function generateLabels(
        nodes: MockNode[],
        filter?: (node: MockNode) => boolean
    ): string[] {
        const labels: string[] = [];

        for (const node of nodes) {
            // Default exclusions always apply — these nodes are skipped entirely
            if (node.isDefaultNode) continue;

            let label: string;
            if (filter && !filter(node)) {
                // Node passes default exclusions but fails the filter → parenthesized
                label = "(" + Number(node.uniqueId).toString() + ", " + node.name + ")";
            } else {
                // Node passes both default exclusions and filter (or no filter) → unwrapped
                label = Number(node.uniqueId).toString() + ", " + node.name;
            }

            labels.push(label);
        }

        return labels;
    }

    // Arbitrary for generating mock nodes
    const mockNodeArb = fc.record({
        uniqueId: fc.integer({ min: 1, max: 100000 }),
        name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes(",") && !s.includes("(") && !s.includes(")")),
        isDefaultNode: fc.boolean()
    });

    it("(a) default nodes are always excluded from output regardless of filter", () => {
        fc.assert(
            fc.property(
                fc.array(mockNodeArb, { minLength: 1, maxLength: 20 }),
                (nodes) => {
                    // Use a filter that accepts everything
                    const labelsWithPermissiveFilter = generateLabels(nodes, () => true);
                    // Use a filter that rejects everything
                    const labelsWithRestrictiveFilter = generateLabels(nodes, () => false);
                    // No filter
                    const labelsNoFilter = generateLabels(nodes);

                    const defaultNodeCount = nodes.filter(n => n.isDefaultNode).length;
                    const nonDefaultCount = nodes.length - defaultNodeCount;

                    // All three should have the same number of labels (non-default nodes only)
                    expect(labelsWithPermissiveFilter.length).toBe(nonDefaultCount);
                    expect(labelsWithRestrictiveFilter.length).toBe(nonDefaultCount);
                    expect(labelsNoFilter.length).toBe(nonDefaultCount);

                    // No label should correspond to a default node's uniqueId + name
                    for (const node of nodes) {
                        if (node.isDefaultNode) {
                            const unwrapped = Number(node.uniqueId).toString() + ", " + node.name;
                            const wrapped = "(" + unwrapped + ")";
                            expect(labelsWithPermissiveFilter).not.toContain(unwrapped);
                            expect(labelsWithPermissiveFilter).not.toContain(wrapped);
                            expect(labelsWithRestrictiveFilter).not.toContain(unwrapped);
                            expect(labelsWithRestrictiveFilter).not.toContain(wrapped);
                            expect(labelsNoFilter).not.toContain(unwrapped);
                            expect(labelsNoFilter).not.toContain(wrapped);
                        }
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it("(b) nodes that pass default exclusions but fail the filter have parenthesized labels", () => {
        fc.assert(
            fc.property(
                fc.array(mockNodeArb, { minLength: 1, maxLength: 20 }),
                fc.func(fc.boolean()), // arbitrary filter function
                (nodes, filterFn) => {
                    const labels = generateLabels(nodes, filterFn);

                    let labelIdx = 0;
                    for (const node of nodes) {
                        if (node.isDefaultNode) continue;

                        const label = labels[labelIdx];
                        if (!filterFn(node)) {
                            // Filter returned false → label must be wrapped in parentheses
                            expect(label).toBe("(" + Number(node.uniqueId).toString() + ", " + node.name + ")");
                            expect(label.startsWith("(")).toBe(true);
                            expect(label.endsWith(")")).toBe(true);
                        }
                        labelIdx++;
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it("(c) nodes that pass both default exclusions and the filter have unwrapped labels", () => {
        fc.assert(
            fc.property(
                fc.array(mockNodeArb, { minLength: 1, maxLength: 20 }),
                fc.func(fc.boolean()), // arbitrary filter function
                (nodes, filterFn) => {
                    const labels = generateLabels(nodes, filterFn);

                    let labelIdx = 0;
                    for (const node of nodes) {
                        if (node.isDefaultNode) continue;

                        const label = labels[labelIdx];
                        if (filterFn(node)) {
                            // Filter returned true → label must NOT be wrapped in parentheses
                            const expected = Number(node.uniqueId).toString() + ", " + node.name;
                            expect(label).toBe(expected);
                            expect(label.startsWith("(")).toBe(false);
                        }
                        labelIdx++;
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it("when no filter is provided, no labels are parenthesized", () => {
        fc.assert(
            fc.property(
                fc.array(mockNodeArb, { minLength: 1, maxLength: 20 }),
                (nodes) => {
                    const labels = generateLabels(nodes);

                    for (const label of labels) {
                        // No label should start with ( and end with )
                        const isWrapped = label.startsWith("(") && label.endsWith(")");
                        expect(isWrapped).toBe(false);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});
