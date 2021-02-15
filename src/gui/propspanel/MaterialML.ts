import { VButton } from "../components/VButton";

let matHTML = `
<table >
        <tr>
        <td >
                transparency  <output for="matVis" id="matVisVal"></output>   
        </td>
        <td style="text-align: left;">
                <input type="range" id="matVis" min="0.0" max="1.0" step="0.01" value="1.00">
        </td>
        </tr>
        <tr>
        <td >
                material count
        </td>
        <td >
                <label id="matCount"></label>
        </td>
        </tr>
        <tr>
        <td >
                material   
        </td>
        <td >
                <select id="matIDs" class="w3-select"></Select>
        </td>
        </tr>
        
        <tr>
        <td colspan="2">
                <table style="border: 1px solid white;">
                <tr>
                        <td>
                        id
                        </td>
                        <td id="matID" colspan="2">
                        id
                        </td>
                </tr>
                <tr>
                        <td>
                        name
                        </td>
                        <td id="matName" colspan="2">
                        name
                        </td>
                </tr>
                <tr>
                        <td>
                        type
                        </td>
                        <td id="matType" colspan="2">
                        name
                        </td>
                </tr>
                <tr>
                        <td>
                        hide back face?
                        </td>
                        <td colspan="2"><input type="checkbox" id="matBF"></td>
                </tr>
                <tr>
                        <td>
                        colors
                        </td>
                        <td>
                        <select id="matColType" class="w3-select">
                                <option value="diffuse">diffuse</option>
                                <option value="emissive">emissive</option>
                                <option value="ambient">ambient</option>
                                <option value="specular">specular</option>
                        </select>
                        </td>
                        <td>
                        <div id="matCol"></div>
                        </td>
                </tr>
                <tr>
                        <td>
                        textures 
                        </td>
                        <td>
                        <select id="matTextType" class="w3-select">
                                <option value="diffuse">diffuse</option>
                                <option value="emissive">emissive</option>
                                <option value="ambient">ambient</option>
                                <option value="specular">specular</option>
                                <option value="bump">bump</option>
                                <option value="lightMap">light map</option>
                                <option value="opacity">opacity</option>
                                <option value="reflection">reflection</option>
                                <option value="refraction">refraction</option>
                        </select>
                        </td>
                        <td>
                        <img id="matTextImg" src="" height="128" width="128" style="cursor:pointer;" alt="tga images cannot be displayed" >
                        <button id="matCreateText" style="display:none">create texture</button>
                        <button id="matRemText" style="display:none">remove texture</button>
                        </td>
                </tr>
                </table>
        </td>
        </tr>
        <tr>
        <td colspan="2">
                <button id="matClone"> clone and use </button>
                <button id="matReplace">change</button>
        </td>
        </tr>
</table>
`;

let matElement = document.createElement("div");
matElement.innerHTML = matHTML;
VButton.styleThem(matElement.getElementsByTagName("button"));


export { matElement };