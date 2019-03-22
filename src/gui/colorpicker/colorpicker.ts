/**
 * ColorPicker - pure JavaScript color picker without using images, external CSS or 1px divs.
 * Copyright © 2011 David Durman, All rights reserved.
 */

import "./colorpicker.themes.css";
import "./colorpickerLeft.png";
import "./colorpickerTarget.png";

export class ColorPicker {

    hueOffset = 15;
    svgNS = 'http://www.w3.org/2000/svg';

    // This HTML snippet is inserted into the innerHTML property of the passed color picker element
    // when the no-hassle call to ColorPicker() is used, i.e. ColorPicker(function(hex, hsv, rgb) { ... });

    colorpickerHTMLSnippet = [

        '<div class="picker-wrapper">',
        '<div class="picker"></div>',
        '<div class="picker-indicator"></div>',
        '</div>',
        '<div class="slide-wrapper">',
        '<div class="slide"></div>',
        '<div class="slide-indicator"></div>',
        '</div>'

    ].join('');

    /**
     * Return mouse position relative to the element el, optionally
     * clipping the coordinates to be inside the element
     */
    mousePosition(evt, el, clip) {
        var posx = 0, posy = 0, result,
            bounds = el.getBoundingClientRect();
        // https://www.quirksmode.org/js/events_properties.html#position
        evt = evt || window.event;
        if (evt.pageX || evt.pageY) {
            posx = evt.pageX;
            posy = evt.pageY;
        }
        else if (evt.clientX || evt.clientY) {
            posx = evt.clientX + document.body.scrollLeft
                + document.documentElement.scrollLeft;
            posy = evt.clientY + document.body.scrollTop
                + document.documentElement.scrollTop;
        }
        result = {
            x: posx - bounds.left,
            y: posy - bounds.top
        };
        if (clip) {
            result.x = Math.max(0, Math.min(el.offsetWidth, result.x));
            result.y = Math.max(0, Math.min(el.offsetHeight, result.y));
        }
        return result;
    }

    /**
     * Create SVG element.
     */
    _makeSvg(el, attrs, children?) {
        el = document.createElementNS(this.svgNS, el);
        for (var key in attrs)
            el.setAttribute(key, attrs[key]);
        if (Object.prototype.toString.call(children) != '[object Array]') children = [children];
        var i = 0, len = (children[0] && children.length) || 0;
        for (; i < len; i++)
            el.appendChild(children[i]);
        return el;
    }

    /**
     * Create slide and picker markup depending on the supported technology.
     */


    slide = this._makeSvg('svg', { xmlns: 'http://www.w3.org/2000/svg', version: '1.1', width: '100%', height: '100%' },
        [
            this._makeSvg('defs', {},
                this._makeSvg('linearGradient', { id: 'gradient-hsv', x1: '0%', y1: '100%', x2: '0%', y2: '0%' },
                    [
                        this._makeSvg('stop', { offset: '0%', 'stop-color': '#FF0000', 'stop-opacity': '1' }),
                        this._makeSvg('stop', { offset: '13%', 'stop-color': '#FF00FF', 'stop-opacity': '1' }),
                        this._makeSvg('stop', { offset: '25%', 'stop-color': '#8000FF', 'stop-opacity': '1' }),
                        this._makeSvg('stop', { offset: '38%', 'stop-color': '#0040FF', 'stop-opacity': '1' }),
                        this._makeSvg('stop', { offset: '50%', 'stop-color': '#00FFFF', 'stop-opacity': '1' }),
                        this._makeSvg('stop', { offset: '63%', 'stop-color': '#00FF40', 'stop-opacity': '1' }),
                        this._makeSvg('stop', { offset: '75%', 'stop-color': '#0BED00', 'stop-opacity': '1' }),
                        this._makeSvg('stop', { offset: '88%', 'stop-color': '#FFFF00', 'stop-opacity': '1' }),
                        this._makeSvg('stop', { offset: '100%', 'stop-color': '#FF0000', 'stop-opacity': '1' })
                    ]
                )
            ),
            this._makeSvg('rect', { x: '0', y: '0', width: '100%', height: '100%', fill: 'url(#gradient-hsv)' })
        ]
    );

    picker = this._makeSvg('svg', { xmlns: 'http://www.w3.org/2000/svg', version: '1.1', width: '100%', height: '100%' },
        [
            this._makeSvg('defs', {},
                [
                    this._makeSvg('linearGradient', { id: 'gradient-black', x1: '0%', y1: '100%', x2: '0%', y2: '0%' },
                        [
                            this._makeSvg('stop', { offset: '0%', 'stop-color': '#000000', 'stop-opacity': '1' }),
                            this._makeSvg('stop', { offset: '100%', 'stop-color': '#CC9A81', 'stop-opacity': '0' })
                        ]
                    ),
                    this._makeSvg('linearGradient', { id: 'gradient-white', x1: '0%', y1: '100%', x2: '100%', y2: '100%' },
                        [
                            this._makeSvg('stop', { offset: '0%', 'stop-color': '#FFFFFF', 'stop-opacity': '1' }),
                            this._makeSvg('stop', { offset: '100%', 'stop-color': '#CC9A81', 'stop-opacity': '0' })
                        ]
                    )
                ]
            ),
            this._makeSvg('rect', { x: '0', y: '0', width: '100%', height: '100%', fill: 'url(#gradient-white)' }),
            this._makeSvg('rect', { x: '0', y: '0', width: '100%', height: '100%', fill: 'url(#gradient-black)' })
        ]
    );



    /**
     * Convert HSV representation to RGB HEX string.
     * Credits to http://www.raphaeljs.com
     */
    _hsv2rgb(hsv) {
        var R, G, B, X, C;
        var h = (hsv.h % 360) / 60;

        C = hsv.v * hsv.s;
        X = C * (1 - Math.abs(h % 2 - 1));
        R = G = B = hsv.v - C;

        h = ~~h;
        R += [C, X, 0, 0, X, C][h];
        G += [X, C, C, X, 0, 0][h];
        B += [0, 0, X, C, C, X][h];

        var r = Math.floor(R * 255);
        var g = Math.floor(G * 255);
        var b = Math.floor(B * 255);
        return { r: r, g: g, b: b, hex: "#" + (16777216 | b | (g << 8) | (r << 16)).toString(16).slice(1) };
    }

    /**
     * Convert RGB representation to HSV.
     * r, g, b can be either in <0,1> range or <0,255> range.
     * Credits to http://www.raphaeljs.com
     */
    _rgb2hsv(rgb) {

        var r = rgb.r;
        var g = rgb.g;
        var b = rgb.b;

        if (rgb.r > 1 || rgb.g > 1 || rgb.b > 1) {
            r /= 255;
            g /= 255;
            b /= 255;
        }

        var H, S, V, C;
        V = Math.max(r, g, b);
        C = V - Math.min(r, g, b);
        H = (C == 0 ? null :
            V == r ? (g - b) / C + (g < b ? 6 : 0) :
                V == g ? (b - r) / C + 2 :
                    (r - g) / C + 4);
        H = (H % 6) * 60;
        S = C == 0 ? 0 : C / V;
        return { h: H, s: S, v: V };
    }

    /**
     * Return click event handler for the slider.
     * Sets picker background color and calls ctx.callback if provided.
     */
    slideListener( slideElement, pickerElement) {
        return  (evt)=> {
            evt = evt || window.event;
            var mouse = this.mousePosition(evt, slideElement, true);
            this.h = mouse.y / slideElement.offsetHeight * 360 + this.hueOffset;
            var pickerColor = this._hsv2rgb({ h: this.h, s: 1, v: 1 });
            var c = this._hsv2rgb({ h: this.h, s: this.s, v: this.v });
            pickerElement.style.backgroundColor = pickerColor.hex;
            this.callback && this.callback(c.hex, { h: this.h - this.hueOffset, s: this.s, v: this.v }, { r: c.r, g: c.g, b: c.b }, undefined, mouse);
        }
    };

    /**
     * Return click event handler for the picker.
     * Calls ctx.callback if provided.
     */
    pickerListener( pickerElement) {
        return  (evt) => {
            evt = evt || window.event;
            var mouse = this.mousePosition(evt, pickerElement, true),
                width = pickerElement.offsetWidth,
                height = pickerElement.offsetHeight;

            this.s = mouse.x / width;
            this.v = (height - mouse.y) / height;
            var c = this._hsv2rgb({ h: this.h, s: this.s, v: this.v });
            this.callback && this.callback(c.hex, { h: this.h - this.hueOffset, s: this.s, v: this.v }, { r: c.r, g: c.g, b: c.b }, mouse);
        }
    };

    
    slideElement;
    pickerElement;
    callback;
    h;s;v;
    /**
     * ColorPicker.
     * @param {DOMElement} slideElement HSV slide element.
     * @param {DOMElement} pickerElement HSV picker element.
     * @param {Function} callback Called whenever the color is changed provided chosen color in RGB HEX format as the only argument.
     */
    constructor(slideElement, pickerElement, callback?) {


        this.h = 0;
        this.s = 1;
        this.v = 1;

        let uniqID =0;

        if (window["uniqID"] == undefined){
            window["uniqID"] = 0;
        }else{
            window["uniqID"]++;
            uniqID = window["uniqID"] ;
            
        }

        if (!callback) {
            // call of the form ColorPicker(element, funtion(hex, hsv, rgb) { ... }), i.e. the no-hassle call.

            var element = slideElement;
            element.innerHTML = this.colorpickerHTMLSnippet;

            this.slideElement = element.getElementsByClassName('slide')[0];
            this.pickerElement = element.getElementsByClassName('picker')[0];
            var slideIndicator = element.getElementsByClassName('slide-indicator')[0];
            var pickerIndicator = element.getElementsByClassName('picker-indicator')[0];

            this.fixIndicators(slideIndicator, pickerIndicator);

            this.callback =  (hex, hsv, rgb, pickerCoordinate, slideCoordinate) => {

                this.positionIndicators(slideIndicator, pickerIndicator, slideCoordinate, pickerCoordinate);

                pickerElement(hex, hsv, rgb);
            };

        } else {

            this.callback = callback;
            this.pickerElement = pickerElement;
            this.slideElement = slideElement;
        }


        // Generate uniq IDs for linearGradients so that we don't have the same IDs within one document.
        // Then reference those gradients in the associated rectangles.

        var slideClone = this.slide.cloneNode(true);
        var pickerClone = this.picker.cloneNode(true);

        var hsvGradient = slideClone.getElementsByTagName('linearGradient')[0];

        var hsvRect = slideClone.getElementsByTagName('rect')[0];

        hsvGradient.id = 'gradient-hsv-' + uniqID;
        hsvRect.setAttribute('fill', 'url(#' + hsvGradient.id + ')');

        var blackAndWhiteGradients = [pickerClone.getElementsByTagName('linearGradient')[0], pickerClone.getElementsByTagName('linearGradient')[1]];
        var whiteAndBlackRects = pickerClone.getElementsByTagName('rect');

        blackAndWhiteGradients[0].id = 'gradient-black-' + uniqID;
        blackAndWhiteGradients[1].id = 'gradient-white-' + uniqID;

        whiteAndBlackRects[0].setAttribute('fill', 'url(#' + blackAndWhiteGradients[1].id + ')');
        whiteAndBlackRects[1].setAttribute('fill', 'url(#' + blackAndWhiteGradients[0].id + ')');

        this.slideElement.appendChild(slideClone);
        this.pickerElement.appendChild(pickerClone);

        this.addEventListener(this.slideElement, 'click', this.slideListener( this.slideElement, this.pickerElement));
        this.addEventListener(this.pickerElement, 'click', this.pickerListener( this.pickerElement));

        this.enableDragging(this, this.slideElement, this.slideListener( this.slideElement, this.pickerElement));
        this.enableDragging(this, this.pickerElement, this.pickerListener( this.pickerElement));
    };

    addEventListener(element, event, listener) {

        if (element.attachEvent) {

            element.attachEvent('on' + event, listener);

        } else if (element.addEventListener) {

            element.addEventListener(event, listener, false);
        }
    }

    removeEventListener(element, event, listener) {

        if (element.detachEvent) {

            element.detachEvent('on' + event, listener);

        } else if (element.removeEventListener) {

            element.removeEventListener(event, listener, false);
        }
    }

    /**
     * Enable drag&drop color selection.
     * @param {object} ctx ColorPicker instance.
     * @param {DOMElement} element HSV slide element or HSV picker element.
     * @param {Function} listener Function that will be called whenever mouse is dragged over the element with event object as argument.
     */
    enableDragging(ctx, element, listener) {

        var start = ()=> {
            this.removeEventListener(element, 'mousedown', start);
            this.addEventListener(document.body, 'mouseup', stop);
            this.addEventListener(document.body, 'mousemove', listener);
        };

        var stop =  () => {
            this.addEventListener(element, 'mousedown', start);
            this.removeEventListener(document.body, 'mouseup', stop);
            this.removeEventListener(document.body, 'mousemove', listener);
        };

        this.addEventListener(element, 'mousedown', start);
        this.addEventListener(element, 'dragstart',  (evt)=> {
            evt = evt || window.event;
            if (evt.preventDefault) {
                evt.preventDefault();
            } else {
                evt.returnValue = false;
            }
        });

    }


    hsv2rgb(hsv) {
        var rgbHex = this._hsv2rgb(hsv);
        delete rgbHex.hex;
        return rgbHex;
    };

    hsv2hex = function (hsv) {
        return this._hsv2rgb(hsv).hex;
    };

    rgb2hsv = this._rgb2hsv;

    rgb2hex = function (rgb) {
        return this._hsv2rgb(this.rgb2hsv(rgb)).hex;
    };

    hex2hsv = function (hex) {
        return this._rgb2hsv(this.hex2rgb(hex));
    };

    hex2rgb = function (hex) {
        return { r: parseInt(hex.substr(1, 2), 16), g: parseInt(hex.substr(3, 2), 16), b: parseInt(hex.substr(5, 2), 16) };
    };

    /**
     * Sets color of the picker in hsv/rgb/hex format.
     * @param {object} ctx ColorPicker instance.
     * @param {object} hsv Object of the form: { h: <hue>, s: <saturation>, v: <value> }.
     * @param {object} rgb Object of the form: { r: <red>, g: <green>, b: <blue> }.
     * @param {string} hex String of the form: #RRGGBB.
     */
    setColor(ctx, hsv, rgb?, hex?) {
        ctx.h = hsv.h % 360;
        ctx.s = hsv.s;
        ctx.v = hsv.v;

        var c = this.hsv2rgb(ctx);

        var mouseSlide = {
            y: (ctx.h * ctx.slideElement.offsetHeight) / 360,
            x: 0    // not important
        };

        var pickerHeight = ctx.pickerElement.offsetHeight;

        var mousePicker = {
            x: ctx.s * ctx.pickerElement.offsetWidth,
            y: pickerHeight - ctx.v * pickerHeight
        };

        ctx.pickerElement.style.backgroundColor = this.hsv2rgb({ h: ctx.h, s: 1, v: 1 }).hex;
        ctx.callback && ctx.callback(hex || c.hex, { h: ctx.h, s: ctx.s, v: ctx.v }, rgb || { r: c.r, g: c.g, b: c.b }, mousePicker, mouseSlide);

        return ctx;
    };

    /**
     * Sets color of the picker in hsv format.
     * @param {object} hsv Object of the form: { h: <hue>, s: <saturation>, v: <value> }.
     */
    setHsv = function (hsv) {
        return this.setColor(this, hsv);
    };

    /**
     * Sets color of the picker in rgb format.
     * @param {object} rgb Object of the form: { r: <red>, g: <green>, b: <blue> }.
     */
    setRgb = function (rgb) {
        return this.setColor(this, this.rgb2hsv(rgb), rgb);
    };

    /**
     * Sets color of the picker in hex format.
     * @param {string} hex Hex color format #RRGGBB.
     */
    setHex = function (hex) {
        return this.setColor(this, this.hex2hsv(hex), undefined, hex);
    };

    /**
     * Helper to position indicators.
     * @param {HTMLElement} slideIndicator DOM element representing the indicator of the slide area.
     * @param {HTMLElement} pickerIndicator DOM element representing the indicator of the picker area.
     * @param {object} mouseSlide Coordinates of the mouse cursor in the slide area.
     * @param {object} mousePicker Coordinates of the mouse cursor in the picker area.
     */
    positionIndicators = function (slideIndicator, pickerIndicator, mouseSlide, mousePicker) {

        if (mouseSlide) {
            slideIndicator.style.top = (mouseSlide.y - slideIndicator.offsetHeight / 2) + 'px';
        }
        if (mousePicker) {
            pickerIndicator.style.top = (mousePicker.y - pickerIndicator.offsetHeight / 2) + 'px';
            pickerIndicator.style.left = (mousePicker.x - pickerIndicator.offsetWidth / 2) + 'px';
        }
    };

    /**
     * Helper to fix indicators - this is recommended (and needed) for dragable color selection (see enabledDragging()).
     */
    fixIndicators = function (slideIndicator, pickerIndicator) {

        pickerIndicator.style.pointerEvents = 'none';
        slideIndicator.style.pointerEvents = 'none';
    };


}

