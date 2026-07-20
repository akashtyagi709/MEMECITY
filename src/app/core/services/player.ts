import { Scene, SceneLoader, TransformNode } from "@babylonjs/core";
import "@babylonjs/loaders/glTF"; // YEH ZAROORI HAI!
export class Player {
    public root: TransformNode;

    constructor(private scene: Scene) {
        this.root = new TransformNode("playerRoot", scene);
    }

    public async loadModel() {
        const result = await SceneLoader.ImportMeshAsync("", "https://assets.babylonjs.com/meshes/", "HVGirl.glb", this.scene);
        const model = result.meshes[0];
        model.parent = this.root;
        model.scaling.setAll(0.018);
        return result; 
    }
}