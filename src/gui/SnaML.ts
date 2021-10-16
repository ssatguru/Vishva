import { VButton } from "./components/VButton";

const snaHTML: string = `

<div id="sNaDetails" style="padding-top:0.5em">

  <div class="w3-bar ">
    <button class="w3-bar-item w3-btn vtablink" value="sensors" style="margin-right:1em">Sensors</button>
    <button class="w3-bar-item w3-btn vtablink" value="actuators">Actuators</button>
  </div>

  <div id="sensors" class="w3-card w3-padding vtab ">
    <select id="sensSel" class="w3-select" style="width:75%"></select>
    <button id="addSens">add</button>
    <p></p>
    <table id="sensTbl" style="text-align: left;width:100%">
      <tr>
        <td style="width:30%">NAME</td>
        <td style="width:30%">SIGNAL</td>
        <td style="width:20%;border: 0px"></td>
        <td style="width:20%;border: 0px"></td>
      </tr>
    </table>
  </div>

  <div id="actuators" class="w3-card  w3-padding vtab " style="display:none">
    <select id="actSel" class="w3-select" style="width:75%"></select>
    <button id="addAct">add</button>
    <p></p>
    <table id="actTbl" style="text-align: left;width:100%"">
      <tr>
        <td style="width:30%">NAME</td>
        <td style="width:30%">SIGNAL</td>
        <td style="width:20%;border: 0px"></td>
        <td style="width:20%;border: 0px"></td>
      </tr>
    </table>
  </div>

</div>


<div id="editSensDiag">
  <div id="editSensDiag.parms"></div>
</div>

<div id="editActDiag">
  <div id="editActDiag.parms"></div>
</div>
`;


let snaElement = document.createElement("div");
snaElement.innerHTML = snaHTML;
// snaElement.style.visibility = "hidden";
//VButton.styleThem(snaElement.getElementsByTagName("button"));

export { snaElement };