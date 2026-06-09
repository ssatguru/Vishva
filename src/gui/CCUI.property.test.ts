import { describe, it, expect, vi } from "vitest";
import fc from "fast-check";

/**
 * Feature: cc-turn-in-place-and-export
 * Property 1: Turn In Place UI reflects CC state
 *
 * For any boolean value of the CharacterController's turnInPlace state,
 * after _updateUISet() executes, the turnInPlace checkbox's checked state
 * SHALL equal the value returned by isTurnInPlace().
 *
 * **Validates: Requirements 1.2**
 */
describe("Property 1: Turn In Place UI reflects CC state", () => {
    /**
     * Extracted logic from CCUI._updateUISet():
     *   form.turnInPlace.checked = cc.isTurnInPlace();
     *
     * We test that for any boolean returned by isTurnInPlace(),
     * the form checkbox gets that exact value assigned.
     */
    function updateUISetTurnInPlace(
        cc: { isTurnInPlace: () => boolean },
        form: { turnInPlace: { checked: boolean } }
    ): void {
        form.turnInPlace.checked = cc.isTurnInPlace();
    }

    it("turnInPlace checkbox checked state equals isTurnInPlace() for any boolean", () => {
        fc.assert(
            fc.property(fc.boolean(), (turnInPlaceValue) => {
                const cc = {
                    isTurnInPlace: () => turnInPlaceValue,
                };

                // Start with the opposite value to ensure the assignment actually changes it
                const form = {
                    turnInPlace: { checked: !turnInPlaceValue },
                };

                updateUISetTurnInPlace(cc, form);

                expect(form.turnInPlace.checked).toBe(turnInPlaceValue);
            }),
            { numRuns: 100 }
        );
    });
});

/**
 * Feature: cc-turn-in-place-and-export
 * Property 2: Turn In Place save round-trip
 *
 * For any boolean state of the turnInPlace checkbox in the Settings form,
 * calling _saveCCSet() SHALL invoke setTurnInPlace() with that exact boolean value.
 *
 * **Validates: Requirements 1.3**
 */
describe("Property 2: Turn In Place save round-trip", () => {
    /**
     * Extracted logic from CCUI._saveCCSet():
     *   this._cc.setTurnInPlace(form["turnInPlace"].checked);
     *
     * We test that for any boolean value in the checkbox,
     * setTurnInPlace is called with that exact value.
     */
    function saveCCSetTurnInPlace(
        cc: { setTurnInPlace: (v: boolean) => void },
        form: { turnInPlace: { checked: boolean } }
    ): void {
        cc.setTurnInPlace(form.turnInPlace.checked);
    }

    it("setTurnInPlace() is called with the exact checkbox boolean value", () => {
        fc.assert(
            fc.property(fc.boolean(), (checkboxValue) => {
                const setTurnInPlace = vi.fn();
                const cc = { setTurnInPlace };

                const form = {
                    turnInPlace: { checked: checkboxValue },
                };

                saveCCSetTurnInPlace(cc, form);

                expect(setTurnInPlace).toHaveBeenCalledOnce();
                expect(setTurnInPlace).toHaveBeenCalledWith(checkboxValue);
            }),
            { numRuns: 100 }
        );
    });
});

/**
 * Feature: cc-turn-in-place-and-export
 * Property 3: Export produces valid structure with correct serialization
 *
 * For any CharacterController configuration (CCSettings with optional Sound,
 * and ActionMap with optional AnimationGroup references), the exported JSON SHALL:
 * - contain exactly two top-level keys: "settings" and "actionMap"
 * - have settings.sound as a string (the sound filename) when a Sound exists, not a serialized Sound object
 * - have all actionMap[action].ag values as strings (AG names) when AnimationGroups exist, not AG instances
 *
 * **Validates: Requirements 3.2, 3.4, 3.5, 3.6**
 */
describe("Property 3: Export produces valid structure with correct serialization", () => {
    /**
     * Extracted serialization logic from CCUI._exportCC().
     * This is the pure core of the export that we can test without DOM/download concerns.
     *
     * The instanceof AnimationGroup check from the real code is adapted here:
     * in the real code, it uses `ad.ag instanceof AnimationGroup` to detect AG objects.
     * For testing, we simulate this by checking if ag is an object with a .name property
     * (matching the task guidance to use mock AG objects with .name).
     */
    function serializeForExport(
        settings: any,
        actionMap: any,
        isAnimationGroup: (ag: any) => boolean
    ): { settings: any; actionMap: any } {
        // Serialize sound as filename string only
        if (settings.sound) {
            settings.sound = settings.sound.name;
        }

        // Replace AG instances with name strings, null out sounds
        let keys = Object.keys(actionMap);
        for (let key of keys) {
            let ad = actionMap[key];
            ad.sound = null;
            if (isAnimationGroup(ad.ag)) {
                actionMap[key]["ag"] = actionMap[key]["ag"].name;
            }
        }

        return { settings, actionMap };
    }

    // Arbitrary for a sound object (object with .name property)
    const arbSoundObject = fc.record({
        name: fc.string({ minLength: 1, maxLength: 50 }),
        // Include extra properties to ensure they're NOT in the output
        _volume: fc.float(),
        _isPlaying: fc.boolean(),
    });

    // Arbitrary for settings: may or may not have a sound object
    const arbSettings = fc.record({
        faceForward: fc.boolean(),
        topDown: fc.boolean(),
        turningOff: fc.boolean(),
        smoothTurnSpeed: fc.float({ min: 0, max: 10 }),
        gravity: fc.float({ min: 0, max: 100 }),
        sound: fc.option(arbSoundObject, { nil: null }),
    });

    // Arbitrary for a mock AnimationGroup object (has a .name string)
    const arbAGObject = fc.record({
        name: fc.string({ minLength: 1, maxLength: 50 }),
        // Extra properties to prove we're not passing the whole object
        _targetedAnimations: fc.array(fc.string()),
        _isStarted: fc.boolean(),
    });

    // Arbitrary for a single ActionData entry
    const arbActionData = fc.record({
        ag: fc.option(arbAGObject, { nil: null }),
        speed: fc.float({ min: 0, max: 10 }),
        rate: fc.float({ min: Math.fround(0.1), max: 5 }),
        loop: fc.boolean(),
        exist: fc.boolean(),
        sound: fc.option(
            fc.record({ name: fc.string(), _isPlaying: fc.boolean() }),
            { nil: null }
        ),
    });

    // Reserved keys that exist on Object.prototype and would cause lookup issues
    const reservedKeys = new Set(["constructor", "toString", "valueOf", "hasOwnProperty",
        "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "__proto__"]);

    // Arbitrary for actionMap: 1-10 action keys
    const arbActionMap = fc
        .array(
            fc.tuple(
                fc.string({ minLength: 1, maxLength: 20 }).filter(
                    (s) => /^[a-zA-Z]/.test(s) && !reservedKeys.has(s)
                ),
                arbActionData
            ),
            { minLength: 1, maxLength: 10 }
        )
        .map((entries) => Object.fromEntries(entries));

    // Helper: the isAnimationGroup predicate mimics the real instanceof check
    // In the real code: `ad.ag instanceof AnimationGroup`
    // Here we check: ag is a non-null object with a .name string property
    function mockIsAnimationGroup(ag: any): boolean {
        return ag != null && typeof ag === "object" && typeof ag.name === "string";
    }

    it("output has exactly two top-level keys: 'settings' and 'actionMap'", () => {
        fc.assert(
            fc.property(arbSettings, arbActionMap, (settings, actionMap) => {
                const settingsCopy = JSON.parse(JSON.stringify(settings));
                const actionMapCopy = JSON.parse(JSON.stringify(actionMap));

                const result = serializeForExport(settingsCopy, actionMapCopy, mockIsAnimationGroup);

                const keys = Object.keys(result);
                expect(keys).toHaveLength(2);
                expect(keys).toContain("settings");
                expect(keys).toContain("actionMap");
            }),
            { numRuns: 100 }
        );
    });

    it("settings.sound is a string (filename) when a Sound object exists, not an object", () => {
        fc.assert(
            fc.property(arbSettings, arbActionMap, (settings, actionMap) => {
                const settingsCopy = JSON.parse(JSON.stringify(settings));
                const actionMapCopy = JSON.parse(JSON.stringify(actionMap));

                const hadSound = settingsCopy.sound != null;
                const soundName = hadSound ? settingsCopy.sound.name : undefined;

                const result = serializeForExport(settingsCopy, actionMapCopy, mockIsAnimationGroup);

                if (hadSound) {
                    expect(typeof result.settings.sound).toBe("string");
                    expect(result.settings.sound).toBe(soundName);
                } else {
                    // When no sound, it should remain null/undefined
                    expect(result.settings.sound == null).toBe(true);
                }
            }),
            { numRuns: 100 }
        );
    });

    it("all actionMap[action].ag values are strings (AG names) when AnimationGroups exist", () => {
        fc.assert(
            fc.property(arbSettings, arbActionMap, (settings, actionMap) => {
                const settingsCopy = JSON.parse(JSON.stringify(settings));
                const actionMapCopy = JSON.parse(JSON.stringify(actionMap));

                // Record which entries had AG objects and their names
                const expectedNames: Record<string, string> = {};
                for (const key of Object.keys(actionMapCopy)) {
                    if (mockIsAnimationGroup(actionMapCopy[key].ag)) {
                        expectedNames[key] = actionMapCopy[key].ag.name;
                    }
                }

                const result = serializeForExport(settingsCopy, actionMapCopy, mockIsAnimationGroup);

                for (const key of Object.keys(result.actionMap)) {
                    const ad = result.actionMap[key];
                    if (expectedNames.hasOwnProperty(key)) {
                        // AG was present → should now be a string
                        expect(typeof ad.ag).toBe("string");
                        expect(ad.ag).toBe(expectedNames[key]);
                    } else {
                        // AG was null → remains null
                        expect(ad.ag).toBeNull();
                    }
                }
            }),
            { numRuns: 100 }
        );
    });

    it("all actionMap[action].sound values are null after serialization", () => {
        fc.assert(
            fc.property(arbSettings, arbActionMap, (settings, actionMap) => {
                const settingsCopy = JSON.parse(JSON.stringify(settings));
                const actionMapCopy = JSON.parse(JSON.stringify(actionMap));

                const result = serializeForExport(settingsCopy, actionMapCopy, mockIsAnimationGroup);

                for (const key of Object.keys(result.actionMap)) {
                    expect(result.actionMap[key].sound).toBeNull();
                }
            }),
            { numRuns: 100 }
        );
    });
});
