# Memecity

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.1.4.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.



private loadCharacterModel(): void {
  // Direct Khronos official server path for Fox model
  const rootUrl = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Fox/glTF-Binary/";
  const fileName = "Fox.glb";

  SceneLoader.ImportMeshAsync("", rootUrl, fileName, this.scene).then((result) => {
    const mainModel = result.meshes[0];
    mainModel.parent = this.playerRoot;
    
    // Fox ka standard scale bahut chota hota hai, isko road ke hisab se bada karenge
    mainModel.scaling.setAll(0.04); 
    mainModel.rotation = new Vector3(0, Math.PI, 0); // Face rotation correction

    result.animationGroups.forEach(anim => anim.stop());

    // Fox Animations: ['Survey', 'Walk', 'Run']
    console.log("Fox Animations Found:", result.animationGroups.map(g => g.name));

    // Mapping official group indices/names
    this.idleAnim = result.animationGroups.find(ag => ag.name.toLowerCase().includes('survey') || ag.name.toLowerCase().includes('idle'));
    this.walkAnim = result.animationGroups.find(ag => ag.name.toLowerCase().includes('walk') || ag.name.toLowerCase().includes('run'));
    
    // Safe fallback fallbacks
    if (!this.idleAnim) this.idleAnim = result.animationGroups[0]; // Survey animation
    if (!this.walkAnim) this.walkAnim = result.animationGroups[1]; // Walk animation

    if (this.idleAnim) {
      this.idleAnim.start(true, 1.0); 
    }
  }).catch(err => console.error("Internet se Fox load karne mein error:", err));
}




















------------------------------------------------------------------------------------------

import { Injectable, ElementRef, NgZone, OnDestroy } from '@angular/core';
import {
  Engine,
  Scene,
  Vector3,
  ArcRotateCamera,
  HemisphericLight,
  PointLight,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
  Texture,
  DynamicTexture,
  MultiMaterial,
  SubMesh,
  TransformNode,
  Mesh,
  SceneLoader,
  AnimationGroup,
} from '@babylonjs/core';

// CRITICAL: Yeh import hona zaroori hai taaki Babylon .glb files ko read kar sake
import '@babylonjs/loaders/glTF';

@Injectable({
  providedIn: 'root',
})
export class GameEngine implements OnDestroy {
  private engine!: Engine;
  private scene!: Scene;
  public currentFace: number = 1; 
  private players: TransformNode[] = []; // Saare players track karne ke liye array
  private activePlayerIndex: number = 0;  // Konsa player abhi control mein hai

  memeImages: string[] = Array(10).fill("./textures/meme2.jpg"); // 10 Billboards array

  private roadWidth: number = 15;
  private roadLength: number = 300;
  private playerRoot!: TransformNode;
  private cameraTargetMesh!: Mesh; // Camera ko lock rakhne ke liye invisible helper mesh
  private inputMap: { [key: string]: boolean } = {};
  private moveSpeed: number = 0.12;

  // --- Animation Tracking States ---
  private idleAnim?: AnimationGroup;
  private walkAnim?: AnimationGroup;
  private isWalking: boolean = false;

  private resizeHandler = () => this.engine?.resize();
  private keydownHandler = (evt: KeyboardEvent) => { this.inputMap[evt.key.toLowerCase()] = true; };
  private keyupHandler = (evt: KeyboardEvent) => { this.inputMap[evt.key.toLowerCase()] = false; };

  constructor(private ngZone: NgZone) {}

  initEngine(canvas: ElementRef<HTMLCanvasElement>): void {
    this.engine = new Engine(canvas.nativeElement, true);
    
    this.ngZone.runOutsideAngular(() => {
      this.createScene();
      this.startRenderLoop();
    });
  }

  private createScene(): void {
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.01, 0.01, 0.03, 1);

    const camera = this.setupCamera();
    this.setupLights();
    this.setupAvatarBase(); // Root & Base reference setup
    
    // Camera ab hamare invisible tracking box ko follow karega (No Undefined crash)
    camera.lockedTarget = this.cameraTargetMesh;
    
    this.setupRoad();
    this.setupInputController();
    this.setupBillboards();
    
    // Asynchronously load the 3D Animated Model
    this.loadCharacterModel();
  }

  private setupCamera(): ArcRotateCamera {
    const camera = new ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 2.3, 8, Vector3.Zero(), this.scene);
    camera.attachControl(this.engine.getRenderingCanvas(), true);
    camera.upperBetaLimit = Math.PI / 2.1;
    camera.lowerRadiusLimit = 3;
    camera.upperRadiusLimit = 20;
    return camera;
  }

  private setupLights(): void {
    const ambientLight = new HemisphericLight('ambientLight', new Vector3(0, 1, 0), this.scene);
    ambientLight.intensity = 0.4; // Slightly increased for 3D textures

    const globalNeon = new PointLight('globalNeon', new Vector3(0, 10, 0), this.scene);
    globalNeon.diffuse = new Color3(0, 0.8, 1);
    globalNeon.intensity = 1.5;
  }

  private setupAvatarBase(): void {
    // Master Node jo movement and physics control karega
    this.playerRoot = new TransformNode('playerRoot', this.scene);
    this.playerRoot.position.set(0, 0, 0);

    // Invisible box create kiya taaki model load hone se pehle camera error na de
    this.cameraTargetMesh = MeshBuilder.CreateBox('cameraTarget', { size: 0.1 }, this.scene);
    this.cameraTargetMesh.position.set(0, 1.4, 0); // Chest height level for camera target
    this.cameraTargetMesh.isVisible = false;
    this.cameraTargetMesh.parent = this.playerRoot;
  }

  // ========================================================
  // --- ASYNC 3D GLB MODEL & ANIMATION LOADER ---
  // ========================================================
  // ========================================================
  // --- ASYNC 3D GLB MODEL & ANIMATION LOADER ---
  // ========================================================

  // ========================================================
  // --- UPGRADED ASYNC LOADER WITH EMOTES ---
  // ========================================================
  private emoteAnim?: AnimationGroup; // Emote tracking state
  private isEmoting: boolean = false;

  private loadCharacterModel(): void {
  // Sirf ek model load karenge
  SceneLoader.ImportMeshAsync("", "https://assets.babylonjs.com/meshes/", "HVGirl.glb", this.scene).then((result) => {
    const mainModel = result.meshes[0];
    mainModel.parent = this.playerRoot;
    mainModel.scaling.setAll(0.15);
    mainModel.rotation = new Vector3(0, 0, 0);

    result.animationGroups.forEach(anim => anim.stop());

    // Animations find kar rahe hain
    this.idleAnim = result.animationGroups.find(ag => ag.name.toLowerCase().includes('idle'));
    this.walkAnim = result.animationGroups.find(ag => ag.name.toLowerCase().includes('walk') || ag.name.toLowerCase().includes('run'));
    this.emoteAnim = result.animationGroups.find(ag => ag.name.toLowerCase().includes('samba') || ag.name.toLowerCase().includes('wave'));

    // Shuruat mein Idle animation
    if (this.idleAnim) this.idleAnim.start(true, 1.0);
  });
}

  // ========================================================
  // --- UPDATED CONTROLLER WITH SYSTEM CHECK ---
  // ========================================================
  private setupInputController(): void {
    window.addEventListener('keydown', this.keydownHandler);
    window.addEventListener('keyup', this.keyupHandler);

    this.scene.onBeforeRenderObservable.add(() => {
      // Agar emote chal raha hai, toh movement blocks ko pause kar do
      if (this.isEmoting) return;

      let moveX = 0;
      let moveZ = 0;

      // --- EMOTE TRIGGER CHECK ('E' Key for Laugh/Action) ---
      if (this.inputMap['e'] && this.emoteAnim && !this.isWalking) {
        this.isEmoting = true;
        this.inputMap['e'] = false; // Reset instant trigger
        
        if (this.idleAnim) this.idleAnim.stop();
        
        // Emote run smoothly without looping (false)
        this.emoteAnim.start(false, 1.2); 
        
        // Jaise hi emote animation khatam ho, breathe/idle loop par wapas jao
        this.emoteAnim.onAnimationEndObservable.addOnce(() => {
          this.isEmoting = false;
          if (this.idleAnim) this.idleAnim.start(true, 1.0);
        });
        return;
      }

      if (this.inputMap['w'] || this.inputMap['arrowup']) moveZ = 1;
      if (this.inputMap['s'] || this.inputMap['arrowdown']) moveZ = -1;
      if (this.inputMap['a'] || this.inputMap['arrowleft']) moveX = -1;
      if (this.inputMap['d'] || this.inputMap['arrowright']) moveX = 1;

      if (moveX !== 0 || moveZ !== 0) {
        this.playerRoot.position.z += moveZ * this.moveSpeed;
        this.playerRoot.position.x += moveX * this.moveSpeed;

        const targetAngle = Math.atan2(moveX, moveZ);
        let diff = targetAngle - this.playerRoot.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.playerRoot.rotation.y += diff * 0.15;

        if (!this.isWalking) {
          this.isWalking = true;
          if (this.idleAnim) this.idleAnim.stop();
          if (this.walkAnim) this.walkAnim.start(true, 1.0);
        }
      } else {
        if (this.isWalking) {
          this.isWalking = false;
          if (this.walkAnim) this.walkAnim.stop();
          // Wapas natural stance breathing loop active
          if (this.idleAnim) this.idleAnim.start(true, 1.0); 
        }
      }

      const halfRoadWidth = this.roadWidth / 2 - 0.6;
      if (this.playerRoot.position.x < -halfRoadWidth) this.playerRoot.position.x = -halfRoadWidth;
      if (this.playerRoot.position.x > halfRoadWidth) this.playerRoot.position.x = halfRoadWidth;
    });
  }



  private setupRoad(): void {
    const road = MeshBuilder.CreateGround('cyberRoad', { width: this.roadWidth, height: this.roadLength }, this.scene);
    road.position.set(0, 0, this.roadLength / 2 - 10);

    const roadMat = new StandardMaterial('roadMat', this.scene);
    const roadTex = new DynamicTexture('roadTex', 512, this.scene, false);
    const roadCtx = roadTex.getContext() as CanvasRenderingContext2D;
    roadCtx.fillStyle = '#111118';
    roadCtx.fillRect(0, 0, 512, 512);
    roadCtx.strokeStyle = '#00ffcc';
    roadCtx.lineWidth = 4;
    for (let i = 0; i <= 512; i += 64) {
      roadCtx.moveTo(i, 0); roadCtx.lineTo(i, 512);
      roadCtx.moveTo(0, i); roadCtx.lineTo(512, i);
    }
    roadCtx.stroke();
    roadTex.update();
    roadMat.diffuseTexture = roadTex;
    road.material = roadMat;
  }

  private setupBillboards(): void {
    const poleMat = new StandardMaterial('poleMat', this.scene);
    poleMat.diffuseColor = new Color3(0.12, 0.12, 0.15);
    poleMat.specularColor = new Color3(0.7, 0.7, 0.7);
    (poleMat as any).roughness = 0.15;

    const borderThickness = 0.08;
    const borderDepth = 0.22;

    this.memeImages.forEach((imagePath, index) => {
      const billboardX = -6;
      const billboardY = 4;
      const billboardZ = 20 + index * 25;

      const billboardBase = MeshBuilder.CreateBox(`billboard_${index}`, { width: 4, height: 2.5, depth: 0.2 }, this.scene);
      billboardBase.position.set(billboardX, billboardY, billboardZ);

      const memeTexture = new Texture(imagePath, this.scene);
      const baseMat = new StandardMaterial(`baseMat_${index}`, this.scene);
      baseMat.diffuseTexture = memeTexture;
      baseMat.emissiveColor = new Color3(0.2, 0.2, 0.2);

      const multimat = new MultiMaterial(`multiMat_${index}`, this.scene);
      const indices = billboardBase.getIndices();
      const indicesCount = indices ? indices.length : 0;
      const verticesCount = billboardBase.getTotalVertices();
      billboardBase.subMeshes = [];

      for (let i = 0; i < 6; i++) {
        const faceMat = baseMat.clone(`faceMat_${index}_${i}`);
        const dynamicTex = new DynamicTexture(`dynamicTex_${index}_${i}`, 256, this.scene, true);
        dynamicTex.hasAlpha = true;

        const ctx = dynamicTex.getContext() as CanvasRenderingContext2D;
        ctx.clearRect(0, 0, 256, 256);
        ctx.font = 'bold 140px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`BB ${index}`, 128, 128);
        dynamicTex.update();

        if (i === 0 || i === 1 || i === 4 || i === 5) {
          (dynamicTex as any).vAng = Math.PI;
          (dynamicTex as any).wAng = Math.PI;
        } else if (i === 2 || i === 3) {
          (dynamicTex as any).vScale = -1;
        }

        faceMat.emissiveTexture = dynamicTex;
        faceMat.emissiveColor = new Color3(1, 1, 1);
        multimat.subMaterials.push(faceMat);

        new SubMesh(i, 0, verticesCount, (indicesCount / 6) * i, indicesCount / 6, billboardBase);
      }
      billboardBase.material = multimat;

      const centerPole = MeshBuilder.CreateCylinder(`pole_${index}`, { height: 2.75, diameter: 0.35, tessellation: 24 }, this.scene);
      centerPole.position.set(billboardX, 1.375, billboardZ);
      centerPole.material = poleMat;

      const topBorder = MeshBuilder.CreateBox(`topBorder_${index}`, { width: 4 + borderThickness, height: borderThickness, depth: borderDepth }, this.scene);
      topBorder.position.set(billboardX, billboardY + 1.25 + borderThickness / 2, billboardZ);
      topBorder.material = poleMat;

      const bottomBorder = MeshBuilder.CreateBox(`bottomBorder_${index}`, { width: 4 + borderThickness, height: borderThickness, depth: borderDepth }, this.scene);
      bottomBorder.position.set(billboardX, billboardY - 1.25 - borderThickness / 2, billboardZ);
      bottomBorder.material = poleMat;

      const leftBorder = MeshBuilder.CreateBox(`leftBorder_${index}`, { width: borderThickness, height: 2.5, depth: borderDepth }, this.scene);
      leftBorder.position.set(billboardX - 2 - borderThickness / 2, billboardY, billboardZ);
      leftBorder.material = poleMat;

      const rightBorder = MeshBuilder.CreateBox(`rightBorder_${index}`, { width: borderThickness, height: 2.5, depth: borderDepth }, this.scene);
      rightBorder.position.set(billboardX + 2 + borderThickness / 2, billboardY, billboardZ);
      rightBorder.material = poleMat;
    });
  }

  private startRenderLoop(): void {
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
    window.addEventListener('resize', this.resizeHandler);
  }

  destroyEngine(): void {
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('keydown', this.keydownHandler);
    window.removeEventListener('keyup', this.keyupHandler);
    if (this.engine) {
      this.engine.dispose();
    }
  }

  ngOnDestroy(): void {
    this.destroyEngine();
  }
}