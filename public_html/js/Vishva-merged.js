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
            var vishva;
            (function (vishva_1) {
                var gui;
                (function (gui) {
                    /**
                     * Provides UI for the Animation (Skeleton) tab of mesh properties
                     */
                    var AnimationUI = (function () {
                        function AnimationUI(vishva) {
                            var _this = this;
                            this._animSelect = null;
                            this._vishva = vishva;
                            var animSkelChange = document.getElementById("animSkelChange");
                            var animSkelClone = document.getElementById("animSkelClone");
                            var animSkelView = document.getElementById("animSkelView");
                            var animRest = document.getElementById("animRest");
                            var animRangeName = document.getElementById("animRangeName");
                            var animRangeStart = document.getElementById("animRangeStart");
                            var animRangeEnd = document.getElementById("animRangeEnd");
                            var animRangeMake = document.getElementById("animRangeMake");
                            this._animSkelList = document.getElementById("animSkelList");
                            //change the mesh skeleton
                            animSkelChange.onclick = function (e) {
                                if (_this._vishva.changeSkeleton(_this._animSkelList.selectedOptions[0].value))
                                    _this._updateAnimations();
                                else
                                    gui.DialogMgr.showAlertDiag("Error: unable to switch");
                            };
                            //clone the selected skeleton and swicth to it
                            animSkelClone.onclick = function (e) {
                                if (_this._vishva.cloneChangeSkeleton(_this._animSkelList.selectedOptions[0].value))
                                    _this._updateAnimations();
                                else
                                    gui.DialogMgr.showAlertDiag("Error: unable to clone and switch");
                            };
                            //enable/disable skeleton view
                            animSkelView.onclick = function (e) {
                                _this._vishva.toggleSkelView();
                            };
                            //show rest pose
                            animRest.onclick = function (e) {
                                _this._vishva.animRest();
                            };
                            //create
                            animRangeMake.onclick = function (e) {
                                var name = animRangeName.value;
                                var ars = parseInt(animRangeStart.value);
                                if (isNaN(ars)) {
                                    gui.DialogMgr.showAlertDiag("from frame is not a number");
                                }
                                var are = parseInt(animRangeEnd.value);
                                if (isNaN(are)) {
                                    gui.DialogMgr.showAlertDiag("to frame is not a number");
                                }
                                _this._vishva.createAnimRange(name, ars, are);
                                _this._refreshAnimSelect();
                            };
                            //select
                            this._animSelect = document.getElementById("animList");
                            this._animSelect.onchange = function (e) {
                                var animName = _this._animSelect.value;
                                if (animName != null) {
                                    var range = _this._skel.getAnimationRange(animName);
                                    document.getElementById("animFrom").innerText = new Number(range.from).toString();
                                    document.getElementById("animTo").innerText = new Number(range.to).toString();
                                }
                                return true;
                            };
                            //play
                            this._animRate = document.getElementById("animRate");
                            this._animLoop = document.getElementById("animLoop");
                            document.getElementById("playAnim").onclick = function (e) {
                                if (_this._skel == null)
                                    return true;
                                var animName = _this._animSelect.value;
                                var rate = _this._animRate.value;
                                if (animName != null) {
                                    _this._vishva.playAnimation(animName, rate, _this._animLoop.checked);
                                }
                                return true;
                            };
                            document.getElementById("stopAnim").onclick = function (e) {
                                if (_this._skel == null)
                                    return true;
                                _this._vishva.stopAnimation();
                                return true;
                            };
                        }
                        //        private createAnimDiag() {
                        //            this.initAnimUI();
                        //            this.meshAnimDiag = $("#meshAnimDiag");
                        //            var dos: DialogOptions = {};
                        //            dos.autoOpen = false;
                        //            dos.modal = false;
                        //            dos.resizable = false;
                        //            dos.width = "auto";
                        //            dos.height = (<any>"auto");
                        //            dos.closeOnEscape = false;
                        //            dos.closeText = "";
                        //            dos.close = (e, ui) => {
                        //                this.vishva.switchDisabled = false;
                        //            };
                        //            this.meshAnimDiag.dialog(dos);
                        //        }
                        AnimationUI.prototype._updateAnimations = function () {
                            //this.vishva.switchDisabled = true;
                            this._skel = this._vishva.getSkeleton();
                            var skelName;
                            if (this._skel == null) {
                                skelName = "NO SKELETON";
                            }
                            else {
                                skelName = this._skel.name.trim();
                                if (skelName === "")
                                    skelName = "NO NAME";
                                skelName = skelName + " (" + this._skel.id + ")";
                            }
                            document.getElementById("skelName").innerText = skelName;
                            this._refreshAnimSelect();
                            this._refreshAnimSkelList();
                        };
                        /**
                         * refresh the list of animation ranges
                         */
                        AnimationUI.prototype._refreshAnimSelect = function () {
                            var childs = this._animSelect.children;
                            var l = (childs.length | 0);
                            for (var i = l - 1; i >= 0; i--) {
                                childs[i].remove();
                            }
                            var range = this._vishva.getAnimationRanges();
                            if (range != null) {
                                var animOpt;
                                for (var _i = 0, range_1 = range; _i < range_1.length; _i++) {
                                    var ar = range_1[_i];
                                    animOpt = document.createElement("option");
                                    animOpt.value = ar.name;
                                    animOpt.innerText = ar.name;
                                    this._animSelect.appendChild(animOpt);
                                }
                                if (range[0] != null) {
                                    document.getElementById("animFrom").innerText = new Number(range[0].from).toString();
                                    document.getElementById("animTo").innerText = new Number(range[0].to).toString();
                                }
                                else {
                                    document.getElementById("animFrom").innerText = "";
                                    document.getElementById("animTo").innerText = "";
                                }
                            }
                            else {
                                document.getElementById("animFrom").innerText = "";
                                document.getElementById("animTo").innerText = "";
                            }
                        };
                        /**
                         * refresh list of skeletons shown in animation tab
                         */
                        AnimationUI.prototype._refreshAnimSkelList = function () {
                            var childs = this._animSkelList.children;
                            var l = (childs.length | 0);
                            for (var i = l - 1; i >= 0; i--) {
                                childs[i].remove();
                            }
                            var skels = this._vishva.getSkeltons();
                            var opt;
                            //NOTE:skel id is not unique
                            for (var _i = 0, skels_1 = skels; _i < skels_1.length; _i++) {
                                var skel = skels_1[_i];
                                opt = document.createElement("option");
                                opt.value = skel.id + "-" + skel.name;
                                opt.innerText = skel.name + " (" + skel.id + ")";
                                this._animSkelList.appendChild(opt);
                            }
                        };
                        return AnimationUI;
                    }());
                    gui.AnimationUI = AnimationUI;
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
            var vishva;
            (function (vishva) {
                var gui;
                (function (gui) {
                    var ColorPickerDiag = (function () {
                        function ColorPickerDiag(title, diagSelector, initialColor, jpo, f) {
                            var _this = this;
                            this.inner1 = "<input class='colorInput' type='text' style='width:100%;height:32px;border-width:1px;border-style:solid;cursor: pointer' readonly></input>";
                            this.inner2 = "<div class='colorDiag' style='align-content: center'><div  class='colorPicker cp-fancy'></div></div>";
                            this.hexColor = initialColor;
                            var colorEle = document.getElementById(diagSelector);
                            colorEle.innerHTML = this.inner1.concat(this.inner2);
                            this.colorInput = colorEle.getElementsByClassName("colorInput")[0];
                            this.colorInput.style.backgroundColor = this.hexColor;
                            this.colorInput.value = this.hexColor;
                            this.colorInput.onclick = function () {
                                _this.diag.dialog("open");
                                _this.cp.setHex(_this.hexColor);
                            };
                            var colorDiag = colorEle.getElementsByClassName("colorDiag")[0];
                            var colorPicker = colorDiag.getElementsByClassName("colorPicker")[0];
                            this.cp = new ColorPicker(colorPicker, function (hex, hsv, rgb) {
                                _this.hexColor = hex;
                                _this.colorInput.style.backgroundColor = hex;
                                _this.colorInput.value = hex;
                                f(hex, hsv, rgb);
                            });
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
                            this.diag = $(colorDiag);
                            this.diag.dialog(dos);
                            this.diag["jpo"] = jpo;
                        }
                        ColorPickerDiag.prototype.open = function (hex) {
                            this.diag.dialog("open");
                            this.setColor(hex);
                        };
                        ColorPickerDiag.prototype.setColor = function (hex) {
                            this.hexColor = hex;
                            this.cp.setHex(hex);
                            this.colorInput.style.backgroundColor = hex;
                            this.colorInput.value = hex;
                        };
                        ColorPickerDiag.prototype.getColor = function () {
                            return this.hexColor;
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
            (function (vishva) {
                var gui;
                (function (gui) {
                    var VDialog = (function () {
                        function VDialog(id, title, jpo, width, height, minWidth) {
                            if (minWidth === void 0) { minWidth = 0; }
                            if (width == null || width == "")
                                width = "auto";
                            if (height == null || height == "")
                                height = "auto";
                            if (id instanceof HTMLDivElement) {
                                this._diag = $(id);
                            }
                            else {
                                this._diag = $("#" + id);
                            }
                            var dos = {
                                title: title,
                                autoOpen: false,
                                resizable: false,
                                position: jpo,
                                height: height,
                                closeText: "",
                                closeOnEscape: false
                            };
                            this._diag.dialog(dos);
                            if (minWidth != 0) {
                                this._diag.dialog("option", "minWidth", minWidth);
                            }
                            else {
                                this._diag.dialog("option", "width", width);
                            }
                            this.jpo = jpo;
                            gui.DialogMgr.dialogs.push(this);
                        }
                        VDialog.prototype.setModal = function (b) {
                            this._diag.dialog("option", "modal", b);
                        };
                        VDialog.prototype.setResizable = function (b) {
                            this._diag.dialog("option", "resizable", b);
                        };
                        VDialog.prototype.open = function () {
                            this._diag.dialog("open");
                        };
                        VDialog.prototype.close = function () {
                            this._diag.dialog("close");
                        };
                        VDialog.prototype.isOpen = function () {
                            return this._diag.dialog("isOpen");
                        };
                        VDialog.prototype.toggle = function () {
                            if (this.isOpen()) {
                                this.close();
                            }
                            else {
                                this.open();
                            }
                        };
                        VDialog.prototype.position = function () {
                            this._diag.dialog("option", "position", this.jpo);
                        };
                        VDialog.prototype.setButtons = function (dbos) {
                            this._diag.dialog("option", "buttons", dbos);
                        };
                        return VDialog;
                    }());
                    gui.VDialog = VDialog;
                })(gui = vishva.gui || (vishva.gui = {}));
            })(vishva = babylonjs.vishva || (babylonjs.vishva = {}));
        })(babylonjs = ssatguru.babylonjs || (ssatguru.babylonjs = {}));
    })(ssatguru = org.ssatguru || (org.ssatguru = {}));
})(org || (org = {}));
/// <reference path="VDialog.ts"/>
var org;
/// <reference path="VDialog.ts"/>
(function (org) {
    var ssatguru;
    (function (ssatguru) {
        var babylonjs;
        (function (babylonjs) {
            var vishva;
            (function (vishva) {
                var gui;
                (function (gui) {
                    var DialogMgr = (function () {
                        function DialogMgr() {
                        }
                        ;
                        DialogMgr.createAlertDiag = function () {
                            if (this._alertDialog == null)
                                this._alertDialog = new gui.VDialog("alertDiv", "Info", DialogMgr.center, "", "", 200);
                        };
                        DialogMgr.showAlertDiag = function (msg) {
                            this._alertDiv.innerHTML = "<h3>" + msg + "</h3>";
                            this._alertDialog.open();
                        };
                        DialogMgr.dialogs = new Array();
                        DialogMgr.center = {
                            at: "center center",
                            my: "center center",
                            of: window
                        };
                        DialogMgr.centerBottom = {
                            at: "center bottom",
                            my: "center bottom",
                            of: window
                        };
                        DialogMgr.leftCenter = {
                            at: "left center",
                            my: "left center",
                            of: window
                        };
                        DialogMgr.rightCenter = {
                            at: "right center",
                            my: "right center",
                            of: window
                        };
                        DialogMgr.rightTop = {
                            at: "right top",
                            my: "right top",
                            of: window
                        };
                        DialogMgr._alertDiv = document.getElementById("alertDiv");
                        return DialogMgr;
                    }());
                    gui.DialogMgr = DialogMgr;
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
            (function (vishva_2) {
                var gui;
                (function (gui) {
                    /**
                     * provides a ui to manage the environment in the world
                     */
                    var EnvironmentUI = (function () {
                        /*
                         * Create Environment Dialog
                         */
                        function EnvironmentUI(vishva, addInternalAssetUI) {
                            var _this = this;
                            this._vishva = vishva;
                            this._addInternalAssetUI = addInternalAssetUI;
                            var sunPos = $("#sunPos");
                            var light = $("#light");
                            var shade = $("#shade");
                            var fog = $("#fog");
                            var fov = $("#fov");
                            sunPos.slider(this._sliderOptions(0, 180, this._vishva.getSunPos()));
                            light.slider(this._sliderOptions(0, 100, 100 * this._vishva.getLight()));
                            shade.slider(this._sliderOptions(0, 100, 100 * this._vishva.getShade()));
                            fog.slider(this._sliderOptions(0, 100, 100 * this._vishva.getFog()));
                            var fogColDiag = new gui.ColorPickerDiag("fog color", "fogCol", this._vishva.getFogColor(), gui.DialogMgr.centerBottom, function (hex, hsv, rgb) {
                                _this._vishva.setFogColor(hex);
                            });
                            fov.slider(this._sliderOptions(0, 180, this._vishva.getFov()));
                            var envSnow = document.getElementById("envSnow");
                            envSnow.onclick = function (e) {
                                _this._vishva.toggleSnow();
                            };
                            var envRain = document.getElementById("envRain");
                            envRain.onclick = function (e) {
                                //this.showAlertDiag("Sorry. To be implemented");
                                _this._vishva.toggleRain();
                            };
                            var skyButton = document.getElementById("skyButton");
                            skyButton.onclick = function (e) {
                                _this._addInternalAssetUI.toggleAssetDiag("skyboxes");
                                return true;
                            };
                            var trnButton = document.getElementById("trnButton");
                            trnButton.onclick = function (e) {
                                gui.DialogMgr.showAlertDiag("Sorry. To be implemneted soon");
                                return true;
                            };
                            var ambColDiag = new gui.ColorPickerDiag("ambient color", "ambCol", this._vishva.getAmbientColor(), gui.DialogMgr.centerBottom, function (hex, hsv, rgb) {
                                _this._vishva.setAmbientColor(hex);
                            });
                            var trnColDiag = new gui.ColorPickerDiag("terrain color", "trnCol", this._vishva.getGroundColor(), gui.DialogMgr.centerBottom, function (hex, hsv, rgb) {
                                _this._vishva.setGroundColor(hex);
                            });
                            this._envDiag = new gui.VDialog("envDiv", "Environment", gui.DialogMgr.rightCenter, "", "", 350);
                        }
                        EnvironmentUI.prototype._sliderOptions = function (min, max, value) {
                            var _this = this;
                            var so = {};
                            so.min = min;
                            so.max = max;
                            so.value = value;
                            so.slide = function (e, ui) { return _this._handleSlide(e, ui); };
                            return so;
                        };
                        EnvironmentUI.prototype._handleSlide = function (e, ui) {
                            var slider = e.target.id;
                            if (slider === "fov") {
                                this._vishva.setFov(ui.value);
                            }
                            else if (slider === "sunPos") {
                                this._vishva.setSunPos(ui.value);
                            }
                            else {
                                var v = ui.value / 100;
                                if (slider === "light") {
                                    this._vishva.setLight(v);
                                }
                                else if (slider === "shade") {
                                    this._vishva.setShade(v);
                                }
                                else if (slider === "fog") {
                                    console.log(v);
                                    this._vishva.setFog(v / 100);
                                }
                            }
                            return true;
                        };
                        EnvironmentUI.prototype.toggle = function () {
                            this._envDiag.toggle();
                        };
                        return EnvironmentUI;
                    }());
                    gui.EnvironmentUI = EnvironmentUI;
                })(gui = vishva_2.gui || (vishva_2.gui = {}));
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
            (function (vishva_3) {
                var gui;
                (function (gui) {
                    /**
                     * Provides UI for the Genral tab of mesh properties
                     */
                    var GeneralUI = (function () {
                        function GeneralUI(vishva, vishvaGUI) {
                            var _this = this;
                            this._vishva = vishva;
                            this._vishvaGUI = vishvaGUI;
                            //name
                            this._genName = document.getElementById("genName");
                            this._genName.onchange = function () {
                                _this._vishva.setName(_this._genName.value);
                            };
                            //space
                            this._genSpace = document.getElementById("genSpace");
                            this._genSpace.onchange = function () {
                                var err = _this._vishva.setSpace(_this._genSpace.value);
                                if (err !== null) {
                                    gui.DialogMgr.showAlertDiag(err);
                                    _this._genSpace.value = _this._vishva.getSpace();
                                }
                            };
                            //transforms
                            if (this._transRefresh === undefined) {
                                this._transRefresh = document.getElementById("transRefresh");
                                this._transRefresh.onclick = function () {
                                    _this._updateTransform();
                                    return false;
                                };
                            }
                            if (this._transBake === undefined) {
                                this._transBake = document.getElementById("transBake");
                                this._transBake.onclick = function () {
                                    _this._vishva.bakeTransforms();
                                    _this._updateTransform();
                                    return false;
                                };
                            }
                            //edit controls
                            this._genOperTrans = document.getElementById("operTrans");
                            this._genOperRot = document.getElementById("operRot");
                            this._genOperScale = document.getElementById("operScale");
                            this._genOperFocus = document.getElementById("operFocus");
                            this._genOperTrans.onclick = function () {
                                _this._vishva.setTransOn();
                            };
                            this._genOperRot.onclick = function () {
                                _this._vishva.setRotOn();
                            };
                            this._genOperScale.onclick = function () {
                                _this._vishva.setScaleOn();
                                if (!_this._vishva.isSpaceLocal()) {
                                    gui.DialogMgr.showAlertDiag("note that scaling doesnot work with global axis");
                                }
                            };
                            this._genOperFocus.onclick = function () {
                                _this._vishva.setFocusOnMesh();
                            };
                            //Translation
                            this._genLocX = document.getElementById("loc.x");
                            this._genLocX.onchange = function () {
                                _this._vishva.setLocation(Number(_this._genLocX.value), Number(_this._genLocY.value), Number(_this._genLocZ.value));
                            };
                            this._genLocY = document.getElementById("loc.y");
                            this._genLocY.onchange = function () {
                                _this._vishva.setLocation(Number(_this._genLocX.value), Number(_this._genLocY.value), Number(_this._genLocZ.value));
                            };
                            this._genLocZ = document.getElementById("loc.z");
                            this._genLocZ.onchange = function () {
                                _this._vishva.setLocation(Number(_this._genLocX.value), Number(_this._genLocY.value), Number(_this._genLocZ.value));
                            };
                            //Rotation
                            this._genRotX = document.getElementById("rot.x");
                            this._genRotX.onchange = function () {
                                _this._vishva.setRotation(Number(_this._genRotX.value), Number(_this._genRotY.value), Number(_this._genRotZ.value));
                            };
                            this._genRotY = document.getElementById("rot.y");
                            this._genRotY.onchange = function () {
                                _this._vishva.setRotation(Number(_this._genRotX.value), Number(_this._genRotY.value), Number(_this._genRotZ.value));
                            };
                            this._genRotZ = document.getElementById("rot.z");
                            this._genRotZ.onchange = function () {
                                _this._vishva.setRotation(Number(_this._genRotX.value), Number(_this._genRotY.value), Number(_this._genRotZ.value));
                            };
                            //Scale
                            this._genScaleX = document.getElementById("scl.x");
                            this._genScaleX.onchange = function () {
                                _this._vishva.setScale(Number(_this._genScaleX.value), Number(_this._genScaleY.value), Number(_this._genScaleZ.value));
                            };
                            this._genScaleY = document.getElementById("scl.y");
                            this._genScaleY.onchange = function () {
                                _this._vishva.setScale(Number(_this._genScaleX.value), Number(_this._genScaleY.value), Number(_this._genScaleZ.value));
                            };
                            this._genScaleZ = document.getElementById("scl.z");
                            this._genScaleZ.onchange = function () {
                                _this._vishva.setScale(Number(_this._genScaleX.value), Number(_this._genScaleY.value), Number(_this._genScaleZ.value));
                            };
                            //Snap CheckBox
                            this._genSnapTrans = document.getElementById("snapTrans");
                            this._genSnapTrans.onchange = function () {
                                var err = _this._vishva.snapTrans(_this._genSnapTrans.checked);
                                if (err != null) {
                                    gui.DialogMgr.showAlertDiag(err);
                                    _this._genSnapTrans.checked = false;
                                }
                            };
                            this._genSnapRot = document.getElementById("snapRot");
                            this._genSnapRot.onchange = function () {
                                var err = _this._vishva.snapRot(_this._genSnapRot.checked);
                                if (err != null) {
                                    gui.DialogMgr.showAlertDiag(err);
                                    _this._genSnapRot.checked = false;
                                }
                            };
                            this._genSnapScale = document.getElementById("snapScale");
                            this._genSnapScale.onchange = function () {
                                var err = _this._vishva.snapScale(_this._genSnapScale.checked);
                                if (err != null) {
                                    gui.DialogMgr.showAlertDiag(err);
                                    _this._genSnapScale.checked = false;
                                }
                            };
                            //Snap Values
                            this._genSnapTransValue = document.getElementById("snapTransValue");
                            this._genSnapTransValue.onchange = function () {
                                _this._vishva.setSnapTransValue(Number(_this._genSnapTransValue.value));
                            };
                            this._genSnapRotValue = document.getElementById("snapRotValue");
                            this._genSnapRotValue.onchange = function () {
                                _this._vishva.setSnapRotValue(Number(_this._genSnapRotValue.value));
                            };
                            this._genSnapScaleValue = document.getElementById("snapScaleValue");
                            this._genSnapScaleValue.onchange = function () {
                                _this._vishva.setSnapScaleValue(Number(_this._genSnapScaleValue.value));
                            };
                            //
                            this._genDisable = document.getElementById("genDisable");
                            this._genDisable.onchange = function () {
                                _this._vishva.disableIt(_this._genDisable.checked);
                            };
                            this._genColl = document.getElementById("genColl");
                            this._genColl.onchange = function () {
                                _this._vishva.enableCollision(_this._genColl.checked);
                            };
                            this._genVisi = document.getElementById("genVisi");
                            this._genVisi.onchange = function () {
                                _this._vishva.makeVisibile(_this._genVisi.checked);
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
                            //            var addWater: HTMLElement = document.getElementById("addWater");
                            undo.onclick = function (e) {
                                _this._vishva.undo();
                                return false;
                            };
                            redo.onclick = function (e) {
                                _this._vishva.redo();
                                return false;
                            };
                            parentMesh.onclick = function (e) {
                                var err = _this._vishva.makeParent();
                                if (err != null) {
                                    gui.DialogMgr.showAlertDiag(err);
                                }
                                return false;
                            };
                            removeParent.onclick = function (e) {
                                var err = _this._vishva.removeParent();
                                if (err != null) {
                                    gui.DialogMgr.showAlertDiag(err);
                                }
                                return false;
                            };
                            removeChildren.onclick = function (e) {
                                var err = _this._vishva.removeChildren();
                                if (err != null) {
                                    gui.DialogMgr.showAlertDiag(err);
                                }
                                return false;
                            };
                            cloneMesh.onclick = function (e) {
                                var err = _this._vishva.clone_mesh();
                                if (err != null) {
                                    gui.DialogMgr.showAlertDiag(err);
                                }
                                return false;
                            };
                            instMesh.onclick = function (e) {
                                var err = _this._vishva.instance_mesh();
                                if (err != null) {
                                    gui.DialogMgr.showAlertDiag(err);
                                }
                                return false;
                            };
                            mergeMesh.onclick = function (e) {
                                var err = _this._vishva.mergeMeshes();
                                if (err != null) {
                                    gui.DialogMgr.showAlertDiag(err);
                                }
                                return false;
                            };
                            subMesh.onclick = function (e) {
                                var err = _this._vishva.csgOperation("subtract");
                                if (err != null) {
                                    gui.DialogMgr.showAlertDiag(err);
                                }
                                return false;
                            };
                            interMesh.onclick = function (e) {
                                var err = _this._vishva.csgOperation("intersect");
                                if (err != null) {
                                    gui.DialogMgr.showAlertDiag(err);
                                }
                                return false;
                            };
                            downAsset.onclick = function (e) {
                                var downloadURL = _this._vishva.saveAsset();
                                if (downloadURL == null) {
                                    gui.DialogMgr.showAlertDiag("No Mesh Selected");
                                    return true;
                                }
                                if (_this._downloadDialog == null)
                                    _this._createDownloadDiag();
                                _this._downloadLink.href = downloadURL;
                                _this._downloadDialog.dialog("open");
                                return false;
                            };
                            delMesh.onclick = function (e) {
                                var err = _this._vishva.delete_mesh();
                                if (err != null) {
                                    gui.DialogMgr.showAlertDiag(err);
                                }
                                return false;
                            };
                            swAv.onclick = function (e) {
                                var err = _this._vishva.switchAvatar();
                                if (err != null) {
                                    gui.DialogMgr.showAlertDiag(err);
                                }
                                return true;
                            };
                            swGnd.onclick = function (e) {
                                var err = _this._vishva.switchGround();
                                if (err != null) {
                                    gui.DialogMgr.showAlertDiag(err);
                                }
                                return true;
                            };
                            sNa.onclick = function (e) {
                                if (_this._snaUI == null) {
                                    _this._snaUI = new gui.SnaUI(_this._vishva, _this._vishvaGUI);
                                }
                                _this._snaUI.show_sNaDiag();
                                return true;
                            };
                            //            addWater.onclick = (e) => {
                            //                var err: string = this.vishva.addWater()
                            //                 if (err != null) {
                            //                    DialogMgr.showAlertDiag(err);
                            //                }
                            //                return true;
                            //            };
                        }
                        GeneralUI.prototype._updateGeneral = function () {
                            this._genName.value = this._vishva.getName();
                            this._genSpace.value = this._vishva.getSpace();
                            this._updateTransform();
                            this._genDisable.checked = this._vishva.isDisabled();
                            this._genColl.checked = this._vishva.isCollideable();
                            this._genVisi.checked = this._vishva.isVisible();
                        };
                        GeneralUI.prototype._updateTransform = function () {
                            var loc = this._vishva.getLocation();
                            var rot = this._vishva.getRotation();
                            var scl = this._vishva.getScale();
                            document.getElementById("loc.x").value = this._toString(loc.x);
                            document.getElementById("loc.y").value = this._toString(loc.y);
                            document.getElementById("loc.z").value = this._toString(loc.z);
                            document.getElementById("rot.x").value = this._toString(rot.x);
                            document.getElementById("rot.y").value = this._toString(rot.y);
                            document.getElementById("rot.z").value = this._toString(rot.z);
                            document.getElementById("scl.x").value = this._toString(scl.x);
                            document.getElementById("scl.y").value = this._toString(scl.y);
                            document.getElementById("scl.z").value = this._toString(scl.z);
                        };
                        GeneralUI.prototype._createDownloadDiag = function () {
                            this._downloadLink = document.getElementById("downloadAssetLink");
                            this._downloadDialog = $("#saveAssetDiv");
                            this._downloadDialog.dialog();
                            this._downloadDialog.dialog("close");
                        };
                        GeneralUI.prototype._toString = function (d) {
                            return new Number(d).toFixed(2).toString();
                        };
                        return GeneralUI;
                    }());
                    gui.GeneralUI = GeneralUI;
                })(gui = vishva_3.gui || (vishva_3.gui = {}));
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
                var gui;
                (function (gui) {
                    var GuiUtils = (function () {
                        function GuiUtils() {
                        }
                        /**
                         * populates a html select element with options from the passed string array
                         */
                        GuiUtils.PopulateSelect = function (selectEle, options) {
                            var childs = selectEle.children;
                            var l = (childs.length | 0);
                            for (var i = l - 1; i >= 0; i--) {
                                childs[i].remove();
                            }
                            var optEle;
                            for (var _i = 0, options_1 = options; _i < options_1.length; _i++) {
                                var option = options_1[_i];
                                optEle = document.createElement("option");
                                optEle.value = option;
                                optEle.innerText = option;
                                selectEle.appendChild(optEle);
                            }
                        };
                        return GuiUtils;
                    }());
                    gui.GuiUtils = GuiUtils;
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
            (function (vishva_4) {
                var gui;
                (function (gui) {
                    /**
                     * Provides a UI to add items from Internal Assets to the world
                     */
                    var InternalAssetsUI = (function () {
                        function InternalAssetsUI(vishva, vishvaFiles) {
                            this._assetDiagMap = {};
                            this._vishva = vishva;
                            this._vishvaFiles = vishvaFiles;
                        }
                        InternalAssetsUI.prototype.toggleAssetDiag = function (assetType) {
                            var assetDialog = this._assetDiagMap[assetType];
                            if (assetDialog == null) {
                                assetDialog = this._createAssetDiag(assetType);
                                this._assetDiagMap[assetType] = assetDialog;
                            }
                            if (assetDialog.isOpen()) {
                                assetDialog.close();
                            }
                            else {
                                assetDialog.open();
                            }
                        };
                        InternalAssetsUI.prototype._createAssetDiag = function (assetType) {
                            var div = document.createElement("div");
                            div.id = assetType + "Div";
                            div.setAttribute("title", assetType);
                            var table = document.createElement("table");
                            table.id = assetType + "Tbl";
                            var items = this._getFiles(["internal", "assets", assetType], this._vishvaFiles);
                            this._updateAssetTable(table, assetType, items);
                            div.appendChild(table);
                            document.body.appendChild(div);
                            var assetDiag = new gui.VDialog(div.id, assetType, gui.DialogMgr.centerBottom, "95%", "auto");
                            return assetDiag;
                        };
                        InternalAssetsUI.prototype._getFiles = function (path, files) {
                            for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
                                var file = files_1[_i];
                                if (file instanceof Object) {
                                    if (file["d"] == path[0]) {
                                        if (path.length > 1) {
                                            path.splice(0, 1);
                                            return this._getFiles(path, file["f"]);
                                        }
                                        else
                                            return file["f"];
                                    }
                                }
                            }
                            return files;
                        };
                        InternalAssetsUI.prototype._updateAssetTable = function (tbl, assetType, items) {
                            var _this = this;
                            if (tbl.rows.length > 0) {
                                return;
                            }
                            var f = function (e) { return _this._onAssetImgClick(e); };
                            var row = tbl.insertRow();
                            for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
                                var item = items_1[_i];
                                var img = document.createElement("img");
                                img.id = item["d"];
                                var name_1 = item["d"];
                                img.src = "vishva/internal/assets/" + assetType + "/" + name_1 + "/" + name_1 + ".jpg";
                                img.setAttribute("style", gui.VishvaGUI.SMALL_ICON_SIZE + "cursor:pointer;");
                                img.className = assetType;
                                img.onclick = f;
                                var cell = row.insertCell();
                                cell.appendChild(img);
                            }
                            var row2 = tbl.insertRow();
                            for (var _a = 0, items_2 = items; _a < items_2.length; _a++) {
                                var item = items_2[_a];
                                var cell_1 = row2.insertCell();
                                cell_1.innerText = item["d"];
                            }
                        };
                        InternalAssetsUI.prototype._onAssetImgClick = function (e) {
                            var i = e.target;
                            if (i.className === "skyboxes") {
                                this._vishva.setSky(i.id);
                            }
                            else if (i.className === "primitives") {
                                this._vishva.addPrim(i.id);
                            }
                            else if (i.className === "water") {
                                this._vishva.createWater();
                            }
                            else {
                                this._vishva.loadAsset(i.className, i.id);
                            }
                            return true;
                        };
                        return InternalAssetsUI;
                    }());
                    gui.InternalAssetsUI = InternalAssetsUI;
                })(gui = vishva_4.gui || (vishva_4.gui = {}));
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
            (function (vishva_5) {
                var gui;
                (function (gui) {
                    /**
                     * Provides UI to manage an Item(mesh) properties
                     */
                    var ItemPropsUI = (function () {
                        function ItemPropsUI(vishva, vishvaGUI) {
                            var _this = this;
                            //private _snaUI:SnaUI;
                            this._propsDiag = null;
                            this._fixingDragIssue = false;
                            this._activePanel = -1;
                            /*
                             * called by vishva when editcontrol
                             * is switched from another mesh
                             */
                            this.refreshingPropsDiag = false;
                            this._vishva = vishva;
                            this._vishvaGUI = vishvaGUI;
                            var propsAcc = $("#propsAcc");
                            propsAcc.accordion({
                                animate: 100,
                                heightStyle: "content",
                                collapsible: true,
                                activate: function () {
                                    _this._activePanel = propsAcc.accordion("option", "active");
                                },
                                beforeActivate: function (e, ui) {
                                    _this.refreshPanel(_this.getPanelIndex(ui.newHeader));
                                }
                            });
                            //property dialog box
                            this._propsDiag = $("#propsDiag");
                            var dos = {
                                autoOpen: false,
                                resizable: false,
                                position: gui.DialogMgr.leftCenter,
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
                                    if (!_this._fixingDragIssue) {
                                        // refresh the active tab
                                        _this._activePanel = propsAcc.accordion("option", "active");
                                        _this.refreshPanel(_this._activePanel);
                                        _this.refreshingPropsDiag = false;
                                    }
                                    else {
                                        _this._fixingDragIssue = false;
                                    }
                                },
                                closeText: "",
                                close: function () {
                                    if (_this._vishvaGUI.resizing)
                                        return;
                                    if (!_this._fixingDragIssue && !_this.refreshingPropsDiag) {
                                        if ((_this._generalUI._snaUI != null) && _this._generalUI._snaUI.isOpen()) {
                                            _this._generalUI._snaUI.close();
                                        }
                                        if ((_this._materialUI != null) && (_this._materialUI._textureUI != null) && _this._materialUI._textureUI.isOpen()) {
                                            _this._materialUI._textureUI.close();
                                        }
                                    }
                                },
                                //after drag the dialog box doesnot resize
                                //force resize by closing and opening
                                dragStop: function (e, ui) {
                                    _this._fixingDragIssue = true;
                                    _this._propsDiag.dialog("close");
                                    _this._propsDiag.dialog("open");
                                }
                            };
                            this._propsDiag.dialog(dos);
                            this._propsDiag["jpo"] = gui.DialogMgr.leftCenter;
                            this._vishvaGUI.dialogs.push(this._propsDiag);
                        }
                        ItemPropsUI.prototype.open = function () {
                            this._propsDiag.dialog("open");
                        };
                        ItemPropsUI.prototype.isOpen = function () {
                            return this._propsDiag.dialog("isOpen");
                        };
                        ItemPropsUI.prototype.close = function () {
                            this._propsDiag.dialog("close");
                        };
                        ItemPropsUI.prototype.refreshPropsDiag = function () {
                            if ((this._propsDiag === undefined) || (this._propsDiag === null))
                                return;
                            if (this._propsDiag.dialog("isOpen") === true) {
                                this.refreshingPropsDiag = true;
                                this._propsDiag.dialog("close");
                                this._propsDiag.dialog("open");
                            }
                        };
                        //only refresh if general panel is active;
                        ItemPropsUI.prototype.refreshGeneralPanel = function () {
                            if (this._activePanel === 0 /* General */)
                                this.refreshPropsDiag();
                        };
                        ItemPropsUI.prototype.getPanelIndex = function (ui) {
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
                        ItemPropsUI.prototype.refreshPanel = function (panelIndex) {
                            if (panelIndex === 0 /* General */) {
                                if (this._generalUI == null)
                                    this._generalUI = new gui.GeneralUI(this._vishva, this._vishvaGUI);
                                this._generalUI._updateGeneral();
                            }
                            else if (panelIndex === 3 /* Lights */) {
                                if (this._lightUI == null)
                                    this._lightUI = new gui.LightUI(this._vishva);
                                this._lightUI._updateLight();
                            }
                            else if (panelIndex === 4 /* Animations */) {
                                if (this._animationUI == null)
                                    this._animationUI = new gui.AnimationUI(this._vishva);
                                this._animationUI._updateAnimations();
                            }
                            else if (panelIndex === 1 /* Physics */) {
                                if (this._physicsUI == null)
                                    this._physicsUI = new gui.PhysicsUI(this._vishva);
                                this._physicsUI._updatePhysics();
                            }
                            else if (panelIndex === 2 /* Material */) {
                                if (this._materialUI == null)
                                    this._materialUI = new gui.MaterialUI(this._vishva);
                                this._materialUI.updateMatUI();
                            }
                            //refresh sNaDialog if open
                            if (this._generalUI._snaUI != null && this._generalUI._snaUI.isOpen()) {
                                this._generalUI._snaUI.close();
                                this._generalUI._snaUI.show_sNaDiag();
                            }
                        };
                        return ItemPropsUI;
                    }());
                    gui.ItemPropsUI = ItemPropsUI;
                })(gui = vishva_5.gui || (vishva_5.gui = {}));
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
            (function (vishva_6) {
                var gui;
                (function (gui) {
                    /*
                     * provides a user interface which list all meshes in the scene
                     */
                    var ItemsUI = (function () {
                        function ItemsUI(vishva) {
                            var _this = this;
                            this._vishva = vishva;
                            this._updateTreeData();
                            this._itemsDiag = new gui.VTreeDialog(this._vishva, "Items in Scene", gui.DialogMgr.leftCenter, this.treeData);
                            this._itemsDiag.addTreeListener(function (f, p, l) {
                                var i = f.indexOf(",");
                                f = f.substring(0, i);
                                _this._vishva.selectMesh(f);
                            });
                            this._itemsDiag.addRefreshHandler(function () {
                                _this._itemsDiag.close();
                                _this._updateTreeData();
                                _this._itemsDiag.refresh(_this.treeData);
                                _this._itemsDiag.open();
                                return false;
                            });
                        }
                        ItemsUI.prototype.toggle = function () {
                            if (!this._itemsDiag.isOpen()) {
                                this._itemsDiag.open();
                            }
                            else {
                                this._itemsDiag.close();
                            }
                        };
                        ItemsUI.prototype._updateTreeData = function () {
                            this.treeData = new Array();
                            var items = this._vishva.getMeshList();
                            this._updateMeshChildMap(items);
                            var childs;
                            for (var _i = 0, items_3 = items; _i < items_3.length; _i++) {
                                var item = items_3[_i];
                                if (item.parent == null) {
                                    childs = this.meshChildMap[item.uniqueId];
                                    if (childs != null) {
                                        var obj = {};
                                        obj["d"] = Number(item.uniqueId).toString() + ", " + item.name;
                                        obj["f"] = new Array();
                                        this.treeData.push(obj);
                                        this._addChildren(childs, obj["f"]);
                                    }
                                    else {
                                        this.treeData.push(Number(item.uniqueId).toString() + ", " + item.name);
                                    }
                                }
                            }
                        };
                        ItemsUI.prototype._addChildren = function (children, treeData) {
                            for (var _i = 0, children_1 = children; _i < children_1.length; _i++) {
                                var child = children_1[_i];
                                var childs = this.meshChildMap[child.uniqueId];
                                if (childs != null) {
                                    var obj = {};
                                    obj["d"] = Number(child.parent.uniqueId).toString() + ", " + child.parent.name;
                                    obj["f"] = new Array();
                                    treeData.push(obj);
                                    this._addChildren(childs, obj["f"]);
                                }
                                else {
                                    treeData.push(Number(child.uniqueId).toString() + ", " + child.name);
                                }
                            }
                        };
                        ItemsUI.prototype._updateMeshChildMap = function (meshes) {
                            this.meshChildMap = {};
                            for (var _i = 0, meshes_1 = meshes; _i < meshes_1.length; _i++) {
                                var mesh = meshes_1[_i];
                                if (mesh.parent != null) {
                                    var childs = this.meshChildMap[mesh.parent.uniqueId];
                                    if (childs == null) {
                                        childs = new Array();
                                        this.meshChildMap[mesh.parent.uniqueId] = childs;
                                    }
                                    childs.push(mesh);
                                }
                            }
                        };
                        return ItemsUI;
                    }());
                    gui.ItemsUI = ItemsUI;
                })(gui = vishva_6.gui || (vishva_6.gui = {}));
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
            (function (vishva_7) {
                var gui;
                (function (gui) {
                    /**
                     * Provides UI for the Light tab in mesh properties dialog
                     */
                    var LightUI = (function () {
                        function LightUI(vishva) {
                            var _this = this;
                            this._vishva = vishva;
                            this._lightAtt = document.getElementById("lightAtt");
                            this._lightType = document.getElementById("lightType");
                            this._lightDiff = new gui.ColorPickerDiag("diffuse light", "lightDiff", "#ffffff", gui.DialogMgr.centerBottom, function (hex, hsv, rgb) {
                                _this._applyLight();
                            });
                            this._lightSpec = new gui.ColorPickerDiag("specular light", "lightSpec", "#ffffff", gui.DialogMgr.centerBottom, function (hex, hsv, rgb) {
                                _this._applyLight();
                            });
                            this._lightInten = document.getElementById("lightInten");
                            this._lightRange = document.getElementById("lightRange");
                            this._lightRadius = document.getElementById("lightAtt");
                            this._lightAngle = document.getElementById("lightAngle");
                            this._lightExp = document.getElementById("lightExp");
                            this._lightGndClr = document.getElementById("lightGndClr");
                            this._lightDirX = document.getElementById("lightDirX");
                            this._lightDirY = document.getElementById("lightDirY");
                            this._lightDirZ = document.getElementById("lightDirZ");
                            this._lightAtt.onchange = function () {
                                if (!_this._lightAtt.checked) {
                                    _this._vishva.detachLight();
                                }
                                else
                                    _this._applyLight();
                            };
                            this._lightType.onchange = function () { return _this._applyLight(); };
                            this._lightInten.onchange = function () { return _this._applyLight(); };
                            this._lightRange.onchange = function () { return _this._applyLight(); };
                            this._lightAngle.onchange = function () { return _this._applyLight(); };
                            this._lightExp.onchange = function () { return _this._applyLight(); };
                            this._lightDirX.onchange = function () { return _this._applyLight(); };
                            this._lightDirY.onchange = function () { return _this._applyLight(); };
                            this._lightDirZ.onchange = function () { return _this._applyLight(); };
                        }
                        LightUI.prototype._updateLight = function () {
                            var lightParm = this._vishva.getAttachedLight();
                            if (lightParm === null) {
                                this._lightAtt.checked = false;
                                lightParm = new vishva_7.LightParm();
                            }
                            else {
                                this._lightAtt.checked = true;
                            }
                            this._lightType.value = lightParm.type;
                            this._lightDiff.setColor(lightParm.diffuse.toHexString());
                            this._lightSpec.setColor(lightParm.specular.toHexString());
                            this._lightInten.value = Number(lightParm.intensity).toString();
                            this._lightRange.value = Number(lightParm.range).toString();
                            this._lightRadius.value = Number(lightParm.radius).toString();
                            //this.lightAngle.value = Number(lightParm.angle * 180 / Math.PI).toString();
                            this._lightAngle.value = Number(lightParm.angle).toString();
                            this._lightExp.value = Number(lightParm.exponent).toString();
                            this._lightGndClr.value = lightParm.gndClr.toHexString();
                            this._lightDirX.value = Number(lightParm.direction.x).toString();
                            this._lightDirY.value = Number(lightParm.direction.y).toString();
                            this._lightDirZ.value = Number(lightParm.direction.z).toString();
                        };
                        LightUI.prototype._applyLight = function () {
                            //            if (!this.lightAtt.checked) {
                            //                this.vishva.detachLight();
                            //                return;
                            //            }
                            if (!this._lightAtt.checked)
                                return;
                            var lightParm = new vishva_7.LightParm();
                            lightParm.type = this._lightType.value;
                            lightParm.diffuse = BABYLON.Color3.FromHexString(this._lightDiff.getColor());
                            lightParm.specular = BABYLON.Color3.FromHexString(this._lightSpec.getColor());
                            lightParm.intensity = parseFloat(this._lightInten.value);
                            lightParm.range = parseFloat(this._lightRange.value);
                            lightParm.radius = parseFloat(this._lightRadius.value);
                            lightParm.angle = parseFloat(this._lightAngle.value);
                            lightParm.direction.x = parseFloat(this._lightDirX.value);
                            lightParm.direction.y = parseFloat(this._lightDirY.value);
                            lightParm.direction.z = parseFloat(this._lightDirZ.value);
                            lightParm.exponent = parseFloat(this._lightExp.value);
                            lightParm.gndClr = BABYLON.Color3.FromHexString(this._lightGndClr.value);
                            this._vishva.attachAlight(lightParm);
                        };
                        return LightUI;
                    }());
                    gui.LightUI = LightUI;
                })(gui = vishva_7.gui || (vishva_7.gui = {}));
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
            (function (vishva_8) {
                var gui;
                (function (gui) {
                    /**
                     * Provides UI to manage a mesh material
                     * TODO : Make provision to assign new material. Currently one can only alter the material
                     */
                    var MaterialUI = (function () {
                        function MaterialUI(vishva) {
                            var _this = this;
                            console.log("mataerialUI");
                            this._vishva = vishva;
                            //visibility
                            this._matVis = document.getElementById("matVis");
                            this._matVisVal = document.getElementById("matVisVal");
                            this._matVisVal["value"] = "1.00";
                            this._matVis.oninput = function () {
                                _this._matVisVal["value"] = Number(_this._matVis.value).toFixed(2);
                                _this._vishva.setMeshVisibility(parseFloat(_this._matVis.value));
                            };
                            //material details
                            this._matCount = document.getElementById("matCount");
                            this._matIDs = document.getElementById("matIDs");
                            this._matIDs.onchange = function () {
                                _this._updateMatDetails();
                            };
                            this._matID = document.getElementById("matID");
                            this._matName = document.getElementById("matName");
                            //material color
                            this._matColType = document.getElementById("matColType");
                            this._matColType.onchange = function () {
                                var col = _this._vishva.getMeshColor(_this._matID.innerText, _this._matColType.value);
                                _this._matColDiag.setColor(col);
                            };
                            this._matColDiag = new gui.ColorPickerDiag("mesh color", "matCol", this._vishva.getMeshColor(this._matID.innerText, this._matColType.value), gui.DialogMgr.centerBottom, function (hex, hsv, rgb) {
                                var err = _this._vishva.setMeshColor(_this._matID.innerText, _this._matColType.value, hex);
                                if (err !== null)
                                    gui.DialogMgr.showAlertDiag(err);
                            });
                            //material texture
                            this._matTextType = document.getElementById("matTextType");
                            this._matTextType.onchange = function () {
                                console.log("type onchange");
                                var dtls = _this._vishva.getMatTexture(_this._matID.innerText, _this._matTextType.value);
                                _this._textID = dtls[0];
                                _this._textName = dtls[1];
                                _this._matTextImg.src = _this._textName;
                                if (_this._textName.indexOf(".tga") >= 0) {
                                    _this._matTextImg.src = _this._vishva.TGA_IMAGE;
                                }
                                else {
                                    _this._matTextImg.src = _this._textName;
                                }
                                if (_this._textID == null) {
                                    _this._matCreateText.setAttribute("style", "display:block");
                                }
                                else {
                                    _this._matCreateText.setAttribute("style", "display:none");
                                }
                            };
                            this._matTextImg = document.getElementById("matTextImg");
                            this._matTextImg.onclick = function () {
                                if (_this._textID == null) {
                                    return;
                                }
                                if (_this._textureUI == null) {
                                    _this._textureUI = new gui.TextureUI(_this._vishva);
                                }
                                _this._textureUI.setParms(_this._textID, _this._textName, _this._matTextType.value, _this._matID.innerText, _this._matTextImg);
                                _this._textureUI.open();
                            };
                            this._matCreateText = document.getElementById("matCreateText");
                            this._matCreateText.onclick = function () {
                                _this._matCreateText.setAttribute("style", "display:none");
                                _this._textID = _this._vishva.createText();
                                _this._textName = "";
                                _this._vishva.setMatTexture(_this._matID.innerText, _this._matTextType.value, _this._textID);
                                if (_this._textureUI == null) {
                                    _this._textureUI = new gui.TextureUI(_this._vishva);
                                }
                                _this._textureUI.setParms(_this._textID, _this._textName, _this._matTextType.value, _this._matID.innerText, _this._matTextImg);
                                _this._textureUI.open();
                            };
                            this.updateMatUI();
                        }
                        MaterialUI.prototype.updateMatUI = function () {
                            //set transparency(visibility)
                            this._matVis.value = Number(this._vishva.getMeshVisibility()).toString();
                            this._matVisVal["value"] = Number(this._matVis.value).toFixed(2);
                            var mn = this._vishva.getMatNames();
                            if (mn != null) {
                                this._matCount.innerText = Number(mn.length).toString();
                                gui.GuiUtils.PopulateSelect(this._matIDs, mn);
                                this._updateMatDetails();
                            }
                        };
                        MaterialUI.prototype._updateMatDetails = function () {
                            this._matID.innerText = this._matIDs.value;
                            this._matName.innerText = this._vishva.getMaterialName(this._matIDs.value);
                            this._matColDiag.setColor(this._vishva.getMeshColor(this._matIDs.value, this._matColType.value));
                            var dtls = this._vishva.getMatTexture(this._matID.innerText, this._matTextType.value);
                            this._textID = dtls[0];
                            this._textName = dtls[1];
                            this._matTextImg.src = this._textName;
                            if (this._textName.indexOf(".tga") >= 0) {
                                this._matTextImg.src = this._vishva.TGA_IMAGE;
                            }
                            else {
                                this._matTextImg.src = this._textName;
                            }
                            if (this._textID == null) {
                                this._matCreateText.setAttribute("style", "display:block");
                            }
                            else {
                                this._matCreateText.setAttribute("style", "display:none");
                            }
                            if (this._textureUI != null && this._textureUI.isOpen()) {
                                this._textureUI.setParms(this._textID, this._textName, this._matTextType.value, this._matID.innerText, this._matTextImg);
                                this._textureUI.close();
                                this._textureUI.open();
                            }
                        };
                        return MaterialUI;
                    }());
                    gui.MaterialUI = MaterialUI;
                })(gui = vishva_8.gui || (vishva_8.gui = {}));
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
            (function (vishva_9) {
                var gui;
                (function (gui) {
                    /**
                     * Provides UI for Physics tab in mesh properties dialog
                     */
                    var PhysicsUI = (function () {
                        function PhysicsUI(vishva) {
                            var _this = this;
                            this._vishva = vishva;
                            this._phyEna = document.getElementById("phyEna");
                            this._phyType = document.getElementById("phyType");
                            this._phyMass = document.getElementById("phyMass");
                            this._phyRes = document.getElementById("phyRes");
                            this._phyResVal = document.getElementById("phyResVal");
                            this._phyResVal["value"] = "0.0";
                            this._phyRes.oninput = function () {
                                _this._phyResVal["value"] = _this._formatValue(_this._phyRes.value);
                            };
                            this._phyFric = document.getElementById("phyFric");
                            this._phyFricVal = document.getElementById("phyFricVal");
                            this._phyFricVal["value"] = "0.0";
                            this._phyFric.oninput = function () {
                                _this._phyFricVal["value"] = _this._formatValue(_this._phyFric.value);
                            };
                            var phyApply = document.getElementById("phyApply");
                            var phyTest = document.getElementById("phyTest");
                            var phyReset = document.getElementById("phyReset");
                            phyApply.onclick = function (ev) {
                                _this._applyPhysics();
                                gui.DialogMgr.showAlertDiag("physics applied");
                                return false;
                            };
                            phyTest.onclick = function (ev) {
                                _this._testPhysics();
                                return false;
                            };
                            phyReset.onclick = function (ev) {
                                _this._resetPhysics();
                                return false;
                            };
                        }
                        PhysicsUI.prototype._formatValue = function (val) {
                            if (val === "1")
                                return "1.0";
                            if (val === "0")
                                return "0.0";
                            return val;
                        };
                        PhysicsUI.prototype._updatePhysics = function () {
                            var phyParms = this._vishva.getMeshPickedPhyParms();
                            if (phyParms !== null) {
                                this._phyEna.setAttribute("checked", "true");
                                this._phyType.value = Number(phyParms.type).toString();
                                this._phyMass.value = Number(phyParms.mass).toString();
                                this._phyRes.value = Number(phyParms.restitution).toString();
                                this._phyResVal["value"] = this._formatValue(this._phyRes.value);
                                this._phyFric.value = Number(phyParms.friction).toString();
                                this._phyFricVal["value"] = this._formatValue(this._phyFric.value);
                            }
                            else {
                                this._phyEna.checked = false;
                                //by default lets set the type to "box"
                                this._phyType.value = "2";
                                this._phyMass.value = "1";
                                this._phyRes.value = "0";
                                this._phyResVal["value"] = "0.0";
                                this._phyFric.value = "0";
                                this._phyFricVal["value"] = "0.0";
                            }
                        };
                        PhysicsUI.prototype._applyPhysics = function () {
                            var phyParms;
                            if (this._phyEna.checked) {
                                phyParms = new vishva_9.PhysicsParm();
                                phyParms.type = parseInt(this._phyType.value);
                                phyParms.mass = parseFloat(this._phyMass.value);
                                phyParms.restitution = parseFloat(this._phyRes.value);
                                phyParms.friction = parseFloat(this._phyFric.value);
                            }
                            else {
                                phyParms = null;
                            }
                            this._vishva.setMeshPickedPhyParms(phyParms);
                        };
                        PhysicsUI.prototype._testPhysics = function () {
                            var phyParms;
                            phyParms = new vishva_9.PhysicsParm();
                            phyParms.type = parseInt(this._phyType.value);
                            phyParms.mass = parseFloat(this._phyMass.value);
                            phyParms.restitution = parseFloat(this._phyRes.value);
                            phyParms.friction = parseFloat(this._phyFric.value);
                            this._vishva.testPhysics(phyParms);
                        };
                        PhysicsUI.prototype._resetPhysics = function () {
                            this._vishva.resetPhysics();
                            /* End of Mesh Properties              */
                        };
                        return PhysicsUI;
                    }());
                    gui.PhysicsUI = PhysicsUI;
                })(gui = vishva_9.gui || (vishva_9.gui = {}));
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
            (function (vishva_10) {
                var gui;
                (function (gui) {
                    /**
                     * provide ui to manage world/user settings/preferences
                     */
                    var SettingsUI = (function () {
                        //TODO pass property dialog instead of VishvaGUI
                        function SettingsUI(vishva, vishvaGUI) {
                            var _this = this;
                            this.enableToolTips = true;
                            this._vishva = vishva;
                            this._vishvaGUI = vishvaGUI;
                            this._settingDiag = new gui.VDialog("settingDiag", "Settings", gui.DialogMgr.rightCenter, "", "", 350);
                            this._camCol = $("#camCol");
                            this._autoEditMenu = $("#autoEditMenu");
                            this._showToolTips = $("#showToolTips");
                            this._showInvis = $("#showInvis");
                            this._showDisa = $("#showDisa");
                            this._snapper = $("#snapper");
                            var dboSave = {};
                            dboSave.text = "save";
                            dboSave.click = function (e) {
                                _this._vishva.enableCameraCollision(_this._camCol.prop("checked"));
                                _this._vishva.enableAutoEditMenu(_this._autoEditMenu.prop("checked"));
                                _this.enableToolTips = _this._showToolTips.prop("checked");
                                if (_this._showInvis.prop("checked")) {
                                    _this._vishva.showAllInvisibles();
                                }
                                else {
                                    _this._vishva.hideAllInvisibles();
                                }
                                if (_this._showDisa.prop("checked")) {
                                    _this._vishva.showAllDisabled();
                                }
                                else {
                                    _this._vishva.hideAllDisabled();
                                }
                                var err = _this._vishva.snapper(_this._snapper.prop("checked"));
                                if (err != null) {
                                    gui.DialogMgr.showAlertDiag(err);
                                    return false;
                                }
                                _this._settingDiag.close();
                                //DialogMgr.showAlertDiag("Saved");
                                //refresh the property dialog in case something changed here
                                //TODO pass props dialog 
                                _this._vishvaGUI.refreshPropsDiag();
                                return true;
                            };
                            var dboCancel = {};
                            dboCancel.text = "Cancel";
                            dboCancel.click = function (e) {
                                _this._settingDiag.close();
                                return true;
                            };
                            var dbos = [dboSave, dboCancel];
                            this._settingDiag.setButtons(dbos);
                        }
                        SettingsUI.prototype._updateSettings = function () {
                            this._camCol.prop("checked", this._vishva.isCameraCollisionOn());
                            this._autoEditMenu.prop("checked", this._vishva.isAutoEditMenuOn());
                            this._showToolTips.prop("checked", this.enableToolTips);
                        };
                        SettingsUI.prototype.toggle = function () {
                            if (!this._settingDiag.isOpen()) {
                                this._updateSettings();
                                this._settingDiag.open();
                            }
                            else {
                                this._settingDiag.close();
                            }
                        };
                        return SettingsUI;
                    }());
                    gui.SettingsUI = SettingsUI;
                })(gui = vishva_10.gui || (vishva_10.gui = {}));
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
            (function (vishva_11) {
                var gui;
                (function (gui) {
                    /**
                     * Provides a UI to manage sensors and actuators
                     */
                    var SnaUI = (function () {
                        function SnaUI(vishva, vishvaGUI) {
                            this.STATE_IND = "state";
                            this._vishva = vishva;
                            this._vishvaGUI = vishvaGUI;
                        }
                        //        public open(){
                        //            this.sNaDialog.dialog("open");
                        //        }
                        SnaUI.prototype.isOpen = function () {
                            return this.sNaDialog.dialog("isOpen");
                        };
                        SnaUI.prototype.close = function () {
                            this.sNaDialog.dialog("close");
                        };
                        /*
                         * A dialog box to show the list of available sensors
                         * actuators, each in seperate tabs
                         */
                        SnaUI.prototype.create_sNaDiag = function () {
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
                            this.sNaDialog["jpo"] = gui.DialogMgr.center;
                            this._vishvaGUI.dialogs.push(this.sNaDialog);
                            this.sensSel = document.getElementById("sensSel");
                            this.actSel = document.getElementById("actSel");
                            var sensors = this._vishva.getSensorList();
                            var actuators = this._vishva.getActuatorList();
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
                        SnaUI.prototype.show_sNaDiag = function () {
                            var _this = this;
                            var sens = this._vishva.getSensors();
                            if (sens == null) {
                                gui.DialogMgr.showAlertDiag("no mesh selected");
                                return;
                            }
                            var acts = this._vishva.getActuators();
                            if (acts == null) {
                                gui.DialogMgr.showAlertDiag("no mesh selected");
                                return;
                            }
                            if (this.sNaDialog == null)
                                this.create_sNaDiag();
                            //this.vishva.switchDisabled=true;
                            this.updateSensActTbl(sens, this.sensTbl);
                            this.updateSensActTbl(acts, this.actTbl);
                            var addSens = document.getElementById("addSens");
                            addSens.onclick = function (e) {
                                var s = _this.sensSel.item(_this.sensSel.selectedIndex);
                                var sensor = s.value;
                                _this._vishva.addSensorbyName(sensor);
                                _this.updateSensActTbl(_this._vishva.getSensors(), _this.sensTbl);
                                _this.sNaDialog.dialog("close");
                                _this.sNaDialog.dialog("open");
                                return true;
                            };
                            var addAct = document.getElementById("addAct");
                            addAct.onclick = function (e) {
                                var a = _this.actSel.item(_this.actSel.selectedIndex);
                                var actuator = a.value;
                                _this._vishva.addActuaorByName(actuator);
                                _this.updateSensActTbl(_this._vishva.getActuators(), _this.actTbl);
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
                        SnaUI.prototype.updateSensActTbl = function (sensAct, tbl) {
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
                                    _this._vishva.removeSensorActuator(el["sa"]);
                                    return true;
                                };
                            }
                        };
                        SnaUI.prototype.createEditSensDiag = function () {
                            var _this = this;
                            this.editSensDiag = $("#editSensDiag");
                            var dos = {};
                            dos.autoOpen = false;
                            dos.modal = true;
                            dos.resizable = false;
                            dos.width = "auto";
                            dos.title = "Edit Sensor";
                            dos.closeText = "";
                            dos.closeOnEscape = false;
                            dos.open = function () {
                                _this._vishva.disableKeys();
                            };
                            dos.close = function () {
                                _this._vishva.enableKeys();
                            };
                            this.editSensDiag.dialog(dos);
                        };
                        /*
                        * show a dialog box to edit sensor properties
                        * dynamically creates an appropriate form.
                        *
                        */
                        SnaUI.prototype.showEditSensDiag = function (sensor) {
                            var _this = this;
                            var sensNameEle = document.getElementById("editSensDiag.sensName");
                            sensNameEle.innerHTML = sensor.getName();
                            if (this.editSensDiag == null)
                                this.createEditSensDiag();
                            this.editSensDiag.dialog("open");
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
                                sensor.handlePropertiesChange();
                                _this.updateSensActTbl(_this._vishva.getSensors(), _this.sensTbl);
                                _this.editSensDiag.dialog("close");
                                return true;
                            };
                            var dbos = [dbo];
                            this.editSensDiag.dialog("option", "buttons", dbos);
                        };
                        SnaUI.prototype.createEditActDiag = function () {
                            var _this = this;
                            this.editActDiag = $("#editActDiag");
                            var dos = {};
                            dos.autoOpen = false;
                            dos.modal = true;
                            dos.resizable = false;
                            dos.width = "auto";
                            dos.title = "Edit Actuator";
                            dos.closeText = "";
                            dos.closeOnEscape = false;
                            dos.open = function (e, ui) {
                                _this._vishva.disableKeys();
                            };
                            dos.close = function (e, ui) {
                                _this._vishva.enableKeys();
                            };
                            this.editActDiag.dialog(dos);
                        };
                        /*
                         * show a dialog box to edit actuator properties
                         * dynamically creates an appropriate form.
                         *
                         */
                        SnaUI.prototype.showEditActDiag = function (actuator) {
                            var _this = this;
                            var actNameEle = document.getElementById("editActDiag.actName");
                            actNameEle.innerHTML = actuator.getName();
                            if (this.editActDiag == null)
                                this.createEditActDiag();
                            this.editActDiag.dialog("open");
                            var parmDiv = document.getElementById("editActDiag.parms");
                            var node = parmDiv.firstChild;
                            if (node != null) {
                                parmDiv.removeChild(node);
                            }
                            if (actuator.getName() === "Sound") {
                                var prop = actuator.getProperties();
                                prop.soundFile.values = this._vishva.getSoundFiles();
                            }
                            var tbl = this.formCreate(actuator.getProperties(), parmDiv.id);
                            parmDiv.appendChild(tbl);
                            var dbo = {};
                            dbo.text = "save";
                            dbo.click = function (e) {
                                _this.formRead(actuator.getProperties(), parmDiv.id);
                                actuator.handlePropertiesChange();
                                _this.updateSensActTbl(_this._vishva.getActuators(), _this.actTbl);
                                _this.editActDiag.dialog("close");
                                return true;
                            };
                            var dbos = [dbo];
                            this.editActDiag.dialog("option", "buttons", dbos);
                        };
                        /*
                         * auto generate forms based on properties
                         */
                        SnaUI.prototype.formCreate = function (snaP, idPrefix) {
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
                        SnaUI.prototype.formRead = function (snaP, idPrefix) {
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
                        return SnaUI;
                    }());
                    gui.SnaUI = SnaUI;
                })(gui = vishva_11.gui || (vishva_11.gui = {}));
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
            (function (vishva_12) {
                var gui;
                (function (gui) {
                    /**
                     * Provides a UI to manage texture of a material
                     * TODO : should be closed or refreshed when mesh switched or deselected
                     */
                    var TextureUI = (function () {
                        function TextureUI(vishva) {
                            var _this = this;
                            this._vishva = vishva;
                            this._textureDiag = new gui.VDialog("textureDiag", "Texture", gui.DialogMgr.centerBottom);
                            this._textureImg = document.getElementById("textImg");
                            this._textIDEle = document.getElementById("textID");
                            this._textType = document.getElementById("textType");
                            this._textImgSrc = document.getElementById("textImgSrc");
                            this._matHScale = document.getElementById("matHScale");
                            this._matHScale.onchange = function () {
                                _this._vishva.setTextHScale(_this._textID, Number(_this._matHScale.value));
                            };
                            this._matVScale = document.getElementById("matVScale");
                            this._matVScale.onchange = function () {
                                _this._vishva.setTextVScale(_this._textID, Number(_this._matVScale.value));
                            };
                            this._matRot = document.getElementById("matRot");
                            this._matRot.oninput = function () {
                                _this._vishva.setTextRot(_this._textID, Number(_this._matRot.value));
                            };
                            this._matHO = document.getElementById("matHO");
                            this._matHO.oninput = function () {
                                _this._vishva.setTextHO(_this._textID, Number(_this._matHO.value));
                            };
                            this._matVO = document.getElementById("matVO");
                            this._matVO.oninput = function () {
                                _this._vishva.setTextVO(_this._textID, Number(_this._matVO.value));
                            };
                            var chgTexture = document.getElementById("changeTexture");
                            chgTexture.onclick = function () {
                                if (_this._textListDiag == null) {
                                    _this._textListDiag = new gui.VTreeDialog(_this._vishva, "select texture", gui.DialogMgr.center, _this._vishva.vishvaFiles, "\.jpg$|\.png$|\.tga$|\.bmp$", true);
                                    _this._textListDiag.addTreeListener(function (f, p, l) {
                                        if (!l)
                                            return;
                                        var imgsrc = "vishva/" + p + f;
                                        _this._vishva.setTextURL(_this._textID, imgsrc);
                                        _this._textName = imgsrc;
                                        _this._textImgSrc.innerText = imgsrc;
                                        if (imgsrc.indexOf(".tga") >= 0) {
                                            imgsrc = _this._vishva.TGA_IMAGE;
                                        }
                                        _this._textureImg.src = imgsrc;
                                        _this._matTextImg.src = imgsrc;
                                    });
                                    _this._textListDiag.setModal(true);
                                }
                                _this._textListDiag.open();
                            };
                        }
                        TextureUI.prototype.update = function () {
                            this._matHScale.value = this._vishva.getTextHScale(this._textID);
                            this._matVScale.value = this._vishva.getTextVScale(this._textID);
                            this._matRot.value = this._vishva.getTextRot(this._textID);
                            this._matHO.value = this._vishva.getTextHO(this._textID);
                            this._matVO.value = this._vishva.getTextVO(this._textID);
                        };
                        TextureUI.prototype.open = function () {
                            this._textureDiag.open();
                        };
                        TextureUI.prototype.isOpen = function () {
                            return this._textureDiag.isOpen();
                        };
                        TextureUI.prototype.close = function () {
                            this._textureDiag.close();
                        };
                        TextureUI.prototype.setParms = function (textID, textName, textType, matdId, matTextImg) {
                            this._textID = textID;
                            this._textIDEle.innerText = textID;
                            this._textName = textName;
                            this._textImgSrc.innerText = textName;
                            this._textType.innerText = textType;
                            this._matID = matdId;
                            this._matTextImg = matTextImg;
                            this._textureImg.src = this._matTextImg.src;
                            this.update();
                        };
                        return TextureUI;
                    }());
                    gui.TextureUI = TextureUI;
                })(gui = vishva_12.gui || (vishva_12.gui = {}));
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
            (function (vishva_13) {
                var gui;
                (function (gui) {
                    var VishvaGUI = (function () {
                        function VishvaGUI(vishva) {
                            var _this = this;
                            this.local = true;
                            this.menuBarOn = true;
                            /**
                             * this array will be used store all dialogs whose position needs to be
                             * reset on window resize
                             */
                            this.dialogs = new Array();
                            /**
                             * resposition all dialogs to their original default postions without this,
                             * a window resize could end up moving some dialogs outside the window and
                             * thus make them disappear
                             * the default position of each dialog will be stored in a new property called "jpo"
                             * this would be created whenever/wherever the dialog is defined
                             *
                             * @param evt
                             */
                            this.resizing = false;
                            this._vishva = vishva;
                            this.setSettings();
                            $(document).tooltip({
                                open: function (event, ui) {
                                    if (!_this._settingDiag.enableToolTips) {
                                        ui.tooltip.stop().remove();
                                    }
                                }
                            });
                            //when user is typing into ui inputs we donot want keys influencing editcontrol or av movement
                            $("input").on("focus", function () { _this._vishva.disableKeys(); });
                            $("input").on("blur", function () { _this._vishva.enableKeys(); });
                            //main navigation menu 
                            this.createNavMenu();
                            gui.DialogMgr.createAlertDiag();
                            window.addEventListener("resize", function (evt) { return _this.onWindowResize(evt); });
                        }
                        VishvaGUI.prototype.onWindowResize = function (evt) {
                            for (var _i = 0, _a = this.dialogs; _i < _a.length; _i++) {
                                var jq = _a[_i];
                                var jpo = jq["jpo"];
                                if (jpo != null) {
                                    jq.dialog("option", "position", jpo);
                                    var open = jq.dialog("isOpen");
                                    if (open) {
                                        this.resizing = true;
                                        jq.dialog("close");
                                        jq.dialog("open");
                                        this.resizing = false;
                                    }
                                }
                            }
                            for (var _b = 0, _c = gui.DialogMgr.dialogs; _b < _c.length; _b++) {
                                var diag = _c[_b];
                                diag.position();
                                if (diag.isOpen()) {
                                    this.resizing = true;
                                    diag.close();
                                    diag.open();
                                    this.resizing = false;
                                }
                            }
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
                            //              add menu sliding setup
                            //            var slideDown: any=JSON.parse("{\            "direction\":\"up\"}");
                            //            var navAdd: HTMLElement=document.ge            tElementById("navAdd");
                            //            var addMenu            : JQuery=$("#AddMenu");
                            //                        addMenu.menu();
                            //                        addMenu.hide(null);
                            //                        navAdd.onclick=(e) => {
                            //                            if(this.firstTime) {
                            //                    var jpo:             JQueryPositionOptions={
                            //                                    my: "left top",
                            //                                    at: "left bottom",
                            //                                    of: navAdd
                            //                    };
                            //                    addMen            u.menu().position(jpo);
                            //                                this.firstTime=fal            se;
                            //                }
                            //                            if(this.addMenuOn) {
                            //                    addMenu.menu().hide(            "slide",slideDown,100);
                            //                            } else {
                            //                    addMenu.show(            "slide",slideDown,10            0);
                            //                }
                            //                this.add            MenuOn=!this.addMenuOn;
                            //                $(document)            .one("click",(jqe) => {
                            //                                if(this.addMenuOn) {
                            //                        addMenu.menu().hide(            "slide",slideDown,100);
                            //                                    this.addMenuOn=false;
                            //                    }
                            //                                return true            ;
                            //                });
                            //                            e.cancelBubble=true;
                            //                            return true;
                            //                        };
                            var navAdd = document.getElementById("navAdd");
                            navAdd.onclick = function (e) {
                                if (_this._addAssetTDiag == null) {
                                    _this._addAssetTDiag = new gui.VTreeDialog(_this._vishva, "Assets", gui.DialogMgr.leftCenter, _this._vishva.vishvaFiles, "\.babylon$|\.glb$", false);
                                    _this._addAssetTDiag.addTreeListener(function (f, p, l) {
                                        if (l)
                                            _this._vishva.loadAsset2(p, f);
                                    });
                                }
                                _this._addAssetTDiag.toggle();
                            };
                            var navPrim = document.getElementById("navPrim");
                            navPrim.onclick = function () {
                                if (_this._addInternalAssetUI == null) {
                                    _this._addInternalAssetUI = new gui.InternalAssetsUI(_this._vishva, _this._vishva.vishvaFiles);
                                }
                                _this._addInternalAssetUI.toggleAssetDiag("primitives");
                            };
                            var downWorld = document.getElementById("downWorld");
                            downWorld.onclick = function (e) {
                                var downloadURL = _this._vishva.saveWorld();
                                if (downloadURL == null)
                                    return true;
                                if (_this._downloadDialog == null)
                                    _this._createDownloadDiag();
                                _this._downloadLink.href = downloadURL;
                                _this._downloadDialog.dialog("open");
                                return false;
                            };
                            var navItems = document.getElementById("navItems");
                            navItems.onclick = function (e) {
                                if (_this._items2 == null) {
                                    _this._items2 = new gui.ItemsUI(_this._vishva);
                                }
                                _this._items2.toggle();
                                return false;
                            };
                            var navEnv = document.getElementById("navEnv");
                            navEnv.onclick = function (e) {
                                if (_this._environment == null) {
                                    if (_this._addInternalAssetUI == null) {
                                        _this._addInternalAssetUI = new gui.InternalAssetsUI(_this._vishva, _this._vishva.vishvaFiles);
                                    }
                                    _this._environment = new gui.EnvironmentUI(_this._vishva, _this._addInternalAssetUI);
                                }
                                _this._environment.toggle();
                                return false;
                            };
                            var navEdit = document.getElementById("navEdit");
                            navEdit.onclick = function (e) {
                                if ((_this._itemProps != null) && (_this._itemProps.isOpen())) {
                                    _this._itemProps.close();
                                }
                                else {
                                    _this.showPropDiag();
                                }
                                return false;
                            };
                            var navSettings = document.getElementById("navSettings");
                            navSettings.onclick = function (e) {
                                _this._settingDiag.toggle();
                                return false;
                            };
                            var helpLink = document.getElementById("helpLink");
                            var helpDiag = null;
                            helpLink.onclick = function (e) {
                                if (helpDiag == null) {
                                    helpDiag = new gui.VDialog("helpDiv", "Help", gui.DialogMgr.center, "", "", 500);
                                }
                                helpDiag.toggle();
                                return true;
                            };
                            var debugLink = document.getElementById("debugLink");
                            debugLink.onclick = function (e) {
                                _this._vishva.toggleDebug();
                                return true;
                            };
                        };
                        /*
                         * called by vishva when editcontrol
                         * is attached to mesh
                         */
                        VishvaGUI.prototype.showPropDiag = function () {
                            if (!this._vishva.anyMeshSelected()) {
                                gui.DialogMgr.showAlertDiag("no mesh selected");
                                return;
                            }
                            if (this._itemProps == null) {
                                this._itemProps = new gui.ItemPropsUI(this._vishva, this);
                            }
                            this._itemProps.open();
                            return true;
                        };
                        /*
                         * called by vishva when editcontrol
                         * is removed from mesh
                         */
                        VishvaGUI.prototype.handeEditControlClose = function () {
                            if (this._items2 != null) {
                            }
                            if (this._itemProps != null)
                                this._itemProps.close();
                        };
                        /*
                         * called by vishva when editcontrol
                         * is switched from another mesh
                         */
                        VishvaGUI.prototype.refreshPropsDiag = function () {
                            if (this._itemProps != null)
                                this._itemProps.refreshPropsDiag();
                        };
                        //called when user has changed transforms using editcontrol
                        VishvaGUI.prototype.handleTransChange = function () {
                            if (this._itemProps != null)
                                this._itemProps.refreshGeneralPanel();
                        };
                        VishvaGUI.prototype.getSettings = function () {
                            var guiSettings = new GuiSettings();
                            guiSettings.enableToolTips = this._settingDiag.enableToolTips;
                            return guiSettings;
                        };
                        VishvaGUI.prototype.setSettings = function () {
                            if (this._settingDiag == null) {
                                this._settingDiag = new gui.SettingsUI(this._vishva, this);
                            }
                            var guiSettings = this._vishva.getGuiSettings();
                            if (guiSettings !== null)
                                this._settingDiag.enableToolTips = guiSettings.enableToolTips;
                        };
                        VishvaGUI.prototype._createDownloadDiag = function () {
                            this._downloadLink = document.getElementById("downloadLink");
                            this._downloadDialog = $("#saveDiv");
                            this._downloadDialog.dialog();
                            this._downloadDialog.dialog("close");
                        };
                        VishvaGUI.prototype._createUploadDiag = function () {
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
                                    _this._vishva.loadAssetFile(file);
                                    _this._loadDialog.dialog("close");
                                    return true;
                                };
                            })(loadFileInput);
                            this._loadDialog = $("#loadDiv");
                            this._loadDialog.dialog();
                            this._loadDialog.dialog("close");
                        };
                        VishvaGUI.LARGE_ICON_SIZE = "width:128px;height:128px;";
                        VishvaGUI.SMALL_ICON_SIZE = "width:64px;height:64px;";
                        return VishvaGUI;
                    }());
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
                })(gui = vishva_13.gui || (vishva_13.gui = {}));
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
                var gui;
                (function (gui) {
                    /**
                     * Creates an expandable/collapsible tree
                     */
                    var VTree = (function () {
                        function VTree(treeEle, treeData, filter, open) {
                            if (open === void 0) { open = false; }
                            //        private _closeIcon:string="ui-icon ui-icon-circle-triangle-e";
                            //        private _openIcon:string="ui-icon ui-icon-circle-triangle-s";
                            //        private _leafIcon:string="ui-icon ui-icon-blank";
                            //        
                            this._closeIcon = "ui-icon ui-icon-folder-collapsed";
                            this._openIcon = "ui-icon ui-icon-folder-open";
                            this._leafIcon = "ui-icon ui-icon-document";
                            this._clickListener = null;
                            if (treeEle instanceof HTMLDivElement) {
                                this._treeEle = treeEle;
                            }
                            else {
                                this._treeEle = document.getElementById(treeEle);
                            }
                            if (this._treeEle == null) {
                                console.error("Unable to locate element " + treeEle);
                                return;
                            }
                            this._treeData = treeData;
                            this._filter = filter;
                            this._open = open;
                            //delete any existing tree
                            var childULs = this._treeEle.getElementsByTagName("ul");
                            for (var i = 0; i < childULs.length; i++) {
                                if (childULs.item(i).id == "vtree") {
                                    this._treeEle.removeChild(childULs.item(i));
                                }
                            }
                            //create a new one
                            this._create();
                        }
                        VTree.prototype.addClickListener = function (clickListener) {
                            if (clickListener === void 0) { clickListener = null; }
                            this._clickListener = clickListener;
                        };
                        VTree.prototype.refresh = function (treeData, filter) {
                            this._treeEle.removeChild(this._vtree);
                            this._treeData = treeData;
                            this._filter = filter;
                            this._create();
                        };
                        VTree.prototype.filter = function (filter) {
                            if (filter.length == 0) {
                                this._showAll();
                                return;
                            }
                            this._hideAll();
                            var lis = this._vtree.getElementsByClassName("treeFile");
                            for (var i = 0; i < lis.length; i++) {
                                var t = lis.item(i).childNodes[1].textContent;
                                if (t.indexOf(filter) >= 0) {
                                    lis.item(i).setAttribute("style", "display:block");
                                    this._openParent(lis.item(i));
                                }
                            }
                        };
                        VTree.prototype._hideAll = function () {
                            var lis = this._vtree.getElementsByTagName("li");
                            for (var i = 0; i < lis.length; i++) {
                                lis.item(i).setAttribute("style", "display:none");
                            }
                        };
                        VTree.prototype._showAll = function () {
                            var e;
                            e = this._vtree.getElementsByTagName("li");
                            for (var i = 0; i < e.length; i++) {
                                e.item(i).setAttribute("style", "display:block");
                            }
                            e = this._vtree.getElementsByTagName("ul");
                            for (var i = 0; i < e.length; i++) {
                                e.item(i).setAttribute("class", "show");
                            }
                            e = this._vtree.getElementsByClassName("treeFolderClose");
                            for (var i = e.length - 1; i >= 0; i--) {
                                e.item(i).setAttribute("class", "treeFolderClose");
                            }
                        };
                        VTree.prototype._openParent = function (e) {
                            while (e.parentElement != this._vtree) {
                                if (e.parentElement instanceof HTMLUListElement) {
                                    e.parentElement.setAttribute("class", "show");
                                    e.parentElement.parentElement.setAttribute("class", "treeFolderOpen");
                                    e.parentElement.parentElement.setAttribute("style", "display:block");
                                    e.parentElement.parentElement.firstElementChild.setAttribute("class", this._openIcon);
                                }
                                e = e.parentElement;
                            }
                        };
                        VTree.prototype.expandAll = function () {
                            var nl;
                            //NOTE 
                            //the for loop is descending.
                            //This is because NodeListAll returned by getElementsByClassName is "live"
                            //If the class is changed then the list of elements also change immediately
                            //so for example the e.length will keep change with each itertaion in the loop
                            nl = this._vtree.getElementsByClassName("treeFolderClose");
                            for (var i = nl.length - 1; i >= 0; i--) {
                                nl.item(i).setAttribute("class", "treeFolderOpen");
                            }
                            nl = this._vtree.getElementsByClassName("hide");
                            for (var i = nl.length - 1; i >= 0; i--) {
                                nl.item(i).setAttribute("class", "show");
                            }
                            nl = this._vtree.getElementsByClassName(this._closeIcon);
                            for (var i = nl.length - 1; i >= 0; i--) {
                                nl.item(i).setAttribute("class", this._openIcon);
                            }
                        };
                        VTree.prototype.collapseAll = function () {
                            var nl;
                            //NOTE 
                            //the for loop is descending.
                            //This is because NodeListAll returned by getElementsByClassName is "live"
                            //If the class is changed then the list of elements also change immediately
                            //so for example the e.length will keep change with each itertaion in the loop
                            nl = this._vtree.getElementsByClassName("treeFolderOpen");
                            for (var i = nl.length - 1; i >= 0; i--) {
                                nl.item(i).setAttribute("class", "treeFolderClose");
                            }
                            nl = this._vtree.getElementsByClassName("show");
                            for (var i = nl.length - 1; i >= 0; i--) {
                                nl.item(i).setAttribute("class", "hide");
                            }
                            nl = this._vtree.getElementsByClassName(this._openIcon);
                            for (var i = nl.length - 1; i >= 0; i--) {
                                nl.item(i).setAttribute("class", this._closeIcon);
                            }
                        };
                        VTree.prototype._create = function () {
                            var _this = this;
                            if (this._filter != null) {
                                try {
                                    this._re = new RegExp(this._filter);
                                }
                                catch (e) {
                                    console.error("invalid reqular expression " + this._filter + ". Will ignore");
                                    this._re = null;
                                }
                            }
                            else
                                this._re = null;
                            this._vtree = document.createElement("ul");
                            this._buildUL(this._vtree, this._treeData);
                            this._vtree.onclick = function (e) {
                                return _this._treeClick(e);
                            };
                            this._treeEle.appendChild(this._vtree);
                        };
                        VTree.prototype._buildUL = function (pUL, nodes) {
                            var li;
                            var span;
                            var txt;
                            var ul;
                            var icon;
                            var c1, c2;
                            if (this._open) {
                                icon = this._openIcon;
                                c1 = "treeFolderOpen";
                                c2 = "show";
                            }
                            else {
                                icon = this._closeIcon;
                                c1 = "treeFolderClose";
                                c2 = "hide";
                            }
                            for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
                                var node = nodes_1[_i];
                                li = document.createElement("li");
                                span = document.createElement("span");
                                if (typeof node == 'object') {
                                    li.setAttribute("class", c1);
                                    span.setAttribute("class", icon);
                                    span.setAttribute("style", "display:inline-block");
                                    li.appendChild(span);
                                    txt = document.createTextNode(node["d"]);
                                    li.appendChild(txt);
                                    ul = document.createElement("ul");
                                    ul.setAttribute("class", c2);
                                    li.appendChild(ul);
                                    pUL.appendChild(li);
                                    this._buildUL(ul, node["f"]);
                                }
                                else {
                                    li.setAttribute("class", "treeFile");
                                    if ((this._re != null) && (!this._re.test(node))) {
                                        li.setAttribute("style", "display:none;");
                                    }
                                    span.setAttribute("class", this._leafIcon);
                                    span.setAttribute("style", "display:inline-block");
                                    li.appendChild(span);
                                    txt = document.createTextNode(node);
                                    li.appendChild(txt);
                                    pUL.appendChild(li);
                                }
                            }
                        };
                        VTree.prototype._treeClick = function (e) {
                            var span = false;
                            var ele = e.target;
                            if (ele instanceof HTMLSpanElement) {
                                span = true;
                                ele = ele.parentElement;
                            }
                            var c = ele.getAttribute("class");
                            //if icon clicked then just expand/collapse
                            //else find what was clicked and pass that on
                            if (span) {
                                if (c == "treeFolderOpen") {
                                    ele.setAttribute("class", "treeFolderClose");
                                    ele.firstElementChild.setAttribute("class", this._closeIcon);
                                    ele.lastElementChild.setAttribute("class", "hide");
                                }
                                else if (c == "treeFolderClose") {
                                    ele.setAttribute("class", "treeFolderOpen");
                                    ele.firstElementChild.setAttribute("class", this._openIcon);
                                    ele.lastElementChild.setAttribute("class", "show");
                                }
                            }
                            else {
                                var node = null;
                                var path = "";
                                var isLeaf = false;
                                if (c == "treeFile") {
                                    isLeaf = true;
                                }
                                node = ele.childNodes[1].textContent;
                                while (ele != null) {
                                    if (ele.parentElement instanceof HTMLLIElement) {
                                        path = ele.parentElement.childNodes[1].textContent + "/" + path;
                                    }
                                    if (ele instanceof HTMLDivElement) {
                                        ele = null;
                                    }
                                    else {
                                        ele = ele.parentElement;
                                    }
                                }
                                if (this._clickListener != null) {
                                    this._clickListener(node, path, isLeaf);
                                }
                            }
                        };
                        return VTree;
                    }());
                    gui.VTree = VTree;
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
            (function (vishva_14) {
                var gui;
                (function (gui) {
                    /**
                     * Provides a UI to display a tree
                     */
                    var VTreeDialog = (function () {
                        function VTreeDialog(vishva, diagTitle, pos, treeData, filter, openAll) {
                            var _this = this;
                            this._diagHtml = 'search <input type="text">'
                                + '<button class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button"><span class="ui-button-text"><span class="ui-icon ui-icon-search" title="filter"></span></span></button>'
                                + '<hr>'
                                + '<div style="height:400px;width:100%;overflow-y:auto;border-style:solid;border-color:white;display:block">'
                                + '</div>'
                                + '<hr>'
                                + '<button class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button"><span class="ui-button-text"><span class="ui-icon ui-icon-plus" title="expand all"></span></span></button>'
                                + '<button class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button"><span class="ui-button-text"><span class="ui-icon ui-icon-minus" title="collapse all"></span></span></button>'
                                + '<button class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button"><span class="ui-button-text"><span class="ui-icon ui-icon-refresh" title="refresh"></span></span></button>';
                            this._vishva = vishva;
                            var diagDiv = document.createElement("div");
                            diagDiv.innerHTML = this._diagHtml;
                            document.body.appendChild(diagDiv);
                            var treeDiv = diagDiv.getElementsByTagName("div")[0];
                            this._treeDiag = new gui.VDialog(diagDiv, diagTitle, pos, 300);
                            this._treeDiag.setResizable(true);
                            this._tree = new gui.VTree(treeDiv, treeData, filter, openAll);
                            var fi = diagDiv.getElementsByTagName("input")[0];
                            var btns = diagDiv.getElementsByTagName("button");
                            var fb = btns.item(0);
                            var e = btns.item(1);
                            var c = btns.item(2);
                            this._refreshBtn = btns.item(3);
                            fi.onchange = function () {
                                _this._tree.filter(fi.value.trim());
                            };
                            fb.onclick = function () {
                                _this._tree.filter(fi.value.trim());
                            };
                            e.onclick = function () {
                                _this._tree.expandAll();
                            };
                            c.onclick = function () {
                                _this._tree.collapseAll();
                            };
                        }
                        VTreeDialog.prototype.addTreeListener = function (treeListener) {
                            if (treeListener === void 0) { treeListener = null; }
                            this._tree.addClickListener(treeListener);
                        };
                        VTreeDialog.prototype.addRefreshHandler = function (refreshHandler) {
                            this._refreshBtn.onclick = refreshHandler;
                        };
                        VTreeDialog.prototype.toggle = function () {
                            if (this._treeDiag.isOpen()) {
                                this._treeDiag.close();
                            }
                            else {
                                this._treeDiag.open();
                            }
                        };
                        VTreeDialog.prototype.setModal = function (b) {
                            this._treeDiag.setModal(b);
                        };
                        VTreeDialog.prototype.open = function () {
                            this._treeDiag.open();
                        };
                        VTreeDialog.prototype.isOpen = function () {
                            return this._treeDiag.isOpen();
                        };
                        VTreeDialog.prototype.close = function () {
                            this._treeDiag.close();
                        };
                        VTreeDialog.prototype.refresh = function (treeData) {
                            this._tree.refresh(treeData);
                        };
                        VTreeDialog.prototype._createHTML = function () {
                            var html = 'search <input id="srchInp" type="text">'
                                + '<button id="srchBtn" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button"><span class="ui-button-text"><span class="ui-icon ui-icon-search" title="filter"></span></span></button>'
                                + '<hr>'
                                + '<div id="tree" style="height:400px;width:100%;overflow-y:auto;border-style:solid;border-color:white;display:block">'
                                + '</div>'
                                + '<hr>'
                                + '<button id="expandAll" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button"><span class="ui-button-text"><span class="ui-icon ui-icon-plus" title="expand all"></span></span></button>'
                                + '<button id="collapseAll" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button"><span class="ui-button-text"><span class="ui-icon ui-icon-minus" title="collapse all"></span></span></button>'
                                + '<button id="treeRefresh" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button"><span class="ui-button-text"><span class="ui-icon ui-icon-refresh" title="refresh"></span></span></button>';
                            return html;
                        };
                        return VTreeDialog;
                    }());
                    gui.VTreeDialog = VTreeDialog;
                })(gui = vishva_14.gui || (vishva_14.gui = {}));
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
var org;
(function (org) {
    var ssatguru;
    (function (ssatguru) {
        var babylonjs;
        (function (babylonjs) {
            var vishva;
            (function (vishva) {
                var EditControl = org.ssatguru.babylonjs.component.EditControl;
                var CharacterController = org.ssatguru.babylonjs.component.CharacterController;
                var Animation = BABYLON.Animation;
                var ArcRotateCamera = BABYLON.ArcRotateCamera;
                var AssetsManager = BABYLON.AssetsManager;
                var Color3 = BABYLON.Color3;
                var Color4 = BABYLON.Color4;
                var CubeTexture = BABYLON.CubeTexture;
                var CSG = BABYLON.CSG;
                var DirectionalLight = BABYLON.DirectionalLight;
                var DynamicTerrain = BABYLON.DynamicTerrain;
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
                    function Vishva(sceneFile, scenePath, editEnabled, assets, vishvaFiles, canvasId) {
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
                        this.snapTransValue = 0.5;
                        this.snapRotValue = Math.PI / 4;
                        this.snapScaleValue = 0.5;
                        //outlinewidth
                        this.ow = 0.01;
                        this.spaceWorld = false;
                        this.skyboxTextures = "vishva/internal/textures/skybox-default/default";
                        this.avatarFolder = "vishva/internal/avatar/";
                        this.avatarFile = "starterAvatars.babylon";
                        this.NO_TEXTURE = "vishva/internal/textures/no-texture.jpg";
                        this.TGA_IMAGE = "vishva/internal/textures/tga-image.jpg";
                        this.groundTexture = "vishva/internal/textures/ground.jpg";
                        this.groundBumpTexture = "vishva/internal/textures/ground-normal.jpg";
                        this.groundHeightMap = "vishva/internal/textures/ground_heightMap.png";
                        this.terrainTexture = "vishva/internal/textures/earth.jpg";
                        this.terrainHeightMap = "vishva/internal/textures/worldHeightMap.jpg";
                        this.primTexture = "vishva/internal/textures/Birch.jpg";
                        this.waterTexture = "vishva/internal/textures/waterbump.png";
                        this.snowTexture = "vishva/internal/textures/flare.png";
                        this.rainTexture = "vishva/internal/textures/raindrop-1.png";
                        this.snowPart = null;
                        this.snowing = false;
                        this.rainPart = null;
                        this.raining = false;
                        this.SOUND_ASSET_LOCATION = "vishva/assets/sounds/";
                        //each asset has a name and a url
                        //the url seems to be ignored.
                        //babylonjs gets the location of the asset as below
                        //
                        //location = (home url) + (root url specified in the scene loader functions) + (asset name)
                        //
                        //if scene file name is passed as parm to the scene loader functions then root url should point to the scene file location
                        //if "data:" is used instead, then root url can point to the base url for resources.
                        //
                        //might bea good idea to load scene file directly and then just pass data to scene loader functions
                        //this way we can use different base url for scene file and resources
                        //
                        //sound is different. 
                        //location of sound file = home url + sound url
                        //
                        //RELATIVE_ASSET_LOCATION: string = "../../../../";
                        //we can use below too but then while passing data to scene loader use empty string as root url
                        this.RELATIVE_ASSET_LOCATION = "";
                        this._animBlend = 0.1;
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
                        this.fogDensity = 0;
                        //list of meshes selected in addition to the currently picked mesh
                        //doesnot include the currently picked mesh (the one with edit control)
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
                        //spawnPosition:Vector3=new Vector3(-360,620,225);
                        this.spawnPosition = new Vector3(0, 0.2, 0);
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
                        this.vishvaFiles = vishvaFiles;
                        this.key = new Key();
                        this.canvas = document.getElementById(canvasId);
                        //this.engine=new Engine(this.canvas,true,{"disableWebGL2Support":true});
                        this.engine = new Engine(this.canvas, true);
                        this.scene = new Scene(this.engine);
                        this.scene.enablePhysics();
                        //this.scene.useRightHandedSystem = true;
                        //
                        //lets make night black
                        this.scene.clearColor = new Color4(0, 0, 0, 1);
                        //set ambient to white in case user wants to bypass light conditions for some objects
                        this.scene.ambientColor = new Color3(1, 1, 1);
                        this.scene.fogColor = new BABYLON.Color3(0.9, 0.9, 0.85);
                        window.addEventListener("resize", function (event) { return _this.onWindowResize(event); });
                        window.addEventListener("keydown", function (e) { return _this.onKeyDown(e); }, false);
                        window.addEventListener("keyup", function (e) { return _this.onKeyUp(e); }, false);
                        //fix shadow and skinning issue
                        //see http://www.html5gamedevs.com/topic/31834-shadow-casted-by-mesh-with-skeleton-not-proper/ 
                        SceneLoader.CleanBoneMatrixWeights = true;
                        this.scenePath = scenePath;
                        if (sceneFile == "empty") {
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
                        //SceneLoader.Append(this.scenePath, sceneData, this.scene, (scene) => { return this.onSceneLoaded(scene) });
                        SceneLoader.Append("", sceneData, this.scene, function (scene) { return _this.onSceneLoaded(scene); });
                    };
                    Vishva.prototype.onTaskFailure = function (obj) {
                        alert("scene load failed");
                    };
                    Vishva.prototype.setShadowProperty = function (sl, shadowGenerator) {
                        //            shadowGenerator.useBlurVarianceShadowMap = true;
                        //            shadowGenerator.bias = 1.0E-6;
                        shadowGenerator.useBlurExponentialShadowMap = true;
                        //http://www.html5gamedevs.com/topic/31834-shadow-casted-by-mesh-with-skeleton-not-proper/
                        shadowGenerator.bias = -0.3;
                        //            shadowGenerator.bias = 1.0E-6;
                        //            shadowGenerator.depthScale = 2500;
                        //            sl.shadowMinZ = 1;
                        //            sl.shadowMaxZ = 2500;
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
                                    //TODO ellipsoidOffset not serialized?
                                    this.avatar.ellipsoidOffset = new Vector3(0, 1, 0);
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
                            //this.sun = new HemisphericLight("Vishva.hl01", new Vector3(0, 1, 0), this.scene);
                            this.sun = new HemisphericLight("Vishva.hl01", new Vector3(1, 1, 0), this.scene);
                            this.sun.groundColor = new Color3(0.5, 0.5, 0.5);
                            Tags.AddTagsTo(this.sun, "Vishva.sun");
                            this.sunDR = new DirectionalLight("Vishva.dl01", new Vector3(-1, -1, 0), this.scene);
                            this.sunDR.position = new Vector3(0, 1048, 0);
                            var sl = this.sunDR;
                            this.shadowGenerator = new ShadowGenerator(1024, sl);
                            this.setShadowProperty(sl, this.shadowGenerator);
                            //                this.avShadowGenerator=new ShadowGenerator(512,sl);
                            //                this.setShadowProperty(sl,this.avShadowGenerator);
                        }
                        else {
                            for (var _f = 0, _g = scene.lights; _f < _g.length; _f++) {
                                var light = _g[_f];
                                if (light.id === "Vishva.dl01") {
                                    this.sunDR = light;
                                    this.shadowGenerator = light.getShadowGenerator();
                                    var sl = this.sunDR;
                                    this.setShadowProperty(sl, this.shadowGenerator);
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
                            this.ground = this.createGround(this.scene);
                            //this.createGround_htmap(this.scene);
                            //this.creatDynamicTerrain();
                        }
                        else {
                            //in case this wasn't set in serialized scene
                            this.ground.receiveShadows = true;
                            //are physicsImpostor serialized?
                            //                if (this.enablePhysics) {
                            //                    this.ground.physicsImpostor = new BABYLON.PhysicsImpostor(this.ground, BABYLON.PhysicsImpostor.BoxImpostor, {mass: 0, restitution: 0.1}, this.scene);
                            //                }
                        }
                        if (!skyFound) {
                            console.log("no vishva sky found. creating sky");
                            this.skybox = this.createSkyBox(this.scene);
                            this.setLight(0.5);
                        }
                        if (this.scene.fogMode !== Scene.FOGMODE_EXP) {
                            this.scene.fogMode = Scene.FOGMODE_EXP;
                            this.scene.fogDensity = 0;
                        }
                        //            if(this.scene.fogMode!==Scene.FOGMODE_LINEAR) {
                        //                this.scene.fogMode=Scene.FOGMODE_LINEAR;
                        //                this.scene.fogStart=256;
                        //                this.scene.fogEnd=512;
                        //                this.scene.fogDensity=0;
                        //            }
                        if (this.editEnabled) {
                            this.scene.onPointerDown = function (evt, pickResult) { return _this.pickObject(evt, pickResult); };
                        }
                        if (!avFound) {
                            console.log("no vishva av found. creating av");
                            //remember loadAvatar is async. process
                            this.createAvatar();
                        }
                        else {
                            this.avatarSkeleton.enableBlending(this._animBlend);
                            this.cc = new CharacterController(this.avatar, this.mainCamera, this.scene);
                            //TODO remove below. The character controller should be set using deserialization
                            this.setCharacterController(this.cc);
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
                        //this.backfaceCulling(this.scene.materials);
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
                        this.sunDR.position.x = this.avatar.position.x + 100;
                        this.sunDR.position.y = this.avatar.position.y + 100;
                        this.sunDR.position.z = this.avatar.position.z + 0;
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
                            //this is now done in character controller               
                            //                if(this.mainCamera.radius<=0.75) {
                            //                    this.mainCamera.radius=0.75;
                            //                    this.avatar.visibility=0;
                            //                    this.mainCamera.checkCollisions=false;
                            //                } else {
                            //                    this.avatar.visibility=1;
                            //                    this.mainCamera.checkCollisions=this.cameraCollision;
                            //                }
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
                            //this.sunDR.position.copyFromFloats(this.avatar.position.x, 32, this.avatar.position.y);
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
                    Vishva.prototype.pickObject = function (evt, pickResult) {
                        // prevent curosr from changing to a edit caret in Chrome
                        evt.preventDefault();
                        if (!(evt.button == 2 && (this.key.alt || this.key.ctl)))
                            return;
                        //if(evt.button!==2) return;
                        if (pickResult.hit) {
                            if (this.key.ctl) {
                                if ((!this.isMeshSelected) || (pickResult.pickedMesh !== this.meshPicked)) {
                                    this.multiSelect(pickResult.pickedMesh);
                                    return;
                                }
                            }
                            // if none selected then select the one clicked
                            if (!this.isMeshSelected) {
                                this.selectForEdit(pickResult.pickedMesh);
                            }
                            else {
                                if (pickResult.pickedMesh === this.meshPicked) {
                                    if (this.key.ctl) {
                                        return;
                                    }
                                    else {
                                        // if already selected then focus on it
                                        this.setFocusOnMesh();
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
                    Vishva.prototype.selectForEdit = function (mesh) {
                        var _this = this;
                        //if in multiselect then remove from multiselect
                        this.multiUnSelect(mesh);
                        this.isMeshSelected = true;
                        this.meshPicked = mesh;
                        vishva.SNAManager.getSNAManager().disableSnAs(this.meshPicked);
                        this.savePhyParms();
                        this.switchToQuats(this.meshPicked);
                        this.editControl = new EditControl(this.meshPicked, this.mainCamera, this.canvas, 0.75);
                        this.editControl.addActionEndListener(function (actionType) {
                            _this.vishvaGUI.handleTransChange();
                        });
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
                        //if(this.autoEditMenu) this.vishvaGUI.closePropDiag();
                        //close properties dialog if open
                        this.vishvaGUI.handeEditControlClose();
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
                    Vishva.prototype.onWindowResize = function (event) {
                        this.engine.resize();
                    };
                    Vishva.prototype.onKeyDown = function (e) {
                        var event = e;
                        if (event.keyCode === 16)
                            this.key.shift = true;
                        if (event.keyCode === 17)
                            this.key.ctl = true;
                        if (event.keyCode === 18)
                            this.key.alt = true;
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
                        if (event.keyCode === 16)
                            this.key.shift = false;
                        if (event.keyCode === 17)
                            this.key.ctl = false;
                        if (event.keyCode === 18)
                            this.key.alt = false;
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
                    // private primMaterial: PBRMetallicRoughnessMaterial;
                    Vishva.prototype.createPrimMaterial = function () {
                        this.primMaterial = new StandardMaterial("primMat", this.scene);
                        this.primMaterial.diffuseTexture = new Texture(this.primTexture, this.scene);
                        this.primMaterial.diffuseColor = new Color3(1, 1, 1);
                        this.primMaterial.specularColor = new Color3(0, 0, 0);
                    };
                    //        private createPrimMaterial(){
                    //            this.primMaterial = new PBRMetallicRoughnessMaterial("primMat",this.scene);
                    //            this.primMaterial.baseTexture = new Texture(this.primTexture, this.scene);
                    //            this.primMaterial.baseColor = new Color3(1, 1, 1);
                    //            this.primMaterial.roughness = 0.5;
                    //            this.primMaterial.metallic =0.5;
                    //            this.primMaterial.environmentTexture = (<StandardMaterial> this.skybox.material).reflectionTexture;
                    //            
                    //        }
                    Vishva.prototype.setPrimProperties = function (mesh) {
                        if (this.primMaterial == null)
                            this.createPrimMaterial();
                        var r = mesh.getBoundingInfo().boundingSphere.radiusWorld;
                        var placementLocal = new Vector3(0, r, -(r + 2));
                        var placementGlobal = Vector3.TransformCoordinates(placementLocal, this.avatar.getWorldMatrix());
                        mesh.position.addInPlace(placementGlobal);
                        mesh.checkCollisions = true;
                        (this.shadowGenerator.getShadowMap().renderList).push(mesh);
                        //sat TODO remove comment
                        //mesh.receiveShadows = true;
                        Tags.AddTagsTo(mesh, "Vishva.prim Vishva.internal");
                        mesh.id = new Number(Date.now()).toString();
                        mesh.name = mesh.id;
                        mesh.material = this.primMaterial.clone("m" + mesh.name);
                    };
                    Vishva.prototype.addPrim = function (primType) {
                        var mesh = null;
                        if (primType === "plane")
                            mesh = this.addPlane();
                        else if (primType === "box")
                            mesh = this.addBox();
                        else if (primType === "sphere")
                            mesh = this.addSphere();
                        else if (primType === "disc")
                            mesh = this.addDisc();
                        else if (primType === "cylinder")
                            mesh = this.addCylinder();
                        else if (primType === "cone")
                            mesh = this.addCone();
                        else if (primType === "torus")
                            mesh = this.addTorus();
                        if (mesh !== null) {
                            if (!this.isMeshSelected) {
                                this.selectForEdit(mesh);
                            }
                            else {
                                this.switchEditControl(mesh);
                            }
                            this.animateMesh(mesh);
                        }
                    };
                    Vishva.prototype.addPlane = function () {
                        var mesh = Mesh.CreatePlane("", 1.0, this.scene);
                        this.setPrimProperties(mesh);
                        mesh.material.backFaceCulling = false;
                        return mesh;
                    };
                    Vishva.prototype.addBox = function () {
                        var mesh = Mesh.CreateBox("", 1, this.scene);
                        this.setPrimProperties(mesh);
                        return mesh;
                    };
                    Vishva.prototype.addSphere = function () {
                        var mesh = Mesh.CreateSphere("", 10, 1, this.scene);
                        this.setPrimProperties(mesh);
                        return mesh;
                    };
                    Vishva.prototype.addDisc = function () {
                        var mesh = Mesh.CreateDisc("", 0.5, 20, this.scene);
                        this.setPrimProperties(mesh);
                        mesh.material.backFaceCulling = false;
                        return mesh;
                    };
                    Vishva.prototype.addCylinder = function () {
                        var mesh = Mesh.CreateCylinder("", 1, 1, 1, 20, 1, this.scene);
                        this.setPrimProperties(mesh);
                        return mesh;
                    };
                    Vishva.prototype.addCone = function () {
                        var mesh = Mesh.CreateCylinder("", 1, 0, 1, 20, 1, this.scene);
                        this.setPrimProperties(mesh);
                        return mesh;
                    };
                    Vishva.prototype.addTorus = function () {
                        var mesh = Mesh.CreateTorus("", 1, 0.25, 20, this.scene);
                        this.setPrimProperties(mesh);
                        return mesh;
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
                        //            if((this.meshPicked!=null&&this.meshPicked instanceof BABYLON.InstancedMesh)) {
                        //                return ("this is an instance mesh. you cannot create instance of that");
                        //            }
                        var name = new Number(Date.now()).toString();
                        var inst;
                        if ((this.meshPicked != null && this.meshPicked instanceof BABYLON.InstancedMesh)) {
                            inst = this.meshPicked.clone(name, null, true);
                            inst.scaling.copyFrom(this.meshPicked.scaling);
                        }
                        else {
                            inst = this.meshPicked.createInstance(name);
                        }
                        console.log(this.meshPicked);
                        console.log(inst);
                        //            delete inst["sensors"];
                        //            delete inst["actuators"];
                        //inst.position = this.meshPicked.position.add(new Vector3(0.1, 0.1, 0.1));
                        this.animateMesh(inst);
                        //this.meshPicked=inst;
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
                        if ((this.meshesPicked == null) || (this.meshesPicked.length === 0)) {
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
                        //            if((this.meshPicked!=null&&this.meshPicked instanceof BABYLON.InstancedMesh)) {
                        //                return ("this is an instance mesh. you cannot clone these");
                        //            }
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
                        clone.scaling.copyFrom(mesh.scaling);
                        delete clone["sensors"];
                        delete clone["actuators"];
                        //console.log(mesh);
                        //console.log(clone);
                        this.animateMesh(clone);
                        //clone.position = mesh.position.add(new Vector3(0.1, 0.1, 0.1));
                        //TODO think
                        //clone.receiveShadows = true;
                        mesh.renderOutline = false;
                        (this.shadowGenerator.getShadowMap().renderList).push(clone);
                        return clone;
                    };
                    //play a small scaling animation when cloning or instancing a mesh.
                    Vishva.prototype.animateMesh = function (mesh) {
                        var startScale = mesh.scaling.clone().scaleInPlace(1.5); //new Vector3(1.5, 1.5, 1.5);
                        var endScale = mesh.scaling.clone();
                        Animation.CreateAndStartAnimation('boxscale', mesh, 'scaling', 10, 2, startScale, endScale, 0);
                    };
                    Vishva.prototype.delete_mesh = function () {
                        if (!this.isMeshSelected) {
                            return "no mesh selected";
                        }
                        if (this.meshesPicked != null) {
                            for (var _i = 0, _a = this.meshesPicked; _i < _a.length; _i++) {
                                var mesh = _a[_i];
                                if (mesh !== this.meshPicked) {
                                    this.deleteTheMesh(mesh);
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
                    Vishva.prototype.mergeMeshes_old = function () {
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
                            this.animateMesh(mergedMesh);
                            return null;
                        }
                        else {
                            return "please select two or more mesh";
                        }
                    };
                    Vishva.prototype.mergeMeshes = function () {
                        if (this.meshesPicked != null) {
                            for (var _i = 0, _a = this.meshesPicked; _i < _a.length; _i++) {
                                var mesh = _a[_i];
                                if (mesh instanceof BABYLON.InstancedMesh) {
                                    return "some of your meshes are instance meshes. cannot merge those";
                                }
                                //TODO what happens when meshes have different material
                                //crashes
                                //                    if (mesh.material != this.meshPicked.material){
                                //                        return "some of your meshes have different material. cannot merge those";
                                //                    }
                            }
                            this.meshesPicked.push(this.meshPicked);
                            var savePos = new Array(this.meshesPicked.length);
                            var i = 0;
                            for (var _b = 0, _c = this.meshesPicked; _b < _c.length; _b++) {
                                var mesh = _c[_b];
                                savePos[i] = mesh.position.clone();
                                i++;
                                mesh.position.subtractInPlace(this.meshPicked.position);
                            }
                            var ms = this.meshesPicked;
                            var mergedMesh = Mesh.MergeMeshes(ms, false);
                            i = 0;
                            for (var _d = 0, _e = this.meshesPicked; _d < _e.length; _d++) {
                                var mesh = _e[_d];
                                mesh.position = savePos[i];
                                i++;
                            }
                            this.meshesPicked.pop();
                            mergedMesh.position = this.meshPicked.position.clone();
                            this.switchEditControl(mergedMesh);
                            this.animateMesh(mergedMesh);
                            this.shadowGenerator.getShadowMap().renderList.push(mergedMesh);
                            this.multiUnSelectAll();
                            return null;
                        }
                        else {
                            return "select two or more mesh";
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
                            var name_2 = new Number(Date.now()).toString();
                            var newMesh = csg3.toMesh(name_2, this.meshesPicked[0].material, this.scene, false);
                            this.switchEditControl(newMesh);
                            this.animateMesh(newMesh);
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
                    Vishva.prototype.setMeshColor = function (matId, colType, hex) {
                        var sm = this.scene.getMaterialByID(matId);
                        if (sm == null)
                            return "material not found";
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
                            return "invalid color type [" + colType + "]";
                        }
                        return null;
                    };
                    Vishva.prototype.getMatNames = function () {
                        var mn = new Array();
                        if (this.isMeshSelected) {
                            if (this.meshPicked.material instanceof BABYLON.MultiMaterial) {
                                var mm = this.meshPicked.material;
                                for (var _i = 0, _a = mm.subMaterials; _i < _a.length; _i++) {
                                    var m = _a[_i];
                                    mn.push(m.id);
                                }
                                return mn;
                            }
                            else {
                                mn.push(this.meshPicked.material.id);
                                return mn;
                            }
                        }
                        else
                            return null;
                    };
                    Vishva.prototype.getMaterialName = function (id) {
                        var mat = this.scene.getMaterialByID(id);
                        if (mat == null)
                            return null;
                        else
                            return mat.name;
                    };
                    Vishva.prototype.createText = function () {
                        var text = new Texture("", this.scene);
                        return text.uid;
                    };
                    Vishva.prototype.getMatTexture = function (matId, type) {
                        var sm = this.scene.getMaterialByID(matId);
                        if (sm == null)
                            return null;
                        var uid = null;
                        var img = null;
                        if (type == "diffuse" && sm.diffuseTexture != null) {
                            uid = sm.diffuseTexture.uid;
                            img = sm.diffuseTexture.name;
                            console.log(sm.diffuseTexture.textureType);
                        }
                        else if (type == "ambient" && sm.ambientTexture != null) {
                            uid = sm.ambientTexture.uid;
                            img = sm.ambientTexture.name;
                        }
                        else if (type == "opacity" && sm.opacityTexture != null) {
                            uid = sm.opacityTexture.uid;
                            img = sm.opacityTexture.name;
                        }
                        else if (type == "reflection" && sm.reflectionTexture != null) {
                            uid = sm.reflectionTexture.uid;
                            img = sm.reflectionTexture.name;
                        }
                        else if (type == "emissive" && sm.emissiveTexture != null) {
                            uid = sm.emissiveTexture.uid;
                            img = sm.emissiveTexture.name;
                        }
                        else if (type == "specular" && sm.specularTexture != null) {
                            uid = sm.specularTexture.uid;
                            img = sm.specularTexture.name;
                        }
                        else if (type == "bump" && sm.bumpTexture != null) {
                            uid = sm.bumpTexture.uid;
                            img = sm.bumpTexture.name;
                            console.log(sm.bumpTexture.textureType);
                        }
                        else {
                            uid = null;
                            img = this.NO_TEXTURE;
                        }
                        //            if (img.indexOf(".tga")>=0){
                        //                img=this.TGA_IMAGE;
                        //            }
                        return [uid, img];
                    };
                    Vishva.prototype.setMatTexture = function (matId, type, textID) {
                        var bt = this.getTextureByID(textID);
                        if (bt != null) {
                            var sm = this.scene.getMaterialByID(matId);
                            if (sm == null)
                                return;
                            if (type == "diffuse") {
                                sm.diffuseTexture = bt;
                            }
                            else if (type == "ambient") {
                                sm.ambientTexture = bt;
                            }
                            else if (type == "opacity") {
                                sm.opacityTexture = bt;
                            }
                            else if (type == "reflection") {
                                sm.reflectionTexture = bt;
                            }
                            else if (type == "emissive") {
                                sm.emissiveTexture = bt;
                            }
                            else if (type == "specular") {
                                sm.specularTexture = bt;
                            }
                            else if (type == "bump") {
                                sm.bumpTexture = bt;
                            }
                        }
                    };
                    Vishva.prototype.setTextURL = function (textID, textName) {
                        var bt = this.getTextureByID(textID);
                        bt.name = textName;
                        bt.updateURL(textName);
                    };
                    Vishva.prototype.setTextHScale = function (textID, scale) {
                        var text = this.getTextureByID(textID);
                        text.uScale = scale;
                    };
                    Vishva.prototype.getTextHScale = function (textID) {
                        var text = this.getTextureByID(textID);
                        return Number(text.uScale).toString();
                    };
                    Vishva.prototype.setTextVScale = function (textID, scale) {
                        var text = this.getTextureByID(textID);
                        text.vScale = scale;
                    };
                    Vishva.prototype.getTextVScale = function (textID) {
                        var text = this.getTextureByID(textID);
                        return Number(text.vScale).toString();
                    };
                    Vishva.prototype.setTextHO = function (textID, o) {
                        var text = this.getTextureByID(textID);
                        text.uOffset = o;
                    };
                    Vishva.prototype.getTextHO = function (textID) {
                        var text = this.getTextureByID(textID);
                        return Number(text.uOffset).toString();
                    };
                    Vishva.prototype.setTextVO = function (textID, o) {
                        var text = this.getTextureByID(textID);
                        text.vOffset = o;
                    };
                    Vishva.prototype.getTextVO = function (textID) {
                        var text = this.getTextureByID(textID);
                        return Number(text.vOffset).toString();
                    };
                    Vishva.prototype.setTextRot = function (textID, rot) {
                        var text = this.getTextureByID(textID);
                        text.wAng = rot * Math.PI / 180;
                    };
                    Vishva.prototype.getTextRot = function (textID) {
                        var text = this.getTextureByID(textID);
                        return Number(text.wAng * 180 / Math.PI).toString();
                    };
                    Vishva.prototype.getTextures = function () {
                        var ts = this.scene.textures;
                        var ns = [];
                        for (var _i = 0, ts_1 = ts; _i < ts_1.length; _i++) {
                            var t = ts_1[_i];
                            ns.push(t.name);
                        }
                        return ns;
                    };
                    Vishva.prototype.getTextureByName = function (name) {
                        var ts = this.scene.textures;
                        for (var _i = 0, ts_2 = ts; _i < ts_2.length; _i++) {
                            var t = ts_2[_i];
                            if (t.name == name)
                                return t;
                        }
                        return null;
                    };
                    Vishva.prototype.getTextureByID = function (id) {
                        var ts = this.scene.textures;
                        for (var _i = 0, ts_3 = ts; _i < ts_3.length; _i++) {
                            var t = ts_3[_i];
                            if (t.uid == id)
                                return t;
                        }
                        return null;
                    };
                    Vishva.prototype.getMeshColor = function (matId, colType) {
                        var sm = this.scene.getMaterialByID(matId);
                        if (sm == null)
                            return null;
                        if (!(sm instanceof BABYLON.StandardMaterial)) {
                            return "#000000";
                            ;
                        }
                        if (colType === "diffuse") {
                            if (sm.diffuseColor !== undefined)
                                return sm.diffuseColor.toHexString();
                            else
                                return "#000000";
                        }
                        else if (colType === "emissive") {
                            if (sm.emissiveColor !== undefined)
                                return sm.emissiveColor.toHexString();
                            else
                                return "#000000";
                        }
                        else if (colType === "specular") {
                            if (sm.specularColor !== undefined)
                                return sm.specularColor.toHexString();
                            else
                                return "#000000";
                        }
                        else if (colType === "ambient") {
                            if (sm.ambientColor !== undefined)
                                return sm.ambientColor.toHexString();
                            else
                                return "#000000";
                        }
                        else {
                            console.error("invalid color type [" + colType + "]");
                            return null;
                        }
                    };
                    Vishva.prototype.getMeshList = function () {
                        var meshList = new Array();
                        for (var _i = 0, _a = this.scene.meshes; _i < _a.length; _i++) {
                            var mesh = _a[_i];
                            if (mesh != this.ground && mesh != this.avatar && mesh != this.skybox && mesh.name != "EditControl")
                                meshList.push(mesh);
                        }
                        return meshList;
                    };
                    Vishva.prototype.selectMesh = function (meshId) {
                        var mesh = this.scene.getMeshByUniqueID(Number(meshId));
                        if (!this.isMeshSelected) {
                            this.selectForEdit(mesh);
                        }
                        else {
                            this.switchEditControl(mesh);
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
                        light.setEnabled(false);
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
                        if (isNaN(val))
                            return;
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
                        if (isNaN(val))
                            return;
                        var inrad = val * Math.PI / 180;
                        this.editControl.setRotSnapValue(inrad);
                    };
                    Vishva.prototype.isSnapScaleOn = function () {
                        return this.snapScaleOn;
                    };
                    Vishva.prototype.setSnapScaleValue = function (val) {
                        if (isNaN(val))
                            return;
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
                    //Translation
                    Vishva.prototype.setLocation = function (valX, valY, valZ) {
                        if (isNaN(valX) || isNaN(valY) || isNaN(valZ))
                            return;
                        if (this.isMeshSelected) {
                            this.meshPicked.position.x = valX;
                            this.meshPicked.position.y = valY;
                            this.meshPicked.position.z = valZ;
                        }
                    };
                    Vishva.prototype.setRotation = function (valX, valY, valZ) {
                        if (isNaN(valX) || isNaN(valY) || isNaN(valZ))
                            return;
                        if (this.isMeshSelected) {
                            Quaternion.RotationYawPitchRollToRef(valY * Math.PI / 180, valX * Math.PI / 180, valZ * Math.PI / 180, this.meshPicked.rotationQuaternion);
                        }
                    };
                    Vishva.prototype.setScale = function (valX, valY, valZ) {
                        if (isNaN(valX) || isNaN(valY) || isNaN(valZ))
                            return;
                        if (this.isMeshSelected) {
                            this.meshPicked.scaling.x = valX;
                            this.meshPicked.scaling.y = valY;
                            this.meshPicked.scaling.z = valZ;
                        }
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
                    Vishva.prototype.getSkeltons = function () {
                        return this.scene.skeletons;
                    };
                    //TODO:skeleton id is not unique. need to figure out how to handle that
                    Vishva.prototype.changeSkeleton = function (skelId) {
                        var switched = false;
                        var skels = this.scene.skeletons;
                        console.log("trying to swicth to " + skelId);
                        for (var _i = 0, skels_2 = skels; _i < skels_2.length; _i++) {
                            var skel = skels_2[_i];
                            var id = skel.id + "-" + skel.name;
                            if (id === skelId) {
                                console.log("found skeleton. swicthing. ");
                                this.meshPicked.skeleton = skel;
                                switched = true;
                                break;
                            }
                        }
                        return switched;
                    };
                    //TODO during save unused skeleton are dropped and ID are reassigned.
                    //how do we handle that.
                    Vishva.prototype.cloneChangeSkeleton = function (skelId) {
                        var switched = false;
                        var skels = this.scene.skeletons;
                        for (var _i = 0, skels_3 = skels; _i < skels_3.length; _i++) {
                            var skel = skels_3[_i];
                            var id = skel.id + "-" + skel.name;
                            if (id === skelId) {
                                console.log("found skeleton. swicthing. ");
                                var newId = new Number(Date.now()).toString();
                                var clonedSkel = skel.clone(skel.name, newId);
                                this.meshPicked.skeleton = clonedSkel;
                                switched = true;
                                break;
                            }
                        }
                        return switched;
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
                        if (this.meshPicked.skeleton === null || this.meshPicked.skeleton === undefined)
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
                        if (skel !== null && skel !== undefined) {
                            var ranges = skel.getAnimationRanges();
                            return ranges;
                        }
                        else
                            return null;
                    };
                    Vishva.prototype.printAnimCount = function (skel) {
                        var bones = skel.bones;
                        for (var _i = 0, bones_1 = bones; _i < bones_1.length; _i++) {
                            var bone = bones_1[_i];
                            console.log(bone.name + "," + bone.animations.length + " , " + bone.animations[0].getHighestFrame());
                            console.log(bone.animations[0]);
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
                        this.sun.direction = new Vector3(-x, -y, 0);
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
                        this.skybox.visibility = 2 * d;
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
                        //this.scene.fogStart = 10220*(1 - d/0.1);
                    };
                    Vishva.prototype.getFog = function () {
                        //return (10220 - this.scene.fogStart )*0.1/10220;
                        return this.scene.fogDensity;
                    };
                    Vishva.prototype.setFogColor = function (fogColor) {
                        this.scene.fogColor = Color3.FromHexString(fogColor);
                    };
                    Vishva.prototype.getFogColor = function () {
                        return this.scene.fogColor.toHexString();
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
                        var skyFile = "vishva/internal/assets/skyboxes/" + sky + "/" + sky;
                        mat.reflectionTexture = new CubeTexture(skyFile, this.scene);
                        mat.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
                        //            if (this.primMaterial !=null)
                        //            this.primMaterial.environmentTexture = (<StandardMaterial> this.skybox.material).reflectionTexture;
                    };
                    Vishva.prototype.getSky = function () {
                        var mat = this.skybox.material;
                        var skyname = mat.reflectionTexture.name;
                        var i = skyname.lastIndexOf("/");
                        return skyname.substring(i + 1);
                    };
                    Vishva.prototype.getAmbientColor = function () {
                        return this.scene.ambientColor.toHexString();
                    };
                    Vishva.prototype.setAmbientColor = function (hex) {
                        this.scene.ambientColor = Color3.FromHexString(hex);
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
                    /**
                     * question: should texture location be vishav based location?
                     * if meant to be used within vishva then yes
                     * else no but then we should probably provide an option to save texture too
                     *
                     * for now lets keep as vishva based location
                     *
                     */
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
                        //TODO add support for CharacterController serialization.
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
                        for (var _i = 0, meshes_2 = meshes; _i < meshes_2.length; _i++) {
                            var mesh = meshes_2[_i];
                            if (mesh != null && mesh instanceof BABYLON.InstancedMesh) {
                                var shadowMeshes = this.shadowGenerator.getShadowMap().renderList;
                                var i = shadowMeshes.indexOf(mesh);
                                if (i >= 0) {
                                    shadowMeshes.splice(i, 1);
                                }
                            }
                        }
                    };
                    Vishva.prototype.addInstancesToShadow = function () {
                        for (var _i = 0, _a = this.scene.meshes; _i < _a.length; _i++) {
                            var mesh = _a[_i];
                            if (mesh != null && mesh instanceof BABYLON.InstancedMesh) {
                                //TODO think
                                //mesh.receiveShadows = true;
                                (this.shadowGenerator.getShadowMap().renderList).push(mesh);
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
                        for (var _i = 0, _a = this.scene.meshes; _i < _a.length; _i++) {
                            var mesh = _a[_i];
                            mesh.id = new Number(i).toString();
                            i++;
                        }
                    };
                    /**
                     * resets each skel.assign. unique id to each skeleton. deserialization uses
                     * skeleton id to associate skel with mesh. if id isn't unique wrong skels
                     * could get assigned to a mesh.
                     *
                     * @param scene
                     */
                    Vishva.prototype.resetSkels = function (scene) {
                        var i = 0;
                        for (var _i = 0, _a = scene.skeletons; _i < _a.length; _i++) {
                            var skel = _a[_i];
                            skel.id = new Number(i).toString();
                            i++;
                            skel.returnToRest();
                        }
                    };
                    Vishva.prototype.renameWorldTextures = function () {
                        var mats = this.scene.materials;
                        this.renameWorldMaterials(mats);
                        var mms = this.scene.multiMaterials;
                        for (var _i = 0, mms_1 = mms; _i < mms_1.length; _i++) {
                            var mm = mms_1[_i];
                            this.renameWorldMaterials(mm.subMaterials);
                        }
                    };
                    Vishva.prototype.renameWorldMaterials = function (mats) {
                        var sm;
                        for (var _i = 0, mats_1 = mats; _i < mats_1.length; _i++) {
                            var mat = mats_1[_i];
                            if (mat != null && mat instanceof BABYLON.StandardMaterial) {
                                sm = mat;
                                this.rename(sm.diffuseTexture);
                                this.rename(sm.reflectionTexture);
                                this.rename(sm.opacityTexture);
                                this.rename(sm.specularTexture);
                                this.rename(sm.bumpTexture);
                                this.rename(sm.ambientTexture);
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
                                //TODO need to verify this
                                //sound["url"] = this.RELATIVE_ASSET_LOCATION + this.SOUND_ASSET_LOCATION + sound["url"];
                                sound["url"] = this.SOUND_ASSET_LOCATION + sound["url"];
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
                        for (var _i = 0, meshes_3 = meshes; _i < meshes_3.length; _i++) {
                            var mesh = meshes_3[_i];
                            if (mesh.material != null) {
                                if (mesh.material != null && mesh.material instanceof BABYLON.MultiMaterial) {
                                    var mm = mesh.material;
                                    mms.push(mm);
                                    var ms = mm.subMaterials;
                                    for (var _a = 0, ms_1 = ms; _a < ms_1.length; _a++) {
                                        var mat = ms_1[_a];
                                        mats.push(mat);
                                    }
                                }
                                else {
                                    mats.push(mesh.material);
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
                        for (var _i = 0, meshes_4 = meshes; _i < meshes_4.length; _i++) {
                            var mesh = meshes_4[_i];
                            if (mesh.skeleton != null) {
                                skels.push(mesh.skeleton);
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
                    //older, used by old GUI file loader dislog
                    Vishva.prototype.loadAssetFile = function (file) {
                        var _this = this;
                        var sceneFolderName = file.name.split(".")[0];
                        SceneLoader.ImportMesh("", "vishva/assets/" + sceneFolderName + "/", file.name, this.scene, function (meshes, particleSystems, skeletons) { return _this.onMeshLoaded(meshes, particleSystems, skeletons); });
                    };
                    Vishva.prototype.loadAsset = function (assetType, file) {
                        var _this = this;
                        this.filePath = assetType;
                        this.file = file;
                        var fileName = file.split(".")[0];
                        //SceneLoader.ImportMesh("", "vishva/assets/" + assetType + "/" + file + "/", file + ".babylon", this.scene, (meshes, particleSystems, skeletons) => {return this.onMeshLoaded(meshes, particleSystems, skeletons)});
                        SceneLoader.ImportMesh("", "vishva/assets/" + assetType + "/" + fileName + "/", file, this.scene, function (meshes, particleSystems, skeletons) { return _this.onMeshLoaded(meshes, particleSystems, skeletons); });
                    };
                    Vishva.prototype.loadAsset2 = function (path, file) {
                        var _this = this;
                        this.filePath = path;
                        this.file = file;
                        SceneLoader.ImportMesh("", "vishva/" + path, file, this.scene, function (meshes, particleSystems, skeletons) { return _this.onMeshLoaded(meshes, particleSystems, skeletons); });
                    };
                    //TODO if mesh created using Blender (check producer == Blender, find all skeleton animations and increment from frame  by 1
                    Vishva.prototype.onMeshLoaded = function (meshes, particleSystems, skeletons) {
                        var boundingRadius = this.getBoundingRadius(meshes);
                        console.log("meshes " + meshes.length);
                        console.log("skels " + skeletons.length);
                        for (var _i = 0, skeletons_1 = skeletons; _i < skeletons_1.length; _i++) {
                            var skeleton = skeletons_1[_i];
                            this.scene.stopAnimation(skeleton);
                        }
                        for (var _a = 0, meshes_5 = meshes; _a < meshes_5.length; _a++) {
                            var mesh = meshes_5[_a];
                            //mesh = (<Mesh>mesh).toLeftHanded();
                            mesh.isPickable = true;
                            mesh.checkCollisions = true;
                            //gltb file
                            //                if (mesh.parent!=null){
                            //                    if (mesh.parent.id=="root"){
                            //                        console.log("removing parent of " + mesh.id);
                            //                        (<Mesh>mesh.parent).removeChild(mesh)
                            //                    }
                            //                }
                            //                
                            if (mesh.parent == null) {
                                var placementLocal = new Vector3(0, 0, -(boundingRadius + 2));
                                var placementGlobal = Vector3.TransformCoordinates(placementLocal, this.avatar.getWorldMatrix());
                                mesh.position.addInPlace(placementGlobal);
                            }
                            (this.shadowGenerator.getShadowMap().renderList).push(mesh);
                            //TODO think
                            //mesh.receiveShadows = true;
                            if (mesh.material != null) {
                                if (mesh.material instanceof BABYLON.MultiMaterial) {
                                    var mm = mesh.material;
                                    var mats = mm.subMaterials;
                                    for (var _b = 0, mats_2 = mats; _b < mats_2.length; _b++) {
                                        var mat = mats_2[_b];
                                        mesh.material.backFaceCulling = false;
                                        mesh.material.alpha = 1;
                                        if (mat != null && mat instanceof BABYLON.StandardMaterial) {
                                            this.renameAssetTextures(mat);
                                        }
                                    }
                                }
                                else {
                                    mesh.material.backFaceCulling = false;
                                    mesh.material.alpha = 1;
                                    var sm = mesh.material;
                                    this.renameAssetTextures(sm);
                                }
                            }
                            if (mesh.skeleton != null) {
                                this.scene.stopAnimation(mesh.skeleton);
                                this.fixAnimationRanges(mesh.skeleton);
                            }
                        }
                        //select and animate the last mesh loaded
                        if (meshes.length > 0) {
                            var lastMesh = meshes[meshes.length - 1];
                            if (!this.isMeshSelected) {
                                this.selectForEdit(lastMesh);
                            }
                            else {
                                this.switchEditControl(lastMesh);
                            }
                            this.animateMesh(lastMesh);
                        }
                    };
                    Vishva.prototype.renameAssetTextures = function (sm) {
                        console.log("renameAssetTextures");
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
                            //bt.name="vishva/assets/"+this.filePath+"/"+this.file.split(".")[0]+"/"+textureName;
                            bt.name = "vishva/" + this.filePath + textureName;
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
                        for (var _i = 0, meshes_6 = meshes; _i < meshes_6.length; _i++) {
                            var mesh = meshes_6[_i];
                            console.log("==========");
                            console.log(mesh.name);
                            console.log(mesh.absolutePosition);
                            console.log(mesh.absolutePosition.length());
                            if (mesh.parent != null)
                                console.log("parent " + mesh.parent.name);
                            var bi = mesh.getBoundingInfo();
                            var rw = bi.boundingSphere.radiusWorld;
                            console.log(bi.boundingSphere.radiusWorld);
                            if (isFinite(rw)) {
                                var r = rw + mesh.absolutePosition.length();
                                if (maxRadius < r)
                                    maxRadius = r;
                            }
                        }
                        console.log("max radius " + maxRadius);
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
                        console.log("creating water");
                        var waterMesh = Mesh.CreateGround("waterMesh", 512, 512, 32, this.scene, false);
                        //waterMesh.position.y = 1;
                        var water = new WaterMaterial("water", this.scene);
                        water.backFaceCulling = true;
                        water.bumpTexture = new Texture(this.waterTexture, this.scene);
                        //repoint the path, so that we can reload this if it is saved in scene 
                        water.bumpTexture.name = this.RELATIVE_ASSET_LOCATION + water.bumpTexture.name;
                        //beach
                        water.windForce = -5;
                        water.waveHeight = 0.5;
                        //water.waterColor = new Color3(0.1, 0.1, 0.6);
                        water.colorBlendFactor = 0;
                        water.bumpHeight = 0.1;
                        water.waveLength = 0.1;
                        water.addToRenderList(this.skybox);
                        //water.addToRenderList(this.ground);
                        waterMesh.material = water;
                    };
                    Vishva.prototype.addWater = function () {
                        if (!this.isMeshSelected) {
                            return "no mesh selected";
                        }
                        var water = new WaterMaterial("water", this.scene);
                        water.bumpTexture = new Texture(this.waterTexture, this.scene);
                        water.windForce = 0.1;
                        water.waveHeight = 0.1;
                        //water.waterColor = new Color3(0.1, 0.1, 0.6);
                        water.colorBlendFactor = 0;
                        water.bumpHeight = 0;
                        water.waveLength = 0;
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
                                this.avatarSkeleton.enableBlending(this._animBlend);
                            }
                            this.cc.setAvatar(this.avatar);
                            this.cc.setAvatarSkeleton(this.avatarSkeleton);
                            this.avatar.checkCollisions = true;
                            this.avatar.ellipsoid = new Vector3(0.5, 1, 0.5);
                            this.avatar.ellipsoidOffset = new Vector3(0, 1, 0);
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
                    Vishva.prototype.createGround = function (scene) {
                        var groundMaterial = new StandardMaterial("groundMat", scene);
                        groundMaterial.diffuseTexture = new Texture(this.groundTexture, scene);
                        groundMaterial.bumpTexture = new Texture(this.groundBumpTexture, scene);
                        groundMaterial.diffuseTexture.uScale = 6.0;
                        groundMaterial.diffuseTexture.vScale = 6.0;
                        groundMaterial.bumpTexture.uScale = 100.0;
                        groundMaterial.bumpTexture.vScale = 100.0;
                        groundMaterial.diffuseColor = new Color3(0.9, 0.6, 0.4);
                        groundMaterial.specularColor = new Color3(0, 0, 0);
                        var grnd = Mesh.CreateGround("ground", 256, 256, 1, scene);
                        grnd.material = groundMaterial;
                        grnd.checkCollisions = true;
                        grnd.isPickable = false;
                        Tags.AddTagsTo(grnd, "Vishva.ground Vishva.internal");
                        grnd.freezeWorldMatrix();
                        grnd.receiveShadows = true;
                        if (this.enablePhysics) {
                            grnd.physicsImpostor = new BABYLON.PhysicsImpostor(grnd, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.1 }, this.scene);
                        }
                        this.ground = grnd;
                        return grnd;
                    };
                    Vishva.prototype.createGround_htmap = function (scene) {
                        var _this = this;
                        var groundMaterial = this.createGroundMaterial(scene);
                        MeshBuilder.CreateGroundFromHeightMap("ground", this.groundHeightMap, {
                            //                width: 256,
                            //                height: 256,
                            width: 10240,
                            height: 10240,
                            //                minHeight: 0,
                            //                maxHeight: 20,
                            minHeight: 0,
                            maxHeight: 1000,
                            subdivisions: 32,
                            onReady: function (grnd) {
                                console.log("ground created");
                                grnd.material = groundMaterial;
                                grnd.checkCollisions = true;
                                grnd.isPickable = false;
                                Tags.AddTagsTo(grnd, "Vishva.ground Vishva.internal");
                                grnd.receiveShadows = true;
                                //HeightmapImpostor doesnot seem to work.
                                //                    if(this.enablePhysics) {
                                //                        grnd.physicsImpostor=new BABYLON.PhysicsImpostor(grnd,BABYLON.PhysicsImpostor.HeightmapImpostor,{mass: 0,restitution: 0.1},this.scene);
                                //                    }
                                grnd.freezeWorldMatrix();
                                _this.ground = grnd;
                            }
                        }, scene);
                    };
                    Vishva.prototype.createGroundMaterial = function (scene) {
                        var groundMaterial = new StandardMaterial("groundMat", scene);
                        groundMaterial.diffuseTexture = new Texture(this.groundTexture, scene);
                        groundMaterial.bumpTexture = new Texture(this.groundBumpTexture, scene);
                        //            (<Texture> groundMaterial.diffuseTexture).uScale = 6.0;
                        //            (<Texture> groundMaterial.diffuseTexture).vScale = 6.0;
                        groundMaterial.diffuseTexture.uScale = 100.0;
                        groundMaterial.diffuseTexture.vScale = 100.0;
                        groundMaterial.bumpTexture.uScale = 100.0;
                        groundMaterial.bumpTexture.vScale = 100.0;
                        groundMaterial.diffuseColor = new Color3(0.9, 0.6, 0.4);
                        groundMaterial.specularColor = new Color3(0, 0, 0);
                        return groundMaterial;
                    };
                    Vishva.prototype.onDataMapReady = function (map, subX, subZ) {
                        var normal = new Float32Array(map.length);
                        DynamicTerrain.ComputeNormalsFromMapToRef(map, subX, subZ, normal);
                        var parms = {
                            mapData: map,
                            mapSubX: subX,
                            mapSubZ: subZ,
                            mapNormals: normal,
                            terrainSub: 120
                        };
                        var terrain = new BABYLON.DynamicTerrain("t", parms, this.scene);
                        var mat = new StandardMaterial("tm", this.scene);
                        //mat.diffuseTexture=new Texture(this.terrainTexture, this.scene);
                        mat.diffuseTexture = new Texture(this.groundTexture, this.scene);
                        mat.diffuseTexture.uScale = 6.0;
                        mat.diffuseTexture.vScale = 6.0;
                        mat.bumpTexture = new Texture(this.groundBumpTexture, this.scene);
                        mat.bumpTexture.uScale = 64.0;
                        mat.bumpTexture.vScale = 64.0;
                        mat.specularColor = Color3.Black();
                        mat.diffuseColor = new Color3(0.9, 0.6, 0.4);
                        terrain.mesh.material = mat;
                        // compute the UVs to stretch the image on the whole map
                        terrain.createUVMap();
                        terrain.update(true);
                        terrain.mesh.checkCollisions = true;
                        this.ground = terrain.mesh;
                        Tags.AddTagsTo(this.ground, "Vishva.ground Vishva.internal");
                    };
                    Vishva.prototype.creatDynamicTerrain = function () {
                        var _this = this;
                        var dmOptions = {
                            width: 1024,
                            height: 1024,
                            subX: 512,
                            subZ: 512,
                            minHeight: 0,
                            maxHeight: 10,
                            offsetX: 0,
                            offsetZ: 0,
                            onReady: function (map, subX, subZ) { _this.onDataMapReady(map, subX, subZ); }
                        };
                        var mapData = new Float32Array(512 * 512 * 3);
                        //            DynamicTerrain.CreateMapFromHeightMapToRef(this.terrainHeightMap,
                        //                dmOptions,mapData,this.scene);
                        DynamicTerrain.CreateMapFromHeightMapToRef(this.groundHeightMap, dmOptions, mapData, this.scene);
                    };
                    Vishva.prototype.createSkyBox = function (scene) {
                        var skyboxMaterial = new StandardMaterial("skyBox", scene);
                        skyboxMaterial.backFaceCulling = false;
                        skyboxMaterial.disableLighting = true;
                        skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
                        skyboxMaterial.specularColor = new Color3(0, 0, 0);
                        skyboxMaterial.reflectionTexture = new CubeTexture(this.skyboxTextures, scene);
                        skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
                        var skybox = Mesh.CreateBox("skyBox", 10000.0, scene);
                        //var skybox: Mesh=Mesh.CreateSphere("skybox",4,10000,scene);
                        skybox.material = skyboxMaterial;
                        skybox.infiniteDistance = true;
                        skybox.renderingGroupId = 0;
                        skybox.isPickable = false;
                        //skybox.position.y=-100;
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
                        //part.emitter = new Vector3(0, 10, 0);
                        part.emitter = new Mesh("snowEmitter", this.scene, this.mainCamera);
                        //part.maxEmitBox = new Vector3(100, 10, 100);
                        //part.minEmitBox = new Vector3(-100, 10, -100);
                        part.maxEmitBox = new Vector3(10, 10, 10);
                        part.minEmitBox = new Vector3(-10, 10, -10);
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
                    Vishva.prototype.createAvatar = function () {
                        var _this = this;
                        SceneLoader.ImportMesh("", this.avatarFolder, this.avatarFile, this.scene, function (meshes, particleSystems, skeletons) { return _this.onAvatarLoaded(meshes, particleSystems, skeletons); });
                    };
                    Vishva.prototype.onAvatarLoaded = function (meshes, particleSystems, skeletons) {
                        this.avatar = meshes[0];
                        (this.shadowGenerator.getShadowMap().renderList).push(this.avatar);
                        //(this.avShadowGenerator.getShadowMap().renderList).push(this.avatar);
                        //TODO
                        //this.avatar.receiveShadows = true;
                        //dispose of all OTHER meshes
                        var l = meshes.length;
                        for (var i = 1; i < l; i++) {
                            meshes[i].checkCollisions = false;
                            meshes[i].dispose();
                        }
                        this.avatarSkeleton = skeletons[0];
                        //dispose of all OTHER skeletons
                        l = skeletons.length;
                        for (var i = 1; i < l; i++) {
                            skeletons[i].dispose();
                        }
                        this.fixAnimationRanges(this.avatarSkeleton);
                        this.avatar.skeleton = this.avatarSkeleton;
                        this.avatarSkeleton.enableBlending(this._animBlend);
                        //this.avatar.rotation.y = Math.PI;
                        //this.avatar.position = new Vector3(0, 20, 0);
                        this.avatar.position = this.spawnPosition;
                        this.avatar.checkCollisions = true;
                        this.avatar.ellipsoid = new Vector3(0.5, 1, 0.5);
                        this.avatar.ellipsoidOffset = new Vector3(0, 1, 0);
                        this.avatar.isPickable = false;
                        Tags.AddTagsTo(this.avatar, "Vishva.avatar");
                        Tags.AddTagsTo(this.avatarSkeleton, "Vishva.skeleton");
                        this.avatarSkeleton.name = "Vishva.skeleton";
                        this.mainCamera.alpha = -this.avatar.rotation.y - 4.69;
                        //this.mainCamera.target = new Vector3(this.avatar.position.x, this.avatar.position.y + 1.5, this.avatar.position.z);
                        var sm = this.avatar.material;
                        if (sm.diffuseTexture != null) {
                            var textureName = sm.diffuseTexture.name;
                            sm.diffuseTexture.name = this.avatarFolder + textureName;
                            sm.backFaceCulling = true;
                            sm.ambientColor = new Color3(0, 0, 0);
                        }
                        this.cc = new CharacterController(this.avatar, this.mainCamera, this.scene);
                        this.setCharacterController(this.cc);
                        this.cc.setCameraElasticity(true);
                        //this.cc.setNoFirstPerson(true);
                        this.cc.start();
                        //in 3.0 need to set the camera values again
                        //            this.mainCamera.radius=4;
                        //            this.mainCamera.alpha=-this.avatar.rotation.y-4.69;
                        //            this.mainCamera.beta = 1.4;
                    };
                    //TODO persist charactercontroller settings
                    Vishva.prototype.setCharacterController = function (cc) {
                        this.mainCamera.lowerRadiusLimit = 1;
                        this.mainCamera.upperRadiusLimit = 100;
                        cc.setCameraTarget(new BABYLON.Vector3(0, 1.5, 0));
                        cc.setIdleAnim("idle", 0.1, true);
                        cc.setTurnLeftAnim("turnLeft", 0.5, true);
                        cc.setTurnRightAnim("turnRight", 0.5, true);
                        cc.setWalkBackAnim("walkBack", 0.5, true);
                        cc.setJumpAnim("jump", 4, false);
                        cc.setFallAnim("fall", 2, false);
                        cc.setSlideBackAnim("slideBack", 1, false);
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
                        var ranges = skel.getAnimationRanges();
                        for (var _i = 0, ranges_1 = ranges; _i < ranges_1.length; _i++) {
                            var range = ranges_1[_i];
                            //                fix for 4.4.4
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
                        camera.panningInertia = 0.1;
                        camera.inertia = 0.1;
                        camera.panningSensibility = 250;
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
                        this.cc.cameraCollisionChanged();
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
                        this.trans = false;
                        this.rot = false;
                        this.scale = false;
                        this.esc = false;
                        this.shift = false;
                        this.ctl = false;
                        this.alt = false;
                        this.focus = false;
                    }
                    return Key;
                }());
                vishva.Key = Key;
                var AnimData = (function () {
                    function AnimData(name, l, r) {
                        this.exist = false;
                        this.name = name;
                        this.l = l;
                        this.r = r;
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
                var Tags = BABYLON.Tags;
                var SNAManager = (function () {
                    function SNAManager() {
                        this.sensorList = [];
                        this.actuatorList = [];
                        this.actuatorMap = {};
                        this.sensorMap = {};
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
                    SNAManager.prototype.addActuator = function (name, actuator) {
                        this.actuatorList.push(name);
                        this.actuatorMap[name] = actuator;
                    };
                    SNAManager.prototype.addSensor = function (name, sensor) {
                        this.sensorList.push(name);
                        this.sensorMap[name] = sensor;
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
                    SNAManager.prototype.createSensorByName = function (name, mesh, prop) {
                        var sensor = this.sensorMap[name];
                        return new sensor(mesh, prop);
                    };
                    SNAManager.prototype.createActuatorByName = function (name, mesh, prop) {
                        var act = this.actuatorMap[name];
                        return new act(mesh, prop);
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
                        if (signalId.trim() === "")
                            return;
                        var actuators = this.sig2actMap[signalId];
                        for (var _i = 0, actuators_2 = actuators; _i < actuators_2.length; _i++) {
                            var actuator = actuators_2[_i];
                            actuator.start(signalId);
                        }
                    };
                    //        public emitSignal(signalId: string) {
                    //            if(signalId.trim()==="") return;
                    //            var keyValue: any=this.sig2actMap[signalId];
                    //            if(keyValue!=null) {
                    //                window.setTimeout((acts,signalId) => {return this.actuate(acts,signalId)},0,keyValue,signalId);
                    //            }
                    //        }
                    //
                    //        private actuate(acts: any, signal:string) {
                    //            var actuators: Actuator[]=<Actuator[]>acts;
                    //            for(let actuator of actuators) {
                    //                actuator.start(signal);
                    //            }
                    //
                    //        }
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
                            for (var _i = 0, actuators_3 = actuators; _i < actuators_3.length; _i++) {
                                var actuator = actuators_3[_i];
                                actuator.processQueue();
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
                            for (var _i = 0, actuators_4 = actuators; _i < actuators_4.length; _i++) {
                                var actuator = actuators_4[_i];
                                if (actuator.actuating)
                                    actuator.stop();
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
                            for (var _i = 0, actuators_5 = actuators; _i < actuators_5.length; _i++) {
                                var actuator = actuators_5[_i];
                                if (actuator.properties.autoStart)
                                    actuator.start(actuator.properties.signalId);
                            }
                        }
                    };
                    /**
                     * removes all sensors and actuators from a mesh.
                     * this would be called when say disposing off a mesh
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
                        for (var _i = 0, meshes_7 = meshes; _i < meshes_7.length; _i++) {
                            var mesh = meshes_7[_i];
                            meshId = null;
                            var actuators = mesh["actuators"];
                            if (actuators != null) {
                                meshId = this.getMeshVishvaUid(mesh);
                                for (var _a = 0, actuators_6 = actuators; _a < actuators_6.length; _a++) {
                                    var actuator = actuators_6[_a];
                                    sna = new SNAserialized();
                                    sna.name = actuator.getName();
                                    sna.type = actuator.getType();
                                    sna.meshId = meshId;
                                    sna.properties = actuator.getProperties();
                                    snas.push(sna);
                                }
                            }
                            var sensors = mesh["sensors"];
                            if (sensors != null) {
                                if (meshId == null)
                                    meshId = this.getMeshVishvaUid(mesh);
                                for (var _b = 0, sensors_2 = sensors; _b < sensors_2.length; _b++) {
                                    var sensor = sensors_2[_b];
                                    sna = new SNAserialized();
                                    sna.name = sensor.getName();
                                    sna.type = sensor.getType();
                                    sna.meshId = meshId;
                                    sna.properties = sensor.getProperties();
                                    snas.push(sna);
                                }
                            }
                        }
                        return snas;
                    };
                    SNAManager.prototype.unMarshal = function (snas, scene) {
                        var renames = [];
                        if (snas == null)
                            return;
                        for (var _i = 0, snas_1 = snas; _i < snas_1.length; _i++) {
                            var sna = snas_1[_i];
                            var mesh = scene.getMeshesByTags(sna.meshId)[0];
                            if (mesh == null) {
                                mesh = scene.getMeshByName(sna.meshId);
                                if (mesh != null) {
                                    if (renames.indexOf(mesh) < 0)
                                        renames.push(mesh);
                                }
                            }
                            if (mesh != null) {
                                if (sna.type === "SENSOR") {
                                    this.createSensorByName(sna.name, mesh, sna.properties);
                                }
                                else if (sna.type === "ACTUATOR") {
                                    this.createActuatorByName(sna.name, mesh, sna.properties);
                                }
                            }
                            else {
                                console.error("Didnot find mesh for tag " + sna.meshId);
                            }
                        }
                        for (var _a = 0, renames_1 = renames; _a < renames_1.length; _a++) {
                            var mesh_1 = renames_1[_a];
                            mesh_1.name = mesh_1.name.split(".Vishva.uid.")[0];
                        }
                    };
                    /**
                     * Instance mesh id is not serialized by Babylonjs.
                     * Instance mesh name is serialized.
                     * As such we would append the new vishva.uid to the name during save.
                     * When de-serializing, during load, we will remove the vishva.uid from name.
                     * see unmarhsall() also.
                     *
                     * TODO:check if we can use this method for all meshes rather than just InstancedMesh
                     */
                    SNAManager.prototype.getMeshVishvaUid = function (mesh) {
                        if (!(mesh instanceof BABYLON.InstancedMesh) && (Tags.HasTags(mesh))) {
                            var tags = Tags.GetTags(mesh, true).split(" ");
                            for (var _i = 0, tags_1 = tags; _i < tags_1.length; _i++) {
                                var tag = tags_1[_i];
                                var i = tag.indexOf("Vishva.uid.");
                                if (i >= 0)
                                    return tag;
                            }
                        }
                        var uid;
                        uid = "Vishva.uid." + new Number(Date.now()).toString();
                        while ((uid === this.prevUID)) {
                            uid = "Vishva.uid." + new Number(Date.now()).toString();
                        }
                        ;
                        this.prevUID = uid;
                        if (mesh instanceof BABYLON.InstancedMesh) {
                            mesh.name = mesh.name + "." + uid;
                            return mesh.name;
                        }
                        else {
                            Tags.AddTagsTo(mesh, uid);
                            return uid;
                        }
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
                    SensorAbstract.prototype.handlePropertiesChange = function () {
                        //remove all actions which might have been added by previous property
                        this.removeActions();
                        this.onPropertiesChange();
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
                        if (!this.mesh.actionManager)
                            return;
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
                var ActuatorAbstract = (function () {
                    function ActuatorAbstract(mesh, prop) {
                        this.actuating = false;
                        this.ready = true;
                        this.queued = 0;
                        this.disposed = false;
                        this.disabled = false;
                        this.properties = prop;
                        this.mesh = mesh;
                        this.handlePropertiesChange();
                        var actuators = this.mesh["actuators"];
                        if (actuators == null) {
                            actuators = new Array();
                            this.mesh["actuators"] = actuators;
                        }
                        actuators.push(this);
                    }
                    ActuatorAbstract.prototype.start = function (signal) {
                        if (this.disposed)
                            return false;
                        if (!this.ready)
                            return false;
                        // donot actuate if this mesh is on the disabled list
                        var i = SNAManager.getSNAManager().snaDisabledList.indexOf(this.mesh);
                        if (i >= 0)
                            return false;
                        if (signal == this.signalDisable) {
                            this.disabled = true;
                            return;
                        }
                        if (signal == this.signalEnable) {
                            this.disabled = false;
                            if (this.queued == 0)
                                return;
                            this.queued--;
                        }
                        if (this.actuating || this.disabled) {
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
                            this.start(this.signalId);
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
                        this.handlePropertiesChange();
                    };
                    ActuatorAbstract.prototype.getSignalId = function () {
                        return this.properties.signalId;
                    };
                    ActuatorAbstract.prototype.handlePropertiesChange = function () {
                        // check if signalId changed, if yes then resubscribe
                        //            if(this.signalId!=null&&this.signalId!==this.properties.signalId) {
                        //                SNAManager.getSNAManager().unSubscribe(this,this.signalId);
                        //                this.signalId=this.properties.signalId;
                        //                SNAManager.getSNAManager().subscribe(this,this.signalId);
                        //            } else if(this.signalId==null) {
                        //                this.signalId=this.properties.signalId;
                        //                SNAManager.getSNAManager().subscribe(this,this.signalId);
                        //            }
                        if (this.properties.signalId != null && this.properties.signalId != "") {
                            if (this.signalId == null) {
                                this.signalId = this.properties.signalId;
                                SNAManager.getSNAManager().subscribe(this, this.signalId);
                            }
                            else if (this.signalId !== this.properties.signalId) {
                                SNAManager.getSNAManager().unSubscribe(this, this.signalId);
                                this.signalId = this.properties.signalId;
                                SNAManager.getSNAManager().subscribe(this, this.signalId);
                            }
                        }
                        if (this.properties.signalEnable != null && this.properties.signalEnable != "") {
                            if (this.signalEnable == null) {
                                this.signalEnable = this.properties.signalEnable;
                                SNAManager.getSNAManager().subscribe(this, this.signalEnable);
                            }
                            else if (this.signalEnable !== this.properties.signalEnable) {
                                SNAManager.getSNAManager().unSubscribe(this, this.signalEnable);
                                this.signalEnable = this.properties.signalEnable;
                                SNAManager.getSNAManager().subscribe(this, this.signalEnable);
                            }
                        }
                        if (this.properties.signalDisable != null && this.properties.signalDisable != "") {
                            if (this.signalDisable == null) {
                                this.signalDisable = this.properties.signalDisable;
                                SNAManager.getSNAManager().subscribe(this, this.signalDisable);
                            }
                            else if (this.signalDisable !== this.properties.signalDisable) {
                                SNAManager.getSNAManager().unSubscribe(this, this.signalDisable);
                                this.signalDisable = this.properties.signalDisable;
                                SNAManager.getSNAManager().subscribe(this, this.signalDisable);
                            }
                        }
                        this.onPropertiesChange();
                    };
                    ActuatorAbstract.prototype.onActuateEnd = function () {
                        SNAManager.getSNAManager().emitSignal(this.properties.signalEnd);
                        this.actuating = false;
                        if (this.queued > 0) {
                            this.queued--;
                            this.start(this.signalId);
                            return null;
                        }
                        if (this.properties.loop) {
                            this.start(this.signalId);
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
                var SNAproperties = (function () {
                    function SNAproperties() {
                        this.signalId = "0";
                        this.signalEnable = "";
                        this.signalDisable = "";
                    }
                    return SNAproperties;
                }());
                vishva.SNAproperties = SNAproperties;
                var ActProperties = (function (_super) {
                    __extends(ActProperties, _super);
                    function ActProperties() {
                        var _this = _super !== null && _super.apply(this, arguments) || this;
                        _this.signalStart = "";
                        _this.signalEnd = "";
                        _this.autoStart = false;
                        _this.loop = false;
                        _this.toggle = true;
                        //when toggle is true then actuator can be in normal or reversed state
                        //else its always in normal (notReversed state);
                        _this.notReversed = true;
                        return _this;
                    }
                    return ActProperties;
                }(SNAproperties));
                vishva.ActProperties = ActProperties;
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
                var SelectType = org.ssatguru.babylonjs.vishva.gui.SelectType;
                var AnimatorProp = (function (_super) {
                    __extends(AnimatorProp, _super);
                    function AnimatorProp() {
                        var _this = _super !== null && _super.apply(this, arguments) || this;
                        _this.animationRange = new SelectType();
                        _this.rate = 1;
                        return _this;
                    }
                    return AnimatorProp;
                }(vishva.ActProperties));
                vishva.AnimatorProp = AnimatorProp;
                var ActuatorAnimator = (function (_super) {
                    __extends(ActuatorAnimator, _super);
                    function ActuatorAnimator(mesh, parms) {
                        var _this = this;
                        if (parms != null) {
                            _this = _super.call(this, mesh, parms) || this;
                        }
                        else {
                            _this = _super.call(this, mesh, new AnimatorProp()) || this;
                        }
                        var prop = _this.properties;
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
                    ActuatorAnimator.prototype.onPropertiesChange = function () {
                        if (this.properties.autoStart) {
                            var started = this.start(this.properties.signalId);
                        }
                    };
                    ActuatorAnimator.prototype.cleanUp = function () {
                        this.properties.loop = false;
                    };
                    return ActuatorAnimator;
                }(vishva.ActuatorAbstract));
                vishva.ActuatorAnimator = ActuatorAnimator;
            })(vishva = babylonjs.vishva || (babylonjs.vishva = {}));
        })(babylonjs = ssatguru.babylonjs || (ssatguru.babylonjs = {}));
    })(ssatguru = org.ssatguru || (org.ssatguru = {}));
})(org || (org = {}));
org.ssatguru.babylonjs.vishva.SNAManager.getSNAManager().addActuator("Animator", org.ssatguru.babylonjs.vishva.ActuatorAnimator);
var org;
(function (org) {
    var ssatguru;
    (function (ssatguru) {
        var babylonjs;
        (function (babylonjs) {
            var vishva;
            (function (vishva) {
                var Animation = BABYLON.Animation;
                var ActCloakerProp = (function (_super) {
                    __extends(ActCloakerProp, _super);
                    function ActCloakerProp() {
                        var _this = _super !== null && _super.apply(this, arguments) || this;
                        _this.timeToCloak = 1;
                        return _this;
                    }
                    return ActCloakerProp;
                }(vishva.ActProperties));
                vishva.ActCloakerProp = ActCloakerProp;
                var ActuatorCloaker = (function (_super) {
                    __extends(ActuatorCloaker, _super);
                    function ActuatorCloaker(mesh, parms) {
                        var _this = this;
                        if (parms != null) {
                            _this = _super.call(this, mesh, parms) || this;
                        }
                        else {
                            _this = _super.call(this, mesh, new ActCloakerProp()) || this;
                        }
                        _this.s = 1;
                        _this.e = 0;
                        return _this;
                    }
                    ActuatorCloaker.prototype.actuate = function () {
                        var _this = this;
                        var props = this.properties;
                        if (props.toggle) {
                            if (props.notReversed) {
                                this.s = 1;
                                this.e = 0;
                            }
                            else {
                                this.s = 0;
                                this.e = 1;
                            }
                            props.notReversed = !props.notReversed;
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
                    ActuatorCloaker.prototype.onPropertiesChange = function () {
                        if (this.properties.autoStart) {
                            var started = this.start(this.properties.signalId);
                        }
                    };
                    ActuatorCloaker.prototype.cleanUp = function () {
                        this.properties.loop = false;
                    };
                    return ActuatorCloaker;
                }(vishva.ActuatorAbstract));
                vishva.ActuatorCloaker = ActuatorCloaker;
            })(vishva = babylonjs.vishva || (babylonjs.vishva = {}));
        })(babylonjs = ssatguru.babylonjs || (ssatguru.babylonjs = {}));
    })(ssatguru = org.ssatguru || (org.ssatguru = {}));
})(org || (org = {}));
org.ssatguru.babylonjs.vishva.SNAManager.getSNAManager().addActuator("Cloaker", org.ssatguru.babylonjs.vishva.ActuatorCloaker);
var org;
(function (org) {
    var ssatguru;
    (function (ssatguru) {
        var babylonjs;
        (function (babylonjs) {
            var vishva;
            (function (vishva) {
                var ActDisablerProp = (function (_super) {
                    __extends(ActDisablerProp, _super);
                    function ActDisablerProp() {
                        return _super !== null && _super.apply(this, arguments) || this;
                    }
                    return ActDisablerProp;
                }(vishva.ActProperties));
                vishva.ActDisablerProp = ActDisablerProp;
                var ActuatorDisabler = (function (_super) {
                    __extends(ActuatorDisabler, _super);
                    function ActuatorDisabler(mesh, prop) {
                        var _this = this;
                        if (prop != null) {
                            _this = _super.call(this, mesh, prop) || this;
                        }
                        else {
                            _this = _super.call(this, mesh, new ActDisablerProp()) || this;
                        }
                        return _this;
                    }
                    ActuatorDisabler.prototype.actuate = function () {
                        var enableState = false;
                        if (this.properties.toggle) {
                            enableState = !this.properties.notReversed;
                            this.properties.notReversed = !this.properties.notReversed;
                        }
                        else {
                            enableState = false;
                        }
                        this.mesh.setEnabled(enableState);
                        this.disableChilds(this.mesh, enableState);
                        this.onActuateEnd();
                    };
                    ActuatorDisabler.prototype.disableChilds = function (mesh, enableState) {
                        var nodes = mesh.getDescendants(false);
                        for (var _i = 0, nodes_2 = nodes; _i < nodes_2.length; _i++) {
                            var node = nodes_2[_i];
                            node.setEnabled(enableState);
                        }
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
                    ActuatorDisabler.prototype.onPropertiesChange = function () {
                        if (this.properties.autoStart) {
                            var started = this.start(this.properties.signalId);
                        }
                    };
                    ActuatorDisabler.prototype.cleanUp = function () {
                        this.properties.loop = false;
                    };
                    return ActuatorDisabler;
                }(vishva.ActuatorAbstract));
                vishva.ActuatorDisabler = ActuatorDisabler;
            })(vishva = babylonjs.vishva || (babylonjs.vishva = {}));
        })(babylonjs = ssatguru.babylonjs || (ssatguru.babylonjs = {}));
    })(ssatguru = org.ssatguru || (org.ssatguru = {}));
})(org || (org = {}));
org.ssatguru.babylonjs.vishva.SNAManager.getSNAManager().addActuator("Disabler", org.ssatguru.babylonjs.vishva.ActuatorDisabler);
var org;
(function (org) {
    var ssatguru;
    (function (ssatguru) {
        var babylonjs;
        (function (babylonjs) {
            var vishva;
            (function (vishva) {
                var ActEnablerProp = (function (_super) {
                    __extends(ActEnablerProp, _super);
                    function ActEnablerProp() {
                        return _super !== null && _super.apply(this, arguments) || this;
                    }
                    return ActEnablerProp;
                }(vishva.ActProperties));
                vishva.ActEnablerProp = ActEnablerProp;
                var ActuatorEnabler = (function (_super) {
                    __extends(ActuatorEnabler, _super);
                    function ActuatorEnabler(mesh, prop) {
                        var _this = this;
                        if (prop != null) {
                            _this = _super.call(this, mesh, prop) || this;
                        }
                        else {
                            _this = _super.call(this, mesh, new ActEnablerProp()) || this;
                        }
                        return _this;
                    }
                    ActuatorEnabler.prototype.actuate = function () {
                        var enableState = true;
                        if (this.properties.toggle) {
                            enableState = this.properties.notReversed;
                            this.properties.notReversed = !this.properties.notReversed;
                        }
                        this.mesh.setEnabled(enableState);
                        this.enableChilds(this.mesh, enableState);
                        this.onActuateEnd();
                    };
                    ActuatorEnabler.prototype.enableChilds = function (mesh, enableState) {
                        var nodes = mesh.getDescendants(false);
                        for (var _i = 0, nodes_3 = nodes; _i < nodes_3.length; _i++) {
                            var node = nodes_3[_i];
                            node.setEnabled(enableState);
                        }
                    };
                    ActuatorEnabler.prototype.stop = function () {
                        this.mesh.setEnabled(true);
                    };
                    ActuatorEnabler.prototype.isReady = function () {
                        return true;
                    };
                    ActuatorEnabler.prototype.getName = function () {
                        return "Enabler";
                    };
                    ActuatorEnabler.prototype.onPropertiesChange = function () {
                        if (this.properties.autoStart) {
                            var started = this.start(this.properties.signalId);
                        }
                    };
                    ActuatorEnabler.prototype.cleanUp = function () {
                        this.properties.loop = false;
                    };
                    return ActuatorEnabler;
                }(vishva.ActuatorAbstract));
                vishva.ActuatorEnabler = ActuatorEnabler;
            })(vishva = babylonjs.vishva || (babylonjs.vishva = {}));
        })(babylonjs = ssatguru.babylonjs || (ssatguru.babylonjs = {}));
    })(ssatguru = org.ssatguru || (org.ssatguru = {}));
})(org || (org = {}));
org.ssatguru.babylonjs.vishva.SNAManager.getSNAManager().addActuator("Enabler", org.ssatguru.babylonjs.vishva.ActuatorEnabler);
/**
 * Switches lights attached to a mesh on or off.
 * It does so by enabling or disabling lights attached to a mesh.
 */
var org;
/**
 * Switches lights attached to a mesh on or off.
 * It does so by enabling or disabling lights attached to a mesh.
 */
(function (org) {
    var ssatguru;
    (function (ssatguru) {
        var babylonjs;
        (function (babylonjs) {
            var vishva;
            (function (vishva) {
                var Light = BABYLON.Light;
                var SelectType = org.ssatguru.babylonjs.vishva.gui.SelectType;
                var ActLightProp = (function (_super) {
                    __extends(ActLightProp, _super);
                    function ActLightProp() {
                        var _this = _super.call(this) || this;
                        _this.switchType = new SelectType();
                        _this.switchType.values = ["OnSwitch", "OffSwitch"];
                        _this.switchType.value = "OnSwitch";
                        return _this;
                    }
                    return ActLightProp;
                }(vishva.ActProperties));
                vishva.ActLightProp = ActLightProp;
                var ActuatorLight = (function (_super) {
                    __extends(ActuatorLight, _super);
                    function ActuatorLight(mesh, prop) {
                        var _this = this;
                        if (prop != null) {
                            _this = _super.call(this, mesh, prop) || this;
                        }
                        else {
                            _this = _super.call(this, mesh, new ActLightProp()) || this;
                        }
                        return _this;
                    }
                    ActuatorLight.prototype.actuate = function () {
                        var lights = this.getLights(this.mesh);
                        if (lights.length == 0) {
                            this.onActuateEnd();
                            return;
                        }
                        var actLightProp = this.properties;
                        var enable;
                        if (actLightProp.switchType.value == "OnSwitch")
                            enable = true;
                        else
                            enable = false;
                        if (this.properties.toggle) {
                            if (!this.properties.notReversed) {
                                enable = !enable;
                            }
                            this.properties.notReversed = !this.properties.notReversed;
                        }
                        this.switchLights(lights, enable);
                        this.onActuateEnd();
                    };
                    ActuatorLight.prototype.switchLights = function (lights, enable) {
                        for (var _i = 0, lights_1 = lights; _i < lights_1.length; _i++) {
                            var light = lights_1[_i];
                            light.setEnabled(enable);
                        }
                    };
                    ActuatorLight.prototype.getLights = function (mesh) {
                        var nodes = mesh.getDescendants(false);
                        var lights = [];
                        for (var _i = 0, nodes_4 = nodes; _i < nodes_4.length; _i++) {
                            var node = nodes_4[_i];
                            if (node instanceof Light) {
                                lights.push(node);
                            }
                        }
                        return lights;
                    };
                    ActuatorLight.prototype.stop = function () {
                        var actLightProp = this.properties;
                        var enable;
                        if (actLightProp.switchType.value == "OnSwitch")
                            enable = true;
                        else
                            enable = false;
                        this.switchLights(this.getLights(this.mesh), true);
                    };
                    ActuatorLight.prototype.isReady = function () {
                        return true;
                    };
                    ActuatorLight.prototype.getName = function () {
                        return "Light";
                    };
                    ActuatorLight.prototype.onPropertiesChange = function () {
                        if (this.properties.autoStart) {
                            this.start(this.properties.signalId);
                        }
                    };
                    ActuatorLight.prototype.cleanUp = function () {
                        this.properties.loop = false;
                    };
                    return ActuatorLight;
                }(vishva.ActuatorAbstract));
                vishva.ActuatorLight = ActuatorLight;
            })(vishva = babylonjs.vishva || (babylonjs.vishva = {}));
        })(babylonjs = ssatguru.babylonjs || (ssatguru.babylonjs = {}));
    })(ssatguru = org.ssatguru || (org.ssatguru = {}));
})(org || (org = {}));
org.ssatguru.babylonjs.vishva.SNAManager.getSNAManager().addActuator("Light", org.ssatguru.babylonjs.vishva.ActuatorLight);
var org;
(function (org) {
    var ssatguru;
    (function (ssatguru) {
        var babylonjs;
        (function (babylonjs) {
            var vishva;
            (function (vishva) {
                var Animation = BABYLON.Animation;
                var Vector3 = BABYLON.Vector3;
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
                    return ActMoverParm;
                }(vishva.ActProperties));
                vishva.ActMoverParm = ActMoverParm;
                var ActuatorMover = (function (_super) {
                    __extends(ActuatorMover, _super);
                    function ActuatorMover(mesh, parms) {
                        var _this = this;
                        if (parms != null) {
                            _this = _super.call(this, mesh, parms) || this;
                        }
                        else {
                            _this = _super.call(this, mesh, new ActMoverParm()) || this;
                        }
                        return _this;
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
                            if (props.notReversed) {
                                nPos = cPos.add(moveBy);
                            }
                            else {
                                nPos = cPos.subtract(moveBy);
                            }
                            props.notReversed = !props.notReversed;
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
                    ActuatorMover.prototype.onPropertiesChange = function () {
                        if (this.properties.autoStart) {
                            var started = this.start(this.properties.signalId);
                        }
                    };
                    ActuatorMover.prototype.isReady = function () {
                        return true;
                    };
                    ActuatorMover.prototype.newInstance = function (mesh, parms) {
                        return new ActuatorMover(mesh, parms);
                    };
                    return ActuatorMover;
                }(vishva.ActuatorAbstract));
                vishva.ActuatorMover = ActuatorMover;
            })(vishva = babylonjs.vishva || (babylonjs.vishva = {}));
        })(babylonjs = ssatguru.babylonjs || (ssatguru.babylonjs = {}));
    })(ssatguru = org.ssatguru || (org.ssatguru = {}));
})(org || (org = {}));
org.ssatguru.babylonjs.vishva.SNAManager.getSNAManager().addActuator("Mover", org.ssatguru.babylonjs.vishva.ActuatorMover);
var org;
(function (org) {
    var ssatguru;
    (function (ssatguru) {
        var babylonjs;
        (function (babylonjs) {
            var vishva;
            (function (vishva) {
                var Animation = BABYLON.Animation;
                var Axis = BABYLON.Axis;
                var Quaternion = BABYLON.Quaternion;
                var ActRotatorParm = (function (_super) {
                    __extends(ActRotatorParm, _super);
                    function ActRotatorParm() {
                        var _this = _super !== null && _super.apply(this, arguments) || this;
                        _this.x = 0;
                        _this.y = 90;
                        _this.z = 0;
                        _this.duration = 1;
                        return _this;
                        // TODO:always local for now. provide a way to do global rotate
                        // boolean local = false;
                    }
                    return ActRotatorParm;
                }(vishva.ActProperties));
                vishva.ActRotatorParm = ActRotatorParm;
                var ActuatorRotator = (function (_super) {
                    __extends(ActuatorRotator, _super);
                    function ActuatorRotator(mesh, parms) {
                        var _this = this;
                        if (parms != null) {
                            _this = _super.call(this, mesh, parms) || this;
                        }
                        else {
                            _this = _super.call(this, mesh, new ActRotatorParm()) || this;
                        }
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
                            if (properties.notReversed) {
                                nPos = cPos.multiply(abc);
                            }
                            else {
                                nPos = cPos.multiply(Quaternion.Inverse(abc));
                            }
                        }
                        else
                            nPos = cPos.multiply(rotX).multiply(rotY).multiply(rotZ);
                        properties.notReversed = !properties.notReversed;
                        var cY = this.mesh.position.y;
                        var nY = this.mesh.position.y + 5;
                        this.a = Animation.CreateAndStartAnimation("rotate", this.mesh, "rotationQuaternion", 60, 60 * properties.duration, cPos, nPos, 0, null, function () {
                            return _this.onActuateEnd();
                        });
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
                    ActuatorRotator.prototype.onPropertiesChange = function () {
                        if (this.properties.autoStart) {
                            var started = this.start(this.properties.signalId);
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
                }(vishva.ActuatorAbstract));
                vishva.ActuatorRotator = ActuatorRotator;
            })(vishva = babylonjs.vishva || (babylonjs.vishva = {}));
        })(babylonjs = ssatguru.babylonjs || (ssatguru.babylonjs = {}));
    })(ssatguru = org.ssatguru || (org.ssatguru = {}));
})(org || (org = {}));
org.ssatguru.babylonjs.vishva.SNAManager.getSNAManager().addActuator("Rotator", org.ssatguru.babylonjs.vishva.ActuatorRotator);
var org;
(function (org) {
    var ssatguru;
    (function (ssatguru) {
        var babylonjs;
        (function (babylonjs) {
            var vishva;
            (function (vishva) {
                var SelectType = org.ssatguru.babylonjs.vishva.gui.SelectType;
                var Range = org.ssatguru.babylonjs.vishva.gui.Range;
                var Sound = BABYLON.Sound;
                var ActSoundProp = (function (_super) {
                    __extends(ActSoundProp, _super);
                    function ActSoundProp() {
                        var _this = _super !== null && _super.apply(this, arguments) || this;
                        _this.soundFile = new SelectType();
                        _this.attachToMesh = false;
                        _this.volume = new Range(0.0, 1.0, 1.0, 0.1);
                        return _this;
                    }
                    return ActSoundProp;
                }(vishva.ActProperties));
                vishva.ActSoundProp = ActSoundProp;
                var ActuatorSound = (function (_super) {
                    __extends(ActuatorSound, _super);
                    function ActuatorSound(mesh, prop) {
                        var _this = this;
                        if (prop != null) {
                            _this = _super.call(this, mesh, prop) || this;
                        }
                        else {
                            _this = _super.call(this, mesh, new ActSoundProp()) || this;
                        }
                        return _this;
                    }
                    ActuatorSound.prototype.actuate = function () {
                        var _this = this;
                        if (this.properties.toggle) {
                            if (this.properties.notReversed) {
                                this.sound.play();
                            }
                            else {
                                window.setTimeout((function () { return _this.onActuateEnd(); }), 0);
                            }
                            this.properties.notReversed = !this.properties.notReversed;
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
                    ActuatorSound.prototype.onPropertiesChange = function () {
                        var _this = this;
                        var SOUND_ASSET_LOCATION = "vishva/assets/sounds/";
                        //let RELATIVE_ASSET_LOCATION: string = "../../../../";
                        var RELATIVE_ASSET_LOCATION = "";
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
                            var started = this.start(this.properties.signalId);
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
                }(vishva.ActuatorAbstract));
                vishva.ActuatorSound = ActuatorSound;
            })(vishva = babylonjs.vishva || (babylonjs.vishva = {}));
        })(babylonjs = ssatguru.babylonjs || (ssatguru.babylonjs = {}));
    })(ssatguru = org.ssatguru || (org.ssatguru = {}));
})(org || (org = {}));
org.ssatguru.babylonjs.vishva.SNAManager.getSNAManager().addActuator("Sound", org.ssatguru.babylonjs.vishva.ActuatorSound);
var org;
(function (org) {
    var ssatguru;
    (function (ssatguru) {
        var babylonjs;
        (function (babylonjs) {
            var vishva;
            (function (vishva) {
                var ActionManager = BABYLON.ActionManager;
                var ExecuteCodeAction = BABYLON.ExecuteCodeAction;
                var SelectType = org.ssatguru.babylonjs.vishva.gui.SelectType;
                var SenClickProp = (function (_super) {
                    __extends(SenClickProp, _super);
                    function SenClickProp() {
                        var _this = _super.call(this) || this;
                        _this.clickType = new SelectType();
                        _this.clickType.values = ["leftClick", "middleClick", "rightClick", "doubleClick"];
                        _this.clickType.value = "leftClick";
                        return _this;
                    }
                    return SenClickProp;
                }(vishva.SNAproperties));
                vishva.SenClickProp = SenClickProp;
                var SensorClick = (function (_super) {
                    __extends(SensorClick, _super);
                    //properties: SNAproperties;
                    function SensorClick(mesh, prop) {
                        var _this = this;
                        if (prop != null) {
                            _this = _super.call(this, mesh, prop) || this;
                        }
                        else {
                            _this = _super.call(this, mesh, new SenClickProp()) || this;
                        }
                        _this.onPropertiesChange();
                        return _this;
                    }
                    SensorClick.prototype.getName = function () {
                        return "Click";
                    };
                    SensorClick.prototype.getProperties = function () {
                        return this.properties;
                    };
                    SensorClick.prototype.setProperties = function (properties) {
                        this.properties = properties;
                    };
                    SensorClick.prototype.cleanUp = function () {
                    };
                    SensorClick.prototype.onPropertiesChange = function () {
                        var _this = this;
                        if (this.mesh.actionManager == null) {
                            this.mesh.actionManager = new ActionManager(this.mesh.getScene());
                        }
                        var clickProp = this.properties;
                        var actType;
                        if (clickProp.clickType.value == "doubleClick") {
                            actType = ActionManager.OnDoublePickTrigger;
                        }
                        else if (clickProp.clickType.value == "rightClick") {
                            actType = ActionManager.OnRightPickTrigger;
                        }
                        else if (clickProp.clickType.value == "leftClick") {
                            actType = ActionManager.OnLeftPickTrigger;
                        }
                        else if (clickProp.clickType.value == "middleClick") {
                            actType = ActionManager.OnCenterPickTrigger;
                        }
                        var action = new ExecuteCodeAction(actType, function (e) {
                            _this.emitSignal(e);
                        });
                        this.mesh.actionManager.registerAction(action);
                        this.actions.push(action);
                    };
                    return SensorClick;
                }(vishva.SensorAbstract));
                vishva.SensorClick = SensorClick;
            })(vishva = babylonjs.vishva || (babylonjs.vishva = {}));
        })(babylonjs = ssatguru.babylonjs || (ssatguru.babylonjs = {}));
    })(ssatguru = org.ssatguru || (org.ssatguru = {}));
})(org || (org = {}));
org.ssatguru.babylonjs.vishva.SNAManager.getSNAManager().addSensor("Click", org.ssatguru.babylonjs.vishva.SensorClick);
var org;
(function (org) {
    var ssatguru;
    (function (ssatguru) {
        var babylonjs;
        (function (babylonjs) {
            var vishva;
            (function (vishva) {
                var ActionManager = BABYLON.ActionManager;
                var ExecuteCodeAction = BABYLON.ExecuteCodeAction;
                var Tags = BABYLON.Tags;
                var SenContactProp = (function (_super) {
                    __extends(SenContactProp, _super);
                    function SenContactProp() {
                        var _this = _super !== null && _super.apply(this, arguments) || this;
                        _this.onEnter = false;
                        _this.onExit = false;
                        return _this;
                    }
                    return SenContactProp;
                }(vishva.SNAproperties));
                vishva.SenContactProp = SenContactProp;
                var SensorContact = (function (_super) {
                    __extends(SensorContact, _super);
                    function SensorContact(mesh, prop) {
                        var _this = this;
                        if (prop != null) {
                            _this = _super.call(this, mesh, prop) || this;
                        }
                        else {
                            _this = _super.call(this, mesh, new SenContactProp()) || this;
                        }
                        _this.onPropertiesChange();
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
                    SensorContact.prototype.onPropertiesChange = function () {
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
                }(vishva.SensorAbstract));
                vishva.SensorContact = SensorContact;
            })(vishva = babylonjs.vishva || (babylonjs.vishva = {}));
        })(babylonjs = ssatguru.babylonjs || (ssatguru.babylonjs = {}));
    })(ssatguru = org.ssatguru || (org.ssatguru = {}));
})(org || (org = {}));
org.ssatguru.babylonjs.vishva.SNAManager.getSNAManager().addSensor("Contact", org.ssatguru.babylonjs.vishva.SensorContact);
var org;
(function (org) {
    var ssatguru;
    (function (ssatguru) {
        var babylonjs;
        (function (babylonjs) {
            var vishva;
            (function (vishva) {
                var SenTimerProp = (function (_super) {
                    __extends(SenTimerProp, _super);
                    function SenTimerProp() {
                        var _this = _super !== null && _super.apply(this, arguments) || this;
                        _this.interval = 1000;
                        _this.plusMinus = 0;
                        return _this;
                    }
                    return SenTimerProp;
                }(vishva.SNAproperties));
                vishva.SenTimerProp = SenTimerProp;
                var SensorTimer = (function (_super) {
                    __extends(SensorTimer, _super);
                    function SensorTimer(mesh, prop) {
                        var _this = this;
                        if (prop != null) {
                            _this = _super.call(this, mesh, prop) || this;
                        }
                        else {
                            _this = _super.call(this, mesh, new SenTimerProp()) || this;
                        }
                        _this.onPropertiesChange();
                        return _this;
                    }
                    SensorTimer.prototype.getName = function () {
                        return "Timer";
                    };
                    SensorTimer.prototype.getProperties = function () {
                        return this.properties;
                    };
                    SensorTimer.prototype.setProperties = function (properties) {
                        this.properties = properties;
                    };
                    SensorTimer.prototype.cleanUp = function () {
                        //window.clearInterval(this.timerId);
                        window.clearTimeout(this.timerId);
                    };
                    SensorTimer.prototype.processUpdateSpecific_old = function () {
                        var _this = this;
                        var properties = this.properties;
                        if (this.timerId) {
                            window.clearInterval(this.timerId);
                        }
                        this.timerId = window.setInterval(function () { _this.emitSignal(); }, properties.interval);
                    };
                    SensorTimer.prototype.onPropertiesChange = function () {
                        var _this = this;
                        var properties = this.properties;
                        if (this.timerId) {
                            window.clearTimeout(this.timerId);
                        }
                        this.timerId = window.setTimeout(function () { _this.signalEmitter(); }, properties.interval);
                    };
                    SensorTimer.prototype.signalEmitter = function () {
                        var _this = this;
                        var properties = this.properties;
                        this.emitSignal();
                        window.clearTimeout(this.timerId);
                        var i = properties.interval;
                        var pm = properties.plusMinus;
                        if (pm > 0) {
                            var min = i - pm;
                            if (min < 0)
                                min = 0;
                            i = this.getRandomInt(min, i + pm);
                        }
                        this.timerId = window.setTimeout(function () { _this.signalEmitter(); }, i);
                    };
                    SensorTimer.prototype.getRandomInt = function (min, max) {
                        min = Math.ceil(min);
                        max = Math.floor(max);
                        return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive 
                    };
                    return SensorTimer;
                }(vishva.SensorAbstract));
                vishva.SensorTimer = SensorTimer;
            })(vishva = babylonjs.vishva || (babylonjs.vishva = {}));
        })(babylonjs = ssatguru.babylonjs || (ssatguru.babylonjs = {}));
    })(ssatguru = org.ssatguru || (org.ssatguru = {}));
})(org || (org = {}));
org.ssatguru.babylonjs.vishva.SNAManager.getSNAManager().addSensor("Timer", org.ssatguru.babylonjs.vishva.SensorTimer);
var org;
(function (org) {
    var ssatguru;
    (function (ssatguru) {
        var babylonjs;
        (function (babylonjs) {
            var vishva;
            (function (vishva) {
                var ActionManager = BABYLON.ActionManager;
                var ExecuteCodeAction = BABYLON.ExecuteCodeAction;
                var SenTouchProp = (function (_super) {
                    __extends(SenTouchProp, _super);
                    function SenTouchProp() {
                        return _super !== null && _super.apply(this, arguments) || this;
                    }
                    return SenTouchProp;
                }(vishva.SNAproperties));
                vishva.SenTouchProp = SenTouchProp;
                var SensorTouch = (function (_super) {
                    __extends(SensorTouch, _super);
                    function SensorTouch(mesh, prop) {
                        var _this = this;
                        if (prop != null) {
                            _this = _super.call(this, mesh, prop) || this;
                        }
                        else {
                            _this = _super.call(this, mesh, new SenTouchProp()) || this;
                        }
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
                    SensorTouch.prototype.onPropertiesChange = function () {
                    };
                    return SensorTouch;
                }(vishva.SensorAbstract));
                vishva.SensorTouch = SensorTouch;
            })(vishva = babylonjs.vishva || (babylonjs.vishva = {}));
        })(babylonjs = ssatguru.babylonjs || (ssatguru.babylonjs = {}));
    })(ssatguru = org.ssatguru || (org.ssatguru = {}));
})(org || (org = {}));
org.ssatguru.babylonjs.vishva.SNAManager.getSNAManager().addSensor("Touch", org.ssatguru.babylonjs.vishva.SensorTouch);
