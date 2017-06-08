import {
  Component,
  AfterViewInit,
  AfterContentInit,
  ViewContainerRef,
  Input,
  ElementRef,
  ViewEncapsulation,
  OnDestroy,
  ChangeDetectionStrategy
} from '@angular/core';
import * as d3 from 'd3';

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
export class DigraphComponent implements AfterContentInit, OnDestroy {
  // The work area is infinite, but the point grid is fixed
  gridSize = 40960;
  nodeSize = 150;
  gridSpacing = 36;
  gridDot = 2;
  edgeArrowSize = 8;

  @Input() nodeKey: string;
  @Input() nodeSubtypes: any;
  @Input() nodeTypes: any;
  @Input() maxTitleChars: number = 9;
  @Input() emptyType: string;
  @Input() nodes: any[] = [];
  @Input() links: Array<{ source: any, target: any }> = [];
  @Input() readOnly: Boolean = false;

  state = {
    viewTransform: d3.zoomIdentity,
    drawingEdge: false
  };

  constructor(private elementRef: ElementRef) { }

  ngOnDestroy(): void {
    // Remove window event listeners
    d3.select(window)
      .on('click', null);
  }

  ngAfterContentInit(): void {
    this.renderView();
  }

  ngAfterViewInit(): void {
    d3.select(window)
      .on('click', this.handleWindowClicked);
    const elemSvg = this.elementRef.nativeElement.querySelector('svg');
    const svg = d3.select(elemSvg)
      .on('click', this.handleSvgClicked);

    this.renderView();
  }

  handleWindowClicked(d, i) {
  }

  handleSvgClicked(d, i) {
  }

  handleNodeMouseDown(d) {
    if (d3.event.defaultPrevented) { return; } // dragged
  }
  handleNodeMouseUp(d) {
  }
  handleNodeMouseEnter(d) {
  }

  handleNodeMouseLeave(d) {
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
    if (this.state.drawingEdge && !this.readOnly) {
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
      .call(d3.drag().on('start', this.handleNodeDrag));

    newNodes.append('use').classed('subtypeShape', true)
      .attr('x', -this.nodeSize / 2).attr('y', -this.nodeSize / 2).attr('width', this.nodeSize).attr('height', this.nodeSize);

    newNodes.append('use').classed('shape', true)
      .attr('x', -this.nodeSize / 2).attr('y', -(this.nodeSize / 2) + 10).attr('width', this.nodeSize).attr('height', this.nodeSize);

    // Merge
    nodes.enter().merge(nodes);

    // Update All
    nodes.each((d, i, els) => {
      d3.select(els[i]).select("use.shape")
        .attr('xlink:href', '#empty');
      this.renderNodeText(d, els[i]);
    })
      .attr('transform', this.getNodeTransformation);
  }

  renderView() {
    const nodes = this.nodes;
    const edges = this.links;

    const elemView = this.elementRef.nativeElement.querySelector('#view');
    const elemEntities = this.elementRef.nativeElement.querySelector('#entities');
    const view = d3.select(elemView)
      .attr('tansform', this.state.viewTransform);

    const entities = d3.select(elemEntities);

    this.renderNodes(entities, nodes);
  }
}
