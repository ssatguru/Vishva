/**
 * Generates a repeatable set of random number based on a seed
 * copied from
 * http://indiegamr.com/generate-repeatable-random-numbers-in-js/
 * 
 */

export class Random {

    private _seed: number;

    constructor(seed: number) {
        this._seed = seed;
    }

    public generate(n1 = 0, n2 = 1) {
        this._seed = (this._seed * 9301 + 49297) % 233280;
        let rnd: number = this._seed / 233280;
        return n1 + rnd * (n2 - n1);
    }
}
