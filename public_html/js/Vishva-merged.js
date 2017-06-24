var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var org;
(function (org) {
    var ssatguru;
    (function (ssatguru) {
        var babylonjs;
        (function (babylonjs) {
            var component;
            (function (component) {
                var Vector3 = BABYLON.Vector3;
                var CharacterControl = (function () {
                    function CharacterControl(avatar, avatarSkeleton, anims, camera, scene) {
                        var _this = this;
                        //slopeLimit in degrees
                        this.slopeLimit = 45;
                        //slopeLimit in radians
                        this.sl = 0.785;
                        this.started = false;
                        this.avatarSpeed = 0.05;
                        this.prevAnim = null;
                        this.jumpCycleMax = 25;
                        this.jumpCycle = this.jumpCycleMax;
                        this.wasJumping = false;
                        this.gravity = 9.8;
                        this.oldPos = new Vector3(0, 0, 0);
                        this.grounded = false;
                        this.downSpeed = 0;
                        this.time = 0;
                        this.stillTime = 0;
                        this.velocity = new Vector3(0, 0, 0);
                        this.cameraTarget = new Vector3(0, 0, 0);
                        this.move = false;
                        this.avatarSkeleton = avatarSkeleton;
                        this.initAnims(anims);
                        this.camera = camera;
                        this.avatar = avatar;
                        this.scene = scene;
                        this.key = new Key();
                        window.addEventListener("keydown", function (e) { return _this.onKeyDown(e); }, false);
                        window.addEventListener("keyup", function (e) { return _this.onKeyUp(e); }, false);
                        this.renderer = function () { _this.moveAVandCamera(); };
                    }
                    CharacterControl.prototype.setAvatar = function (avatar) {
                        this.avatar = avatar;
                    };
                    CharacterControl.prototype.setAvatarSkeleton = function (avatarSkeleton) {
                        this.avatarSkeleton = avatarSkeleton;
                    };
                    CharacterControl.prototype.setAnims = function (anims) {
                        this.initAnims(anims);
                    };
                    CharacterControl.prototype.setSlopeLimit = function (slopeLimit) {
                        this.slopeLimit = slopeLimit;
                        this.sl = Math.PI * slopeLimit / 180;
                    };
                    CharacterControl.prototype.start = function () {
                        //console.log("cc start()");
                        if (this.started)
                            return;
                        //console.log("cc starting");
                        this.started = true;
                        this.key.reset();
                        this.time = 0;
                        //first time we enter render loop, delta time shows zero !!
                        this.stillTime = 0.001;
                        this.grounded = false;
                        this.updateTargetValue();
                        this.camera.target = this.cameraTarget;
                        this.scene.registerBeforeRender(this.renderer);
                    };
                    CharacterControl.prototype.stop = function () {
                        //console.log("cc stop()");
                        if (!this.started)
                            return;
                        //console.log("cc stoping");
                        this.started = false;
                        this.scene.unregisterBeforeRender(this.renderer);
                    };
                    CharacterControl.prototype.initAnims = function (anims) {
                        this.walk = anims[0];
                        this.walkBack = anims[1];
                        this.idle = anims[2];
                        this.run = anims[3];
                        this.jump = anims[4];
                        this.turnLeft = anims[5];
                        this.turnRight = anims[6];
                        this.strafeLeft = anims[7];
                        this.strafeRight = anims[8];
                    };
                    CharacterControl.prototype.moveAVandCamera = function () {
                        this.oldPos.copyFrom(this.avatar.position);
                        //skip everything if no movement key pressed
                        if (!this.anyMovement()) {
                            if (!this.grounded) {
                                this.stillTime = this.stillTime + this.scene.getEngine().getDeltaTime() / 1000;
                                //this.downSpeed = this.gravity * (this.stillTime ** 2) / 2;
                                this.downSpeed = this.gravity * this.stillTime;
                                this.velocity.copyFromFloats(0, -this.downSpeed, 0);
                                this.avatar.moveWithCollisions(this.velocity);
                                if (this.oldPos.y === this.avatar.position.y) {
                                    this.grounded = true;
                                    this.stillTime = 0;
                                }
                                else if (this.avatar.position.y < this.oldPos.y) {
                                    //if we are sliding down check slope
                                    var diff = this.oldPos.subtract(this.avatar.position).length();
                                    var ht = this.oldPos.y - this.avatar.position.y;
                                    var slope = Math.asin(ht / diff);
                                    if (slope <= this.sl) {
                                        this.grounded = true;
                                        this.stillTime = 0;
                                        this.avatar.position.copyFrom(this.oldPos);
                                    }
                                }
                                this.updateTargetValue();
                            }
                            if (this.prevAnim != this.idle) {
                                this.prevAnim = this.idle;
                                if (this.idle.exist)
                                    this.avatarSkeleton.beginAnimation(this.idle.name, true, this.idle.r);
                            }
                            return;
                        }
                        this.stillTime = 0;
                        this.grounded = false;
                        this.time = this.time + this.scene.getEngine().getDeltaTime() / 1000;
                        //this.downSpeed = this.gravity * (this.time ** 2) / 2;
                        this.downSpeed = this.gravity * this.time;
                        var anim = this.idle;
                        var moving = false;
                        var speed = 0;
                        var upSpeed = 0.05;
                        var dir = 1;
                        var forward;
                        var backwards;
                        var stepLeft;
                        var stepRight;
                        if (this.key.up) {
                            if (this.key.shift) {
                                speed = this.avatarSpeed * 2;
                                anim = this.run;
                            }
                            else {
                                speed = this.avatarSpeed;
                                anim = this.walk;
                            }
                            if (this.key.jump) {
                                this.wasJumping = true;
                            }
                            if (this.wasJumping) {
                                upSpeed *= 2;
                                if (this.jumpCycle < this.jumpCycleMax / 2) {
                                    dir = 1;
                                    if (this.jumpCycle < 0) {
                                        this.jumpCycle = this.jumpCycleMax;
                                        upSpeed /= 2;
                                        this.key.jump = false;
                                        this.wasJumping = false;
                                    }
                                }
                                else {
                                    anim = this.jump;
                                    dir = -1;
                                }
                                this.jumpCycle--;
                                forward = this.avatar.calcMovePOV(0, -upSpeed * dir, speed);
                            }
                            else {
                                forward = this.avatar.calcMovePOV(0, -this.downSpeed, speed);
                            }
                            this.avatar.moveWithCollisions(forward);
                            moving = true;
                        }
                        else if (this.key.down) {
                            //backwards = this.avatar.calcMovePOV(0, -upSpeed * dir, -this.avatarSpeed / 2);
                            backwards = this.avatar.calcMovePOV(0, -this.downSpeed, -this.avatarSpeed / 2);
                            this.avatar.moveWithCollisions(backwards);
                            moving = true;
                            anim = this.walkBack;
                            if (this.key.jump)
                                this.key.jump = false;
                        }
                        else if (this.key.stepLeft) {
                            anim = this.strafeLeft;
                            //stepLeft = this.avatar.calcMovePOV(-this.avatarSpeed / 2, -upSpeed * dir, 0);
                            stepLeft = this.avatar.calcMovePOV(-this.avatarSpeed / 2, -this.downSpeed, 0);
                            this.avatar.moveWithCollisions(stepLeft);
                            moving = true;
                        }
                        else if (this.key.stepRight) {
                            anim = this.strafeRight;
                            //stepRight = this.avatar.calcMovePOV(this.avatarSpeed / 2, -upSpeed * dir, 0);
                            stepRight = this.avatar.calcMovePOV(this.avatarSpeed / 2, -this.downSpeed, 0);
                            this.avatar.moveWithCollisions(stepRight);
                            moving = true;
                        }
                        if (!moving) {
                            if (this.key.jump) {
                                this.wasJumping = true;
                            }
                            if (this.wasJumping) {
                                upSpeed *= 2;
                                if (this.jumpCycle < this.jumpCycleMax / 2) {
                                    dir = 1;
                                    if (this.jumpCycle < 0) {
                                        this.jumpCycle = this.jumpCycleMax;
                                        upSpeed /= 2;
                                        this.key.jump = false;
                                        this.wasJumping = false;
                                    }
                                }
                                else {
                                    anim = this.jump;
                                    dir = -1;
                                }
                                this.jumpCycle--;
                            }
                            else
                                dir = dir / 2;
                            this.avatar.moveWithCollisions(new Vector3(0, -upSpeed * dir, 0));
                        }
                        if (!this.key.stepLeft && !this.key.stepRight) {
                            if (this.key.left) {
                                this.camera.alpha = this.camera.alpha + 0.022;
                                if (!moving) {
                                    this.avatar.rotation.y = -4.69 - this.camera.alpha;
                                    anim = this.turnLeft;
                                }
                            }
                            else if (this.key.right) {
                                this.camera.alpha = this.camera.alpha - 0.022;
                                if (!moving) {
                                    this.avatar.rotation.y = -4.69 - this.camera.alpha;
                                    anim = this.turnRight;
                                }
                            }
                        }
                        if (moving) {
                            this.avatar.rotation.y = -4.69 - this.camera.alpha;
                        }
                        if (this.avatar.position.y < this.oldPos.y) {
                            //if we are sliding down check slope
                            var diff = this.oldPos.subtract(this.avatar.position).length();
                            var ht = this.oldPos.y - this.avatar.position.y;
                            var slope = Math.asin(ht / diff);
                            if (slope <= this.sl) {
                                this.time = 0;
                            }
                        }
                        if (this.prevAnim !== anim) {
                            if (anim.exist) {
                                this.avatarSkeleton.beginAnimation(anim.name, true, anim.r);
                            }
                            this.prevAnim = anim;
                        }
                        this.updateTargetValue();
                        if (this.oldPos.y <= this.avatar.position.y) {
                            this.time = 0;
                        }
                        return;
                    };
                    CharacterControl.prototype.updateTargetValue = function () {
                        this.cameraTarget.copyFromFloats(this.avatar.position.x, (this.avatar.position.y + 1.5), this.avatar.position.z);
                    };
                    CharacterControl.prototype.onKeyDown = function (e) {
                        var event = e;
                        var chr = String.fromCharCode(event.keyCode);
                        if (event.keyCode === 32)
                            this.key.jump = false;
                        else if (event.keyCode === 16)
                            this.key.shift = true;
                        else if ((chr === "W") || (event.keyCode === 38))
                            this.key.up = true;
                        else if ((chr === "A") || (event.keyCode === 37))
                            this.key.left = true;
                        else if ((chr === "D") || (event.keyCode === 39))
                            this.key.right = true;
                        else if ((chr === "S") || (event.keyCode === 40))
                            this.key.down = true;
                        else if (chr === "Q")
                            this.key.stepLeft = true;
                        else if (chr === "E")
                            this.key.stepRight = true;
                        this.move = this.anyMovement();
                    };
                    CharacterControl.prototype.anyMovement = function () {
                        if (this.key.up || this.key.down || this.key.left || this.key.right || this.key.stepLeft || this.key.stepRight || this.key.jump) {
                            return true;
                        }
                        else {
                            return false;
                        }
                    };
                    CharacterControl.prototype.onKeyUp = function (e) {
                        var event = e;
                        var chr = String.fromCharCode(event.keyCode);
                        if (event.keyCode === 32)
                            this.key.jump = true;
                        else if (event.keyCode === 16) {
                            this.key.shift = false;
                        }
                        else if ((chr === "W") || (event.keyCode === 38))
                            this.key.up = false;
                        else if ((chr === "A") || (event.keyCode === 37))
                            this.key.left = false;
                        else if ((chr === "D") || (event.keyCode === 39))
                            this.key.right = false;
                        else if ((chr === "S") || (event.keyCode === 40))
                            this.key.down = false;
                        else if (chr === "Q")
                            this.key.stepLeft = false;
                        else if (chr === "E")
                            this.key.stepRight = false;
                        this.move = this.anyMovement();
                    };
                    return CharacterControl;
                }());
                component.CharacterControl = CharacterControl;
                var AnimData = (function () {
                    function AnimData(name, s, e, d) {
                        this.exist = false;
                        this.s = 0;
                        this.e = 0;
                        this.r = 0;
                        this.name = name;
                        this.s = s;
                        this.e = e;
                        this.r = d;
                    }
                    return AnimData;
                }());
                component.AnimData = AnimData;
                var Key = (function () {
                    function Key() {
                        this.up = false;
                        this.down = false;
                        this.right = false;
                        this.left = false;
                        this.stepRight = false;
                        this.stepLeft = false;
                        this.jump = false;
                        this.shift = false;
                    }
                    Key.prototype.reset = function () {
                        this.up = false;
                        this.down = false;
                        this.right = false;
                        this.left = false;
                        this.stepRight = false;
                        this.stepLeft = false;
                        this.jump = false;
                        this.shift = false;
                    };
                    return Key;
                }());
                component.Key = Key;
            })(component = babylonjs.component || (babylonjs.component = {}));
        })(babylonjs = ssatguru.babylonjs || (ssatguru.babylonjs = {}));
    })(ssatguru = org.ssatguru || (org.ssatguru = {}));
})(org || (org = {}));
/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var org;
/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
(function (org) {
    var ssatguru;
    (function (ssatguru) {
        var babylonjs;
        (function (babylonjs) {
            var vishva;
            (function (vishva) {
                var gui;
                (function (gui) {
                    var ColorPickerDiag = (function () {
                        function ColorPickerDiag(title, diagSelector, colorSelector, jpo, f) {
                            this.diag = $("#" + diagSelector);
                            var colorEle = document.getElementById(colorSelector);
                            this.cp = new ColorPicker(colorEle, f);
                            var dos = {
                                autoOpen: false,
                                resizable: false,
                                position: jpo,
                                //minWidth: 350,
                                height: "auto",
                                closeText: "",
                                closeOnEscape: false,
                                title: title
                            };
                            this.diag.dialog(dos);
                            this.diag["jpo"] = jpo;
                        }
                        ColorPickerDiag.prototype.open = function (hex) {
                            this.diag.dialog("open");
                            this.setColor(hex);
                        };
                        ColorPickerDiag.prototype.setColor = function (hex) {
                            this.cp.setHex(hex);
                        };
                        return ColorPickerDiag;
                    }());
                    gui.ColorPickerDiag = ColorPickerDiag;
                    var RGB = (function () {
                        function RGB() {
                            this.r = 0;
                            this.g = 0;
                            this.b = 0;
                        }
                        return RGB;
                    }());
                })(gui = vishva.gui || (vishva.gui = {}));
            })(vishva = babylonjs.vishva || (babylonjs.vishva = {}));
        })(babylonjs = ssatguru.babylonjs || (ssatguru.babylonjs = {}));
    })(ssatguru = org.ssatguru || (org.ssatguru = {}));
})(org || (org = {}));
var org;
(function (org) {
    var ssatguru;
    (function (ssatguru) {
        var babylonjs;
        (function (babylonjs) {
            var vishva;
            (function (vishva_1) {
                var gui;
                (function (gui) {
                    var ColorPickerDiag = org.ssatguru.babylonjs.vishva.gui.ColorPickerDiag;
                    var VishvaGUI = (function () {
                        function VishvaGUI(vishva) {
                            var _this = this;
                            this.local = true;
                            this.menuBarOn = true;
                            this.STATE_IND = "state";
                            /**
                             * this array will be used store all dialogs whose position needs to be
                             * reset on window resize
                             */
                            this.dialogs = new Array();
                            //TODO persist this setting
                            this.enableToolTips = true;
                            this.propsDiag = null;
                            this.fixingDragIssue = false;
                            this.animSelect = null;
                            //        private colorPickerHandler(hex: any, hsv: any, rgb: RGB) {
                            //            var colors: number[] = [rgb.r, rgb.g, rgb.b];
                            //            this.vishva.setGroundColor(colors);
                            //        }
                            /**
                             * Main Navigation Menu Section
                             */
                            this.firstTime = true;
                            this.addMenuOn = false;
                            this.vishva = vishva;
                            this.setSettings();
                            $(document).tooltip({
                                open: function (event, ui) {
                                    if (!_this.enableToolTips) {
                                        ui.tooltip.stop().remove();
                                    }
                                }
                            });
                            //when user is typing into ui inputs we donot want keys influencing editcontrol or av movement
                            $("input").on("focus", function () { _this.vishva.disableKeys(); });
                            $("input").on("blur", function () { _this.vishva.enableKeys(); });
                            this.createJPOs();
                            //need to do add menu before main navigation menu
                            //the content of add menu is not static
                            //it changes based on the asset.js file
                            this.createAddMenu();
                            //main navigation menu 
                            this.createNavMenu();
                            this.createDownloadDiag();
                            //this.createUploadDiag();
                            this.createHelpDiag();
                            this.createAlertDiag();
                            this.create_sNaDiag();
                            this.createEditSensDiag();
                            this.createEditActDiag();
                            window.addEventListener("resize", function (evt) { return _this.onWindowResize(evt); });
                        }
                        VishvaGUI.prototype.createJPOs = function () {
                            this.centerBottom = {
                                at: "center bottom",
                                my: "center bottom",
                                of: window
                            };
                            this.leftCenter = {
                                at: "left center",
                                my: "left center",
                                of: window
                            };
                            this.rightCenter = {
                                at: "right center",
                                my: "right center",
                                of: window
                            };
                        };
                        /**
                         * resposition all dialogs to their original default postions without this,
                         * a window resize could end up moving some dialogs outside the window and
                         * thus make them disappear
                         * the default position of each dialog will be stored in a new property called "jpo"
                         * this would be created whenever/wherever the dialog is defined
                         *
                         * @param evt
                         */
                        VishvaGUI.prototype.onWindowResize = function (evt) {
                            for (var index161 = 0; index161 < this.dialogs.length; index161++) {
                                var jq = this.dialogs[index161];
                                {
                                    var jpo = jq["jpo"];
                                    if (jpo != null) {
                                        jq.dialog("option", "position", jpo);
                                        var open = jq.dialog("isOpen");
                                        if (open) {
                                            jq.dialog("close");
                                            jq.dialog("open");
                                        }
                                    }
                                }
                            }
                        };
                        VishvaGUI.prototype.createAddMenu = function () {
                            var _this = this;
                            var assetTypes = Object.keys(this.vishva.assets);
                            var addMenu = document.getElementById("AddMenu");
                            addMenu.style.visibility = "visible";
                            var f = function (e) { return _this.onAddMenuItemClick(e); };
                            for (var _i = 0, assetTypes_1 = assetTypes; _i < assetTypes_1.length; _i++) {
                                var assetType = assetTypes_1[_i];
                                if (assetType === "sounds") {
                                    continue;
                                }
                                var li = document.createElement("li");
                                li.id = "add-" + assetType;
                                li.innerText = assetType;
                                li.onclick = f;
                                addMenu.appendChild(li);
                            }
                        };
                        VishvaGUI.prototype.onAddMenuItemClick = function (e) {
                            var li = e.target;
                            var jq = li["diag"];
                            if (jq == null) {
                                var assetType = li.innerHTML;
                                jq = this.createAssetDiag(assetType);
                                li["diag"] = jq;
                            }
                            jq.dialog("open");
                            return true;
                        };
                        VishvaGUI.prototype.createAssetDiag = function (assetType) {
                            var div = document.createElement("div");
                            div.id = assetType + "Div";
                            div.setAttribute("title", assetType);
                            var table = document.createElement("table");
                            table.id = assetType + "Tbl";
                            var items = this.vishva.assets[assetType];
                            this.updateAssetTable(table, assetType, items);
                            div.appendChild(table);
                            document.body.appendChild(div);
                            var jq = $("#" + div.id);
                            var dos = {
                                autoOpen: false,
                                resizable: true,
                                position: this.centerBottom,
                                width: "100%",
                                height: "auto",
                                closeText: "",
                                closeOnEscape: false
                            };
                            jq.dialog(dos);
                            jq["jpo"] = this.centerBottom;
                            this.dialogs.push(jq);
                            return jq;
                        };
                        VishvaGUI.prototype.updateAssetTable = function (tbl, assetType, items) {
                            var _this = this;
                            if (tbl.rows.length > 0) {
                                return;
                            }
                            var f = function (e) { return _this.onAssetImgClick(e); };
                            var row = tbl.insertRow();
                            for (var index163 = 0; index163 < items.length; index163++) {
                                var item = items[index163];
                                {
                                    var img = document.createElement("img");
                                    img.id = item;
                                    img.src = "vishva/assets/" + assetType + "/" + item + "/" + item + ".jpg";
                                    img.setAttribute("style", VishvaGUI.SMALL_ICON_SIZE + "cursor:pointer;");
                                    img.className = assetType;
                                    img.onclick = f;
                                    var cell = row.insertCell();
                                    cell.appendChild(img);
                                }
                            }
                            var row2 = tbl.insertRow();
                            for (var index164 = 0; index164 < items.length; index164++) {
                                var item = items[index164];
                                {
                                    var cell = row2.insertCell();
                                    cell.innerText = item;
                                }
                            }
                        };
                        VishvaGUI.prototype.onAssetImgClick = function (e) {
                            var i = e.target;
                            if (i.className === "skyboxes") {
                                this.vishva.setSky(i.id);
                            }
                            else if (i.className === "primitives") {
                                this.vishva.addPrim(i.id);
                            }
                            else if (i.className === "water") {
                                this.vishva.createWater();
                            }
                            else {
                                this.vishva.loadAsset(i.className, i.id);
                            }
                            return true;
                        };
                        /*
                         * Create Environment Dialog
                         */
                        VishvaGUI.prototype.createEnvDiag = function () {
                            var _this = this;
                            var sunPos = $("#sunPos");
                            var light = $("#light");
                            var shade = $("#shade");
                            var fog = $("#fog");
                            var fov = $("#fov");
                            sunPos.slider(this.sliderOptions(0, 180, this.vishva.getSunPos()));
                            light.slider(this.sliderOptions(0, 100, 100 * this.vishva.getLight()));
                            shade.slider(this.sliderOptions(0, 100, 100 * this.vishva.getShade()));
                            fog.slider(this.sliderOptions(0, 100, 1000 * this.vishva.getFog()));
                            fov.slider(this.sliderOptions(0, 180, this.vishva.getFov()));
                            var envSnow = document.getElementById("envSnow");
                            envSnow.onclick = function (e) {
                                _this.vishva.toggleSnow();
                            };
                            var envRain = document.getElementById("envRain");
                            envRain.onclick = function (e) {
                                //this.showAlertDiag("Sorry. To be implemented");
                                _this.vishva.toggleRain();
                            };
                            var skyButton = document.getElementById("skyButton");
                            skyButton.onclick = function (e) {
                                var foo = document.getElementById("add-skyboxes");
                                foo.click();
                                return true;
                            };
                            var trnButton = document.getElementById("trnButton");
                            trnButton.onclick = function (e) {
                                _this.showAlertDiag("Sorry. To be implemneted soon");
                                return true;
                            };
                            var trnCol = document.getElementById("trnCol");
                            var trnColDiag = new ColorPickerDiag("terrain color", "trnColDiag", "trnColCP", this.centerBottom, function (hex, hsv, rgb) {
                                trnCol.style.backgroundColor = hex;
                                _this.vishva.setGroundColor(hex);
                            });
                            var trnColor = this.vishva.getGroundColor();
                            trnColDiag.setColor(trnColor);
                            trnCol.style.backgroundColor = trnColor;
                            trnCol.onclick = function () {
                                var trnColor = _this.vishva.getGroundColor();
                                trnColDiag.open(trnColor);
                            };
                            //            var colorEle: HTMLElement = document.getElementById("color-picker");
                            //            var cp: ColorPicker = new ColorPicker(colorEle, (hex, hsv, rgb) => { return this.colorPickerHandler(hex, hsv, rgb) });
                            //            var setRGB: Function = <Function>cp["setRgb"];
                            //            var color: number[] = this.vishva.getGroundColor();
                            //            if (color != null) {
                            //                var rgb: RGB = new RGB();
                            //                rgb.r = color[0];
                            //                rgb.g = color[1];
                            //                rgb.b = color[2];
                            //                cp.setRgb(rgb);
                            //            }
                            this.envDiag = $("#envDiv");
                            var dos = {
                                autoOpen: false,
                                resizable: false,
                                position: this.rightCenter,
                                minWidth: 350,
                                height: "auto",
                                closeText: "",
                                closeOnEscape: false
                            };
                            this.envDiag.dialog(dos);
                            this.envDiag["jpo"] = this.rightCenter;
                            this.dialogs.push(this.envDiag);
                        };
                        VishvaGUI.prototype.createSettingDiag = function () {
                            var _this = this;
                            this.settingDiag = $("#settingDiag");
                            this.camCol = $("#camCol");
                            this.autoEditMenu = $("#autoEditMenu");
                            this.showToolTips = $("#showToolTips");
                            this.showInvis = $("#showInvis");
                            this.showDisa = $("#showDisa");
                            this.snapper = $("#snapper");
                            var dos = {
                                autoOpen: false,
                                resizable: false,
                                position: this.rightCenter,
                                minWidth: 350,
                                height: "auto",
                                closeText: "",
                                closeOnEscape: false
                            };
                            this.settingDiag.dialog(dos);
                            this.settingDiag["jpo"] = this.rightCenter;
                            this.dialogs.push(this.settingDiag);
                            var dboSave = {};
                            dboSave.text = "save";
                            dboSave.click = function (e) {
                                _this.vishva.enableCameraCollision(_this.camCol.prop("checked"));
                                _this.vishva.enableAutoEditMenu(_this.autoEditMenu.prop("checked"));
                                _this.enableToolTips = _this.showToolTips.prop("checked");
                                if (_this.showInvis.prop("checked")) {
                                    _this.vishva.showAllInvisibles();
                                }
                                else {
                                    _this.vishva.hideAllInvisibles();
                                }
                                if (_this.showDisa.prop("checked")) {
                                    _this.vishva.showAllDisabled();
                                }
                                else {
                                    _this.vishva.hideAllDisabled();
                                }
                                var err = _this.vishva.snapper(_this.snapper.prop("checked"));
                                if (err != null) {
                                    _this.showAlertDiag(err);
                                    return false;
                                }
                                _this.settingDiag.dialog("close");
                                //this.showAlertDiag("Saved");
                                return true;
                            };
                            var dboCancel = {};
                            dboCancel.text = "Cancel";
                            dboCancel.click = function (e) {
                                _this.settingDiag.dialog("close");
                                return true;
                            };
                            var dbos = [dboSave, dboCancel];
                            this.settingDiag.dialog("option", "buttons", dbos);
                        };
                        VishvaGUI.prototype.updateSettings = function () {
                            this.camCol.prop("checked", this.vishva.isCameraCollisionOn());
                            this.autoEditMenu.prop("checked", this.vishva.isAutoEditMenuOn());
                            this.showToolTips.prop("checked", this.enableToolTips);
                        };
                        VishvaGUI.prototype.createDownloadDiag = function () {
                            this.downloadLink = document.getElementById("downloadLink");
                            this.downloadDialog = $("#saveDiv");
                            this.downloadDialog.dialog();
                            this.downloadDialog.dialog("close");
                        };
                        VishvaGUI.prototype.createUploadDiag = function () {
                            var _this = this;
                            var loadFileInput = document.getElementById("loadFileInput");
                            var loadFileOk = document.getElementById("loadFileOk");
                            loadFileOk.onclick = (function (loadFileInput) {
                                return function (e) {
                                    var fl = loadFileInput.files;
                                    if (fl.length === 0) {
                                        alert("no file slected");
                                        return null;
                                    }
                                    var file = null;
                                    for (var index165 = 0; index165 < fl.length; index165++) {
                                        var f = fl[index165];
                                        {
                                            file = f;
                                        }
                                    }
                                    _this.vishva.loadAssetFile(file);
                                    _this.loadDialog.dialog("close");
                                    return true;
                                };
                            })(loadFileInput);
                            this.loadDialog = $("#loadDiv");
                            this.loadDialog.dialog();
                            this.loadDialog.dialog("close");
                        };
                        VishvaGUI.prototype.createHelpDiag = function () {
                            this.helpDiag = $("#helpDiv");
                            var dos = {
                                autoOpen: false,
                                resizable: false,
                                width: 500,
                                closeOnEscape: false,
                                closeText: ""
                            };
                            this.helpDiag.dialog(dos);
                        };
                        /*
                         * A dialog box to show the list of available sensors
                         * actuators, each in seperate tabs
                         */
                        VishvaGUI.prototype.create_sNaDiag = function () {
                            var _this = this;
                            //tabs
                            var sNaDetails = $("#sNaDetails");
                            sNaDetails.tabs();
                            //dialog box
                            this.sNaDialog = $("#sNaDiag");
                            var dos = {};
                            dos.autoOpen = false;
                            dos.modal = false;
                            dos.resizable = false;
                            dos.width = "auto";
                            dos.height = "auto";
                            dos.title = "Sensors and Actuators";
                            dos.closeOnEscape = false;
                            dos.closeText = "";
                            dos.close = function (e, ui) {
                                _this.vishva.switchDisabled = false;
                            };
                            dos.dragStop = function (e, ui) {
                                /* required as jquery dialog's size does not re-adjust to content after it has been dragged
                                 Thus if the size of sensors tab is different from the size of actuators tab  then the content of
                                 actuator tab is cutoff if its size is greater
                                 so we close and open for it to recalculate the sizes.
                                 */
                                _this.sNaDialog.dialog("close");
                                _this.sNaDialog.dialog("open");
                            };
                            this.sNaDialog.dialog(dos);
                            this.sensSel = document.getElementById("sensSel");
                            this.actSel = document.getElementById("actSel");
                            var sensors = this.vishva.getSensorList();
                            var actuators = this.vishva.getActuatorList();
                            for (var _i = 0, sensors_1 = sensors; _i < sensors_1.length; _i++) {
                                var sensor = sensors_1[_i];
                                var opt = document.createElement("option");
                                opt.value = sensor;
                                opt.innerHTML = sensor;
                                this.sensSel.add(opt);
                            }
                            for (var _a = 0, actuators_1 = actuators; _a < actuators_1.length; _a++) {
                                var actuator = actuators_1[_a];
                                var opt = document.createElement("option");
                                opt.value = actuator;
                                opt.innerHTML = actuator;
                                this.actSel.add(opt);
                            }
                            this.sensTbl = document.getElementById("sensTbl");
                            this.actTbl = document.getElementById("actTbl");
                        };
                        VishvaGUI.prototype.show_sNaDiag = function () {
                            var _this = this;
                            var sens = this.vishva.getSensors();
                            if (sens == null) {
                                this.showAlertDiag("no mesh selected");
                                return;
                            }
                            var acts = this.vishva.getActuators();
                            if (acts == null) {
                                this.showAlertDiag("no mesh selected");
                                return;
                            }
                            this.vishva.switchDisabled = true;
                            this.updateSensActTbl(sens, this.sensTbl);
                            this.updateSensActTbl(acts, this.actTbl);
                            var addSens = document.getElementById("addSens");
                            addSens.onclick = function (e) {
                                var s = _this.sensSel.item(_this.sensSel.selectedIndex);
                                var sensor = s.value;
                                _this.vishva.addSensorbyName(sensor);
                                _this.updateSensActTbl(_this.vishva.getSensors(), _this.sensTbl);
                                _this.sNaDialog.dialog("close");
                                _this.sNaDialog.dialog("open");
                                return true;
                            };
                            var addAct = document.getElementById("addAct");
                            addAct.onclick = function (e) {
                                var a = _this.actSel.item(_this.actSel.selectedIndex);
                                var actuator = a.value;
                                _this.vishva.addActuaorByName(actuator);
                                _this.updateSensActTbl(_this.vishva.getActuators(), _this.actTbl);
                                _this.sNaDialog.dialog("close");
                                _this.sNaDialog.dialog("open");
                                return true;
                            };
                            this.sNaDialog.dialog("open");
                        };
                        /*
                         * fill up the sensor and actuator tables
                         * with a list of sensors and actuators
                         */
                        VishvaGUI.prototype.updateSensActTbl = function (sensAct, tbl) {
                            var _this = this;
                            var l = tbl.rows.length;
                            for (var i = l - 1; i > 0; i--) {
                                tbl.deleteRow(i);
                            }
                            l = sensAct.length;
                            for (var i = 0; i < l; i++) {
                                var row = tbl.insertRow();
                                var cell = row.insertCell();
                                cell.innerHTML = sensAct[i].getName();
                                cell = row.insertCell();
                                cell.innerHTML = sensAct[i].getProperties().signalId;
                                cell = row.insertCell();
                                var editBut = document.createElement("BUTTON");
                                editBut.innerHTML = "edit";
                                var jq = $(editBut);
                                jq.button();
                                var d = i;
                                editBut.id = d.toString();
                                editBut["sa"] = sensAct[i];
                                cell.appendChild(editBut);
                                editBut.onclick = function (e) {
                                    var el = e.currentTarget;
                                    var sa = el["sa"];
                                    if (sa.getType() === "SENSOR") {
                                        _this.showEditSensDiag(sa);
                                    }
                                    else {
                                        _this.showEditActDiag(sa);
                                    }
                                    return true;
                                };
                                cell = row.insertCell();
                                var delBut = document.createElement("BUTTON");
                                delBut.innerHTML = "del";
                                var jq2 = $(delBut);
                                jq2.button();
                                delBut.id = d.toString();
                                delBut["row"] = row;
                                delBut["sa"] = sensAct[i];
                                cell.appendChild(delBut);
                                delBut.onclick = function (e) {
                                    var el = e.currentTarget;
                                    var r = el["row"];
                                    tbl.deleteRow(r.rowIndex);
                                    _this.vishva.removeSensorActuator(el["sa"]);
                                    return true;
                                };
                            }
                        };
                        VishvaGUI.prototype.createEditSensDiag = function () {
                            var editSensDiag = $("#editSensDiag");
                            var dos = {};
                            dos.autoOpen = false;
                            dos.modal = true;
                            dos.resizable = false;
                            dos.width = "auto";
                            dos.title = "Edit Sensor";
                            dos.closeText = "";
                            dos.closeOnEscape = false;
                            editSensDiag.dialog(dos);
                        };
                        /*
                        * show a dialog box to edit sensor properties
                        * dynamically creates an appropriate form.
                        *
                        */
                        VishvaGUI.prototype.showEditSensDiag = function (sensor) {
                            var _this = this;
                            this.vishva.disableKeys();
                            var sensNameEle = document.getElementById("editSensDiag.sensName");
                            sensNameEle.innerHTML = sensor.getName();
                            var editSensDiag = $("#editSensDiag");
                            editSensDiag.dialog("open");
                            var parmDiv = document.getElementById("editSensDiag.parms");
                            var node = parmDiv.firstChild;
                            if (node != null)
                                parmDiv.removeChild(node);
                            console.log(sensor.getProperties());
                            var tbl = this.formCreate(sensor.getProperties(), parmDiv.id);
                            parmDiv.appendChild(tbl);
                            var dbo = {};
                            dbo.text = "save";
                            dbo.click = function (e) {
                                _this.formRead(sensor.getProperties(), parmDiv.id);
                                sensor.processUpdateGeneric();
                                _this.updateSensActTbl(_this.vishva.getSensors(), _this.sensTbl);
                                editSensDiag.dialog("close");
                                _this.vishva.enableKeys();
                                return true;
                            };
                            var dbos = [dbo];
                            editSensDiag.dialog("option", "buttons", dbos);
                        };
                        VishvaGUI.prototype.createEditActDiag = function () {
                            var editActDiag = $("#editActDiag");
                            var dos = {};
                            dos.autoOpen = false;
                            dos.modal = true;
                            dos.resizable = false;
                            dos.width = "auto";
                            dos.title = "Edit Actuator";
                            dos.closeText = "";
                            dos.closeOnEscape = false;
                            editActDiag.dialog(dos);
                        };
                        /*
                         * show a dialog box to edit actuator properties
                         * dynamically creates an appropriate form.
                         *
                         */
                        VishvaGUI.prototype.showEditActDiag = function (actuator) {
                            var _this = this;
                            this.vishva.disableKeys();
                            var actNameEle = document.getElementById("editActDiag.actName");
                            actNameEle.innerHTML = actuator.getName();
                            var editActDiag = $("#editActDiag");
                            editActDiag.dialog("open");
                            var parmDiv = document.getElementById("editActDiag.parms");
                            var node = parmDiv.firstChild;
                            if (node != null) {
                                parmDiv.removeChild(node);
                            }
                            if (actuator.getName() === "Sound") {
                                var prop = actuator.getProperties();
                                prop.soundFile.values = this.vishva.getSoundFiles();
                            }
                            var tbl = this.formCreate(actuator.getProperties(), parmDiv.id);
                            parmDiv.appendChild(tbl);
                            var dbo = {};
                            dbo.text = "save";
                            dbo.click = function (e) {
                                _this.formRead(actuator.getProperties(), parmDiv.id);
                                actuator.processUpdateGeneric();
                                _this.updateSensActTbl(_this.vishva.getActuators(), _this.actTbl);
                                editActDiag.dialog("close");
                                _this.vishva.enableKeys();
                                return true;
                            };
                            var dbos = [dbo];
                            editActDiag.dialog("option", "buttons", dbos);
                        };
                        /*
                         * auto generate forms based on properties
                         */
                        VishvaGUI.prototype.formCreate = function (snaP, idPrefix) {
                            idPrefix = idPrefix + ".";
                            var tbl = document.createElement("table");
                            var keys = Object.keys(snaP);
                            for (var index168 = 0; index168 < keys.length; index168++) {
                                var key = keys[index168];
                                {
                                    if (key.split("_")[0] === this.STATE_IND)
                                        continue;
                                    var row = tbl.insertRow();
                                    var cell = row.insertCell();
                                    cell.innerHTML = key;
                                    cell = row.insertCell();
                                    var t = typeof snaP[key];
                                    if ((t === "object") && (snaP[key]["type"] === "SelectType")) {
                                        var keyValue = snaP[key];
                                        var options = keyValue.values;
                                        var sel = document.createElement("select");
                                        sel.id = idPrefix + key;
                                        for (var index169 = 0; index169 < options.length; index169++) {
                                            var option = options[index169];
                                            {
                                                var opt = document.createElement("option");
                                                if (option === keyValue.value) {
                                                    opt.selected = true;
                                                }
                                                opt.innerText = option;
                                                sel.add(opt);
                                            }
                                        }
                                        cell.appendChild(sel);
                                    }
                                    else {
                                        var inp = document.createElement("input");
                                        inp.id = idPrefix + key;
                                        inp.className = "ui-widget-content ui-corner-all";
                                        inp.value = snaP[key];
                                        if ((t === "object") && (snaP[key]["type"] === "Range")) {
                                            var r = snaP[key];
                                            inp.type = "range";
                                            inp.max = new Number(r.max).toString();
                                            inp.min = new Number(r.min).toString();
                                            inp.step = new Number(r.step).toString();
                                            inp.value = new Number(r.value).toString();
                                        }
                                        else if ((t === "string") || (t === "number")) {
                                            inp.type = "text";
                                            inp.value = snaP[key];
                                        }
                                        else if (t === "boolean") {
                                            var check = snaP[key];
                                            inp.type = "checkbox";
                                            if (check)
                                                inp.setAttribute("checked", "true");
                                        }
                                        cell.appendChild(inp);
                                    }
                                }
                            }
                            return tbl;
                        };
                        VishvaGUI.prototype.formRead = function (snaP, idPrefix) {
                            idPrefix = idPrefix + ".";
                            var keys = Object.keys(snaP);
                            for (var index170 = 0; index170 < keys.length; index170++) {
                                var key = keys[index170];
                                {
                                    if (key.split("_")[0] === this.STATE_IND)
                                        continue;
                                    var t = typeof snaP[key];
                                    if ((t === "object") && (snaP[key]["type"] === "SelectType")) {
                                        var s = snaP[key];
                                        var sel = document.getElementById(idPrefix + key);
                                        s.value = sel.value;
                                    }
                                    else {
                                        var ie = document.getElementById(idPrefix + key);
                                        if ((t === "object") && (snaP[key]["type"] === "Range")) {
                                            var r = snaP[key];
                                            r.value = parseFloat(ie.value);
                                        }
                                        else if ((t === "string") || (t === "number")) {
                                            if (t === "number") {
                                                var v = parseFloat(ie.value);
                                                if (isNaN(v))
                                                    snaP[key] = 0;
                                                else
                                                    snaP[key] = v;
                                            }
                                            else {
                                                snaP[key] = ie.value;
                                            }
                                        }
                                        else if (t === "boolean") {
                                            snaP[key] = ie.checked;
                                        }
                                    }
                                }
                            }
                        };
                        /**
                         * Mesh properties section
                         */
                        VishvaGUI.prototype.showPropDiag = function () {
                            if (this.propsDiag != null) {
                                if (this.propsDiag.dialog("isOpen"))
                                    return true;
                            }
                            if (!this.vishva.anyMeshSelected()) {
                                this.showAlertDiag("no mesh selected");
                                return;
                            }
                            if (this.propsDiag == null) {
                                this.createPropsDiag();
                            }
                            this.propsDiag.dialog("open");
                            return true;
                        };
                        VishvaGUI.prototype.closePropDiag = function () {
                            this.propsDiag.dialog("close");
                        };
                        VishvaGUI.prototype.createPropsDiag = function () {
                            var _this = this;
                            //property tabs
                            var propsAcc = $("#propsAcc");
                            //            propsTabs.tabs({
                            //                //everytime we switch tabs, close open to re-adjust size
                            //                activate: (e, ui) => {
                            //                    //this.fixingDragIssue = true;
                            //                    //this.propsDiag.dialog("close");
                            //                    //this.propsDiag.dialog("open");
                            //                },
                            //
                            //                beforeActivate: (e, ui) => {
                            //                    this.vishva.switchDisabled = false;
                            //                    this.vishva.enableKeys();
                            //                    this.refreshTab(ui.newTab.index());
                            //                }
                            //            });
                            //            
                            propsAcc.accordion({
                                animate: 100,
                                heightStyle: "content",
                                collapsible: true,
                                beforeActivate: function (e, ui) {
                                    _this.vishva.switchDisabled = false;
                                    //TODO remove this.vishva.enableKeys();
                                    _this.refreshPanel(_this.getPanelIndex(ui.newHeader));
                                }
                            });
                            //property dialog box
                            this.propsDiag = $("#propsDiag");
                            var dos = {
                                autoOpen: false,
                                resizable: false,
                                position: this.leftCenter,
                                minWidth: 420,
                                width: 420,
                                // height: "auto",
                                height: 650,
                                closeOnEscape: false,
                                //a) on open set the values of the fields in the active panel.
                                //b) also if we switched from another mesh vishav will close open
                                //by calling refreshPropsDiag()
                                //c) donot bother refreshing values if we are just restarting
                                //dialog for height and width re-sizing after drag
                                open: function (e, ui) {
                                    if (!_this.fixingDragIssue) {
                                        // refresh the active tab
                                        var activePanel = propsAcc.accordion("option", "active");
                                        _this.refreshPanel(activePanel);
                                    }
                                    else {
                                        _this.fixingDragIssue = false;
                                    }
                                },
                                closeText: "",
                                close: function (e, ui) {
                                    _this.vishva.switchDisabled = false;
                                    //TODO remove this.vishva.enableKeys();
                                },
                                //after drag the dialog box doesnot resize
                                //force resize by closing and opening
                                dragStop: function (e, ui) {
                                    _this.fixingDragIssue = true;
                                    _this.propsDiag.dialog("close");
                                    _this.propsDiag.dialog("open");
                                }
                            };
                            this.propsDiag.dialog(dos);
                            this.propsDiag["jpo"] = this.leftCenter;
                            this.dialogs.push(this.propsDiag);
                        };
                        /*
                         * also called by vishva when editcontrol
                         * is removed from mesh
                         */
                        VishvaGUI.prototype.closePropsDiag = function () {
                            if ((this.propsDiag === undefined) || (this.propsDiag === null))
                                return;
                            this.propsDiag.dialog("close");
                        };
                        /*
                         * called by vishva when editcontrol
                         * is switched from another mesh
                         */
                        VishvaGUI.prototype.refreshPropsDiag = function () {
                            if ((this.propsDiag === undefined) || (this.propsDiag === null))
                                return;
                            if (this.propsDiag.dialog("isOpen") === true) {
                                this.propsDiag.dialog("close");
                                this.propsDiag.dialog("open");
                            }
                        };
                        VishvaGUI.prototype.getPanelIndex = function (ui) {
                            if (ui.text() == "General")
                                return 0 /* General */;
                            if (ui.text() == "Physics")
                                return 1 /* Physics */;
                            if (ui.text() == "Material")
                                return 2 /* Material */;
                            if (ui.text() == "Lights")
                                return 3 /* Lights */;
                            if (ui.text() == "Animations")
                                return 4 /* Animations */;
                        };
                        VishvaGUI.prototype.refreshPanel = function (panelIndex) {
                            if (panelIndex === 0 /* General */) {
                                this.updateGeneral();
                            }
                            else if (panelIndex === 3 /* Lights */) {
                                this.updateLight();
                            }
                            else if (panelIndex === 4 /* Animations */) {
                                this.updateAnimations();
                            }
                            else if (panelIndex === 1 /* Physics */) {
                                this.updatePhysics();
                            }
                            else if (panelIndex === 2 /* Material */) {
                                this.updateMat();
                            }
                        };
                        VishvaGUI.prototype.initAnimUI = function () {
                            var _this = this;
                            var animSkelView = document.getElementById("animSkelView");
                            var animRest = document.getElementById("animRest");
                            var animRangeName = document.getElementById("animRangeName");
                            var animRangeStart = document.getElementById("animRangeStart");
                            var animRangeEnd = document.getElementById("animRangeEnd");
                            var animRangeMake = document.getElementById("animRangeMake");
                            //enable/disable skeleton view
                            animSkelView.onclick = function (e) {
                                _this.vishva.toggleSkelView();
                            };
                            //show rest pose
                            animRest.onclick = function (e) {
                                _this.vishva.animRest();
                            };
                            //create
                            animRangeMake.onclick = function (e) {
                                var name = animRangeName.value;
                                var ars = parseInt(animRangeStart.value);
                                if (isNaN(ars)) {
                                    _this.showAlertDiag("from frame is not a number");
                                }
                                var are = parseInt(animRangeEnd.value);
                                if (isNaN(are)) {
                                    _this.showAlertDiag("to frame is not a number");
                                }
                                _this.vishva.createAnimRange(name, ars, are);
                                _this.refreshAnimSelect();
                            };
                            //select
                            this.animSelect = document.getElementById("animList");
                            this.animSelect.onchange = function (e) {
                                var animName = _this.animSelect.value;
                                if (animName != null) {
                                    var range = _this.skel.getAnimationRange(animName);
                                    document.getElementById("animFrom").innerText = new Number(range.from).toString();
                                    document.getElementById("animTo").innerText = new Number(range.to).toString();
                                }
                                return true;
                            };
                            //play
                            this.animRate = document.getElementById("animRate");
                            this.animLoop = document.getElementById("animLoop");
                            document.getElementById("playAnim").onclick = function (e) {
                                if (_this.skel == null)
                                    return true;
                                var animName = _this.animSelect.value;
                                var rate = _this.animRate.value;
                                if (animName != null) {
                                    _this.vishva.playAnimation(animName, rate, _this.animLoop.checked);
                                }
                                return true;
                            };
                            document.getElementById("stopAnim").onclick = function (e) {
                                if (_this.skel == null)
                                    return true;
                                _this.vishva.stopAnimation();
                                return true;
                            };
                        };
                        VishvaGUI.prototype.createAnimDiag = function () {
                            var _this = this;
                            this.initAnimUI();
                            this.meshAnimDiag = $("#meshAnimDiag");
                            var dos = {};
                            dos.autoOpen = false;
                            dos.modal = false;
                            dos.resizable = false;
                            dos.width = "auto";
                            dos.height = "auto";
                            dos.closeOnEscape = false;
                            dos.closeText = "";
                            dos.close = function (e, ui) {
                                _this.vishva.switchDisabled = false;
                            };
                            this.meshAnimDiag.dialog(dos);
                        };
                        VishvaGUI.prototype.updateAnimations = function () {
                            this.vishva.switchDisabled = true;
                            this.initAnimUI();
                            this.skel = this.vishva.getSkeleton();
                            var skelName;
                            if (this.skel == null) {
                                document.getElementById("skelName").innerText = "no skeleton";
                                return;
                            }
                            else {
                                skelName = this.skel.name;
                                if (skelName.trim() === "")
                                    skelName = "no name";
                            }
                            document.getElementById("skelName").innerText = skelName;
                            this.refreshAnimSelect();
                            //            var childs: HTMLCollection = this.animSelect.children;
                            //            var l: number = (<number>childs.length | 0);
                            //            for (var i: number = l - 1; i >= 0; i--) {
                            //                childs[i].remove();
                            //            }
                            //            if (skelName != null) {
                            //                var range: AnimationRange[] = this.vishva.getAnimationRanges();
                            //                var animOpt: HTMLOptionElement;
                            //                for (var index171 = 0; index171 < range.length; index171++) {
                            //                    var ar = range[index171];
                            //                    {
                            //                        animOpt = document.createElement("option");
                            //                        animOpt.value = ar.name;
                            //                        animOpt.innerText = ar.name;
                            //                        this.animSelect.appendChild(animOpt);
                            //                    }
                            //                }
                            //                if (range[0] != null) {
                            //                    document.getElementById("animFrom").innerText = (<number>new Number(range[0].from)).toString();
                            //                    document.getElementById("animTo").innerText = (<number>new Number(range[0].to)).toString();
                            //                }
                            //            }
                        };
                        VishvaGUI.prototype.refreshAnimSelect = function () {
                            var childs = this.animSelect.children;
                            var l = (childs.length | 0);
                            for (var i = l - 1; i >= 0; i--) {
                                childs[i].remove();
                            }
                            var range = this.vishva.getAnimationRanges();
                            if (range === null)
                                return;
                            var animOpt;
                            for (var _i = 0, range_1 = range; _i < range_1.length; _i++) {
                                var ar = range_1[_i];
                                animOpt = document.createElement("option");
                                animOpt.value = ar.name;
                                animOpt.innerText = ar.name;
                                this.animSelect.appendChild(animOpt);
                            }
                            if (range[0] != null) {
                                document.getElementById("animFrom").innerText = new Number(range[0].from).toString();
                                document.getElementById("animTo").innerText = new Number(range[0].to).toString();
                            }
                        };
                        VishvaGUI.prototype.toString = function (d) {
                            return new Number(d).toFixed(2).toString();
                        };
                        VishvaGUI.prototype.initGeneral = function () {
                            var _this = this;
                            //name
                            this.genName = document.getElementById("genName");
                            //TODO remove
                            //            this.genName.onfocus = () => {
                            //                this.vishva.disableKeys();
                            //            }
                            //            this.genName.onblur = () => {
                            //                this.vishva.enableKeys();
                            //            }
                            this.genName.onchange = function () {
                                _this.vishva.setName(_this.genName.value);
                            };
                            //space
                            this.genSpace = document.getElementById("genSpace");
                            this.genSpace.onchange = function () {
                                var err = _this.vishva.setSpace(_this.genSpace.value);
                                if (err !== null) {
                                    _this.showAlertDiag(err);
                                    _this.genSpace.value = _this.vishva.getSpace();
                                }
                            };
                            //transforms
                            if (this.transRefresh === undefined) {
                                this.transRefresh = document.getElementById("transRefresh");
                                this.transRefresh.onclick = function () {
                                    _this.updateTransform();
                                    return false;
                                };
                            }
                            if (this.transBake === undefined) {
                                this.transBake = document.getElementById("transBake");
                                this.transBake.onclick = function () {
                                    _this.vishva.bakeTransforms();
                                    _this.updateTransform();
                                    return false;
                                };
                            }
                            //edit controls
                            this.genOperTrans = document.getElementById("operTrans");
                            this.genOperRot = document.getElementById("operRot");
                            this.genOperScale = document.getElementById("operScale");
                            this.genOperFocus = document.getElementById("operFocus");
                            this.genOperTrans.onclick = function () {
                                _this.vishva.setTransOn();
                            };
                            this.genOperRot.onclick = function () {
                                _this.vishva.setRotOn();
                            };
                            this.genOperScale.onclick = function () {
                                _this.vishva.setScaleOn();
                                if (!_this.vishva.isSpaceLocal()) {
                                    _this.showAlertDiag("note that scaling doesnot work with global axis");
                                }
                            };
                            this.genOperFocus.onclick = function () {
                                _this.vishva.setFocusOnMesh();
                            };
                            //Snap CheckBox
                            this.genSnapTrans = document.getElementById("snapTrans");
                            this.genSnapTrans.onchange = function () {
                                var err = _this.vishva.snapTrans(_this.genSnapTrans.checked);
                                if (err != null) {
                                    _this.showAlertDiag(err);
                                    _this.genSnapTrans.checked = false;
                                }
                            };
                            this.genSnapRot = document.getElementById("snapRot");
                            this.genSnapRot.onchange = function () {
                                var err = _this.vishva.snapRot(_this.genSnapRot.checked);
                                if (err != null) {
                                    _this.showAlertDiag(err);
                                    _this.genSnapRot.checked = false;
                                }
                            };
                            this.genSnapScale = document.getElementById("snapScale");
                            this.genSnapScale.onchange = function () {
                                var err = _this.vishva.snapScale(_this.genSnapScale.checked);
                                if (err != null) {
                                    _this.showAlertDiag(err);
                                    _this.genSnapScale.checked = false;
                                }
                            };
                            //Snap Values
                            this.genSnapTransValue = document.getElementById("snapTransValue");
                            this.genSnapTransValue.onchange = function () {
                                _this.vishva.setSnapTransValue(Number(_this.genSnapTransValue.value));
                            };
                            this.genSnapRotValue = document.getElementById("snapRotValue");
                            this.genSnapRotValue.onchange = function () {
                                _this.vishva.setSnapRotValue(Number(_this.genSnapRotValue.value));
                            };
                            this.genSnapScaleValue = document.getElementById("snapScaleValue");
                            this.genSnapScaleValue.onchange = function () {
                                _this.vishva.setSnapScaleValue(Number(_this.genSnapScaleValue.value));
                            };
                            //
                            this.genDisable = document.getElementById("genDisable");
                            this.genDisable.onchange = function () {
                                _this.vishva.disableIt(_this.genDisable.checked);
                            };
                            this.genColl = document.getElementById("genColl");
                            this.genColl.onchange = function () {
                                _this.vishva.enableCollision(_this.genColl.checked);
                            };
                            this.genVisi = document.getElementById("genVisi");
                            this.genVisi.onchange = function () {
                                _this.vishva.makeVisibile(_this.genVisi.checked);
                            };
                            var undo = document.getElementById("undo");
                            var redo = document.getElementById("redo");
                            var parentMesh = document.getElementById("parentMesh");
                            var removeParent = document.getElementById("removeParent");
                            var removeChildren = document.getElementById("removeChildren");
                            var cloneMesh = document.getElementById("cloneMesh");
                            var instMesh = document.getElementById("instMesh");
                            var mergeMesh = document.getElementById("mergeMesh");
                            var subMesh = document.getElementById("subMesh");
                            var interMesh = document.getElementById("interMesh");
                            var downAsset = document.getElementById("downMesh");
                            var delMesh = document.getElementById("delMesh");
                            var swAv = document.getElementById("swAv");
                            var swGnd = document.getElementById("swGnd");
                            var sNa = document.getElementById("sNa");
                            undo.onclick = function (e) {
                                _this.vishva.undo();
                                return false;
                            };
                            redo.onclick = function (e) {
                                _this.vishva.redo();
                                return false;
                            };
                            parentMesh.onclick = function (e) {
                                var err = _this.vishva.makeParent();
                                if (err != null) {
                                    _this.showAlertDiag(err);
                                }
                                return false;
                            };
                            removeParent.onclick = function (e) {
                                var err = _this.vishva.removeParent();
                                if (err != null) {
                                    _this.showAlertDiag(err);
                                }
                                return false;
                            };
                            removeChildren.onclick = function (e) {
                                var err = _this.vishva.removeChildren();
                                if (err != null) {
                                    _this.showAlertDiag(err);
                                }
                                return false;
                            };
                            cloneMesh.onclick = function (e) {
                                var err = _this.vishva.clone_mesh();
                                if (err != null) {
                                    _this.showAlertDiag(err);
                                }
                                return false;
                            };
                            instMesh.onclick = function (e) {
                                var err = _this.vishva.instance_mesh();
                                if (err != null) {
                                    _this.showAlertDiag(err);
                                }
                                return false;
                            };
                            mergeMesh.onclick = function (e) {
                                var err = _this.vishva.mergeMeshes();
                                if (err != null) {
                                    _this.showAlertDiag(err);
                                }
                                return false;
                            };
                            subMesh.onclick = function (e) {
                                var err = _this.vishva.csgOperation("subtract");
                                if (err != null) {
                                    _this.showAlertDiag(err);
                                }
                                return false;
                            };
                            interMesh.onclick = function (e) {
                                var err = _this.vishva.csgOperation("intersect");
                                if (err != null) {
                                    _this.showAlertDiag(err);
                                }
                                return false;
                            };
                            downAsset.onclick = function (e) {
                                var downloadURL = _this.vishva.saveAsset();
                                if (downloadURL == null) {
                                    _this.showAlertDiag("No Mesh Selected");
                                    return true;
                                }
                                _this.downloadLink.href = downloadURL;
                                var env = $("#saveDiv");
                                env.dialog("open");
                                return false;
                            };
                            delMesh.onclick = function (e) {
                                var err = _this.vishva.delete_mesh();
                                if (err != null) {
                                    _this.showAlertDiag(err);
                                }
                                return false;
                            };
                            swAv.onclick = function (e) {
                                var err = _this.vishva.switchAvatar();
                                if (err != null) {
                                    _this.showAlertDiag(err);
                                }
                                return true;
                            };
                            swGnd.onclick = function (e) {
                                var err = _this.vishva.switchGround();
                                if (err != null) {
                                    _this.showAlertDiag(err);
                                }
                                return true;
                            };
                            sNa.onclick = function (e) {
                                _this.show_sNaDiag();
                                return true;
                            };
                        };
                        VishvaGUI.prototype.updateGeneral = function () {
                            if (this.genName === undefined)
                                this.initGeneral();
                            this.genName.value = this.vishva.getName();
                            this.genSpace.value = this.vishva.getSpace();
                            this.updateTransform();
                            this.genDisable.checked = this.vishva.isDisabled();
                            this.genColl.checked = this.vishva.isCollideable();
                            this.genVisi.checked = this.vishva.isVisible();
                        };
                        VishvaGUI.prototype.updateTransform = function () {
                            var loc = this.vishva.getLocation();
                            var rot = this.vishva.getRotation();
                            var scl = this.vishva.getScale();
                            document.getElementById("loc.x").value = this.toString(loc.x);
                            document.getElementById("loc.y").value = this.toString(loc.y);
                            document.getElementById("loc.z").value = this.toString(loc.z);
                            document.getElementById("rot.x").value = this.toString(rot.x);
                            document.getElementById("rot.y").value = this.toString(rot.y);
                            document.getElementById("rot.z").value = this.toString(rot.z);
                            document.getElementById("scl.x").value = this.toString(scl.x);
                            document.getElementById("scl.y").value = this.toString(scl.y);
                            document.getElementById("scl.z").value = this.toString(scl.z);
                        };
                        VishvaGUI.prototype.initLightUI = function () {
                            var _this = this;
                            this.lightAtt = document.getElementById("lightAtt");
                            this.lightType = document.getElementById("lightType");
                            this.lightDiff = document.getElementById("lightDiff");
                            this.lightSpec = document.getElementById("lightSpec");
                            this.lightInten = document.getElementById("lightInten");
                            this.lightRange = document.getElementById("lightRange");
                            this.lightRadius = document.getElementById("lightAtt");
                            this.lightAngle = document.getElementById("lightAngle");
                            this.lightExp = document.getElementById("lightExp");
                            this.lightGndClr = document.getElementById("lightGndClr");
                            this.lightDirX = document.getElementById("lightDirX");
                            this.lightDirY = document.getElementById("lightDirY");
                            this.lightDirZ = document.getElementById("lightDirZ");
                            var lightApply = document.getElementById("lightApply");
                            lightApply.onclick = function () {
                                _this.applyLight();
                                _this.showAlertDiag("light applied");
                            };
                        };
                        VishvaGUI.prototype.updateLight = function () {
                            console.log("updateLight");
                            if (this.lightAtt === undefined)
                                this.initLightUI();
                            var lightParm = this.vishva.getAttachedLight();
                            if (lightParm === null) {
                                this.lightAtt.checked = false;
                                lightParm = new vishva_1.LightParm();
                            }
                            else {
                                this.lightAtt.checked = true;
                            }
                            this.lightType.value = lightParm.type;
                            this.lightDiff.value = lightParm.diffuse.toHexString();
                            this.lightSpec.value = lightParm.specular.toHexString();
                            this.lightInten.value = Number(lightParm.intensity).toString();
                            this.lightRange.value = Number(lightParm.range).toString();
                            this.lightRadius.value = Number(lightParm.radius).toString();
                            //this.lightAngle.value = Number(lightParm.angle * 180 / Math.PI).toString();
                            this.lightAngle.value = Number(lightParm.angle).toString();
                            this.lightExp.value = Number(lightParm.exponent).toString();
                            this.lightGndClr.value = lightParm.gndClr.toHexString();
                            this.lightDirX.value = Number(lightParm.direction.x).toString();
                            this.lightDirY.value = Number(lightParm.direction.y).toString();
                            this.lightDirZ.value = Number(lightParm.direction.z).toString();
                        };
                        VishvaGUI.prototype.applyLight = function () {
                            if (!this.lightAtt.checked) {
                                this.vishva.detachLight();
                                return;
                            }
                            var lightParm = new vishva_1.LightParm();
                            lightParm.type = this.lightType.value;
                            lightParm.diffuse = BABYLON.Color3.FromHexString(this.lightDiff.value);
                            lightParm.specular = BABYLON.Color3.FromHexString(this.lightSpec.value);
                            lightParm.intensity = parseFloat(this.lightInten.value);
                            lightParm.range = parseFloat(this.lightRange.value);
                            lightParm.radius = parseFloat(this.lightRadius.value);
                            lightParm.angle = parseFloat(this.lightAngle.value);
                            lightParm.direction.x = parseFloat(this.lightDirX.value);
                            lightParm.direction.y = parseFloat(this.lightDirY.value);
                            lightParm.direction.z = parseFloat(this.lightDirZ.value);
                            lightParm.exponent = parseFloat(this.lightExp.value);
                            lightParm.gndClr = BABYLON.Color3.FromHexString(this.lightGndClr.value);
                            this.vishva.attachAlight(lightParm);
                        };
                        VishvaGUI.prototype.initMatUI = function () {
                            var _this = this;
                            this.matVisVal = document.getElementById("matVisVal");
                            this.matVis = document.getElementById("matVis");
                            this.matColType = document.getElementById("matColType");
                            this.matCol = document.getElementById("matCol");
                            this.matColDiag = new ColorPickerDiag("mesh color", "matColDiag", "matColCP", this.centerBottom, function (hex, hsv, rgb) {
                                _this.matCol.style.background = hex;
                                _this.vishva.setMeshColor(_this.matColType.value, hex);
                            });
                            this.matColType.onchange = function () {
                                var col = _this.vishva.getMeshColor(_this.matColType.value);
                                _this.matCol.style.background = col;
                                _this.matColDiag.setColor(col);
                            };
                            this.matCol.onclick = function () {
                                _this.matColDiag.open(_this.vishva.getMeshColor(_this.matColType.value));
                            };
                            this.matVisVal["value"] = "1.00";
                            this.matVis.oninput = function () {
                                _this.matVisVal["value"] = Number(_this.matVis.value).toFixed(2);
                                _this.vishva.setMeshVisibility(parseFloat(_this.matVis.value));
                            };
                        };
                        VishvaGUI.prototype.updateMat = function () {
                            if (this.matVis == undefined)
                                this.initMatUI();
                            this.matVis.value = Number(this.vishva.getMeshVisibility()).toString();
                            this.matVisVal["value"] = Number(this.matVis.value).toFixed(2);
                            this.matCol.style.background = this.vishva.getMeshColor(this.matColType.value);
                        };
                        VishvaGUI.prototype.initPhyUI = function () {
                            var _this = this;
                            this.phyEna = document.getElementById("phyEna");
                            this.phyType = document.getElementById("phyType");
                            this.phyMass = document.getElementById("phyMass");
                            this.phyRes = document.getElementById("phyRes");
                            this.phyResVal = document.getElementById("phyResVal");
                            this.phyResVal["value"] = "0.0";
                            this.phyRes.oninput = function () {
                                _this.phyResVal["value"] = _this.formatValue(_this.phyRes.value);
                            };
                            this.phyFric = document.getElementById("phyFric");
                            this.phyFricVal = document.getElementById("phyFricVal");
                            this.phyFricVal["value"] = "0.0";
                            this.phyFric.oninput = function () {
                                _this.phyFricVal["value"] = _this.formatValue(_this.phyFric.value);
                            };
                            var phyApply = document.getElementById("phyApply");
                            var phyTest = document.getElementById("phyTest");
                            var phyReset = document.getElementById("phyReset");
                            phyApply.onclick = function (ev) {
                                _this.applyPhysics();
                                _this.showAlertDiag("physics applied");
                                return false;
                            };
                            phyTest.onclick = function (ev) {
                                _this.testPhysics();
                                return false;
                            };
                            phyReset.onclick = function (ev) {
                                _this.resetPhysics();
                                return false;
                            };
                        };
                        VishvaGUI.prototype.formatValue = function (val) {
                            if (val === "1")
                                return "1.0";
                            if (val === "0")
                                return "0.0";
                            return val;
                        };
                        VishvaGUI.prototype.updatePhysics = function () {
                            if (this.phyEna === undefined)
                                this.initPhyUI();
                            var phyParms = this.vishva.getMeshPickedPhyParms();
                            if (phyParms !== null) {
                                this.phyEna.setAttribute("checked", "true");
                                this.phyType.value = Number(phyParms.type).toString();
                                this.phyMass.value = Number(phyParms.mass).toString();
                                this.phyRes.value = Number(phyParms.restitution).toString();
                                this.phyResVal["value"] = this.formatValue(this.phyRes.value);
                                this.phyFric.value = Number(phyParms.friction).toString();
                                this.phyFricVal["value"] = this.formatValue(this.phyFric.value);
                            }
                            else {
                                this.phyEna.checked = false;
                                //by default lets set the type to "box"
                                this.phyType.value = "2";
                                this.phyMass.value = "1";
                                this.phyRes.value = "0";
                                this.phyResVal["value"] = "0.0";
                                this.phyFric.value = "0";
                                this.phyFricVal["value"] = "0.0";
                            }
                        };
                        VishvaGUI.prototype.applyPhysics = function () {
                            var phyParms;
                            if (this.phyEna.checked) {
                                phyParms = new vishva_1.PhysicsParm();
                                phyParms.type = parseInt(this.phyType.value);
                                phyParms.mass = parseFloat(this.phyMass.value);
                                phyParms.restitution = parseFloat(this.phyRes.value);
                                phyParms.friction = parseFloat(this.phyFric.value);
                            }
                            else {
                                phyParms = null;
                            }
                            this.vishva.setMeshPickedPhyParms(phyParms);
                        };
                        VishvaGUI.prototype.testPhysics = function () {
                            var phyParms;
                            phyParms = new vishva_1.PhysicsParm();
                            phyParms.type = parseInt(this.phyType.value);
                            phyParms.mass = parseFloat(this.phyMass.value);
                            phyParms.restitution = parseFloat(this.phyRes.value);
                            phyParms.friction = parseFloat(this.phyFric.value);
                            this.vishva.testPhysics(phyParms);
                        };
                        VishvaGUI.prototype.resetPhysics = function () {
                            this.vishva.resetPhysics();
                        };
                        VishvaGUI.prototype.createAlertDiag = function () {
                            this.alertDiv = document.getElementById("alertDiv");
                            this.alertDialog = $("#alertDiv");
                            var dos = {
                                title: "Info",
                                autoOpen: false,
                                width: "auto",
                                minWidth: 200,
                                height: "auto",
                                closeText: "",
                                closeOnEscape: false
                            };
                            this.alertDialog.dialog(dos);
                        };
                        VishvaGUI.prototype.showAlertDiag = function (msg) {
                            this.alertDiv.innerHTML = "<h3>" + msg + "</h3>";
                            this.alertDialog.dialog("open");
                        };
                        VishvaGUI.prototype.sliderOptions = function (min, max, value) {
                            var _this = this;
                            var so = {};
                            so.min = min;
                            so.max = max;
                            so.value = value;
                            so.slide = function (e, ui) { return _this.handleSlide(e, ui); };
                            return so;
                        };
                        VishvaGUI.prototype.handleSlide = function (e, ui) {
                            var slider = e.target.id;
                            if (slider === "fov") {
                                this.vishva.setFov(ui.value);
                            }
                            else if (slider === "sunPos") {
                                this.vishva.setSunPos(ui.value);
                            }
                            else {
                                var v = ui.value / 100;
                                if (slider === "light") {
                                    this.vishva.setLight(v);
                                }
                                else if (slider === "shade") {
                                    this.vishva.setShade(v);
                                }
                                else if (slider === "fog") {
                                    this.vishva.setFog(v / 10);
                                }
                            }
                            return true;
                        };
                        VishvaGUI.prototype.createNavMenu = function () {
                            var _this = this;
                            //button to show navigation menu
                            var showNavMenu = document.getElementById("showNavMenu");
                            showNavMenu.style.visibility = "visible";
                            //navigation menu sliding setup
                            document.getElementById("navMenubar").style.visibility = "visible";
                            var navMenuBar = $("#navMenubar");
                            var jpo = {
                                my: "left center",
                                at: "right center",
                                of: showNavMenu
                            };
                            navMenuBar.position(jpo);
                            navMenuBar.show(null);
                            showNavMenu.onclick = function (e) {
                                if (_this.menuBarOn) {
                                    navMenuBar.hide("slide", 100);
                                }
                                else {
                                    navMenuBar.show("slide", 100);
                                }
                                _this.menuBarOn = !_this.menuBarOn;
                                return true;
                            };
                            //add menu sliding setup
                            var slideDown = JSON.parse("{\"direction\":\"up\"}");
                            var navAdd = document.getElementById("navAdd");
                            var addMenu = $("#AddMenu");
                            addMenu.menu();
                            addMenu.hide(null);
                            navAdd.onclick = function (e) {
                                if (_this.firstTime) {
                                    var jpo = {
                                        my: "left top",
                                        at: "left bottom",
                                        of: navAdd
                                    };
                                    addMenu.menu().position(jpo);
                                    _this.firstTime = false;
                                }
                                if (_this.addMenuOn) {
                                    addMenu.menu().hide("slide", slideDown, 100);
                                }
                                else {
                                    addMenu.show("slide", slideDown, 100);
                                }
                                _this.addMenuOn = !_this.addMenuOn;
                                $(document).one("click", function (jqe) {
                                    if (_this.addMenuOn) {
                                        addMenu.menu().hide("slide", slideDown, 100);
                                        _this.addMenuOn = false;
                                    }
                                    return true;
                                });
                                e.cancelBubble = true;
                                return true;
                            };
                            var downWorld = document.getElementById("downWorld");
                            downWorld.onclick = function (e) {
                                var downloadURL = _this.vishva.saveWorld();
                                if (downloadURL == null)
                                    return true;
                                _this.downloadLink.href = downloadURL;
                                _this.downloadDialog.dialog("open");
                                return false;
                            };
                            var navEnv = document.getElementById("navEnv");
                            navEnv.onclick = function (e) {
                                if (_this.envDiag == undefined) {
                                    _this.createEnvDiag();
                                }
                                _this.toggleDiag(_this.envDiag);
                                return false;
                            };
                            var navEdit = document.getElementById("navEdit");
                            navEdit.onclick = function (e) {
                                if ((_this.propsDiag != null) && (_this.propsDiag.dialog("isOpen") === true)) {
                                    _this.closePropDiag();
                                }
                                else {
                                    _this.showPropDiag();
                                }
                                return true;
                            };
                            var navSettings = document.getElementById("navSettings");
                            navSettings.onclick = function (e) {
                                if (_this.settingDiag == undefined) {
                                    _this.createSettingDiag();
                                }
                                if (_this.settingDiag.dialog("isOpen") === false) {
                                    _this.updateSettings();
                                    _this.settingDiag.dialog("open");
                                }
                                else {
                                    _this.settingDiag.dialog("close");
                                }
                                return false;
                            };
                            var helpLink = document.getElementById("helpLink");
                            helpLink.onclick = function (e) {
                                _this.toggleDiag(_this.helpDiag);
                                return true;
                            };
                            var debugLink = document.getElementById("debugLink");
                            debugLink.onclick = function (e) {
                                _this.vishva.toggleDebug();
                                return true;
                            };
                        };
                        /*
                         * open diag if close
                         * close diag if open
                         */
                        VishvaGUI.prototype.toggleDiag = function (diag) {
                            if (diag.dialog("isOpen") === false) {
                                diag.dialog("open");
                            }
                            else {
                                diag.dialog("close");
                            }
                        };
                        VishvaGUI.prototype.getSettings = function () {
                            var guiSettings = new GuiSettings();
                            guiSettings.enableToolTips = this.enableToolTips;
                            return guiSettings;
                        };
                        VishvaGUI.prototype.setSettings = function () {
                            var guiSettings = this.vishva.getGuiSettings();
                            if (guiSettings !== null)
                                this.enableToolTips = guiSettings.enableToolTips;
                        };
                        return VishvaGUI;
                    }());
                    VishvaGUI.LARGE_ICON_SIZE = "width:128px;height:128px;";
                    VishvaGUI.SMALL_ICON_SIZE = "width:64px;height:64px;";
                    gui.VishvaGUI = VishvaGUI;
                    var GuiSettings = (function () {
                        function GuiSettings() {
                        }
                        return GuiSettings;
                    }());
                    gui.GuiSettings = GuiSettings;
                    var RGB = (function () {
                        function RGB() {
                            this.r = 0;
                            this.g = 0;
                            this.b = 0;
                        }
                        return RGB;
                    }());
                    gui.RGB = RGB;
                    var Range = (function () {
                        function Range(min, max, value, step) {
                            this.type = "Range";
                            this.min = 0;
                            this.max = 0;
                            this.value = 0;
                            this.step = 0;
                            this.min = min;
                            this.max = max;
                            this.value = value;
                            this.step = step;
                        }
                        return Range;
                    }());
                    gui.Range = Range;
                    var SelectType = (function () {
                        function SelectType() {
                            this.type = "SelectType";
                        }
                        return SelectType;
                    }());
                    gui.SelectType = SelectType;
                })(gui = vishva_1.gui || (vishva_1.gui = {}));
            })(vishva = babylonjs.vishva || (babylonjs.vishva = {}));
        })(babylonjs = ssatguru.babylonjs || (ssatguru.babylonjs = {}));
    })(ssatguru = org.ssatguru || (org.ssatguru = {}));
})(org || (org = {}));
var org;
(function (org) {
    var ssatguru;
    (function (ssatguru) {
        var babylonjs;
        (function (babylonjs) {
            var util;
            (function (util) {
                var HREFsearch = (function () {
                    function HREFsearch() {
                        this.names = new Array();
                        this.values = new Array();
                        var search = window.location.search;
                        search = search.substring(1);
                        var parms = search.split("&");
                        for (var index121 = 0; index121 < parms.length; index121++) {
                            var parm = parms[index121];
                            {
                                var nameValues = parm.split("=");
                                if (nameValues.length === 2) {
                                    var name = nameValues[0];
                                    var value = nameValues[1];
                                    this.names.push(name);
                                    this.values.push(value);
                                }
                            }
                        }
                    }
                    HREFsearch.prototype.getParm = function (parm) {
                        var i = this.names.indexOf(parm);
                        if (i !== -1) {
                            return this.values[i];
                        }
                        return null;
                    };
                    return HREFsearch;
                }());
                util.HREFsearch = HREFsearch;
            })(util = babylonjs.util || (babylonjs.util = {}));
        })(babylonjs = ssatguru.babylonjs || (ssatguru.babylonjs = {}));
    })(ssatguru = org.ssatguru || (org.ssatguru = {}));
})(org || (org = {}));
/*
 * Sensors and Actuators
 */
var org;
/*
 * Sensors and Actuators
 */
(function (org) {
    var ssatguru;
    (function (ssatguru) {
        var babylonjs;
        (function (babylonjs) {
            var vishva;
            (function (vishva) {
                var ActionManager = BABYLON.ActionManager;
                var Animation = BABYLON.Animation;
                var Axis = BABYLON.Axis;
                var ExecuteCodeAction = BABYLON.ExecuteCodeAction;
                var SelectType = org.ssatguru.babylonjs.vishva.gui.SelectType;
                var Range = org.ssatguru.babylonjs.vishva.gui.Range;
                var Sound = BABYLON.Sound;
                var Tags = BABYLON.Tags;
                var Quaternion = BABYLON.Quaternion;
                var Vector3 = BABYLON.Vector3;
                var SNAManager = (function () {
                    function SNAManager() {
                        this.sensorList = ["Touch", "Contact"];
                        this.actuatorList = ["Animator", "Mover", "Rotator", "Sound", "Cloaker", "Disabler", "Enabler"];
                        this.snaDisabledList = new Array();
                        this.sig2actMap = new Object();
                        this.prevUID = "";
                    }
                    SNAManager.getSNAManager = function () {
                        if (SNAManager.sm == null) {
                            SNAManager.sm = new SNAManager();
                        }
                        return SNAManager.sm;
                    };
                    SNAManager.prototype.setConfig = function (snaConfig) {
                        this.sensors = snaConfig["sensors"];
                        this.actuators = snaConfig["actuators"];
                        this.sensorList = Object.keys(this.sensors);
                        this.actuatorList = Object.keys(this.actuators);
                    };
                    SNAManager.prototype.getSensorList = function () {
                        return this.sensorList;
                    };
                    SNAManager.prototype.getActuatorList = function () {
                        return this.actuatorList;
                    };
                    /*
                     * the first constructor is called by the vishva scene unmarshaller
                     * the second by the gui to create a new sensor
                     */
                    SNAManager.prototype.createSensorByName = function (name, mesh, prop) {
                        if (name === "Touch") {
                            if (prop != null)
                                return new SensorTouch(mesh, prop);
                            else
                                return new SensorTouch(mesh, new SenTouchProp());
                        }
                        else if (name === "Contact") {
                            if (prop != null)
                                return new SensorContact(mesh, prop);
                            else
                                return new SensorContact(mesh, new SenContactProp());
                        }
                        else
                            return null;
                    };
                    /*
                     * the first constructor is called by the vishva scene unmarshaller
                     * the second by the gui to create a new actuator
                     */
                    SNAManager.prototype.createActuatorByName = function (name, mesh, prop) {
                        if (name === "Mover") {
                            if (prop != null)
                                return new ActuatorMover(mesh, prop);
                            else
                                return new ActuatorMover(mesh, new ActMoverParm());
                        }
                        else if (name === "Rotator") {
                            if (prop != null)
                                return new ActuatorRotator(mesh, prop);
                            else
                                return new ActuatorRotator(mesh, new ActRotatorParm());
                        }
                        else if (name === "Sound") {
                            if (prop != null)
                                return new ActuatorSound(mesh, prop);
                            else
                                return new ActuatorSound(mesh, new ActSoundProp());
                        }
                        else if (name === "Animator") {
                            if (prop != null)
                                return new ActuatorAnimator(mesh, prop);
                            else
                                return new ActuatorAnimator(mesh, new AnimatorProp());
                        }
                        else if (name === "Cloaker") {
                            if (prop != null)
                                return new ActuatorCloaker(mesh, prop);
                            else
                                return new ActuatorCloaker(mesh, new ActCloakerProp());
                        }
                        else if (name === "Disabler") {
                            if (prop != null)
                                return new ActuatorDisabler(mesh, prop);
                            else
                                return new ActuatorDisabler(mesh, new ActDisablerProp());
                        }
                        else if (name === "Enabler") {
                            if (prop != null)
                                return new ActuatorEnabler(mesh, prop);
                            else
                                return new ActuatorEnabler(mesh, new ActEnablerProp());
                        }
                        else
                            return null;
                    };
                    SNAManager.prototype.getSensorParms = function (sensor) {
                        var sensorObj = this.sensors[sensor];
                        return sensorObj["parms"];
                    };
                    SNAManager.prototype.getActuatorParms = function (actuator) {
                        var actuatorObj = this.sensors[actuator];
                        return actuatorObj["parms"];
                    };
                    SNAManager.prototype.emitSignal = function (signalId) {
                        var _this = this;
                        if (signalId.trim() === "")
                            return;
                        var keyValue = this.sig2actMap[signalId];
                        if (keyValue != null) {
                            window.setTimeout((function (acts) { return _this.actuate(acts); }), 0, keyValue);
                        }
                    };
                    SNAManager.prototype.actuate = function (acts) {
                        var actuators = acts;
                        for (var index151 = 0; index151 < actuators.length; index151++) {
                            var actuator = actuators[index151];
                            {
                                actuator.start();
                            }
                        }
                    };
                    /**
                     * this is called to process any signals queued in any of mesh actuators
                     * this could be called after say a user has finished editing a mesh during
                     * edit all actuators are disabled and some events coudl lead to pending
                     * signals one example of such event could be adding a actuator with
                     * "autostart" enabled or enabling an existing actuators "autostart" during
                     * edit.
                     *
                     * @param mesh
                     */
                    SNAManager.prototype.processQueue = function (mesh) {
                        var actuators = mesh["actuators"];
                        if (actuators != null) {
                            for (var index152 = 0; index152 < actuators.length; index152++) {
                                var actuator = actuators[index152];
                                {
                                    actuator.processQueue();
                                }
                            }
                        }
                    };
                    /**
                     * this temproraily disables all sensors and actuators on a mesh this could
                     * be called for example when editing a mesh
                     *
                     * @param mesh
                     */
                    SNAManager.prototype.disableSnAs = function (mesh) {
                        this.snaDisabledList.push(mesh);
                        var actuators = mesh["actuators"];
                        if (actuators != null) {
                            for (var index153 = 0; index153 < actuators.length; index153++) {
                                var actuator = actuators[index153];
                                {
                                    if (actuator.actuating)
                                        actuator.stop();
                                }
                            }
                        }
                    };
                    SNAManager.prototype.enableSnAs = function (mesh) {
                        var i = this.snaDisabledList.indexOf(mesh);
                        if (i !== -1) {
                            this.snaDisabledList.splice(i, 1);
                        }
                        var actuators = mesh["actuators"];
                        if (actuators != null) {
                            for (var index154 = 0; index154 < actuators.length; index154++) {
                                var actuator = actuators[index154];
                                {
                                    if (actuator.properties.autoStart)
                                        actuator.start();
                                }
                            }
                        }
                    };
                    /**
                     * removes all sensors and actuators from a mesh. this would be called when
                     * say disposing off a mesh
                     *
                     * @param mesh
                     */
                    SNAManager.prototype.removeSNAs = function (mesh) {
                        var actuators = mesh["actuators"];
                        if (actuators != null) {
                            var l = actuators.length;
                            for (var i = l - 1; i >= 0; i--) {
                                actuators[i].dispose();
                            }
                        }
                        var sensors = mesh["sensors"];
                        if (sensors != null) {
                            var l = sensors.length;
                            for (var i = l - 1; i >= 0; i--) {
                                sensors[i].dispose();
                            }
                        }
                        var i = this.snaDisabledList.indexOf(mesh);
                        if (i !== -1) {
                            this.snaDisabledList.splice(i, 1);
                        }
                    };
                    SNAManager.prototype.subscribe = function (actuator, signalId) {
                        var keyValue = this.sig2actMap[signalId];
                        if (keyValue == null) {
                            var actuators = new Array();
                            actuators.push(actuator);
                            this.sig2actMap[signalId] = actuators;
                        }
                        else {
                            var actuators = keyValue;
                            actuators.push(actuator);
                        }
                    };
                    SNAManager.prototype.unSubscribe = function (actuator, signalId) {
                        var keyValue = this.sig2actMap[signalId];
                        if (keyValue != null) {
                            var actuators = keyValue;
                            var i = actuators.indexOf(actuator);
                            if (i !== -1) {
                                actuators.splice(i, 1);
                            }
                        }
                    };
                    SNAManager.prototype.unSubscribeAll = function () {
                    };
                    SNAManager.prototype.serializeSnAs = function (scene) {
                        var snas = new Array();
                        var sna;
                        var meshes = scene.meshes;
                        var meshId;
                        for (var index155 = 0; index155 < meshes.length; index155++) {
                            var mesh = meshes[index155];
                            {
                                meshId = null;
                                var actuators = mesh["actuators"];
                                if (actuators != null) {
                                    meshId = this.getMeshVishvaUid(mesh);
                                    for (var index156 = 0; index156 < actuators.length; index156++) {
                                        var actuator = actuators[index156];
                                        {
                                            sna = new SNAserialized();
                                            sna.name = actuator.getName();
                                            sna.type = actuator.getType();
                                            sna.meshId = meshId;
                                            sna.properties = actuator.getProperties();
                                            snas.push(sna);
                                        }
                                    }
                                }
                                var sensors = mesh["sensors"];
                                if (sensors != null) {
                                    if (meshId == null)
                                        meshId = this.getMeshVishvaUid(mesh);
                                    for (var index157 = 0; index157 < sensors.length; index157++) {
                                        var sensor = sensors[index157];
                                        {
                                            sna = new SNAserialized();
                                            sna.name = sensor.getName();
                                            sna.type = sensor.getType();
                                            sna.meshId = meshId;
                                            sna.properties = sensor.getProperties();
                                            snas.push(sna);
                                        }
                                    }
                                }
                            }
                        }
                        return snas;
                    };
                    SNAManager.prototype.unMarshal = function (snas, scene) {
                        if (snas == null)
                            return;
                        for (var index158 = 0; index158 < snas.length; index158++) {
                            var sna = snas[index158];
                            var mesh = scene.getMeshesByTags(sna.meshId)[0];
                            if (mesh != null) {
                                if (sna.type === "SENSOR") {
                                    this.createSensorByName(sna.name, mesh, sna.properties);
                                }
                                else if (sna.type === "ACTUATOR") {
                                    this.createActuatorByName(sna.name, mesh, sna.properties);
                                }
                            }
                            else {
                                console.log("didnot find mesh for tag " + sna.meshId);
                            }
                        }
                    };
                    SNAManager.prototype.getMeshVishvaUid = function (mesh) {
                        if (Tags.HasTags(mesh)) {
                            var tags = Tags.GetTags(mesh, true).split(" ");
                            for (var index159 = 0; index159 < tags.length; index159++) {
                                var tag = tags[index159];
                                {
                                    var i = tag.indexOf("Vishva.uid.");
                                    if (i >= 0) {
                                        return tag;
                                    }
                                }
                            }
                        }
                        var uid;
                        uid = "Vishva.uid." + new Number(Date.now()).toString();
                        while ((uid === this.prevUID)) {
                            console.log("regenerating uid");
                            uid = "Vishva.uid." + new Number(Date.now()).toString();
                        }
                        ;
                        this.prevUID = uid;
                        Tags.AddTagsTo(mesh, uid);
                        return uid;
                    };
                    return SNAManager;
                }());
                vishva.SNAManager = SNAManager;
                var SNAserialized = (function () {
                    function SNAserialized() {
                    }
                    return SNAserialized;
                }());
                vishva.SNAserialized = SNAserialized;
                var SensorAbstract = (function () {
                    function SensorAbstract(mesh, properties) {
                        //action: Action;
                        this.actions = new Array();
                        //Object.defineProperty(this, '__interfaces', { configurable: true, value: ["org.ssatguru.babylonjs.Sensor", "org.ssatguru.babylonjs.SensorActuator"] });
                        this.properties = properties;
                        this.mesh = mesh;
                        var sensors = this.mesh["sensors"];
                        if (sensors == null) {
                            sensors = new Array();
                            mesh["sensors"] = sensors;
                        }
                        sensors.push(this);
                    }
                    SensorAbstract.prototype.dispose = function () {
                        var sensors = this.mesh["sensors"];
                        if (sensors != null) {
                            var i = sensors.indexOf(this);
                            if (i !== -1) {
                                sensors.splice(i, 1);
                            }
                        }
                        this.removeActions();
                        //call any sesnor specific cleanup
                        this.cleanUp();
                    };
                    SensorAbstract.prototype.getSignalId = function () {
                        return this.properties.signalId;
                    };
                    SensorAbstract.prototype.setSignalId = function (sid) {
                        this.properties.signalId = sid;
                    };
                    SensorAbstract.prototype.emitSignal = function (e) {
                        // donot emit signal if this mesh is on the diabled list
                        var i = SNAManager.getSNAManager().snaDisabledList.indexOf(this.mesh);
                        if (i >= 0)
                            return;
                        SNAManager.getSNAManager().emitSignal(this.properties.signalId);
                    };
                    SensorAbstract.prototype.getProperties = function () {
                        return this.properties;
                    };
                    SensorAbstract.prototype.setProperties = function (prop) {
                        this.properties = prop;
                    };
                    SensorAbstract.prototype.processUpdateGeneric = function () {
                        this.processUpdateSpecific();
                    };
                    SensorAbstract.prototype.getType = function () {
                        return "SENSOR";
                    };
                    /*
                    * from this mesh's actionmanager remove all actions
                    * added by this sensor
                    * if at end no actions left in the actionmanager
                    * then dispose of the actionmanager itself.
                    */
                    SensorAbstract.prototype.removeActions = function () {
                        var actions = this.mesh.actionManager.actions;
                        var i;
                        for (var _i = 0, _a = this.actions; _i < _a.length; _i++) {
                            var action = _a[_i];
                            i = actions.indexOf(action);
                            actions.splice(i, 1);
                        }
                        if (actions.length === 0) {
                            this.mesh.actionManager.dispose();
                            this.mesh.actionManager = null;
                        }
                    };
                    return SensorAbstract;
                }());
                vishva.SensorAbstract = SensorAbstract;
                var SensorTouch = (function (_super) {
                    __extends(SensorTouch, _super);
                    function SensorTouch(mesh, properties) {
                        var _this = _super.call(this, mesh, properties) || this;
                        Object.defineProperty(_this, '__interfaces', { configurable: true, value: ["org.ssatguru.babylonjs.Sensor", "org.ssatguru.babylonjs.SensorActuator"] });
                        if (_this.mesh.actionManager == null) {
                            _this.mesh.actionManager = new ActionManager(_this.mesh.getScene());
                        }
                        var action = new ExecuteCodeAction(ActionManager.OnPickUpTrigger, function (e) {
                            var pe = e.sourceEvent;
                            if (pe.button === 0)
                                _this.emitSignal(e);
                        });
                        _this.mesh.actionManager.registerAction(action);
                        _this.actions.push(action);
                        return _this;
                    }
                    SensorTouch.prototype.getName = function () {
                        return "Touch";
                    };
                    SensorTouch.prototype.getProperties = function () {
                        return this.properties;
                    };
                    SensorTouch.prototype.setProperties = function (properties) {
                        this.properties = properties;
                    };
                    SensorTouch.prototype.cleanUp = function () {
                    };
                    SensorTouch.prototype.processUpdateSpecific = function () {
                    };
                    return SensorTouch;
                }(SensorAbstract));
                vishva.SensorTouch = SensorTouch;
                var SensorContact = (function (_super) {
                    __extends(SensorContact, _super);
                    function SensorContact(aMesh, properties) {
                        var _this = _super.call(this, aMesh, properties) || this;
                        _this.processUpdateSpecific();
                        return _this;
                    }
                    SensorContact.prototype.getName = function () {
                        return "Contact";
                    };
                    SensorContact.prototype.getProperties = function () {
                        return this.properties;
                    };
                    SensorContact.prototype.setProperties = function (properties) {
                        this.properties = properties;
                    };
                    SensorContact.prototype.cleanUp = function () {
                    };
                    SensorContact.prototype.processUpdateSpecific = function () {
                        var _this = this;
                        var properties = this.properties;
                        var scene = this.mesh.getScene();
                        if (this.mesh.actionManager == null) {
                            this.mesh.actionManager = new ActionManager(scene);
                        }
                        var otherMesh = scene.getMeshesByTags("Vishva.avatar")[0];
                        if (properties.onEnter) {
                            var action = new ExecuteCodeAction({ trigger: ActionManager.OnIntersectionEnterTrigger, parameter: { mesh: otherMesh, usePreciseIntersection: false } }, function (e) { return _this.emitSignal(e); });
                            this.mesh.actionManager.registerAction(action);
                            this.actions.push(action);
                        }
                        if (properties.onExit) {
                            var action = new ExecuteCodeAction({ trigger: ActionManager.OnIntersectionExitTrigger, parameter: { mesh: otherMesh, usePreciseIntersection: false } }, function (e) { return _this.emitSignal(e); });
                            this.mesh.actionManager.registerAction(action);
                            this.actions.push(action);
                        }
                    };
                    SensorContact.prototype.findAV = function (scene) {
                        for (var index140 = 0; index140 < scene.meshes.length; index140++) {
                            var mesh = scene.meshes[index140];
                            {
                                if (Tags.HasTags(mesh)) {
                                    if (Tags.MatchesQuery(mesh, "Vishva.avatar")) {
                                        return mesh;
                                    }
                                }
                            }
                        }
                        return null;
                    };
                    return SensorContact;
                }(SensorAbstract));
                vishva.SensorContact = SensorContact;
                var ActuatorAbstract = (function () {
                    function ActuatorAbstract(mesh, prop) {
                        this.actuating = false;
                        this.ready = true;
                        this.queued = 0;
                        this.disposed = false;
                        Object.defineProperty(this, '__interfaces', { configurable: true, value: ["org.ssatguru.babylonjs.SensorActuator", "org.ssatguru.babylonjs.Actuator"] });
                        this.properties = prop;
                        this.mesh = mesh;
                        this.processUpdateGeneric();
                        var actuators = this.mesh["actuators"];
                        if (actuators == null) {
                            actuators = new Array();
                            this.mesh["actuators"] = actuators;
                        }
                        actuators.push(this);
                    }
                    ActuatorAbstract.prototype.start = function () {
                        if (this.disposed)
                            return false;
                        if (!this.ready)
                            return false;
                        // donot actuate if this mesh is on the disabled list
                        var i = SNAManager.getSNAManager().snaDisabledList.indexOf(this.mesh);
                        if (i >= 0)
                            return false;
                        if (this.actuating) {
                            if (!this.properties.loop) {
                                this.queued++;
                            }
                            return true;
                        }
                        SNAManager.getSNAManager().emitSignal(this.properties.signalStart);
                        this.actuating = true;
                        this.actuate();
                        return true;
                    };
                    ActuatorAbstract.prototype.processQueue = function () {
                        if (this.queued > 0) {
                            this.queued--;
                            this.start();
                        }
                    };
                    ActuatorAbstract.prototype.getType = function () {
                        return "ACTUATOR";
                    };
                    ActuatorAbstract.prototype.getMesh = function () {
                        return this.mesh;
                    };
                    ActuatorAbstract.prototype.getProperties = function () {
                        return this.properties;
                    };
                    ActuatorAbstract.prototype.setProperties = function (prop) {
                        this.properties = prop;
                        this.processUpdateGeneric();
                    };
                    ActuatorAbstract.prototype.getSignalId = function () {
                        return this.properties.signalId;
                    };
                    ActuatorAbstract.prototype.processUpdateGeneric = function () {
                        // check if signalId changed, if yes then resubscribe
                        if (this.signalId != null && this.signalId !== this.properties.signalId) {
                            SNAManager.getSNAManager().unSubscribe(this, this.signalId);
                            this.signalId = this.properties.signalId;
                            SNAManager.getSNAManager().subscribe(this, this.signalId);
                        }
                        else if (this.signalId == null) {
                            this.signalId = this.properties.signalId;
                            SNAManager.getSNAManager().subscribe(this, this.signalId);
                        }
                        this.processUpdateSpecific();
                    };
                    ActuatorAbstract.prototype.onActuateEnd = function () {
                        SNAManager.getSNAManager().emitSignal(this.properties.signalEnd);
                        this.actuating = false;
                        if (this.queued > 0) {
                            this.queued--;
                            this.start();
                            return null;
                        }
                        if (this.properties.loop) {
                            this.start();
                            return null;
                        }
                        return null;
                    };
                    ActuatorAbstract.prototype.dispose = function () {
                        this.disposed = true;
                        SNAManager.getSNAManager().unSubscribe(this, this.properties.signalId);
                        var actuators = this.mesh["actuators"];
                        if (actuators != null) {
                            this.stop();
                            var i = actuators.indexOf(this);
                            if (i !== -1) {
                                actuators.splice(i, 1);
                            }
                        }
                        this.cleanUp();
                        this.mesh = null;
                    };
                    return ActuatorAbstract;
                }());
                vishva.ActuatorAbstract = ActuatorAbstract;
                var ActuatorRotator = (function (_super) {
                    __extends(ActuatorRotator, _super);
                    function ActuatorRotator(mesh, parm) {
                        var _this = _super.call(this, mesh, parm) || this;
                        Object.defineProperty(_this, '__interfaces', { configurable: true, value: ["org.ssatguru.babylonjs.SensorActuator", "org.ssatguru.babylonjs.Actuator"] });
                        return _this;
                    }
                    ActuatorRotator.prototype.actuate = function () {
                        var _this = this;
                        var properties = this.properties;
                        var cPos = this.mesh.rotationQuaternion.clone();
                        var nPos;
                        var rotX = Quaternion.RotationAxis(Axis.X, properties.x * Math.PI / 180);
                        var rotY = Quaternion.RotationAxis(Axis.Y, properties.y * Math.PI / 180);
                        var rotZ = Quaternion.RotationAxis(Axis.Z, properties.z * Math.PI / 180);
                        var abc = Quaternion.RotationYawPitchRoll(properties.y * Math.PI / 180, properties.x * Math.PI / 180, properties.z * Math.PI / 180);
                        if (properties.toggle) {
                            if (properties.state_toggle) {
                                nPos = cPos.multiply(abc);
                            }
                            else {
                                nPos = cPos.multiply(Quaternion.Inverse(abc));
                            }
                        }
                        else
                            nPos = cPos.multiply(rotX).multiply(rotY).multiply(rotZ);
                        properties.state_toggle = !properties.state_toggle;
                        var cY = this.mesh.position.y;
                        var nY = this.mesh.position.y + 5;
                        this.a = Animation.CreateAndStartAnimation("rotate", this.mesh, "rotationQuaternion", 60, 60 * properties.duration, cPos, nPos, 0, null, function () { return _this.onActuateEnd(); });
                    };
                    ActuatorRotator.prototype.getName = function () {
                        return "Rotator";
                    };
                    ActuatorRotator.prototype.stop = function () {
                        var _this = this;
                        if (this.a != null) {
                            this.a.stop();
                            window.setTimeout((function () { return _this.onActuateEnd(); }), 0);
                        }
                    };
                    ActuatorRotator.prototype.cleanUp = function () {
                    };
                    ActuatorRotator.prototype.processUpdateSpecific = function () {
                        if (this.properties.autoStart) {
                            var started = this.start();
                            // sometime a start maynot be possible example during edit
                            // if could not start now then queue it for later start
                            // if (!started)
                            // this.queued++;
                        }
                    };
                    ActuatorRotator.prototype.isReady = function () {
                        return true;
                    };
                    return ActuatorRotator;
                }(ActuatorAbstract));
                vishva.ActuatorRotator = ActuatorRotator;
                var ActuatorMover = (function (_super) {
                    __extends(ActuatorMover, _super);
                    function ActuatorMover(mesh, parms) {
                        return _super.call(this, mesh, parms) || this;
                    }
                    ActuatorMover.prototype.actuate = function () {
                        var _this = this;
                        var props = this.properties;
                        var cPos = this.mesh.position.clone();
                        var nPos;
                        var moveBy;
                        if (props.local) {
                            var meshMatrix = this.mesh.getWorldMatrix();
                            var localMove = new Vector3(props.x * (1 / this.mesh.scaling.x), props.y * (1 / this.mesh.scaling.y), props.z * (1 / this.mesh.scaling.z));
                            moveBy = Vector3.TransformCoordinates(localMove, meshMatrix).subtract(this.mesh.position);
                        }
                        else
                            moveBy = new Vector3(props.x, props.y, props.z);
                        if (props.toggle) {
                            if (props.state_toggle) {
                                nPos = cPos.add(moveBy);
                            }
                            else {
                                nPos = cPos.subtract(moveBy);
                            }
                            props.state_toggle = !props.state_toggle;
                        }
                        else {
                            nPos = cPos.add(moveBy);
                        }
                        this.a = Animation.CreateAndStartAnimation("move", this.mesh, "position", 60, 60 * props.duration, cPos, nPos, 0, null, function () { return _this.onActuateEnd(); });
                    };
                    ActuatorMover.prototype.getName = function () {
                        return "Mover";
                    };
                    ActuatorMover.prototype.stop = function () {
                        var _this = this;
                        if (this.a != null) {
                            this.a.stop();
                            window.setTimeout((function () { return _this.onActuateEnd(); }), 0);
                        }
                    };
                    ActuatorMover.prototype.cleanUp = function () {
                    };
                    ActuatorMover.prototype.processUpdateSpecific = function () {
                        if (this.properties.autoStart) {
                            var started = this.start();
                        }
                    };
                    ActuatorMover.prototype.isReady = function () {
                        return true;
                    };
                    return ActuatorMover;
                }(ActuatorAbstract));
                vishva.ActuatorMover = ActuatorMover;
                var ActuatorAnimator = (function (_super) {
                    __extends(ActuatorAnimator, _super);
                    function ActuatorAnimator(mesh, prop) {
                        var _this = _super.call(this, mesh, prop) || this;
                        Object.defineProperty(_this, '__interfaces', { configurable: true, value: ["org.ssatguru.babylonjs.SensorActuator", "org.ssatguru.babylonjs.Actuator"] });
                        var skel = mesh.skeleton;
                        if (skel != null) {
                            var getAnimationRanges = skel["getAnimationRanges"];
                            var ranges = getAnimationRanges.call(skel);
                            var animNames = new Array(ranges.length);
                            var i = 0;
                            for (var index160 = 0; index160 < ranges.length; index160++) {
                                var range = ranges[index160];
                                {
                                    animNames[i] = range.name;
                                    i++;
                                }
                            }
                            prop.animationRange.values = animNames;
                        }
                        else {
                            prop.animationRange.values = [""];
                        }
                        return _this;
                    }
                    ActuatorAnimator.prototype.actuate = function () {
                        var _this = this;
                        var prop = this.properties;
                        if (this.mesh.skeleton != null) {
                            this.mesh.skeleton.beginAnimation(prop.animationRange.value, false, prop.rate, function () { return _this.onActuateEnd(); });
                        }
                    };
                    ActuatorAnimator.prototype.stop = function () {
                    };
                    ActuatorAnimator.prototype.isReady = function () {
                        return true;
                    };
                    ActuatorAnimator.prototype.getName = function () {
                        return "Animator";
                    };
                    ActuatorAnimator.prototype.processUpdateSpecific = function () {
                        if (this.properties.autoStart) {
                            var started = this.start();
                        }
                    };
                    ActuatorAnimator.prototype.cleanUp = function () {
                        this.properties.loop = false;
                    };
                    return ActuatorAnimator;
                }(ActuatorAbstract));
                vishva.ActuatorAnimator = ActuatorAnimator;
                var ActuatorCloaker = (function (_super) {
                    __extends(ActuatorCloaker, _super);
                    function ActuatorCloaker(mesh, prop) {
                        var _this = _super.call(this, mesh, prop) || this;
                        _this.s = 1;
                        _this.e = 0;
                        return _this;
                    }
                    ActuatorCloaker.prototype.actuate = function () {
                        var _this = this;
                        var props = this.properties;
                        if (props.toggle) {
                            if (props.state_toggle) {
                                this.s = 1;
                                this.e = 0;
                            }
                            else {
                                this.s = 0;
                                this.e = 1;
                            }
                            props.state_toggle = !props.state_toggle;
                        }
                        else {
                            this.s = 1;
                            this.e = 0;
                        }
                        this.a = Animation.CreateAndStartAnimation("cloaker", this.mesh, "visibility", 60, 60 * props.timeToCloak, this.s, this.e, 0, null, function () { return _this.onActuateEnd(); });
                    };
                    ActuatorCloaker.prototype.stop = function () {
                        var _this = this;
                        if (this.a != null) {
                            this.a.stop();
                            window.setTimeout((function () { return _this.onActuateEnd(); }), 0);
                        }
                    };
                    ActuatorCloaker.prototype.isReady = function () {
                        return true;
                    };
                    ActuatorCloaker.prototype.getName = function () {
                        return "Cloaker";
                    };
                    ActuatorCloaker.prototype.processUpdateSpecific = function () {
                        if (this.properties.autoStart) {
                            var started = this.start();
                        }
                    };
                    ActuatorCloaker.prototype.cleanUp = function () {
                        this.properties.loop = false;
                    };
                    return ActuatorCloaker;
                }(ActuatorAbstract));
                vishva.ActuatorCloaker = ActuatorCloaker;
                var ActuatorDisabler = (function (_super) {
                    __extends(ActuatorDisabler, _super);
                    function ActuatorDisabler(mesh, prop) {
                        return _super.call(this, mesh, prop) || this;
                    }
                    ActuatorDisabler.prototype.actuate = function () {
                        var enable = false;
                        if (this.properties.toggle) {
                            if (this.properties.state_toggle) {
                                enable = false;
                            }
                            else {
                                enable = true;
                            }
                            this.properties.state_toggle = !this.properties.state_toggle;
                        }
                        else {
                            enable = false;
                        }
                        this.mesh.setEnabled(enable);
                        this.onActuateEnd();
                    };
                    ActuatorDisabler.prototype.stop = function () {
                        this.mesh.setEnabled(true);
                    };
                    ActuatorDisabler.prototype.isReady = function () {
                        return true;
                    };
                    ActuatorDisabler.prototype.getName = function () {
                        return "Disabler";
                    };
                    ActuatorDisabler.prototype.processUpdateSpecific = function () {
                        if (this.properties.autoStart) {
                            var started = this.start();
                        }
                    };
                    ActuatorDisabler.prototype.cleanUp = function () {
                        this.properties.loop = false;
                    };
                    return ActuatorDisabler;
                }(ActuatorAbstract));
                vishva.ActuatorDisabler = ActuatorDisabler;
                var ActuatorEnabler = (function (_super) {
                    __extends(ActuatorEnabler, _super);
                    function ActuatorEnabler(mesh, prop) {
                        return _super.call(this, mesh, prop) || this;
                    }
                    ActuatorEnabler.prototype.actuate = function () {
                        var enable = false;
                        if (this.properties.toggle) {
                            if (this.properties.state_toggle) {
                                enable = true;
                            }
                            else {
                                enable = false;
                            }
                            this.properties.state_toggle = !this.properties.state_toggle;
                        }
                        else {
                            enable = true;
                        }
                        this.mesh.setEnabled(enable);
                        this.onActuateEnd();
                    };
                    ActuatorEnabler.prototype.stop = function () {
                        this.mesh.setEnabled(false);
                    };
                    ActuatorEnabler.prototype.isReady = function () {
                        return true;
                    };
                    ActuatorEnabler.prototype.getName = function () {
                        return "Enabler";
                    };
                    ActuatorEnabler.prototype.processUpdateSpecific = function () {
                        if (this.properties.autoStart) {
                            var started = this.start();
                        }
                    };
                    ActuatorEnabler.prototype.cleanUp = function () {
                        this.properties.loop = false;
                    };
                    return ActuatorEnabler;
                }(ActuatorAbstract));
                vishva.ActuatorEnabler = ActuatorEnabler;
                var ActuatorSound = (function (_super) {
                    __extends(ActuatorSound, _super);
                    function ActuatorSound(mesh, prop) {
                        var _this = _super.call(this, mesh, prop) || this;
                        Object.defineProperty(_this, '__interfaces', { configurable: true, value: ["org.ssatguru.babylonjs.SensorActuator", "org.ssatguru.babylonjs.Actuator"] });
                        return _this;
                    }
                    ActuatorSound.prototype.actuate = function () {
                        var _this = this;
                        if (this.properties.toggle) {
                            if (this.properties.state_toggle) {
                                this.sound.play();
                            }
                            else {
                                window.setTimeout((function () { return _this.onActuateEnd(); }), 0);
                            }
                            this.properties.state_toggle = !this.properties.state_toggle;
                        }
                        else {
                            this.sound.play();
                        }
                    };
                    /*
                    update is little tricky here as sound file has to be loaded and that
                    happens aynchronously
                    it is not ready to play immediately
                    */
                    ActuatorSound.prototype.processUpdateSpecific = function () {
                        var _this = this;
                        var SOUND_ASSET_LOCATION = "vishva/assets/sounds/";
                        var RELATIVE_ASSET_LOCATION = "../../../../";
                        var properties = this.properties;
                        if (properties.soundFile.value == null)
                            return;
                        if (this.sound == null || properties.soundFile.value !== this.sound.name) {
                            if (this.sound != null) {
                                this.stop();
                                this.sound.dispose();
                            }
                            this.ready = false;
                            this.sound = new Sound(properties.soundFile.value, RELATIVE_ASSET_LOCATION + SOUND_ASSET_LOCATION + properties.soundFile.value, this.mesh.getScene(), (function (properties) {
                                return function () {
                                    _this.updateSound(properties);
                                };
                            })(properties));
                        }
                        else {
                            this.stop();
                            this.updateSound(properties);
                        }
                    };
                    ActuatorSound.prototype.updateSound = function (properties) {
                        var _this = this;
                        this.ready = true;
                        if (properties.attachToMesh) {
                            this.sound.attachToMesh(this.mesh);
                        }
                        this.sound.onended = function () { return _this.onActuateEnd(); };
                        this.sound.setVolume(properties.volume.value);
                        if (properties.autoStart) {
                            var started = this.start();
                            if (!started)
                                this.queued++;
                        }
                    };
                    ActuatorSound.prototype.getName = function () {
                        return "Sound";
                    };
                    ActuatorSound.prototype.stop = function () {
                        var _this = this;
                        if (this.sound != null) {
                            if (this.sound.isPlaying) {
                                this.sound.stop();
                                window.setTimeout((function () { return _this.onActuateEnd(); }), 0);
                            }
                        }
                    };
                    ActuatorSound.prototype.cleanUp = function () {
                    };
                    ActuatorSound.prototype.isReady = function () {
                        return this.ready;
                    };
                    return ActuatorSound;
                }(ActuatorAbstract));
                vishva.ActuatorSound = ActuatorSound;
                var SNAproperties = (function () {
                    function SNAproperties() {
                        this.signalId = "0";
                        this.signalEnable = "";
                        this.signalDisble = "";
                    }
                    return SNAproperties;
                }());
                vishva.SNAproperties = SNAproperties;
                var SenTouchProp = (function (_super) {
                    __extends(SenTouchProp, _super);
                    function SenTouchProp() {
                        return _super !== null && _super.apply(this, arguments) || this;
                    }
                    SenTouchProp.prototype.unmarshall = function (obj) {
                        return obj;
                    };
                    return SenTouchProp;
                }(SNAproperties));
                vishva.SenTouchProp = SenTouchProp;
                var SenContactProp = (function (_super) {
                    __extends(SenContactProp, _super);
                    function SenContactProp() {
                        var _this = _super !== null && _super.apply(this, arguments) || this;
                        _this.onEnter = false;
                        _this.onExit = false;
                        return _this;
                    }
                    SenContactProp.prototype.unmarshall = function (obj) {
                        return obj;
                    };
                    return SenContactProp;
                }(SNAproperties));
                vishva.SenContactProp = SenContactProp;
                var ActProperties = (function (_super) {
                    __extends(ActProperties, _super);
                    function ActProperties() {
                        var _this = _super !== null && _super.apply(this, arguments) || this;
                        _this.signalStart = "";
                        _this.signalEnd = "";
                        _this.autoStart = false;
                        _this.loop = false;
                        _this.toggle = true;
                        _this.state_toggle = true;
                        return _this;
                    }
                    return ActProperties;
                }(SNAproperties));
                vishva.ActProperties = ActProperties;
                var ActRotatorParm = (function (_super) {
                    __extends(ActRotatorParm, _super);
                    function ActRotatorParm() {
                        var _this = _super !== null && _super.apply(this, arguments) || this;
                        _this.x = 0;
                        _this.y = 90;
                        _this.z = 0;
                        _this.duration = 1;
                        return _this;
                    }
                    //
                    // TODO:always local for now. provide a way to do global rotate
                    // boolean local = false;
                    ActRotatorParm.prototype.unmarshall = function (obj) {
                        return obj;
                    };
                    return ActRotatorParm;
                }(ActProperties));
                vishva.ActRotatorParm = ActRotatorParm;
                var ActMoverParm = (function (_super) {
                    __extends(ActMoverParm, _super);
                    function ActMoverParm() {
                        var _this = _super !== null && _super.apply(this, arguments) || this;
                        _this.x = 1;
                        _this.y = 1;
                        _this.z = 1;
                        _this.duration = 1;
                        _this.local = false;
                        return _this;
                    }
                    ActMoverParm.prototype.unmarshall = function (obj) {
                        return obj;
                    };
                    return ActMoverParm;
                }(ActProperties));
                vishva.ActMoverParm = ActMoverParm;
                var AnimatorProp = (function (_super) {
                    __extends(AnimatorProp, _super);
                    function AnimatorProp() {
                        var _this = _super !== null && _super.apply(this, arguments) || this;
                        _this.animationRange = new SelectType();
                        _this.rate = 1;
                        return _this;
                    }
                    AnimatorProp.prototype.unmarshall = function (obj) {
                        return null;
                    };
                    return AnimatorProp;
                }(ActProperties));
                vishva.AnimatorProp = AnimatorProp;
                var ActSoundProp = (function (_super) {
                    __extends(ActSoundProp, _super);
                    function ActSoundProp() {
                        var _this = _super !== null && _super.apply(this, arguments) || this;
                        _this.soundFile = new SelectType();
                        _this.attachToMesh = false;
                        _this.volume = new Range(0.0, 1.0, 1.0, 0.1);
                        return _this;
                    }
                    ActSoundProp.prototype.unmarshall = function (obj) {
                        return null;
                    };
                    return ActSoundProp;
                }(ActProperties));
                vishva.ActSoundProp = ActSoundProp;
                var ActCloakerProp = (function (_super) {
                    __extends(ActCloakerProp, _super);
                    function ActCloakerProp() {
                        var _this = _super !== null && _super.apply(this, arguments) || this;
                        _this.timeToCloak = 1;
                        return _this;
                    }
                    ActCloakerProp.prototype.unmarshall = function (obj) {
                        return null;
                    };
                    return ActCloakerProp;
                }(ActProperties));
                vishva.ActCloakerProp = ActCloakerProp;
                var ActDisablerProp = (function (_super) {
                    __extends(ActDisablerProp, _super);
                    function ActDisablerProp() {
                        return _super !== null && _super.apply(this, arguments) || this;
                    }
                    ActDisablerProp.prototype.unmarshall = function (obj) {
                        return null;
                    };
                    return ActDisablerProp;
                }(ActProperties));
                vishva.ActDisablerProp = ActDisablerProp;
                var ActEnablerProp = (function (_super) {
                    __extends(ActEnablerProp, _super);
                    function ActEnablerProp() {
                        return _super !== null && _super.apply(this, arguments) || this;
                    }
                    ActEnablerProp.prototype.unmarshall = function (obj) {
                        return null;
                    };
                    return ActEnablerProp;
                }(ActProperties));
                vishva.ActEnablerProp = ActEnablerProp;
            })(vishva = babylonjs.vishva || (babylonjs.vishva = {}));
        })(babylonjs = ssatguru.babylonjs || (ssatguru.babylonjs = {}));
    })(ssatguru = org.ssatguru || (org.ssatguru = {}));
})(org || (org = {}));
var org;
(function (org) {
    var ssatguru;
    (function (ssatguru) {
        var babylonjs;
        (function (babylonjs) {
            var vishva;
            (function (vishva) {
                var EditControl = org.ssatguru.babylonjs.component.EditControl;
                var CharacterControl = org.ssatguru.babylonjs.component.CharacterControl;
                var Animation = BABYLON.Animation;
                var ArcRotateCamera = BABYLON.ArcRotateCamera;
                var AssetsManager = BABYLON.AssetsManager;
                var Color3 = BABYLON.Color3;
                var CubeTexture = BABYLON.CubeTexture;
                var CSG = BABYLON.CSG;
                var DirectionalLight = BABYLON.DirectionalLight;
                var Engine = BABYLON.Engine;
                var HemisphericLight = BABYLON.HemisphericLight;
                var Light = BABYLON.Light;
                var Matrix = BABYLON.Matrix;
                var Mesh = BABYLON.Mesh;
                var MeshBuilder = BABYLON.MeshBuilder;
                var ParticleSystem = BABYLON.ParticleSystem;
                var PhysicsImpostor = BABYLON.PhysicsImpostor;
                var Quaternion = BABYLON.Quaternion;
                var Scene = BABYLON.Scene;
                var SceneLoader = BABYLON.SceneLoader;
                var SceneSerializer = BABYLON.SceneSerializer;
                var ShadowGenerator = BABYLON.ShadowGenerator;
                var SkeletonViewer = BABYLON.Debug.SkeletonViewer;
                var StandardMaterial = BABYLON.StandardMaterial;
                var Tags = BABYLON.Tags;
                var Texture = BABYLON.Texture;
                var Vector3 = BABYLON.Vector3;
                var VishvaGUI = org.ssatguru.babylonjs.vishva.gui.VishvaGUI;
                var WaterMaterial = BABYLON.WaterMaterial;
                //import VishvaSerialized = org.ssatguru.babylonjs.vishva.VishvaSerialized;
                /**
                 * @author satguru
                 */
                var Vishva = (function () {
                    function Vishva(scenePath, sceneFile, canvasId, editEnabled, assets) {
                        var _this = this;
                        this.actuator = "none";
                        this.snapTransOn = false;
                        this.snapRotOn = false;
                        this.snapScaleOn = false;
                        /*
                         * snapper mode snaps mesh to global grid points
                         * evertime a mesh is selected it will be snapped to
                         * the closest global grid point
                         * can only work in globalAxisMode
                         *
                         */
                        this.snapperOn = false;
                        this.snapTransValue = 1;
                        this.snapRotValue = Math.PI / 4;
                        this.snapScaleValue = 0.5;
                        //outlinewidth
                        this.ow = 0.01;
                        this.spaceWorld = false;
                        this.skyboxTextures = "vishva/internal/textures/skybox-default/default";
                        this.avatarFolder = "vishva/internal/avatar/";
                        this.avatarFile = "starterAvatars.babylon";
                        this.groundTexture = "vishva/internal/textures/ground.jpg";
                        this.groundHeightMap = "vishva/internal/textures/ground_heightMap.png";
                        this.primTexture = "vishva/internal/textures/Birch.jpg";
                        this.waterTexture = "vishva/internal/textures/waterbump.png";
                        this.snowTexture = "vishva/internal/textures/flare.png";
                        this.rainTexture = "vishva/internal/textures/raindrop-1.png";
                        this.snowPart = null;
                        this.snowing = false;
                        this.rainPart = null;
                        this.raining = false;
                        this.SOUND_ASSET_LOCATION = "vishva/assets/sounds/";
                        this.RELATIVE_ASSET_LOCATION = "../../../../";
                        /**
                         * use this to prevent users from switching to another mesh during edit.
                         */
                        this.switchDisabled = false;
                        this.keysDisabled = false;
                        this.showBoundingBox = false;
                        this.cameraCollision = true;
                        //automatcally open edit menu whenever a mesh is selected
                        this.autoEditMenu = true;
                        this.enablePhysics = true;
                        this.vishvaSerialized = null;
                        this.isFocusOnAv = true;
                        this.cameraAnimating = false;
                        //how far away from the center can the avatar go
                        //fog will start at the limitStart and will become dense at LimitEnd
                        this.moveLimitStart = 114;
                        this.moveLimitEnd = 124;
                        this.oldAvPos = new Vector3(0, 0, 0);
                        /*
                        private jumpCycleMax: number = 25;
                        private jumpCycle: number = this.jumpCycleMax;
                        private wasJumping: boolean = false;
                        
                        private moveAVandCamera_old() {
                            let oldAvPos = this.avatar.position.clone();
                            var anim: AnimData = this.idle;
                            var moving: boolean = false;
                            var speed: number = 0;
                            var upSpeed: number = 0.05;
                            var dir: number = 1;
                            var forward: Vector3;
                            var backwards: Vector3;
                            var stepLeft: Vector3;
                            var stepRight: Vector3;
                            var up: Vector3;
                            if (this.key.up) {
                                if (this.key.shift) {
                                    speed = this.avatarSpeed * 2;
                                    anim = this.run;
                                } else {
                                    speed = this.avatarSpeed;
                                    anim = this.walk;
                                }
                                if (this.key.jump) {
                                    this.wasJumping = true;
                                }
                                if (this.wasJumping) {
                                    upSpeed *= 2;
                                    if (this.jumpCycle < this.jumpCycleMax / 2) {
                                        dir = 1;
                                        if (this.jumpCycle < 0) {
                                            this.jumpCycle = this.jumpCycleMax;
                                            upSpeed /= 2;
                                            this.key.jump = false;
                                            this.wasJumping = false;
                                        }
                                    } else {
                                        anim = this.jump;
                                        dir = -1;
                                    }
                                    this.jumpCycle--;
                                }
                                //TODO testing physics
                                forward = this.avatar.calcMovePOV(0, -upSpeed * dir, speed);
                                this.avatar.moveWithCollisions(forward);
                                //this.avatar.physicsImpostor.applyForce(new BABYLON.Vector3(0, 0, 1), this.avatar.getAbsolutePosition());
                                moving = true;
                            } else if (this.key.down) {
                                backwards = this.avatar.calcMovePOV(0, -upSpeed * dir, -this.avatarSpeed / 2);
                                this.avatar.moveWithCollisions(backwards);
                                moving = true;
                                anim = this.walkBack;
                                if (this.key.jump) this.key.jump = false;
                            } else if (this.key.stepLeft) {
                                anim = this.strafeLeft;
                                stepLeft = this.avatar.calcMovePOV(-this.avatarSpeed / 2, -upSpeed * dir, 0);
                                this.avatar.moveWithCollisions(stepLeft);
                                moving = true;
                            } else if (this.key.stepRight) {
                                anim = this.strafeRight;
                                stepRight = this.avatar.calcMovePOV(this.avatarSpeed / 2, -upSpeed * dir, 0);
                                this.avatar.moveWithCollisions(stepRight);
                                moving = true;
                            }
                            if (!moving) {
                                if (this.key.jump) {
                                    this.wasJumping = true;
                                }
                                if (this.wasJumping) {
                                    upSpeed *= 2;
                                    if (this.jumpCycle < this.jumpCycleMax / 2) {
                                        dir = 1;
                                        if (this.jumpCycle < 0) {
                                            this.jumpCycle = this.jumpCycleMax;
                                            upSpeed /= 2;
                                            this.key.jump = false;
                                            this.wasJumping = false;
                                        }
                                    } else {
                                        anim = this.jump;
                                        dir = -1;
                                    }
                                    this.jumpCycle--;
                                } else dir = dir / 2;
                                this.avatar.moveWithCollisions(new Vector3(0, -upSpeed * dir, 0));
                            }
                            if (!this.key.stepLeft && !this.key.stepRight) {
                                if (this.key.left) {
                                    this.mainCamera.alpha = this.mainCamera.alpha + 0.022;
                                    if (!moving) {
                                        this.avatar.rotation.y = -4.69 - this.mainCamera.alpha;
                                        anim = this.turnLeft;
                                    }
                                } else if (this.key.right) {
                                    this.mainCamera.alpha = this.mainCamera.alpha - 0.022;
                                    if (!moving) {
                                        this.avatar.rotation.y = -4.69 - this.mainCamera.alpha;
                                        anim = this.turnRight;
                                    }
                                }
                            }
                            if (moving) {
                                this.avatar.rotation.y = -4.69 - this.mainCamera.alpha;
                            }
                            if (this.prevAnim !== anim) {
                                if (anim.exist) {
                                    this.avatarSkeleton.beginAnimation(anim.name, true, anim.r);
                                }
                                this.prevAnim = anim;
                            }
                            let avPos = this.avatar.position.length();
                            if (avPos > this.moveLimitStart) {
                                this.scene.fogDensity = this.fogDensity + 0.01 * (avPos - this.moveLimitStart) / (this.moveLimitEnd - this.moveLimitStart)
                            } else {
                                this.scene.fogDensity = this.fogDensity;
                            }
                            if (avPos > this.moveLimitEnd) {
                                this.avatar.position = oldAvPos;
                            }
                            this.mainCamera.target = new Vector3(this.avatar.position.x, (this.avatar.position.y + 1.5), this.avatar.position.z);
                        }
                        */
                        this.fogDensity = 0;
                        this.meshesPicked = null;
                        this.isMeshSelected = false;
                        this.cameraTargetPos = new Vector3(0, 0, 0);
                        this.saveAVcameraPos = new Vector3(0, 0, 0);
                        this.animFunc = function () { return _this.animateCamera(); };
                        this.animFunc2 = function () { return _this.justReFocus(); };
                        this.showingAllInvisibles = false;
                        // PHYSICS
                        this.meshPickedPhyParms = null;
                        this.didPhysTest = false;
                        this.skelViewerArr = [];
                        this.debugVisible = false;
                        this.editEnabled = false;
                        this.frames = 0;
                        this.f = 0;
                        if (!Engine.isSupported()) {
                            alert("not supported");
                            return;
                        }
                        this.loadingMsg = document.getElementById("loadingMsg");
                        this.loadingMsg.style.visibility = "visible";
                        this.loadingStatus = document.getElementById("loadingStatus");
                        this.editEnabled = editEnabled;
                        this.assets = assets;
                        this.key = new Key();
                        this.initAnims();
                        this.canvas = document.getElementById(canvasId);
                        this.engine = new Engine(this.canvas, true);
                        this.scene = new Scene(this.engine);
                        this.scene.enablePhysics();
                        window.addEventListener("resize", function (event) { return _this.onWindowResize(event); });
                        window.addEventListener("keydown", function (e) { return _this.onKeyDown(e); }, false);
                        window.addEventListener("keyup", function (e) { return _this.onKeyUp(e); }, false);
                        this.scenePath = scenePath;
                        if (sceneFile == null) {
                            this.onSceneLoaded(this.scene);
                        }
                        else {
                            this.loadingStatus.innerHTML = "downloading world";
                            this.loadSceneFile(scenePath, sceneFile + ".js", this.scene);
                        }
                    }
                    Vishva.prototype.loadSceneFile = function (scenePath, sceneFile, scene) {
                        var _this = this;
                        var am = new AssetsManager(scene);
                        var task = am.addTextFileTask("sceneLoader", scenePath + sceneFile);
                        task.onSuccess = function (obj) { return _this.onTaskSuccess(obj); };
                        task.onError = function (obj) { return _this.onTaskFailure(obj); };
                        am.load();
                    };
                    Vishva.prototype.getGuiSettings = function () {
                        if (this.vishvaSerialized !== null)
                            return this.vishvaSerialized.guiSettings;
                        else
                            return null;
                    };
                    Vishva.prototype.onTaskSuccess = function (obj) {
                        var _this = this;
                        var tfat = obj;
                        var foo = JSON.parse(tfat.text);
                        this.vishvaSerialized = foo["VishvaSerialized"];
                        //this.snas = <SNAserialized[]>foo["VishvaSNA"];
                        this.snas = this.vishvaSerialized.snas;
                        this.cameraCollision = this.vishvaSerialized.settings.cameraCollision;
                        this.autoEditMenu = this.vishvaSerialized.settings.autoEditMenu;
                        var sceneData = "data:" + tfat.text;
                        SceneLoader.ShowLoadingScreen = false;
                        this.loadingStatus.innerHTML = "loading scene";
                        SceneLoader.Append(this.scenePath, sceneData, this.scene, function (scene) { return _this.onSceneLoaded(scene); });
                    };
                    Vishva.prototype.onTaskFailure = function (obj) {
                        alert("scene load failed");
                    };
                    Vishva.prototype.onSceneLoaded = function (scene) {
                        var _this = this;
                        this.loadingStatus.innerHTML = "checking assets";
                        var avFound = false;
                        var skelFound = false;
                        var sunFound = false;
                        var groundFound = false;
                        var skyFound = false;
                        var cameraFound = false;
                        for (var _i = 0, _a = scene.meshes; _i < _a.length; _i++) {
                            var mesh = _a[_i];
                            //sat TODO
                            mesh.receiveShadows = false;
                            if (Tags.HasTags(mesh)) {
                                if (Tags.MatchesQuery(mesh, "Vishva.avatar")) {
                                    avFound = true;
                                    this.avatar = mesh;
                                    this.avatar.ellipsoidOffset = new Vector3(0, 2, 0);
                                    /*
                                    if (this.enablePhysics) {
                                        this.avatar.checkCollisions = false;
                                        this.avatar.physicsImpostor = new BABYLON.PhysicsImpostor(this.avatar, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 1, restitution: 0.1 }, this.scene);
                                    }
                                    */
                                }
                                else if (Tags.MatchesQuery(mesh, "Vishva.sky")) {
                                    skyFound = true;
                                    this.skybox = mesh;
                                    this.skybox.isPickable = false;
                                }
                                else if (Tags.MatchesQuery(mesh, "Vishva.ground")) {
                                    groundFound = true;
                                    this.ground = mesh;
                                }
                            }
                        }
                        for (var _b = 0, _c = scene.skeletons; _b < _c.length; _b++) {
                            var skeleton = _c[_b];
                            if (Tags.MatchesQuery(skeleton, "Vishva.skeleton") || (skeleton.name === "Vishva.skeleton")) {
                                skelFound = true;
                                this.avatarSkeleton = skeleton;
                                this.checkAnimRange(this.avatarSkeleton);
                            }
                        }
                        if (!skelFound) {
                            console.error("ALARM: No Skeleton found");
                        }
                        for (var _d = 0, _e = scene.lights; _d < _e.length; _d++) {
                            var light = _e[_d];
                            if (Tags.MatchesQuery(light, "Vishva.sun")) {
                                sunFound = true;
                                this.sun = light;
                            }
                        }
                        if (!sunFound) {
                            console.log("no vishva sun found. creating sun");
                            var hl = new HemisphericLight("Vishva.hl01", new Vector3(0, 1, 0), this.scene);
                            hl.groundColor = new Color3(0.5, 0.5, 0.5);
                            hl.intensity = 0.4;
                            this.sun = hl;
                            Tags.AddTagsTo(hl, "Vishva.sun");
                            this.sunDR = new DirectionalLight("Vishva.dl01", new Vector3(-1, -1, 0), this.scene);
                            this.sunDR.intensity = 0.5;
                            this.sunDR.position = new Vector3(0, 0, 0);
                            var sl = this.sunDR;
                            this.shadowGenerator = new ShadowGenerator(1024, sl);
                            this.shadowGenerator.useBlurVarianceShadowMap = true;
                            this.shadowGenerator.bias = 1.0E-6;
                            //                                this.shadowGenerator.useBlurExponentialShadowMap = true;
                            //                                this.shadowGenerator.bias =1.0E-6;
                            //                                this.shadowGenerator.depthScale = 2500;
                            //                                sl.shadowMinZ = 1;
                            //                                sl.shadowMaxZ = 2500;
                        }
                        else {
                            for (var _f = 0, _g = scene.lights; _f < _g.length; _f++) {
                                var light = _g[_f];
                                if (light.id === "Vishva.dl01") {
                                    this.sunDR = light;
                                    this.shadowGenerator = light.getShadowGenerator();
                                    this.shadowGenerator.useBlurVarianceShadowMap = true;
                                    this.shadowGenerator.bias = 1.0E-6;
                                    //                                                this.shadowGenerator.useBlurExponentialShadowMap = true;
                                    //                                                this.shadowGenerator.bias = 1.0E-6;
                                    //                                                this.shadowGenerator.depthScale = 2500;
                                    //                                                let sl: IShadowLight = <IShadowLight>(<any>this.sunDR);
                                    //                                                sl.shadowMinZ = 1;
                                    //                                                sl.shadowMaxZ = 2500;
                                }
                            }
                        }
                        for (var _h = 0, _j = scene.meshes; _h < _j.length; _h++) {
                            var mesh = _j[_h];
                            if (mesh != null && mesh instanceof BABYLON.InstancedMesh) {
                                //sat TODO remove comment
                                //mesh.receiveShadows = true;
                                (this.shadowGenerator.getShadowMap().renderList).push(mesh);
                            }
                        }
                        for (var _k = 0, _l = scene.cameras; _k < _l.length; _k++) {
                            var camera = _l[_k];
                            if (Tags.MatchesQuery(camera, "Vishva.camera")) {
                                cameraFound = true;
                                this.mainCamera = camera;
                                this.setCameraSettings(this.mainCamera);
                                this.mainCamera.attachControl(this.canvas, true);
                                //this.mainCamera.target = this.vishvaSerialized.misc.activeCameraTarget;
                            }
                        }
                        if (!cameraFound) {
                            console.log("no vishva camera found. creating camera");
                            this.mainCamera = this.createCamera(this.scene, this.canvas);
                            this.scene.activeCamera = this.mainCamera;
                        }
                        //TODO
                        this.mainCamera.checkCollisions = true;
                        this.mainCamera.collisionRadius = new Vector3(0.5, 0.5, 0.5);
                        if (!groundFound) {
                            console.log("no vishva ground found. creating ground");
                            //this.ground = this.createGround_old(this.scene);
                            this.createGround(this.scene);
                        }
                        else {
                            //in case this wasn't set in serialized scene
                            this.ground.receiveShadows = true;
                            if (this.enablePhysics) {
                                this.ground.physicsImpostor = new BABYLON.PhysicsImpostor(this.ground, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.1 }, this.scene);
                            }
                        }
                        if (!skyFound) {
                            console.log("no vishva sky found. creating sky");
                            this.skybox = this.createSkyBox(this.scene);
                        }
                        if (this.scene.fogMode !== Scene.FOGMODE_EXP) {
                            this.scene.fogMode = Scene.FOGMODE_EXP;
                            this.scene.fogDensity = 0;
                        }
                        if (this.editEnabled) {
                            this.scene.onPointerDown = function (evt, pickResult) { return _this.pickObject(evt, pickResult); };
                        }
                        if (!avFound) {
                            console.log("no vishva av found. creating av");
                            //remember loadAvatar is async. process
                            this.loadAvatar();
                        }
                        else {
                            this.avatarSkeleton.enableBlending(0.1);
                            this.cc = new CharacterControl(this.avatar, this.avatarSkeleton, this.anims, this.mainCamera, this.scene);
                            this.cc.start();
                        }
                        vishva.SNAManager.getSNAManager().unMarshal(this.snas, this.scene);
                        this.snas = null;
                        this.render();
                    };
                    Vishva.prototype.render = function () {
                        var _this = this;
                        this.scene.registerBeforeRender(function () { return _this.process(); });
                        this.scene.executeWhenReady(function () { return _this.startRenderLoop(); });
                    };
                    Vishva.prototype.startRenderLoop = function () {
                        var _this = this;
                        this.backfaceCulling(this.scene.materials);
                        if (this.editEnabled) {
                            this.vishvaGUI = new VishvaGUI(this);
                        }
                        else {
                            this.vishvaGUI = null;
                        }
                        this.engine.hideLoadingUI();
                        this.loadingMsg.style.visibility = "hidden";
                        this.engine.runRenderLoop(function () { return _this.scene.render(); });
                    };
                    Vishva.prototype.process = function () {
                        if (this.cameraAnimating)
                            return;
                        //sometime (like when gui dialogs is on and user is typing into it) we donot want to interpret keys
                        //except ofcourse the esc key
                        if (this.keysDisabled && !this.key.esc) {
                            this.resetKeys();
                            return;
                        }
                        //switch to first person?
                        if (this.isFocusOnAv) {
                            if (this.mainCamera.radius <= 0.75) {
                                this.mainCamera.radius = 0.75;
                                this.avatar.visibility = 0;
                                this.mainCamera.checkCollisions = false;
                            }
                            else {
                                this.avatar.visibility = 1;
                                this.mainCamera.checkCollisions = this.cameraCollision;
                            }
                        }
                        if (this.isMeshSelected) {
                            if (this.key.focus) {
                                //this.key.focus = false;
                                this.setFocusOnMesh();
                            }
                            if (this.key.esc) {
                                this.key.esc = false;
                                this.removeEditControl();
                            }
                            if (this.key.trans) {
                                //this.key.trans = false;
                                this.setTransOn();
                            }
                            if (this.key.rot) {
                                //this.key.rot = false;
                                this.setRotOn();
                            }
                            if (this.key.scale) {
                                //this.key.scale = false;
                                this.setScaleOn();
                            }
                        }
                        if (this.isFocusOnAv) {
                            //this.sunDR.position.copyFromFloats(this.avatar.position.x, 128, this.avatar.position.y);
                            if (this.editControl == null) {
                                //this.moveAVandCamera();
                            }
                            else {
                                if (!this.editControl.isEditing()) {
                                    //this.moveAVandCamera();
                                }
                            }
                        }
                        else if (this.key.up || this.key.down || this.key.esc) {
                            if (this.editControl == null) {
                                this.switchFocusToAV();
                            }
                            else if (!this.editControl.isEditing()) {
                                this.switchFocusToAV();
                            }
                        }
                        if (this.key.esc) {
                            this.multiUnSelectAll();
                        }
                        this.resetKeys();
                    };
                    Vishva.prototype.resetKeys = function () {
                        this.key.focus = false;
                        this.key.esc = false;
                        this.key.trans = false;
                        this.key.rot = false;
                        this.key.scale = false;
                    };
                    Vishva.prototype.moveAVandCamera = function () {
                        this.oldAvPos.copyFrom(this.avatar.position);
                        if (!this.cc.moveAVandCamera())
                            return;
                        var avPos = this.avatar.position.length();
                        if (avPos > this.moveLimitStart) {
                            this.scene.fogDensity = this.fogDensity + 0.01 * (avPos - this.moveLimitStart) / (this.moveLimitEnd - this.moveLimitStart);
                        }
                        else {
                            this.scene.fogDensity = this.fogDensity;
                        }
                        if (avPos > this.moveLimitEnd) {
                            this.avatar.position.copyFrom(this.oldAvPos);
                        }
                    };
                    Vishva.prototype.pickObject = function (evt, pickResult) {
                        // prevent curosr from changing to a edit caret in Chrome
                        evt.preventDefault();
                        if (evt.button !== 2)
                            return;
                        if (pickResult.hit) {
                            if (this.key.ctl) {
                                if ((!this.isMeshSelected) || (pickResult.pickedMesh !== this.meshPicked)) {
                                    this.multiSelect(pickResult.pickedMesh);
                                    return;
                                }
                            }
                            // if none selected then select the one clicked
                            if (!this.isMeshSelected) {
                                //if in multiselect then remove from multiselect
                                this.multiUnSelect(pickResult.pickedMesh);
                                this.isMeshSelected = true;
                                this.meshPicked = pickResult.pickedMesh;
                                vishva.SNAManager.getSNAManager().disableSnAs(this.meshPicked);
                                this.savePhyParms();
                                this.switchToQuats(this.meshPicked);
                                this.editControl = new EditControl(this.meshPicked, this.mainCamera, this.canvas, 0.75);
                                this.editControl.enableTranslation();
                                if (this.spaceWorld) {
                                    this.editControl.setLocal(false);
                                }
                                if (this.autoEditMenu) {
                                    this.vishvaGUI.showPropDiag();
                                }
                                //if (this.key.ctl) this.multiSelect(null, this.meshPicked);
                                if (this.snapperOn) {
                                    this.setSnapperOn();
                                }
                                else {
                                    if (this.snapTransOn) {
                                        this.editControl.setTransSnap(true);
                                        this.editControl.setTransSnapValue(this.snapTransValue);
                                    }
                                    ;
                                    if (this.snapRotOn) {
                                        this.editControl.setRotSnap(true);
                                        this.editControl.setRotSnapValue(this.snapRotValue);
                                    }
                                    ;
                                    if (this.snapScaleOn) {
                                        this.editControl.setScaleSnap(true);
                                        this.editControl.setScaleSnapValue(this.snapScaleValue);
                                    }
                                    ;
                                }
                            }
                            else {
                                if (pickResult.pickedMesh === this.meshPicked) {
                                    if (this.key.ctl) {
                                        return;
                                        //this.multiSelect(null, this.meshPicked);
                                    }
                                    else {
                                        // if already selected then focus on it
                                        this.setFocusOnMesh();
                                        //                            if (this.isFocusOnAv) {
                                        //                                this.cc.stop();
                                        //                                this.saveAVcameraPos.copyFrom(this.mainCamera.position);
                                        //                                this.isFocusOnAv = false;
                                        //                            }
                                        //                            this.focusOnMesh(this.meshPicked, 50);
                                    }
                                }
                                else {
                                    //if in multiselect then remove from multiselect
                                    this.multiUnSelect(pickResult.pickedMesh);
                                    this.switchEditControl(pickResult.pickedMesh);
                                    if (this.snapperOn)
                                        this.snapToGlobal();
                                }
                            }
                        }
                    };
                    /**
                     * switch the edit control to the new mesh
                     *
                     * @param mesh
                     */
                    Vishva.prototype.switchEditControl = function (mesh) {
                        if (this.switchDisabled)
                            return;
                        vishva.SNAManager.getSNAManager().enableSnAs(this.meshPicked);
                        this.restorePhyParms();
                        var prevMesh = this.meshPicked;
                        this.meshPicked = mesh;
                        this.savePhyParms();
                        this.switchToQuats(this.meshPicked);
                        this.editControl.switchTo(this.meshPicked);
                        vishva.SNAManager.getSNAManager().disableSnAs(this.meshPicked);
                        //if (this.key.ctl) this.multiSelect(prevMesh, this.meshPicked);
                        //refresh the properties dialog box if open
                        this.vishvaGUI.refreshPropsDiag();
                    };
                    /**
                     * if not set then set the mesh rotation in qauternion
                     */
                    Vishva.prototype.switchToQuats = function (m) {
                        if ((m.rotationQuaternion === undefined) || (m.rotationQuaternion === null)) {
                            var r = m.rotation;
                            m.rotationQuaternion = Quaternion.RotationYawPitchRoll(r.y, r.x, r.z);
                        }
                    };
                    //        private multiSelect() {
                    //            if (this.meshesPicked == null) {
                    //                this.meshesPicked = new Array<AbstractMesh>();
                    //                
                    //            }
                    //            //if already selected then unselect it
                    //            var i: number = this.meshesPicked.indexOf(this.meshPicked);
                    //            if (i >= 0) {
                    //                this.meshesPicked.splice(i, 1);
                    //                this.meshPicked.renderOutline = false;
                    //            } else {
                    //                this.meshesPicked.push(this.meshPicked);
                    //                this.meshPicked.renderOutline = true;
                    //            }
                    //        }
                    Vishva.prototype.multiSelect_old = function (prevMesh, currentMesh) {
                        if (this.meshesPicked == null) {
                            this.meshesPicked = new Array();
                        }
                        //if previous mesh isn't selected then select it too
                        var i;
                        if (prevMesh != null) {
                            i = this.meshesPicked.indexOf(prevMesh);
                            if (!(i >= 0)) {
                                this.meshesPicked.push(prevMesh);
                                prevMesh.renderOutline = true;
                                prevMesh.outlineWidth = this.ow;
                            }
                        }
                        //if current mesh was already selected then unselect it
                        i = this.meshesPicked.indexOf(currentMesh);
                        if (i >= 0) {
                            this.meshesPicked.splice(i, 1);
                            this.meshPicked.renderOutline = false;
                        }
                        else {
                            this.meshesPicked.push(currentMesh);
                            currentMesh.renderOutline = true;
                            currentMesh.outlineWidth = this.ow;
                        }
                    };
                    Vishva.prototype.multiSelect = function (currentMesh) {
                        if (this.meshesPicked == null) {
                            this.meshesPicked = new Array();
                        }
                        //if current mesh was already selected then unselect it
                        //else select it
                        if (!this.multiUnSelect(currentMesh)) {
                            this.meshesPicked.push(currentMesh);
                            currentMesh.renderOutline = true;
                            currentMesh.outlineWidth = this.ow;
                        }
                    };
                    //if mesh was already selected then unselect it
                    //return true if the mesh was unselected
                    Vishva.prototype.multiUnSelect = function (mesh) {
                        if (this.meshesPicked == null)
                            return false;
                        var i = this.meshesPicked.indexOf(mesh);
                        if (i >= 0) {
                            this.meshesPicked.splice(i, 1);
                            mesh.renderOutline = false;
                            return true;
                        }
                        return false;
                    };
                    Vishva.prototype.multiUnSelectAll = function () {
                        if (this.meshesPicked === null)
                            return;
                        for (var _i = 0, _a = this.meshesPicked; _i < _a.length; _i++) {
                            var mesh = _a[_i];
                            mesh.renderOutline = false;
                        }
                        this.meshesPicked = null;
                    };
                    Vishva.prototype.removeEditControl = function () {
                        this.multiUnSelectAll();
                        this.isMeshSelected = false;
                        //            if (!this.focusOnAv) {
                        //                this.switchFocusToAV();
                        //            }
                        //if scaling is on then we might have changed space to local            
                        //restore space to what is was before scaling
                        //            if (this.editControl.isScalingEnabled()) {
                        //                this.setSpaceLocal(this.wasSpaceLocal);
                        //            }
                        this.editControl.detach();
                        this.editControl = null;
                        //if (!this.editAlreadyOpen) this.vishvaGUI.closeEditMenu();
                        if (this.autoEditMenu)
                            this.vishvaGUI.closePropDiag();
                        //close properties dialog if open
                        this.vishvaGUI.closePropsDiag();
                        if (this.meshPicked != null) {
                            vishva.SNAManager.getSNAManager().enableSnAs(this.meshPicked);
                            this.restorePhyParms();
                        }
                    };
                    Vishva.prototype.switchFocusToAV = function () {
                        this.mainCamera.detachControl(this.canvas);
                        this.frames = 25;
                        this.f = this.frames;
                        this.delta = this.saveAVcameraPos.subtract(this.mainCamera.position).scale(1 / this.frames);
                        var avTarget = new Vector3(this.avatar.position.x, (this.avatar.position.y + 1.5), this.avatar.position.z);
                        this.delta2 = avTarget.subtract(this.mainCamera.target).scale(1 / this.frames);
                        this.cameraAnimating = true;
                        this.scene.registerBeforeRender(this.animFunc);
                    };
                    Vishva.prototype.focusOnMesh = function (mesh, frames) {
                        this.mainCamera.detachControl(this.canvas);
                        this.frames = frames;
                        this.f = frames;
                        //this.delta2 = mesh.absolutePosition.subtract((<Vector3>this.mainCamera.target)).scale(1 / this.frames);
                        this.delta2 = mesh.getAbsolutePivotPoint().subtract(this.mainCamera.target).scale(1 / this.frames);
                        this.cameraAnimating = true;
                        this.scene.registerBeforeRender(this.animFunc2);
                    };
                    Vishva.prototype.animateCamera = function () {
                        var avTarget = new Vector3(this.avatar.position.x, (this.avatar.position.y + 1.5), this.avatar.position.z);
                        var targetDiff = avTarget.subtract(this.mainCamera.target).length();
                        if (targetDiff > 0.01)
                            this.mainCamera.setTarget(this.mainCamera.target.add(this.delta2));
                        var posDiff = this.saveAVcameraPos.subtract(this.mainCamera.position).length();
                        if (posDiff > 0.01)
                            this.mainCamera.setPosition(this.mainCamera.position.add(this.delta));
                        this.f--;
                        if (this.f < 0) {
                            this.isFocusOnAv = true;
                            this.cameraAnimating = false;
                            this.scene.unregisterBeforeRender(this.animFunc);
                            this.mainCamera.attachControl(this.canvas);
                            this.cc.start();
                        }
                    };
                    Vishva.prototype.justReFocus = function () {
                        this.mainCamera.setTarget(this.mainCamera.target.add(this.delta2));
                        this.f--;
                        if (this.f < 0) {
                            this.cameraAnimating = false;
                            this.scene.unregisterBeforeRender(this.animFunc2);
                            this.mainCamera.attachControl(this.canvas);
                        }
                    };
                    Vishva.prototype.initAnims = function () {
                        var walk;
                        var walkBack;
                        var idle;
                        var run;
                        var jump;
                        var turnLeft;
                        var turnRight;
                        var strafeLeft;
                        var strafeRight;
                        var avatarSpeed = 0.05;
                        var prevAnim = null;
                        walk = new AnimData("walk", 7, 35, 1);
                        walkBack = new AnimData("walkBack", 39, 65, 0.5);
                        idle = new AnimData("idle", 203, 283, 1);
                        run = new AnimData("run", 69, 95, 1);
                        jump = new AnimData("jump", 101, 103, 0.5);
                        turnLeft = new AnimData("turnLeft", 107, 151, 0.5);
                        turnRight = new AnimData("turnRight", 155, 199, 0.5);
                        strafeLeft = new AnimData("strafeLeft", 0, 0, 1);
                        strafeRight = new AnimData("strafeRight", 0, 0, 1);
                        this.anims = [walk, walkBack, idle, run, jump, turnLeft, turnRight, strafeLeft, strafeRight];
                    };
                    Vishva.prototype.onWindowResize = function (event) {
                        this.engine.resize();
                    };
                    Vishva.prototype.onKeyDown = function (e) {
                        var event = e;
                        if (event.keyCode === 17)
                            this.key.ctl = true;
                        if (event.keyCode === 27)
                            this.key.esc = false;
                        var chr = String.fromCharCode(event.keyCode);
                        //WASD or arrow keys
                        if ((chr === "W") || (event.keyCode === 38))
                            this.key.up = true;
                        if ((chr === "S") || (event.keyCode === 40))
                            this.key.down = true;
                        //
                        if (chr === "1")
                            this.key.trans = false;
                        if (chr === "2")
                            this.key.rot = false;
                        if (chr === "3")
                            this.key.scale = false;
                        if (chr === "F")
                            this.key.focus = false;
                    };
                    Vishva.prototype.onKeyUp = function (e) {
                        var event = e;
                        if (event.keyCode === 17)
                            this.key.ctl = false;
                        if (event.keyCode === 27)
                            this.key.esc = true;
                        //
                        var chr = String.fromCharCode(event.keyCode);
                        if ((chr === "W") || (event.keyCode === 38))
                            this.key.up = false;
                        if ((chr === "S") || (event.keyCode === 40))
                            this.key.down = false;
                        //
                        if (chr === "1")
                            this.key.trans = true;
                        if (chr === "2")
                            this.key.rot = true;
                        if (chr === "3")
                            this.key.scale = true;
                        if (chr === "F")
                            this.key.focus = true;
                    };
                    Vishva.prototype.createPrimMaterial = function () {
                        this.primMaterial = new StandardMaterial("primMat", this.scene);
                        this.primMaterial.diffuseTexture = new Texture(this.primTexture, this.scene);
                        this.primMaterial.diffuseColor = new Color3(1, 1, 1);
                        this.primMaterial.specularColor = new Color3(0, 0, 0);
                    };
                    Vishva.prototype.setPrimProperties = function (mesh) {
                        if (this.primMaterial == null)
                            this.createPrimMaterial();
                        var r = mesh.getBoundingInfo().boundingSphere.radiusWorld;
                        var placementLocal = new Vector3(0, r, -(r + 2));
                        var placementGlobal = Vector3.TransformCoordinates(placementLocal, this.avatar.getWorldMatrix());
                        mesh.position.addInPlace(placementGlobal);
                        mesh.material = this.primMaterial;
                        mesh.checkCollisions = true;
                        (this.shadowGenerator.getShadowMap().renderList).push(mesh);
                        //sat TODO remove comment
                        //mesh.receiveShadows = true;
                        Tags.AddTagsTo(mesh, "Vishva.prim Vishva.internal");
                        mesh.id = new Number(Date.now()).toString();
                        mesh.name = mesh.id;
                    };
                    Vishva.prototype.addPrim = function (primType) {
                        if (primType === "plane")
                            this.addPlane();
                        else if (primType === "box")
                            this.addBox();
                        else if (primType === "sphere")
                            this.addSphere();
                        else if (primType === "disc")
                            this.addDisc();
                        else if (primType === "cylinder")
                            this.addCylinder();
                        else if (primType === "cone")
                            this.addCone();
                        else if (primType === "torus")
                            this.addTorus();
                    };
                    Vishva.prototype.addPlane = function () {
                        var mesh = Mesh.CreatePlane("", 1.0, this.scene);
                        this.setPrimProperties(mesh);
                        mesh.material.backFaceCulling = false;
                    };
                    Vishva.prototype.addBox = function () {
                        var mesh = Mesh.CreateBox("", 1, this.scene);
                        this.setPrimProperties(mesh);
                    };
                    Vishva.prototype.addSphere = function () {
                        var mesh = Mesh.CreateSphere("", 10, 1, this.scene);
                        this.setPrimProperties(mesh);
                    };
                    Vishva.prototype.addDisc = function () {
                        var mesh = Mesh.CreateDisc("", 0.5, 20, this.scene);
                        this.setPrimProperties(mesh);
                        mesh.material.backFaceCulling = false;
                    };
                    Vishva.prototype.addCylinder = function () {
                        var mesh = Mesh.CreateCylinder("", 1, 1, 1, 20, 1, this.scene);
                        this.setPrimProperties(mesh);
                    };
                    Vishva.prototype.addCone = function () {
                        var mesh = Mesh.CreateCylinder("", 1, 0, 1, 20, 1, this.scene);
                        this.setPrimProperties(mesh);
                    };
                    Vishva.prototype.addTorus = function () {
                        var mesh = Mesh.CreateTorus("", 1, 0.25, 20, this.scene);
                        this.setPrimProperties(mesh);
                    };
                    Vishva.prototype.switchGround = function () {
                        if (!this.isMeshSelected) {
                            return "no mesh selected";
                        }
                        Tags.RemoveTagsFrom(this.ground, "Vishva.ground");
                        this.ground.isPickable = true;
                        this.ground = this.meshPicked;
                        this.ground.isPickable = false;
                        Tags.AddTagsTo(this.ground, "Vishva.ground");
                        this.removeEditControl();
                        return null;
                    };
                    Vishva.prototype.instance_mesh = function () {
                        if (!this.isMeshSelected) {
                            return "no mesh selected";
                        }
                        if ((this.meshPicked != null && this.meshPicked instanceof BABYLON.InstancedMesh)) {
                            return ("this is an instance mesh. you cannot create instance of that");
                        }
                        var name = new Number(Date.now()).toString();
                        var inst = this.meshPicked.createInstance(name);
                        //inst.position = this.meshPicked.position.add(new Vector3(0.1, 0.1, 0.1));
                        this.animateCopy(inst);
                        this.meshPicked = inst;
                        this.switchEditControl(inst);
                        //TODO think
                        //inst.receiveShadows = true;
                        (this.shadowGenerator.getShadowMap().renderList).push(inst);
                        return null;
                    };
                    Vishva.prototype.toggleCollision = function () {
                        if (!this.isMeshSelected) {
                            return "no mesh selected";
                        }
                        this.meshPicked.checkCollisions = !this.meshPicked.checkCollisions;
                    };
                    Vishva.prototype.enableCollision = function (yes) {
                        this.meshPicked.checkCollisions = yes;
                    };
                    Vishva.prototype.isCollideable = function () {
                        return this.meshPicked.checkCollisions;
                    };
                    Vishva.prototype.toggleEnable = function () {
                        if (!this.isMeshSelected) {
                            return "no mesh selected";
                        }
                        this.meshPicked.setEnabled(!this.meshPicked.isEnabled());
                    };
                    Vishva.prototype.disableIt = function (yes) {
                        this.meshPicked.setEnabled(!yes);
                    };
                    Vishva.prototype.isDisabled = function () {
                        return !this.meshPicked.isEnabled();
                    };
                    Vishva.prototype.showAllDisabled = function () {
                        for (var _i = 0, _a = this.scene.meshes; _i < _a.length; _i++) {
                            var mesh = _a[_i];
                            if (!mesh.isEnabled()) {
                                mesh.renderOutline = true;
                                mesh.outlineWidth = this.ow;
                            }
                        }
                    };
                    Vishva.prototype.hideAllDisabled = function () {
                        for (var _i = 0, _a = this.scene.meshes; _i < _a.length; _i++) {
                            var mesh = _a[_i];
                            if (!mesh.isEnabled()) {
                                mesh.renderOutline = false;
                            }
                        }
                    };
                    Vishva.prototype.makeVisibile = function (yes) {
                        if (!this.isMeshSelected) {
                            return "no mesh selected";
                        }
                        var mesh = this.meshPicked;
                        if (yes) {
                            if (Tags.HasTags(mesh) && Tags.MatchesQuery(mesh, "invisible")) {
                                Tags.RemoveTagsFrom(this.meshPicked, "invisible");
                                this.meshPicked.visibility = 1;
                                this.meshPicked.isPickable = true;
                                if (this.showingAllInvisibles)
                                    mesh.renderOutline = false;
                            }
                        }
                        else {
                            Tags.AddTagsTo(this.meshPicked, "invisible");
                            if (this.showingAllInvisibles) {
                                this.meshPicked.visibility = 0.5;
                                mesh.renderOutline = true;
                                mesh.outlineWidth = this.ow;
                                this.meshPicked.isPickable = true;
                            }
                            else {
                                this.meshPicked.visibility = 0;
                                this.meshPicked.isPickable = false;
                            }
                        }
                    };
                    Vishva.prototype.isVisible = function () {
                        if (Tags.HasTags(this.meshPicked)) {
                            if (Tags.MatchesQuery(this.meshPicked, "invisible")) {
                                return false;
                            }
                        }
                        return true;
                    };
                    Vishva.prototype.showAllInvisibles = function () {
                        this.showingAllInvisibles = true;
                        for (var i = 0; i < this.scene.meshes.length; i++) {
                            var mesh = this.scene.meshes[i];
                            if (Tags.HasTags(mesh)) {
                                if (Tags.MatchesQuery(mesh, "invisible")) {
                                    mesh.visibility = 0.5;
                                    mesh.renderOutline = true;
                                    mesh.outlineWidth = this.ow;
                                    mesh.isPickable = true;
                                }
                            }
                        }
                    };
                    Vishva.prototype.hideAllInvisibles = function () {
                        this.showingAllInvisibles = false;
                        for (var i = 0; i < this.scene.meshes.length; i++) {
                            for (var i = 0; i < this.scene.meshes.length; i++) {
                                var mesh = this.scene.meshes[i];
                                if (Tags.HasTags(mesh)) {
                                    if (Tags.MatchesQuery(mesh, "invisible")) {
                                        mesh.visibility = 0;
                                        mesh.renderOutline = false;
                                        mesh.isPickable = false;
                                    }
                                }
                            }
                        }
                    };
                    Vishva.prototype.makeParent = function () {
                        if (!this.isMeshSelected) {
                            return "no mesh selected";
                        }
                        if ((this.meshesPicked == null) || (this.meshesPicked.length === 1)) {
                            return "select atleast two mesh. use \'ctl\' and mosue right click to select multiple meshes";
                        }
                        this.meshPicked.computeWorldMatrix(true);
                        var invParentMatrix = Matrix.Invert(this.meshPicked.getWorldMatrix());
                        var m;
                        for (var index122 = 0; index122 < this.meshesPicked.length; index122++) {
                            var mesh = this.meshesPicked[index122];
                            {
                                mesh.computeWorldMatrix(true);
                                if (mesh === this.meshPicked.parent) {
                                    m = this.meshPicked.getWorldMatrix();
                                    m.decompose(this.meshPicked.scaling, this.meshPicked.rotationQuaternion, this.meshPicked.position);
                                    this.meshPicked.parent = null;
                                }
                                if (mesh !== this.meshPicked) {
                                    mesh.renderOutline = false;
                                    m = mesh.getWorldMatrix().multiply(invParentMatrix);
                                    m.decompose(mesh.scaling, mesh.rotationQuaternion, mesh.position);
                                    mesh.parent = this.meshPicked;
                                }
                            }
                        }
                        this.meshPicked.renderOutline = false;
                        this.meshesPicked = null;
                        return null;
                    };
                    Vishva.prototype.removeParent = function () {
                        if (!this.isMeshSelected) {
                            return "no mesh selected";
                        }
                        if (this.meshPicked.parent == null) {
                            return "this mesh has no parent";
                        }
                        var m = this.meshPicked.getWorldMatrix();
                        m.decompose(this.meshPicked.scaling, this.meshPicked.rotationQuaternion, this.meshPicked.position);
                        this.meshPicked.parent = null;
                        return "parent removed";
                    };
                    Vishva.prototype.removeChildren = function () {
                        if (!this.isMeshSelected) {
                            return "no mesh selected";
                        }
                        var mesh = this.meshPicked;
                        var children = mesh.getChildren();
                        if (children.length === 0) {
                            return "this mesh has no children";
                        }
                        var m;
                        var i = 0;
                        for (var index123 = 0; index123 < children.length; index123++) {
                            var child = children[index123];
                            {
                                m = child.getWorldMatrix();
                                m.decompose(child.scaling, child.rotationQuaternion, child.position);
                                child.parent = null;
                                i++;
                            }
                        }
                        return i + " children removed";
                    };
                    Vishva.prototype.clone_mesh = function () {
                        if (!this.isMeshSelected) {
                            return "no mesh selected";
                        }
                        if ((this.meshPicked != null && this.meshPicked instanceof BABYLON.InstancedMesh)) {
                            return ("this is an instance mesh. you cannot clone these");
                        }
                        var clonedMeshesPicked = new Array();
                        var clone;
                        //check if multiple meshes selected. If yes clone all except the last
                        if (this.meshesPicked != null) {
                            for (var _i = 0, _a = this.meshesPicked; _i < _a.length; _i++) {
                                var mesh = _a[_i];
                                if (mesh !== this.meshPicked) {
                                    if (!(mesh != null && mesh instanceof BABYLON.InstancedMesh)) {
                                        clone = this.clonetheMesh(mesh);
                                        clonedMeshesPicked.push(clone);
                                    }
                                }
                            }
                        }
                        clone = this.clonetheMesh(this.meshPicked);
                        if (this.meshesPicked != null) {
                            clonedMeshesPicked.push(clone);
                            this.meshesPicked = clonedMeshesPicked;
                        }
                        this.switchEditControl(clone);
                        return null;
                    };
                    Vishva.prototype.clonetheMesh = function (mesh) {
                        var name = new Number(Date.now()).toString();
                        var clone = mesh.clone(name, null, true);
                        delete clone["sensors"];
                        delete clone["actuators"];
                        this.animateCopy(clone);
                        //clone.position = mesh.position.add(new Vector3(0.1, 0.1, 0.1));
                        //TODO think
                        //clone.receiveShadows = true;
                        mesh.renderOutline = false;
                        (this.shadowGenerator.getShadowMap().renderList).push(clone);
                        return clone;
                    };
                    //play a small scaling animation when cloning or instancing a mesh.
                    Vishva.prototype.animateCopy = function (mesh) {
                        var startScale = new Vector3(1.5, 1.5, 1.5);
                        var endScale = new Vector3(1, 1, 1);
                        Animation.CreateAndStartAnimation('boxscale', mesh, 'scaling', 10, 2, startScale, endScale, 0);
                    };
                    Vishva.prototype.delete_mesh = function () {
                        if (!this.isMeshSelected) {
                            return "no mesh selected";
                        }
                        if (this.meshesPicked != null) {
                            for (var index125 = 0; index125 < this.meshesPicked.length; index125++) {
                                var mesh = this.meshesPicked[index125];
                                {
                                    if (mesh !== this.meshPicked) {
                                        this.deleteTheMesh(mesh);
                                    }
                                }
                            }
                            this.meshesPicked = null;
                        }
                        this.deleteTheMesh(this.meshPicked);
                        this.meshPicked = null;
                        this.removeEditControl();
                        return null;
                    };
                    Vishva.prototype.deleteTheMesh = function (mesh) {
                        vishva.SNAManager.getSNAManager().removeSNAs(mesh);
                        var meshes = this.shadowGenerator.getShadowMap().renderList;
                        var i = meshes.indexOf(mesh);
                        if (i >= 0) {
                            meshes.splice(i, 1);
                        }
                        mesh.dispose();
                    };
                    Vishva.prototype.mergeMeshes = function () {
                        if (this.meshesPicked != null) {
                            for (var _i = 0, _a = this.meshesPicked; _i < _a.length; _i++) {
                                var mesh = _a[_i];
                                if (mesh instanceof BABYLON.InstancedMesh) {
                                    return "some of your meshes are instance meshes. cannot merge those";
                                }
                            }
                            this.meshesPicked.push(this.meshPicked);
                            var ms = this.meshesPicked;
                            var mergedMesh = Mesh.MergeMeshes(ms, false);
                            this.meshesPicked.pop();
                            var newPivot = this.meshPicked.position.multiplyByFloats(-1, -1, -1);
                            //mergedMesh.setPivotMatrix(Matrix.Translation(newPivot.x, newPivot.y, newPivot.z));
                            mergedMesh.setPivotPoint(this.meshPicked.position.clone());
                            //mergedMesh.computeWorldMatrix(true);
                            mergedMesh.position = this.meshPicked.position.clone();
                            this.switchEditControl(mergedMesh);
                            this.animateCopy(mergedMesh);
                            return null;
                        }
                        else {
                            return "please select two or more mesh";
                        }
                    };
                    Vishva.prototype.csgOperation = function (op) {
                        if (this.meshesPicked != null) {
                            if (this.meshesPicked.length > 2) {
                                return "please select only two mesh";
                            }
                            var csg1 = CSG.FromMesh(this.meshPicked);
                            var csg2 = CSG.FromMesh(this.meshesPicked[0]);
                            var csg3 = void 0;
                            if (op === "subtract") {
                                csg3 = csg2.subtract(csg1);
                            }
                            else if (op === "intersect") {
                                csg3 = csg2.intersect(csg1);
                            }
                            else if (op === "union") {
                                csg3 = csg2.union(csg1);
                            }
                            else {
                                return "invalid operation";
                            }
                            var name_1 = new Number(Date.now()).toString();
                            var newMesh = csg3.toMesh(name_1, this.meshesPicked[0].material, this.scene, false);
                            this.switchEditControl(newMesh);
                            this.animateCopy(newMesh);
                            return null;
                        }
                        else {
                            return "please select two mesh";
                        }
                    };
                    Vishva.prototype.physTypes = function () {
                        console.log("BoxImpostor " + PhysicsImpostor.BoxImpostor);
                        console.log("SphereImpostor " + PhysicsImpostor.SphereImpostor);
                        console.log("PlaneImpostor " + PhysicsImpostor.PlaneImpostor);
                        console.log("CylinderImpostor " + PhysicsImpostor.CylinderImpostor);
                        console.log("MeshImpostor " + PhysicsImpostor.MeshImpostor);
                        console.log("ParticleImpostor " + PhysicsImpostor.ParticleImpostor);
                        console.log("HeightmapImpostor " + PhysicsImpostor.HeightmapImpostor);
                    };
                    Vishva.prototype.getMeshPickedPhyParms = function () {
                        return this.meshPickedPhyParms;
                    };
                    Vishva.prototype.setMeshPickedPhyParms = function (parms) {
                        this.meshPickedPhyParms = parms;
                    };
                    //we donot want physics enabled during edit
                    //so save and remove physics parms defore edit and restore them after edit.
                    Vishva.prototype.savePhyParms = function () {
                        if ((this.meshPicked.physicsImpostor === undefined) || (this.meshPicked.physicsImpostor === null)) {
                            this.meshPickedPhyParms = null;
                        }
                        else {
                            this.meshPickedPhyParms = new PhysicsParm();
                            this.meshPickedPhyParms.type = this.meshPicked.physicsImpostor.type;
                            this.meshPickedPhyParms.mass = this.meshPicked.physicsImpostor.getParam("mass");
                            this.meshPickedPhyParms.friction = this.meshPicked.physicsImpostor.getParam("friction");
                            this.meshPickedPhyParms.restitution = this.meshPicked.physicsImpostor.getParam("restitution");
                            this.meshPicked.physicsImpostor.dispose();
                            this.meshPicked.physicsImpostor = null;
                        }
                    };
                    Vishva.prototype.restorePhyParms = function () {
                        //reset any physics test which might have been done
                        this.resetPhysics();
                        if (this.meshPickedPhyParms != null) {
                            this.meshPicked.physicsImpostor = new PhysicsImpostor(this.meshPicked, this.meshPickedPhyParms.type);
                            this.meshPicked.physicsImpostor.setParam("mass", this.meshPickedPhyParms.mass);
                            this.meshPicked.physicsImpostor.setParam("friction", this.meshPickedPhyParms.friction);
                            this.meshPicked.physicsImpostor.setParam("restitution", this.meshPickedPhyParms.restitution);
                            this.meshPickedPhyParms = null;
                        }
                    };
                    Vishva.prototype.testPhysics = function (phyParm) {
                        this.resetPhysics();
                        this.didPhysTest = true;
                        this.savePos = this.meshPicked.position.clone();
                        this.saveRot = this.meshPicked.rotationQuaternion.clone();
                        this.meshPicked.physicsImpostor = new PhysicsImpostor(this.meshPicked, phyParm.type);
                        this.meshPicked.physicsImpostor.setParam("mass", phyParm.mass);
                        this.meshPicked.physicsImpostor.setParam("friction", phyParm.friction);
                        this.meshPicked.physicsImpostor.setParam("restitution", phyParm.restitution);
                    };
                    Vishva.prototype.resetPhysics = function () {
                        if (this.didPhysTest) {
                            this.didPhysTest = false;
                            this.meshPicked.position.copyFrom(this.savePos);
                            this.meshPicked.rotationQuaternion.copyFrom(this.saveRot);
                            this.meshPicked.physicsImpostor.dispose();
                            this.meshPicked.physicsImpostor = null;
                        }
                    };
                    //MATERIAL
                    Vishva.prototype.setMeshVisibility = function (vis) {
                        this.meshPicked.visibility = vis;
                    };
                    Vishva.prototype.getMeshVisibility = function () {
                        return this.meshPicked.visibility;
                    };
                    Vishva.prototype.setMeshColor = function (colType, hex) {
                        var sm = this.meshPicked.material;
                        var col = Color3.FromHexString(hex);
                        if (colType === "diffuse")
                            sm.diffuseColor = col;
                        else if (colType === "emissive")
                            sm.emissiveColor = col;
                        else if (colType === "specular")
                            sm.specularColor = col;
                        else if (colType === "ambient")
                            sm.ambientColor = col;
                        else {
                            console.error("invalid color type [" + colType + "]");
                        }
                    };
                    Vishva.prototype.getMeshColor = function (colType) {
                        var sm = this.meshPicked.material;
                        if (colType === "diffuse")
                            return sm.diffuseColor.toHexString();
                        else if (colType === "emissive")
                            return sm.emissiveColor.toHexString();
                        else if (colType === "specular")
                            return sm.specularColor.toHexString();
                        else if (colType === "ambient")
                            return sm.ambientColor.toHexString();
                        else {
                            console.error("invalid color type [" + colType + "]");
                            return null;
                        }
                    };
                    //
                    // LIGHTS
                    /*
                     * Checks if the selected Mesh has any lights attached
                     * if yes then returns that light
                     * else return null
                     */
                    Vishva.prototype.getAttachedLight = function () {
                        var childs = this.meshPicked.getDescendants();
                        if (childs.length === 0)
                            return null;
                        var light = null;
                        for (var _i = 0, childs_1 = childs; _i < childs_1.length; _i++) {
                            var child = childs_1[_i];
                            if (child instanceof Light) {
                                light = child;
                                break;
                            }
                        }
                        if (light === null)
                            return null;
                        var lightParm = new LightParm();
                        lightParm.diffuse = light.diffuse;
                        lightParm.specular = light.specular;
                        lightParm.range = light.range;
                        lightParm.radius = light.radius;
                        lightParm.intensity = light.intensity;
                        if (light instanceof BABYLON.SpotLight) {
                            lightParm.type = "Spot";
                            lightParm.angle = light.angle;
                            lightParm.exponent = light.exponent;
                        }
                        if (light instanceof BABYLON.PointLight) {
                            lightParm.type = "Point";
                        }
                        if (light instanceof BABYLON.DirectionalLight) {
                            lightParm.type = "Dir";
                        }
                        if (light instanceof BABYLON.HemisphericLight) {
                            lightParm.type = "Hemi";
                            lightParm.direction = light.direction;
                            lightParm.gndClr = light.groundColor;
                        }
                        return lightParm;
                    };
                    Vishva.prototype.attachAlight = function (lightParm) {
                        this.detachLight();
                        var light = null;
                        var name = this.meshPicked.name + "-light";
                        if (lightParm.type === "Spot") {
                            light = new BABYLON.SpotLight(name, Vector3.Zero(), new Vector3(0, -1, 0), lightParm.angle * Math.PI / 180, lightParm.exponent, this.scene);
                        }
                        else if (lightParm.type === "Point") {
                            light = new BABYLON.PointLight(name, Vector3.Zero(), this.scene);
                        }
                        else if (lightParm.type === "Dir") {
                            light = new BABYLON.DirectionalLight(name, new Vector3(0, -1, 0), this.scene);
                        }
                        else if (lightParm.type === "Hemi") {
                            light = new BABYLON.HemisphericLight(name, lightParm.direction, this.scene);
                            light.groundColor = lightParm.gndClr;
                        }
                        if (light !== null) {
                            light.diffuse = lightParm.diffuse;
                            light.specular = lightParm.specular;
                            light.range = lightParm.range;
                            light.radius = lightParm.radius;
                            light.intensity = lightParm.intensity;
                            light.parent = this.meshPicked;
                        }
                    };
                    Vishva.prototype.detachLight = function () {
                        var childs = this.meshPicked.getDescendants();
                        if (childs.length === 0)
                            return;
                        var light = null;
                        for (var _i = 0, childs_2 = childs; _i < childs_2.length; _i++) {
                            var child = childs_2[_i];
                            if (child instanceof Light) {
                                light = child;
                                break;
                            }
                        }
                        if (light === null)
                            return;
                        light.parent = null;
                        light.dispose();
                    };
                    Vishva.prototype.setTransOn = function () {
                        //if scaling is on then we might have changed space to local            
                        //restore space to what is was before scaling
                        //            if (this.editControl.isScalingEnabled()) {
                        //                this.setSpaceLocal(this.wasSpaceLocal);
                        //            }
                        this.editControl.setLocal(!this.spaceWorld);
                        this.editControl.enableTranslation();
                    };
                    Vishva.prototype.isTransOn = function () {
                        return this.editControl.isTranslationEnabled();
                    };
                    Vishva.prototype.setRotOn = function () {
                        //if scaling is on then we might have changed space to local            
                        //restore space to what is was before scaling
                        //            if (this.editControl.isScalingEnabled()) {
                        //                this.setSpaceLocal(this.wasSpaceLocal);
                        //            }
                        this.editControl.setLocal(!this.spaceWorld);
                        this.editControl.enableRotation();
                    };
                    Vishva.prototype.isRotOn = function () {
                        return this.editControl.isRotationEnabled();
                    };
                    //wasSpaceLocal: boolean;
                    Vishva.prototype.setScaleOn = function () {
                        //make space local for scaling
                        //remember what the space was so we can restore it back later on
                        //            if (!this.isSpaceLocal()) {
                        //                this.setSpaceLocal(true);
                        //                this.wasSpaceLocal = false;
                        //            } else {
                        //                this.wasSpaceLocal = true;
                        //            }
                        this.editControl.setLocal(true);
                        this.editControl.enableScaling();
                    };
                    Vishva.prototype.isScaleOn = function () {
                        return this.editControl.isScalingEnabled();
                    };
                    Vishva.prototype.setFocusOnMesh = function () {
                        if (this.isFocusOnAv) {
                            this.cc.stop();
                            this.saveAVcameraPos.copyFrom(this.mainCamera.position);
                            this.isFocusOnAv = false;
                        }
                        this.focusOnMesh(this.meshPicked, 25);
                    };
                    Vishva.prototype.setSpace = function (space) {
                        console.log("setSPace parm " + space);
                        if (this.snapperOn) {
                            return "Cannot switch space when snapper is on";
                        }
                        if (space === "local") {
                            this.setSpaceLocal(true);
                        }
                        else {
                            this.setSpaceLocal(false);
                        }
                        return null;
                    };
                    Vishva.prototype.getSpace = function () {
                        if (this.isSpaceLocal())
                            return "local";
                        else
                            return "world";
                    };
                    Vishva.prototype.setSpaceLocal = function (yes) {
                        if ((this.editControl != null) && (!this.editControl.isScalingEnabled()))
                            this.editControl.setLocal(yes);
                        this.spaceWorld = !yes;
                        return null;
                    };
                    Vishva.prototype.isSpaceLocal = function () {
                        //if (this.editControl != null) return this.editControl.isLocal(); else return true;
                        return !this.spaceWorld;
                    };
                    Vishva.prototype.undo = function () {
                        if (this.editControl != null)
                            this.editControl.undo();
                        return;
                    };
                    Vishva.prototype.redo = function () {
                        if (this.editControl != null)
                            this.editControl.redo();
                        return;
                    };
                    Vishva.prototype.snapTrans = function (yes) {
                        if (this.snapperOn) {
                            return "Cannot change snapping mode when snapper is on";
                        }
                        this.snapTransOn = yes;
                        if (this.editControl != null) {
                            if (!this.snapTransOn) {
                                this.editControl.setTransSnap(false);
                            }
                            else {
                                this.editControl.setTransSnap(true);
                                this.editControl.setTransSnapValue(this.snapTransValue);
                            }
                        }
                        return;
                    };
                    Vishva.prototype.isSnapTransOn = function () {
                        return this.snapTransOn;
                    };
                    Vishva.prototype.setSnapTransValue = function (val) {
                        this.editControl.setTransSnapValue(val);
                    };
                    Vishva.prototype.snapRot = function (yes) {
                        if (this.snapperOn) {
                            return "Cannot change snapping mode when snapper is on";
                        }
                        this.snapRotOn = yes;
                        if (this.editControl != null) {
                            if (!this.snapRotOn) {
                                this.editControl.setRotSnap(false);
                            }
                            else {
                                this.editControl.setRotSnap(true);
                                this.editControl.setRotSnapValue(this.snapRotValue);
                            }
                        }
                        return;
                    };
                    Vishva.prototype.isSnapRotOn = function () {
                        return this.snapRotOn;
                    };
                    Vishva.prototype.setSnapRotValue = function (val) {
                        var inrad = val * Math.PI / 180;
                        this.editControl.setRotSnapValue(inrad);
                    };
                    Vishva.prototype.isSnapScaleOn = function () {
                        return this.snapScaleOn;
                    };
                    Vishva.prototype.setSnapScaleValue = function (val) {
                        this.editControl.setScaleSnapValue(val);
                    };
                    Vishva.prototype.snapScale = function (yes) {
                        if (this.snapperOn) {
                            return "Cannot change snapping mode when snapper is on";
                        }
                        this.snapScaleOn = yes;
                        if (this.editControl != null) {
                            if (!this.snapScaleOn) {
                                this.editControl.setScaleSnap(false);
                            }
                            else {
                                this.editControl.setScaleSnap(true);
                                this.editControl.setScaleSnapValue(this.snapScaleValue);
                            }
                        }
                        return;
                    };
                    Vishva.prototype.snapper = function (yes) {
                        if (!this.spaceWorld && yes) {
                            this.spaceWorld = true;
                            //                this.wasSpaceLocal = false;
                        }
                        this.snapperOn = yes;
                        //if edit control is already up then lets switch snaps on
                        if (this.editControl != null) {
                            if (this.snapperOn) {
                                this.setSnapperOn();
                            }
                            else {
                                this.setSnapperOff();
                            }
                        }
                        return;
                    };
                    Vishva.prototype.setSnapperOn = function () {
                        this.editControl.setRotSnap(true);
                        this.editControl.setTransSnap(true);
                        this.editControl.setScaleSnap(true);
                        this.editControl.setRotSnapValue(this.snapRotValue);
                        this.editControl.setTransSnapValue(this.snapTransValue);
                        this.editControl.setScaleSnapValue(this.snapScaleValue);
                        this.snapToGlobal();
                    };
                    Vishva.prototype.setSnapperOff = function () {
                        this.editControl.setRotSnap(false);
                        this.editControl.setTransSnap(false);
                        this.editControl.setScaleSnap(false);
                    };
                    Vishva.prototype.isSnapperOn = function () {
                        return this.snapperOn;
                    };
                    Vishva.prototype.snapToGlobal = function () {
                        if (this.isMeshSelected) {
                            var tx = Math.round(this.meshPicked.position.x / this.snapTransValue) * this.snapTransValue;
                            var ty = Math.round(this.meshPicked.position.y / this.snapTransValue) * this.snapTransValue;
                            var tz = Math.round(this.meshPicked.position.z / this.snapTransValue) * this.snapTransValue;
                            this.meshPicked.position = new Vector3(tx, ty, tz);
                            var eulerRotation = this.meshPicked.rotationQuaternion.toEulerAngles();
                            var rx = Math.round(eulerRotation.x / this.snapRotValue) * this.snapRotValue;
                            var ry = Math.round(eulerRotation.y / this.snapRotValue) * this.snapRotValue;
                            var rz = Math.round(eulerRotation.z / this.snapRotValue) * this.snapRotValue;
                            this.meshPicked.rotationQuaternion = Quaternion.RotationYawPitchRoll(ry, rx, rz);
                        }
                    };
                    Vishva.prototype.getSoundFiles = function () {
                        return this.assets["sounds"];
                    };
                    Vishva.prototype.anyMeshSelected = function () {
                        return this.isMeshSelected;
                    };
                    Vishva.prototype.getName = function () {
                        return this.meshPicked.name;
                    };
                    Vishva.prototype.setName = function (name) {
                        this.meshPicked.name = name;
                    };
                    Vishva.prototype.getLocation = function () {
                        return this.meshPicked.position;
                    };
                    Vishva.prototype.getRotation = function () {
                        var euler = this.meshPicked.rotationQuaternion.toEulerAngles();
                        var r = 180 / Math.PI;
                        var degrees = euler.multiplyByFloats(r, r, r);
                        return degrees;
                    };
                    Vishva.prototype.getScale = function () {
                        return this.meshPicked.scaling;
                    };
                    Vishva.prototype.bakeTransforms = function () {
                        var savePos = this.meshPicked.position.clone();
                        this.meshPicked.position.copyFromFloats(0, 0, 0);
                        this.meshPicked.bakeCurrentTransformIntoVertices();
                        this.meshPicked.position = savePos;
                        this.meshPicked.computeWorldMatrix(true);
                    };
                    // ANIMATIONS
                    Vishva.prototype.getSkelName = function () {
                        if (this.meshPicked.skeleton == null)
                            return null;
                        else
                            return this.meshPicked.skeleton.name;
                    };
                    Vishva.prototype.getSkeleton = function () {
                        if (this.meshPicked.skeleton == null)
                            return null;
                        else
                            return this.meshPicked.skeleton;
                    };
                    Vishva.prototype.toggleSkelView = function () {
                        if (this.meshPicked.skeleton == null)
                            return;
                        var sv = this.findSkelViewer(this.skelViewerArr, this.meshPicked);
                        if (sv === null) {
                            sv = new SkeletonViewer(this.meshPicked.skeleton, this.meshPicked, this.scene);
                            sv.isEnabled = true;
                            this.skelViewerArr.push(sv);
                        }
                        else {
                            this.delSkelViewer(this.skelViewerArr, sv);
                            sv.dispose();
                            sv = null;
                        }
                    };
                    Vishva.prototype.findSkelViewer = function (sva, mesh) {
                        for (var _i = 0, sva_1 = sva; _i < sva_1.length; _i++) {
                            var sv = sva_1[_i];
                            if (sv.mesh === mesh)
                                return sv;
                        }
                        return null;
                    };
                    Vishva.prototype.delSkelViewer = function (sva, sv) {
                        var i = sva.indexOf(sv);
                        if (i >= 0)
                            sva.splice(i, 1);
                    };
                    Vishva.prototype.animRest = function () {
                        if (this.meshPicked.skeleton == null)
                            return;
                        this.scene.stopAnimation(this.meshPicked.skeleton);
                        this.meshPicked.skeleton.returnToRest();
                    };
                    Vishva.prototype.createAnimRange = function (name, start, end) {
                        //remove the range if it already exist
                        this.meshPicked.skeleton.deleteAnimationRange(name, false);
                        this.meshPicked.skeleton.createAnimationRange(name, start, end);
                    };
                    Vishva.prototype.getAnimationRanges = function () {
                        var skel = this.meshPicked.skeleton;
                        if (skel !== null) {
                            var ranges = skel.getAnimationRanges();
                            return ranges;
                        }
                        else
                            return null;
                    };
                    Vishva.prototype.printAnimCount = function (skel) {
                        var bones = skel.bones;
                        for (var index126 = 0; index126 < bones.length; index126++) {
                            var bone = bones[index126];
                            {
                                console.log(bone.name + "," + bone.animations.length + " , " + bone.animations[0].getHighestFrame());
                                console.log(bone.animations[0]);
                            }
                        }
                    };
                    Vishva.prototype.playAnimation = function (animName, animRate, loop) {
                        var skel = this.meshPicked.skeleton;
                        if (skel == null)
                            return;
                        var r = parseFloat(animRate);
                        if (isNaN(r))
                            r = 1;
                        skel.beginAnimation(animName, loop, r);
                    };
                    Vishva.prototype.stopAnimation = function () {
                        if (this.meshPicked.skeleton == null)
                            return;
                        this.scene.stopAnimation(this.meshPicked.skeleton);
                    };
                    Vishva.prototype.getSensorList = function () {
                        return vishva.SNAManager.getSNAManager().getSensorList();
                    };
                    Vishva.prototype.getActuatorList = function () {
                        return vishva.SNAManager.getSNAManager().getActuatorList();
                    };
                    Vishva.prototype.getSensorParms = function (sensor) {
                        return vishva.SNAManager.getSNAManager().getSensorParms(sensor);
                    };
                    Vishva.prototype.getActuatorParms = function (actuator) {
                        return vishva.SNAManager.getSNAManager().getActuatorParms(actuator);
                    };
                    Vishva.prototype.getSensors = function () {
                        if (!this.isMeshSelected) {
                            return null;
                        }
                        var sens = this.meshPicked["sensors"];
                        if (sens == null)
                            sens = new Array();
                        return sens;
                    };
                    Vishva.prototype.getActuators = function () {
                        if (!this.isMeshSelected) {
                            return null;
                        }
                        var acts = this.meshPicked["actuators"];
                        if (acts == null)
                            acts = new Array();
                        return acts;
                    };
                    Vishva.prototype.addSensorbyName = function (sensName) {
                        if (!this.isMeshSelected) {
                            return null;
                        }
                        return vishva.SNAManager.getSNAManager().createSensorByName(sensName, this.meshPicked, null);
                    };
                    Vishva.prototype.addActuaorByName = function (actName) {
                        if (!this.isMeshSelected) {
                            return null;
                        }
                        return vishva.SNAManager.getSNAManager().createActuatorByName(actName, this.meshPicked, null);
                    };
                    Vishva.prototype.add_sensor = function (sensName, prop) {
                        if (!this.isMeshSelected) {
                            return "no mesh selected";
                        }
                        if (sensName === "Touch") {
                            var st = new vishva.SensorTouch(this.meshPicked, prop);
                        }
                        else
                            return "No such sensor";
                        return null;
                    };
                    Vishva.prototype.addActuator = function (actName, parms) {
                        if (!this.isMeshSelected) {
                            return "no mesh selected";
                        }
                        var act;
                        if (actName === "Rotator") {
                            act = new vishva.ActuatorRotator(this.meshPicked, parms);
                        }
                        else if (actName === "Mover") {
                            act = new vishva.ActuatorMover(this.meshPicked, parms);
                        }
                        else
                            return "No such actuator";
                        return null;
                    };
                    Vishva.prototype.removeSensor = function (index) {
                        if (!this.isMeshSelected) {
                            return "no mesh selected";
                        }
                        var sensors = this.meshPicked["sensors"];
                        if (sensors != null) {
                            var sens = sensors[index];
                            if (sens != null) {
                                sens.dispose();
                            }
                            else
                                return "no sensor found";
                        }
                        else
                            return "no sensor found";
                        return null;
                    };
                    Vishva.prototype.removeActuator = function (index) {
                        if (!this.isMeshSelected) {
                            return "no mesh selected";
                        }
                        var actuators = this.meshPicked["actuators"];
                        if (actuators != null) {
                            var act = actuators[index];
                            if (act != null) {
                                act.dispose();
                            }
                            else
                                return "no actuator found";
                        }
                        else
                            return "no actuator found";
                        return null;
                    };
                    Vishva.prototype.removeSensorActuator = function (sa) {
                        sa.dispose();
                    };
                    Vishva.prototype.setSunPos = function (d) {
                        var r = Math.PI * (180 - d) / 180;
                        var x = -Math.cos(r);
                        var y = -Math.sin(r);
                        this.sunDR.direction = new Vector3(x, y, 0);
                    };
                    Vishva.prototype.getSunPos = function () {
                        var sunDir = this.sunDR.direction;
                        var x = sunDir.x;
                        var y = sunDir.y;
                        var l = Math.sqrt(x * x + y * y);
                        var d = Math.acos(x / l);
                        return d * 180 / Math.PI;
                    };
                    Vishva.prototype.setLight = function (d) {
                        this.sun.intensity = d;
                        this.sunDR.intensity = d;
                    };
                    Vishva.prototype.getLight = function () {
                        return this.sun.intensity;
                    };
                    Vishva.prototype.setShade = function (dO) {
                        var d = dO;
                        d = 1 - d;
                        this.sun.groundColor = new Color3(d, d, d);
                    };
                    Vishva.prototype.getShade = function () {
                        return (1 - this.sun.groundColor.r);
                    };
                    Vishva.prototype.setFog = function (d) {
                        this.scene.fogDensity = d;
                    };
                    Vishva.prototype.getFog = function () {
                        return this.scene.fogDensity;
                    };
                    Vishva.prototype.setFov = function (dO) {
                        var d = dO;
                        this.mainCamera.fov = (d * 3.14 / 180);
                    };
                    Vishva.prototype.getFov = function () {
                        return this.mainCamera.fov * 180 / 3.14;
                    };
                    Vishva.prototype.setSky = function (sky) {
                        var mat = this.skybox.material;
                        mat.reflectionTexture.dispose();
                        var skyFile = "vishva/assets/skyboxes/" + sky + "/" + sky;
                        mat.reflectionTexture = new CubeTexture(skyFile, this.scene);
                        mat.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
                    };
                    Vishva.prototype.getSky = function () {
                        var mat = this.skybox.material;
                        var skyname = mat.reflectionTexture.name;
                        var i = skyname.lastIndexOf("/");
                        return skyname.substring(i + 1);
                    };
                    Vishva.prototype.setGroundColor_old = function (gcolor) {
                        var ground_color = gcolor;
                        var r = ground_color[0] / 255;
                        var g = ground_color[1] / 255;
                        var b = ground_color[2] / 255;
                        var color = new Color3(r, g, b);
                        var gmat = this.ground.material;
                        gmat.diffuseColor = color;
                    };
                    Vishva.prototype.setGroundColor = function (hex) {
                        var sm = this.ground.material;
                        sm.diffuseColor = Color3.FromHexString(hex);
                    };
                    Vishva.prototype.getGroundColor = function () {
                        var sm = this.ground.material;
                        return sm.diffuseColor.toHexString();
                    };
                    Vishva.prototype.getGroundColor_old = function () {
                        var ground_color = new Array(3);
                        var gmat = this.ground.material;
                        if (gmat.diffuseColor != null) {
                            ground_color[0] = (gmat.diffuseColor.r * 255);
                            ground_color[1] = (gmat.diffuseColor.g * 255);
                            ground_color[2] = (gmat.diffuseColor.b * 255);
                            return ground_color;
                        }
                        else {
                            return null;
                        }
                    };
                    Vishva.prototype.toggleDebug = function () {
                        //if (this.scene.debugLayer.isVisible()) {
                        if (this.debugVisible) {
                            this.scene.debugLayer.hide();
                        }
                        else {
                            this.scene.debugLayer.show();
                        }
                        this.debugVisible = !this.debugVisible;
                    };
                    Vishva.prototype.saveAsset = function () {
                        if (!this.isMeshSelected) {
                            return null;
                        }
                        //this.renameWorldTextures();
                        var clone = this.meshPicked.clone(this.meshPicked.name, null);
                        clone.position = Vector3.Zero();
                        clone.rotation = Vector3.Zero();
                        var meshObj = SceneSerializer.SerializeMesh(clone, false);
                        clone.dispose();
                        var meshString = JSON.stringify(meshObj);
                        var file = new File([meshString], "AssetFile.babylon");
                        return URL.createObjectURL(file);
                    };
                    Vishva.prototype.saveWorld = function () {
                        if (this.editControl != null) {
                            alert("cannot save during edit");
                            return null;
                        }
                        this.removeInstancesFromShadow();
                        this.renameMeshIds();
                        this.cleanupSkels();
                        this.resetSkels(this.scene);
                        this.cleanupMats();
                        this.renameWorldTextures();
                        var vishvaSerialzed = new vishva.VishvaSerialized();
                        vishvaSerialzed.settings.cameraCollision = this.cameraCollision;
                        vishvaSerialzed.settings.autoEditMenu = this.autoEditMenu;
                        vishvaSerialzed.guiSettings = this.vishvaGUI.getSettings();
                        vishvaSerialzed.misc.activeCameraTarget = this.mainCamera.target;
                        //serialize sna first
                        //we might add tags to meshes in scene during sna serialize.
                        //if we serialize scene before we would miss those
                        //var snaObj: Object = SNAManager.getSNAManager().serializeSnAs(this.scene);
                        vishvaSerialzed.snas = vishva.SNAManager.getSNAManager().serializeSnAs(this.scene);
                        var sceneObj = SceneSerializer.Serialize(this.scene);
                        this.changeSoundUrl(sceneObj);
                        //sceneObj["VishvaSNA"] = snaObj;
                        sceneObj["VishvaSerialized"] = vishvaSerialzed;
                        var sceneString = JSON.stringify(sceneObj);
                        var file = new File([sceneString], "WorldFile.babylon");
                        this.addInstancesToShadow();
                        return URL.createObjectURL(file);
                    };
                    Vishva.prototype.removeInstancesFromShadow = function () {
                        var meshes = this.scene.meshes;
                        for (var index127 = 0; index127 < meshes.length; index127++) {
                            var mesh = meshes[index127];
                            {
                                if (mesh != null && mesh instanceof BABYLON.InstancedMesh) {
                                    var shadowMeshes = this.shadowGenerator.getShadowMap().renderList;
                                    var i = shadowMeshes.indexOf(mesh);
                                    if (i >= 0) {
                                        shadowMeshes.splice(i, 1);
                                    }
                                }
                            }
                        }
                    };
                    Vishva.prototype.addInstancesToShadow = function () {
                        for (var index128 = 0; index128 < this.scene.meshes.length; index128++) {
                            var mesh = this.scene.meshes[index128];
                            {
                                if (mesh != null && mesh instanceof BABYLON.InstancedMesh) {
                                    //TODO think
                                    //mesh.receiveShadows = true;
                                    (this.shadowGenerator.getShadowMap().renderList).push(mesh);
                                }
                            }
                        }
                    };
                    /**
                     *
                     * assign unique id to each mesh. serialization uses mesh id to add mesh to
                     * the shadowgenerator renderlist if two or more mesh have same id then
                     * during desrialization only one mesh gets added to the renderlist
                     *
                     */
                    Vishva.prototype.renameMeshIds = function () {
                        var i = 0;
                        for (var index129 = 0; index129 < this.scene.meshes.length; index129++) {
                            var mesh = this.scene.meshes[index129];
                            {
                                mesh.id = new Number(i).toString();
                                i++;
                            }
                        }
                    };
                    /**
                     * resets each skel a assign. unique id to each skeleton. deserialization uses
                     * skeleton id to associate skel with mesh. if id isn't unique wrong skels
                     * could get assigned to a mesh.
                     *
                     * @param scene
                     */
                    Vishva.prototype.resetSkels = function (scene) {
                        var i = 0;
                        for (var index130 = 0; index130 < scene.skeletons.length; index130++) {
                            var skel = scene.skeletons[index130];
                            {
                                skel.id = new Number(i).toString();
                                i++;
                                skel.returnToRest();
                            }
                        }
                    };
                    Vishva.prototype.renameWorldTextures = function () {
                        var mats = this.scene.materials;
                        this.renameWorldMaterials(mats);
                        var mms = this.scene.multiMaterials;
                        for (var index131 = 0; index131 < mms.length; index131++) {
                            var mm = mms[index131];
                            {
                                this.renameWorldMaterials(mm.subMaterials);
                            }
                        }
                    };
                    Vishva.prototype.renameWorldMaterials = function (mats) {
                        var sm;
                        for (var index132 = 0; index132 < mats.length; index132++) {
                            var mat = mats[index132];
                            {
                                if (mat != null && mat instanceof BABYLON.StandardMaterial) {
                                    sm = mat;
                                    this.rename(sm.diffuseTexture);
                                    this.rename(sm.reflectionTexture);
                                    this.rename(sm.opacityTexture);
                                    this.rename(sm.specularTexture);
                                    this.rename(sm.bumpTexture);
                                }
                            }
                        }
                    };
                    Vishva.prototype.rename = function (bt) {
                        if (bt == null)
                            return;
                        if (bt.name.substring(0, 2) !== "..") {
                            bt.name = this.RELATIVE_ASSET_LOCATION + bt.name;
                        }
                    };
                    /*
                     * since 2.5, June 17 2016  sound is being serialized.
                     *
                     * (see src/Audio/babylon.sound.js
                     * changes at
                     * https://github.com/BabylonJS/Babylon.js/commit/6ba058aec5ffaceb8aef3abecdb95df4b95ac2ac)
                     *
                     * the url property only has the file name not path.
                     * we need to add the full path
                     *
                     */
                    Vishva.prototype.changeSoundUrl = function (sceneObj) {
                        var sounds = sceneObj["sounds"];
                        if (sounds != null) {
                            var soundList = sounds;
                            for (var _i = 0, soundList_1 = soundList; _i < soundList_1.length; _i++) {
                                var sound = soundList_1[_i];
                                sound["url"] = this.RELATIVE_ASSET_LOCATION + this.SOUND_ASSET_LOCATION + sound["url"];
                            }
                            //sceneObj["sounds"] = soundList;
                        }
                    };
                    /**
                     * remove all materials not referenced by any mesh
                     *
                     */
                    Vishva.prototype.cleanupMats = function () {
                        var meshes = this.scene.meshes;
                        var mats = new Array();
                        var mms = new Array();
                        for (var index133 = 0; index133 < meshes.length; index133++) {
                            var mesh = meshes[index133];
                            {
                                if (mesh.material != null) {
                                    if (mesh.material != null && mesh.material instanceof BABYLON.MultiMaterial) {
                                        var mm = mesh.material;
                                        mms.push(mm);
                                        var ms = mm.subMaterials;
                                        for (var index134 = 0; index134 < ms.length; index134++) {
                                            var mat = ms[index134];
                                            {
                                                mats.push(mat);
                                            }
                                        }
                                    }
                                    else {
                                        mats.push(mesh.material);
                                    }
                                }
                            }
                        }
                        var allMats = this.scene.materials;
                        var l = allMats.length;
                        for (var i = l - 1; i >= 0; i--) {
                            if (mats.indexOf(allMats[(i | 0)]) === -1) {
                                allMats[(i | 0)].dispose();
                            }
                        }
                        var allMms = this.scene.multiMaterials;
                        l = allMms.length;
                        for (var i = l - 1; i >= 0; i--) {
                            if (mms.indexOf(allMms[(i | 0)]) === -1) {
                                allMms[(i | 0)].dispose();
                            }
                        }
                    };
                    /**
                     * remove all skeletons not referenced by any mesh
                     *
                     */
                    Vishva.prototype.cleanupSkels = function () {
                        var meshes = this.scene.meshes;
                        var skels = new Array();
                        for (var index135 = 0; index135 < meshes.length; index135++) {
                            var mesh = meshes[index135];
                            {
                                if (mesh.skeleton != null) {
                                    skels.push(mesh.skeleton);
                                }
                            }
                        }
                        var allSkels = this.scene.skeletons;
                        var l = allSkels.length;
                        for (var i = l - 1; i >= 0; i--) {
                            if (skels.indexOf(allSkels[(i | 0)]) === -1) {
                                allSkels[(i | 0)].dispose();
                            }
                        }
                    };
                    Vishva.prototype.loadAssetFile = function (file) {
                        var _this = this;
                        var sceneFolderName = file.name.split(".")[0];
                        SceneLoader.ImportMesh("", "vishva/assets/" + sceneFolderName + "/", file.name, this.scene, function (meshes, particleSystems, skeletons) { return _this.onMeshLoaded(meshes, particleSystems, skeletons); });
                    };
                    Vishva.prototype.loadAsset = function (assetType, file) {
                        var _this = this;
                        this.assetType = assetType;
                        this.file = file;
                        SceneLoader.ImportMesh("", "vishva/assets/" + assetType + "/" + file + "/", file + ".babylon", this.scene, function (meshes, particleSystems, skeletons) { return _this.onMeshLoaded(meshes, particleSystems, skeletons); });
                    };
                    //TODO if mesh created using Blender (check producer == Blender, find all skeleton animations and increment from frame  by 1
                    Vishva.prototype.onMeshLoaded = function (meshes, particleSystems, skeletons) {
                        var boundingRadius = this.getBoundingRadius(meshes);
                        {
                            var array137 = meshes;
                            for (var index136 = 0; index136 < array137.length; index136++) {
                                var mesh = array137[index136];
                                {
                                    mesh.isPickable = true;
                                    mesh.checkCollisions = true;
                                    var placementLocal = new Vector3(0, 0, -(boundingRadius + 2));
                                    var placementGlobal = Vector3.TransformCoordinates(placementLocal, this.avatar.getWorldMatrix());
                                    mesh.position.addInPlace(placementGlobal);
                                    (this.shadowGenerator.getShadowMap().renderList).push(mesh);
                                    //TODO think
                                    //mesh.receiveShadows = true;
                                    if (mesh.material != null && mesh.material instanceof BABYLON.MultiMaterial) {
                                        var mm = mesh.material;
                                        var mats = mm.subMaterials;
                                        for (var index138 = 0; index138 < mats.length; index138++) {
                                            var mat = mats[index138];
                                            {
                                                mesh.material.backFaceCulling = false;
                                                mesh.material.alpha = 1;
                                                if (mat != null && mat instanceof BABYLON.StandardMaterial) {
                                                    this.renameAssetTextures(mat);
                                                }
                                            }
                                        }
                                    }
                                    else {
                                        mesh.material.backFaceCulling = false;
                                        mesh.material.alpha = 1;
                                        var sm = mesh.material;
                                        this.renameAssetTextures(sm);
                                    }
                                    if (mesh.skeleton != null) {
                                        this.fixAnimationRanges(mesh.skeleton);
                                    }
                                }
                            }
                        }
                    };
                    Vishva.prototype.renameAssetTextures = function (sm) {
                        this.renameAssetTexture(sm.diffuseTexture);
                        this.renameAssetTexture(sm.reflectionTexture);
                        this.renameAssetTexture(sm.opacityTexture);
                        this.renameAssetTexture(sm.specularTexture);
                        this.renameAssetTexture(sm.bumpTexture);
                    };
                    Vishva.prototype.renameAssetTexture = function (bt) {
                        if (bt == null)
                            return;
                        var textureName = bt.name;
                        if (textureName.indexOf("vishva/") !== 0 && textureName.indexOf("../") !== 0) {
                            bt.name = "vishva/assets/" + this.assetType + "/" + this.file + "/" + textureName;
                        }
                    };
                    /**
                     * finds the bounding sphere radius for a set of meshes. for each mesh gets
                     * bounding radius from the local center. this is the bounding world radius
                     * for that mesh plus the distance from the local center. takes the maximum
                     * of these
                     *
                     * @param meshes
                     * @return
                     */
                    Vishva.prototype.getBoundingRadius = function (meshes) {
                        var maxRadius = 0;
                        for (var index139 = 0; index139 < meshes.length; index139++) {
                            var mesh = meshes[index139];
                            {
                                var bi = mesh.getBoundingInfo();
                                var r = bi.boundingSphere.radiusWorld + mesh.position.length();
                                if (maxRadius < r)
                                    maxRadius = r;
                            }
                        }
                        return maxRadius;
                    };
                    Vishva.prototype.loadWorldFile = function (file) {
                        var _this = this;
                        this.sceneFolderName = file.name.split(".")[0];
                        var fr = new FileReader();
                        fr.onload = function (e) { return _this.onSceneFileRead(e); };
                        fr.readAsText(file);
                    };
                    Vishva.prototype.onSceneFileRead = function (e) {
                        var _this = this;
                        this.sceneData = "data:" + e.target.result;
                        this.engine.stopRenderLoop();
                        this.scene.onDispose = function () { return _this.onSceneDispose(); };
                        this.scene.dispose();
                        return null;
                    };
                    Vishva.prototype.onSceneDispose = function () {
                        var _this = this;
                        this.scene = null;
                        this.avatarSkeleton = null;
                        this.avatar = null;
                        //TODO Charcter Controller check implication
                        // this.prevAnim = null; 
                        SceneLoader.Load("worlds/" + this.sceneFolderName + "/", this.sceneData, this.engine, function (scene) { return _this.onSceneLoaded(scene); });
                    };
                    Vishva.prototype.createWater = function () {
                        var waterMesh = Mesh.CreateGround("waterMesh", 512, 512, 32, this.scene, false);
                        //waterMesh.position.y = 0;
                        var water = new WaterMaterial("water", this.scene);
                        water.bumpTexture = new Texture(this.waterTexture, this.scene);
                        //repoint the path, so that we can reload this if it is saved in scene 
                        water.bumpTexture.name = this.RELATIVE_ASSET_LOCATION + water.bumpTexture.name;
                        //wavy
                        //            water.windForce = -5;
                        //            water.waveHeight = 0.5;
                        //            water.waterColor = new Color3(0.1, 0.1, 0.6);
                        //            water.colorBlendFactor = 0;
                        //            water.bumpHeight = 0.1;
                        //            water.waveLength = 0.1;
                        //calm
                        water.windForce = -5;
                        water.waveHeight = 0.02;
                        water.bumpHeight = 0.05;
                        water.waterColor = new Color3(0.047, 0.23, 0.015);
                        water.colorBlendFactor = 0.5;
                        water.addToRenderList(this.skybox);
                        water.addToRenderList(this.ground);
                        waterMesh.material = water;
                    };
                    Vishva.prototype.addWater = function () {
                        if (!this.isMeshSelected) {
                            return "no mesh selected";
                        }
                        var water = new WaterMaterial("water", this.scene);
                        water.bumpTexture = new Texture(this.waterTexture, this.scene);
                        water.windForce = -5;
                        water.waveHeight = 0.5;
                        water.waterColor = new Color3(0.1, 0.1, 0.6);
                        water.colorBlendFactor = 0;
                        water.bumpHeight = 0.1;
                        water.waveLength = 0.1;
                        water.addToRenderList(this.skybox);
                        this.meshPicked.material = water;
                    };
                    Vishva.prototype.switchAvatar = function () {
                        if (!this.isMeshSelected) {
                            return "no mesh selected";
                        }
                        if (this.isAvatar(this.meshPicked)) {
                            this.cc.stop();
                            //old avatar
                            vishva.SNAManager.getSNAManager().enableSnAs(this.avatar);
                            this.avatar.rotationQuaternion = Quaternion.RotationYawPitchRoll(this.avatar.rotation.y, this.avatar.rotation.x, this.avatar.rotation.z);
                            this.avatar.isPickable = true;
                            Tags.RemoveTagsFrom(this.avatar, "Vishva.avatar");
                            if (this.avatarSkeleton != null) {
                                Tags.RemoveTagsFrom(this.avatarSkeleton, "Vishva.skeleton");
                                this.avatarSkeleton.name = "";
                            }
                            //new avatar
                            this.avatar = this.meshPicked;
                            this.avatarSkeleton = this.avatar.skeleton;
                            Tags.AddTagsTo(this.avatar, "Vishva.avatar");
                            if (this.avatarSkeleton != null) {
                                Tags.AddTagsTo(this.avatarSkeleton, "Vishva.skeleton");
                                this.avatarSkeleton.name = "Vishva.skeleton";
                                this.checkAnimRange(this.avatarSkeleton);
                                this.avatarSkeleton.enableBlending(0.1);
                            }
                            this.avatar.checkCollisions = true;
                            this.avatar.ellipsoid = new Vector3(0.5, 1, 0.5);
                            this.avatar.ellipsoidOffset = new Vector3(0, 2, 0);
                            this.avatar.isPickable = false;
                            this.avatar.rotation = this.avatar.rotationQuaternion.toEulerAngles();
                            this.avatar.rotationQuaternion = null;
                            this.saveAVcameraPos = this.mainCamera.position;
                            this.isFocusOnAv = true;
                            this.removeEditControl();
                            vishva.SNAManager.getSNAManager().disableSnAs(this.avatar);
                            //make character control to use the new avatar
                            this.cc.setAvatar(this.avatar);
                            this.cc.setAvatarSkeleton(this.avatarSkeleton);
                            //this.cc.setAnims(this.anims);
                            this.cc.start();
                        }
                        else {
                            return "cannot use this as avatar";
                        }
                        return null;
                    };
                    Vishva.prototype.isAvatar = function (mesh) {
                        if (mesh.skeleton == null) {
                            return false;
                        }
                        return true;
                    };
                    /**
                     * check how many of standard avatar animations are present in this skeleton
                     *
                     * @param skel
                     */
                    Vishva.prototype.checkAnimRange = function (skel) {
                        for (var _i = 0, _a = this.anims; _i < _a.length; _i++) {
                            var anim = _a[_i];
                            if (skel.getAnimationRange(anim.name) != null) {
                                anim.exist = true;
                            }
                            else {
                                console.log(anim.name + " not found");
                                anim.exist = false;
                            }
                        }
                    };
                    Vishva.prototype.setAvatar = function (avName, meshes) {
                        var mesh;
                        for (var index147 = 0; index147 < meshes.length; index147++) {
                            var amesh = meshes[index147];
                            {
                                mesh = amesh;
                                if ((mesh.id === avName)) {
                                    var saveRotation;
                                    var savePosition;
                                    if (this.avatar != null) {
                                        saveRotation = this.avatar.rotation;
                                        savePosition = this.avatar.position;
                                    }
                                    else {
                                        saveRotation = new Vector3(0, Math.PI, 0);
                                        savePosition = new Vector3(0, 0, 0);
                                    }
                                    this.avatar = mesh;
                                    this.avatar.rotation = saveRotation;
                                    this.avatar.position = savePosition;
                                    this.avatar.visibility = 1;
                                    this.avatar.skeleton = this.avatarSkeleton;
                                    this.avatar.checkCollisions = true;
                                    this.avatar.ellipsoid = new Vector3(0.5, 1, 0.5);
                                    this.avatar.ellipsoidOffset = new Vector3(0, 2, 0);
                                    this.avatar.isPickable = false;
                                }
                                else {
                                    mesh.skeleton = null;
                                    mesh.visibility = 0;
                                    mesh.checkCollisions = false;
                                }
                            }
                        }
                    };
                    Vishva.prototype.createGround_old = function (scene) {
                        var groundMaterial = new StandardMaterial("groundMat", scene);
                        groundMaterial.diffuseTexture = new Texture(this.groundTexture, scene);
                        groundMaterial.diffuseTexture.uScale = 6.0;
                        groundMaterial.diffuseTexture.vScale = 6.0;
                        groundMaterial.diffuseColor = new Color3(0.9, 0.6, 0.4);
                        groundMaterial.specularColor = new Color3(0, 0, 0);
                        var grnd = Mesh.CreateGround("ground", 256, 256, 1, scene);
                        grnd.material = groundMaterial;
                        grnd.checkCollisions = true;
                        grnd.isPickable = false;
                        Tags.AddTagsTo(grnd, "Vishva.ground Vishva.internal");
                        grnd.freezeWorldMatrix();
                        grnd.receiveShadows = true;
                        return grnd;
                    };
                    Vishva.prototype.createGround = function (scene) {
                        var _this = this;
                        var groundMaterial = this.createGroundMaterial(scene);
                        MeshBuilder.CreateGroundFromHeightMap("ground", this.groundHeightMap, {
                            width: 256,
                            height: 256,
                            minHeight: 0,
                            maxHeight: 20,
                            subdivisions: 32,
                            onReady: function (grnd) {
                                console.log("ground created");
                                grnd.material = groundMaterial;
                                grnd.checkCollisions = true;
                                grnd.isPickable = false;
                                Tags.AddTagsTo(grnd, "Vishva.ground Vishva.internal");
                                grnd.freezeWorldMatrix();
                                grnd.receiveShadows = true;
                                _this.ground = grnd;
                                //HeightmapImpostor doesnot seem to work.
                                //                    if (this.enablePhysics) {
                                //                        this.ground.physicsImpostor = new BABYLON.PhysicsImpostor(this.ground, BABYLON.PhysicsImpostor.HeightmapImpostor, { mass: 0, restitution: 0.1 }, this.scene);
                                //                    }
                            }
                        }, scene);
                    };
                    Vishva.prototype.createGroundMaterial = function (scene) {
                        var groundMaterial = new StandardMaterial("groundMat", scene);
                        groundMaterial.diffuseTexture = new Texture(this.groundTexture, scene);
                        groundMaterial.diffuseTexture.uScale = 6.0;
                        groundMaterial.diffuseTexture.vScale = 6.0;
                        groundMaterial.diffuseColor = new Color3(0.9, 0.6, 0.4);
                        groundMaterial.specularColor = new Color3(0, 0, 0);
                        return groundMaterial;
                    };
                    Vishva.prototype.createSkyBox = function (scene) {
                        var skybox = Mesh.CreateBox("skyBox", 1000.0, scene);
                        var skyboxMaterial = new StandardMaterial("skyBox", scene);
                        skyboxMaterial.backFaceCulling = false;
                        skybox.material = skyboxMaterial;
                        skybox.infiniteDistance = true;
                        skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
                        skyboxMaterial.specularColor = new Color3(0, 0, 0);
                        skyboxMaterial.reflectionTexture = new CubeTexture(this.skyboxTextures, scene);
                        skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
                        skybox.renderingGroupId = 0;
                        skybox.isPickable = false;
                        Tags.AddTagsTo(skybox, "Vishva.sky Vishva.internal");
                        return skybox;
                    };
                    Vishva.prototype.toggleSnow = function () {
                        if (this.snowPart === null) {
                            this.snowPart = this.createSnowPart();
                        }
                        if (this.snowing) {
                            this.snowPart.stop();
                        }
                        else {
                            this.snowPart.start();
                            if (this.raining) {
                                this.rainPart.stop();
                                this.raining = false;
                            }
                        }
                        this.snowing = !this.snowing;
                    };
                    /**
                     * create a snow particle system
                     */
                    Vishva.prototype.createSnowPart = function () {
                        var part = new ParticleSystem("snow", 1000, this.scene);
                        part.particleTexture = new BABYLON.Texture(this.snowTexture, this.scene);
                        part.emitter = new Vector3(0, 10, 0);
                        part.maxEmitBox = new Vector3(100, 10, 100);
                        part.minEmitBox = new Vector3(-100, 10, -100);
                        part.emitRate = 1000;
                        part.updateSpeed = 0.005;
                        part.minLifeTime = 1;
                        part.maxLifeTime = 5;
                        part.minSize = 0.1;
                        part.maxSize = 0.5;
                        part.color1 = new BABYLON.Color4(1, 1, 1, 1);
                        part.color2 = new BABYLON.Color4(1, 1, 1, 1);
                        part.colorDead = new BABYLON.Color4(0, 0, 0, 0);
                        //part.blendMode = ParticleSystem.BLENDMODE_STANDARD;
                        part.gravity = new BABYLON.Vector3(0, -9.81, 0);
                        return part;
                    };
                    Vishva.prototype.toggleRain = function () {
                        if (this.rainPart === null) {
                            this.rainPart = this.createRainPart();
                        }
                        if (this.raining) {
                            this.rainPart.stop();
                        }
                        else {
                            this.rainPart.start();
                            if (this.snowing) {
                                this.snowPart.stop();
                                this.snowing = false;
                            }
                        }
                        this.raining = !this.raining;
                    };
                    /**
                     * create a snow particle system
                     */
                    Vishva.prototype.createRainPart = function () {
                        var part = new ParticleSystem("rain", 4000, this.scene);
                        part.particleTexture = new BABYLON.Texture(this.rainTexture, this.scene);
                        part.emitter = new Vector3(0, 40, 0);
                        part.maxEmitBox = new Vector3(100, 40, 100);
                        part.minEmitBox = new Vector3(-100, 40, -100);
                        part.emitRate = 1000;
                        part.updateSpeed = 0.02;
                        part.minLifeTime = 5;
                        part.maxLifeTime = 10;
                        part.minSize = 0.1;
                        part.maxSize = 0.8;
                        part.color1 = new BABYLON.Color4(1, 1, 1, 0.5);
                        part.color2 = new BABYLON.Color4(0, 0, 1, 1);
                        part.colorDead = new BABYLON.Color4(0, 0, 0, 0);
                        //part.blendMode = ParticleSystem.BLENDMODE_STANDARD;
                        part.gravity = new BABYLON.Vector3(0, -9.81, 0);
                        return part;
                    };
                    Vishva.prototype.createCamera = function (scene, canvas) {
                        //lets create a camera located way high so that it doesnotcollide with any terrain
                        var camera = new ArcRotateCamera("v.c-camera", 1, 1.4, 4, new Vector3(0, 1000, 0), scene);
                        this.setCameraSettings(camera);
                        camera.attachControl(canvas, true);
                        if ((this.avatar !== null) && (this.avatar !== undefined)) {
                            camera.target = new Vector3(this.avatar.position.x, this.avatar.position.y + 1.5, this.avatar.position.z);
                            camera.alpha = -this.avatar.rotation.y - 4.69;
                        }
                        camera.checkCollisions = this.cameraCollision;
                        camera.collisionRadius = new Vector3(0.5, 0.5, 0.5);
                        Tags.AddTagsTo(camera, "Vishva.camera");
                        return camera;
                    };
                    Vishva.prototype.loadAvatar = function () {
                        var _this = this;
                        SceneLoader.ImportMesh("", this.avatarFolder, this.avatarFile, this.scene, function (meshes, particleSystems, skeletons) { return _this.onAvatarLoaded(meshes, particleSystems, skeletons); });
                    };
                    Vishva.prototype.onAvatarLoaded = function (meshes, particleSystems, skeletons) {
                        this.avatar = meshes[0];
                        (this.shadowGenerator.getShadowMap().renderList).push(this.avatar);
                        //TODO
                        //this.avatar.receiveShadows = true;
                        var l = meshes.length;
                        for (var i = 1; i < l; i++) {
                            meshes[i].checkCollisions = false;
                            meshes[i].dispose();
                        }
                        this.avatarSkeleton = skeletons[0];
                        l = skeletons.length;
                        for (var i = 1; i < l; i++) {
                            skeletons[i].dispose();
                        }
                        this.fixAnimationRanges(this.avatarSkeleton);
                        this.avatar.skeleton = this.avatarSkeleton;
                        this.checkAnimRange(this.avatarSkeleton);
                        this.avatarSkeleton.enableBlending(0.1);
                        //this.avatar.rotation.y = Math.PI;
                        this.avatar.position = new Vector3(0, 20, 0);
                        this.avatar.checkCollisions = true;
                        this.avatar.ellipsoid = new Vector3(0.5, 1, 0.5);
                        this.avatar.ellipsoidOffset = new Vector3(0, 2, 0);
                        this.avatar.isPickable = false;
                        Tags.AddTagsTo(this.avatar, "Vishva.avatar");
                        Tags.AddTagsTo(this.avatarSkeleton, "Vishva.skeleton");
                        this.avatarSkeleton.name = "Vishva.skeleton";
                        this.mainCamera.alpha = -this.avatar.rotation.y - 4.69;
                        this.mainCamera.target = new Vector3(this.avatar.position.x, this.avatar.position.y + 1.5, this.avatar.position.z);
                        var sm = this.avatar.material;
                        if (sm.diffuseTexture != null) {
                            var textureName = sm.diffuseTexture.name;
                            sm.diffuseTexture.name = this.avatarFolder + textureName;
                        }
                        this.cc = new CharacterControl(this.avatar, this.avatarSkeleton, this.anims, this.mainCamera, this.scene);
                        this.cc.start();
                    };
                    Vishva.prototype.setAnimationRange = function (skel) {
                        for (var index149 = 0; index149 < this.anims.length; index149++) {
                            var anim = this.anims[index149];
                            {
                                skel.createAnimationRange(anim.name, anim.s, anim.e);
                            }
                        }
                    };
                    /**
                     * workaround for bugs in blender exporter
                     * 4.4.3 animation ranges are off by 1
                     * 4.4.4 issue with actions with just 2 frames -> from = to
                     * looks like this was fixed in exporter 5.3
                     * 5.3.0 aniamtion ranges again off by 1
                     * TODO this should be moved to load asset function. Wrong to assume that all asset have been created using blender exporter
                     *
                     * @param skel
                     */
                    Vishva.prototype.fixAnimationRanges = function (skel) {
                        var getAnimationRanges = skel["getAnimationRanges"];
                        var ranges = getAnimationRanges.call(skel);
                        for (var _i = 0, ranges_1 = ranges; _i < ranges_1.length; _i++) {
                            var range = ranges_1[_i];
                            //fix for 4.4.4
                            //                if (range.from === range.to) {
                            //                    console.log("animation issue found in " + range.name + " from " + range.from);
                            //                    range.to++;
                            //                }
                            //fix for 5.3
                            range.from++;
                        }
                    };
                    Vishva.prototype.setCameraSettings = function (camera) {
                        camera.lowerRadiusLimit = 0.25;
                        camera.keysLeft = [];
                        camera.keysRight = [];
                        camera.keysUp = [];
                        camera.keysDown = [];
                        camera.panningSensibility = 10;
                        camera.inertia = 0.1;
                        camera.angularSensibilityX = 250;
                        camera.angularSensibilityY = 250;
                    };
                    Vishva.prototype.backfaceCulling = function (mat) {
                        var index;
                        for (index = 0; index < mat.length; ++index) {
                            mat[index].backFaceCulling = false;
                        }
                    };
                    Vishva.prototype.disableKeys = function () {
                        this.keysDisabled = true;
                        this.cc.stop();
                    };
                    Vishva.prototype.enableKeys = function () {
                        this.keysDisabled = false;
                        if (this.isFocusOnAv)
                            this.cc.start();
                    };
                    Vishva.prototype.enableCameraCollision = function (yesNo) {
                        this.cameraCollision = yesNo;
                        this.mainCamera.checkCollisions = yesNo;
                    };
                    Vishva.prototype.isCameraCollisionOn = function () {
                        return this.cameraCollision;
                    };
                    Vishva.prototype.enableAutoEditMenu = function (yesNo) {
                        this.autoEditMenu = yesNo;
                    };
                    Vishva.prototype.isAutoEditMenuOn = function () {
                        return this.autoEditMenu;
                    };
                    return Vishva;
                }());
                vishva.Vishva = Vishva;
                var Key = (function () {
                    function Key() {
                        this.up = false;
                        this.down = false;
                        this.right = false;
                        this.left = false;
                        this.stepRight = false;
                        this.stepLeft = false;
                        this.jump = false;
                        this.shift = false;
                        this.trans = false;
                        this.rot = false;
                        this.scale = false;
                        this.esc = false;
                        this.ctl = false;
                        this.focus = false;
                    }
                    return Key;
                }());
                vishva.Key = Key;
                var AnimData = (function () {
                    function AnimData(name, s, e, d) {
                        this.exist = false;
                        this.s = 0;
                        this.e = 0;
                        this.r = 0;
                        this.name = name;
                        this.s = s;
                        this.e = e;
                        this.r = d;
                    }
                    return AnimData;
                }());
                vishva.AnimData = AnimData;
                /*
                 * will be used to store a meshes, usually mesh picked for edit,
                 * physics parms if physics is enabled for it
                 */
                var PhysicsParm = (function () {
                    function PhysicsParm() {
                    }
                    return PhysicsParm;
                }());
                vishva.PhysicsParm = PhysicsParm;
                var LightParm = (function () {
                    function LightParm() {
                        this.type = "Spot";
                        this.diffuse = Color3.White();
                        this.specular = Color3.White();
                        this.intensity = 1;
                        this.range = 5;
                        this.radius = 5;
                        this.angle = 45;
                        this.exponent = 1;
                        this.gndClr = Color3.White();
                        this.direction = Vector3.Zero();
                    }
                    ;
                    ;
                    return LightParm;
                }());
                vishva.LightParm = LightParm;
            })(vishva = babylonjs.vishva || (babylonjs.vishva = {}));
        })(babylonjs = ssatguru.babylonjs || (ssatguru.babylonjs = {}));
    })(ssatguru = org.ssatguru || (org.ssatguru = {}));
})(org || (org = {}));
/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var org;
/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
(function (org) {
    var ssatguru;
    (function (ssatguru) {
        var babylonjs;
        (function (babylonjs) {
            var vishva;
            (function (vishva) {
                var Vector3 = BABYLON.Vector3;
                var VishvaSerialized = (function () {
                    function VishvaSerialized() {
                        this.settings = new SettingsSerialized();
                        this.misc = new MiscSerialized();
                    }
                    return VishvaSerialized;
                }());
                vishva.VishvaSerialized = VishvaSerialized;
                var SettingsSerialized = (function () {
                    function SettingsSerialized() {
                        this.cameraCollision = true;
                        //automatcally open edit menu whenever a mesh is selected
                        this.autoEditMenu = false;
                    }
                    return SettingsSerialized;
                }());
                vishva.SettingsSerialized = SettingsSerialized;
                /*
                 * BABYLONJS values not serialized by BABYLONJS but which we need
                 */
                var MiscSerialized = (function () {
                    function MiscSerialized() {
                        this.activeCameraTarget = Vector3.Zero();
                    }
                    return MiscSerialized;
                }());
                vishva.MiscSerialized = MiscSerialized;
            })(vishva = babylonjs.vishva || (babylonjs.vishva = {}));
        })(babylonjs = ssatguru.babylonjs || (ssatguru.babylonjs = {}));
    })(ssatguru = org.ssatguru || (org.ssatguru = {}));
})(org || (org = {}));
