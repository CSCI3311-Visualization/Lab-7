let visType = 'force';
const width = 400;
const height = 400;

const svg = d3
  .select('.node-link')
  .append('svg')
  .attr('viewBox', [0, 0, width, height]);

const tooltip = d3.select('.tooltip');

Promise.all([
  // load multiple files
  d3.json('airports.json'),
  d3.json('world-110m.json'),
]).then(([airports, worldmap]) => {
  ////// MAP CHART //////
  const topo = topojson.feature(worldmap, worldmap.objects.countries);
  const features = topo.features;
  const projection = d3.geoMercator().fitExtent(
    [
      [0, 0],
      [width, height],
    ],
    topo
  );

  const path = d3.geoPath().projection(projection);

  svg
    .selectAll('path')
    .data(features)
    .join('path')
    .attr('class', 'world-map')
    .attr('fill', 'steelblue')
    .attr('d', path)
    .style('opacity', 0);

  svg
    .append('path')
    .datum(topojson.mesh(worldmap, worldmap.objects.countries))
    .attr('d', path)
    .attr('fill', 'none')
    .attr('stroke', 'white')
    .attr('class', 'world-map subunit-boundary')
    .style('opacity', 0);

  ///// NODE LINK DIAGRAM
  // Create a scale for sizing the circles based on the number of passengers
  const size = d3
    .scaleLinear()
    .domain(d3.extent(airports.nodes, (d) => d.passengers))
    .range([5, 15]);

  const force = d3
    .forceSimulation(airports.nodes)
    .force('link', d3.forceLink(airports.links))
    .force('charge', d3.forceManyBody().strength(5))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('x', d3.forceX(width / 2))
    .force('y', d3.forceY(height / 2))
    .force(
      'collide',
      d3.forceCollide().radius(function (d) {
        return size(d.passengers) + 10;
      })
    );

  const drag = d3
    .drag()
    .on('start', (event) => {
      if (!event.active) force.alphaTarget(0.3).restart();
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    })
    .on('drag', (event) => {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    })
    .on('end', (event) => {
      if (!event.active) force.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    });

  drag.filter((event) => visType === 'force');

  const link = svg
    .append('g')
    .attr('stroke', '#999')
    .attr('stroke-opacity', 0.6)
    .selectAll('line')
    .data(airports.links)
    .join('line')
    .attr('stroke', '#999')
    .attr('stroke-opacity', 0.6)
    .attr('stroke-width', 2);

  const node = svg
    .append('g')
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5)
    .selectAll('circle')
    .data(airports.nodes)
    .join('circle')
    .attr('r', (d) => size(d.passengers))
    .attr('fill', '#F4AE3D')
    .on('mouseenter', (event, d) => {
      if (visType !== 'force') {
        // set inner HTML of the tooltip
        tooltip.html(d.name);

        // const matrix = d3.select(this).node().getBoundingClientRect();
        console.log(d3.select(this).getBBox());

        // set position and show tooltip
        const pos = d3.pointer(event, window);
        console.log('matrix', matrix);
        tooltip.style('top', window.pageYOffset + matrix.f - 30 + 'px');
        tooltip.style('left', window.pageXOffset + matrix.e + 15 + 'px');
        tooltip.style('display', 'block');
      }
    })
    .on('mouseleave', () => {
      // hide tooltip
      tooltip.style('display', 'none');
    });

  node.call(drag);

  node.append('title').text((d) => d.name);

  function tick() {
    link
      .attr('x1', (d) => d.source.x)
      .attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x)
      .attr('y2', (d) => d.target.y);
    node.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
  }

  force.on('tick', tick);

  d3.selectAll('input[name=option]').on('change', (event) => {
    visType = event.target.value;
    switchLayout();
  });

  function switchLayout() {
    if (visType == 'map') {
      // stop the simulation
      force.stop();
      // set the positions of links and nodes based on geo-coordinates
      link
        .transition()
        .duration(1000)
        .attr('x1', function (d) {
          return projection([d.source.longitude, d.source.latitude])[0];
        })
        .attr('y1', function (d) {
          return projection([d.sourcelongitude, d.source.latitude])[1];
        })
        .attr('x2', function (d) {
          return projection([d.target.longitude, d.target.latitude])[0];
        })
        .attr('y2', function (d) {
          return projection([d.target.longitude, d.target.latitude])[1];
        });

      node
        .transition()
        .duration(1000)
        .attr('cx', (d) => projection([d.longitude, d.latitude])[0])
        .attr('cy', (d) => projection([d.longitude, d.latitude])[1]);
      // set the map opacity to 1
      svg.selectAll('.world-map').style('opacity', 1);
    } else {
      // restart the simulation
      link
        .transition()
        .duration(600)
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      node
        .transition()
        .duration(600)
        .attr('cx', (d) => d.x)
        .attr('cy', (d) => d.y);

      force.restart();

      // set the map opacity to 0
      //hide map
      svg.selectAll('.world-map').style('opacity', 0);
    }
  }
});
