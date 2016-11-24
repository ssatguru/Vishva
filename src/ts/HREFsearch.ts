"Generated from Java with JSweet 1.1.1 - http://www.jsweet.org";
namespace org.ssatguru.babylonjs {
    export class HREFsearch {
        names : Array<string> = new Array<string>();

        values : Array<string> = new Array<string>();
 
        public constructor() {
            var search : string = window.location.search;
            search = search.substring(1);
            var parms : string[] = search.split("&");
            for(var index121=0; index121 < parms.length; index121++) {
                var parm = parms[index121];
                {
                    var nameValues : string[] = parm.split("=");
                    if(nameValues.length === 2) {
                        var name : string = nameValues[0];
                        var value : string = nameValues[1];
                        this.names.push(name);
                        this.values.push(value);
                    }
                }
            }
        }

        public getParm(parm : string) : string {
            var i : number = this.names.indexOf(parm);
            if(i !== -1) {
                return <string>this.values[i];
            }
            return null;
        }
    }
}

