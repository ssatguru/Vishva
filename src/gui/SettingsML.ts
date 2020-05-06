
const settingHTML: string = `
<div id="settingDiag" title="Settings" data-keyboard="false">
        <table style="width: 100%; text-align: center;">
                <tr>
                        <td>camera collision</td>
                        <td><input id="camCol" type="checkbox"/></td>
                </tr>
                <tr>
                        <td>show edit menu on mesh selection</td>
                        <td><input id="autoEditMenu" type="checkbox"/></td>
                </tr>
                <tr>
                        <td>show tooltips</td>
                        <td><input id="showToolTips" type="checkbox"/></td>
                </tr>
                <tr>
                        <td>show invisibles</td>
                        <td><input type="checkbox" id="showInvis"></td>
                </tr>
                <tr>
                        <td>show disabled</td>
                        <td><input type="checkbox" id="showDisa"></td>
                </tr>
                <tr>
                        <td>enable snapper</td>
                        <td><input type="checkbox" id="snapper"></td>
                </tr>
        <table>
</div>
`;

export { settingHTML };
