import {
  Component,
  AfterViewInit,
  ViewContainerRef,
  Input,
  ElementRef,
  ViewEncapsulation,
  OnDestroy,
  Output,
  EventEmitter,
  HostListener
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
  return Math.sqrt(Math.pow(pt2.x - pt1.x, 2) + Math.pow(pt2.y - pt1.y, 2));
}

@Component({
  selector: 'app-tempgraph',
  encapsulation: ViewEncapsulation.None,
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
          <path class="arrow" style="fill: dodgerblue;" [attr.d]="'M0,-'+edgeArrowSize/2+'L'+edgeArrowSize+',0L0,'+edgeArrowSize/2"></path>
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
          <feOffset [attr.dx]="2" [attr.dy]="2" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.2" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

      </defs>
      <svg:g id='view' [attr.transform]="viewTransform">
        <rect class='background'
              [attr.x]="-gridSize/4"
              [attr.y]="-gridSize/4"
              [attr.width]="gridSize"
              [attr.height]="gridSize"
              fill="url(#grid)">
        </rect>
        <svg:g id='entities' ref='entities'>

          <svg:g *ngFor="let node of nodes; trackBy:trackNodeBy"
          class="node"
          [attr.transform]="getNodeTransformation(node)">
            <use class="subtypeShape"
            [attr.x]="-nodeSize / 2"
            [attr.y]="-nodeSize / 2"
            [attr.width]="nodeSize"
            [attr.height]="nodeSize">
            </use>
            <use class="shape"
            [attr.x]="-nodeSize / 2"
            [attr.y]="-(nodeSize / 2) +10"
            [attr.width]="nodeSize"
            [attr.height]="nodeSize"
            href="#empty"></use>
              <text text-anchor="middle"
              fill="#000" stroke="#000" dy="18">
                {{node.title}}
              </text>
          </svg:g>

          <svg:g *ngFor="let edge of edges; trackBy:trackLinkBy" class="edge">
            <path [attr.d]="getPathDescription(edge)"></path>
            <use href="#specialEdge"
            [attr.transform]="getEdgeHandleTransformation(edge)"
            [attr.width]="edgeHandleSize"
            [attr.height]="edgeHandleSize"
            ></use>
          </svg:g>

        </svg:g>
      </svg:g>
    </svg>
  </div>
  `,
  styles: [`
  .wrapper{
    height: 100%;
    margin: 0px;
    display: flex;
    box-shadow: none;
    opacity: 1;
    background: rgb(249, 249, 249);
}
svg{
  align-content: stretch;
  flex: 1;
}
.node{
    color: #fff;
    stroke: dodgerblue;
    fill: #fff;
    filter: url(#dropshadow);
    stroke-width: 1px;
    cursor: pointer;
}
shape{
  fill: inherit;
  stroke: dark;
  stroke-width: 0.5px;
}

.edge{
  color: #fff;
  stroke: dodgerblue;
  stroke-width: 2px;
  marker-end: url(#end-arrow);
  cursor: pointer;
}
`]
})
export class TempgraphComponent implements AfterViewInit, OnDestroy {
  hoveredNode: any;
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
  transitionTime = 150;
  edgeSwapQueue: any[] = [];
  enableFocus = false;
  drawingEdge = false;
  selectingNode = false;
  focused = true;
  canDeleteNode: Function = () => true;
  canCreateEdge: Function = () => true;
  canDeleteEdge: Function = () => true;
  zoom: any;
  elemView: ElementRef;
  elemEntities: ElementRef;

  @Input() nodeKey: string;
  @Input() nodeSubtypes: any;
  @Input() nodeTypes: any;
  @Input() maxTitleChars = 9;
  @Input() emptyType: string;
  @Input() nodes: any[] = [];
  @Input() edges: any[] = [];
  @Input() links: Array<{ source: any, target: any }> = [];
  @Input() readOnly: Boolean;
  @Input() selected: any;

  @Output() onSelectNode = new EventEmitter();
  @Output() onCreateNode = new EventEmitter();
  @Output() onUpdateNode = new EventEmitter();
  @Output() onSwapEdge = new EventEmitter();
  @Output() onCreateEdge = new EventEmitter();
  @Output() onSelectEdge = new EventEmitter();
  @Output() onDeleteNode = new EventEmitter();
  @Output() onDeleteEdge = new EventEmitter();

  constructor(private elementRef: ElementRef) {
    // Bind methods
    this.hideEdge = this.hideEdge.bind(this);
    this.showEdge = this.showEdge.bind(this);
    this.canSwap = this.canSwap.bind(this);
    this.drawEdge = this.drawEdge.bind(this);
    this.dragNode = this.dragNode.bind(this);
    this.handleNodeDrag = this.handleNodeDrag.bind(this);
    this.handleDelete = this.handleDelete.bind(this);
    this.handleWindowKeydown = this.handleWindowKeydown.bind(this);
    this.handleWindowClicked = this.handleWindowClicked.bind(this);
    this.handleSvgClicked = this.handleSvgClicked.bind(this);
    this.handleNodeMouseDown = this.handleNodeMouseDown.bind(this);
    this.handleNodeMouseUp = this.handleNodeMouseUp.bind(this);
    this.handleNodeMouseEnter = this.handleNodeMouseEnter.bind(this);
    this.handleNodeMouseLeave = this.handleNodeMouseLeave.bind(this);
    this.arrowClicked = this.arrowClicked.bind(this);
    this.handleEdgeDrag = this.handleEdgeDrag.bind(this);
    this.handleEdgeMouseDown = this.handleEdgeMouseDown.bind(this);
    this.containZoom = this.containZoom.bind(this);
    this.handleZoom = this.handleZoom.bind(this);
    this.handleZoomToFit = this.handleZoomToFit.bind(this);
    this.setZoom = this.setZoom.bind(this);
    this.getPathDescriptionStr = this.getPathDescriptionStr.bind(this);
    this.getPathDescription = this.getPathDescription.bind(this);
    this.getEdgeHandleTransformation = this.getEdgeHandleTransformation.bind(this);
    this.getNodeTransformation = this.getNodeTransformation.bind(this);
    this.getNodeStyle = this.getNodeStyle.bind(this);
    this.getEdgeStyle = this.getEdgeStyle.bind(this);
    this.getTextStyle = this.getTextStyle.bind(this);
    this.renderNodeText = this.renderNodeText.bind(this);
    this.renderEdges = this.renderEdges.bind(this);
    this.renderNodes = this.renderNodes.bind(this);
    this.renderView = this.renderView.bind(this);

    this.zoom = d3.zoom()
      .scaleExtent([this.minZoom, this.maxZoom])
      .on('zoom', this.handleZoom.bind(this));
  }

  ngOnDestroy(): void {
    // Remove window event listeners
    d3.select(window)
      .on('keydown', null)
      .on('click', null);
  }

  ngAfterViewInit(): void {

    d3.select(window)
      .on('keydown', this.handleWindowKeydown)
      .on('click', this.handleWindowClicked);

    const elemSvg = this.elementRef.nativeElement.querySelector('#viewWrapper');
    const svg = d3.select(elemSvg)
      .on('touchstart', this.containZoom)
      .on('touchmove', this.containZoom)
      .on('click', this.handleSvgClicked)
      .select('svg')
      .call(this.zoom);

    // On the initial load, the 'view' <g> doesn't exist
    // until ngAfterViewInit. Manually render the first view.
    // this.renderView();

    // setTimeout(function () {
    //   this.handleZoomToFit();
    // }.bind(this), this.zoomDelay);
  }

  trackNodeBy(index, node): any {
    return node.id;
  }

  trackLinkBy(index, link): any {
    return link.index;
  }

  /*
  * Handlers/Interaction
  */

  hideEdge(edgeDOMNode) {
    d3.select(edgeDOMNode)
      .attr('opacity', 0);
  }

  showEdge(edgeDOMNode) {
    d3.select(edgeDOMNode)
      .attr('opacity', 1);
  }

  canSwap(sourceNode, hoveredNode, swapEdge) {
    return swapEdge.source !== sourceNode[this.nodeKey] ||
      swapEdge.target !== hoveredNode[this.nodeKey];
  }

  drawEdge(sourceNode, target, swapErrBack) {
    const self = this;
    const dragEdge = d3.select(this.elemEntities).append('svg:path');

    dragEdge.attr('class', 'link dragline')
      .attr('style', 'color:dodgerblue; stroke:dodgerblue; stroke-width: 2px; marker-end: url(#end-arrow); cursor: pointer;')
      .attr('d', self.getPathDescriptionStr(sourceNode.x, sourceNode.y, target.x, target.y));

    d3.event.on('drag', dragged).on('end', ended);

    function dragged(d) {
      dragEdge.attr('d', self.getPathDescriptionStr(sourceNode.x, sourceNode.y, d3.event.x, d3.event.y));
    }

    function ended(d) {
      dragEdge.remove();

      const swapEdge = self.edgeSwapQueue.shift();
      const hoveredNode = self.hoveredNode;
      self.drawingEdge = false;

      if (hoveredNode && self.canCreateEdge(sourceNode, hoveredNode)) {

        if (swapEdge) {
          if (self.canDeleteEdge(swapEdge) && self.canSwap(sourceNode, hoveredNode, swapEdge)) {
            self.onSwapEdge.emit({ sourceNode, hoveredNode, swapEdge });
          } else {
            swapErrBack();
          }
        } else {
          self.onCreateEdge.emit({ sourceNode, hoveredNode });
        }
      } else {
        if (swapErrBack) {
          swapErrBack();
        }
      }
    }
  }

  // Keeps 'zoom' contained
  containZoom() {
    d3.event.preventDefault();
  }
  // View 'zoom' handler
  handleZoom() {
    if (this.focused) {
      this.viewTransform = d3.event.transform;
    }
  }

  // Zooms to contents of this.refs.entities
  handleZoomToFit() {
    const parent = d3.select(this.elemView).node();
    const entities = d3.select(this.elemEntities).node();

    const viewBBox = entities.getBBox();

    const width = parent.clientWidth;
    const height = parent.clientHeight;

    let dx,
      dy,
      x,
      y,
      translate = [this.viewTransform.x, this.viewTransform.y],
      next = { x: translate[0], y: translate[1], k: this.viewTransform.k };

    if (viewBBox.width > 0 && viewBBox.height > 0) {
      // There are entities
      dx = viewBBox.width,
        dy = viewBBox.height,
        x = viewBBox.x + viewBBox.width / 2,
        y = viewBBox.y + viewBBox.height / 2;

      next.k = .9 / Math.max(dx / width, dy / height);

      if (next.k < this.minZoom) {
        next.k = this.minZoom;
      } else if (next.k > this.maxZoom) {
        next.k = this.maxZoom;
      }

      next.x = width / 2 - next.k * x;
      next.y = height / 2 - next.k * y;
    }
    else {
      next.k = (this.minZoom + this.maxZoom) / 2;
      next.x = 0;
      next.y = 0;
    }

    this.setZoom(next.k, next.x, next.y, this.zoomDur);
  }

  // Programmatically resets zoom
  setZoom(k = 1, x = 0, y = 0, dur = 0) {

    const t = d3.zoomIdentity.translate(x, y).scale(k);

    d3.select(this.elemView).select('svg')
      .transition()
      .duration(dur)
      .call(this.zoom.transform, t);
  }

  handleWindowKeydown(d, i) {
    // Conditionally ignore keypress events on the window
    // if the Graph isn't focused
    if (this.focused) {
      switch (d3.event.key) {
        case 'Delete':
          this.handleDelete();
          break;
        case 'Backspace':
          this.handleDelete();
          break;
        default:
          break;
      }
    }
  }

  getSelectionType(): string {
    let selectionType = null;
    if (this.selected && this.selected.source) {
      selectionType = 'edge';
    } else if (this.selected && this.selected[this.nodeKey]) {
      selectionType = 'node';
    }
    return selectionType;
  }

  handleDelete() {
    if (this.readOnly) { return; };

    const selectionType = this.getSelectionType();

    if (this.selected) {
      const selected = this.selected;
      if (selectionType === 'node' && this.canDeleteNode(selected)) {
        this.onDeleteNode.emit(selected);
        this.onSelectNode.emit(null);
      } else if (selectionType === 'edge' && this.canDeleteEdge(selected)) {
        this.onDeleteEdge.emit(selected);
        this.onSelectNode.emit(null);
      }
    }
  }

  handleWindowClicked(d, i) {
    const e: any = event;
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
        const xycoords = d3.mouse(event.target);
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
  // One can't attach handlers to 'markers' or obtain them from the event.target
  // If the click occurs within a certain radius of edge target,
  // assume the click occurred on the arrow
  arrowClicked(d) {
    const e: any = event.target;
    if (e.tagName !== 'path') { return false; }; // If the handle is clicked

    const xycoords = d3.mouse(e);
    const target = this.getViewNode(d.target);
    const dist = getDistance({ x: xycoords[0], y: xycoords[1] }, target);

    return dist < this.nodeSize / 2 + this.edgeArrowSize + 10; // or *2 or ^2?
  }
  handleEdgeMouseDown(d) {
    if (!this.readOnly && this.arrowClicked(d)) {
      this.edgeSwapQueue.push(d); // Set this edge aside for redrawing
      this.drawingEdge = true;
      this.focused = true;
    } else {
      this.onSelectEdge.emit(d);
      this.focused = true;
    }
  }
  handleEdgeDrag(d) {
    if (!this.readOnly && this.drawingEdge) {
      const e: any = event.target;
      const edgeDOMNode = e.parentElement;
      const sourceNode = this.getViewNode(d.source);
      const xycoords = d3.mouse(e);
      const target = { x: xycoords[0], y: xycoords[1] };

      this.hideEdge(edgeDOMNode);
      this.drawEdge(sourceNode, target, this.showEdge.bind(this, edgeDOMNode));
    }
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
      // this.renderView();
    }

    function ended() {
      el.classed('dragging', false);

      if (!self.readOnly) {
        const d = d3.select(this).datum();
        self.onUpdateNode.emit(d);
      }

      // For some reason, mouseup isn't firing
      // - manually firing it here
      d3.select(this).node().dispatchEvent(new Event('mouseup'));
    }
  }

  errorHandler(err) {
    console.log('handleNodeDrag error:', err);
  }

  // Node 'drag' handler
  handleNodeDrag() {
    if (this.drawingEdge && !this.readOnly) {
      const target = { x: d3.event.subject.x, y: d3.event.subject.y };
      this.drawEdge(d3.event.subject, target, this.errorHandler);
    } else {
      this.dragNode();
    }
  }

  /*
  * Render
  */

  // Returns the svg's path.d' (geometry description) string from edge data
  // edge.source and edge.target are node ids
  getPathDescriptionStr(sourceX, sourceY, targetX, targetY) {
    return `M${sourceX},${sourceY}L${targetX},${targetY}`;
  }

  getPathDescription(edge) {
    const src = this.getViewNode(edge.source);
    const trg = this.getViewNode(edge.target);

    if (src && trg) {
      const off = this.nodeSize / 2; // from the center of the node to the perimeter

      const theta = getTheta(src, trg);

      const xOff = off * Math.cos(theta);
      const yOff = off * Math.sin(theta);

      return this.getPathDescriptionStr(src.x + xOff, src.y + yOff, trg.x - xOff, trg.y - yOff);
    }
    console.warn('Unable to get source or target for ', edge);
    return '';
  }

  getEdgeHandleTransformation(edge) {
    const src = this.getViewNode(edge.source);
    const trg = this.getViewNode(edge.target);

    const origin = getMidpoint(src, trg);
    const x = origin.x;
    const y = origin.y;
    const theta = getTheta(src, trg) * 180 / Math.PI;
    const offset = -this.edgeHandleSize / 2;

    return `translate(${x}, ${y}) rotate(${theta}) translate(${offset}, ${offset})`;
  }

  // Returns a d3 transformation string from node data
  getNodeTransformation(node) {
    return 'translate(' + node.x + ',' + node.y + ')';
  }

  getNodeStyle(d, selected) {
    return d === selected ?
      'color:#FFF;stroke:dodgerblue;fill:dodgerblue;filter:url(#dropshadow);stroke-width:0.5px;cursor:pointer' :
      'color:dodgerblue;stroke:#FFF;fill:#FFF;filter:url(#dropshadow);stroke-width:0.5px;cursor:pointer';
  }

  getEdgeStyle(d, selected) {
    return d === selected ? 'dodgerblue' : '#fff';
    // { color: 'dodgerblue', stroke: 'dodgerblue', strokeWidth: '2px', markerEnd: 'url(#end-arrow)', cursor: 'pointer' } :
    // { color: '#FFF', stroke: 'dodgerblue', strokeWidth: '2px', markerEnd: 'url(#end-arrow)', cursor: 'pointer' };
  }

  getTextStyle(d, selected) {
    return d === selected ?
      'fill:#FFF;stroke:#FFF' :
      'fill:#000;stroke:#000';
  }

  // Renders 'node.title' into node element
  renderNodeText(d, domNode) {
    const d3Node = d3.select(domNode);
    const title = d.title ? d.title : ' ';

    const titleText = title.length <= this.maxTitleChars ? title :
      `${title.substring(0, this.maxTitleChars)}...`;

    const lineOffset = 18;
    const textOffset = d.type === this.emptyType ? -9 : 18;

    d3Node.selectAll('text').remove();

    const style = this.getTextStyle(d, this.selected);

    const el = d3Node.append('text')
      .attr('style', style)
      .attr('text-anchor', 'middle')
      .attr('dy', textOffset)
      .text(title);
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
    nodes.exit()
      .transition()
      .duration(this.transitionTime)
      .attr('opacity', 0)
      .remove();
    // Add New
    const newNodes = nodes.enter().append('g').classed('node', true);

    newNodes
      .attr('class', 'node')
      .on('mousedown', this.handleNodeMouseDown)
      .on('mouseup', this.handleNodeMouseUp)
      .on('mouseenter', this.handleNodeMouseEnter)
      .on('mouseleave', this.handleNodeMouseLeave)
      .call(d3.drag().on('start', this.handleNodeDrag));

    newNodes.append('use').classed('subtypeShape', true)
      .attr('x', -this.nodeSize / 2).attr('y', -this.nodeSize / 2).attr('width', this.nodeSize).attr('height', this.nodeSize);

    newNodes.append('use').classed('shape', true)
      .attr('x', -this.nodeSize / 2).attr('y', -(this.nodeSize / 2) + 10).attr('width', this.nodeSize).attr('height', this.nodeSize);
    newNodes
      .attr('opacity', 0)
      .transition()
      .duration(this.transitionTime)
      .attr('opacity', 1);

    // Merge
    nodes.enter().merge(nodes);

    // Update All
    nodes.each((d, i, els) => {
      const style = self.getNodeStyle(d, self.selected);

      d3.select(els[i])
        .attr('style', style);

      d3.select(els[i]).select('use.shape')
        .attr('href', '#empty');
      this.renderNodeText(d, els[i]);
    })
      .attr('transform', this.getNodeTransformation);

  }

  // Renders edges
  renderEdges(entities, edgesData) {
    const self = this;
    // Join Data
    const edges = entities.selectAll('g.edge')
      .data(edgesData, (d) => `${d.source}:${d.target}`);
    // Remove Old
    edges.exit().remove();
    // Add New
    const newEdges = edges.enter().append('g').classed('edge', true);
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
        const style = self.getEdgeStyle(d, self.selected);
        const trans = self.getEdgeHandleTransformation(d);
        d3.select(els[i])
          .attr('style', style)
          .select('use')
          .attr('href', '#specialEdge')
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

    this.elemView = this.elementRef.nativeElement.querySelector('#view');
    this.elemEntities = this.elementRef.nativeElement.querySelector('#entities');

    const view = d3.select(this.elemView)
      .attr('tansform', this.viewTransform);

    const entities = d3.select(this.elemEntities);

    this.renderNodes(entities, nodes);
    this.renderEdges(entities, edges);
  }
}
