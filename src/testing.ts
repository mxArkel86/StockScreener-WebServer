// import { getDictionaryKeys } from "./util/DataUtil";
// import { EXCEL_DATA, getExcelJSON } from "./util/ExcelUtil";
// import { getIncomeStatement } from "./FinancialStatementParser";

import { offsetDate } from "./util/DataUtil";
import { date_range, getFormattedStockPriceData, getStockPriceHistory } from "./net/YahooFinanceFetch";
import { chartHybrid } from "./DataCompiler";

// var json_data: EXCEL_DATA = getExcelJSON("cache/0001018724-20-000030.xlsx");

// var data = getIncomeStatement(json_data, "10-Q");

// console.log(data);
var data = chartHybrid("AAPL", 1, date_range.day, ["STOCK/TOT_REV"]);
console.log("--------------");
