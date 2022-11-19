import { anyAreInvalid, combineDataSets, dataIsEmpty, getDictionaryKeys, getDictionaryValues, isNumeric, norm, num_norm, valueInSearchTerms } from "./util/DataUtil";

const xlsx = require("xlsx");
const fs = require("fs");

export type DocumentInfo = {
    type: string;
    year_focus: number;
    quarter_focus: string;
    year_end_date: string;
}

export type DataSet = {
    value: number,
    is_set: boolean
}

export function DataSet_EMPTY(): DataSet {
    return {
        "value": 0,
        "is_set": false
    };
}

export type PropertySet = { [name: string]: DataSet };

export type IncomeStatement = {
    revenue: DataSet,
    gross_income: DataSet,
    operating_income: DataSet
    net_income: DataSet,
    cost_of_goods: DataSet
}

export function IncomeStatement_EMPTY():IncomeStatement {
    
    return {
        "revenue": DataSet_EMPTY(),
        "cost_of_goods": DataSet_EMPTY(),
        "operating_income": DataSet_EMPTY(),
        "gross_income": DataSet_EMPTY(),
        "net_income": DataSet_EMPTY()
    };
}

export type BalanceSheet = {
    total_assets: DataSet,
    total_liabilities: DataSet,
    total_shareholder_equity: DataSet,
    total_current_liabilities: DataSet,
    total_current_assets: DataSet,
    total_liabilities_and_equity: DataSet,
    cash_assets: DataSet,
    accounts_receivable: DataSet,
    shares_outstanding: DataSet
}

export function BalanceSheet_EMPTY(): BalanceSheet {
    return {
        "total_assets": DataSet_EMPTY(),
        "total_liabilities": DataSet_EMPTY(),
        "total_shareholder_equity": DataSet_EMPTY(),
        "total_current_liabilities": DataSet_EMPTY(),
        "total_current_assets": DataSet_EMPTY(),
        "total_liabilities_and_equity": DataSet_EMPTY(),
        "accounts_receivable": DataSet_EMPTY(),
        "cash_assets": DataSet_EMPTY(),
        "shares_outstanding": DataSet_EMPTY()
    }
}

export type CashFlow = {
    a: DataSet
}

export function CashFlow_EMPTY(): CashFlow {
    return {
        "a": DataSet_EMPTY()
    }
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
function getSheetsWithSearch(data: EXCEL_DATA, search_val: string): SHEET_DATA {
    const sheet_names = getDictionaryKeys(data).map(x=>norm(x.replace("unaudited", "")));
    var out_data: SHEET_DATA[] = [];
    var re = new RegExp(search_val, "i");
    
    for (var i in sheet_names) {
        var name = sheet_names[i];

        var match_ = name.match(re);
        if (match_ != null)
            out_data.push(getDictionaryValues(data)[i]);
    }
    if (out_data.length == 0) {
        console.log(sheet_names.map(x => norm(x)));
        throw `no sheet found (find ${search_val})`;
    }
    return out_data;
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

export function getIncomeStatement(data: EXCEL_DATA):IncomeStatement {
    var out_data: IncomeStatement = getFinancialStatement(data, "IncomeStatementIdentity.json", IncomeStatement_EMPTY(), ["stock", "share"]) as IncomeStatement;
    if (!out_data['gross_income'].is_set
        && out_data['revenue'].is_set
        && out_data['cost_of_goods'].is_set) {
        out_data["gross_income"] = combineDataSets(out_data["revenue"], out_data["cost_of_goods"], (a: number, b: number): number => { return a - b; });
    }
    return out_data;
}

export function getBalanceSheet(data: EXCEL_DATA): BalanceSheet {
    var out_data: BalanceSheet = getFinancialStatement(data, "BalanceSheetIdentity.json", BalanceSheet_EMPTY()) as BalanceSheet;
    // console.log(JSON.stringify(out_data));
    if (!(out_data['total_liabilities'].is_set)
        && out_data['total_liabilities_and_equity'].is_set
        && out_data['total_shareholder_equity'].is_set) {
        
        out_data["total_liabilities"] = combineDataSets(out_data["total_liabilities_and_equity"], out_data["total_shareholder_equity"], (a: number, b: number): number => { return a - b; });
    }
    return out_data;
}

export function getFinancialStatement(data: EXCEL_DATA, config_name:string, data_default:PropertySet, exclusions:string[] = []): PropertySet {
    
    var config_data = JSON.parse(fs.readFileSync(`configs/${config_name}`));
    
    const search_term = config_data["main"]["search_terms"];
    //console.log(search_terms);

    const sheets_data: SHEET_DATA[] = getSheetsWithSearch(data, search_term);
    var data_out: PropertySet = data_default;

    for (var sheet_data of sheets_data) {
        
        for (var row in sheet_data) {
            const key_: string = norm(getDictionaryValues(sheet_data[row])[0]);
            const value_: string = getDictionaryValues(sheet_data[row])[1];

            if (!isNumeric(num_norm(value_))) {
                continue;
            }
       
            var num_value = parseFloat(num_norm(value_));

            var parenthesis_search: string[] = getDictionaryValues(sheet_data[row])[0].match(/(?<=\().+(?=\))/);

            if (parenthesis_search != null && parenthesis_search.length != 0) {
                if (parenthesis_search.includes("loss") || parenthesis_search.includes("expense")) {
                    num_value = -num_value;
                }
            }

            
            if (value_ == undefined || String(value_).replace(/\s/, "").length == 0) {
                //console.log(`[${key_}     ${value_}]`);
                var found = false;
                for (var str_ of exclusions) {
                    if (norm(key_).includes(norm(str_))){
                        found = true;
                        break;
                    }
                }
                if (found ==true) {
                    // console.log("BREAK=" + key_)
                    // console.log(JSON.stringify(data_out));
                    break;
                }
            }

            const props = getDictionaryValues(config_data["properties"]);

            for (var i in props) {
                const search_terms = props[i]["search_terms"];
                const prop_path = props[i]["path"];

                if (valueInSearchTerms(search_terms, key_)) {
                    //console.log(`term is found [${prop_path}]`);
                    if (data_out[prop_path].is_set == false) {
                        data_out[prop_path] = {
                            "value": num_value,
                            "is_set": true
                        };
                    }
                }
            }
        }
    }

    //console.log(data_out);

    return data_out;
}


export function writeToExcel(path: string, data: any) {
    
    var workbook = xlsx.utils.book_new();

    var worksheet = xlsx.utils.aoa_to_sheet(data);
    
    xlsx.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    xlsx.writeFileXLSX(workbook, path);
}

