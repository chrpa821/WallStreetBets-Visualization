//set the dimensions and margins of the graph
var margin = {top: 20, right: 20, bottom: 50, left: 50},
    width = 1000 - margin.left - margin.right,
    height = 420 - margin.top - margin.bottom;

// append the svg object to the body of the page
var svg = d3.select("#my_dataviz")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")");
    
//Read the data
d3.csv("data/reddit_wsb.csv", function(data1){

  var timeParse = d3.timeParse("%Y-%m-%d");

  data1.forEach(function(d) {
      var date = d.timestamp.split(" ");
      d.timestamp = timeParse(date[0]);
  });

  //remove an outlier
  data1 = data1.filter(function(d){
      return d.timestamp > timeParse("2020-09-29");
  });

  data1 = data1.sort(function (a, b) {return +a.timestamp - +b.timestamp});

  var countObj = {};

  data = data1;

  var data = data.filter(function(d) {
      return  d.score > parseInt(d3.select("#buttonXlim").node().value);
  });

  // count how much each city occurs in list and store in countObj
  data.forEach(function(d) {
    var date = d.timestamp;
    if(countObj[date] === undefined) {
        countObj[date] = 0;
    } else {
        countObj[date] = countObj[date] + 1;
    }
  });

  // now store the count in each data member
  data.forEach(function(d) {
      var date = d.timestamp;
      d.count = countObj[date];
  });
  
  var maxScore = d3.max(data, function(d) { return +d.score });
  var maxPosts = d3.max(data, function(d) { return +d.count });

  console.log("Maxposts: " + maxPosts);

  //Tooltip
  var tooltip = d3.select("#tooltip");

  tooltip
    .select("#posts")
    .text("Max Posts Per day: " + maxPosts)

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
    .domain( [0, maxPosts])
    .range([ height, 0 ]);
  var yAxis = svg.append("g")
    .call(d3.axisLeft(y));

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

  // Initialize line with group a
  graph
    .append('g')
    .append("path")
    .attr("class", "chart")
      .datum(data)
      .attr("d", d3.line()
        .x(function(d) { return x(+d.timestamp) })
        .y(function(d) { return y(countObj[d.timestamp]) })
      )
      .attr("stroke", "#69b3a2")
      .style("stroke-width", 2)
      .style("fill", "none")

  // Add the brushing
  graph
    .append("g")
      .attr("class", "brush")
      .call(brush);




  //Initialize dots with group a
  //   var dot = svg
  //     .selectAll('circle')
  //     .data(data)
  //     .enter()
  //     .append('circle')
  //       .attr("cx", function(d) { return x(+d.timestamp) })
  //       .attr("cy", function(d) { return y(+countObj[d.timestamp]) })
  //       .attr("r", 4)
  //       .style("fill", "#69b3a2")

  //Add tooltip

  //var tooltip = d3.select("#tooltip")



  

  var dataFilter = data;

  // A function that update the chart
  function update() {

    var threshold = parseInt(this.value);

    dataFilter = data1.filter(function(d) {
      return  d.score > threshold;
    });
    
    // define count object that holds count for each date
    var countObj = {};

    // count how much each city occurs in list and store in countObj
    dataFilter.forEach(function(d) {
      var date = d.timestamp;
      if(countObj[date] === undefined) {
          countObj[date] = 0;
      } else {
          countObj[date] = countObj[date] + 1;
      }
    });

    // now store the count in each data member
    dataFilter.forEach(function(d) {
        var date = d.timestamp;
        d.count = countObj[date];
    });

    var maxScore = d3.max(dataFilter, function(d) { return +d.score });
    var maxPosts = d3.max(dataFilter, function (d) { return +d.count;});

    tooltip
        .select("#posts")
        .text("Max Posts Per Day: " + maxPosts)
    
    tooltip
        .select("#score")
        .text("Top Score: " + maxScore)

    x.domain(d3.extent(dataFilter, function(d) { return d.timestamp; }));
    xAxis.transition().call(d3.axisBottom(x))

    y.domain([0, maxPosts]);
    yAxis.transition().call(d3.axisLeft(y))

    // Give these new data to update line
    graph.select("path.chart")
        .datum(dataFilter)
        .attr("d", d3.line()
          .x(function(d) { return x(+d.timestamp) })
          .y(function(d) { return y(+countObj[d.timestamp]) })
        )

    // dot.selectAll('circle')
    //     .data(dataFilter)
    //     .enter()
    //     .append('circle')
    //         .attr("cx", function(d) { return x(+d.timestamp) })
    //         .attr("cy", function(d) { return y(+countObj[d.timestamp]) })


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

    graph.select(".chart")
        .datum(dataFilter)
        .transition().duration(1000)
        .attr("d", d3.line()
          .x(function(d) { return x(+d.timestamp) })
          .y(function(d) { return y(+countObj[d.timestamp]) })
        )
      
  }

  // Add an event listener to the button created in the html part
  d3.select("#buttonXlim").on("input", update );
})