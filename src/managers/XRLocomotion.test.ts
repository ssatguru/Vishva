import { describe, it, expect } from 'vitest';
import { XRLocomotion } from './XRLocomotion';

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
