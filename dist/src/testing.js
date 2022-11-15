"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ExcelUtil_1 = require("./ExcelUtil");
var json_data = (0, ExcelUtil_1.getExcelJSON)("cache/0001018724-20-000030.xlsx");
var data = (0, ExcelUtil_1.getIncomeStatement)(json_data, "10-Q");
console.log(data);
//# sourceMappingURL=testing.js.map