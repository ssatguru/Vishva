import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { XRLocomotion, LocomotionMode, ToggleResult } from './XRLocomotion';

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
