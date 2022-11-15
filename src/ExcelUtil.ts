import { anyAreInvalid, combineDataSets, dataIsEmpty, getDictionaryKeys, getDictionaryValues, isNumeric, norm, num_norm } from "./util/DataUtil";

const xlsx = require("xlsx")

export type DocumentInfo = {
    type: string;
    year_focus: number;
    quarter_focus: string;
    year_end_date: string;
}

export type DataSet = {
    value: number
}

export const DataSet_EMPTY: DataSet = {
    "value":0
}

export type IncomeStatement = {
    revenue: DataSet,
    gross_income: DataSet,
    operating_income: DataSet
    net_income: DataSet
}

export const IncomeStatement_EMPTY:IncomeStatement = {
    "revenue": DataSet_EMPTY,
    "operating_income": DataSet_EMPTY,
    "gross_income": DataSet_EMPTY,
    "net_income":DataSet_EMPTY
}

export type BalanceSheet = {
    common_stock_outstanding: number,
    total_assets: number,
    total_liabilities: number,
    total_shareholder_equity: number,
    debt: {
        short_term_debt: number,
        debt: number
    },
    total_current_liabilities: number,
    other_long_term_liabilities: number
}

export type CashFlow = {

}

type SHEET_DATA_ROW = { [name: string | number]: any }
type SHEET_DATA = SHEET_DATA_ROW[number];
export type EXCEL_DATA = { [name: string]: SHEET_DATA };

/** 
     * Parses raw json data into a structured object
     * @param {string} path
     * @returns {EXCEL_DATA}
     * */
export function getExcelJSON(path:string): EXCEL_DATA {
    const file = xlsx.readFile(path);

    var out_data: EXCEL_DATA = {};
    for (var name of file.SheetNames) {
        const json_data:SHEET_DATA = xlsx.utils.sheet_to_json(file.Sheets[name]);

        // console.log("------------")
        // console.log(json_data);
        // console.log("============")
        if (json_data.length <= 1)
            continue;

        var header = getDictionaryKeys(json_data[1])[0];
        var title = norm(header.split('-')[0]);
        var measure = header.split('-')[1];

        out_data[title] = json_data;
    }

    return out_data;
    
}

/**
 * Get report information in the Excel spreadsheet
 * @param {EXCEL_DATA} data 
 * @returns 
 */
export function getIdentifyingInformation(data: EXCEL_DATA): DocumentInfo {
    const document_type_terms = ["document type"];
    const fiscal_year_terms = ["document fiscal year focus"];
    const fiscal_year_enddate_terms = ["company fiscal year end date", "document period end date"];
    const fiscal_period_terms = ["document fiscal period focus"];
    
    var json_data = getSheetAt(data, 0);

    var document_type: string = "";
    var fiscal_year_focus: number = -1;
    var fiscal_year_end_date: string = "";
    var fiscal_period_focus: string = "";
    for (var row in json_data) {
        var key_: string = norm(getDictionaryValues(json_data[row])[0]);
        var value_: string = getDictionaryValues(json_data[row])[1];
        
       //console.log(key_);
        if (document_type_terms.includes(key_)) {
            document_type = value_;
        } else if (fiscal_year_terms.includes(key_)) {
            fiscal_year_focus = parseInt(value_);
        } else if (fiscal_year_enddate_terms.includes(key_)) {
            fiscal_year_end_date = value_.replace(/^--/, "").replace(/(?<=\d)-(?=\d)/, "/");
        } else if (fiscal_period_terms.includes(key_)) {
            fiscal_period_focus = value_;
        }
    }

    if (anyAreInvalid(document_type, fiscal_year_focus, fiscal_period_focus, fiscal_year_end_date)) {
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
    }
}

/**
 * Gets the sheet at the index
 * @param {EXCEL_DATA} data 
 * @param {number} index 
 * @returns 
 */
function getSheetAt(data:EXCEL_DATA, index: number):SHEET_DATA {
    const names = getDictionaryKeys(data);
    return data[names[0]];
}

/**
 * Gets the sheet with any of the given names
 * @param {EXCEL_DATA} data 
 * @param {string[]} search_names 
 * @returns 
 */
function getSheetWithNames(data: EXCEL_DATA, search_names: string[]): SHEET_DATA {
    search_names = search_names.map(x => norm(x));
    const sheet_names = getDictionaryKeys(data);
    for (var i in sheet_names) {
        const name = sheet_names[i];
        //console.log(norm(name));
        if (search_names.includes(norm(name)))
            return getDictionaryValues(data)[i];
    }
    throw `no sheet found (find ${console.log(search_names[0])})`;
    return undefined;
}

export function getDate(data:EXCEL_DATA): [Date,string]{
    const search_terms = ["document period end date"];

    const sheet_data: SHEET_DATA = getSheetAt(data, 0);

    for (var row of sheet_data) {
        const key_ = norm(getDictionaryValues(row)[0]);
        const value_ = getDictionaryValues(row)[1];
        
        if (search_terms.includes(key_)) {
            // console.log(value_);
            var cleanstring = value_.replace(/[\n\t\r]+/, "").replace(/[ ]+/, " ");
            var dateobj: Date = new Date(cleanstring);
            return [dateobj, cleanstring];
        }
    }
    throw "no date found";
    return [new Date(0),""];
}

export function getIncomeStatement(data: EXCEL_DATA, doc_type: string): IncomeStatement {
    
    console.log("----------------")
    const search_terms = ["consolidated condensed statements of income",
        "condensed consolidated statements of income",
        "consolidated statements of income", "income statements", "consolidated statements of operations",
    "condensed consolidated statements of operations"];
    
    const revenue_terms = ["revenue", "net revenue", "total net sales"];
    const gross_income_terms = ["gross margin"];
    const net_income_terms = ["net income"];
    const operating_income_terms = ["operating income"];

    const cost_of_sales_terms = ["cost of sales"];
    var cost_of_sales: DataSet = DataSet_EMPTY;
    
    const sheet_data: SHEET_DATA = getSheetWithNames(data, search_terms);

    

    var data_out:IncomeStatement = {
        "revenue": DataSet_EMPTY,
        "gross_income": DataSet_EMPTY,
        "net_income": DataSet_EMPTY,
        "operating_income": DataSet_EMPTY,
    }

    for (var row in sheet_data) {
        const key_: string = norm(getDictionaryValues(sheet_data[row])[0]);
        const value_: string = getDictionaryValues(sheet_data[row])[1];

        // const value_2: string = getDictionaryValues(sheet_data[row])[3];

        var num_value = 0;
        if (isNumeric(value_))
            num_value = parseInt(num_norm(value_));
        // var num_value_2 = 0;
        // if (isNumeric(value_2))
        //     num_value_2 = parseInt(num_norm(value_2));

        if (doc_type == "10-K")
            console.log(`key=[${key_}]  value=[${value_}]`);
        if (value_==undefined || String(value_).replace(/[\s]+/, "").length == 0) {
            if (norm(key_).includes("share")) {
                console.log("BREAK=" + key_);
                break;
            }
        }
        
        const cumulative_data:DataSet = {
            "value":num_value
        };

        if (revenue_terms.includes(key_)) {
            data_out["revenue"] = cumulative_data;
        } else if (gross_income_terms.includes(key_)) {
            data_out["gross_income"] = cumulative_data;
        } else if (net_income_terms.includes(key_)) {
            data_out["net_income"] = cumulative_data;
        } else if (operating_income_terms.includes(key_)) {
            data_out["operating_income"] = cumulative_data;
        } else if (cost_of_sales_terms.includes(key_))
        {
            cost_of_sales = cumulative_data;    
        }
    }

    if (dataIsEmpty(data_out["gross_income"]) && !dataIsEmpty(data_out["revenue"]) && !dataIsEmpty(cost_of_sales)) {
        data_out["gross_income"] = combineDataSets(data_out["revenue"], cost_of_sales, (a: number, b: number) => {
            return a - b;
        });
    }

    return data_out;
}

export function writeToExcel(path: string, data: any) {
    
    var workbook = xlsx.utils.book_new();

    var worksheet = xlsx.utils.aoa_to_sheet(data);
    
    xlsx.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    xlsx.writeFileXLSX(workbook, path);
}

