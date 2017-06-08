import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphDrawComponent } from './graph-draw.component';

describe('GraphDrawComponent', () => {
  let component: GraphDrawComponent;
  let fixture: ComponentFixture<GraphDrawComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GraphDrawComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GraphDrawComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
