//TODO: radius legend, color coding?, list of top posts, keywords, links to posts, fix css, add date offset in xaxis, circles should depend on area and not radius
// recalculate y axis domain after zooming in

//If time: stock correlation/causation

//set the dimensions and margins of the graph
var margin = {top: 20, right: 20, bottom: 50, left: 80},
    width = 1000 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

// append the svg object to the points div of the page
var svg = d3.select("#points")
  // .style("background-color", "#061f08")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")")

svg.append("rect")
  .attr("width", width)
  .attr("height", height)
  .attr("fill", "black")
  .style("opacity", 0.05)


//Read the data
d3.csv("data/reddit_wsb.csv", function(data1){

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
  data = data.filter(function(d) {
      return  d.score > parseInt(d3.select("#mySlider").node().value);
  });
  
  var maxScore = d3.max(data, function(d) { return +d.score });
  var maxComms = d3.max(data, function(d) { return +d.comms_num });

  // tooltip
  //   .select("#score")
  //   .text("Top Score: " + maxScore)

  //var legend = d3.select("#color-info").append("svg")

  //LEGEND
  // The scale you use for bubble size
  // var size = d3.scaleSqrt()
  //   .domain([1, maxComms])  // What's in the data, let's say it is percentage
  //   .range([2, 40])  // Size in pixel

  // Add legend: circles
  // var valuesToShow = [1, 10000, 80000]
  // var xCircle = 230
  // var xLabel = 280
  // var yCircle = 230

  // legend
  //   .selectAll("legend")
  //   .data(valuesToShow)
  //   .enter()
  //   .append("circle")
  //     .attr("cx", xCircle)
  //     .attr("cy", function(d){ return yCircle - size(d) } )
  //     .attr("r", function(d){ return size(d) })
  //     .style("fill", "none")
  //     .attr("stroke", "green")

  // Add legend: segments
  // legend
  // .selectAll("legend")
  // .data(valuesToShow)
  // .enter()
  // .append("line")
  //   .attr('x1', function(d){ return xCircle + size(d) } )
  //   .attr('x2', xLabel)
  //   .attr('y1', function(d){ return yCircle - size(d) } )
  //   .attr('y2', function(d){ return yCircle - size(d) } )
  //   .attr('stroke', 'black')
  //   .style('stroke-dasharray', ('2,2'))
  
  // Add legend: labels
  // legend
  //   .selectAll("legend")
  //   .data(valuesToShow)
  //   .enter()
  //   .append("text")
  //     .attr('x', xLabel)
  //     .attr('y', function(d){ return yCircle - size(d) } )
  //     .text( function(d){ return d } )
  //     .style("font-size", 10)
  //     .attr('alignment-baseline', 'middle')

  // Add X axis --> it is a date format
  var x = d3.scaleTime()
    .domain(d3.extent(data, function(d) { return d.timestamp; }))
    .range([ 0, width ]);
  var xAxis = svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));

  // text label for the X axis
  svg.append("text")             
      .attr("transform",
            "translate(" + (width/2) + " ," + 
                           (height + margin.top + 20) + ")")
      .style("text-anchor", "middle")
      .text("Date");

  // Add Y axis
  var y = d3.scaleLinear()
    .domain( [-10000, maxScore+10000])
    .range([ height, 0 ]);
  var yAxis = svg.append("g")
    .call(d3.axisLeft(y));

  // text label for the y axis
  svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left )
      .attr("x",0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Upvotes");
  
  // Add a scale for bubble size
  var z = d3.scaleLinear()
    .domain([1, maxComms])
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
  var brush = d3.brushX()                // Add the brush feature using the d3.brush function
    .extent( [ [0,0], [width,height] ] ) // initialise the brush area: start at 0,0 and finishes at width,height: it means I select the whole graph area
    .on("end", updateChart) // Each time the brush selection changes, trigger the 'updateChart' function

  // Create the scatter variable: where both the circles and the brush take place
  var graph = svg.append('g')
    .attr("clip-path", "url(#clip)")
  
  // -1- Create a tooltip div that is hidden by default:
  var tooltip = d3.select("#points")
    .append("div")
      .style("opacity", 0)
      .attr("class", "tooltip")
      .style("background-color", "gray")
      .style("border-radius", "5px")
      .style("padding", "10px")
      .style("color", "white")

  // -2- Create 3 functions to show / update (when mouse move but stay on same circle) / hide the tooltip
  var showTooltip = function(d) {
    tooltip
      .transition()
    tooltip
      .style("opacity", 1)
      .html(d.title)
      .style("left", (d3.mouse(this)[0]+30) + "px")
      .style("top", (d3.mouse(this)[1]+30) + "px")
  }
  var moveTooltip = function(d) {
    tooltip
      .style("left", (d3.mouse(this)[0]+30) + "px")
      .style("top", (d3.mouse(this)[1]+30) + "px")
  }
  var hideTooltip = function(d) {
    tooltip
      .transition()
      .style("opacity", 0)
  }

  var clickPost = function(d) {
    console.log("clicked");


  }

  // Add the brushing
  graph
    .append("g")
      .attr("class", "brush")
      .call(brush)
    .selectAll('rect')
      .attr('height', height);

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
      .on("mouseover", showTooltip )
      .on("mousemove", moveTooltip )
      .on("mouseleave", hideTooltip )
      .on("click", clickPost);
      
  var dataFilter = data;

  // A function that update the chart
  function updateScore(selectedValue) {

    var threshold = parseInt(selectedValue);

    dataFilter = data1.filter(function(d) {
      return  d.score > threshold;
    });

    maxScore = d3.max(dataFilter, function(d) { return +d.score });
    
    // tooltip
    //     .select("#score")
    //     .text("Top Score: " + maxScore)

    x.domain(d3.extent(dataFilter, function(d) { return d.timestamp; }));
    xAxis.transition().call(d3.axisBottom(x))

    y.domain([-10000, maxScore+10000]);
    yAxis.transition().call(d3.axisLeft(y))    

    // update points with new data
    dots = graph.selectAll("circle")
          .data(dataFilter);

    dots
        .attr("cx", function (d) { return x(d.timestamp); } )
        .attr("cy", function (d) { return y(d.score); } )
        .attr("r", function (d) { return z(d.comms_num); } )

    dots.enter()
        .append("circle")
          .attr("cx", function (d) { return x(d.timestamp); } )
          .attr("cy", function (d) { return y(d.score); } )
          .attr("r", function (d) { return z(d.comms_num); } )
          .style("fill", "green")
          .style("opacity", 0.3)
          .on("mouseover", showTooltip )
          .on("mousemove", moveTooltip )
          .on("mouseleave", hideTooltip )
    
    dots.exit().remove();
       
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
    xAxis.transition().duration(1000).call(d3.axisBottom(x));

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