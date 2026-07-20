import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameCanvas } from './game-canvas';

describe('GameCanvas', () => {
  let component: GameCanvas;
  let fixture: ComponentFixture<GameCanvas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameCanvas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GameCanvas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
