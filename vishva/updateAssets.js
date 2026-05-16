/**
 * Scans vishva/assets and vishva/worlds folders and writes the results
 * to vishva/userAssets.js as global variables:
 *   userAssets = [...] — files and folders under vishva/assets
 *   worlds = [...]     — files and folders under vishva/worlds
 *
 * Run from the project root:
 *   node vishva/updateAssets.js
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

let scriptDir = path.dirname(__filename);
let assetsPath = path.join(scriptDir, "assets");
let worldsPath = path.join(scriptDir, "worlds");
let outputFile = path.join(scriptDir, "userAssets.js");

let _tab = "  ";

// Write userAssets from vishva/assets
fs.writeFileSync(outputFile, "userAssets=[\n");
let stream = fs.createWriteStream(outputFile, { flags: "a" });
printDir(stream, assetsPath, _tab);
stream.write("]\n");

// Write worlds from vishva/worlds
if (fs.existsSync(worldsPath)) {
  stream.write("worlds=[\n");
  printDir(stream, worldsPath, _tab);
  stream.write("]\n");
}

stream.end();
