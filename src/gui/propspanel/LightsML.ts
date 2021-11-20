import { VButton } from "../components/VButton";

let lightHTML = `
<table>
        <tr>
        <td>attach</td>
        <td><input type="checkbox" id="lightAtt" ></td>
        </tr>
        <tr>
        <td>type</td>
        <td><select id="lightType" class="w3-select" oninput="showOpt();">
                <option value="Spot">spot</option>
                <option value="Dir">directional</option>
                <option value="Point">point</option>
                <option value="Hemi">hemispheric</option>
                </select></td>
        </tr>
        <tr>
        <td>diffuse</td>
        <td><div id="lightDiff"></div></td>
        </tr>
        <tr>
        <td>specular </td>
        <td><div id="lightSpec"></div></td>
        </tr>
        <tr>
        <td>intensity </td>
        <td>
                <input type="range" class="w3-input" id="lightInten" min="0.0" max="1.0" step="0.1" value="0.0">
        </td>
        </tr>
        <tr>
        <td>range</td>
        <td>
                <input type="text" class="w3-input" id="lightRange" size="3" value="1">
        </td>
        </tr>
        <tr>
        <td>radius</td>
        <td>
                <input type="text" class="w3-input" id="lightRadius" size="3" value="1">
        </td>
        </tr>
        <tr class="opt Spot">
        <td>angle</td>
        <td>
                <input type="range" id="lightAngle" min="0.0" max="180.0" step="1" value="45.0">
        </td>
        </tr>
        <tr class="opt Spot">
        <td>exponent</td>
        <td>
                <input type="text" id="lightExp" size="3" value="1">
        </td>
        </tr>
        <tr class="opt Hemi">
        <td>ground color</td>
        <td>
                <input type="color" id="lightGndClr" value="#ffffff">
        </td>
        </tr>
        <tr class="opt Hemi">
        <td>direction (x,y,z)</td>
        <td>
                <input type="text" id="lightDirX" class="w3-input" size="1" value="1">
                <input type="text" id="lightDirY" class="w3-input" size="1" value="1">
                <input type="text" id="lightDirZ" class="w3-input" size="1" value="1">
        </td>
        </tr>
</table>
`;

let lightElement = document.createElement("div");
lightElement.innerHTML = lightHTML;
VButton.styleThem(lightElement.getElementsByTagName("button"));


export { lightElement };