import { Scene, ArcRotateCamera, Vector3 } from "@babylonjs/core";

export class Camera {
    public camera: ArcRotateCamera;

constructor(private scene: Scene) {
    // Camera ko thoda piche se set karo (radius 10)
    this.camera = new ArcRotateCamera("camera", Math.PI / 2, Math.PI / 4, 15, Vector3.Zero(), this.scene);
    this.camera.attachControl(this.scene.getEngine().getRenderingCanvas(), true);
}
}