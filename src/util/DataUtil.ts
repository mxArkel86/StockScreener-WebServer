import { IncomeStatement, DataSet } from "ExcelUtil";
import { type } from "os";

const MathParser = require('expr-eval').Parser;

export function evaluateExpression(exp: string) {
    try {
        return MathParser.evaluate(exp);
    } catch (e) {
        console.log("EXP=" + exp);
    }
}

export function getDictionaryValues(dict_:any){
    var values = Object.keys(dict_).map(function(key){
        return dict_[key];
    });
    return values;
}
export function getDictionaryKeys(dict_: any) {
    return Object.keys(dict_);
}

export function valueInSearchTerms(search_terms: string[], val: string) {
    return (search_terms.map(x => norm(x)).includes(norm(val)));
}

export function norm(val: string) {
    return val.toLowerCase().replace(/[^A-z ]/, "").replace(/[ ]+/, " ").trim();
}

export function num_norm(val: string) {
    var str: string = val + "";
    return str.replace(/[^\d-\.]/, "");
}

export function isNumeric(num:any){
    return !isNaN(num);
}

export function combinePropertySet(a: { [val: string]: DataSet }, b: { [val: string]: DataSet }, callback: (a: number, b: number) => number): { [val: string]: DataSet }{
    var data_out: { [val: string]: DataSet } = {};
    for (var prop in b) {
        if (a[prop] == null || b[prop] == null)
            continue;
        
        var data = combineDataSets(a[prop], b[prop], callback);
        data_out[prop] = data;
        
    }

    return data_out;
}

export function combineDataSets(a: DataSet, b: DataSet, callback: (a: number, b: number) => number):DataSet {
    if (a.is_set && b.is_set) {
        var out_data: DataSet = {
            "value": callback(a.value, b.value),
            "is_set": true
        }
        return out_data;
    } else {
        var out_data: DataSet = {
            "value": 0,
            "is_set": false
        }
        return out_data;
    }
}

export function dataIsEmpty(a: DataSet) {
    if (a.value==0)
        return true;
    return false;
}

export function anyAreInvalid(...args:(string|number)[]) {
    for (var value of args) {
        if (typeof (value) == 'string') {
            var str: string = <string>value;
            if (!str ||str.length == 0) {
                return true;
            }
        } else if (typeof (value) == 'number') {
            var num: number = <number>value;
            if (num == -1) {
                return true;
            }
        }
        
    }
    return false;
}