import { Color3, Color4, Mesh, Node } from "babylonjs";

export class MeshUtils{
     //make all meshes in the hierarchy pickable/unpickable
    //this is needed to prevent the avatar from being picked by the raycaster
    public static makeAllPickable(node:Node,pickable:boolean){
        if (node instanceof Mesh) {
            node.isPickable = pickable;
        }
        node.getChildren().forEach((child) => {
            this.makeAllPickable(child,pickable);
        }); 
    }

    //make all meshes in the hierarchy collidable or uncollidable
    public static makeAllCollidable(node:Node,collidable:boolean){
        if (node instanceof Mesh) {
            node.checkCollisions = collidable;
        }
        node.getChildren().forEach((child) => {
            this.makeAllCollidable(child,collidable);
        }); 
    }


    //display edges around each descendant meshe in the hierarchy
    public static displayEdges(node:Node,showEdges:boolean)
    {
        if (node instanceof Mesh) 
        {
            if (showEdges)
            {
                node.enableEdgesRendering();
                node.edgesWidth=1;
                node.edgesColor = new Color4(0,1,0,1);
            }
            else
            {
                node.disableEdgesRendering();
            }
        }
        node.getChildren().forEach(
            (child) => {
                this.displayEdges(child,showEdges);
            }
        ); 
    }
}