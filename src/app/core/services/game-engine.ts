import { Injectable, ElementRef, NgZone, OnDestroy } from '@angular/core';
import {
  Engine, Scene, Vector3, ArcRotateCamera, HemisphericLight, MeshBuilder,
  StandardMaterial, Color3, Texture, DynamicTexture, MultiMaterial, SubMesh,
  TransformNode, Mesh, SceneLoader, AnimationGroup, DirectionalLight, Color4,
  VideoTexture,
  Sound
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { Road } from './road';
import { Boundary } from './boundary'; // Nayi class ko import kiya

@Injectable({ providedIn: 'root' })
export class GameEngine implements OnDestroy {
  private engine!: Engine;
  private scene!: Scene;
  private camera!: ArcRotateCamera;
  private road!: Road;
  private playerRoot!: Mesh;
  private cameraTargetMesh!: Mesh;
  private readonly gridCount = 10;
private readonly cellSize = 15;
private get cityTotalSize(): number { return this.gridCount * this.cellSize; }
  private inputMap: { [key: string]: boolean } = {};
  private moveSpeed: number = 0.13;
private memeImages: string[] = [];


  private idleAnim?: AnimationGroup;
  private walkAnim?: AnimationGroup;
  private emoteAnim?: AnimationGroup;
  private isWalking: boolean = false;
  private isEmoting: boolean = false;
private currentActiveButton: Mesh | null = null;
private soundFX: Sound | null = null;
  private resizeHandler = () => this.engine?.resize();
  private keydownHandler = (evt: KeyboardEvent) => { this.inputMap[evt.key.toLowerCase()] = true; };
  private keyupHandler = (evt: KeyboardEvent) => { this.inputMap[evt.key.toLowerCase()] = false; };
private player!: Mesh; // ! ka matlab hai ki ye initialize hoga

  constructor(private ngZone: NgZone) {}

  async initEngine(canvas: ElementRef<HTMLCanvasElement>): Promise<void> {

    try {
    const response = await fetch('./textures/manifest.json');
    const data = await response.json();
    // Path create karo (public folder ka base URL)
    this.memeImages = data.files.map((file: string) => `./textures/${file}`);
  } catch (err) {
    console.error("Manifest load nahi hua, check path:", err);
  }
    this.engine = new Engine(canvas.nativeElement, true);
    this.ngZone.runOutsideAngular(() => {
      this.createScene();
      this.startRenderLoop();
    });
  }

 private createScene(): void {
  this.scene = new Scene(this.engine);
  this.scene.clearColor = new Color4(1, 1, 1, 1);
  this.scene.collisionsEnabled = true;

  this.setupDaylight();
  this.road = new Road(this.scene);
  this.road.createCityNetwork(this.gridCount, this.gridCount, this.cellSize);
  new Boundary(this.scene, this.cityTotalSize);

  // 1. Pehle Player/Camera setup karo
  this.camera = this.setupCamera();
  this.setupAvatarBase();
  this.loadCharacterModel(); // Ensure this.player yahan set ho raha hai
  this.setupInputController();

  // 2. Phir Billboards (buttons) spawn karo
  this.setupBillboards(); 
  
  // 3. Sabse niche Render Loop (jab sab kuch scene mein load ho chuka ho)
  this.scene.registerBeforeRender(() => {
    if (!this.player) return; // Ab ye safe hai

    let foundButton = false;
    this.scene.meshes.forEach((mesh) => {
        const m = mesh as Mesh; 
        if (m.metadata?.isButton) {
            const distance = Vector3.Distance(this.player.position, m.position);
            if (distance < 3) {
                m.isVisible = true; 
                this.currentActiveButton = m; 
                foundButton = true;
            } else {
                m.isVisible = false;
            }
        }
    });

    if (!foundButton) this.currentActiveButton = null;
  });
}
  private setupDaylight(): void {
    const sun = new DirectionalLight("sun", new Vector3(-0.5, -1, -0.5), this.scene);
    sun.intensity = 1.2;
    sun.position = new Vector3(0, 50, 0);
    const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), this.scene);
    hemiLight.intensity = 0.8;
  }

  private setupCamera(): ArcRotateCamera {
    const camera = new ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 2.3, 8, Vector3.Zero(), this.scene);
    camera.attachControl(this.engine.getRenderingCanvas(), true);
    camera.upperBetaLimit = Math.PI / 2.1;
    camera.lowerRadiusLimit = 3;
    camera.upperRadiusLimit = 20;
    return camera;
  }

private setupAvatarBase(): void {
  this.playerRoot = MeshBuilder.CreateBox('playerRoot', { size: 0.5 }, this.scene);
  this.playerRoot.isVisible = false;
  this.playerRoot.checkCollisions = true;
  this.playerRoot.ellipsoid = new Vector3(0.5, 1, 0.5);
  
  // Center of the map spawn (Grid size 100 hai toh 50,0,50 par spawn karo)
  const startPos = this.cityTotalSize / 2;
  this.playerRoot.position.set(startPos, 0.5, startPos); 

  this.cameraTargetMesh = MeshBuilder.CreateBox('cameraTarget', { size: 0.1 }, this.scene);
  this.cameraTargetMesh.position.set(0, 1.4, 0);
  this.cameraTargetMesh.isVisible = false;
  this.cameraTargetMesh.parent = this.playerRoot;
}

private loadCharacterModel(): void {
  SceneLoader.ImportMeshAsync("", "https://assets.babylonjs.com/meshes/", "HVGirl.glb", this.scene).then((result) => {
    const mainModel = result.meshes[0];
    
    // Model ko Root ka child banaya
    mainModel.parent = this.playerRoot;
    mainModel.scaling.setAll(0.15);
    
    // FIX: Model ki local rotation ko adjust karo
    // Agar character ulta chal raha hai, toh hume model ko 180 degrees rotate karna padega
    // Taaki wo 'playerRoot' ki rotation ke saath align ho jaye
    mainModel.rotation.y = Math.PI; 

    // Animation setup
    result.animationGroups.forEach(anim => anim.stop());

    this.idleAnim = result.animationGroups.find(ag => ag.name.toLowerCase().includes('idle'));
    this.walkAnim = result.animationGroups.find(ag => ag.name.toLowerCase().includes('walk') || ag.name.toLowerCase().includes('run'));
    this.emoteAnim = result.animationGroups.find(ag => ag.name.toLowerCase().includes('samba') || ag.name.toLowerCase().includes('wave'));

    if (this.idleAnim) {
      this.idleAnim.start(true, 1.0);
    }
  });
}

 private setupInputController(): void {
  window.addEventListener('keydown', this.keydownHandler);
  window.addEventListener('keyup', this.keyupHandler);

  this.scene.onBeforeRenderObservable.add(() => {
    if (this.isEmoting) return;
    if (this.inputMap['e'] && this.currentActiveButton) {
        this.inputMap['e'] = false; // Spamming roko
        this.playInteractionSound(this.currentActiveButton.metadata.soundFile);
        return; // Sound baji toh emote/move nahi hona chahiye
    }
    
    let moveX = 0; let moveZ = 0;
    
    // --- EMOTE LOGIC ---
    if (this.inputMap['e'] && this.emoteAnim && !this.isWalking) {
      this.isEmoting = true; this.inputMap['e'] = false;
      this.idleAnim?.stop(); this.emoteAnim.start(false, 1.2);
      this.emoteAnim.onAnimationEndObservable.addOnce(() => {
        this.isEmoting = false; this.idleAnim?.start(true, 1.0);
      });
      return;
    }

    // --- MOVEMENT ---
    if (this.inputMap['w'] || this.inputMap['arrowup']) moveZ = 1;
    if (this.inputMap['s'] || this.inputMap['arrowdown']) moveZ = -1;
    if (this.inputMap['a'] || this.inputMap['arrowleft']) moveX = -1;
    if (this.inputMap['d'] || this.inputMap['arrowright']) moveX = 1;

    if (moveX !== 0 || moveZ !== 0) {
  // 1. Move character
  const direction = new Vector3(moveX, 0, moveZ).normalize();
  this.playerRoot.moveWithCollisions(direction.scale(this.moveSpeed));

  // 2. ROTATION FIX (Shortest path rotate)
  const targetAngle = Math.atan2(moveX, moveZ);
  
  // Is line ko update karo (Rotation speed 0.2 se 0.3 kar di hai fast response ke liye)
this.playerRoot.rotation.y = targetAngle + Math.PI;  
  // 3. Animation
  if (!this.isWalking) {
    this.isWalking = true;
    this.idleAnim?.stop();
    this.walkAnim?.start(true, 1.0);
  }
}
  });
}

private setupBillboards(): void {
  const poleMat = new StandardMaterial('poleMat', this.scene);
  poleMat.diffuseColor = new Color3(0.12, 0.12, 0.15);

  const borderThickness = 0.08;
  const borderDepth = 0.22;
  const totalBillboards = 15;

  for (let i = 0; i < totalBillboards; i++) {
    const imagePath = this.memeImages[Math.floor(Math.random() * this.memeImages.length)];
    
    // 1. Material
    const billboardMat = new StandardMaterial(`bMat_${i}`, this.scene);
    billboardMat.emissiveColor = new Color3(1, 1, 1);

    const isVideo = imagePath.endsWith('.mp4') || imagePath.endsWith('.webm');
    if (isVideo) {
      const videoTexture = new VideoTexture(`video_${i}`, imagePath, this.scene, true);
      videoTexture.video.loop = true;
      videoTexture.video.muted = true;
      videoTexture.video.play();
      billboardMat.diffuseTexture = videoTexture;
    } else {
      billboardMat.diffuseTexture = new Texture(imagePath, this.scene);
    }

    const x = Math.random() * this.cityTotalSize;
    const z = Math.random() * this.cityTotalSize;
    const isHorizontal = Math.random() > 0.5;
    const rotationY = isHorizontal ? 0 : Math.PI / 2;

    // 2. Billboard Face
    const billboardBase = MeshBuilder.CreateBox(`b_${i}`, { width: 4, height: 2.5, depth: 0.2 }, this.scene);
    billboardBase.position.set(x, 4, z);
    billboardBase.rotation.y = rotationY;
    billboardBase.material = billboardMat;

    // 3. Interaction Button (Red Sphere)
    const btn = MeshBuilder.CreateSphere(`btn_${i}`, { diameter: 0.5 }, this.scene);
    // Button ko billboard ke samne position karo
    const offset = isHorizontal ? new Vector3(0, 0, 1.5) : new Vector3(1.5, 0, 0);
    btn.position.set(x + offset.x, 2, z + offset.z);
    
    const btnMat = new StandardMaterial(`btnMat_${i}`, this.scene);
    btnMat.diffuseColor = new Color3(1, 0, 0); // Red Color
    btn.material = btnMat;
    
    // Metadata mein sound ka path store karo
    btn.metadata = { 
      isButton: true, 
      soundFile: "./sounds/faaah.mp3" 
    };

    // 4. Pole & Borders (Existing code...)
    const pole = MeshBuilder.CreateCylinder(`pole_${i}`, { height: 2.75, diameter: 0.35, tessellation: 24 }, this.scene);
    pole.position.set(x, 1.375, z);
    pole.material = poleMat;

    const borders = [
      { w: 4 + borderThickness, h: borderThickness, d: borderDepth, x: 0, y: 1.25 },
      { w: 4 + borderThickness, h: borderThickness, d: borderDepth, x: 0, y: -1.25 },
      { w: borderThickness, h: 2.5, d: borderDepth, x: -2, y: 0 },
      { w: borderThickness, h: 2.5, d: borderDepth, x: 2, y: 0 }
    ];

    borders.forEach((b, bIdx) => {
      const border = MeshBuilder.CreateBox(`border_${i}_${bIdx}`, { width: b.w, height: b.h, depth: b.d }, this.scene);
      border.position.set(x + (isHorizontal ? b.x : 0), 4 + b.y, z + (isHorizontal ? 0 : b.x));
      border.rotation.y = rotationY;
      border.material = poleMat;
    });
  }
}

private startRenderLoop(): void {
  this.engine.runRenderLoop(() => {
    this.scene.render();

    if (this.camera && this.playerRoot) {
      // 1. Character ke thoda upar focus karo
      const targetPos = this.playerRoot.absolutePosition.add(new Vector3(0, 1.2, 0));
      
      // 2. Camera target ko smooth lerp karo (0.1 = speed of follow)
      this.camera.target = Vector3.Lerp(this.camera.target, targetPos, 0.1);
    }
  });

  window.addEventListener('resize', this.resizeHandler);
}

  destroyEngine(): void {
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('keydown', this.keydownHandler);
    window.removeEventListener('keyup', this.keyupHandler);
    this.engine?.dispose();
  }

  private playInteractionSound(path: string) {
    if (this.soundFX) this.soundFX.dispose();
    
    // Sound object create karo
    this.soundFX = new Sound("faaahSound", path, this.scene, () => {
        this.soundFX?.play();
        console.log("Sound playing:", path);
    }, { 
        loop: false, 
        autoplay: false 
    });
}

  ngOnDestroy(): void { this.destroyEngine(); }
}