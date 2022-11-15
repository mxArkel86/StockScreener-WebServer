import { DocumentInfo, getDate, getExcelJSON, getIdentifyingInformation, getIncomeStatement, IncomeStatement, IncomeStatement_EMPTY } from "./ExcelUtil";
import { CIKFromTicker, getSubmissionData, ReportInfo, saveExcelDoc } from "./FetchUtil";
import { createChart } from "./util/ChartUtil";
import { combineIncomeStatements, evaluateExpression } from "./util/DataUtil";

export type ReportDecodedData = {
    "Income-statement":IncomeStatement
}

export function chartRequest(ticker: string,  listdata: string[][]):Promise<any>[] {
    const cik = CIKFromTicker(ticker);

    var line_titles: string[] = listdata.map(x => x[0]);
    var colors: string[] = listdata.map(x => x[2]);
    var functions_: string[] = listdata.map(x => x[1])

    // console.log(`line_titles=${line_titles}   colors=${colors}    functions=${functions_}`);
    
    var y_vals: number[][] = [];

    const decoded_data = dataCompiler(cik);

    var x_vals = decoded_data.map(x => x[0]);

    for (var j in functions_) {
        var y_val_set:number[] = [];
        var func: string = functions_[j];
        
        for (var alldat of decoded_data) {
            var inc: IncomeStatement = alldat[1]["Income-statement"];

            var substituted_func: string = func
                .replace("TOT_REV", inc.revenue.value.toString())
                .replace("GRS_INC", inc.gross_income.value.toString())
                .replace("NET_INC", inc.net_income.value.toString())
                .replace("OPT_INC", inc.operating_income.value.toString());
        
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

function getIncomeBrief(cik: string, report: ReportInfo) {
    const year_path = saveExcelDoc(cik, report);
    const yearly_data = getExcelJSON(year_path);
    const yearly_income = getIncomeStatement(yearly_data, report.form);
    return yearly_income;
}


export function dataCompiler(cik: string): [string, ReportDecodedData][] {
    var quarters = 16;

    var submissionData: ReportInfo[] = getSubmissionData(cik, ["10-K", "10-Q"], quarters + 3);

    var out_data: [string, ReportDecodedData][] = [];

    for (var quarter = 0; quarter < quarters; quarter++) {
        const filepath = saveExcelDoc(cik, submissionData[quarter]);

        
        const json_data = getExcelJSON(filepath);
        const document_info: DocumentInfo = getIdentifyingInformation(json_data);
        const date = getDate(json_data);

        if (date[1].length == 0)
            throw "Date not fetched";

        var data: IncomeStatement = IncomeStatement_EMPTY;
        if (document_info.type == "10-Q") {
            data = getIncomeStatement(json_data, "10-Q");
        } else {
            // console.log(filepath);
            var yearly_income:IncomeStatement = getIncomeStatement(json_data, "10-K");
            
            var q3: IncomeStatement = getIncomeBrief(cik, submissionData[quarter + 1]);
            var q2: IncomeStatement = getIncomeBrief(cik, submissionData[quarter + 2]);
            var q1: IncomeStatement = getIncomeBrief(cik, submissionData[quarter + 3]);
            
            const sub_func = (a: number, b: number) => {
                return a - b;
            };
            data = combineIncomeStatements(yearly_income, q3, sub_func); 
            data = combineIncomeStatements(data, q2, sub_func); 
            data = combineIncomeStatements(data, q1, sub_func); 

            console.log(`yin=${yearly_income.revenue.value}  q3=${q3.revenue.value} q2=${q2.revenue.value} q1=${q1.revenue.value} yout=${data.revenue.value}`);
            
        }

        var entry: ReportDecodedData = {
            "Income-statement": data
        }
        //console.log(`date=${date[1]}    ${entry["Income-statement"].revenue.three}`)
        out_data.push([date[1], entry]);

        
    }
    return out_data.reverse();
}