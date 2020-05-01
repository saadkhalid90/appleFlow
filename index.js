// geo parameters
const projection = d3.geoMercator()
    .center([75, 32])
    .scale([150 * 12]);

const path = d3.geoPath().projection(projection);

// get the SVG selection
const svg = d3.select('svg.mapSVG');

// define title and sub-title group
const titlesGrp = svg.append('g').attr('class', 'titlesGrp')

const radScale = d3.scaleSqrt()
                  .range([0, 24]);

const fSScale = d3.scaleLinear()
                  .range([6, 18]);

const sWScale = d3.scaleLinear()
                  .range([1, 12]);

const colScale = d3.scaleOrdinal()
        .domain([
          'Punjab',
          'KP',
          'Sindh',
          'Balochistan',
          'ICT'
        ])
        .range([
          '#a6cee3',
          '#1f78b4',
          '#b2df8a',
          '#33a02c',
          '#fb9a99'
        ]);

const cPScale = d3.scaleOrdinal()
        .domain([
          'Punjab',
          'KP',
          'Sindh',
          'Balochistan',
          'ICT',
          'Int'
        ])
        .range([
          [350, 290],
          [345, 240],
          [285, 430],
          [245, 320],
          [365, 250],
          [220, 250]
        ]);

const bubOffset = 0.4;

const lineGenerator = d3.line()
	.curve(d3.curveCardinal);

let title = titlesGrp.append('text')
                .attr('class', 'mainTitle')
                .attr('x', 10)
                .attr('y', 16)
                .text(`Market flow of Apples`)
                .style('font-family', "Roboto Condensed', sans-serif")
                .style('font-weight', 400)
                .style('font-size', '18px')


let sub_title = titlesGrp.append('text')
                .attr('class', 'subTitle')
                .attr('x', 10)
                .attr('y', 32)
                .text('District Quetta, Killa Abdullah, Killah Saifullah, Kalat and Pishin')
                .style('font-family', "Roboto Condensed', sans-serif")
                .style('font-weight', 300)
                .style('font-size', '12px')


async function readAndDraw(){
  let PakGeo = await d3.json('PakCons.topojson');
  let AppleVCGeo = await d3.json('AppleVCDists.topojson');
  let AppleFlow = (await d3.csv('ApplesFlow.csv')).filter(d => ['Local', 'International'].includes(d.Category));

  const marketedPerc = AppleFlow.map(d => +d.percMarketed);
  const marketedPercMin = d3.min(marketedPerc);
  const marketedPercMax = d3.max(marketedPerc);

  radScale.domain([0, marketedPercMax]);
  fSScale.domain([marketedPercMin, marketedPercMax]);
  sWScale.domain([marketedPercMin, marketedPercMax]);
  // define the simulation
  let simulation = d3.forceSimulation(AppleFlow)
      .force("x", d3.forceX(function(d) { return projection( [+d.Lon, +d.Lat] )[0]; }).strength(1))
      .force("y", d3.forceY(function(d) { return projection( [+d.Lon, +d.Lat] )[1]; }).strength(0.2))
      // .force('charge', d3.forceManyBody().strength(0.5))
      .force("collision", d3.forceCollide().radius(d => radScale(+d['percMarketed']) + bubOffset /*+ centuryScale(getHCUnits(d, false))*/))
      .stop();

  // let the simulation run
  for (var i = 0; i < 5000; ++i) simulation.tick();

  // define svg groups to hold map paths
  const pakMapGrp = svg.append('g').attr('class', 'pakMapGrp');
  const appDistMapGrp = svg.append('g').attr('class', 'appDistMapGrp');

  // draw a consolidated map of Pakistan (in pakMapGrp group)
  drawBaseMap(
    //geodata params
    {
      data: PakGeo,
      dataName: 'PakCons'
    },
    // selection
    pakMapGrp,
    // attributes object
    {
      class: 'Pakistan Map',
      d: d => path(d)
    },
    // styles object
    {
      fill: '#eeeeee',

    },
    d => true
  );

  // draw the five apple districts of interest
  drawBaseMap(
    //geodata params
    {
      data: AppleVCGeo,
      dataName: 'AppleVCDists'
    },
    // selection
    appDistMapGrp,
    // attributes object
    {
      class: 'VCDist',
      d: d => path(d)
    },
    // styles object
    {
      fill: '#FFEB3B',
      stroke: 'grey',
      'stroke-width': '1px',
      'stroke-opacity': 0.2
    },
    d => true
  );

  const centerCoords = [240, 325];

  const cityGrps = svg.selectAll('g.cityGrp')
    .data(AppleFlow)
    .enter()
    .append('g')
    .attr('class', d => 'cityGrp ' + d.Market);

  // append flow lines
  cityGrps
    .append('path')
    .classed('flowLine', true)
    .attr('d', d => {
      // const xMid = ((centerCoords[0] +d.x)/2);
      // const xMidOff =
      return lineGenerator([
        centerCoords,
        cPScale(d.Province),
        [d.x, d.y]
      ]);
    })
    .styles({
      stroke: d => colScale(d.Province),
      'stroke-opacity': 0.35,
      'fill': 'none',
      'stroke-width': d => sWScale(d.percMarketed),
      'stroke-linecap': 'round'
    });

  // append circle for cities
  cityGrps
    .append('circle')
    .classed('cityVols', true)
    // .attr('cx', d => projection([+d.Lon, +d.Lat])[0])
    // .attr('cy', d => projection([+d.Lon, +d.Lat])[1])
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)
    .attr('r', d => `${radScale(+d.percMarketed)}`)
    .styles({
      fill: d => colScale(d.Province),
      'fill-opacity': 0.8,
      stroke: 'grey',
      'stroke-opacity': 0.0
    });

  // append text labels
  cityGrps
    .append('text')
    .classed('cityLabel', true)
    .attr('x', d => d.x)
    .attr('y', d => d.y + (fSScale(d.percMarketed)/4))
    .attr('dy', d => d.Province == 'Int' ? - 10 : 0)
    .text(d => d.Market)
    .styles({
      fill: 'black',
      'font-size': d => d.Province == 'Int' ? '8px' : `${fSScale(d.percMarketed)}px`,
      'text-anchor': 'middle',
      'font-weight': 300

    });

    makeNestCircLegend(CSSSelect = 'svg', [500, 500], [1, 5, 10], radScale, 'Apple Marketed (Percent)');

    // interaction

    svg.selectAll('g.cityGrp').on('mouseover', mouseO(true, 100));
    svg.selectAll('g.cityGrp').on('mouseout', mouseO(false, 100));

    function mouseO(over, transDur){
      return function(d, i){
        const hoveredGroup = d3.select(this);
        const datum = hoveredGroup.datum();
        const market = datum.Market;

        console.log(market);
        const filt = svg.selectAll('g.cityGrp')
                        .filter(d => d.Market == market);
        const unFilt = svg.selectAll('g.cityGrp')
                        .filter(d => d.Market != market);

        // append a basic tooltip title
        if (over){
          hoveredGroup.append('title').text(d => `${d.Market} - ${round2Dec(d.percMarketed, 1)}%`);
        }
        else {
          hoveredGroup.select('title').remove();
        }

        // make the flowLine more opaque for hovered city
        filt.select('path.flowLine')
          .transition()
          .duration(transDur)
          .style('stroke-opacity', d => over ? 0.7 : 0.35);

        // make everything fade out for unselected cities
        unFilt.select('circle.cityVols')
          .transition()
          .duration(transDur)
          .style('fill-opacity', d => over ? 0.2 : 0.8);
        unFilt.select('path.flowLine')
          .transition()
          .duration(transDur)
          .style('stroke-opacity', d => over ? 0.2 : 0.35);

        unFilt.select('text.cityLabel')
          .transition()
          .duration(transDur)
          .style('fill-opacity', d => over ? 0.2 : 1);
      }
    }

}

readAndDraw();

function drawBaseMap(geoData, selection, attrsObj, stylesObj, filterFunc){
    // use topojson to get features of the geoData
    const geoDataArr = topojson.feature(geoData.data, geoData.data.objects[geoData.dataName]).features
                      .filter(filterFunc);


    // use the features to draw the map
    selection.selectAll('path')
          .data(geoDataArr)
          .enter()
          .append('path')
          .attrs(attrsObj)
          .styles(stylesObj);
}

function makeNestCircLegend(CSSSelect = 'svg', transformArray, bubArray, bubScale, legendTitle){
  // appending a legendgroup
  let legendGroup = d3.select('svg')
                   .append('g')
                   .classed('legendGroup', true)
                   .attr('transform', `translate(${transformArray[0]}, ${transformArray[1]})`)

  console.log(legendGroup);

  legendGroup.append('text')
           .text(legendTitle)
           .classed('legendTitle', true)
           .attr('dy', 60)
           .style('font-size', '12px')
           .style('text-anchor', 'middle')
           .style('fill', 'black')
           .style('font-family', "'Roboto Condensed', sans-serif")
           .style('font-weight', 300);

  let radius = bubScale(d3.max(bubArray));
  // hard code params such as Padding and font size for now
  let legLabelPadding = 5;
  let legLabFontSize = 8;

  const circGroups = legendGroup.selectAll('circle')
           .data(bubArray)
           .enter()
           .append('g')
           .classed('circLegendGroup', true)
           .attr('transform', d => `translate(0, ${radius - radScale(d)})`);

  circGroups.append('circle')
           .attr('r', d => radScale(d))
           .style('stroke', 'black')
           .style('fill', 'none')
           .style('stroke-width', '1px');

  circGroups.append('text')
           .text(d => d)
           .attr('dx', radius + legLabelPadding)
           .attr('dy', d => -(radScale(d) - legLabFontSize/2))
           .style('fill', 'black')
           .style('font-size', `${legLabFontSize}px`)
           .style('font-family', "'Roboto Condensed', sans-serif")
}

function round2Dec(number, decimal){
  return Math.round(number * (10**decimal))/(10**decimal)
}
