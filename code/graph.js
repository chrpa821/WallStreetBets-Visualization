//TODO: radius legend, color coding?, list of top posts, keywords, links to posts, hover for info on circles, fix css, fix filter by score

//set the dimensions and margins of the graph
var margin = {top: 20, right: 20, bottom: 50, left: 50},
    width = 1000 - margin.left - margin.right,
    height = 420 - margin.top - margin.bottom;

// append the svg object to the body of the page
// var svg = d3.select("#my_dataviz")
//   .append("svg")
//     .attr("width", width + margin.left + margin.right)
//     .attr("height", height + margin.top + margin.bottom)
//   .append("g")
//     .attr("transform",
//           "translate(" + margin.left + "," + margin.top + ")");

// append the svg object to the body of the page
var svg = d3.select("#points")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")");
    
//Read the data
d3.csv("data/reddit_wsb.csv", function(data1){

  //var timeParse = d3.timeParse("%Y-%m-%d");
  var time = d3.timeParse("%Y-%m-%d %H:%M:%S");

  data1.forEach(function(d) {
    var date = d.timestamp;
    d.timestamp = time(date);
  });

  //sort by score
  data1 = data1.sort(function (a, b) {return +a.score - +b.score});

  //remove an outlier
  data1 = data1.filter(function(d){
      return d.timestamp > time("2020-09-30 00:00:00");
  });

  var data = data1;

  //filter by the score from the slider
  var data = data.filter(function(d) {
      return  d.score > parseInt(d3.select("#mySlider").node().value);
  });
  
  var maxScore = d3.max(data, function(d) { return +d.score });
  var maxComms = d3.max(data, function(d) { return +d.comms_num });

  //Tooltip
  var tooltip = d3.select("#tooltip");

  tooltip
    .select("#score")
    .text("Top Score: " + maxScore)

  // Add X axis --> it is a date format
  var x = d3.scaleTime()
    .domain(d3.extent(data, function(d) { return d.timestamp; }))
    .range([ 0, width ]);
  var xAxis = svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));

  // Add Y axis
  var y = d3.scaleLinear()
    .domain( [0, maxScore])
    .range([ height, 0 ]);
  var yAxis = svg.append("g")
    .call(d3.axisLeft(y));

  // Add a scale for bubble size
  var z = d3.scaleLinear()
    .domain([0, maxComms])
    .range([ 2, 40]);

  // Add a clipPath: everything out of this area won't be drawn.
  var clip = svg.append("defs").append("svg:clipPath")
    .attr("id", "clip")
    .append("svg:rect")
    .attr("width", width )
    .attr("height", height )
    .attr("x", 0)
    .attr("y", 0);

  // Add brushing
  var brush = d3.brushX()                 // Add the brush feature using the d3.brush function
    .extent( [ [0,0], [width,height] ] ) // initialise the brush area: start at 0,0 and finishes at width,height: it means I select the whole graph area
    .on("end", updateChart) // Each time the brush selection changes, trigger the 'updateChart' function

  // //Header
  // svg.append("text")
  //     .attr("x", (width / 2))             
  //     .attr("y", 0 - (margin.top / 2) + 20)
  //     .attr("text-anchor", "middle")  
  //     .style("font-size", "16px") 
  //     .style("text-decoration", "underline")  
  //     .text("Amount of Daily Posts on WallStreetBets");

  // Create the scatter variable: where both the circles and the brush take place
  var graph = svg.append('g')
    .attr("clip-path", "url(#clip)")

  //Initialize dots with group a
  var dots = graph
    .selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
        .attr("cx", function (d) { return x(d.timestamp); } )
        .attr("cy", function (d) { return y(d.score); } )
        .attr("r", function (d) { return z(d.comms_num); } )
        .style("fill", "green" )
        .style("opacity", 0.3)

  // Add the brushing
  graph
    .append("g")
      .attr("class", "brush")
      .call(brush);

  var dataFilter = data;

  // A function that update the chart
  function updateScore(selectedValue) {

    var threshold = parseInt(selectedValue);

    dataFilter = data1.filter(function(d) {
      return  d.score > threshold;
    });

    maxScore = d3.max(dataFilter, function(d) { return +d.score });
    
    tooltip
        .select("#score")
        .text("Top Score: " + maxScore)

    x.domain(d3.extent(dataFilter, function(d) { return d.timestamp; }));
    xAxis.transition().call(d3.axisBottom(x))

    y.domain([0, maxScore]);
    yAxis.transition().call(d3.axisLeft(y))    

    // update points with new data
    dots = graph.selectAll("circle")
          .data(dataFilter);

    // var enter = updateSelection.enter();
    // var exit = updateSelection.exit();
      
    //var exitSelection = updateSelection.exit().remove();

    dots
        .attr("cx", function (d) { return x(d.timestamp); } )
        .attr("cy", function (d) { return y(d.score); } )
        .attr("r", function (d) { return z(d.comms_num); } )
        .style("fill", "green")
        .style("opacity", 0.3);

    dots.enter()
        .append("circle")
          .attr("cx", function (d) { return x(d.timestamp); } )
          .attr("cy", function (d) { return y(d.score); } )
          .attr("r", function (d) { return z(d.comms_num); } )
          .style("fill", "green")
          .style("opacity", 0.3);

    dots.exit().remove();

    // var enterSelection = updateSelection.enter()
    //     .append("circle")
    //       .attr("cx", function (d) { return x(d.timestamp); } )
    //       .attr("cy", function (d) { return y(d.score); } )
    //       .attr("r", function (d) { return z(d.comms_num); } )
    //       .style("fill", "green")
    //       .style("opacity", 0.3);
       
  }

  // A function that set idleTimeOut to null
  var idleTimeout
  function idled() { idleTimeout = null; }

  // // A function that update the chart for given boundaries
  function updateChart() {

    var extent = d3.event.selection;

    // If no selection, back to initial coordinate. Otherwise, update X axis domain
    if(!extent){
      if (!idleTimeout) return idleTimeout = setTimeout(idled, 350); // This allows to wait a little bit
      x.domain(d3.extent(dataFilter, function(d) { return d.timestamp; }))
    }else{
      x.domain([ x.invert(extent[0]), x.invert(extent[1]) ])
      graph.select(".brush").call(brush.move, null) // This remove the grey brush area as soon as the selection has been done
    }

    // Update axis and line position
    xAxis.transition().duration(1000).call(d3.axisBottom(x))

    graph.selectAll("circle")
        .transition().duration(1000)
          .attr("cx", function(d) { return x(+d.timestamp) })
          .attr("cy", function(d) { return y(+d.score) })
          .attr("r", function (d) { return z(+d.comms_num); } )

  }

  // Slider
  d3.select("#mySlider").on("change", function(d){
    var selectedValue = this.value;
    updateScore(selectedValue);
  })
})