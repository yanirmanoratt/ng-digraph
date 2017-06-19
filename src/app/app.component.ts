import { Component, AfterViewInit, ViewChild } from '@angular/core';
import { NgraphComponent } from './draw/ngraph/ngraph.component';

const EMPTY_TYPE = 'empty'; // Empty node type
const SPECIAL_TYPE = 'special';
const SPECIAL_CHILD_SUBTYPE = 'specialChild';
const EMPTY_EDGE_TYPE = 'emptyEdge';
const SPECIAL_EDGE_TYPE = 'specialEdge';
const alphabet = 'abcdefghijklmnopqrstuvwxyz';

const sample = {
  'nodes': [
    {
      'id': 1,
      'title': 'Node A',
      'x': 258.3976135253906,
      'y': 331.9783248901367,
      'type': SPECIAL_TYPE
    },
    {
      'id': 2,
      'title': 'Node B',
      'x': 593.9393920898438,
      'y': 260.6060791015625,
      'type': EMPTY_TYPE,
      'subtype': SPECIAL_CHILD_SUBTYPE
    },
    {
      'id': 3,
      'title': 'Node C',
      'x': 237.5757598876953,
      'y': 61.81818389892578,
      'type': EMPTY_TYPE
    },
    {
      'id': 4,
      'title': 'Node C',
      'x': 600.5757598876953,
      'y': 600.81818389892578,
      'type': EMPTY_TYPE
    }
  ],
  'edges': [
    {
      'source': 1,
      'target': 2,
      'type': SPECIAL_EDGE_TYPE
    },
    {
      'source': 2,
      'target': 4,
      'type': EMPTY_EDGE_TYPE
    }
  ]
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  @ViewChild(NgraphComponent) graph: NgraphComponent;
  nodes = [];
  edges = [];
  selected = {};
  NODE_KEY = 'id'; // Key used to identify nodes
  readOnly = false;

  constructor() {
    this.nodes = sample.nodes;
    this.edges = sample.edges;
    // Bind methods
    this.onSelectNode = this.onSelectNode.bind(this);
    this.onCreateNode = this.onCreateNode.bind(this);
    this.onUpdateNode = this.onUpdateNode.bind(this);
    this.onDeleteNode = this.onDeleteNode.bind(this);
    this.onSelectEdge = this.onSelectEdge.bind(this);
    this.onCreateEdge = this.onCreateEdge.bind(this);
    this.onSwapEdge = this.onSwapEdge.bind(this);
    this.onDeleteEdge = this.onDeleteEdge.bind(this);
  }

  exportDate(): void {
    // http call
    console.log(`graph data: nodes - ${JSON.stringify(this.nodes)} , edges - ${JSON.stringify(this.edges)}`);
  }

  // Helper to find the index of a given node
  getNodeIndex(searchNode) {
    return this.nodes.findIndex((node) => {
      return node[this.NODE_KEY] === searchNode[this.NODE_KEY];
    });
  }

  // Helper to find the index of a given edge
  getEdgeIndex(searchEdge) {
    return this.edges.findIndex((edge) => {
      return edge.source === searchEdge.source &&
        edge.target === searchEdge.target;
    });
  }

  // Node 'mouseUp' handler
  onSelectNode(viewNode) {
    // Deselect events will send Null viewNode
    if (!!viewNode) {
      this.selected = viewNode;
    } else {
      this.selected = {};
    }
    // console.log('onSelectNode', viewNode);
  }

  onCreateNode({ x, y }) {
    const type = Math.random() < 0.25 ? SPECIAL_TYPE : EMPTY_TYPE;

    const viewNode = {
      id: this.nodes.length + 1,
      title: `Node ${alphabet[Math.floor(Math.random() * alphabet.length)].toUpperCase()}`,
      type: type,
      x: x,
      y: y
    };

    this.nodes.push(viewNode);
    this.graph.renderView();
  }

  // Creates a new node between two edges
  onCreateEdge({ sourceNode: sourceViewNode, hoveredNode: targetViewNode }) {
    // This is just an example - any sort of logic
    // could be used here to determine edge type
    const type = sourceViewNode.type === SPECIAL_TYPE ? SPECIAL_EDGE_TYPE : EMPTY_EDGE_TYPE;

    const viewEdge = {
      source: sourceViewNode[this.NODE_KEY],
      target: targetViewNode[this.NODE_KEY],
      type: type
    };
    this.edges.push(viewEdge);
    this.graph.renderView();
  }

  // Called by 'drag' handler, etc..
  // to sync updates from D3 with the graph
  onUpdateNode(viewNode) {
    const i = this.getNodeIndex(viewNode);
    this.nodes[i] = viewNode;
  }

  // Called when an edge is reattached to a different target.
  onSwapEdge({ sourceNode: sourceViewNode, hoveredNode: targetViewNode, swapEdge: viewEdge }) {
    const i = this.getEdgeIndex(viewEdge);
    const edge = JSON.parse(JSON.stringify(this.edges[i]));

    edge.source = sourceViewNode[this.NODE_KEY];
    edge.target = targetViewNode[this.NODE_KEY];
    this.edges[i] = edge;
    this.graph.renderView();
  }

  // Edge 'mouseUp' handler
  onSelectEdge(viewEdge) {
    //console.log('onSelectEdge', viewEdge);
    this.selected = viewEdge;
  }

  // Deletes a node from the graph
  onDeleteNode(viewNode) {
    const i = this.getNodeIndex(viewNode);
    this.nodes.splice(i, 1);

    // Delete any connected edges
    const newEdges = this.edges.filter((edge) => {
      return edge.source !== viewNode[this.NODE_KEY] &&
        edge.target !== viewNode[this.NODE_KEY];
    });

    this.edges = newEdges;
    this.selected = {};
  }

  // Called when an edge is deleted
  onDeleteEdge(viewEdge) {
    const i = this.getEdgeIndex(viewEdge);
    this.edges.splice(i, 1);
    this.selected = {};
  }
}
