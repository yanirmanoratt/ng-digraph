import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { AppComponent } from './app.component';
import { GraphComponent } from './d3/static/graph/graph.component';
import { GraphDrawComponent } from './d3/draw/graph-draw/graph-draw.component';
import { DigraphComponent } from './d3/draw/digraph/digraph.component';

@NgModule({
  declarations: [
    AppComponent,
    GraphComponent,
    GraphDrawComponent,
    DigraphComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
