/**
 * .av-m  - motion
 * .av-as - animation source
 * .av-at - animation target
 */

const settingFormHtml: string = `
<style>
        .av-m {
                border-style:solid;
                border-width:0.1em;
                padding:0.2em;
        }
        .av-as {
                border-style:dashed;
                border-width:0.1em;
                padding:0.2em;
                cursor: grab;
        }
        .av-as:active{
                cursor: grabbing;
        }
        .av-at {
                border-style:solid;
                border-width:0.1em;
                padding:0.2em;
        }
</style>
<form class="av-settings"  style="padding:0.5em; display:grid; grid-template-columns:min-content min-content; white-space: nowrap;grid-gap:0.5em;">
        <label>face forward </label>
        <input name="faceForward" class="faceFor" type="checkbox"/>
        
        <label>topDown</label>
        <input name="topDown" type="checkbox"/>

        <label>turning off</label>
        <input name="turningOff" type="checkbox"/>
        
        <label>disable firstperson</label>
        <input name="noFirstPerson" type="checkbox"/>
        
        <label>elastic camera</label>
        <input name="camerElastic" type="checkbox"/>

        <label>elastic camera steps</label>
        <input name="elasticSteps" type="text"/>

        <label>make obstructions invisible</label>
        <input name="makeInvisible" type="checkbox"/>
        
        <label>keyboard control</label>
        <input name="keyboard" type="checkbox"/>
        
        <label>gravity</label>
        <input name="gravity" type="text"/>
        
        <label>slope min max</label>
        <div>
                <input name="minSlopeLimit" type="text" />
                <input name="maxSlopeLimit" type="text" />
        </div>
        
        <label>step offset</label>
        <input name="stepOffset" type="text" />

        <label>camera target offset</label>
        <div>
                <input name="x" type="text" />
                <input name="y" type="text" /> 
                <input name="z" type="text" />
        </div>

        <label>step sound</label>
        <button name="stepSnd" type="button" >set sound</button>
</form>
`;
const mapFormHTML: string = `
<form  class="av-map-form" style="padding:0.5em; display:grid; grid-template-columns:min-content min-content; grid-gap:0.5em;">

        <div class="av-map"  style="padding:0.5em; display:grid;  grid-auto-rows: min-content; grid-template-columns:min-content min-content min-content min-content min-content; grid-gap:0.5em;align-items: center;">
                <h5>motion</h5>
                <h5>speed</h5>
                <h5>animation</h5>
                <h5>rate</h5>
                <h5>loop</h5>
     
        </div>

        <div  class="animList" style="padding:0.5em; display:grid; grid-template-columns:min-content min-content min-content; grid-auto-rows: min-content; grid-gap:0.5em;white-space : nowrap;">
                <h5> range/group </h5>
                <h5> </h5>
                <h5> </h5>
        </div>
</form>
`;

export { settingFormHtml, mapFormHTML };
