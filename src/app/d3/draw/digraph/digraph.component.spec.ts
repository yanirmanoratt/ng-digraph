import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DigraphComponent } from './digraph.component';

describe('DigraphComponent', () => {
  let component: DigraphComponent;
  let fixture: ComponentFixture<DigraphComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DigraphComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DigraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
