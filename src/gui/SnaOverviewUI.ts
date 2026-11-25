import { TransformNode } from "babylonjs";
import { Vishva } from "../Vishva";
import { VDiag } from "./components/VDiag";
import { createSnaOverviewElement } from "./SnaOverviewML";
import {
    SnaSource, SnaRow, SnaSortKey, buildRows, filterRows, sortRows, groupByMesh, findOrphanSignals
} from "../sna/SNAOverviewLogic";

interface Col { key: SnaSortKey; label: string; }

const COLS: Col[] = [
    { key: "kind", label: "Type" },
    { key: "name", label: "Name" },
    { key: "signalId", label: "signalId" },
    { key: "signalEnable", label: "signalEnable" },
    { key: "signalDisable", label: "signalDisable" },
    { key: "signalStart", label: "signalStart" },
    { key: "signalEnd", label: "signalEnd" },
    { key: "autoStart", label: "autoStart" },
    { key: "loop", label: "loop" },
    { key: "toggle", label: "toggle" },
];

/**
 * Read only, mesh centric overview of all sensors and actuators in the scene,
 * plus a list of orphan signals.
 */
export class SnaOverviewUI {

    private _vishva: Vishva;
    private _diag: VDiag;
    private _root: HTMLElement;
    private _allRows: SnaRow[] = [];
    private _sortKey: SnaSortKey = "mesh";
    private _asc: boolean = true;
    private _collapsed: Set<string> = new Set();

    constructor() {
        this._vishva = Vishva.vishva;
    }

    public isOpen(): boolean {
        return this._diag != null && this._diag.isShown();
    }

    public toggle() {
        if (this.isOpen()) {
            this._diag.hide();
        } else {
            this.show();
        }
    }

    public show() {
        if (this._diag == null) {
            this._root = createSnaOverviewElement();
            this._wire();
            this._diag = new VDiag(this._root, "Sensors and Actuators Overview", VDiag.center, "auto", "auto", "auto", false, true);
            this._diag.setBackGround("var(--v-dark-bg)");
            this._diag.setForeGround("var(--v-dark-fg)");
            this._diag.onShow = () => this._vishva.disableKeys();
            this._diag.onHide = () => this._vishva.enableKeys();
        } else {
            this._diag.show();
        }
        this.refresh();
    }

    private _el<T extends HTMLElement>(id: string): T {
        return <T>this._root.querySelector("#" + id);
    }

    private _wire() {
        const rerender = () => this._render();
        this._el<HTMLInputElement>("snaOvText").oninput = rerender;
        this._el<HTMLInputElement>("snaOvSignal").oninput = rerender;
        this._el<HTMLInputElement>("snaOvSens").onchange = rerender;
        this._el<HTMLInputElement>("snaOvAct").onchange = rerender;
        this._el<HTMLButtonElement>("snaOvRefresh").onclick = () => { this.refresh(); return true; };
    }

    /** re-read the scene and redraw */
    public refresh() {
        this._allRows = buildRows(this._collect());
        this._render();
    }

    private _collect(): SnaSource[] {
        const scene = this._vishva.scene;
        const nodes: TransformNode[] = [];
        for (const n of scene.transformNodes) nodes.push(n);
        for (const m of scene.meshes) nodes.push(<any>m);
        const seen = new Set<number>();
        const out: SnaSource[] = [];
        for (const n of nodes) {
            if (seen.has(n.uniqueId)) continue;
            seen.add(n.uniqueId);
            const sensors = n["sensors"] || [];
            const actuators = n["actuators"] || [];
            if (sensors.length === 0 && actuators.length === 0) continue;
            out.push({ meshId: n.uniqueId.toString(), meshName: n.name, sensors: [...sensors], actuators: [...actuators] });
        }
        return out;
    }

    private _render() {
        const rows = sortRows(
            filterRows(this._allRows, {
                text: this._el<HTMLInputElement>("snaOvText").value,
                signal: this._el<HTMLInputElement>("snaOvSignal").value,
                showSensors: this._el<HTMLInputElement>("snaOvSens").checked,
                showActuators: this._el<HTMLInputElement>("snaOvAct").checked,
            }),
            this._sortKey, this._asc);
        const groups = groupByMesh(rows);
        //when sorting by mesh, order the groups by mesh name, else by first row
        if (this._sortKey === "mesh") {
            groups.sort((a, b) => a.meshName.toLowerCase() < b.meshName.toLowerCase() ? (this._asc ? -1 : 1)
                : a.meshName.toLowerCase() > b.meshName.toLowerCase() ? (this._asc ? 1 : -1) : 0);
        }

        this._renderHead();
        const body = this._el<HTMLElement>("snaOvBody");
        body.textContent = "";
        for (const g of groups) {
            const collapsed = this._collapsed.has(g.meshId);
            const hr = document.createElement("tr");
            hr.style.cursor = "pointer";
            hr.style.backgroundColor = "var(--v-color-bg)";
            hr.style.color = "var(--v-color-fg)";
            const hc = document.createElement("td");
            hc.colSpan = COLS.length;
            hc.style.fontWeight = "bold";
            hc.textContent = (collapsed ? "\u25B6 " : "\u25BC ") + g.meshName + "  (" + g.rows.length + ")";
            hc.title = "click to select mesh, double click to collapse or expand";
            hc.onclick = () => this._select(g.meshId, true);
            hc.ondblclick = () => {
                if (this._collapsed.has(g.meshId)) this._collapsed.delete(g.meshId);
                else this._collapsed.add(g.meshId);
                this._render();
            };
            hr.appendChild(hc);
            body.appendChild(hr);
            if (collapsed) continue;
            for (const r of g.rows) body.appendChild(this._rowEl(r));
        }
        this._el<HTMLElement>("snaOvCount").textContent =
            groups.length + " meshes, " + rows.length + " of " + this._allRows.length + " items";
        this._renderOrphans();
    }

    private _renderHead() {
        const head = this._el<HTMLElement>("snaOvHead");
        head.textContent = "";
        const tr = document.createElement("tr");
        const mk = (key: SnaSortKey, label: string) => {
            const th = document.createElement("th");
            th.style.cursor = "pointer";
            th.style.padding = "0.2em 0.5em";
            th.style.position = "sticky";
            th.style.top = "0";
            th.style.backgroundColor = "var(--v-light-bg)";
            th.style.color = "var(--v-light-fg)";
            th.textContent = label + (this._sortKey === key ? (this._asc ? " \u25B2" : " \u25BC") : "");
            th.onclick = () => {
                if (this._sortKey === key) this._asc = !this._asc;
                else { this._sortKey = key; this._asc = true; }
                this._render();
            };
            tr.appendChild(th);
        };
        //first header sorts by mesh (groups); remaining ones sort rows within a mesh
        for (const c of COLS) mk(c.key, c.label);
        head.appendChild(tr);
        const mt = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = COLS.length;
        td.style.cursor = "pointer";
        td.style.fontSize = "smaller";
        td.textContent = "sort meshes by name" + (this._sortKey === "mesh" ? (this._asc ? " \u25B2" : " \u25BC") : "");
        td.onclick = () => {
            if (this._sortKey === "mesh") this._asc = !this._asc;
            else { this._sortKey = "mesh"; this._asc = true; }
            this._render();
        };
        mt.appendChild(td);
        head.appendChild(mt);
    }

    private _rowEl(r: SnaRow): HTMLTableRowElement {
        const tr = document.createElement("tr");
        tr.style.cursor = "pointer";
        tr.title = "click to select " + r.meshName;
        tr.onclick = () => this._select(r.meshId, false);
        const cell = (txt: string) => {
            const td = document.createElement("td");
            td.style.padding = "0.15em 0.5em";
            td.textContent = txt;
            tr.appendChild(td);
        };
        const bool = (v: boolean | undefined) => v === undefined ? "\u2013" : v ? "\u2611" : "\u2610";
        const sig = (v: string | undefined) => v === undefined || v === "" ? "\u2013" : v;
        cell(r.kind === "sensor" ? "S" : "A");
        cell(r.name);
        cell(sig(r.signalId));
        cell(sig(r.signalEnable));
        cell(sig(r.signalDisable));
        cell(r.kind === "sensor" ? "\u2013" : sig(r.signalStart));
        cell(r.kind === "sensor" ? "\u2013" : sig(r.signalEnd));
        cell(bool(r.autoStart));
        cell(bool(r.loop));
        cell(bool(r.toggle));
        return tr;
    }

    private _renderOrphans() {
        const orphans = findOrphanSignals(this._allRows);
        this._el<HTMLElement>("snaOvOrphanSum").textContent = "Orphan signals (" + orphans.length + ")";
        const div = this._el<HTMLElement>("snaOvOrphanBody");
        div.textContent = "";
        if (orphans.length === 0) {
            div.textContent = "none";
            return;
        }
        const tbl = document.createElement("table");
        tbl.style.width = "100%";
        tbl.style.textAlign = "left";
        const hd = document.createElement("tr");
        for (const h of ["Signal", "Problem", "Used by"]) {
            const th = document.createElement("th");
            th.textContent = h;
            th.style.padding = "0.15em 0.5em";
            hd.appendChild(th);
        }
        tbl.appendChild(hd);
        for (const o of orphans) {
            const tr = document.createElement("tr");
            tr.style.cursor = "pointer";
            tr.title = "click to filter on this signal";
            tr.onclick = () => {
                this._el<HTMLInputElement>("snaOvSignal").value = o.signal;
                this._render();
            };
            const vals = [o.signal,
            o.type === "emitted-not-received" ? "emitted, nobody listens" : "listened, nobody emits",
            o.users.join(", ")];
            for (const v of vals) {
                const td = document.createElement("td");
                td.style.padding = "0.15em 0.5em";
                td.textContent = v;
                tr.appendChild(td);
            }
            tbl.appendChild(tr);
        }
        div.appendChild(tbl);
    }

    private _select(meshId: string, focus: boolean) {
        this._vishva.selectMesh(meshId);
        if (focus && this._vishva.meshSelected != null) this._vishva.setFocusOnMesh();
    }
}
