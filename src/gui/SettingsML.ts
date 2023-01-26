
const settingHTML: string = `
<div id="settingDiag" style="padding:0.5em; display:grid; grid-template-columns:auto auto; grid-gap:0.5em;">
        <div>camera collision</div>
        <div><input type="checkbox" id="camCol" /></div>

        <div>show edit menu on mesh selection</div>
        <div><input type="checkbox" id="autoEditMenu" /></div>

        <div>show tooltips</div>
        <div><input type="checkbox" id="showToolTips" /></div>

        <div>reveal invisibles</div>
        <div><input type="checkbox" id="revealInvis"></div>

        <div>show disabled</div>
        <div><input type="checkbox" id="showDisa"></div>

        <div>enable snapper</div>
        <div><input type="checkbox" id="snapper"></div>
</div>
`;

export { settingHTML };
