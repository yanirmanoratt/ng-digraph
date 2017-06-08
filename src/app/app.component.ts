import { Component, AfterViewInit } from '@angular/core';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'app works!';

  NODE_KEY = 'id' // Key used to identify nodes
  EMPTY_TYPE = "empty"; // Empty node type
  SPECIAL_TYPE = "special";
  SPECIAL_CHILD_SUBTYPE = "specialChild";
  EMPTY_EDGE_TYPE = "emptyEdge";
  SPECIAL_EDGE_TYPE = "specialEdge";

  nodes = [
    {
      "id": 1,
      "title": "Node A",
      "x": 258.3976135253906,
      "y": 331.9783248901367,
      "type": this.SPECIAL_TYPE
    },
    {
      "id": 2,
      "title": "Node B",
      "x": 593.9393920898438,
      "y": 260.6060791015625,
      "type": this.EMPTY_TYPE,
      "subtype": this.SPECIAL_CHILD_SUBTYPE
    },
    {
      "id": 3,
      "title": "Node C",
      "x": 237.5757598876953,
      "y": 61.81818389892578,
      "type": this.EMPTY_TYPE
    }
  ]

}
