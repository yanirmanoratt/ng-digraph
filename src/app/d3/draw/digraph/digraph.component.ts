import {
  Component,
  AfterViewInit,
  AfterContentInit,
  ViewContainerRef,
  Input,
  ElementRef,
  ViewEncapsulation,
  OnDestroy,
  ChangeDetectionStrategy,
  Output,
  EventEmitter,
  AfterViewChecked
} from '@angular/core';

import * as d3 from 'd3';

// any objects with x & y properties
function getTheta(pt1, pt2) {
  const xComp = pt2.x - pt1.x;
  const yComp = pt2.y - pt1.y;
  const theta = Math.atan2(yComp, xComp);
  return theta;
}

function getMidpoint(pt1, pt2) {
  const x = (pt2.x + pt1.x) / 2;
  const y = (pt2.y + pt1.y) / 2;

  return { x: x, y: y };
}

function getDistance(pt1, pt2) {
  return Math.sqrt(Math.pow(pt2.x - pt1.x, 2) + Math.pow(pt2.y - pt1.y, 2))
}

@Component({
  selector: 'app-digraph',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div id='viewWrapper' class="wrapper">
    <svg id='svgRoot'>
      <defs>
        <symbol viewBox="0 0 100 100" id="empty">
          <circle cx="50" cy="50" r="45"></circle>
        </symbol>
        <symbol viewBox="0 0 50 50" id="specialEdge">
          <rect transform="rotate(45)"  x="25" y="-4.5" width="15" height="15" fill="currentColor"></rect>
        </symbol>
        <marker id="end-arrow"
          key="end-arrow"
          [attr.viewBox]="'0 -'+ edgeArrowSize/2 +' ' + edgeArrowSize+' '+edgeArrowSize"
          [attr.refX]="edgeArrowSize/2"
          [attr.markerWidth]="edgeArrowSize"
          [attr.markerHeight]="edgeArrowSize"
          orient="auto"
        >
          <path class="arrow" [attr.d]="'M0,-'+edgeArrowSize/2+'L'+edgeArrowSize+',0L0,'+edgeArrowSize/2"></path>
        </marker>
        <pattern  id="grid"
                  key="grid"
                  [attr.width]="gridSpacing"
                  [attr.height]="gridSpacing"
                  patternUnits="userSpaceOnUse">
          <circle [attr.cx]="gridSpacing/2"
                  [attr.cy]="gridSpacing/2"
                  [attr.r]="gridDot"
                  fill="lightgray">
          </circle>
        </pattern>

        <filter id="dropshadow" key="dropshadow" height="130%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
          <feOffset dx="2" dy="2" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.1" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

      </defs>

      <g id='view'>
        <rect class='background'
              [attr.x]="-gridSize/4"
              [attr.y]="-gridSize/4"
              [attr.width]="gridSize"
              [attr.height]="gridSize"
              fill="url(#grid)">
        </rect>
        <g id='entities' ref='entities'></g>
      </g>
    </svg>
  </div>
    `,
  styleUrls: ['./digraph.component.css']
})
export class DigraphComponent implements AfterContentInit, AfterViewChecked, OnDestroy {
  hoveredNode: any;
  // The work area is infinite, but the point grid is fixed
  gridSize = 40960;
  nodeSize = 150;
  gridSpacing = 36;
  gridDot = 2;
  edgeArrowSize = 8;
  edgeHandleSize = 50;
  minZoom = 0.15;
  maxZoom = 1.5;
  zoomDelay = 500; // ms
  zoomDur = 750; // ms
  viewTransform = d3.zoomIdentity;
  edgeSwapQueue: any[] = [];
  enableFocus: boolean = false;
  drawingEdge: boolean = false;
  selectingNode: boolean = false;
  focused: boolean = false;

  @Input() nodeKey: string;
  @Input() nodeSubtypes: any;
  @Input() nodeTypes: any;
  @Input() maxTitleChars: number = 9;
  @Input() emptyType: string;
  @Input() nodes: any[] = [];
  @Input() edges: any[] = [];
  @Input() links: Array<{ source: any, target: any }> = [];
  @Input() readOnly: Boolean = false;

  @Output() onSelectNode = new EventEmitter();
  @Output() onCreateNode = new EventEmitter();

  zoom = d3.zoom()
    .scaleExtent([this.minZoom, this.maxZoom])
    .on('zoom', this.handleZoom);

  constructor(private elementRef: ElementRef) {
  }

  ngOnDestroy(): void {
    // Remove window event listeners
    d3.select(window)
      .on('click', null);
  }

  ngAfterViewChecked(): void {
    this.renderView();
  }

  ngAfterContentInit(): void {

    d3.select(window)
      .on('click', this.handleWindowClicked);

    const elemSvg = this.elementRef.nativeElement.querySelector('#viewWrapper');
    const svg = d3.select(elemSvg)
      .on('touchstart', this.containZoom)
      .on('touchmove', this.containZoom)
      .on('click', this.handleSvgClicked.bind(this))
      .select('svg')
      .call(this.zoom);

    this.renderView();
  }
  // Keeps 'zoom' contained
  containZoom() {
    d3.event.preventDefault();
  }
  // View 'zoom' handler
  handleZoom() {
    this.viewTransform = d3.event.transform;
  }

  hideEdge(edgeDOMNode) {
    d3.select(edgeDOMNode)
      .attr('opacity', 0);
  }

  showEdge(edgeDOMNode) {
    d3.select(edgeDOMNode)
      .attr('opacity', 1);
  }

  handleWindowClicked(d, i) {
    let e: any = event;
    if (this.focused && !e.target.ownerSVGElement) {
      if (this.enableFocus) {
        this.focused = false;
      }
    }
  }

  handleSvgClicked(d, i) {
    if (!this.focused) {
      this.focused = true;
    }

    if (this.selectingNode) {
      this.selectingNode = false;
    } else {
      this.onSelectNode.emit(null);
      if (!this.readOnly && d3.event.shiftKey) {
        let xycoords = d3.mouse(event.target);
        this.onCreateNode.emit({ x: xycoords[0], y: xycoords[1] });
      }
    }
  }

  handleNodeMouseDown(d) {
    if (d3.event.defaultPrevented) { return; } // dragged
    if (d3.event.shiftKey) {
      this.selectingNode = true;
      this.drawingEdge = true;
      this.focused = true;
    } else {
      this.selectingNode = true;
      this.focused = true;
    }
  }
  handleNodeMouseUp(d) {
    if (this.selectingNode) {
      this.onSelectNode.emit(d);
      this.selectingNode = false;
    }
  }
  handleNodeMouseEnter(d) {
    if (this.hoveredNode !== d) {
      this.hoveredNode = d;
    }
  }
  handleNodeMouseLeave(d): void {
    // For whatever reason, mouseLeave is fired when edge dragging ends
    // (and mouseup is not fired). This clears the hoverNode state prematurely
    // resulting in swapEdge failing to fire.
    // Detecting & ignoring mouseLeave events that result from drag ending here
    const e = event as any;
    const fromMouseup = e.which === 1;
    if (this.hoveredNode === d && !fromMouseup) {
      this.hoveredNode = null;
    }
  }
  handleEdgeMouseDown(d) {
  }

  handleEdgeDrag(d) {
    // if (!this.state.readOnly && this.state.drawingEdge) {
    //   const edgeDOMNode = event.target.parentElement;
    //   const sourceNode = this.props.getViewNode(d.source);
    //   const xycoords = d3.mouse(event.target)
    //   const target = { x: xycoords[0], y: xycoords[1] }

    //   this.hideEdge(edgeDOMNode);
    //   this.drawEdge(sourceNode, target, this.showEdge.bind(this, edgeDOMNode))
    // }
  }

  drawEdge(sourceNode, target, swapErrBack) {
    // const self = this;

    // const dragEdge = d3.select(this.refs.entities).append('svg:path')

    // dragEdge.attr('class', 'link dragline')
    //   .attr("style", this.state.styles.edge.selectedString)
    //   .attr('d', self.getPathDescriptionStr(sourceNode.x, sourceNode.y, target.x, target.y));

    // d3.event.on("drag", dragged).on("end", ended);

    // function dragged(d) {
    //   dragEdge.attr('d', self.getPathDescriptionStr(sourceNode.x, sourceNode.y, d3.event.x, d3.event.y))
    // }

    // function ended(d) {
    //   dragEdge.remove();

    //   let swapEdge = self.state.edgeSwapQueue.shift();
    //   let hoveredNode = self.state.hoveredNode;

    //   self.setState({
    //     edgeSwapQueue: self.state.edgeSwapQueue,
    //     drawingEdge: false
    //   });

    //   if (hoveredNode && self.props.canCreateEdge(sourceNode, hoveredNode)) {

    //     if (swapEdge) {
    //       if (self.props.canDeleteEdge(swapEdge) && self.canSwap(sourceNode, hoveredNode, swapEdge)) {
    //         self.props.onSwapEdge(sourceNode, hoveredNode, swapEdge)
    //       } else {
    //         swapErrBack()
    //       }
    //     } else {
    //       self.props.onCreateEdge(sourceNode, hoveredNode)
    //     }
    //   } else {
    //     if (swapErrBack) {
    //       swapErrBack()
    //     }
    //   }
    // }
  }

  // Helper to find the index of a given node
  getNodeIndex(searchNode) {
    return this.nodes.findIndex((node) => {
      return node[this.nodeKey] === searchNode[this.nodeKey];
    });
  }

  // Given a nodeKey, return the corresponding node
  getViewNode(nodeKey) {
    const searchNode = {};
    searchNode[this.nodeKey] = nodeKey;
    const i = this.getNodeIndex(searchNode);
    return this.nodes[i];
  }

  // Returns the svg's path.d' (geometry description) string from edge data
  // edge.source and edge.target are node ids
  getPathDescriptionStr(sourceX, sourceY, targetX, targetY) {
    return `M${sourceX},${sourceY}L${targetX},${targetY}`
  }

  getPathDescription(edge) {
    let src = this.getViewNode(edge.source);
    let trg = this.getViewNode(edge.target);

    if (src && trg) {
      const off = this.nodeSize / 2; // from the center of the node to the perimeter

      const theta = getTheta(src, trg);

      const xOff = off * Math.cos(theta);
      const yOff = off * Math.sin(theta);

      return this.getPathDescriptionStr(src.x + xOff, src.y + yOff, trg.x - xOff, trg.y - yOff)
    }
    console.warn('Unable to get source or target for ', edge);
    return '';
  }

  dragNode() {
    const self = this;

    const el = d3.select(d3.event.target.parentElement); // Enclosing 'g' element
    el.classed('dragging', true);
    d3.event.on('drag', dragged).on('end', ended);

    function dragged(d) {
      if (self.readOnly) { return; }
      d3.select(this).attr('transform', function (d) {
        d.x += d3.event.dx;
        d.y += d3.event.dy;
        return 'translate(' + d.x + ',' + d.y + ')';
      });
      //self.render();
    }

    function ended() {
      el.classed('dragging', false);

      if (!self.readOnly) {
        var d = d3.select(this).datum();
        //self.props.onUpdateNode(d);
      }

      // For some reason, mouseup isn't firing
      // - manually firing it here
      d3.select(this).node().dispatchEvent(new Event('mouseup'))
    }
  }

  // Node 'drag' handler
  handleNodeDrag() {
    if (this.drawingEdge && !this.readOnly) {
      const target = { x: d3.event.subject.x, y: d3.event.subject.y }
      //this.drawEdge(d3.event.subject, target);
    } else {
      this.dragNode();
    }
  }

  // Renders 'node.title' into node element
  renderNodeText(d, domNode) {
    let d3Node = d3.select(domNode);
    let title = d.title ? d.title : ' ';

    let titleText = title.length <= this.maxTitleChars ? title :
      `${title.substring(0, this.maxTitleChars)}...`;

    let lineOffset = 18;
    let textOffset = d.type === this.emptyType ? -9 : 18;

    d3Node.selectAll('text').remove();

    let el = d3Node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', textOffset)
      .text(title);
  }

  getEdgeHandleTransformation(edge) {
    let src = this.getViewNode(edge.source);
    let trg = this.getViewNode(edge.target);

    let origin = getMidpoint(src, trg);
    let x = origin.x;
    let y = origin.y;
    let theta = getTheta(src, trg) * 180 / Math.PI;
    let offset = -this.edgeHandleSize / 2;

    return `translate(${x}, ${y}) rotate(${theta}) translate(${offset}, ${offset})`;
  }

  // Returns a d3 transformation string from node data
  getNodeTransformation(node) {
    return 'translate(' + node.x + ',' + node.y + ')';
  }

  // Renders 'nodes' into entities element
  renderNodes(entities, nodesData) {
    const self = this;
    const nodeKey = this.nodeKey;
    // Join Data
    const nodes = entities.selectAll('g.node').data(nodesData, (d) => {
      return d[nodeKey];
    });
    // Animate/Remove Old
    nodes.exit().remove();
    // Add New
    const newNodes = nodes.enter().append('g').classed('node', true);

    newNodes
      .attr('class', 'node')
      .on('mousedown', this.handleNodeMouseDown)
      .on('mouseup', this.handleNodeMouseUp)
      .on('mouseenter', this.handleNodeMouseEnter)
      .on('mouseleave', this.handleNodeMouseLeave)
    // .call(d3.drag().on('start', this.handleNodeDrag));

    newNodes.append('use').classed('subtypeShape', true)
      .attr('x', -this.nodeSize / 2).attr('y', -this.nodeSize / 2).attr('width', this.nodeSize).attr('height', this.nodeSize);

    newNodes.append('use').classed('shape', true)
      .attr('x', -this.nodeSize / 2).attr('y', -(this.nodeSize / 2) + 10).attr('width', this.nodeSize).attr('height', this.nodeSize);

    // Merge
    nodes.enter().merge(nodes);

    // Update All
    nodes.each((d, i, els) => {
      d3.select(els[i]).select('use.shape')
        .attr('xlink:href', '#empty');
      this.renderNodeText(d, els[i]);
    })
      .attr('transform', this.getNodeTransformation);
  }

  // Renders edges
  renderEdges(entities, edgesData) {
    const self = this;
    // Join Data
    let edges = entities.selectAll('g.edge')
      .data(edgesData, (d) => `${d.source}:${d.target}`);
    // Remove Old
    edges.exit().remove();
    // Add New
    let newEdges = edges.enter().append('g').classed('edge', true);
    newEdges
      .on('mousedown', this.handleEdgeMouseDown)
      .call(d3.drag().on('start', this.handleEdgeDrag));

    newEdges.append('path');
    newEdges.append('use');

    // Merge
    edges.enter().merge(edges);

    // Update All
    edges
      .each((d, i, els) => {
        let trans = this.getEdgeHandleTransformation(d);
        d3.select(els[i])
          .select('use')
          .attr('xlink:href', '#specialEdge')
          .attr('width', this.edgeHandleSize)
          .attr('height', this.edgeHandleSize)
          .attr('transform', trans);
      })
      .select('path')
      .attr('d', self.getPathDescription.bind(self));
  }

  renderView() {
    const nodes = this.nodes;
    const edges = this.edges;

    const elemView = this.elementRef.nativeElement.querySelector('#view');
    const elemEntities = this.elementRef.nativeElement.querySelector('#entities');
    const view = d3.select(elemView)
      .attr('tansform', this.viewTransform);

    const entities = d3.select(elemEntities);

    this.renderNodes(entities, nodes);
    this.renderEdges(entities, edges);
  }
}
