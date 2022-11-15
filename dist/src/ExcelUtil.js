"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeToExcel = exports.getIncomeStatement = exports.getDate = exports.getIdentifyingInformation = exports.getExcelJSON = exports.IncomeStatement_EMPTY = exports.DataSet_EMPTY = void 0;
var DataUtil_1 = require("./util/DataUtil");
var xlsx = require("xlsx");
exports.DataSet_EMPTY = {
    "value": 0
};
exports.IncomeStatement_EMPTY = {
    "revenue": exports.DataSet_EMPTY,
    "operating_income": exports.DataSet_EMPTY,
    "gross_income": exports.DataSet_EMPTY,
    "net_income": exports.DataSet_EMPTY
};
/**
     * Parses raw json data into a structured object
     * @param {string} path
     * @returns {EXCEL_DATA}
     * */
function getExcelJSON(path) {
    var file = xlsx.readFile(path);
    var out_data = {};
    for (var _i = 0, _a = file.SheetNames; _i < _a.length; _i++) {
        var name = _a[_i];
        var json_data = xlsx.utils.sheet_to_json(file.Sheets[name]);
        // console.log("------------")
        // console.log(json_data);
        // console.log("============")
        if (json_data.length <= 1)
            continue;
        var header = (0, DataUtil_1.getDictionaryKeys)(json_data[1])[0];
        var title = (0, DataUtil_1.norm)(header.split('-')[0]);
        var measure = header.split('-')[1];
        out_data[title] = json_data;
    }
    return out_data;
}
exports.getExcelJSON = getExcelJSON;
/**
 * Get report information in the Excel spreadsheet
 * @param {EXCEL_DATA} data
 * @returns
 */
function getIdentifyingInformation(data) {
    var document_type_terms = ["document type"];
    var fiscal_year_terms = ["document fiscal year focus"];
    var fiscal_year_enddate_terms = ["company fiscal year end date", "document period end date"];
    var fiscal_period_terms = ["document fiscal period focus"];
    var json_data = getSheetAt(data, 0);
    var document_type = "";
    var fiscal_year_focus = -1;
    var fiscal_year_end_date = "";
    var fiscal_period_focus = "";
    for (var row in json_data) {
        var key_ = (0, DataUtil_1.norm)((0, DataUtil_1.getDictionaryValues)(json_data[row])[0]);
        var value_ = (0, DataUtil_1.getDictionaryValues)(json_data[row])[1];
        //console.log(key_);
        if (document_type_terms.includes(key_)) {
            document_type = value_;
        }
        else if (fiscal_year_terms.includes(key_)) {
            fiscal_year_focus = parseInt(value_);
        }
        else if (fiscal_year_enddate_terms.includes(key_)) {
            fiscal_year_end_date = value_.replace(/^--/, "").replace(/(?<=\d)-(?=\d)/, "/");
        }
        else if (fiscal_period_terms.includes(key_)) {
            fiscal_period_focus = value_;
        }
    }
    if ((0, DataUtil_1.anyAreInvalid)(document_type, fiscal_year_focus, fiscal_period_focus, fiscal_year_end_date)) {
        // console.log("----------");
        // console.log(document_type);
        // console.log(fiscal_year_focus);
        // console.log(fiscal_period_focus);
        // console.log(fiscal_year_end_date);
        // console.log("----------");
        throw "invalid value received";
    }
    return {
        "type": document_type,
        "year_focus": fiscal_year_focus,
        "quarter_focus": fiscal_period_focus,
        "year_end_date": fiscal_year_end_date
    };
}
exports.getIdentifyingInformation = getIdentifyingInformation;
/**
 * Gets the sheet at the index
 * @param {EXCEL_DATA} data
 * @param {number} index
 * @returns
 */
function getSheetAt(data, index) {
    var names = (0, DataUtil_1.getDictionaryKeys)(data);
    return data[names[0]];
}
/**
 * Gets the sheet with any of the given names
 * @param {EXCEL_DATA} data
 * @param {string[]} search_names
 * @returns
 */
function getSheetWithNames(data, search_names) {
    search_names = search_names.map(function (x) { return (0, DataUtil_1.norm)(x); });
    var sheet_names = (0, DataUtil_1.getDictionaryKeys)(data);
    for (var i in sheet_names) {
        var name = sheet_names[i];
        //console.log(norm(name));
        if (search_names.includes((0, DataUtil_1.norm)(name)))
            return (0, DataUtil_1.getDictionaryValues)(data)[i];
    }
    throw "no sheet found (find ".concat(console.log(search_names[0]), ")");
    return undefined;
}
function getDate(data) {
    var search_terms = ["document period end date"];
    var sheet_data = getSheetAt(data, 0);
    for (var _i = 0, sheet_data_1 = sheet_data; _i < sheet_data_1.length; _i++) {
        var row = sheet_data_1[_i];
        var key_ = (0, DataUtil_1.norm)((0, DataUtil_1.getDictionaryValues)(row)[0]);
        var value_ = (0, DataUtil_1.getDictionaryValues)(row)[1];
        if (search_terms.includes(key_)) {
            // console.log(value_);
            var cleanstring = value_.replace(/[\n\t\r]+/, "").replace(/[ ]+/, " ");
            var dateobj = new Date(cleanstring);
            return [dateobj, cleanstring];
        }
    }
    throw "no date found";
    return [new Date(0), ""];
}
exports.getDate = getDate;
function getIncomeStatement(data, doc_type) {
    console.log("----------------");
    var search_terms = ["consolidated condensed statements of income",
        "condensed consolidated statements of income",
        "consolidated statements of income", "income statements", "consolidated statements of operations",
        "condensed consolidated statements of operations"];
    var revenue_terms = ["revenue", "net revenue", "total net sales"];
    var gross_income_terms = ["gross margin"];
    var net_income_terms = ["net income"];
    var operating_income_terms = ["operating income"];
    var cost_of_sales_terms = ["cost of sales"];
    var cost_of_sales = exports.DataSet_EMPTY;
    var sheet_data = getSheetWithNames(data, search_terms);
    var data_out = {
        "revenue": exports.DataSet_EMPTY,
        "gross_income": exports.DataSet_EMPTY,
        "net_income": exports.DataSet_EMPTY,
        "operating_income": exports.DataSet_EMPTY,
    };
    for (var row in sheet_data) {
        var key_ = (0, DataUtil_1.norm)((0, DataUtil_1.getDictionaryValues)(sheet_data[row])[0]);
        var value_ = (0, DataUtil_1.getDictionaryValues)(sheet_data[row])[1];
        // const value_2: string = getDictionaryValues(sheet_data[row])[3];
        var num_value = 0;
        if ((0, DataUtil_1.isNumeric)(value_))
            num_value = parseInt((0, DataUtil_1.num_norm)(value_));
        // var num_value_2 = 0;
        // if (isNumeric(value_2))
        //     num_value_2 = parseInt(num_norm(value_2));
        if (doc_type == "10-K")
            console.log("key=[".concat(key_, "]  value=[").concat(value_, "]"));
        if (value_ == undefined || String(value_).replace(/[\s]+/, "").length == 0) {
            if ((0, DataUtil_1.norm)(key_).includes("share")) {
                console.log("BREAK=" + key_);
                break;
            }
        }
        var cumulative_data = {
            "value": num_value
        };
        if (revenue_terms.includes(key_)) {
            data_out["revenue"] = cumulative_data;
        }
        else if (gross_income_terms.includes(key_)) {
            data_out["gross_income"] = cumulative_data;
        }
        else if (net_income_terms.includes(key_)) {
            data_out["net_income"] = cumulative_data;
        }
        else if (operating_income_terms.includes(key_)) {
            data_out["operating_income"] = cumulative_data;
        }
        else if (cost_of_sales_terms.includes(key_)) {
            cost_of_sales = cumulative_data;
        }
    }
    if ((0, DataUtil_1.dataIsEmpty)(data_out["gross_income"]) && !(0, DataUtil_1.dataIsEmpty)(data_out["revenue"]) && !(0, DataUtil_1.dataIsEmpty)(cost_of_sales)) {
        data_out["gross_income"] = (0, DataUtil_1.combineDataSets)(data_out["revenue"], cost_of_sales, function (a, b) {
            return a - b;
        });
    }
    return data_out;
}
exports.getIncomeStatement = getIncomeStatement;
function writeToExcel(path, data) {
    var workbook = xlsx.utils.book_new();
    var worksheet = xlsx.utils.aoa_to_sheet(data);
    xlsx.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    xlsx.writeFileXLSX(workbook, path);
}
exports.writeToExcel = writeToExcel;
//# sourceMappingURL=ExcelUtil.js.map