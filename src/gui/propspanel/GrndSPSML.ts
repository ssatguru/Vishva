import { VButton } from "../components/VButton";

let gsHTML = `
<table width="100%">
<colgroup>
<col span="1" style="width: 50%;">
<col span="1" style="width: 50%;">
</colgroup>
<tr>
<td>ground sps list</td>
<td id="spsList">sps list</td>
</tr>

<tr>
<td colspan="2">

        <table width="100%">
        <colgroup>
                <col span="1" style="width: 50%;">
                <col span="1" style="width: 50%;">
        </colgroup>
        <tr>
                <td>sps name</td>
                <td id="spsName"></td>
        </tr>
        <tr>
                <td>id of mesh being spread</td>
                <td id="spsMesh"></td>
        </tr>
        <tr>
                <td>seed</td>
                <td id="spsSeed"></td>
        </tr>
        <tr>
                <td>step</td>
                <td id="spsStep"></td>
        </tr>
        <tr>
                <td>corner 1</td>
                <td id="sprdCon1"></td>
        </tr>
        <tr>
                <td>corner 2</td>
                <td id="sprdCon2"></td>
        </tr>
        <tr>
                <td colspan="2"><b>Generic Range</b></td>
        </tr>
        <tr>
                <td>position range (0,1)</td>
                <td id="posRange">
                </td>
        </tr>
        <tr>
                <td>scale range(0,1)</td>
                <td id="sclRange">
                </td>
        </tr>
        <tr>
                <td>rotation range (0,180)</td>
                <td id="rotRange">
                </td>
        <tr> 
        <tr>
                <td colspan="2"><b>Specific Range (overrides Generic)</b></td>
        </tr>
        <tr>
                <td>position min</td>
                <td id="posMin"></td>
        </tr>
        <tr>
                <td>position max</td>
                <td id="posMax"></td>
        </tr>
        <tr>
                <td>scaling min</td>
                <td id="sclMin"></td>
        </tr>
        <tr>
                <td>scaling max</td>
                <td id="sclMax"></td>
        </tr>
        <tr>
                <td>rotation min</td>
                <td id="rotMin"></td>
        </tr>
        <tr>
                <td>rotation max</td>
                <td id="rotMax"></td>
        </tr>
        </table>
        <button id="genSPSParms" title="generate parms based on size of mesh being spread">mesh default parms</button>
        <button id="genSPS">generate sps</button>
</td>
</tr>
</table>
`;

let gsElement = document.createElement("div");
gsElement.innerHTML = gsHTML;
VButton.styleThem(gsElement.getElementsByTagName("button"));


export { gsElement };