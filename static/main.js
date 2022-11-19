

let elemGrid = document.getElementById("elemGrid");
let gridCountSlider = document.getElementById("gridCountSlider");
let tickerText = document.getElementById("tickerText");

function tickerLoad() {
  elemGrid.innerHTML = "";
    
  const ticker = tickerText.value;
    
  fetchGraph(ticker, "Total Revenue", [
    ["Total Revenue", "TOT_REV", "#FF0000"]
  ]);

  fetchGraph(ticker, "Profit Percentages", [
    ["Gross Profit Percent", "GRS_INC/TOT_REV", "#FF0000"],
    ["Operating Profit Percent", "OPT_INC/TOT_REV", "#00FF00"],
    ["Net Profit Percent", "NET_INC/TOT_REV", "#0000FF"]
  ]);
  fetchGraph(ticker, "Total Balance Sheet", [
    ["Total Assets", "TOT_AST", "#FF0000"],
    ["Cash Assets", "CASH", "#0000FF"],
    ["Accounts Receivable", "ACC_REC", "#FF00FF"],
    ["Total Liabilities", "TOT_LIB", "#00FF00"]
  ]);
  fetchGraph(ticker, "Shares Count", [
    ["Shares", "N_SHARES", "#FF0000"]
  ])
}

elemGrid.style.gridTemplateColumns = `repeat(${Math.ceil((100-parseFloat(gridCountSlider.value)) * 6 / 100)}, 1fr)`;

gridCountSlider.oninput = function () {
  //min=1, max=6
  var count = Math.ceil((100-parseFloat(gridCountSlider.value)) * 6 / 100);
  elemGrid.style.gridTemplateColumns = `repeat(${count}, 1fr)`;
}
