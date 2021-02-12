const margin = {t: 50, r:50, b: 50, l: 50};
const size = {w: 800, h: 800};
const svg = d3.select('svg');

// defining a container group which will contain everything within the SVG
const containerG = svg.append('g').classed('container', true);

//global variables
let mapData, caseData, projection, bubblesG, radiusScale;

//global variable for zoomed state and calling zoom function defined at the bottom
let zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on('zoom', zoomed);

svg.call(zoom); 

// set up SVG
svg.attr('width', size.w)
    .attr('height', size.h);

// load data files while we begin to draw the map
Promise.all([
    d3.json('data/maps/us-states.geo.json'), //basemap
    d3.csv('data/covid_data.csv') //covid cases csv, cleaned by Yuriko
]).then(function (datasets) {
    mapData = datasets[0];
    caseData = datasets[1];

// --------- DRAW MAP ----------
// creating a group for map paths
let mapG = containerG.append('g').classed('map', true);

// defining a projection that we will use
projection = d3.geoAlbersUsa()
    .fitSize([size.w, size.h], mapData);
caseData = caseData.filter(d => projection([d.long, d.lat]) ); // applying projection

// defining a geoPath function we'll use to draw counties
let path = d3.geoPath(projection);

// adding county paths
mapG.selectAll('path')
    .data(mapData.features)
    .enter()
    .append('path')
    .attr('d', function(d) {
        return path(d);
    });

// --------- DRAW BUBBLES ----------

bubblesG = containerG.append('g').classed('bubbles', true); // defining "G" - group of bubbles as an object

radiusScale = d3.scaleSqrt() // using radius to encode no. of cases (data in our csv)
    .domain(d3.extent(caseData, d => +d.cases))
    .range([1, 20]); // unit?

    drawBubbles();

});

// --------- FUNCTION ZONE ----------

// Bubbles Function: map to variable of interest
function drawBubbles(zoomScale = 1) {
    let bubblesSelection = bubblesG.selectAll('circle')
        .data(caseData);

    // color scale for ze bubbles
    let colorScale = d3.scaleSequential()
        .domain(d3.extent(caseData, d => d.deaths))
        .interpolator(d3.interpolateOrRd);  // "Plasma", "Magma" etc. are ColorBrewer schemes: https://observablehq.com/@d3/color-schemes

    // tooltip for ze bubbles - map to html
    let tooltip = d3.select('div#map-tooltip');

    // drawing ze bubbles using join in place of enter/update/exit pattern
    bubblesSelection
        .join('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('transform', function(d) {
            return `translate(${projection([d.long, d.lat])})`; // translating lat and long to x-y coords on 2D canvas
        })
        .attr('r', d => radiusScale(+d.cases)/zoomScale) // adjusting for whatever scale is being viewed
        .style('fill', d => colorScale(d.deaths)) //using colorscale we made above
        // live tooltip
        .on('mouseover', (event, d) => {
            // adjusting display for the 'tip's formatting
            tooltip.style('display', 'block');

            // displaying info in the 'tip
            tooltip.select('div.name')
                .text(`${d.county}, ${d.state}`);
            tooltip.select('div.cases')
                .text(`Cases: ${d.cases}`);
            tooltip.select('div.deaths')
                .text(`Deaths: ${d.deaths}`);
            
            // setting the position of the tooltip to the location of event (hovering mouse) relative to page dimensions 
            tooltip.style('top', (event.pageY+1)+'px')
                .style('left', (event.pageX+1)+'px')
        })
        .on('mouseout', () => {
            // hide the tooltip when mouse moves out of the circle
            tooltip.style('display', 'none');
        });
}

// Zoom function
function zoomed(event) { 
        console.log('zoomed', event);
        // event.transform = (x: scaling on x, y: scaling on y, k: scaling on both}

        // 2x
        containerG.attr('transform', event.transform);
        containerG.attr('stroke-width', 1/event.transform.k); // make the strokes stay the same rather than doubling as we zoom

        drawBubbles(event.transform.k);
}
