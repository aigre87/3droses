import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThreejsViewComponent } from './threejs-view.component';

describe('ThreejsViewComponent', () => {
  let component: ThreejsViewComponent;
  let fixture: ComponentFixture<ThreejsViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ThreejsViewComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ThreejsViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
