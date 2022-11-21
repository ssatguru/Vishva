/**
 * foreground, background color combination
 */

export class FB {
        public f: string;
        public b: string;

        constructor(f: string, b: string) {
                this.f = f;
                this.b = b;
        }
}

/**
 * A Theme specifies an over arching color for shading
 * example a "red" theme
 * each shade will specify a backgound and a foreground color
 * 
 * Within a theme create a dark and a light theme
 * 
 * With a dark or light theme provide three variations of shades  - light normal dark
 *   
 * To create a theme 
 * list out all the shades of interest
 * from these pick 3 shades , preferrably one each for light, normal and dark.
 * 
 * create one theme for light and one for dark
 * 
 * example
 * eggplant-dark theme  - three variation of dark colors, less-dark dark more-dark
 * eggplant-light theme - three variation of light colors, very-light light less-light
 * always light to dark
 * 
 */
export class VTheme {
        public fbs: Array<FB> = new Array<FB>(10);

        public lightColors: FB;
        public colors: FB;
        public darkColors: FB;

        constructor(l: number, c: number, d: number) {
                for (let i = 0; i < 10; i++) {
                        this.fbs[i] = new FB("", "");
                }
                this.initColors();

                this.setColors(l, c, d);
        }

        public initColors() { };

        public setColors(l: number, c: number, d: number) {
                this.lightColors = this.fbs[l];
                this.colors = this.fbs[c];
                this.darkColors = this.fbs[d];
        }

}


export class EggPlantTheme extends VTheme {
        /* w3 custom eggplant theme */

        public initColors() {
                // all interesting eggplant shades

                // lightest 0 to darkest 9

                // light side
                this.fbs[0].f = "#000";
                this.fbs[0].b = "#f3f2f5";

                this.fbs[1].f = "#000";
                this.fbs[1].b = "#d9d4dd";

                this.fbs[2].f = "#000";
                this.fbs[2].b = "#b2a8bb";

                this.fbs[3].f = "#fff";
                this.fbs[3].b = "#8c7d99";

                this.fbs[4].f = "#fff";
                this.fbs[4].b = "#655870";

                // dark side
                this.fbs[5].f = "#fff";
                this.fbs[5].b = "#38303e";

                this.fbs[6].f = "#fff";
                this.fbs[6].b = "#312b37";

                this.fbs[7].f = "#fff";
                this.fbs[7].b = "#2b2630";

                this.fbs[8].f = "#fff";
                this.fbs[8].b = "#252029";

                this.fbs[9].f = "#fff";
                this.fbs[9].b = "#1f1b22";

        };

};

export class GreyTheme extends VTheme {
        /* colors copied from w3-theme-grey.css  */

        public initColors() {
                // lightest 0 to darkest 9

                // light side
                this.fbs[0].f = "#000";
                this.fbs[0].b = "#f9f9f9";

                this.fbs[1].f = "#000";
                this.fbs[1].b = "#ececec";

                this.fbs[2].f = "#000";
                this.fbs[2].b = "#d8d8d8";

                this.fbs[3].f = "#fff";
                this.fbs[3].b = "#c5c5c5";

                this.fbs[4].f = "#fff";
                this.fbs[4].b = "#b1b1b1";

                // dark side
                this.fbs[5].f = "#fff";
                this.fbs[5].b = "#8e8e8e";

                this.fbs[6].f = "#fff";
                this.fbs[6].b = "#7e7e7e";

                this.fbs[7].f = "#fff";
                this.fbs[7].b = "#6f6f6f";

                this.fbs[8].f = "#fff";
                this.fbs[8].b = "#5f5f5f";

                this.fbs[9].f = "#fff";
                this.fbs[9].b = "#4f4f4f";

        };

};

export class BlackTheme extends VTheme {
        /* colors copied from w3-theme-black.css  */

        public initColors() {
                // lightest 0 to darkest 9

                // light side
                this.fbs[0].f = "#000";
                this.fbs[0].b = "#f0f0f0";

                this.fbs[1].f = "#000";
                this.fbs[1].b = "#cccccc";

                this.fbs[2].f = "#000";
                this.fbs[2].b = "#999999";

                this.fbs[3].f = "#fff";
                this.fbs[3].b = "#666666";

                this.fbs[4].f = "#fff";
                this.fbs[4].b = "#333333";

                // dark side
                this.fbs[5].f = "#fff";
                this.fbs[5].b = "#000000";

                this.fbs[6].f = "#fff";
                this.fbs[6].b = "#000000";

                this.fbs[7].f = "#fff";
                this.fbs[7].b = "#000000";

                this.fbs[8].f = "#fff";
                this.fbs[8].b = "#000000";

                this.fbs[9].f = "#fff";
                this.fbs[9].b = "#000000";
        };

};

export class DarkGreyTheme extends VTheme {
        /* colors copied from w3-theme-dark-grey.css  */

        public initColors() {
                // lightest 0 to darkest 9

                // light side
                this.fbs[0].f = "#000";
                this.fbs[0].b = "#f6f6f6";

                this.fbs[1].f = "#000";
                this.fbs[1].b = "#dfdfdf";

                this.fbs[2].f = "#000";
                this.fbs[2].b = "#c0c0c0";

                this.fbs[3].f = "#fff";
                this.fbs[3].b = "#a0a0a0";

                this.fbs[4].f = "#fff";
                this.fbs[4].b = "#818181";

                // dark side
                this.fbs[5].f = "#fff";
                this.fbs[5].b = "#575757";

                this.fbs[6].f = "#fff";
                this.fbs[6].b = "#4e4e4e";

                this.fbs[7].f = "#fff";
                this.fbs[7].b = "#444444";

                this.fbs[8].f = "#fff";
                this.fbs[8].b = "#3a3a3a";

                this.fbs[9].f = "#fff";
                this.fbs[9].b = "#303030";
        };

};

export class BrownTheme extends VTheme {
        /* colors copied from w3-theme-dark-grey.css  */

        public initColors() {
                // lightest 0 to darkest 9

                // light side
                this.fbs[0] = { f: "#000", b: "#f8f4f3" };
                this.fbs[1] = { f: "#000", b: "#e7dcd7" };
                this.fbs[2] = { f: "#000", b: "#d0b8b0" };
                this.fbs[3] = { f: "#fff", b: "#b89588" };
                this.fbs[4] = { f: "#fff", b: "#a07261" };
                this.fbs[5] = { f: "#fff", b: "#6d4d41" };
                this.fbs[6] = { f: "#fff", b: "#61443a" };
                this.fbs[7] = { f: "#fff", b: "#553c33" };
                this.fbs[8] = { f: "#fff", b: "#49332c" };
                this.fbs[9] = { f: "#fff", b: "#3d2b24" };
                // dark side

        };

};



export class VThemes {

        //dark
        //public static CurrentTheme: VTheme = new EggPlantTheme(4, 5, 6);
        //public static CurrentTheme: VTheme = new GreyTheme(4, 5, 6);
        // public static CurrentTheme: VTheme = new BlackTheme(4, 5, 6);
        public static CurrentTheme: VTheme = new DarkGreyTheme(6, 7, 8);
        //public static CurrentTheme: VTheme = new BrownTheme(4, 5, 6);

        //normal
        //public static CurrentTheme: VTheme = new EggPlantTheme(2, 3, 4);
        //public static CurrentTheme: VTheme = new GreyTheme(2, 3, 4);
        // public static CurrentTheme: VTheme = new BrownTheme(2, 3, 4);


        //light
        //public static CurrentTheme: VTheme = new EggPlantTheme(0, 1, 2);
        //public static CurrentTheme: VTheme = new BrownTheme(0, 1, 2);


}