"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.anyAreInvalid = exports.dataIsEmpty = exports.combineDataSets = exports.combineIncomeStatements = exports.isNumeric = exports.num_norm = exports.norm = exports.getDictionaryKeys = exports.getDictionaryValues = exports.evaluateExpression = void 0;
var MathParser = require('expr-eval').Parser;
function evaluateExpression(exp) {
    try {
        return MathParser.evaluate(exp);
    }
    catch (e) {
        console.log("EXP=" + exp);
    }
}
exports.evaluateExpression = evaluateExpression;
function getDictionaryValues(dict_) {
    var values = Object.keys(dict_).map(function (key) {
        return dict_[key];
    });
    return values;
}
exports.getDictionaryValues = getDictionaryValues;
function getDictionaryKeys(dict_) {
    return Object.keys(dict_);
}
exports.getDictionaryKeys = getDictionaryKeys;
function norm(val) {
    return val.toLowerCase().replace(/\([^\(]+\)/, "").replace(/[^A-z ]/, "").trim();
}
exports.norm = norm;
function num_norm(val) {
    var str = val + "";
    return str.replace(/[^\d]/, "");
}
exports.num_norm = num_norm;
function isNumeric(num) {
    return !isNaN(num);
}
exports.isNumeric = isNumeric;
function combineIncomeStatements(a, b, callback) {
    var out_data = {
        "revenue": combineDataSets(a.revenue, b.revenue, callback),
        "gross_income": combineDataSets(a.gross_income, b.gross_income, callback),
        "net_income": combineDataSets(a.net_income, b.net_income, callback),
        "operating_income": combineDataSets(a.operating_income, b.operating_income, callback)
    };
    return out_data;
}
exports.combineIncomeStatements = combineIncomeStatements;
function combineDataSets(a, b, callback) {
    var out_data = {
        "value": callback(a.value, b.value)
    };
    return out_data;
}
exports.combineDataSets = combineDataSets;
function dataIsEmpty(a) {
    if (a.value == 0)
        return true;
    return false;
}
exports.dataIsEmpty = dataIsEmpty;
function anyAreInvalid() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    for (var _a = 0, args_1 = args; _a < args_1.length; _a++) {
        var value = args_1[_a];
        if (typeof (value) == 'string') {
            var str = value;
            if (!str || str.length == 0) {
                return true;
            }
        }
        else if (typeof (value) == 'number') {
            var num = value;
            if (num == -1) {
                return true;
            }
        }
    }
    return false;
}
exports.anyAreInvalid = anyAreInvalid;
//# sourceMappingURL=DataUtil.js.map