import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

// material design
import { MdToolbarModule, MdButtonModule, MdCheckboxModule, MdIconModule, MdIconRegistry } from '@angular/material';

import { D3Service } from 'd3-ng2-service';

import { AppComponent } from './app.component';
import { GraphComponent } from './d3/static/graph/graph.component';
import { GraphDrawComponent } from './d3/draw/graph-draw/graph-draw.component';
import { DigraphComponent } from './d3/draw/digraph/digraph.component';
import { TempgraphComponent } from './draw/tempgraph/tempgraph.component';
import { NgraphComponent } from './draw/ngraph/ngraph.component';
import { GraphControlsComponent } from './draw/graph-controls/graph-controls.component';

@NgModule({
  declarations: [
    AppComponent,
    GraphComponent,
    GraphDrawComponent,
    DigraphComponent,
    TempgraphComponent,
    NgraphComponent,
    GraphControlsComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    MdToolbarModule,
    MdButtonModule,
    MdCheckboxModule,
    MdIconModule,
    HttpModule
  ],
  providers: [D3Service, MdIconRegistry],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(mdIconRegistry: MdIconRegistry) {
    mdIconRegistry.registerFontClassAlias('fontawesome', 'fa');
  }
}
