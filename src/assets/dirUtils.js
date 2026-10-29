/**
 * Takes 2 or more args
 * arg1 : name of the output file
 * arg2,arg3,... : list of directories to be listed out in the output file. 
 *                 each directory should include their path relative to the directory the script is being run from
 * 
 * example usage
 * node dirUtils.js userAssets.js assets worlds ../bin/assets/internal
 * 
 */


let fs = require("fs");
let path = require("path");

function printDir(stream, dirPath, tab) {
  let items = fs.readdirSync(dirPath);
  let last = items.length - 1;
  let line = "";
  for (let i = 0; i < items.length; i++) {
    let p = path.join(dirPath, items[i]);
    let stats = fs.statSync(p);
    if (stats.isFile()) {
      if (i < last) {
        line = tab + '"' + items[i] + '",';
      } else {
        line = tab + '"' + items[i] + '"';
      }
      stream.write(line + "\n");
    } else if (stats.isDirectory()) {
      line = tab + '{"d":"' + items[i] + '",';
      stream.write(line + "\n");
      line = tab + ' "f":[';
      stream.write(line + "\n");
      printDir(stream, p, tab + _tab);
      if (i < last) {
        line = tab + "]},";
      } else {
        line = tab + "]}";
      }
      stream.write(line + "\n");
    }
  }
}

const args = process.argv.slice(2);

//the first arg is the output filename
//the remaining are all the directories to be listed.
const outputFileName = args[0]; 
//let scriptDir = path.dirname(__filename);
const runDir = process.cwd();
let outputFile = path.join(runDir, outputFileName);
fs.writeFileSync(outputFile, "");
let stream = fs.createWriteStream(outputFile, { flags: "a" });

let _tab = "  ";
for (i=1;i<args.length;i++){
  let [dir,name]= args[i].split(":");
  if (name==null) name=path;
  let dirPath = path.join(runDir, dir);
  if (fs.existsSync(dirPath)) {
    stream.write(name+"=[\n");
    printDir(stream, dirPath, _tab);
    stream.write("]\n");
  }
}

stream.end();
