import { TestBed } from '@angular/core/testing';

import { Billboard } from './billboard';

describe('Billboard', () => {
  let service: Billboard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Billboard);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
