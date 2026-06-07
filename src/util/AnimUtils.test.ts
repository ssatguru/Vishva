import { describe, it, expect } from 'vitest';
import { AnimUtils } from './AnimUtils';

// Helper: build a minimal mock bone with a fixed linked TransformNode return value
function mockBone(linkedTN: object | null) {
    return {
        getTransformNode: () => linkedTN,
    };
}

// Helper: build a minimal mock skeleton with the given bones array
function mockSkeleton(bones: ReturnType<typeof mockBone>[]) {
    return { bones } as any;
}

describe('AnimUtils.isAGDrivenSkeleton', () => {

    // Requirement 1.2: null skeleton → false
    it('returns false for null', () => {
        expect(AnimUtils.isAGDrivenSkeleton(null)).toBe(false);
    });

    // Requirement 1.3: empty bones array → false
    it('returns false for a skeleton with an empty bones array', () => {
        expect(AnimUtils.isAGDrivenSkeleton(mockSkeleton([]))).toBe(false);
    });

    // Requirement 1.5: all bones return null from getLinkedTransformNode → false
    it('returns false when all bones have null linked TransformNode', () => {
        const skel = mockSkeleton([
            mockBone(null),
            mockBone(null),
            mockBone(null),
        ]);
        expect(AnimUtils.isAGDrivenSkeleton(skel)).toBe(false);
    });

    // Requirement 1.4: at least one bone has a non-null linked TransformNode → true
    it('returns true when one bone has a non-null linked TransformNode', () => {
        const skel = mockSkeleton([
            mockBone(null),
            mockBone({ name: 'hip_tn' }),
            mockBone(null),
        ]);
        expect(AnimUtils.isAGDrivenSkeleton(skel)).toBe(true);
    });

    // Requirement 1.1 / 1.4: all bones have a linked TransformNode → true
    it('returns true when all bones have a non-null linked TransformNode', () => {
        const skel = mockSkeleton([
            mockBone({ name: 'bone0_tn' }),
            mockBone({ name: 'bone1_tn' }),
        ]);
        expect(AnimUtils.isAGDrivenSkeleton(skel)).toBe(true);
    });

    // Requirement 1.2: undefined skeleton treated as null-ish → false
    it('returns false for undefined', () => {
        expect(AnimUtils.isAGDrivenSkeleton(undefined as any)).toBe(false);
    });

});
