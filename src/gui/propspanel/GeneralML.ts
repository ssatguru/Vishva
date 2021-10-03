import { VButton } from "../components/VButton";
import { VThemes } from "../components/VTheme";

let genHTML = `

        
        <div >
                <label for="genID" style="vertical-align:middle;">id</label>
                <input type="text" id="genID"  class="vinput  w3-input" style="width:10%;vertical-align:middle;" readonly>
                <label for="genName" style="vertical-align:middle;">name</label>
                <input type="text" id="genName"  class="vinput  w3-input" style="width:50%;vertical-align:middle;">
                <button id="showTree" style="vertical-align:middle;">show</button>
        </div>
        
        
        <div>
                <!-- <div style="float:left;clear:left"> -->
                <div>
                        <button id="operTrans" title="translate"><span class="material-icons-outlined">open_with</span></button>
                        <button id="operRot" title="rotate"><span class="material-icons-outlined">rotate_right</span></button>
                        <button id="operScale" title="scale"><span class="material-icons-outlined">zoom_out_map</span></button>
                        <button id="operFocus" title="focus"><span class="material-icons-outlined">center_focus_strong</span></button>
                        <button id="undo" title="undo"><span class="material-icons-outlined">undo</span></button>
                        <button id="redo" title="redo"><span class="material-icons-outlined">redo</span></button>
                </div>
        </div>
        
        
        <div style="display:grid;grid-template-columns:auto auto auto auto;align-items:center;">
                
                        <div>transform</div>
                        <div>x,y,z</div>
                        <div>snap</div>
                        <div>on</div>
                

                
                        <div>position</div>
                        <div id="loc"></div>
                        <div id="snapTransValue"></div>
                        <div><input type="checkbox" id="snapTrans"></div>
                
                
                        <div>rotation</div>
                        <div id="rot"></div>
                        <div id="snapRotValue"></div>
                        <div><input type="checkbox" id="snapRot"></div>
                
                
                        <div>scaling</div>
                        <div id="scale"></div>
                        <div id="snapScaleValue"></div>
                        <div><input type="checkbox" id="snapScale"></div>  
                
                
                        <div>size</div>
                        <div id="size"></div>
                        <div></div>
                        <div></div>
                

        </div>
        
        
        <div>
                <button id="transRefresh" title="refresh"><span class="material-icons-outlined">refresh</span></button>
                <button id="transBake">bake</button>
                <button id="gridSnap">grid snap</button>
                space 
                <select class="w3-select" style="width:auto" id="genSpace" title="space for translation and rotation">
                <option value="local" >local</option>
                <option value="world">world</option>
                </select>
        </div>
        
        
        <div>
                disable <input  type="checkbox" id="genDisable">&nbsp;&nbsp;&nbsp;&nbsp;
                collision <input type="checkbox" id="genColl">&nbsp;&nbsp;&nbsp;&nbsp;
                visible <input type="checkbox" id="genVisi">&nbsp;&nbsp;&nbsp;&nbsp;
                bounding box <input type="checkbox" id="genBBox">
        </div>
        
        
        <div>
                <button id="cloneMesh" title="clone"><span class="material-icons-outlined">file_copy</span></button>
                <button id="instMesh" title="instance"><span class="material-icons-outlined">content_copy</span></button>
                <button id="downMesh" title="download mesh"><span class="material-icons-outlined">download</span></button>
                <button id="delMesh" title="delete"><span class="material-icons-outlined">clear</span></button>
        </div>
        
        
        <div>
                <button id="parentMesh" title="link as parent"><span class="material-icons-outlined">link</span></button>
                <button id="removeChildren" title="unlink as parent"><span class="material-icons-outlined">link_off</span></button>
                <button id="removeParent" title="remove parent"><span class="material-icons-outlined">person_remove</span></button>
                
        </div>
        
        
        <div>
                <button id="mergeMesh" title="merge meshes"><span class="material-icons-outlined">queue</span></button>
                <button id="subMesh" title="subtract a mesh from another"><span class="material-icons-outlined">content_cut</span></button>
                <button id="interMesh">intersect</button>


        </div>
        
        
        <div>
                <button id="swAv" title="use as avatar"><span class="material-icons-outlined">wc</span></button>
                <button id="swGnd" title="use as ground"><span class="material-icons-outlined">terrain</span></button>
        </div>
        
        
        <div>
                <button id="sNa" >sensors and actuators</button>
        </div>
        
        
        <div>
                <button id="addParticles" >add particles</button>
                <button id="remParticles" >remove particles</button>
        </div>
        

`;

let genElement = document.createElement("div");
genElement.style.display = "grid";
genElement.style.gridTemplateColumns = "auto";
genElement.style.gridGap = "0.5em";
genElement.style.alignItems = "center";
genElement.style.padding = "1em";

genElement.innerHTML = genHTML;
VButton.styleThem(genElement.getElementsByTagName("button"));


export { genElement };
