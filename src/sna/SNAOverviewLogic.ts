/**
 * Pure logic for the SNA overview dialog. No DOM or BabylonJS dependencies.
 *
 * The UI collects {@link SnaSource} entries from the scene and passes them here.
 * This module builds the table rows, applies filter/sort, and finds orphan signals.
 */

/** Minimal shape of a sensor or actuator needed by the overview. */
export interface SnaSaLike {
    getName(): string;
    getProperties(): any;
}

/** One mesh (or transform node) together with its sensors and actuators. */
export interface SnaSource {
    meshId: string;
    meshName: string;
    sensors: SnaSaLike[];
    actuators: SnaSaLike[];
}

export type SnaKind = "sensor" | "actuator";

export interface SnaRow {
    meshId: string;
    meshName: string;
    kind: SnaKind;
    name: string;
    signalId: string;
    signalEnable: string;
    signalDisable: string;
    //actuator only, undefined for sensors
    signalStart?: string;
    signalEnd?: string;
    autoStart?: boolean;
    loop?: boolean;
    toggle?: boolean;
    /** signals emitted through actuator specific properties (e.g. SignalEmitter, Health) */
    extraEmits: string[];
}

export interface SnaMeshGroup {
    meshId: string;
    meshName: string;
    rows: SnaRow[];
}

export type OrphanType = "emitted-not-received" | "received-not-emitted";

export interface OrphanSignal {
    signal: string;
    type: OrphanType;
    /** "meshName / saName" of every row that emits or listens on the signal */
    users: string[];
}

export interface SnaFilter {
    text?: string;
    showSensors?: boolean;
    showActuators?: boolean;
    /** signal id; matches rows that emit or listen on it */
    signal?: string;
}

export type SnaSortKey = "mesh" | "kind" | "name" | "signalId" | "signalEnable" | "signalDisable"
    | "signalStart" | "signalEnd" | "autoStart" | "loop" | "toggle";

/** actuator properties (besides signalStart/signalEnd) which hold signals the actuator emits. */
const EXTRA_EMIT_PROPS = ["signals", "onNoHealth", "onFullHealth"];

/** split a comma separated signal list into trimmed, non empty signals */
export function splitSignals(s: any): string[] {
    if (typeof s !== "string") return [];
    return s.split(",").map((x) => x.trim()).filter((x) => x !== "");
}

function str(v: any): string {
    return typeof v === "string" ? v : "";
}

export function buildRows(sources: SnaSource[]): SnaRow[] {
    const rows: SnaRow[] = [];
    for (const src of sources) {
        for (const s of src.sensors || []) {
            const p = s.getProperties() || {};
            rows.push({
                meshId: src.meshId, meshName: src.meshName, kind: "sensor", name: s.getName(),
                signalId: str(p.signalId), signalEnable: str(p.signalEnable), signalDisable: str(p.signalDisable),
                extraEmits: []
            });
        }
        for (const a of src.actuators || []) {
            const p = a.getProperties() || {};
            const extra: string[] = [];
            for (const k of EXTRA_EMIT_PROPS) extra.push(...splitSignals(p[k]));
            rows.push({
                meshId: src.meshId, meshName: src.meshName, kind: "actuator", name: a.getName(),
                signalId: str(p.signalId), signalEnable: str(p.signalEnable), signalDisable: str(p.signalDisable),
                signalStart: str(p.signalStart), signalEnd: str(p.signalEnd),
                autoStart: !!p.autoStart, loop: !!p.loop, toggle: !!p.toggle,
                extraEmits: extra
            });
        }
    }
    return rows;
}

/** signals this row emits */
export function emittedSignals(r: SnaRow): string[] {
    if (r.kind === "sensor") return splitSignals(r.signalId);
    return [...splitSignals(r.signalStart), ...splitSignals(r.signalEnd), ...r.extraEmits];
}

/** signals this row listens on */
export function receivedSignals(r: SnaRow): string[] {
    const list = [...splitSignals(r.signalEnable), ...splitSignals(r.signalDisable)];
    //an autoStart actuator does not need a signal to start
    if (r.kind === "actuator" && !r.autoStart) list.push(...splitSignals(r.signalId));
    return list;
}

export function filterRows(rows: SnaRow[], f: SnaFilter): SnaRow[] {
    const text = (f.text || "").trim().toLowerCase();
    const sig = (f.signal || "").trim();
    const showS = f.showSensors !== false;
    const showA = f.showActuators !== false;
    return rows.filter((r) => {
        if (r.kind === "sensor" && !showS) return false;
        if (r.kind === "actuator" && !showA) return false;
        if (sig !== "") {
            if (!emittedSignals(r).includes(sig) && !receivedSignals(r).includes(sig)) return false;
        }
        if (text !== "") {
            const hay = [r.meshName, r.name, r.signalId, r.signalEnable, r.signalDisable,
            r.signalStart || "", r.signalEnd || "", ...r.extraEmits].join("\n").toLowerCase();
            if (!hay.includes(text)) return false;
        }
        return true;
    });
}

function sortValue(r: SnaRow, key: SnaSortKey): string | number {
    switch (key) {
        case "mesh": return r.meshName.toLowerCase();
        case "kind": return r.kind;
        case "name": return r.name.toLowerCase();
        case "signalId": return r.signalId.toLowerCase();
        case "signalEnable": return r.signalEnable.toLowerCase();
        case "signalDisable": return r.signalDisable.toLowerCase();
        case "signalStart": return (r.signalStart || "").toLowerCase();
        case "signalEnd": return (r.signalEnd || "").toLowerCase();
        case "autoStart": return r.autoStart === undefined ? -1 : r.autoStart ? 1 : 0;
        case "loop": return r.loop === undefined ? -1 : r.loop ? 1 : 0;
        case "toggle": return r.toggle === undefined ? -1 : r.toggle ? 1 : 0;
    }
}

/** Returns a new sorted array. Stable, ties keep their original order. */
export function sortRows(rows: SnaRow[], key: SnaSortKey, ascending = true): SnaRow[] {
    const dir = ascending ? 1 : -1;
    return rows
        .map((r, i) => ({ r, i }))
        .sort((a, b) => {
            const va = sortValue(a.r, key);
            const vb = sortValue(b.r, key);
            if (va < vb) return -dir;
            if (va > vb) return dir;
            return a.i - b.i;
        })
        .map((x) => x.r);
}

/**
 * Group rows by mesh. Groups keep the order in which each mesh first appears in rows.
 * Meshes are keyed by id so two meshes with the same name stay separate.
 */
export function groupByMesh(rows: SnaRow[]): SnaMeshGroup[] {
    const map = new Map<string, SnaMeshGroup>();
    for (const r of rows) {
        let g = map.get(r.meshId);
        if (g === undefined) {
            g = { meshId: r.meshId, meshName: r.meshName, rows: [] };
            map.set(r.meshId, g);
        }
        g.rows.push(r);
    }
    return Array.from(map.values());
}

/**
 * Finds signals that are emitted but never received, and received but never emitted.
 * Always computed over all rows, not the filtered ones.
 */
export function findOrphanSignals(rows: SnaRow[]): OrphanSignal[] {
    const emitters = new Map<string, Set<string>>();
    const receivers = new Map<string, Set<string>>();
    const add = (m: Map<string, Set<string>>, sig: string, who: string) => {
        let s = m.get(sig);
        if (s === undefined) { s = new Set(); m.set(sig, s); }
        s.add(who);
    };
    for (const r of rows) {
        const who = r.meshName + " / " + r.name;
        for (const s of emittedSignals(r)) add(emitters, s, who);
        for (const s of receivedSignals(r)) add(receivers, s, who);
    }
    const out: OrphanSignal[] = [];
    emitters.forEach((users, sig) => {
        if (!receivers.has(sig)) out.push({ signal: sig, type: "emitted-not-received", users: Array.from(users) });
    });
    receivers.forEach((users, sig) => {
        if (!emitters.has(sig)) out.push({ signal: sig, type: "received-not-emitted", users: Array.from(users) });
    });
    out.sort((a, b) => a.signal.localeCompare(b.signal) || a.type.localeCompare(b.type));
    return out;
}
