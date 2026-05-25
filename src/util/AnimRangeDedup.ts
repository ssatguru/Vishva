import { AbstractMesh, Scene } from "babylonjs";
import { Skeleton } from "babylonjs/Bones/skeleton";
import { AnimUtils } from "./AnimUtils";

// ─── Interfaces ───

/**
 * Metadata entry recording that a character's skeleton shares bone animations
 * with a source skeleton. Stored in VishvaSerialized.animationRangeSharing
 * (serialized form with string IDs).
 */
export interface AnimRangeSharingEntry {
    /** ID of the sharing character's skeleton */
    skeletonId: string;
    /** ID of the source character's skeleton */
    sourceSkeletonId: string;
}

/**
 * Runtime sharing entry that holds Skeleton references instead of string IDs.
 * This avoids the problem of skeleton IDs being renamed after the sharing
 * metadata is recorded. IDs are resolved at save time from the live references.
 */
export interface RuntimeRangeSharingEntry {
    /** The sharing character's skeleton (live reference) */
    skeleton: Skeleton;
    /** The source character's skeleton (live reference) */
    sourceSkeleton: Skeleton;
}

// ─── Exported Functions ───

/**
 * Pure function. Determines if two skeletons have duplicate bone animations.
 *
 * Two skeletons are duplicates if and only if:
 * 1. Both have at least one bone with a non-empty animations array
 * 2. They have the same set of bone names (case-sensitive, order-independent)
 * 3. For each bone name, they have the same set of animation names
 *    (case-sensitive, order-independent)
 *
 * Bones with empty/missing animations arrays contribute their bone name
 * with zero animation names to the signature.
 *
 * Returns false if either skeleton has no bone animations at all.
 * This is a pure function with no side effects.
 */
export function areSkeletonsDuplicates(a: Skeleton, b: Skeleton): boolean {
    const sigA = getSkeletonSignature(a);
    const sigB = getSkeletonSignature(b);

    // If either has an empty signature (no bone animations), not duplicates
    if (sigA === "" || sigB === "") {
        return false;
    }

    return sigA === sigB;
}

/**
 * Pure function. Converts runtime sharing entries (with Skeleton references)
 * to serializable AnimRangeSharingEntry objects (with current string IDs).
 * Call this at save time to get correct IDs.
 *
 * Does not mutate any input Skeleton objects.
 */
export function resolveRuntimeRangeEntries(
    entries: RuntimeRangeSharingEntry[]
): AnimRangeSharingEntry[] {
    if (!entries || entries.length === 0) return [];
    return entries.map(e => ({
        skeletonId: e.skeleton.id,
        sourceSkeletonId: e.sourceSkeleton.id,
    }));
}

// ─── Internal Helpers ───

/**
 * Computes the animation signature for a skeleton.
 *
 * The signature is built from sorted bone entries, where each bone entry is:
 *   boneName + "\0" + sorted(animationNames).join("\0")
 *
 * Bone entries are sorted lexicographically and joined with "\1".
 *
 * Returns "" if the skeleton has no bone animations (all bones have
 * empty/missing animations arrays).
 */
function getSkeletonSignature(skel: Skeleton): string {
    const bones = skel.bones;
    if (!bones || bones.length === 0) {
        return "";
    }

    let hasAnyAnimation = false;
    const boneEntries: string[] = [];

    for (const bone of bones) {
        const boneName = bone.name;
        const animations = bone.animations;
        const animNames: string[] = [];

        if (animations && animations.length > 0) {
            hasAnyAnimation = true;
            // Use a Set to deduplicate animation names within a single bone
            const nameSet = new Set<string>();
            for (const anim of animations) {
                nameSet.add(anim.name);
            }
            const sorted = Array.from(nameSet).sort();
            animNames.push(...sorted);
        }

        // Each bone contributes: boneName + "\0" + sorted animation names joined by "\0"
        boneEntries.push(boneName + "\0" + animNames.join("\0"));
    }

    // If no bone has any animations, return empty signature
    if (!hasAnyAnimation) {
        return "";
    }

    // Sort bone entries for order-independent comparison
    boneEntries.sort();
    return boneEntries.join("\x01");
}


// ─── Runtime Deduplication ───

/**
 * Runtime deduplication. Detects duplicate skeletons (excluding those driven by
 * animation groups) and shares Bone Animation references from the source skeleton.
 *
 * For each set of duplicate skeletons:
 * - The source is the skeleton with the lowest index in `scene.skeletons`
 * - Sharing skeletons have their bone Animation references replaced with the
 *   source skeleton's corresponding bone Animation objects (matched by bone name)
 *
 * Idempotent: if references are already shared (same object), no additional changes.
 * Does NOT remove any Skeleton objects or Animation_Ranges from the scene.
 *
 * Returns RuntimeRangeSharingEntry[] with Skeleton references for each sharing skeleton.
 */
export function deduplicateRangesAtRuntime(scene: Scene): RuntimeRangeSharingEntry[] {
    const skeletons = scene.skeletons;
    if (!skeletons || skeletons.length === 0) {
        return [];
    }

    // Determine which skeletons are driven by animation groups and should be excluded.
    // A skeleton is AG-driven if any mesh using it has its hierarchy targeted by an AG.
    const agDrivenSkeletons = new Set<Skeleton>();
    for (const skel of skeletons) {
        if (isSkeletonDrivenByAG(skel, scene)) {
            agDrivenSkeletons.add(skel);
        }
    }

    // Group eligible skeletons by their animation signature
    const signatureMap = new Map<string, Skeleton[]>();
    for (const skel of skeletons) {
        if (agDrivenSkeletons.has(skel)) {
            continue;
        }

        const sig = getSkeletonSignature(skel);
        if (sig === "") {
            // No bone animations — not a candidate
            continue;
        }

        let list = signatureMap.get(sig);
        if (!list) {
            list = [];
            signatureMap.set(sig, list);
        }
        list.push(skel);
    }

    // For each group of duplicates, share bone Animation references from the source
    const sharingEntries: RuntimeRangeSharingEntry[] = [];

    for (const [, group] of signatureMap) {
        if (group.length < 2) {
            continue;
        }

        // Source is the first skeleton (lowest scene index, since we iterated scene.skeletons in order)
        const source = group[0];

        // Build a map of boneName -> animations array from the source skeleton
        const sourceBoneAnimMap = new Map<string, any[]>();
        for (const bone of source.bones) {
            if (bone.animations && bone.animations.length > 0) {
                sourceBoneAnimMap.set(bone.name, bone.animations);
            }
        }

        // Process sharing skeletons
        for (let i = 1; i < group.length; i++) {
            const sharingSkel = group[i];

            // Replace bone Animation references with source's
            for (const bone of sharingSkel.bones) {
                const sourceAnims = sourceBoneAnimMap.get(bone.name);
                if (!sourceAnims) {
                    // No matching bone in source — skip
                    continue;
                }

                if (!bone.animations || bone.animations.length === 0) {
                    // Sharing bone has no animations — nothing to replace
                    continue;
                }

                // Build a map of animation name -> Animation object from source bone
                const sourceAnimByName = new Map<string, any>();
                for (const anim of sourceAnims) {
                    sourceAnimByName.set(anim.name, anim);
                }

                // Replace each animation in the sharing bone with the source's matching animation
                for (let j = 0; j < bone.animations.length; j++) {
                    const sharingAnim = bone.animations[j];
                    const sourceAnim = sourceAnimByName.get(sharingAnim.name);
                    if (sourceAnim) {
                        // Only replace if not already the same reference (idempotence)
                        if (bone.animations[j] !== sourceAnim) {
                            bone.animations[j] = sourceAnim;
                        }
                    } else {
                        console.warn(
                            `[AnimRangeDedup] deduplicateRangesAtRuntime: No matching animation name "${sharingAnim.name}" in source skeleton bone "${bone.name}" — skipping.`
                        );
                    }
                }
            }

            sharingEntries.push({
                skeleton: sharingSkel,
                sourceSkeleton: source,
            });
        }
    }

    return sharingEntries;
}

// ─── Save-Time Stripping ───

/**
 * Save-time stripping. Removes bone animation data and ranges from sharing
 * characters' serialized skeletons. Returns count of skeletons stripped.
 *
 * For each sharing skeleton in the runtime entries:
 * - Finds its serialized counterpart by matching skeleton.id against sceneObj.skeletons[i].id
 * - Removes the `animation` field from each bone entry (delete bone.animation)
 * - Removes the `ranges` array from the skeleton (delete skeleton.ranges)
 *
 * Source skeletons are never stripped.
 * Skeletons not in the sharing entries are never stripped.
 *
 * Edge cases:
 * - If sceneObj.skeletons is null/undefined/empty, returns 0
 * - If runtimeEntries is null/undefined/empty, returns 0
 * - If a skeleton ID is not found in the serialized scene, logs a warning and skips
 */
export function stripSharedSkeletonAnimations(
    sceneObj: any,
    runtimeEntries: RuntimeRangeSharingEntry[],
    scene: Scene
): number {
    // Handle missing/empty serialized skeletons
    if (!sceneObj || !sceneObj.skeletons || sceneObj.skeletons.length === 0) {
        return 0;
    }

    // Handle missing/empty runtime entries
    if (!runtimeEntries || runtimeEntries.length === 0) {
        return 0;
    }

    // Collect sharing skeleton IDs (never strip source skeletons)
    const sharingSkeletonIds = new Set<string>();
    for (const entry of runtimeEntries) {
        sharingSkeletonIds.add(entry.skeleton.id);
    }

    // Build a map of serialized skeleton ID -> serialized skeleton object for quick lookup
    const serializedSkeletonMap = new Map<string, any>();
    for (const serializedSkel of sceneObj.skeletons) {
        if (serializedSkel && serializedSkel.id != null) {
            serializedSkeletonMap.set(String(serializedSkel.id), serializedSkel);
        }
    }

    let strippedCount = 0;

    for (const sharingId of sharingSkeletonIds) {
        const serializedSkel = serializedSkeletonMap.get(sharingId);
        if (!serializedSkel) {
            console.warn(
                `[AnimRangeDedup] stripSharedSkeletonAnimations: skeleton ID "${sharingId}" not found in serialized scene — skipping.`
            );
            continue;
        }

        // Remove animation field from each bone
        if (serializedSkel.bones && Array.isArray(serializedSkel.bones)) {
            for (const bone of serializedSkel.bones) {
                delete bone.animation;
            }
        }

        // Remove ranges array from the skeleton
        delete serializedSkel.ranges;

        strippedCount++;
    }

    return strippedCount;
}

/**
 * Checks if a skeleton is driven by animation groups.
 * A skeleton is AG-driven if any mesh in the scene that uses this skeleton
 * has its hierarchy targeted by at least one AnimationGroup.
 */
function isSkeletonDrivenByAG(skel: Skeleton, scene: Scene): boolean {
    if (!scene.animationGroups || scene.animationGroups.length === 0) {
        return false;
    }

    // Find any mesh in the scene that uses this skeleton
    for (const mesh of scene.meshes) {
        if ((mesh as AbstractMesh).skeleton === skel) {
            if (AnimUtils.containsAG(mesh, scene.animationGroups, true)) {
                return true;
            }
        }
    }

    return false;
}


// ─── Load-Time Restoration ───

/**
 * Load-time restoration. Copies bone Animation references from source skeletons
 * to sharing skeletons and recreates animation ranges. Applies fixAnimationRanges.
 * Returns count of skeletons restored.
 *
 * For each AnimRangeSharingEntry:
 * 1. Find source skeleton by sourceSkeletonId in scene.skeletons
 * 2. Find sharing skeleton by skeletonId in scene.skeletons
 * 3. For each bone in source skeleton, find matching bone in sharing skeleton by name
 * 4. Assign sourceBone.animations to sharingBone.animations (by reference)
 * 5. Get source skeleton's animation ranges
 * 6. For each range, call sharingSkeleton.createAnimationRange(name, from, to)
 * 7. Call fixAnimationRanges(sharingSkeleton)
 * 8. Increment restored count
 *
 * Edge cases:
 * - null/empty entries → return 0
 * - Source skeleton not found → log warning, skip entry
 * - Sharing skeleton not found → log warning, skip entry
 * - Source has no bone animations → log warning, skip entry
 * - Bone name mismatch → log warning, skip that bone, continue
 * - Count a skeleton as "restored" if at least one bone was matched
 */
export function restoreSharedSkeletonAnimations(
    scene: Scene,
    sharingEntries: AnimRangeSharingEntry[],
    fixAnimationRanges: (skel: Skeleton) => void
): number {
    // Handle null/undefined/empty entries
    if (!sharingEntries || sharingEntries.length === 0) {
        return 0;
    }

    let restoredCount = 0;

    for (const entry of sharingEntries) {
        // Find source skeleton by ID
        const sourceSkeleton = findSkeletonById(scene, entry.sourceSkeletonId);
        if (!sourceSkeleton) {
            console.warn(
                `[AnimRangeDedup] restoreSharedSkeletonAnimations: source skeleton not found for ID "${entry.sourceSkeletonId}" — skipping entry.`
            );
            continue;
        }

        // Find sharing skeleton by ID
        const sharingSkeleton = findSkeletonById(scene, entry.skeletonId);
        if (!sharingSkeleton) {
            console.warn(
                `[AnimRangeDedup] restoreSharedSkeletonAnimations: sharing skeleton not found for ID "${entry.skeletonId}" — skipping entry.`
            );
            continue;
        }

        // Check if source skeleton has any bone animations
        const sourceHasAnimations = sourceSkeleton.bones.some(
            bone => bone.animations && bone.animations.length > 0
        );
        if (!sourceHasAnimations) {
            console.warn(
                `[AnimRangeDedup] restoreSharedSkeletonAnimations: source skeleton "${entry.sourceSkeletonId}" has no bone animations — skipping entry.`
            );
            continue;
        }

        // Build a map of bone name -> bone for the sharing skeleton for quick lookup
        const sharingBoneMap = new Map<string, any>();
        for (const bone of sharingSkeleton.bones) {
            sharingBoneMap.set(bone.name, bone);
        }

        // Copy bone animations by reference from source to sharing skeleton
        let matchedBoneCount = 0;
        for (const sourceBone of sourceSkeleton.bones) {
            const sharingBone = sharingBoneMap.get(sourceBone.name);
            if (!sharingBone) {
                console.warn(
                    `[AnimRangeDedup] restoreSharedSkeletonAnimations: bone "${sourceBone.name}" from source skeleton "${entry.sourceSkeletonId}" not found in sharing skeleton "${entry.skeletonId}" — skipping bone.`
                );
                continue;
            }

            // Assign animations array by reference (not deep copy)
            sharingBone.animations = sourceBone.animations;
            matchedBoneCount++;
        }

        // Only count as restored if at least one bone was matched
        if (matchedBoneCount === 0) {
            continue;
        }

        // Recreate animation ranges on sharing skeleton from source skeleton's ranges
        const sourceRanges = sourceSkeleton.getAnimationRanges();
        if (sourceRanges) {
            for (const range of sourceRanges) {
                if (range) {
                    sharingSkeleton.createAnimationRange(range.name, range.from, range.to);
                }
            }
        }

        // Apply fixAnimationRanges to the restored skeleton
        fixAnimationRanges(sharingSkeleton);

        restoredCount++;
    }

    return restoredCount;
}

/**
 * Finds a skeleton by ID in the scene's skeletons array.
 * Returns null if not found.
 */
function findSkeletonById(scene: Scene, id: string): Skeleton | null {
    if (!scene.skeletons || scene.skeletons.length === 0) {
        return null;
    }
    for (const skel of scene.skeletons) {
        if (skel.id === id) {
            return skel;
        }
    }
    return null;
}
