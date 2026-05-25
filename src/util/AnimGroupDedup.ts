import { AnimationGroup, Node, Scene, TransformNode } from "babylonjs";

/**
 * Metadata entry recording that a character shares animations with a source.
 * Stored in VishvaSerialized.animationSharing (serialized form with string IDs).
 */
export interface AnimationSharingEntry {
    /** ID of the root mesh of the character that shares (c2, c3, etc.) */
    meshId: string;
    /** ID of the root mesh of the character that owns the canonical animations (c1) */
    sourceMeshId: string;
}

/**
 * Runtime sharing entry that holds Node references instead of string IDs.
 * This avoids the problem of mesh IDs being renamed (by renameMeshIds) after
 * the sharing metadata is recorded. IDs are resolved at save time from the
 * live node references.
 */
export interface RuntimeSharingEntry {
    /** The root mesh node of the character that shares */
    mesh: Node;
    /** The root mesh node of the character that owns the canonical animations */
    sourceMesh: Node;
}

/**
 * Converts runtime sharing entries (with Node references) to serializable
 * AnimationSharingEntry objects (with current string IDs).
 * Call this at save time, AFTER renameMeshIds has run, to get correct IDs.
 */
export function resolveRuntimeEntries(entries: RuntimeSharingEntry[]): AnimationSharingEntry[] {
    if (!entries || entries.length === 0) return [];
    return entries.map(e => ({
        meshId: e.mesh.id,
        sourceMeshId: e.sourceMesh.id,
    }));
}

/**
 * Serialized scene structure (subset relevant to animation groups).
 */
export interface SerializedAnimationGroup {
    name: string;
    from: number;
    to: number;
    targetedAnimations: SerializedTargetedAnimation[];
}

export interface SerializedTargetedAnimation {
    animation: { name: string; [key: string]: any };
    targetId: string;
}

export interface SerializedScene {
    animationGroups?: SerializedAnimationGroup[];
    [key: string]: any;
}

/**
 * Determines whether two animation groups are duplicates.
 * 
 * Two animation groups are duplicates if and only if:
 * 1. They have the same name (exact string match)
 * 2. They have the same set of (target node name, animation name) pairs
 *    across their targeted animations (order-independent, exact string matching)
 * 
 * Empty or missing targetedAnimations arrays are treated as empty sets.
 * This is a pure function with no side effects.
 */
export function areAnimationGroupsDuplicates(a: AnimationGroup, b: AnimationGroup): boolean {
    // Names must match exactly
    if (a.name !== b.name) {
        return false;
    }

    // Get targeted animations, treating missing/empty as empty arrays
    const aTAs = a.targetedAnimations || [];
    const bTAs = b.targetedAnimations || [];

    // Different number of targeted animations means different sets
    if (aTAs.length !== bTAs.length) {
        return false;
    }

    // Build set of (target node name, animation name) pairs for each group
    // Using a string key "targetNodeName\0animationName" for set comparison
    const buildPairSet = (tas: typeof aTAs): Set<string> => {
        const set = new Set<string>();
        for (const ta of tas) {
            const targetName = ta.target?.name ?? "";
            const animName = ta.animation?.name ?? "";
            set.add(targetName + "\0" + animName);
        }
        return set;
    };

    const aSet = buildPairSet(aTAs);
    const bSet = buildPairSet(bTAs);

    // Sets must be equal (same size already checked via array length,
    // but duplicates within a group could cause set size to differ)
    if (aSet.size !== bSet.size) {
        return false;
    }

    // Every pair in A must exist in B
    for (const pair of aSet) {
        if (!bSet.has(pair)) {
            return false;
        }
    }

    return true;
}

/**
 * Walks up the parent chain to find the topmost TransformNode/Mesh (root).
 * Returns the node itself if it has no parent.
 */
export function getRootMesh(node: Node): Node {
    if (node.parent == null) {
        return node;
    }
    return getRootMesh(node.parent);
}

/**
 * Recursively searches the subtree of `root` for a node with the given name.
 * Returns the first matching node found, or null if not found.
 * Checks the root itself first, then searches children recursively.
 */
export function findNodeInHierarchy(root: Node, nodeName: string): Node | null {
    if (root.name === nodeName) {
        return root;
    }

    const children = root.getChildren(null, false);
    for (const child of children) {
        const found = findNodeInHierarchy(child, nodeName);
        if (found) {
            return found;
        }
    }

    return null;
}

/**
 * Checks whether a node (found by ID in the live scene) belongs to the
 * hierarchy rooted at the given root node.
 * Walks up the parent chain from the node to see if it reaches the root.
 */
function isNodeInHierarchy(node: Node, root: Node): boolean {
    let current: Node = node;
    while (current != null) {
        if (current === root) {
            return true;
        }
        current = current.parent;
    }
    return false;
}

/**
 * Save-time stripping: Given a serialized scene object and runtime sharing entries,
 * remove animation groups that belong to sharing characters.
 * 
 * Uses the live Node references in RuntimeSharingEntry to determine which animation
 * groups belong to sharing characters by checking if their target nodes are within
 * the sharing character's hierarchy.
 * 
 * Since SceneSerializer.Serialize produces animationGroups in the same order as
 * scene.animationGroups, we identify which live animation groups belong to sharing
 * characters and remove the corresponding entries from the serialized array by index.
 * 
 * Source characters' animation groups are never removed.
 * Returns the number of animation groups removed.
 */
export function stripSharedAnimationGroups(
    sceneObj: SerializedScene,
    runtimeEntries: RuntimeSharingEntry[],
    scene: Scene
): number {
    // Handle missing/undefined/empty animationGroups gracefully
    if (!sceneObj.animationGroups || sceneObj.animationGroups.length === 0) {
        return 0;
    }

    if (!runtimeEntries || runtimeEntries.length === 0) {
        return 0;
    }

    // Collect sharing character root nodes from the runtime entries
    const sharingRoots: Node[] = runtimeEntries.map(e => e.mesh);

    // Determine which live animation groups belong to sharing characters.
    // An animation group belongs to a sharing character if ANY of its
    // targetedAnimations[].target is within a sharing character's hierarchy.
    const liveAGs = scene.animationGroups;
    const indicesToRemove = new Set<number>();

    for (let i = 0; i < liveAGs.length; i++) {
        const ag = liveAGs[i];
        const tas = ag.targetedAnimations;
        if (!tas || tas.length === 0) {
            continue;
        }

        for (const ta of tas) {
            if (!ta.target) continue;

            for (const sharingRoot of sharingRoots) {
                if (isNodeInHierarchy(ta.target, sharingRoot)) {
                    indicesToRemove.add(i);
                    break;
                }
            }
            if (indicesToRemove.has(i)) break;
        }
    }

    if (indicesToRemove.size === 0) {
        return 0;
    }

    // Remove the corresponding entries from the serialized animationGroups array.
    // The serialized array is in the same order as scene.animationGroups.
    sceneObj.animationGroups = sceneObj.animationGroups.filter((_, idx) => !indicesToRemove.has(idx));

    return indicesToRemove.size;
}

/**
 * Runtime deduplication: Given a scene, detect duplicate animation groups
 * and share Animation objects from the canonical (first-found) group.
 * Returns the sharing metadata entries discovered.
 *
 * Groups are identified as duplicates by their signature:
 * name + "\0" + sorted pairs of (targetNodeName + "\0" + animationName)
 *
 * For each set of duplicates:
 * - The first-found group is canonical (source)
 * - Non-canonical groups have their Animation object references replaced
 *   with the canonical group's Animation objects (matched by animation name)
 * - If an animation name in a non-canonical group has no match in the canonical
 *   group, that targeted animation is skipped (warning logged)
 *
 * Idempotent: if Animation objects are already shared (same reference),
 * produces the same metadata without additional changes.
 *
 * Does NOT remove any AnimationGroup objects from the scene.
 */
export function deduplicateAtRuntime(scene: Scene): RuntimeSharingEntry[] {
    const animationGroups = scene.animationGroups;
    if (!animationGroups || animationGroups.length === 0) {
        return [];
    }

    // Build signature for each animation group
    const getSignature = (ag: AnimationGroup): string => {
        const tas = ag.targetedAnimations || [];
        const pairs: string[] = [];
        for (const ta of tas) {
            const targetName = ta.target?.name ?? "";
            const animName = ta.animation?.name ?? "";
            pairs.push(targetName + "\0" + animName);
        }
        pairs.sort();
        return ag.name + "\0" + pairs.join("\0");
    };

    // Group animation groups by signature
    const signatureMap = new Map<string, AnimationGroup[]>();
    for (const ag of animationGroups) {
        const sig = getSignature(ag);
        let list = signatureMap.get(sig);
        if (!list) {
            list = [];
            signatureMap.set(sig, list);
        }
        list.push(ag);
    }

    // For each set of duplicates, share Animation objects from the canonical group
    const sharingEntries: RuntimeSharingEntry[] = [];
    // Track which root mesh pairs we've already recorded to avoid duplicate entries
    const recordedPairs = new Set<string>();

    for (const [, groups] of signatureMap) {
        if (groups.length < 2) {
            continue;
        }

        const canonical = groups[0];
        // Determine root mesh for the canonical group
        const canonicalFirstTarget = canonical.targetedAnimations?.[0]?.target;
        if (!canonicalFirstTarget) {
            continue;
        }
        const canonicalRoot = getRootMesh(canonicalFirstTarget);

        // Build a map of animation name -> Animation object from the canonical group
        const canonicalAnimMap = new Map<string, any>();
        for (const ta of canonical.targetedAnimations) {
            if (ta.animation) {
                canonicalAnimMap.set(ta.animation.name, ta.animation);
            }
        }

        // Process non-canonical groups
        for (let i = 1; i < groups.length; i++) {
            const dupGroup = groups[i];
            const dupFirstTarget = dupGroup.targetedAnimations?.[0]?.target;
            if (!dupFirstTarget) {
                continue;
            }
            const dupRoot = getRootMesh(dupFirstTarget);

            // Replace Animation object references with canonical ones
            for (const ta of dupGroup.targetedAnimations) {
                if (!ta.animation) {
                    continue;
                }
                const canonicalAnim = canonicalAnimMap.get(ta.animation.name);
                if (canonicalAnim) {
                    // Only replace if not already the same reference (idempotence)
                    if (ta.animation !== canonicalAnim) {
                        ta.animation = canonicalAnim;
                    }
                } else {
                    console.warn(
                        `[AnimGroupDedup] deduplicateAtRuntime: No matching animation name "${ta.animation.name}" in canonical group "${canonical.name}" — skipping.`
                    );
                }
            }

            // Record sharing metadata (one entry per unique root mesh pair)
            // Use node references for stability across ID renames
            const pairKey = dupRoot.id + "\0" + canonicalRoot.id;
            if (!recordedPairs.has(pairKey)) {
                recordedPairs.add(pairKey);
                sharingEntries.push({
                    mesh: dupRoot,
                    sourceMesh: canonicalRoot,
                });
            }
        }
    }

    return sharingEntries;
}

/**
 * Load-time restoration: Given a scene and sharing metadata from VishvaSerialized,
 * shallow-clone the source character's animation groups for each sharing character.
 *
 * For each sharing entry:
 * - Find the source character's root mesh by sourceMeshId
 * - Find the sharing character's root mesh by meshId
 * - Identify which animation groups belong to the source character
 * - For each source animation group, create a new AnimationGroup with the same name
 * - For each targetedAnimation in the source group:
 *   - Find the corresponding node in the sharing character's hierarchy by matching target node name
 *   - Add a targeted animation with target = sharing character's node and animation = source's Animation object (shared reference, NOT cloned)
 *   - Skip targetedAnimations where the target node cannot be found (log warning)
 * - The new AnimationGroup is automatically added to the scene via the constructor
 *
 * Returns the count of animation groups created.
 *
 * Error handling:
 * - Source mesh not found: skip entry, log warning
 * - Sharing mesh not found: skip entry, log warning
 * - Source has no animation groups: skip entry, log warning
 */
export function restoreSharedAnimationGroups(
    scene: Scene,
    sharingEntries: AnimationSharingEntry[]
): number {
    if (!sharingEntries || sharingEntries.length === 0) {
        return 0;
    }

    let createdCount = 0;

    for (const entry of sharingEntries) {
        // Find source character's root mesh
        const sourceRoot = scene.getMeshById(entry.sourceMeshId) || scene.getTransformNodeById(entry.sourceMeshId);
        if (!sourceRoot) {
            console.warn(
                `[AnimGroupDedup] restoreSharedAnimationGroups: source root mesh not found for ID "${entry.sourceMeshId}" — skipping entry.`
            );
            continue;
        }

        // Find sharing character's root mesh
        const sharingRoot = scene.getMeshById(entry.meshId) || scene.getTransformNodeById(entry.meshId);
        if (!sharingRoot) {
            console.warn(
                `[AnimGroupDedup] restoreSharedAnimationGroups: sharing root mesh not found for ID "${entry.meshId}" — skipping entry.`
            );
            continue;
        }

        // Identify animation groups belonging to the source character.
        // An animation group belongs to the source if any of its targeted animation
        // targets are nodes within the source character's hierarchy.
        const sourceAGs: AnimationGroup[] = [];
        const allNodes = sourceRoot.getChildren((n) => n instanceof TransformNode, false) as Node[];
        // Include the root itself
        allNodes.push(sourceRoot);

        for (const ag of scene.animationGroups) {
            const tas = ag.targetedAnimations;
            if (!tas || tas.length === 0) {
                continue;
            }
            for (const ta of tas) {
                if (ta.target && allNodes.indexOf(ta.target) > -1) {
                    sourceAGs.push(ag);
                    break;
                }
            }
        }

        if (sourceAGs.length === 0) {
            console.warn(
                `[AnimGroupDedup] restoreSharedAnimationGroups: source character "${entry.sourceMeshId}" has no animation groups — skipping entry.`
            );
            continue;
        }

        // For each source animation group, create a new one for the sharing character
        for (const sourceAG of sourceAGs) {
            // Create new AnimationGroup with same name — constructor auto-registers with scene
            const newAG = new AnimationGroup(sourceAG.name, scene);

            for (const ta of sourceAG.targetedAnimations) {
                if (!ta.target) {
                    continue;
                }

                const targetNodeName = ta.target.name;

                // Find corresponding node in sharing character's hierarchy
                const sharingNode = findNodeInHierarchy(sharingRoot, targetNodeName);
                if (!sharingNode) {
                    console.warn(
                        `[AnimGroupDedup] restoreSharedAnimationGroups: target node "${targetNodeName}" not found in sharing character "${entry.meshId}" hierarchy — skipping targeted animation.`
                    );
                    continue;
                }

                // Add targeted animation with shared Animation object reference (NOT cloned)
                newAG.addTargetedAnimation(ta.animation, sharingNode);
            }

            createdCount++;
        }
    }

    return createdCount;
}
