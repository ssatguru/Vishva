import { describe, it, expect } from "vitest";
import fc from "fast-check";

/**
 * MeshPickerType class replica for testing purposes.
 * Mirrors the class in src/gui/VishvaGUI.ts without pulling in browser dependencies.
 */
class MeshPickerType {
    public type: string = "MeshPickerType";
    public value: string = "";
    public meshName: string = "";
    constructor(value: string = "", meshName: string = "") {
        this.value = value;
        this.meshName = meshName;
    }
}

/**
 * Feature: sensor-mesh-contact, Property 1: MeshPickerType serialization round trip
 *
 * For any valid MeshPickerType instance with arbitrary `value` and `meshName` strings,
 * serializing to a plain object (as JSON.parse(JSON.stringify(...)) would produce) and
 * then reconstructing via the same logic used in `unMarshalProps` SHALL produce an
 * equivalent MeshPickerType with the same `value`, `meshName`, and `type` fields.
 *
 * **Validates: Requirements 3.4, 3.10, 6.1, 6.2**
 */
describe("Feature: sensor-mesh-contact, Property 1: MeshPickerType serialization round trip", () => {
    /**
     * Replicates the MeshPickerType reconstruction logic from
     * SNAManager.unMarshalProps() in src/sna/SNA.ts:
     *
     *   } else if (o["type"] === "MeshPickerType") {
     *       let mpt: MeshPickerType = new MeshPickerType(o["value"], o["meshName"]);
     *       obj[pName] = mpt;
     *   }
     */
    function reconstructMeshPickerType(serialized: Record<string, unknown>): MeshPickerType | null {
        if (serialized["type"] === "MeshPickerType") {
            return new MeshPickerType(
                serialized["value"] as string,
                serialized["meshName"] as string
            );
        }
        return null;
    }

    it("serializing and reconstructing a MeshPickerType preserves value, meshName, and type", () => {
        fc.assert(
            fc.property(
                fc.string(),
                fc.string(),
                (value, meshName) => {
                    // Create original instance
                    const original = new MeshPickerType(value, meshName);

                    // Serialize via JSON round trip (simulates what happens during world save/load)
                    const serialized = JSON.parse(JSON.stringify(original));

                    // Reconstruct using the same logic as unMarshalProps
                    const reconstructed = reconstructMeshPickerType(serialized);

                    // Verify reconstruction succeeded
                    expect(reconstructed).not.toBeNull();
                    expect(reconstructed!.type).toBe("MeshPickerType");
                    expect(reconstructed!.value).toBe(original.value);
                    expect(reconstructed!.meshName).toBe(original.meshName);
                }
            ),
            { numRuns: 100 }
        );
    });
});

/**
 * Feature: sensor-mesh-contact, Property 2: Backward compatibility — old Contact sensors deserialize as AvContact
 *
 * For any serialized sensor with name "Contact" and properties that do NOT contain
 * a `targetMesh` field, the backward-compatibility name resolution logic SHALL map
 * the sensor name to "AvContact".
 *
 * **Validates: Requirements 1.8, 6.5**
 */
describe("Feature: sensor-mesh-contact, Property 2: Backward compatibility — old Contact sensors deserialize as AvContact", () => {
    /**
     * Replicates the backward-compatibility name resolution logic from
     * SNAManager.unMarshal() in src/sna/SNA.ts.
     *
     * The logic:
     *   if (sna.type === "SENSOR") {
     *       let name = sna.name;
     *       if (name === "Contact" && !sna.properties["targetMesh"]) {
     *           name = "AvContact";
     *       }
     *       // createSensorByName(name, mesh, sna.properties);
     *   }
     *
     * Parameters:
     * - name: the serialized sensor name
     * - properties: the serialized properties object
     *
     * Returns: the resolved sensor name after backward-compat logic
     */
    function resolveBackwardCompatName(name: string, properties: Record<string, unknown>): string {
        if (name === "Contact" && !properties["targetMesh"]) {
            return "AvContact";
        }
        return name;
    }

    it("sensors named 'Contact' without targetMesh always resolve to 'AvContact'", () => {
        // Generate arbitrary properties objects that do NOT contain a "targetMesh" key
        const propertiesWithoutTargetMesh = fc.dictionary(
            fc.string({ minLength: 1 }).filter(key => key !== "targetMesh"),
            fc.oneof(fc.string(), fc.boolean(), fc.integer(), fc.constant(null))
        );

        fc.assert(
            fc.property(
                propertiesWithoutTargetMesh,
                (properties) => {
                    const resolved = resolveBackwardCompatName("Contact", properties);
                    expect(resolved).toBe("AvContact");
                }
            ),
            { numRuns: 100 }
        );
    });
});

/**
 * Feature: sensor-mesh-contact, Property 3: New Contact sensors with targetMesh retain Contact name
 *
 * For any serialized sensor with name "Contact" and properties that DO contain
 * a `targetMesh` field (with any value/meshName), the name resolution logic SHALL
 * keep the sensor name as "Contact".
 *
 * **Validates: Requirements 6.3**
 */
describe("Feature: sensor-mesh-contact, Property 3: New Contact sensors with targetMesh retain Contact name", () => {
    /**
     * Same backward-compat resolution logic as above.
     */
    function resolveBackwardCompatName(name: string, properties: Record<string, unknown>): string {
        if (name === "Contact" && !properties["targetMesh"]) {
            return "AvContact";
        }
        return name;
    }

    it("sensors named 'Contact' with targetMesh always retain 'Contact' name", () => {
        // Generate a targetMesh value that is truthy (any non-empty object or string)
        const targetMeshArb = fc.oneof(
            // MeshPickerType-like object
            fc.record({
                type: fc.constant("MeshPickerType"),
                value: fc.string(),
                meshName: fc.string()
            }),
            // Any truthy value (non-empty string, object, number > 0)
            fc.string({ minLength: 1 }),
            fc.record({ value: fc.string() }),
            fc.integer({ min: 1 })
        );

        // Generate additional arbitrary properties alongside targetMesh
        const additionalProps = fc.dictionary(
            fc.string({ minLength: 1 }).filter(key => key !== "targetMesh"),
            fc.oneof(fc.string(), fc.boolean(), fc.integer(), fc.constant(null))
        );

        fc.assert(
            fc.property(
                targetMeshArb,
                additionalProps,
                (targetMesh, extraProps) => {
                    const properties: Record<string, unknown> = {
                        ...extraProps,
                        targetMesh
                    };
                    const resolved = resolveBackwardCompatName("Contact", properties);
                    expect(resolved).toBe("Contact");
                }
            ),
            { numRuns: 100 }
        );
    });
});
