import { DataSet } from "FinancialStatementParser";
import { type } from "os";

const MathParser = require('expr-eval').Parser;

export function evaluateExpression(exp: string) {
    try {
        return MathParser.evaluate(exp);
    } catch (e) {
        console.log("EXP=" + exp);
    }
}

export function getDictionaryValues(dict_: any) {
    if (dict_ == null)
        return [];
    var values = Object.keys(dict_).map(function(key){
        return dict_[key];
    });
    return values;
}
export function getDictionaryKeys(dict_: any) {
    if (dict_ == null)
        return [];
    return Object.keys(dict_);
}

export function valueInSearchTerms(search_terms: string[], val: string) {
    return (search_terms.map(x => norm(x)).includes(norm(val)));
}

export function norm(val: string) {
    return val.toLowerCase().replace(/[^A-z ]/g, "").replace(/[ ]+/g, " ").trim();
}

export function num_norm(val: string) {
    var str: string = val + "";
    return str.replace(/[^\d-\.]/g, "");
}

export function isNumeric(num:any){
    return !isNaN(num);
}

export function isEmptyString(str: string) {
    return str.replace(/[\s]*/g, "").length == 0;
}

export function combinePropertySet(a: { [val: string]: DataSet }, b: { [val: string]: DataSet }, callback: (a: number|undefined, b: number|undefined) => number|undefined): { [val: string]: DataSet }{
    var data_out: { [val: string]: DataSet } = {};
    for (var prop in b) {
        var data = combineDataSets(a[prop], b[prop], callback);
        data_out[prop] = data;
        
    }

    return data_out;
}

export function combineDataSets(a: DataSet, b: DataSet, callback: (a: number|undefined, b: number|undefined) => number|undefined):DataSet {
    var get_invalid:()=>DataSet = () =>  {
        return {
            "value": 0,
            "is_set": false
        }
    };
    
    var output = callback(a.is_set ? a.value : undefined, b.is_set ? b.value : undefined);
    if(output!=undefined){
        return {
            "value": output!,
            "is_set": true
        }
    } else {
        return {
            "value": 0,
            "is_set": false
        }
    }
}

export function EXC_OR(a:number | undefined, b:number | undefined): number|undefined {
    if(a == undefined && b != undefined) {
        return b!;
    } else if (a != undefined && b == undefined) {
        return a!;
    } else if (a != undefined || b != undefined) {
        throw "both gave a value";
    } else {
        return undefined;
    }
};

export function onValid(funcin: (a: number, b: number) => number):
    ((a: number | undefined, b: number | undefined) => number|undefined) {
    var newfunc = (a: number | undefined, b: number | undefined) => {
        if (a != undefined && b != undefined) {
            return funcin(a!, b!);
        } else {
            return undefined;
        }
    };
    return newfunc;
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