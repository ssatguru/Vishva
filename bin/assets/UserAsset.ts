import { AssetsManager, TextFileAssetTask } from "babylonjs";

/**
 * Represent the user assets under the /assets folder.
 * The list of files and folders under this folder is available
 * in the file userAssets.json
 */
export class UserAsset{

    private userAssets:Array<string | object>;

    constructor(){
        this._loadAssetList();
    }

    private _loadAssetList():void{
        let am: AssetsManager = new AssetsManager();
        let task: TextFileAssetTask = am.addTextFileTask("sceneLoader", "/vishva/userAssets.json");
        task.onSuccess = (obj) => { return this._parseAssetFile(obj) };
        task.onError = (obj) => { alert("Could not load userAssets.json file"); };
        am.load();

    }

    private _parseAssetFile(tfat:TextFileAssetTask){
        this.userAssets = <Array<string | object>> JSON.parse(tfat.text);
        console.log(this.getFolderContent("curated/characters"));
        console.log(this.fileExists("AnimatedWoman.babylon","curated/characters/female-avatar2"));
    }

    /**
    * get the contents of a folder, 
    * @param path  - path to the folder
    */
    public getFolderContent(path:string): Array<string | object> {
        return this._folderContent(path.split("/"),this.userAssets);
    }

    /**
     * Checks if a file exists in a folder
     */
    public fileExists(fileName:string,folderPath:string):boolean{
        let folderContent:Array<string|Object> = this._folderContent(folderPath.split("/"),this.userAssets);
        for (let item of folderContent){
            if (!(item instanceof Object)){
                if (item == fileName){
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * returns a list of items (files and folders) inside a folder
     */
    private _folderContent(path:string[],items: Array<string | object>):Array<string|object>{
        for (let item of items){
            if (item instanceof Object){
                if (item["n"] == path[0]){
                    if (path.length > 1) {
                        path.splice(0, 1);
                        return this._folderContent(path, item["c"]);
                    }else{
                        return item["c"]
                    }
                }
            }
        }
        return [];
    }

   
   


}

