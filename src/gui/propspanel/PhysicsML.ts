import { VButton } from "../components/VButton";

let phyHTML = `
<table>
        <tr>
        <td>enabled</td>
        <td><input type="checkbox" id="phyEna" ></td>
        </tr>
        <tr>
        <td>type</td>
        <td>
                <select id="phyType" class = "w3-select">
                <option value="2" >box</option>
                <option value="1">sphere</option>
                <option value="3">plane</option>
                <option value="7">cylinder</option>
                <option value="4">mesh</option>
                <!--
                <option value="8">particle</option>
                <option value="9">height map</option>
                -->
                </select>
        </td>
        </tr>
        <tr>
        <td>mass</td>
        <td><input type="text" class = "w3-input" id="phyMass" size="3" value="1"></td>
        </tr>
        <tr>
        <td>restitution (0 to 1) <output for="phyRes" id="phyResVal"></output></td>
        <td>
                <input type="range" id="phyRes" min="0.0" max="1.0" step="0.1" value="0.0">
        </td>
        </tr>
        <tr>
        <td>friction (0 to 1) <output for="phyFric" id="phyFricVal"></output> </td>
        <td>
                <input type="range" id="phyFric" min="0.0" max="1.0" step="0.1" value="0.0">
        </td>
        </tr>
        <tr>
        <td>disable bidirectional transformation</td>
        <td>
                <input type="checkbox" id="phyDBD" >

        </td>
        </tr>
</table>
<br>
<button id ="phyApply">apply</button>
<button id ="phyTest"  title="test how physics work">test</button>
<button id ="phyReset" title="reset to state before test">reset</button>`;

let phyElement = document.createElement("div");
phyElement.innerHTML = phyHTML;
VButton.styleThem(phyElement.getElementsByTagName("button"));


export { phyElement };