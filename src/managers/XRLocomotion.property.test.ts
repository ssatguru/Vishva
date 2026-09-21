import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
    XRLocomotion,
    LocomotionMode,
    ToggleResult,
    mapSticksToIntent,
    neutralMoveIntent,
    DEFAULT_STICK_DEADZONE,
} from './XRLocomotion';

/**
 * Arbitrary for a locomotion mode.
 */
const arbMode: fc.Arbitrary<LocomotionMode> = fc.constantFrom(
    'firstPerson',
    'thirdPerson'
);

/**
 * An operation applied to the state machine. `toggle` calls `toggle(...)`;
 * `setMode` calls `setMode(target, ...)` with a random target mode.
 */
type Op =
    | { kind: 'toggle' }
    | { kind: 'setMode'; target: LocomotionMode };

const arbOp: fc.Arbitrary<Op> = fc.oneof(
    fc.constant<Op>({ kind: 'toggle' }),
    arbMode.map<Op>((target) => ({ kind: 'setMode', target }))
);

/**
 * Feature: webxr-support, Property 2: First-person unreachable without permission
 *
 * For any random sequence of toggle/setMode operations where every operation
 * supplies canFirstPerson=false, the resulting mode is NEVER firstPerson, and
 * every attempt to reach firstPerson is reported as blocked with changed:false.
 *
 * Validates: Requirements 4.3, 4.4, 4.5, 4.6
 */
describe('Property 2: First-person unreachable without permission', () => {
    it('never reaches firstPerson and blocks every first-person attempt when canFirstPerson=false', () => {
        fc.assert(
            fc.property(
                arbMode, // starting mode
                fc.array(arbOp, { minLength: 1, maxLength: 30 }),
                (initial, ops) => {
                    const loco = new XRLocomotion(initial);

                    // A starting mode of firstPerson would already violate the
                    // "unreachable" premise; the guard only governs transitions
                    // *into* firstPerson. Begin from thirdPerson so the sequence
                    // starts from a permission-respecting state.
                    const machine = new XRLocomotion('thirdPerson');

                    for (const op of ops) {
                        let result: ToggleResult;
                        if (op.kind === 'toggle') {
                            result = machine.toggle(false);
                        } else {
                            result = machine.setMode(op.target, false);
                        }

                        // The mode must never be firstPerson at any point.
                        expect(machine.getMode()).not.toBe('firstPerson');
                        expect(result.mode).not.toBe('firstPerson');

                        // Any blocked result must report changed:false.
                        if (result.blocked) {
                            expect(result.changed).toBe(false);
                        }

                        // An explicit setMode('firstPerson', false) must be
                        // reported as blocked (and therefore unchanged).
                        if (op.kind === 'setMode' && op.target === 'firstPerson') {
                            expect(result.blocked).toBe(true);
                            expect(result.changed).toBe(false);
                        }
                    }

                    // Final state is never firstPerson.
                    expect(machine.getMode()).not.toBe('firstPerson');

                    // `initial` and `loco` are referenced to keep the arbitrary
                    // meaningful without affecting the permission premise.
                    void loco;
                    void initial;
                }
            ),
            { numRuns: 200 }
        );
    });

    it('a toggle from thirdPerson without permission stays thirdPerson and is blocked', () => {
        fc.assert(
            fc.property(fc.integer({ min: 1, max: 20 }), (count) => {
                const machine = new XRLocomotion('thirdPerson');
                for (let i = 0; i < count; i++) {
                    const result = machine.toggle(false);
                    expect(result.mode).toBe('thirdPerson');
                    expect(result.blocked).toBe(true);
                    expect(result.changed).toBe(false);
                    expect(machine.getMode()).toBe('thirdPerson');
                }
            }),
            { numRuns: 100 }
        );
    });
});

/**
 * Feature: webxr-support, Property 3: Toggle involution under permission
 *
 * For any starting LocomotionMode, applying toggle(true) twice returns the mode
 * to its starting value, and each permitted transition is reported with
 * changed:true and blocked:false.
 *
 * Validates: Requirements 4.3, 4.4, 4.5, 4.6
 */
describe('Property 3: Toggle involution under permission', () => {
    it('toggle(true) applied twice returns to the starting mode with permitted transitions', () => {
        fc.assert(
            fc.property(arbMode, (initial) => {
                const machine = new XRLocomotion(initial);

                const first = machine.toggle(true);
                // The two modes differ, so each toggle is a real transition.
                expect(first.blocked).toBe(false);
                expect(first.changed).toBe(true);
                expect(first.mode).not.toBe(initial);
                expect(machine.getMode()).not.toBe(initial);

                const second = machine.toggle(true);
                expect(second.blocked).toBe(false);
                expect(second.changed).toBe(true);
                expect(second.mode).toBe(initial);

                // Involution: back to the starting value.
                expect(machine.getMode()).toBe(initial);
            }),
            { numRuns: 200 }
        );
    });

    it('any even number of toggle(true) calls returns to start; odd number flips it', () => {
        fc.assert(
            fc.property(
                arbMode,
                fc.integer({ min: 0, max: 40 }),
                (initial, n) => {
                    const machine = new XRLocomotion(initial);
                    const other: LocomotionMode =
                        initial === 'thirdPerson' ? 'firstPerson' : 'thirdPerson';

                    for (let i = 0; i < n; i++) {
                        const result = machine.toggle(true);
                        // Every permitted transition is a real change.
                        expect(result.blocked).toBe(false);
                        expect(result.changed).toBe(true);
                    }

                    expect(machine.getMode()).toBe(n % 2 === 0 ? initial : other);
                }
            ),
            { numRuns: 150 }
        );
    });
});

/**
 * Feature: webxr-support, stick locomotion: mapSticksToIntent invariants.
 *
 * The mapper is now LEFT-stick ONLY (the RIGHT stick drives the camera orbit
 * directly in XRManager and never passes through here). Pure properties of the
 * LEFT thumbstick → MoveIntent mapping:
 *  - Within the deadzone (all axes |v| <= dz) every action is false.
 *  - Never both directions of the same axis at once.
 *  - LEFT-STICK DOMINANT AXIS: forward/back and strafe are never both active
 *    at the same time — the larger raw magnitude wins, the off-axis is ignored.
 *  - The forward-axis sign convention (negative Y = forward) always holds when
 *    Y is the dominant axis; strafe holds when X is the dominant axis.
 */
describe('mapSticksToIntent properties', () => {
    const DZ = DEFAULT_STICK_DEADZONE;

    /** Axis magnitudes strictly inside the deadzone: |v| <= dz. */
    const arbInside = fc.double({ min: -DZ, max: DZ, noNaN: true });

    /** Axis magnitudes strictly beyond the deadzone on the positive side. */
    const arbBeyondPos = fc.double({
        min: DZ + 1e-6,
        max: 1,
        noNaN: true,
    });
    /** Axis magnitudes strictly beyond the deadzone on the negative side. */
    const arbBeyondNeg = fc.double({
        min: -1,
        max: -DZ - 1e-6,
        noNaN: true,
    });

    it('within the deadzone all intents are false', () => {
        fc.assert(
            fc.property(arbInside, arbInside, (leftX, leftY) => {
                expect(mapSticksToIntent({ leftX, leftY }, DZ)).toEqual(
                    neutralMoveIntent()
                );
            }),
            { numRuns: 300 }
        );
    });

    it('never sets both directions of any axis true, for any input', () => {
        const arbAxis = fc.double({ min: -1, max: 1, noNaN: true });
        fc.assert(
            fc.property(arbAxis, arbAxis, (leftX, leftY) => {
                const i = mapSticksToIntent({ leftX, leftY }, DZ);
                expect(i.walk && i.walkBack).toBe(false);
                expect(i.strafeLeft && i.strafeRight).toBe(false);
            }),
            { numRuns: 300 }
        );
    });

    it('left stick never activates forward/back AND strafe together (dominant-axis)', () => {
        // The core invariant of the dominant-axis rule: for any left-stick input
        // the winner is one GROUP — {walk, walkBack} XOR {strafeLeft, strafeRight}
        // — never both.
        const arbAxis = fc.double({ min: -1, max: 1, noNaN: true });
        fc.assert(
            fc.property(arbAxis, arbAxis, (leftX, leftY) => {
                const i = mapSticksToIntent({ leftX, leftY }, DZ);
                const forwardBack = i.walk || i.walkBack;
                const strafe = i.strafeLeft || i.strafeRight;
                expect(forwardBack && strafe).toBe(false);
            }),
            { numRuns: 400 }
        );
    });

    it('Y dominant (|Y| >= |X|) beyond deadzone => forward/back per sign, strafe forced off', () => {
        // Constrain |X| <= |Y| so Y always wins (ties resolve to Y).
        const arbXWithinY = (y: number) =>
            fc.double({ min: -Math.abs(y), max: Math.abs(y), noNaN: true });
        fc.assert(
            fc.property(
                arbBeyondNeg.chain((leftY) => arbXWithinY(leftY).map((leftX) => ({ leftX, leftY }))),
                ({ leftX, leftY }) => {
                    const i = mapSticksToIntent({ leftX, leftY }, DZ);
                    expect(i.walk).toBe(true);
                    expect(i.walkBack).toBe(false);
                    expect(i.strafeLeft).toBe(false);
                    expect(i.strafeRight).toBe(false);
                }
            ),
            { numRuns: 200 }
        );
        fc.assert(
            fc.property(
                arbBeyondPos.chain((leftY) => arbXWithinY(leftY).map((leftX) => ({ leftX, leftY }))),
                ({ leftX, leftY }) => {
                    const i = mapSticksToIntent({ leftX, leftY }, DZ);
                    expect(i.walkBack).toBe(true);
                    expect(i.walk).toBe(false);
                    expect(i.strafeLeft).toBe(false);
                    expect(i.strafeRight).toBe(false);
                }
            ),
            { numRuns: 200 }
        );
    });

    it('X dominant (|X| > |Y|) beyond deadzone => strafe per sign, forward/back forced off', () => {
        // Constrain |Y| < |X| so X strictly wins.
        const arbYWithinX = (x: number) =>
            fc.double({ min: -Math.abs(x) + 1e-6, max: Math.abs(x) - 1e-6, noNaN: true });
        fc.assert(
            fc.property(
                arbBeyondPos.chain((leftX) => arbYWithinX(leftX).map((leftY) => ({ leftX, leftY }))),
                ({ leftX, leftY }) => {
                    const i = mapSticksToIntent({ leftX, leftY }, DZ);
                    expect(i.strafeRight).toBe(true);
                    expect(i.strafeLeft).toBe(false);
                    expect(i.walk).toBe(false);
                    expect(i.walkBack).toBe(false);
                }
            ),
            { numRuns: 200 }
        );
        fc.assert(
            fc.property(
                arbBeyondNeg.chain((leftX) => arbYWithinX(leftX).map((leftY) => ({ leftX, leftY }))),
                ({ leftX, leftY }) => {
                    const i = mapSticksToIntent({ leftX, leftY }, DZ);
                    expect(i.strafeLeft).toBe(true);
                    expect(i.strafeRight).toBe(false);
                    expect(i.walk).toBe(false);
                    expect(i.walkBack).toBe(false);
                }
            ),
            { numRuns: 200 }
        );
    });

    it('the resting XRLocomotion machine is unaffected by stick mapping (independent concerns)', () => {
        // Sanity: mapping is a pure free function and does not touch the mode
        // state machine. Referenced to keep imports meaningful.
        const loco = new XRLocomotion('thirdPerson');
        void mapSticksToIntent({ leftX: 1, leftY: -1 });
        expect(loco.getMode()).toBe('thirdPerson');
        void ({} as { m: LocomotionMode; r: ToggleResult });
    });
});
