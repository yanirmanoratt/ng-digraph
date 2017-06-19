import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-graph-controls',
  template: `
  <div class="controls" id="GraphControls">
      <span class="slider-wrapper">
        -
        <input
          id="typeinp"
          type="range"
          class="slider"
          [min]="zoomToSlider(minZoom)"
          [max]="zoomToSlider(maxZoom)"
          [value]="zoomToSlider(zoomLevel)"
          (change)="zoom($event)"
          step="1"/>
        +
      </span>
      <button class="button" (click)="zoomToFitCtrl()">
        <md-icon fontSet="fontawesome" fontIcon="fa-expand" class="expend-icon-btn"></md-icon>
      </button>
    </div>
  `,
  styles: [`
    .controls {
      position: absolute;
      bottom: 30px;
      left: 15px;
      z-index: 100;
    }
    .slider-wrapper {
      background-color: white;
      color: dodgerblue;
      border: solid 1px lightgray;
      padding: 6.5px;
      margin-right: 15px;
    }
    .slider {
      position: relative;
      top: 3px;
      margin-left: 5px;
      margin-right: 5px;
    }
    .button {
      background-color: white;
      color: dodgerblue;
      border: solid 1px lightgray;
      outline: none;
      /*width: 31px;
      height: 31px;*/
      top: -3px;
      position: relative;
    }
    .expend-icon-btn{
      font-size: 15px;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 27px;
      height: 27px;
    }
  `]
})
export class GraphControlsComponent {

  steps = 100; // Slider steps
  @Input() minZoom = 0.15;
  @Input() maxZoom = 1.5;
  @Input() zoomLevel;
  @Input() zoomToFit;
  @Input() modifyZoom;

  constructor() { }

  // Convert slider val (0-steps) to original zoom value range
  sliderToZoom = (val) => ((val) * (this.maxZoom - this.minZoom) / this.steps) + this.minZoom;
  // Convert zoom val (minZoom-maxZoom) to slider range
  zoomToSlider = (val) => (val - this.minZoom) * this.steps / (this.maxZoom - this.minZoom);
  // Center graph-view on contents of svg > view
  zoomToFitCtrl() {
    this.zoomToFit();
  }
  // Modify current zoom of graph-view
  zoom(e) {
    let sliderVal = e.target.value;
    let zoomLevelNext = this.sliderToZoom(sliderVal);
    let delta = zoomLevelNext - this.zoomLevel;

    if (zoomLevelNext <= this.maxZoom && zoomLevelNext >= this.minZoom) {
      this.modifyZoom(delta);
    }
  }

}
