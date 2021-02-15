import { VButton } from "../components/VButton";

let genHTML = `

        
        <div>
                <label for="genID">id</label>
                <input type="text" id="genID"  class="vinput  w3-input" style="width:10%" readonly>
                <label for="genName">name</label>
                <input type="text" id="genName"  class="vinput  w3-input" style="width:50%">
                <button id="showTree">show</button>
        </div>
        
        
        <div>
                <!-- <div style="float:left;clear:left"> -->
                <div>
                <button id="operTrans" ><span class="ui-icon ui-icon-arrow-4" title="translate"></span>  </button>
                <button id="operRot" ><span class="ui-icon ui-icon-arrowrefresh-1-e" title="rotate"></span>  </button>
                <button id="operScale" ><span class="ui-icon ui-icon-arrow-4-diag" title="scale"></span>  </button>
                <button id="operFocus" ><span class="ui-icon  ui-icon-zoomin" title="focus"></span>  </button>
                <button id="undo" ><span class="ui-icon ui-icon-arrowreturnthick-1-w" title="undo"></span>  </button>
                <button id="redo"><span class="flip ui-icon ui-icon-arrowreturnthick-1-w" title="redo"></span>  </button>
                
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
                <button id="transRefresh"><span class="ui-icon ui-icon-refresh" title="refresh"></span></button>
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
                <button id="cloneMesh"><span class="ui-icon ui-icon-copy" title="clone"></span> </button>
                <button id="instMesh"><span class="flip ui-icon  ui-icon-newwin" title="instance"></span></button>
                <button id="downMesh"><span class="ui-icon ui-icon-arrowthickstop-1-s" title="download mesh"></span> </button>
                <button id="delMesh"><span class="ui-icon ui-icon-trash" title="delete"></span> </button>
        </div>
        
        
        <div>
                <button id="parentMesh">parent</button>
                <button id="removeParent">remove parent</button>
                <button id="removeChildren">remove children</button>
        </div>
        
        
        <div>
                <button id="mergeMesh"><span class="ui-icon  ui-icon-link" title="merge meshes"></span> </button>
                <button id="subMesh"><span class="ui-icon  ui-icon-scissors" title="subtract a mesh from another"></span> </button>
                <button id="interMesh">intersect</button>


        </div>
        
        
        <div>
                <button id="swAv"><span class="ui-icon ui-icon-person" title="use as avatar"></span> </button>
                <button id="swGnd"><span class="ui-icon ui-icon-grip-solid-horizontal" title="use as ground"></span> </button>
        </div>
        
        
        <div>
                <button id="sNa" >
                <span class="ui-icon inline ui-icon-signal-diag" title="add sensors or actuators"></span>
                <span class="ui-icon inline  ui-icon-gear" title="add sensors or actuators"></span>     
                </button>
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

genElement.innerHTML = genHTML;
VButton.styleThem(genElement.getElementsByTagName("button"));


export { genElement };
