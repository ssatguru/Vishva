

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


                // lightest 0 to darkest 9

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

                console.log("done setting egg plant colors");

        };

};

export class VThemes {
        public static EggPlant: VTheme = new EggPlantTheme(2, 5, 7);
}