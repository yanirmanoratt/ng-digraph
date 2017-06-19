import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NgraphComponent } from './ngraph.component';

describe('NgraphComponent', () => {
  let component: NgraphComponent;
  let fixture: ComponentFixture<NgraphComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NgraphComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NgraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
