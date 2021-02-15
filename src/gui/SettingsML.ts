
const settingHTML: string = `
<div id="settingDiag" style="display:grid; grid-template-columns:auto auto;data-keyboard="false">
        <div>camera collision</div>
        <div><input id="camCol" type="checkbox"/></div>

        <div>show edit menu on mesh selection</div>
        <div><input id="autoEditMenu" type="checkbox"/></div>

        <div>show tooltips</div>
        <div><input id="showToolTips" type="checkbox"/></div>

        <div>show invisibles</div>
        <div><input type="checkbox" id="showInvis"></div>

        <div>show disabled</div>
        <div><input type="checkbox" id="showDisa"></div>

        <div>enable snapper</div>
        <div><input type="checkbox" id="snapper"></div>
</div>
`;

export { settingHTML };
