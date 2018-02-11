/**
 * Generates a repeatable set of random number based on a seed
 * copied from
 * http://indiegamr.com/generate-repeatable-random-numbers-in-js/
 * 
 */

namespace org.ssatguru.babylonjs.util {
    export class Random{
        
        private _seed:number;
        
        constructor(seed:number){
            this._seed=seed;
        }
        
        public generate(min=0,max=1){
            this._seed = (this._seed * 9301 + 49297) % 233280;
            let rnd:number  = this._seed / 233280;
            return min + rnd * (max - min);
        }
    }
} 
