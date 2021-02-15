/**
 * ColorPicker - pure JavaScript color picker without using images, external CSS or 1px divs.
 * Copyright © 2011 David Durman, All rights reserved.
 */

import "./colorpicker.themes.css";


export class ColorPicker {

    private _hueOffset = 15;
    private _svgNS = 'http://www.w3.org/2000/svg';

    // This HTML snippet is inserted into the innerHTML property of the passed color picker element
    // when the no-hassle call to ColorPicker() is used, i.e. ColorPicker(element,function(hex, hsv, rgb) { ... });

    private _colorpickerHTMLSnippet =
        `<div class="picker-wrapper">
        <div class="picker"></div>
        <div class="picker-indicator"></div>
    </div>
    <div class="slide-wrapper">
        <div class="slide"></div>
        <div class="slide-indicator"></div>
    </div>`;

    /**
     * Create slide and picker markup.
     */

    private _slide = this._makeSvg('svg', { xmlns: 'http://www.w3.org/2000/svg', version: '1.1', width: '100%', height: '100%' },
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

    private _picker = this._makeSvg('svg', { xmlns: 'http://www.w3.org/2000/svg', version: '1.1', width: '100%', height: '100%' },
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

    private _slideElement: HTMLElement;
    private _pickerElement: HTMLElement;
    private _callback: Function;
    private _h: number;
    private _s: number;
    private _v: number;

    /**
     * ColorPicker.
     * Can be called with three arguments (slideElement, pickerElement, callback). Here user specifies the elements for slider and picker
     * or
     * Can be called with two argument (element, callback). Here user just provides one element and the color picker creates slide and picker elements and places them
     * appropriately under the provided element.
     *  
     * The provided callback is called whenever the color is changed. It is called with only one parameter. The parameter is the chosen color in RGB HEX format.
     */

    constructor(arg1: HTMLElement, arg2: HTMLElement | Function, arg3?: Function) {
        if (arguments.length === 3) {
            this._slideElement = arg1;
            this._pickerElement = <HTMLElement>arg2;
            this._callback = arg3;
        } else {
            let element = arg1;
            let callback: Function = <Function>arg2;

            element.innerHTML = this._colorpickerHTMLSnippet;

            this._slideElement = <HTMLElement>element.getElementsByClassName('slide')[0];
            this._pickerElement = <HTMLElement>element.getElementsByClassName('picker')[0];
            let slideIndicator = element.getElementsByClassName('slide-indicator')[0];
            let pickerIndicator = element.getElementsByClassName('picker-indicator')[0];

            this._fixIndicators(slideIndicator, pickerIndicator);

            this._callback = (hex, hsv, rgb, pickerCoordinate, slideCoordinate) => {
                this._positionIndicators(slideIndicator, pickerIndicator, slideCoordinate, pickerCoordinate);
                callback(hex, hsv, rgb);
            };
        }

        this._h = 0;
        this._s = 1;
        this._v = 1;

        // Generate uniq IDs for linearGradients so that we don't have the same IDs within one document.
        // Then reference those gradients in the associated rectangles.

        let uniqID = 0;

        if (window["uniqID"] == undefined) {
            window["uniqID"] = 0;
        } else {
            window["uniqID"]++;
            uniqID = window["uniqID"];
        }

        let slideClone = this._slide.cloneNode(true);
        let hsvGradient = slideClone.getElementsByTagName('linearGradient')[0];
        let hsvRect = slideClone.getElementsByTagName('rect')[0];
        hsvGradient.id = 'gradient-hsv-' + uniqID;
        hsvRect.setAttribute('fill', 'url(#' + hsvGradient.id + ')');

        let pickerClone = this._picker.cloneNode(true);
        let blackAndWhiteGradients = [pickerClone.getElementsByTagName('linearGradient')[0], pickerClone.getElementsByTagName('linearGradient')[1]];
        let whiteAndBlackRects = pickerClone.getElementsByTagName('rect');

        blackAndWhiteGradients[0].id = 'gradient-black-' + uniqID;
        blackAndWhiteGradients[1].id = 'gradient-white-' + uniqID;

        whiteAndBlackRects[0].setAttribute('fill', 'url(#' + blackAndWhiteGradients[1].id + ')');
        whiteAndBlackRects[1].setAttribute('fill', 'url(#' + blackAndWhiteGradients[0].id + ')');

        this._slideElement.appendChild(slideClone);
        this._pickerElement.appendChild(pickerClone);

        this._addEventListener(this._slideElement, 'click', this._slideListener(this._slideElement, this._pickerElement));
        this._addEventListener(this._pickerElement, 'click', this._pickerListener(this._pickerElement));

        this._enableDragging(this, this._slideElement, this._slideListener(this._slideElement, this._pickerElement));
        this._enableDragging(this, this._pickerElement, this._pickerListener(this._pickerElement));
    };



    /**
     * Return mouse position relative to the element el, optionally
     * clipping the coordinates to be inside the element
     */
    private _mousePosition(evt, el, clip) {
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
    private _makeSvg(el, attrs, children?) {
        el = document.createElementNS(this._svgNS, el);
        for (var key in attrs)
            el.setAttribute(key, attrs[key]);
        if (Object.prototype.toString.call(children) != '[object Array]') children = [children];
        var i = 0, len = (children[0] && children.length) || 0;
        for (; i < len; i++)
            el.appendChild(children[i]);
        return el;
    }

    /**
     * Return click event handler for the slider.
     * Sets picker background color and calls ctx.callback if provided.
     */
    private _slideListener(slideElement, pickerElement) {
        return (evt) => {
            evt = evt || window.event;
            let mouse = this._mousePosition(evt, slideElement, true);
            this._h = mouse.y / slideElement.offsetHeight * 360 + this._hueOffset;
            let pickerColor = this._hsv2rgb({ h: this._h, s: 1, v: 1 });
            let c = this._hsv2rgb({ h: this._h, s: this._s, v: this._v });
            pickerElement.style.backgroundColor = pickerColor.hex;
            this._callback && this._callback(c.hex, { h: this._h - this._hueOffset, s: this._s, v: this._v }, { r: c.r, g: c.g, b: c.b }, undefined, mouse);
        }
    };

    /**
     * Return click event handler for the picker.
     * Calls ctx.callback if provided.
     */
    private _pickerListener(pickerElement) {
        return (evt) => {
            evt = evt || window.event;
            var mouse = this._mousePosition(evt, pickerElement, true),
                width = pickerElement.offsetWidth,
                height = pickerElement.offsetHeight;

            this._s = mouse.x / width;
            this._v = (height - mouse.y) / height;
            var c = this._hsv2rgb({ h: this._h, s: this._s, v: this._v });
            this._callback && this._callback(c.hex, { h: this._h - this._hueOffset, s: this._s, v: this._v }, { r: c.r, g: c.g, b: c.b }, mouse);
        }
    };

    private _addEventListener(element, event, listener) {

        if (element.attachEvent) {

            element.attachEvent('on' + event, listener);

        } else if (element.addEventListener) {

            element.addEventListener(event, listener, false);
        }
    }

    private _removeEventListener(element, event, listener) {

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
    private _enableDragging(ctx, element, listener) {

        var start = () => {
            this._removeEventListener(element, 'mousedown', start);
            this._addEventListener(document.body, 'mouseup', stop);
            this._addEventListener(document.body, 'mousemove', listener);
        };

        var stop = () => {
            this._addEventListener(element, 'mousedown', start);
            this._removeEventListener(document.body, 'mouseup', stop);
            this._removeEventListener(document.body, 'mousemove', listener);
        };

        this._addEventListener(element, 'mousedown', start);
        this._addEventListener(element, 'dragstart', (evt) => {
            evt = evt || window.event;
            if (evt.preventDefault) {
                evt.preventDefault();
            } else {
                evt.returnValue = false;
            }
        });

    }

    /**
     * Helper to position indicators.
     * @param {HTMLElement} slideIndicator DOM element representing the indicator of the slide area.
     * @param {HTMLElement} pickerIndicator DOM element representing the indicator of the picker area.
     * @param {object} mouseSlide Coordinates of the mouse cursor in the slide area.
     * @param {object} mousePicker Coordinates of the mouse cursor in the picker area.
     */
    private _positionIndicators = function (slideIndicator, pickerIndicator, mouseSlide, mousePicker) {

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
    private _fixIndicators = function (slideIndicator, pickerIndicator) {
        pickerIndicator.style.pointerEvents = 'none';
        slideIndicator.style.pointerEvents = 'none';
    };

    /**
         * Convert HSV representation to RGB HEX string.
         * Credits to http://www.raphaeljs.com
         */
    private _hsv2rgb(hsv) {
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
    private _rgb2hsv(rgb) {

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

    hsv2rgb = (hsv) => {
        var rgbHex = this._hsv2rgb(hsv);
        delete rgbHex.hex;
        return rgbHex;
    };
    hsv2hex = (hsv) => this._hsv2rgb(hsv).hex;

    rgb2hsv = (rgb) => this._rgb2hsv(rgb);
    rgb2hex = (rgb) => this._hsv2rgb(this.rgb2hsv(rgb)).hex;

    hex2hsv = (hex) => this._rgb2hsv(this.hex2rgb(hex));
    hex2rgb = (hex) => {
        return { r: parseInt(hex.substr(1, 2), 16), g: parseInt(hex.substr(3, 2), 16), b: parseInt(hex.substr(5, 2), 16) };
    };

    /**
     * Sets color of the picker in hsv/rgb/hex format.
     * @param {object} hsv Object of the form: { h: <hue>, s: <saturation>, v: <value> }.
     * @param {object} rgb Object of the form: { r: <red>, g: <green>, b: <blue> }.
     * @param {string} hex String of the form: #RRGGBB.
     */
    private _setColor = (hsv, rgb?, hex?) => {
        this._h = hsv.h % 360;
        this._s = hsv.s;
        this._v = hsv.v;

        var c = this.hsv2rgb(hsv);

        var mouseSlide = {
            y: (this._h * this._slideElement.offsetHeight) / 360,
            x: 0    // not important
        };

        var pickerHeight = this._pickerElement.offsetHeight;

        var mousePicker = {
            x: this._s * this._pickerElement.offsetWidth,
            y: pickerHeight - this._v * pickerHeight
        };

        this._pickerElement.style.backgroundColor = this._hsv2rgb({ h: this._h, s: 1, v: 1 }).hex;
        this._callback && this._callback(hex || c.hex, { h: this._h, s: this._s, v: this._v }, rgb || { r: c.r, g: c.g, b: c.b }, mousePicker, mouseSlide);
    };

    /**
     * Sets color of the picker in hsv format.
     * @param {object} hsv Object of the form: { h: <hue>, s: <saturation>, v: <value> }.
     */
    setHsv = (hsv) => this._setColor(hsv);


    /**
     * Sets color of the picker in rgb format.
     * @param {object} rgb Object of the form: { r: <red>, g: <green>, b: <blue> }.
     */
    setRgb = (rgb) => this._setColor(this.rgb2hsv(rgb), rgb);


    /**
     * Sets color of the picker in hex format.
     * @param {string} hex Hex color format #RRGGBB.
     */
    setHex = (hex) => this._setColor(this.hex2hsv(hex), undefined, hex);





}

