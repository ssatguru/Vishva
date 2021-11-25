/**
 * .av-m  - motion
 * .av-as - animation source
 * .av-at - animation target
 */

const avHTML: string = `
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

<label>face forward
        <input class="faceFor" type="checkbox"/>
</label>

<form  style="padding:0.5em; display:grid; grid-template-columns:auto auto; grid-gap:0.5em;">

        <div id="av-map"  style="padding:0.5em; display:grid; grid-template-columns:auto auto auto auto auto; grid-gap:0.5em;">
                <h5>motion</h5>
                <h5>speed</h5>
                <h5>animation</h5>
                <h5>rate</h5>
                <h5>loop</h5>
     
        </div>

        <div  class="animList" style="padding:0.5em; display:grid; grid-template-columns:auto; grid-auto-rows: min-content; grid-gap:0.5em;">
                <h5> range/group </h5>
        </div>
</form>
`;

export { avHTML };
