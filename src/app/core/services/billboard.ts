import { Scene, MeshBuilder, Vector3, StandardMaterial, Color3, Mesh } from "@babylonjs/core";

export class BillboardService {
    constructor(private scene: Scene) {}

    public createRandomBillboards(count: number, citySize: number, spacing: number) {
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * (citySize * spacing);
            const z = (Math.random() - 0.5) * (citySize * spacing);
            
            const billboard = MeshBuilder.CreateBox("billboard", { width: 4, height: 2, depth: 0.2 }, this.scene);
            billboard.position = new Vector3(x, 1.5, z);
            
            const mat = new StandardMaterial("bMat", this.scene);
            mat.emissiveColor = new Color3(1, 1, 0.8); // Thoda bright look
            billboard.material = mat;
            
            billboard.checkCollisions = true; // Avatar takrayega
        }
    }
}