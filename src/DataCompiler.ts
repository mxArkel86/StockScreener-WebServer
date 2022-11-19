import { BalanceSheet, BalanceSheet_EMPTY, CashFlow, CashFlow_EMPTY, DocumentInfo, getBalanceSheet, getDate, getExcelJSON, getIdentifyingInformation, getIncomeStatement, IncomeStatement, IncomeStatement_EMPTY, PropertySet } from "./ExcelUtil";
import { CIKFromTicker, getSubmissionData, ReportInfo, saveExcelDoc } from "./FetchUtil";
import { createChart } from "./util/ChartUtil";
import { combinePropertySet, combineDataSets, evaluateExpression, getDictionaryKeys, getDictionaryValues } from "./util/DataUtil";
const fs = require("fs");

export type ReportDecodedData = {
    "Income-statement": IncomeStatement,
    "Balance-sheet": BalanceSheet,
    "Cash-flow": CashFlow
}

function insertExpressionVariables(expression:string, config_data:any, values:PropertySet) {
    var elems = getDictionaryValues(config_data["properties"]);
    for (var i in elems) {
        // console.log(JSON.stringify(values));
        // console.log(elems[i]["path"]);
        //if it is erroring here, it means the path is spelled wrong in the config
        expression = expression.replace(elems[i]["tag"], values[elems[i]["path"]].value.toString());
    }
    return expression;
}

export function chartRequest(ticker: string,  listdata: string[][]):Promise<any>[] {
    const cik = CIKFromTicker(ticker);

    var quarters = 12;

    var line_titles: string[] = listdata.map(x => x[0]);
    var colors: string[] = listdata.map(x => x[2]);
    var functions_: string[] = listdata.map(x => x[1])

    // console.log(`line_titles=${line_titles}   colors=${colors}    functions=${functions_}`);
    
    var y_vals: number[][] = [];

    const decoded_data = dataCompiler(cik, quarters);

    var x_vals = decoded_data.map(x => x[0]);

    for (var j in functions_) {
        var y_val_set:number[] = [];
        var func: string = functions_[j];
        
        for (var alldat of decoded_data) {
            var income_data: IncomeStatement = alldat[1]["Income-statement"];
            var balance_data: BalanceSheet = alldat[1]["Balance-sheet"];

            var income_config = JSON.parse(fs.readFileSync("configs/IncomeStatementIdentity.json"));
            var balance_config = JSON.parse(fs.readFileSync("configs/BalanceSheetIdentity.json"));

            var substituted_func: string = func;

            substituted_func = insertExpressionVariables(substituted_func, income_config, income_data);
        
            substituted_func = insertExpressionVariables(substituted_func, balance_config, balance_data);
            
            
            var y_val: number = evaluateExpression(substituted_func);

            y_val_set.push(y_val);
        }
        y_vals.push(y_val_set);
    }

    var promises: Promise<any>[] = [];
    for (var i in listdata) {
        var prom_ = createChart(x_vals, y_vals, line_titles, colors, 800, 600);
        promises.push(prom_);
    }
    return promises;
}

function getJSONBrief(cik: string, report: ReportInfo) {
    const year_path = saveExcelDoc(cik, report);
    const yearly_data = getExcelJSON(year_path);
    return yearly_data;
}

function getRemainderSet(cik:string, yearly:PropertySet, q1:PropertySet, q2:PropertySet, q3:PropertySet) {
    var out_data: PropertySet = yearly;

    const sub_func = (a: number, b: number) => {
        return a - b;
    };
    
    out_data = combinePropertySet(out_data, q1, sub_func);
    out_data = combinePropertySet(out_data, q2, sub_func);
    out_data = combinePropertySet(out_data, q3, sub_func);
    return out_data;
}


export function dataCompiler(cik: string, quarters:number): [string, ReportDecodedData][] {

    var submissionData: ReportInfo[] = getSubmissionData(cik, ["10-K", "10-Q"], quarters + 3);

    var out_data: [string, ReportDecodedData][] = [];

    for (var quarter = 0; quarter < quarters; quarter++) {
        const filepath = saveExcelDoc(cik, submissionData[quarter]);

        const json_data = getExcelJSON(filepath);
        const document_info: DocumentInfo = getIdentifyingInformation(json_data);
        const date = getDate(json_data);

        if (date[1].length == 0)
            throw "Date not fetched";

        //console.log(`--- path=[${filepath}] date=[${date}]`);

        var out_set: ReportDecodedData = {
            "Income-statement": IncomeStatement_EMPTY(),
            "Balance-sheet": BalanceSheet_EMPTY(),
            "Cash-flow": CashFlow_EMPTY()
        }
        
        out_set["Balance-sheet"] = getBalanceSheet(json_data);

        if (document_info.type == "10-Q") {
            out_set["Income-statement"] = getIncomeStatement(json_data);
        } else {
            // console.log(filepath);
            var q1_json = getJSONBrief(cik, submissionData[quarter + 1]);
            var q2_json = getJSONBrief(cik, submissionData[quarter + 2]);
            var q3_json = getJSONBrief(cik, submissionData[quarter + 3]);
            
            out_set["Income-statement"] = getRemainderSet(cik, getIncomeStatement(json_data),
                getIncomeStatement(q1_json),
                getIncomeStatement(q2_json),
                getIncomeStatement(q3_json)) as IncomeStatement;
                console.log(`yin=${getIncomeStatement(json_data).revenue.value}  q3=${getIncomeStatement(q1_json).revenue.value} q2=${getIncomeStatement(q2_json).revenue.value} q1=${getIncomeStatement(q3_json).revenue.value} yout=${out_set["Income-statement"].revenue.value}`);

        }

        out_data.push([date[1], out_set]);

        
    }
    return out_data.reverse();
}