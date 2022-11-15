function fetchGraph(ticker, title, indata) {

  var newdata = encodeURIComponent(JSON.stringify(indata));
    fetch(`getGraph.json?ticker=${ticker}&data=${newdata}`).then(response=>response.blob()).then((blob)=>{
    
      var container = document.createElement("div");

      var element = document.createElement("img");
      element.className = "chart-img";

      var label = document.createElement("label");
      label.className = "chart-label";

      label.innerText = title;
      
      element.src = URL.createObjectURL(blob);
  

      container.appendChild(label);
      container.appendChild(element);
      elemGrid.appendChild(container);
  
    });
  }