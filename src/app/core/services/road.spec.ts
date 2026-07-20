import { TestBed } from '@angular/core/testing';

import { Road } from './road';

describe('Road', () => {
  let service: Road;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Road);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
