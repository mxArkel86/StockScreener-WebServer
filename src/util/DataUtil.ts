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

export function norm(val: string) {
    return val.toLowerCase().replace(/\([^\(]+\)/, "").replace(/[^A-z ]/, "").trim();
}

export function num_norm(val: string) {
    var str: string = val + "";
    return str.replace(/[^\d]/, "");
}

export function isNumeric(num:any){
    return !isNaN(num);
}

export function combineIncomeStatements(a:IncomeStatement, b:IncomeStatement, callback: (a: number, b:number) => number):IncomeStatement{
    var out_data: IncomeStatement = {
        "revenue": combineDataSets(a.revenue, b.revenue, callback),
        "gross_income": combineDataSets(a.gross_income, b.gross_income, callback),
        "net_income": combineDataSets(a.net_income, b.net_income, callback),
        "operating_income": combineDataSets(a.operating_income, b.operating_income, callback)
        
    }
    return out_data;
}

export function combineDataSets(a: DataSet, b: DataSet, callback: (a: number, b: number) => number):DataSet {
    var out_data: DataSet = {
        "value":callback(a.value, b.value)
    }
    return out_data;
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