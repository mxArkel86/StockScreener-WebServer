"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDictionaryKeys = exports.getDictionaryValues = exports.evaluateExpression = exports.cachePath = exports.setCache = exports.isCache = void 0;
var fs = require("fs");
var MathParser = require('expr-eval').Parser;
function isCache(filename) {
    var entries = fs.readdirSync(cachePath(""));
    if (entries.includes(filename))
        return true;
    else
        return false;
}
exports.isCache = isCache;
function setCache(filename, data) {
    fs.writeFileSync(cachePath(filename), data);
}
exports.setCache = setCache;
function cachePath(filename) {
    return "cache/" + filename;
}
exports.cachePath = cachePath;
function evaluateExpression(exp) {
    return MathParser.evaluate(exp);
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
//# sourceMappingURL=ProjectUtil.js.map