import { VButton } from "./components/VButton";

let txtrHTML = `
<div id="textureDiag">
<table>
  <tr>
    <td>texture id</td>
    <td id="textID">id</td>
  </tr>
  <tr>
    <td>texture type</td>
    <td id="textType">type</td>
  </tr>
  <tr>
    <td>image</td>
    <td>
      <img id="textImg" src="" height="256" width="256" alt="no images" />
      <br />
      <button id="changeTexture">change</button>
    </td>
  </tr>
  <tr>
    <td>
      image source
    </td>
    <td id="textImgSrc">/textures/....</td>
  </tr>
  <tr>
    <td>Horizontal Scale</td>
    <td>
      <input type="text" id="matHScale" value="1.00" />
    </td>
  </tr>
  <tr>
    <td>
      Vertical Scale
    </td>
    <td>
      <input type="text" id="matVScale" value="1.00" />
    </td>
  </tr>
  <tr>
    <td>
      Rotation
    </td>
    <td>
      <input type="range" id="matURot" min="0.0" max="360.0" step="0.01" value="1.00" />U<br />
      <input type="range" id="matVRot" min="0.0" max="360.0" step="0.01" value="1.00" />V<br />
      <input type="range" id="matWRot" min="0.0" max="360.0" step="0.01" value="1.00" />W
    </td>
  </tr>
  <tr>
    <td>
      Horizontal Offset
    </td>
    <td>
      <input type="range" id="matHO" min="0.0" max="1.0" step="0.01" value="0.00" />
    </td>
  </tr>
  <tr>
    <td>
      Vertical Offset
    </td>
    <td>
      <input type="range" id="matVO" min="0.0" max="1.0" step="0.01" value="0.00" />
    </td>
  </tr>
</table>
</div>
`;

let txtrElement = document.createElement("div");
txtrElement.style.visibility = "hidden";
txtrElement.innerHTML = txtrHTML;
VButton.styleThem(txtrElement.getElementsByTagName("button"));


export { txtrElement };