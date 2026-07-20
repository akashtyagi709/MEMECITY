import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';

export class Boundary {
  constructor(private scene: Scene, private size: number) {
    this.createFencing();
  }

private createFencing(): void {
  const fenceHeight = 3;
  const fenceMat = new StandardMaterial('fenceMat', this.scene);
  fenceMat.diffuseColor = new Color3(0.2, 0.2, 0.2);
  fenceMat.freeze();

  const margin = 4; // Road ke bahar ka extra buffer
  const start = -margin;
  const end = this.size + margin;
  const totalLength = end - start;

  const walls = [
    // Top wall (z = end)
    { pos: new Vector3(this.size / 2, fenceHeight / 2, end), w: totalLength, d: 1 },
    // Bottom wall (z = start)
    { pos: new Vector3(this.size / 2, fenceHeight / 2, start), w: totalLength, d: 1 },
    // Right wall (x = end)
    { pos: new Vector3(end, fenceHeight / 2, this.size / 2), w: 1, d: totalLength },
    // Left wall (x = start)
    { pos: new Vector3(start, fenceHeight / 2, this.size / 2), w: 1, d: totalLength }
  ];

  walls.forEach((w, i) => {
    const wall = MeshBuilder.CreateBox(`wall_${i}`, { width: w.w, height: fenceHeight, depth: w.d }, this.scene);
    wall.position = w.pos;
    wall.material = fenceMat;
    wall.checkCollisions = true; 
  });
}
}