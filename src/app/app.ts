import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GameCanvas } from "./components/game-canvas/game-canvas";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, GameCanvas],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('memecity');
}
