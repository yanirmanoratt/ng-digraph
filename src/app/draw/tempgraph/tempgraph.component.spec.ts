import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TempgraphComponent } from './tempgraph.component';

describe('TempgraphComponent', () => {
  let component: TempgraphComponent;
  let fixture: ComponentFixture<TempgraphComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TempgraphComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TempgraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
