let fs = require('fs');
let _tab = "  "
let fn="vishvaFiles.js";
function printDir(path,tab){
    let items = fs.readdirSync(path);
    let last=items.length-1;
    let line="";
    for(let i = 0;i<items.length;i++){
        let p = path+"/"+items[i];
        let stats = fs.statSync(p);
        if(stats.isFile()){
            if(i<last){
                line=(tab+'"'+items[i]+'",');
            }else{
                line=(tab+'"'+items[i]+'"');
            }
            stream.write(line+"\n");
        }else if(stats.isDirectory()){
            //line=(tab+'{"'+items[i]+'":[');
            line=(tab+'{"d":"'+items[i]+'",');
            stream.write(line+"\n");
            line=(tab+' "f":[');
            stream.write(line+"\n");
            printDir(p,tab+_tab);
            if(i<last){
                line=(tab+']},');
            }else{
                line=(tab+']}');
            }
            stream.write(line+"\n");
        }
    }
}

//fs.unlinkSync(fn);
fs.writeFileSync(fn,"org.ssatguru.babylonjs.vishva.Vishva.vishvaFiles=[" +"\n");
let stream = fs.createWriteStream(fn, {flags:'a'});
let path = ".";
printDir(path,_tab);
stream.write("]");
stream.end();


