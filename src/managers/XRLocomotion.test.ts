import { describe, it, expect } from 'vitest';
import {
    XRLocomotion,
    mapSticksToIntent,
    neutralMoveIntent,
    DEFAULT_STICK_DEADZONE,
} from './XRLocomotion';

describe('XRLocomotion', () => {
    describe('constructor / default mode', () => {
        it('defaults to thirdPerson when constructed with no argument (Req 4.1)', () => {
            const loco = new XRLocomotion();
            expect(loco.getMode()).toBe('thirdPerson');
        });

        it('honors an explicit initial mode of firstPerson (Req 4.1)', () => {
            const loco = new XRLocomotion('firstPerson');
            expect(loco.getMode()).toBe('firstPerson');
        });

        it('honors an explicit initial mode of thirdPerson (Req 4.1)', () => {
            const loco = new XRLocomotion('thirdPerson');
            expect(loco.getMode()).toBe('thirdPerson');
        });
    });

    describe('toggle', () => {
        it('permitted toggle to firstPerson reports changed:true, blocked:false and updates mode (Req 4.4)', () => {
            const loco = new XRLocomotion('thirdPerson');
            const result = loco.toggle(true);
            expect(result).toEqual({ mode: 'firstPerson', changed: true, blocked: false });
            expect(loco.getMode()).toBe('firstPerson');
        });

        it('blocked toggle from thirdPerson reports changed:false, blocked:true and stays thirdPerson (Req 4.3)', () => {
            const loco = new XRLocomotion('thirdPerson');
            const result = loco.toggle(false);
            expect(result).toEqual({ mode: 'thirdPerson', changed: false, blocked: true });
            expect(loco.getMode()).toBe('thirdPerson');
        });

        it('toggle from firstPerson to thirdPerson succeeds when canFirstPerson=true (Req 4.5)', () => {
            const loco = new XRLocomotion('firstPerson');
            const result = loco.toggle(true);
            expect(result).toEqual({ mode: 'thirdPerson', changed: true, blocked: false });
            expect(loco.getMode()).toBe('thirdPerson');
        });

        it('toggle from firstPerson to thirdPerson succeeds even when canFirstPerson=false (Req 4.5)', () => {
            const loco = new XRLocomotion('firstPerson');
            const result = loco.toggle(false);
            expect(result).toEqual({ mode: 'thirdPerson', changed: true, blocked: false });
            expect(loco.getMode()).toBe('thirdPerson');
        });
    });

    describe('setMode', () => {
        it('setMode(firstPerson, false) is blocked and leaves mode untouched (Req 4.3)', () => {
            const loco = new XRLocomotion('thirdPerson');
            const result = loco.setMode('firstPerson', false);
            expect(result).toEqual({ mode: 'thirdPerson', changed: false, blocked: true });
            expect(loco.getMode()).toBe('thirdPerson');
        });

        it('setMode(firstPerson, true) is allowed and reports changed (Req 4.4)', () => {
            const loco = new XRLocomotion('thirdPerson');
            const result = loco.setMode('firstPerson', true);
            expect(result).toEqual({ mode: 'firstPerson', changed: true, blocked: false });
            expect(loco.getMode()).toBe('firstPerson');
        });

        it('setMode(thirdPerson, false) is always allowed and never blocked (Req 4.5)', () => {
            const loco = new XRLocomotion('firstPerson');
            const result = loco.setMode('thirdPerson', false);
            expect(result).toEqual({ mode: 'thirdPerson', changed: true, blocked: false });
            expect(loco.getMode()).toBe('thirdPerson');
        });

        it('setMode(thirdPerson, true) is always allowed and never blocked (Req 4.5)', () => {
            const loco = new XRLocomotion('firstPerson');
            const result = loco.setMode('thirdPerson', true);
            expect(result).toEqual({ mode: 'thirdPerson', changed: true, blocked: false });
            expect(loco.getMode()).toBe('thirdPerson');
        });

        it('setMode to the same mode (thirdPerson) reports changed:false, blocked:false (Req 4.5)', () => {
            const loco = new XRLocomotion('thirdPerson');
            const result = loco.setMode('thirdPerson', true);
            expect(result).toEqual({ mode: 'thirdPerson', changed: false, blocked: false });
            expect(loco.getMode()).toBe('thirdPerson');
        });

        it('setMode to the same mode (firstPerson) with permission reports changed:false, blocked:false (Req 4.4)', () => {
            const loco = new XRLocomotion('firstPerson');
            const result = loco.setMode('firstPerson', true);
            expect(result).toEqual({ mode: 'firstPerson', changed: false, blocked: false });
            expect(loco.getMode()).toBe('firstPerson');
        });

        it('setMode(firstPerson, false) while already in firstPerson is blocked (mode preserved) (Req 4.3)', () => {
            const loco = new XRLocomotion('firstPerson');
            const result = loco.setMode('firstPerson', false);
            expect(result).toEqual({ mode: 'firstPerson', changed: false, blocked: true });
            expect(loco.getMode()).toBe('firstPerson');
        });
    });
});

describe('mapSticksToIntent (LEFT-stick translation mapping)', () => {
    const DZ = DEFAULT_STICK_DEADZONE;

    it('neutralMoveIntent has only the four LEFT-stick translation flags, all false', () => {
        const n = neutralMoveIntent();
        expect(n).toEqual({
            walk: false,
            walkBack: false,
            strafeLeft: false,
            strafeRight: false,
        });
    });

    describe('deadzone', () => {
        it('treats a fully-neutral stick as all-false', () => {
            expect(mapSticksToIntent({ leftX: 0, leftY: 0 })).toEqual(
                neutralMoveIntent()
            );
        });

        it('treats axes at exactly the deadzone as 0 (<= deadzone => no input)', () => {
            const intent = mapSticksToIntent({ leftX: DZ, leftY: -DZ }, DZ);
            expect(intent).toEqual(neutralMoveIntent());
        });

        it('treats small drift within the deadzone band as 0', () => {
            const intent = mapSticksToIntent({ leftX: 0.1, leftY: -0.1 }, DZ);
            expect(intent).toEqual(neutralMoveIntent());
        });

        it('honors a custom deadzone', () => {
            // 0.3 is beyond the default 0.15 but within a custom 0.5 band.
            expect(mapSticksToIntent({ leftX: 0, leftY: -0.3 }, 0.5)).toEqual(
                neutralMoveIntent()
            );
            expect(mapSticksToIntent({ leftX: 0, leftY: -0.3 }, 0.2).walk).toBe(
                true
            );
        });
    });

    describe('left stick Y — forward/back sign convention', () => {
        it('pushing the stick FORWARD (negative Y) => walk (forward)', () => {
            const intent = mapSticksToIntent({ leftX: 0, leftY: -1 });
            expect(intent.walk).toBe(true);
            expect(intent.walkBack).toBe(false);
        });

        it('pulling the stick BACK (positive Y) => walkBack', () => {
            const intent = mapSticksToIntent({ leftX: 0, leftY: 1 });
            expect(intent.walkBack).toBe(true);
            expect(intent.walk).toBe(false);
        });
    });

    describe('left stick X — strafe', () => {
        it('positive X => strafeRight', () => {
            const intent = mapSticksToIntent({ leftX: 1, leftY: 0 });
            expect(intent.strafeRight).toBe(true);
            expect(intent.strafeLeft).toBe(false);
        });

        it('negative X => strafeLeft', () => {
            const intent = mapSticksToIntent({ leftX: -1, leftY: 0 });
            expect(intent.strafeLeft).toBe(true);
            expect(intent.strafeRight).toBe(false);
        });
    });

    describe('left stick dominant-axis selection', () => {
        // Physical thumbsticks bleed onto the off-axis; the left stick picks
        // one of {forward/back} vs {strafe} by whichever raw magnitude is
        // larger. Ties resolve to Y (forward/back wins).

        it('straight BACK with X bleed past deadzone (leftX=0.3, leftY=0.9) => walkBack only, no strafe (reported repro)', () => {
            const intent = mapSticksToIntent({ leftX: 0.3, leftY: 0.9 });
            expect(intent.walkBack).toBe(true);
            expect(intent.walk).toBe(false);
            expect(intent.strafeLeft).toBe(false);
            expect(intent.strafeRight).toBe(false);
        });

        it('straight FORWARD with X bleed (leftX=0.3, leftY=-0.9) => walk only, no strafe', () => {
            const intent = mapSticksToIntent({ leftX: 0.3, leftY: -0.9 });
            expect(intent.walk).toBe(true);
            expect(intent.walkBack).toBe(false);
            expect(intent.strafeLeft).toBe(false);
            expect(intent.strafeRight).toBe(false);
        });

        it('clear strafe with small Y bleed (leftX=0.9, leftY=0.2) => strafeRight only, no walk/walkBack', () => {
            const intent = mapSticksToIntent({ leftX: 0.9, leftY: 0.2 });
            expect(intent.strafeRight).toBe(true);
            expect(intent.strafeLeft).toBe(false);
            expect(intent.walk).toBe(false);
            expect(intent.walkBack).toBe(false);
        });

        it('diagonal where X dominates (leftX=0.8, leftY=0.5) => strafe only', () => {
            const intent = mapSticksToIntent({ leftX: 0.8, leftY: 0.5 });
            expect(intent.strafeRight).toBe(true);
            expect(intent.strafeLeft).toBe(false);
            expect(intent.walk).toBe(false);
            expect(intent.walkBack).toBe(false);
        });

        it('diagonal where Y dominates (leftX=0.5, leftY=0.8) => forward/back only', () => {
            const intent = mapSticksToIntent({ leftX: 0.5, leftY: 0.8 });
            expect(intent.walkBack).toBe(true);
            expect(intent.walk).toBe(false);
            expect(intent.strafeLeft).toBe(false);
            expect(intent.strafeRight).toBe(false);
        });

        it('tie between axes (leftX=0.5, leftY=-0.5) => Y wins => walk only, no strafe', () => {
            const intent = mapSticksToIntent({ leftX: 0.5, leftY: -0.5 });
            expect(intent.walk).toBe(true);
            expect(intent.walkBack).toBe(false);
            expect(intent.strafeLeft).toBe(false);
            expect(intent.strafeRight).toBe(false);
        });
    });

    describe('invariants', () => {
        it('never sets both directions of any single axis true at once', () => {
            // A single axis value can only exceed +dz or fall below -dz, not both.
            const anyIntent = mapSticksToIntent({ leftX: 0.9, leftY: -0.9 });
            expect(anyIntent.walk && anyIntent.walkBack).toBe(false);
            expect(anyIntent.strafeLeft && anyIntent.strafeRight).toBe(false);
        });

        it('left stick never lights forward/back AND strafe together (dominant-axis)', () => {
            const anyIntent = mapSticksToIntent({ leftX: 0.9, leftY: -0.9 });
            const forwardBack = anyIntent.walk || anyIntent.walkBack;
            const strafe = anyIntent.strafeLeft || anyIntent.strafeRight;
            expect(forwardBack && strafe).toBe(false);
        });
    });
});
