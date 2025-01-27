//TODO: radius legend, list of top posts, fix css, add date offset in xaxis, circles should depend on area and not radius
// recalculate y axis domain after zooming in

//If time: stock correlation/causation

//================================================================================
// svg's and margins
//================================================================================

//set the dimensions and margins of the graph
var margin = {top: 20, right: 20, bottom: 50, left: 80},
    width = 1000 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

// append the svg object to the points div of the page
var svg = d3.select("#points")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .attr("class", "graph-svg-component")
  .append("g")
    .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")")

svg.append("rect")
  .attr("width", width)
  .attr("height", height)
  .attr("fill", "black")
  .style("opacity", 0.05)

//set the dimensions and margins of the graph
var margin_2 = {top: 20, right: 10, bottom: 50, left: 80},
    width_2 = 300 - margin_2.left - margin_2.right,
    height_2 = 500 - margin_2.top - margin_2.bottom;

var svg_lollipop = d3.select("#selection")
  .append("svg")
    .attr("width", width_2 + margin_2.left + margin_2.right)
    .attr("height", height_2 + margin_2.top + margin_2.bottom)
    .attr("class", "graph-svg-component")
    

  .append("g")
    .attr("transform",
          "translate(" + margin_2.left + "," + margin_2.top + ")")

var width_3 = 260,
  height_3 = 160;

var legend = d3.select("#size-legend")
  .append("svg").attr("width", width_3)
  .attr("height", height_3 )

//read the data
d3.csv("data/reddit_wsb.csv", function(data1){

  //================================================================================
  // Handle the dataset
  //================================================================================

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

  //LEGEND
  //The scale you use for bubble size
  var size = d3.scaleSqrt()
    .domain([1, maxComms])  // What's in the data, let's say it is percentage
    .range([2, 40])  // Size in pixel

  // Add legend: circles
  var valuesToShow = [100, 10000, 90000]
  var xCircle = 130
  var xLabel = 180
  var yCircle = 100

  legend
    .selectAll("legend")
    .data(valuesToShow)
    .enter()
    .append("circle")
      .attr("cx", xCircle)
      .attr("cy", function(d){ return yCircle - size(d) } )
      .attr("r", function(d){ return size(d) })
      .style("fill", "none")
      .attr("stroke", "green")

  // Add legend: segments
  legend
    .selectAll("legend")
    .data(valuesToShow)
    .enter()
    .append("line")
      .attr('x1', function(d){ return xCircle + size(d) } )
      .attr('x2', xLabel)
      .attr('y1', function(d){ return yCircle - size(d) } )
      .attr('y2', function(d){ return yCircle - size(d) } )
      .attr('stroke', 'black')
      .style('stroke-dasharray', ('2,2'))
  
  // Add legend: labels
  legend
    .selectAll("legend")
    .data(valuesToShow)
    .enter()
    .append("text")
      .attr('x', xLabel)
      .attr('y', function(d){ return yCircle - size(d) } )
      .text( function(d){ return d } )
      .style("font-size", 10)
      .attr('alignment-baseline', 'middle')

  //================================================================================
  // Bubble Graph
  //================================================================================

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
  svg.append("defs").append("svg:clipPath")
    .attr("id", "clip")
    .append("svg:rect")
    .attr("width", width )
    .attr("height", height )
    .attr("x", 0)
    .attr("y", 0);

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
      .text(d.title)
      .style("left", (d3.mouse(this)[0] ) + "px")
      .style("top", (d3.mouse(this)[1] +100) + "px")
  }
  var moveTooltip = function(d) {
    tooltip
      .style("left", (d3.mouse(this)[0]) + "px")
      .style("top", (d3.mouse(this)[1]+100) + "px")
  }
  var hideTooltip = function(d) {
    tooltip
      .transition()
      .style("opacity", 0)
  }

  var clickPost = function(d) {
    console.log("clicked");
    window.open(d.url , '_blank');
  }

  var areaBrush = d3.brush()            // Add the brush feature using the d3.brush function
    .extent( [ [0,0], [width,height] ] ) // initialise the brush area: start at 0,0 and finishes at width,height: it means I select the whole graph area
    .on("start brush", updateSelection)  // Each time the brush selection changes, trigger the 'updateSelection' function


  var dateBrush = d3.brushX()            // Add the brush feature using the d3.brush function
    .extent( [ [0,0], [width,height] ] ) // initialise the brush area: start at 0,0 and finishes at width,height: it means I select the whole graph area
    .on("end", updateDate)  // Each time the brush selection changes, trigger the 'updateSelection' function

  
  graph
    .append("g")
      .attr("class", "brush")
      .call(dateBrush)
  // .selectAll('rect')
  //   .attr('height', height);

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

  // Add the brushing
  //graph.call(areaBrush);
      
  var dataFilter = data;

  //================================================================================
  // Lollipop Graph
  //================================================================================

  var lollipop_data = [{
    word: "",
    occurences: 0
  },
  {
    word: "",
    occurences: 0
  },
  {
    word: "",
    occurences: 0
  },
  {
    word: "",
    occurences: 0
  },
  {
    word: "",
    occurences: 0
  }];

  var maxOcc = d3.max(lollipop_data, function(d) { return +d.occurences });
  console.log(typeof maxOcc);

  //Add X axis
  var x_2 = d3.scaleLinear()
  .domain([0, maxOcc])
  .range([ 0, width_2 - 20]);

  var xAxis_2 = svg_lollipop.append("g")
    .attr("transform", "translate(0," + (height_2) + ")")
    .call(d3.axisBottom(x_2))

  // text label for the X axis
  svg_lollipop.append("text")             
    .attr("transform",
          "translate(" + (width_2/2) + " ," + 
                         (height_2 + 40) + ")")
    .style("text-anchor", "middle")
    .text("Occurences");

  // Y axis
  var y_2 = d3.scaleBand()
    .range([ 0, height_2 ])
    .domain(lollipop_data.map(function(d) { return d.word; }))
    .padding(1);
  var yAxis_2 = svg_lollipop.append("g")
      .call(d3.axisLeft(y_2))

  // text label for the y axis
  svg_lollipop.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin_2.left )
    .attr("x",0 - (height_2 / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Keywords");

  //================================================================================
  // Update Functions for Bubble Graph
  //================================================================================

  // update the score after slider is changed
  function updateScore(selectedValue) {

    //remove brush selection
    graph.select(".brush").call(dateBrush.move, null) // This remove the grey brush area as soon as the selection has been done
    //graph.select(".brush").call(areaBrush.move, null) // This remove the grey brush area as soon as the selection has been done

    var score_threshold = parseInt(selectedValue);

    dataFilter = data1.filter(function(d) {
      return  d.score > score_threshold;
    });

    // d3.select("#mySlider2").property("value", comms);

    // dataFilter = dataFilter.filter(function(d) {
    //   return  d.comms_num > parseInt(comms);
    // });

    //maxScore = d3.max(dataFilter, function(d) { return +d.score });
    
    // tooltip
    //     .select("#score")
    //     .text("Top Score: " + maxScore)

    // x.domain(d3.extent(dataFilter, function(d) { return d.timestamp; }));
    // xAxis.transition().call(d3.axisBottom(x))

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
          .on("click", clickPost);

    
    dots.exit().remove();

  }

  // update the score after slider is changed
  function updateComms(selectedValue) {

    //remove brush selection
    graph.select(".brush").call(dateBrush.move, null) // This remove the grey brush area as soon as the selection has been done
    //graph.select(".brush").call(areaBrush.move, null) // This remove the grey brush area as soon as the selection has been done

    var threshold = parseInt(selectedValue);

    dataFilter = data1.filter(function(d) {
      return  d.comms_num > threshold;
    });

    // y.domain([-10000, maxScore+10000]);
    // yAxis.transition().call(d3.axisLeft(y))    

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
          .on("click", clickPost);

    
    dots.exit().remove();

  }

  // A function that set idleTimeOut to null
  var idleTimeout
  function idled() { idleTimeout = null; }

  // // A function that update the chart for given boundaries
  function updateDate() {
    console.log("updateDate")

    var extent = d3.event.selection;

    // If no selection, back to initial coordinate. Otherwise, update X axis domain 
    if(!extent){
      if (!idleTimeout) return idleTimeout = setTimeout(idled, 350); // This allows to wait a little bit
      x.domain(d3.extent(dataFilter, function(d) { return d.timestamp; }))
    }else{
      x.domain([ x.invert(extent[0]), x.invert(extent[1]) ])
      graph.select(".brush").call(dateBrush.move, null) // This remove the grey brush area as soon as the selection has been done
    }

    // Update axis and line position
    xAxis.transition().duration(1000).call(d3.axisBottom(x));

    dots = graph.selectAll("circle")
        .transition().duration(1000)
          .attr("cx", function(d) { return x(+d.timestamp) })
          .attr("cy", function(d) { return y(+d.score) })
          .attr("r", function (d) { return z(+d.comms_num); } )
  }

  var concatString = "";

  // Function that is triggered when brushing is performed
  function updateSelection() {

    var extent = d3.event.selection;

    //reset string
    concatString = "";

    svg.selectAll("circle").classed("selected", function(d){
      if(isBrushed(extent, x(+d.timestamp), y(+d.score))){
        if(d.body != null){
          concatString +=' ' + d.title.toString();
          return true;
        }
        else return true;
      }
    })

    concatString = concatString.replace(/[^a-zA-Z0-9 ]+/g, '');
    concatString = concatString.replace(/\d+|^\s+|\s+$/g,'');
    concatString = concatString.replace(/\W*\b\w{1,2}\b/g, ""); //remove words with less than 2 letters
    
    concatString = removeUselessWords(concatString);

    //find keywords in selection    
    lollipop_data = findKeywords(concatString, 12);

    updateLollipop();

  }

  //================================================================================
  // Functions for Lollipop Graph
  //================================================================================

  function findKeywords(string, amount) {

    var wordsArray = string.split(/\s/);
    var wordOccurrences = {};

    for (var i = 0; i < wordsArray.length; i++) {
        wordOccurrences['_'+wordsArray[i].toLowerCase()] = ( wordOccurrences['_'+wordsArray[i].toLowerCase()] || 0 ) + 1;
    }

    var result = Object.keys(wordOccurrences).reduce(function(acc, currentKey) {
        for (var i = 0; i < amount; i++) {
            if (!acc[i]) {
                acc[i] = { word: currentKey.slice(1, currentKey.length), occurences: wordOccurrences[currentKey] };
                break;
            } else if (acc[i].occurences < wordOccurrences[currentKey]) {
                acc.splice(i, 0, { word: currentKey.slice(1, currentKey.length), occurences: wordOccurrences[currentKey] });
                if (acc.length > amount)
                    acc.pop();
                break;
            }
        }
        return acc;
    }, []);

    return result;
  }

  function updateLollipop(){

    if(lollipop_data.length < 2) return;

    var maxOcc = d3.max(lollipop_data, function(d) { return +d.occurences });

    x_2 = d3.scaleLinear().domain([0, maxOcc])
      .range([ 0, width_2 - 20]);

    xAxis_2
      .attr("transform", "translate(0," + (height_2) + ")")
      .transition()
      .duration(1000)
      .call(d3.axisBottom(x_2))
      .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");

    // Y axis
    y_2.domain(lollipop_data.map(function(d) { return d.word; }));
    yAxis_2.transition().call(d3.axisLeft(y_2));

    // Lines
    var lines = svg_lollipop.selectAll(".myline")
      .data(lollipop_data);

    lines
      .enter()
      .append("line")
      .attr("class", "myline")
      .merge(lines)
      .transition()
      .duration(1000)
        .attr("x1", function(d) { return x_2(d.occurences); })
        .attr("x2", x_2(0))
        .attr("y1", function(d) { return y_2(d.word); })
        .attr("y2", function(d) { return y_2(d.word); })
        .attr("stroke", "grey")

    lines.exit().remove();


    // Circles
    var circles = svg_lollipop.selectAll(".lollipop")
      .data(lollipop_data);

    circles
      .enter()
      .append("circle")
      .attr("class", "lollipop")
      .merge(circles)
      .transition()
      .duration(1000)
        .attr("cx", function(d) { return x_2(d.occurences); })
        .attr("cy", function(d) { return y_2(d.word); })
        .attr("r", "7")
        .style("fill", "#69b3a2")
        .attr("stroke", "black")
    
    circles.exit().remove();

  }

  //================================================================================
  // Other Functions
  //================================================================================

  //https://stackoverflow.com/questions/49655135/javascript-regex-remove-multiple-words-from-string
  function removeUselessWords(txt) {
    var uselessWordsArray = 
        [
          "a", "at", "all", "be", "can", "cant", "could", "couldnt", 
          "do", "does", "how", "i", "in", "is", "many", "much", "of", 
          "on", "or", "should", "shouldnt", "so", "such", "the", 
          "them", "they", "this", "to", "us",  "we", "what", "who", "why", 
          "with", "wont", "would", "wouldnt", "you", "there", "went", "has", 
          "was", "when", "were", "are", "his", "get", "that", "for", "and", 
          "not", "from", "but", "its"
        ];
      
    var expStr = uselessWordsArray.join("|");
    return txt.replace(new RegExp('\\b(' + expStr + ')\\b', 'gi'), ' ')
                    .replace(/\s{2,}/g, ' ');
  }

  // A function that return TRUE or FALSE according if a dot is in the selection or not
  function isBrushed(brush_coords, cx, cy) {

    var x0 = brush_coords[0][0],
        x1 = brush_coords[1][0],
        y0 = brush_coords[0][1],
        y1 = brush_coords[1][1];

   return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;    // This return TRUE or FALSE depending on if the points is in the selected area
  }


  function changeBrush(){

    console.log(brushSelected);

    if(brushSelected == "AREA"){
      console.log("area brush");
      graph.selectAll(".brush").remove();
      graph.selectAll("circle").remove();

      graph.append("g")
        .attr("class", "brush")
        .call(areaBrush)

      dots = graph
        .selectAll("circle")
          .data(dataFilter)
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
    }
    else if (brushSelected == "DATE"){
      console.log("date brush");

      graph.selectAll(".brush").remove();
      graph.selectAll("circle").remove();

      graph.append("g")
        .attr("class", "brush")
        .call(dateBrush)

      dots = graph
        .selectAll("circle")
          .data(dataFilter)
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
    
    }
  }

  //================================================================================
  // Handle slider and radio button events
  //================================================================================

  // Slider for filter by upvotes
  d3.select("#mySlider").on("change", function(d){
    var selectedValue = this.value;
    updateScore(selectedValue);
  })

  // Slider for filter by comments
  d3.select("#mySlider2").on("change", function(d){
    var selectedValue = this.value;
    updateComms(selectedValue);
  })

  //return a string with selected brush
  var brushSelected = $('input[type=radio][name="brushSelector"]:checked').val();

  //detect change in brush type
  $(document).ready(function(){
    $('#form').change(function(){
      brushSelected = $('input[type=radio][name="brushSelector"]:checked').val();
      changeBrush();
    });
  });
})