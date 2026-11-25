/**
 * Markup for the SNA overview dialog. Logic lives in SnaOverviewUI.ts
 */
export const snaOverviewHTML: string = `
<div id="snaOv" style="padding:0.5em;min-width:42em;color:var(--v-dark-fg);background-color:var(--v-dark-bg)">

  <div id="snaOvBar" style="display:flex;flex-wrap:wrap;gap:0.5em;align-items:center;margin-bottom:0.5em">
    <input id="snaOvText" class="w3-input" type="text" placeholder="filter mesh, name or signal" style="width:14em">
    <input id="snaOvSignal" class="w3-input" type="text" placeholder="signal" title="show only items emitting or listening on this signal" style="width:8em">
    <label><input id="snaOvSens" type="checkbox" checked> Sensors</label>
    <label><input id="snaOvAct" type="checkbox" checked> Actuators</label>
    <button id="snaOvRefresh" class="w3-button w3-small">Refresh</button>
    <span id="snaOvCount" style="margin-left:auto"></span>
  </div>

  <div id="snaOvTblWrap" style="overflow:auto;max-height:60vh">
    <table id="snaOvTbl" style="width:100%;border-collapse:collapse;text-align:left">
      <thead id="snaOvHead"></thead>
      <tbody id="snaOvBody"></tbody>
    </table>
  </div>

  <details id="snaOvOrphans" style="margin-top:0.5em">
    <summary id="snaOvOrphanSum">Orphan signals</summary>
    <div id="snaOvOrphanBody" style="overflow:auto;max-height:15em"></div>
  </details>

</div>
`;

export function createSnaOverviewElement(): HTMLElement {
    const div = document.createElement("div");
    div.innerHTML = snaOverviewHTML;
    return <HTMLElement>div.firstElementChild;
}
