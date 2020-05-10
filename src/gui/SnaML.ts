import { VButton } from "./components/VButton";

const snaHTML: string = `
<div id="sNaDiag">
  <div id="sNaDetails">
    <ul>
      <li><a href="#sensors">Sensors</a></li>
      <li><a href="#actuators">Actuators</a></li>
    </ul>
    <div id="sensors">
      <button id="addSens">add</button>
      <select id="sensSel" class="ui-widget-content ui-corner-all"></select>
      <p></p>
      <table id="sensTbl" style="text-align: center;">
        <tr>
          <td>name</td>
          <td>signal</td>
          <td>edit</td>
          <td>del</td>
        </tr>
      </table>
    </div>
    <div id="actuators">
      <button id="addAct">add</button>
      <select id="actSel" class="ui-widget-content ui-corner-all"></select>
      <p></p>
      <table id="actTbl" style="text-align: center;">
        <tr>
          <td>name</td>
          <td>signal</td>
          <td>edit</td>
          <td>del</td>
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
</div>`;


let snaElement = document.createElement("div");
snaElement.innerHTML = snaHTML;
snaElement.style.visibility = "hidden";
VButton.styleThem(snaElement.getElementsByTagName("button"));
var fragment = new DocumentFragment()


export { snaElement };      