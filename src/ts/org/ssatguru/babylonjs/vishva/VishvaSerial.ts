/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
namespace org.ssatguru.babylonjs.vishva {
    
    export class VishvaSerial{
        snas: SNAserialized[];
        settings: Settings;
    }
    
    export class Settings{
        
        private cameraCollision: boolean = true;
        
        //automatcally open edit menu whenever a mesh is selected
        private autoEditMenu: boolean = false;
        
    }
}

