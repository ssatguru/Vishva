/**
 * .av-at  - motion
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

<div  style="padding:0.5em; display:grid; grid-template-columns:auto auto; grid-gap:0.5em;">

        <label>face forward</label>
        <input class="faceFor" type="checkbox"/>

        <div  style="padding:0.5em; display:grid; grid-template-columns:auto auto; grid-gap:0.5em;">

                <h5>motion</h5>
                <h5>animation</h5>

                <label class="av-m">idle</label>
                <div class="av-at" id="idle"> </div>

                <label class="av-m">idle jump</label>
                <div class="av-at" id="idleJump"> </div>

                <label class="av-m">walk</label>
                <div class="av-at" id="walk"></div>

                <label class="av-m">walk back</label>
                <div class="av-at" id="walkBack"></div>

                <label class="av-m">walk back fast</label>
                <div class="av-at" id="walkBackFast"></div>

                <label class="av-m">run</label>
                <div class="av-at" id="run"></div>

                <label class="av-m">run jump</label>
                <div class="av-at" id="runJump"></div>

                <label class="av-m">fall</label>
                <div class="av-at" id="falll"></div>

                <label class="av-m">turn right</label>
                <div class="av-at" id="turnRight"></div>

                <label class="av-m">turn right fast</label>
                <div class="av-at" id="turnRightFast"></div>

                <label class="av-m">turn left</label>
                <div class="av-at" id="turnLeft"></div>

                <label class="av-m">turn left fast</label>
                <div class="av-at" id="turnLeftFast"></div>

                <label class="av-m">strafe right</label>
                <div class="av-at" id="strafeRight"></div>

                <label class="av-m">strafe right fast</label>
                <div class="av-at" id="strafeRightFast"></div>

                <label class="av-m">strafe left</label>
                <div class="av-at" id="strafeLeft"></div>

                <label class="av-m">strafe left fast</label>
                <div class="av-at" id="strafeLeftFast"></div>

                <label class="av-m">slide down</label>
                <div class="av-at" id="slideDown"></div>
        </div>

        <div  class="animList" style="padding:0.5em; display:grid; grid-template-columns:auto; grid-auto-rows: min-content; grid-gap:0.5em;">
                <h5> range/group </h5>
        </div>
</div>
`;

export { avHTML };
