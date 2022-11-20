import { anyAreInvalid, combineDataSets, combinePropertySet, EXC_OR, getDictionaryKeys, getDictionaryValues, isEmptyString, norm, onValid, valueInSearchTerms } from "./util/DataUtil";
import { EXCEL_DATA, SHEET_DATA } from "./util/ExcelUtil";

const fs = require("fs");

export function getIncomeStatement(data: EXCEL_DATA): IncomeStatement {
    var out_data: IncomeStatement = getFinancialStatement(data, "IncomeStatementIdentity.json", IncomeStatement_EMPTY(), ["stock", "share"]) as IncomeStatement;
    if (!out_data['gross_income'].is_set
        && out_data['revenue'].is_set
        && out_data['cost_of_goods'].is_set) {
        out_data["gross_income"] = combineDataSets(out_data["revenue"], out_data["cost_of_goods"], onValid((a: number, b: number): number => { return a - b; }));
    }
    return out_data;
}

export function getDate(data:EXCEL_DATA): [Date,string]{
    const search_terms = ["document period end date"];

    const sheet_data: SHEET_DATA = getSheetAt(data, 0);

    for (var row = 0; row < sheet_data.rows.length;row++) {
        const key_: string = norm(sheet_data.rows[row][0] as string);
        const value_: string|number = sheet_data.rows[row][1];
        
        if (search_terms.includes(key_)) {
            // console.log(value_);
            var cleanstring = (value_ as string).replace(/[\n\t\r]+/, "").replace(/[ ]+/, " ");
            var dateobj: Date = new Date(cleanstring);
            return [dateobj, cleanstring];
        }
    }
    throw "no date found";
    return [new Date(0),""];
}

export function getBalanceSheet(data: EXCEL_DATA): BalanceSheet {
    var balancesheet: PropertySet = getFinancialStatement(data, "BalanceSheetIdentity.json", BalanceSheet_EMPTY());
    var balancesheet_parenthetical: PropertySet = getFinancialStatement(data, "BalanceSheetParentheticalIdentity.json", BalanceSheet_EMPTY());

    var out_data:BalanceSheet = combinePropertySet(balancesheet, balancesheet_parenthetical, EXC_OR) as BalanceSheet;
    // console.log(JSON.stringify(out_data));
    if (!(out_data['total_liabilities'].is_set)
        && out_data['total_liabilities_and_equity'].is_set
        && out_data['total_shareholder_equity'].is_set) {
        
        out_data["total_liabilities"] = combineDataSets(out_data["total_liabilities_and_equity"], out_data["total_shareholder_equity"], onValid((a: number, b: number): number => { return a - b; }));
    }
    return out_data;
}

export function getFinancialStatement(data: EXCEL_DATA, config_name: string, data_default: PropertySet, exclusions: string[] = []): PropertySet {
    
    var config_data = JSON.parse(fs.readFileSync(`configs/${config_name}`));
    
    const search_term = config_data["main"]["search_terms"];

    console.log("-----" + config_name);

    const sheet_data: SHEET_DATA = getSheetWithSearch(data, search_term);
    var data_out: PropertySet = data_default;

    for (var row = 0; row < sheet_data.rows.length;row++) {
        const key_: string = norm(sheet_data.rows[row][0] as string);
        var value_: string | number = sheet_data.rows[row][1];
        
        var search = sheet_data.rows[row].find((val, i) => (i > 0 && !isEmptyString(String(val))));
        if (isEmptyString(String(value_)) && search != null) {
            value_ = search!;
        }

        // if(config_name == "BalanceSheetParentheticalIdentity.json")
        //     console.log(`[${key_}     ${sheet_data.rows[row]}]`);
        
        if (typeof value_ != "number") {
            continue;
        }
       
        var num_value:number = value_ as number;

        var parenthesis_search: string[] = [];
        if (key_.match(/(?<=\().+(?=\))/) != null) {
            parenthesis_search = getDictionaryValues(key_.match(/(?<=\().+(?=\))/g)!.groups)
        }

        if (parenthesis_search != null && parenthesis_search.length != 0) {
            if (parenthesis_search.includes("loss") || parenthesis_search.includes("expense")) {
                num_value = -num_value;
            }
        }

        if (value_ == undefined || String(value_).replace(/\s/, "").length == 0) {
            
            var found = false;
            for (var str_ of exclusions) {
                if (norm(key_).includes(norm(str_))) {
                    found = true;
                    break;
                }
            }
            if (found == true) {
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

    //console.log(data_out);

    return data_out;
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

    for (var row = 0; row < json_data.rows.length;row++) {
        var key_: string = norm(json_data.rows[row][0] as string);
        var value_: string|number = json_data.rows[row][1];
        
        var value_str: string = value_ as string;
        // console.log(`${key_}=${value_}`);

        if (document_type_terms.includes(key_)) {
            document_type = value_str;
        } else if (fiscal_year_terms.includes(key_)) {
            fiscal_year_focus = parseInt(value_str);
        } else if (fiscal_year_enddate_terms.includes(key_)) {
            fiscal_year_end_date = value_str.replace(/^--/, "").replace(/(?<=\d)-(?=\d)/, "/");
        } else if (fiscal_period_terms.includes(key_)) {
            fiscal_period_focus = value_str;
        }
    }

    if (anyAreInvalid(document_type, fiscal_year_focus, fiscal_period_focus, fiscal_year_end_date)) {
        console.log(`[${document_type},${fiscal_year_focus},${fiscal_period_focus},${fiscal_year_end_date}]`);
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
export function getSheetAt(data:EXCEL_DATA, index: number):SHEET_DATA {
    const names = getDictionaryKeys(data);
    return data[names[0]];
}

/**
 * Gets the sheet with any of the given names
 * @param {EXCEL_DATA} data 
 * @param {string[]} search_names 
 * @returns 
 */
export function getSheetWithSearch(data: EXCEL_DATA, search_val: string): SHEET_DATA {
    const sheet_names = getDictionaryKeys(data).map(x=>norm(x.replace("unaudited", "")));
    var re = new RegExp(search_val, "i");
    
    for (var i in sheet_names) {
        var name = sheet_names[i];

        var match_ = name.match(re);
        if (match_ != null)
            return getDictionaryValues(data)[i];
    }
    console.log(sheet_names.map(x => norm(x)));
    throw `no sheet found (find ${search_val})`;
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


export type DocumentInfo = {
    type: string;
    year_focus: number;
    quarter_focus: string;
    year_end_date: string;
}

