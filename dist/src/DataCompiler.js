"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataCompiler = exports.chartRequest = void 0;
var ExcelUtil_1 = require("./ExcelUtil");
var FetchUtil_1 = require("./FetchUtil");
var ChartUtil_1 = require("./util/ChartUtil");
var DataUtil_1 = require("./util/DataUtil");
function chartRequest(ticker, listdata) {
    var cik = (0, FetchUtil_1.CIKFromTicker)(ticker);
    var line_titles = listdata.map(function (x) { return x[0]; });
    var colors = listdata.map(function (x) { return x[2]; });
    var functions_ = listdata.map(function (x) { return x[1]; });
    // console.log(`line_titles=${line_titles}   colors=${colors}    functions=${functions_}`);
    var y_vals = [];
    var decoded_data = dataCompiler(cik);
    var x_vals = decoded_data.map(function (x) { return x[0]; });
    for (var j in functions_) {
        var y_val_set = [];
        var func = functions_[j];
        for (var _i = 0, decoded_data_1 = decoded_data; _i < decoded_data_1.length; _i++) {
            var alldat = decoded_data_1[_i];
            var inc = alldat[1]["Income-statement"];
            var substituted_func = func
                .replace("TOT_REV", inc.revenue.value.toString())
                .replace("GRS_INC", inc.gross_income.value.toString())
                .replace("NET_INC", inc.net_income.value.toString())
                .replace("OPT_INC", inc.operating_income.value.toString());
            var y_val = (0, DataUtil_1.evaluateExpression)(substituted_func);
            y_val_set.push(y_val);
        }
        y_vals.push(y_val_set);
    }
    var promises = [];
    for (var i in listdata) {
        var prom_ = (0, ChartUtil_1.createChart)(x_vals, y_vals, line_titles, colors, 800, 600);
        promises.push(prom_);
    }
    return promises;
}
exports.chartRequest = chartRequest;
function getIncomeBrief(cik, report) {
    var year_path = (0, FetchUtil_1.saveExcelDoc)(cik, report);
    var yearly_data = (0, ExcelUtil_1.getExcelJSON)(year_path);
    var yearly_income = (0, ExcelUtil_1.getIncomeStatement)(yearly_data, report.form);
    return yearly_income;
}
function dataCompiler(cik) {
    var quarters = 16;
    var submissionData = (0, FetchUtil_1.getSubmissionData)(cik, ["10-K", "10-Q"], quarters + 3);
    var out_data = [];
    for (var quarter = 0; quarter < quarters; quarter++) {
        var filepath = (0, FetchUtil_1.saveExcelDoc)(cik, submissionData[quarter]);
        var json_data = (0, ExcelUtil_1.getExcelJSON)(filepath);
        var document_info = (0, ExcelUtil_1.getIdentifyingInformation)(json_data);
        var date = (0, ExcelUtil_1.getDate)(json_data);
        if (date[1].length == 0)
            throw "Date not fetched";
        var data = ExcelUtil_1.IncomeStatement_EMPTY;
        if (document_info.type == "10-Q") {
            data = (0, ExcelUtil_1.getIncomeStatement)(json_data, "10-Q");
        }
        else {
            // console.log(filepath);
            var yearly_income = (0, ExcelUtil_1.getIncomeStatement)(json_data, "10-K");
            var q3 = getIncomeBrief(cik, submissionData[quarter + 1]);
            var q2 = getIncomeBrief(cik, submissionData[quarter + 2]);
            var q1 = getIncomeBrief(cik, submissionData[quarter + 3]);
            var sub_func = function (a, b) {
                return a - b;
            };
            data = (0, DataUtil_1.combineIncomeStatements)(yearly_income, q3, sub_func);
            data = (0, DataUtil_1.combineIncomeStatements)(data, q2, sub_func);
            data = (0, DataUtil_1.combineIncomeStatements)(data, q1, sub_func);
            console.log("yin=".concat(yearly_income.revenue.value, "  q3=").concat(q3.revenue.value, " q2=").concat(q2.revenue.value, " q1=").concat(q1.revenue.value, " yout=").concat(data.revenue.value));
        }
        var entry = {
            "Income-statement": data
        };
        //console.log(`date=${date[1]}    ${entry["Income-statement"].revenue.three}`)
        out_data.push([date[1], entry]);
    }
    return out_data.reverse();
}
exports.dataCompiler = dataCompiler;
//# sourceMappingURL=DataCompiler.js.map