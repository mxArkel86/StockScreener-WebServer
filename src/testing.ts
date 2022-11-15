import { getDictionaryKeys } from "./util/DataUtil";
import { EXCEL_DATA, getExcelJSON, getIdentifyingInformation, getIncomeStatement } from "./ExcelUtil";

var json_data: EXCEL_DATA = getExcelJSON("cache/0001018724-20-000030.xlsx");

var data = getIncomeStatement(json_data, "10-Q");

console.log(data);
