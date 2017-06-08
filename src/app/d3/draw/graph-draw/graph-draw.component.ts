import { Component, AfterViewInit, ViewContainerRef, ViewEncapsulation } from "@angular/core";
import * as d3 from "d3";

const nodes = [
  { id: 'A', reflexive: false },
  { id: 'B', reflexive: false },
  { id: 'C', reflexive: false }
];
let lastNodeId = 'C'.charCodeAt(0);
const links = [
  { source: nodes[0], target: nodes[1], left: false, right: true },
  { source: nodes[1], target: nodes[2], left: false, right: true }
];

@Component({
  selector: "app-graph-draw",
  encapsulation: ViewEncapsulation.None,
  template: `
    <div>
      <button>ReadOnly</button>
    </div>
  `,
  styleUrls: ['./graph-draw.component.css']
})
export class GraphDrawComponent implements AfterViewInit {
  elem;
  width = document.body.offsetWidth;
  height = 500;

  constructor(private viewContainerRef: ViewContainerRef) { }

  ngAfterViewInit() {
    // ref: https://codepen.io/zarazum/pen/fjoqF
    // https://medium.com/ninjaconcept/interactive-dynamic-force-directed-graphs-with-d3-da720c6d7811
    this.elem = this.viewContainerRef.element.nativeElement;

    const svg = d3.select(this.elem)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height);

    // init D3 force layout
    const linkForce = d3
      .forceLink()
      .id((link) => link.id)
      .distance(100)
      .strength(0.5);

    const simulation = d3
      .forceSimulation()
      .force('link', linkForce)
      .force('charge', d3.forceManyBody().strength(-50))
      // .force("repel", d3.forceManyBody().strength(-140).distanceMax(100).distanceMin(10))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2));

    // define arrow markers for graph links
    svg.append('svg:defs').append('svg:marker')
      .attr('id', 'end-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 6)
      .attr('markerWidth', 3)
      .attr('markerHeight', 3)
      .attr('orient', 'auto')
      .append('svg:path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#000');

    svg.append('svg:defs').append('svg:marker')
      .attr('id', 'start-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 4)
      .attr('markerWidth', 3)
      .attr('markerHeight', 3)
      .attr('orient', 'auto')
      .append('svg:path')
      .attr('d', 'M10,-5L0,0L10,5')
      .attr('fill', '#000');

    // line displayed when dragging new nodes
    const drag_line = svg.append('svg:path')
      .attr('class', 'link dragline hidden')
      .attr('d', 'M0,0L0,0');

    let nodeElements, textElements, linkElements;

    // we use svg groups to logically group the elements together
    const linkGroup = svg.append('g').attr('class', 'links');
    const nodeGroup = svg.append('g').attr('class', 'nodes');
    const textGroup = svg.append('g').attr('class', 'texts');

    // we use this reference to select/deselect
    // after clicking the same element twice
    let selectedId = null;

    // mouse event vars
    let selected_node = null,
      selected_link = null,
      mousedown_link = null,
      mousedown_node = null,
      mouseup_node = null;

    const resetMouseVars = () => {
      mousedown_node = null;
      mouseup_node = null;
      mousedown_link = null;
    };

    const selectNode = (selectNode) => {
      console.log('selectNode', selectNode);
    };

    const updateGraph = () => {
      // links
      linkElements = linkGroup.selectAll('line')
        .data(links, function (link) {
          return link.target.id + link.source.id;
        });
      linkElements
        // .enter().append('line')
        // .attr('stroke-width', 1)
        // .attr('stroke', '#E5E5E5')
        .enter().append('svg:path')
        .attr('class', 'link')
        .classed('selected', (d) => d === selected_link)
        .style('marker-start', (d) => d.left ? 'url(#start-arrow)' : '')
        .style('marker-end', (d) => d.right ? 'url(#end-arrow)' : '')
        .on('mousedown', (d) => {
          // select link
          mousedown_link = d;
          mousedown_link === selected_link ? selected_link = null : selected_link = mousedown_link;
          selected_node = null;
          updateGraph();
        });
      // remove old links
      linkElements.exit().remove();

      // linkElements = linkEnter.merge(linkElements);

      // nodes
      nodeElements = nodeGroup.selectAll('circle')
        .data(nodes, (node) => node.id);
      nodeElements
        .enter()
        .append('circle')
        .attr('class', 'node')
        .attr('r', 15)
        // we link the selectNode method here
        // to update the graph on every click
        .on('click', selectNode)
        .on('mousedown', (d) => {
          // select node
          mousedown_node = d;
          mousedown_node === selected_node ? selected_node = null : selected_node = mousedown_node;
          selected_link = null;
          // reposition drag line

          drag_line
            .style('marker-end', 'url(#end-arrow)')
            .classed('hidden', false)
            .attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + mousedown_node.x + ',' + mousedown_node.y);
          updateGraph();
        })
        .on('mouseup', function (d) {
          if (!mousedown_node) {
            return;
          };
          // needed by FF
          drag_line
            .classed('hidden', true)
            .style('marker-end', '');
          // check for drag-to-self
          mouseup_node = d;
          if (mouseup_node === mousedown_node) {
            resetMouseVars();
            return;
          }
          // unenlarge target node
          d3.select(this).attr('transform', '');

          // add link to graph (update if exists)
          // NB: links are strictly source < target; arrows separately specified by booleans
          let source, target, direction;
          if (mousedown_node.id < mouseup_node.id) {
            source = mousedown_node;
            target = mouseup_node;
            direction = 'right';
          } else {
            source = mouseup_node;
            target = mousedown_node;
            direction = 'left';
          }
          let link;
          link = links.filter((l) => {
            return (l.source === source && l.target === target);
          })[0];

          if (link) {
            link[direction] = true;
          } else {
            link = { source: source, target: target, left: false, right: false };
            link[direction] = true;
            links.push(link);
            console.log('mouseup links', links);
          }
          // select new link
          selected_link = link;
          selected_node = null;
          updateGraph();
        });

      nodeElements.exit().remove();
      //nodeElements = nodeEnter.merge(nodeElements);

      // texts
      // textElements = textGroup.selectAll('text')
      //   .data(nodes, (node) => node.id);

      // textElements.exit().remove();

      // const textEnter = textElements
      //   .enter()
      //   .append('text')
      //   .text((node) => node.id)
      //   .attr('font-size', 15)
      //   .attr('dx', 15)
      //   .attr('dy', 4);

      // textElements = textEnter.merge(textElements);
    };

    const positionNode = (d) => {
      return 'translate(' + d.x + ',' + d.y + ')';
    };

    const positionLink = (d) => {
      return 'M' + d.source.x + ',' + d.source.y + 'L' + d.target.x + ',' + d.target.y;
    };

    const updateSimulation = () => {
      updateGraph();

      console.log('updateSimulation nodes', nodes);
      console.log('updateSimulation links', links);
      // simulation.force("link").links(links);
      simulation.nodes(nodes).on('tick', () => {

        nodeElements.attr('transform', positionNode);
        // draw directed edges with proper padding from node centers
        linkElements.attr('d', positionLink);
        // linkElements
        //   .attr('x1', link => link.source.x)
        //   .attr('y1', link => link.source.y)
        //   .attr('x2', link => link.target.x)
        //   .attr('y2', link => link.target.y);

        // textElements
        //   .attr('x', function (node) { return node.x; })
        //   .attr('y', function (node) { return node.y; });
      });
      simulation.force('link').links(links);
      // simulation.alphaTarget(0.7).restart();
    };

    const mousedown = () => {
      svg.classed('active', true);
      if (d3.event.ctrlKey || mousedown_node || mousedown_link) {
        return;
      }
      // insert new node at point
      let point = d3.mouse(d3.event.currentTarget),
        node = { id: String.fromCharCode(++lastNodeId), reflexive: false } as any;
      node.x = point[0];
      node.y = point[1];
      nodes.push(node);
      console.log('mousedown nodes', nodes);
      updateGraph();
    };
    const mousemove = () => {
      if (!mousedown_node) {
        return;
      }
      // update drag line
      drag_line.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L'
        + d3.mouse(d3.event.currentTarget)[0] + ',' + d3.mouse(d3.event.currentTarget)[1]);
      updateGraph();
    };
    const mouseup = () => {
      if (mousedown_node) {
        // hide drag line
        drag_line
          .classed('hidden', true)
          .style('marker-end', '');
      }
      // because :active only works in WebKit?
      svg.classed('active', false);
      // clear mouse event vars
      resetMouseVars();
    };

    svg.on('mousedown', mousedown)
      .on('mousemove', mousemove)
      .on('mouseup', mouseup);
    // we call updateSimulation to trigger the initial render
    updateSimulation();
  }
}
