import { VButton } from "../components/VButton";

let gdHTML = `
<table>
        <tr>
        <td>ground name</td>
        <td id="grndID"/>
        </tr>
        <tr>
        <td>width</td>
        <td id="grndW"/>
        </tr>
        <tr>
        <td>length</td>
        <td id="grndL"/>
        </tr>
        <tr>
        <td>subdivisions</td>
        <td id="grndS"/>
        </tr>
        <tr>
        <td>height map</td>
        <td id="grndHM"/>
        </tr>

        <tr>
        <td>min height</td>
        <td id="grndminH"/>
        </tr>
        <tr>
        <td>max height</td>
        <td id="grndmaxH"/>
        </tr>
        <tr>
        <td>uv offset</td>
        <td id="grndUVOffset"/>
        </tr>
        <tr>
        <td>uv scale</td>
        <td id="grndUVScale"/>
        </tr>
        <tr>
        <td>filter color</td>
        <td id="grndFC"/>
        </tr>
        <tr>
        <td colspan="2">
                <button id="grndUpdate">update contour</button>
        </td>
        </tr>
</table>
`;

let gdElement = document.createElement("div");
gdElement.innerHTML = gdHTML;
VButton.styleThem(gdElement.getElementsByTagName("button"));


export { gdElement };