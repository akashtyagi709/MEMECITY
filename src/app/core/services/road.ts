import { Scene, Vector3, MeshBuilder, StandardMaterial, DynamicTexture, Color3, Mesh } from "@babylonjs/core";

export class Road {
    private verticalMat: StandardMaterial;
    private horizontalMat: StandardMaterial;

    constructor(private scene: Scene) {
        this.verticalMat = this.createRoadMaterial(true);
        this.horizontalMat = this.createRoadMaterial(false);
        this.verticalMat.freeze();
        this.horizontalMat.freeze();
    }

    public createCityNetwork(rows: number, cols: number, spacing: number) {
        const hRoads: Mesh[] = [];
        const vRoads: Mesh[] = [];

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const pos = new Vector3(j * spacing, 0, i * spacing);
                
                hRoads.push(this.createRoadSegment(pos, 4, spacing, false));
                vRoads.push(this.createRoadSegment(pos, 4, spacing, true));
            }
        }

        // PERFORMANCE OPTIMIZATION: Mesh Merging
        // Saari horizontal roads ko ek single mesh bana do
        const hMerged = Mesh.MergeMeshes(hRoads, true, true, undefined, false, true)!;
        hMerged.material = this.horizontalMat;
        hMerged.checkCollisions = true;

        // Saari vertical roads ko ek single mesh bana do
        const vMerged = Mesh.MergeMeshes(vRoads, true, true, undefined, false, true)!;
        vMerged.material = this.verticalMat;
        vMerged.checkCollisions = true;
    }

    public createRoadSegment(position: Vector3, width: number, length: number, isVertical: boolean): Mesh {
        const road = MeshBuilder.CreateBox("road", { 
            width: isVertical ? width : length, 
            height: 0.05, 
            depth: isVertical ? length : width 
        }, this.scene);
        
        road.position = position;
        // Collision ke liye hum merging ke baad main mesh par checkCollisions true karenge
        return road;
    }

    private createRoadMaterial(isVertical: boolean): StandardMaterial {
        const mat = new StandardMaterial("roadMat" + isVertical, this.scene);
        mat.specularColor = new Color3(0, 0, 0);
        mat.emissiveColor = new Color3(0.2, 0.2, 0.2);

        const texture = new DynamicTexture("roadTex" + isVertical, 1024, this.scene, true);
        const ctx = texture.getContext() as CanvasRenderingContext2D;

        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(0, 0, 1024, 1024);

        ctx.fillStyle = "#ffffff";
        if (isVertical) {
            ctx.fillRect(500, 0, 24, 1024);
            ctx.fillRect(0, 960, 1024, 60);
        } else {
            ctx.fillRect(0, 500, 1024, 24);
            ctx.fillRect(960, 0, 60, 1024);
        }

        texture.update();
        mat.diffuseTexture = texture;
        return mat;
    }
}