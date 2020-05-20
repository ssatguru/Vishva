import { VButton } from "./components/VButton";

const snaHTML: string = `
<div id="sNaDiag">
  <div id="sNaDetails">

    <div class="w3-bar ">
      <button class="w3-bar-item w3-btn vtablink  w3-theme-d2" value="sensors">Sensors</button>
      <button class="w3-bar-item w3-btn vtablink" value="actuators">Actuators</button>
    </div>

    <div id="sensors" class="w3-card w3-padding vtab w3-theme-d2">
      <select id="sensSel" class="w3-select" style="width:75%"></select>
      <button id="addSens" class="w3-btn w3-theme-l1 w3-round">add</button>
      <p></p>
      <table id="sensTbl" style="text-align: left;">
        <tr>
          <td style="width:30%">NAME</td>
          <td style="width:30%">SIGNAL</td>
          <td style="width:20%"></td>
          <td style="width:20%"></td>
        </tr>
      </table>
    </div>

    <div id="actuators" class="w3-card  w3-padding vtab w3-theme-d2" style="display:none">
      <select id="actSel" class="w3-select" style="width:75%"></select>
      <button id="addAct" class="w3-btn w3-theme-l1 w3-round">add</button>
      <p></p>
      <table id="actTbl" style="text-align: left;">
        <tr>
          <td style="width:30%">NAME</td>
          <td style="width:30%">SIGNAL</td>
          <td style="width:20%"></td>
          <td style="width:20%"></td>
        </tr>
      </table>
    </div>
    
  </div>
</div>

<div id="editSensDiag">
  Sensor:<label id="editSensDiag.sensName">sensor name</label>
  <p>Sensor Properties</p>
  <div id="editSensDiag.parms"></div>
</div>

<div id="editActDiag">
  Actuator:<label id="editActDiag.actName">actuator name</label>
  <p>Actuator Properties</p>
  <div id="editActDiag.parms"></div>
</div>
`;


let snaElement = document.createElement("div");
snaElement.innerHTML = snaHTML;
snaElement.style.visibility = "hidden";
//VButton.styleThem(snaElement.getElementsByTagName("button"));

export { snaElement };      