import { VButton } from "../components/VButton";

let genHTML = `
<table >
        <tr>
        <td>
                <label for="genID">id</label>
                <input type="text" id="genID" style="width:10%" readonly>
                <label for="genName">name</label>
                <input type="text" id="genName" style="width:50%">
        </td>
        </tr>
        <tr>
        <td>
                <!-- <div style="float:left;clear:left"> -->
                <div>
                <button id="operTrans" ><span class="ui-icon ui-icon-arrow-4" title="translate"></span>  </button>
                <button id="operRot" ><span class="ui-icon ui-icon-arrowrefresh-1-e" title="rotate"></span>  </button>
                <button id="operScale" ><span class="ui-icon ui-icon-arrow-4-diag" title="scale"></span>  </button>
                <button id="operFocus" ><span class="ui-icon  ui-icon-zoomin" title="focus"></span>  </button>
                <button id="undo" ><span class="ui-icon ui-icon-arrowreturnthick-1-w" title="undo"></span>  </button>
                <button id="redo"><span class="flip ui-icon ui-icon-arrowreturnthick-1-w" title="redo"></span>  </button>
                <button id="showTree">show</button>
                </div>
        </td>
        </tr>
        <tr>
        <td>
                <table>
                <tr>
                        <td>transform</td>
                        <td>x,y,z</td>
                        <td>snap</td>
                        <td>on</td>
                </tr>

                <tr>
                        <td>position</td>
                        <td id="loc"></td>
                        <td id="snapTransValue"></td>
                        <td><input type="checkbox" id="snapTrans"></td>
                </tr>
                <tr>
                        <td>rotation</td>
                        <td id="rot"></td>
                        <td id="snapRotValue"></td>
                        <td><input type="checkbox" id="snapRot"></td>
                </tr>
                <tr>
                        <td>scaling</td>
                        <td id="scale"></td>
                        <td id="snapScaleValue"></td>
                        <td><input type="checkbox" id="snapScale"></td>  
                </tr>
                <tr>
                        <td>size</td>
                        <td id="size"></td>
                        <td></td>
                        <td></td>
                </tr>
                </table>
        </td>
        </tr>
        <tr>
        <td>
                <button id="transRefresh"><span class="ui-icon ui-icon-refresh" title="refresh"></span></button>
                <button id="transBake">bake</button>
                <button id="gridSnap">grid snap</button>
                space 
                <select id="genSpace" title="space for translation and rotation">
                <option value="local" >local</option>
                <option value="world">world</option>
                </select>
        </td>
        </tr>
        <tr>
        <td>
                disable <input type="checkbox" id="genDisable">
                collision <input type="checkbox" id="genColl">
                visible <input type="checkbox" id="genVisi">
                bounding box <input type="checkbox" id="genBBox">
        </td>
        </tr>
        <tr>
        <td>
                <button id="cloneMesh"><span class="ui-icon ui-icon-copy" title="clone"></span> </button>
                <button id="instMesh"><span class="flip ui-icon  ui-icon-newwin" title="instance"></span></button>
                <button id="downMesh"><span class="ui-icon ui-icon-arrowthickstop-1-s" title="download mesh"></span> </button>
                <button id="delMesh"><span class="ui-icon ui-icon-trash" title="delete"></span> </button>
        </td>
        </tr>
        <tr>
        <td>
                <button id="parentMesh">parent</button>
                <button id="removeParent">remove parent</button>
                <button id="removeChildren">remove children</button>
        </td>
        </tr>
        <tr>
        <td>
                <button id="mergeMesh"><span class="ui-icon  ui-icon-link" title="merge meshes"></span> </button>
                <button id="subMesh"><span class="ui-icon  ui-icon-scissors" title="subtract a mesh from another"></span> </button>
                <button id="interMesh">intersect</button>


        </td>
        </tr>
        <tr>
        <td>
                <button id="swAv"><span class="ui-icon ui-icon-person" title="use as avatar"></span> </button>
                <button id="swGnd"><span class="ui-icon ui-icon-grip-solid-horizontal" title="use as ground"></span> </button>
        </td>
        </tr>
        <tr>
        <td>
                <button id="sNa" >
                <span class="ui-icon inline ui-icon-signal-diag" title="add sensors or actuators"></span>
                <span class="ui-icon inline  ui-icon-gear" title="add sensors or actuators"></span>     
                </button>
        </td>
        </tr>
        <tr>
        <td>
                <button id="addParticles" >add particles</button>
                <button id="remParticles" >remove particles</button>
        </td>
        </tr>
</table>
`;

let genElement = document.createElement("div");
genElement.innerHTML = genHTML;
VButton.styleThem(genElement.getElementsByTagName("button"));


export { genElement };
