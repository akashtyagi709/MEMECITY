import { Component, ElementRef, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { GameEngine } from '../../core/services/game-engine';

@Component({
  selector: 'app-game-canvas',
  imports: [],
  templateUrl: './game-canvas.html',
  styleUrl: './game-canvas.css',
})
export class GameCanvas {
@ViewChild('rendererCanvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;

  constructor(private gameEngine: GameEngine) {}

  ngOnInit(): void {
    // Jaise hi component load hoga, 3D engine initialize ho jayega
    if (this.canvas) {
      this.gameEngine.initEngine(this.canvas);
    }
  }

  ngOnDestroy(): void {
    // Memory leak se bachne ke liye graphics engine ko destroy karna zaroori hai
    this.gameEngine.destroyEngine();
  }
}
