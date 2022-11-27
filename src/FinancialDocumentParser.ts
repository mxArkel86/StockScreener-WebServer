import { anyAreInvalid, combineDataSets, combinePropertySet, EXC_OR, getDictionaryKeys, getDictionaryValues, isEmptyString, normStr, normStrStrong, onValid, valueInSearchTerms } from "./util/DataUtil";
import { Findoc_EXCEL_DATA, Findoc_SHEET_DATA } from "./util/ExcelUtil";

import fs from "fs";
import { ConfigIdentity, ConfigIdentitySet } from "DataCompiler";

export function getIncomeStatement(data: Findoc_EXCEL_DATA): FindocIncomeStatement {
    let out_data = getFinancialStatement(data, "IncomeStatementIdentity.json", FindocIncomeStatement_EMPTY(), ["stock", "share"]) as FindocIncomeStatement;
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    out_data = combinePropertySet(out_data, FindocIncomeStatement_EMPTY(), (a: number | null, b: number | null) => {
        return a!=null?a*Math.pow(10,6):null;
    }) as FindocIncomeStatement;
    if (!out_data['gross_income'].is_set
        && out_data['revenue'].is_set
        && out_data['cost_of_goods'].is_set) {
        out_data["gross_income"] = combineDataSets(out_data["revenue"], out_data["cost_of_goods"], onValid((a: number, b: number): number => { return a - b; }));
    }
    return out_data;
}

export function getDate(data:Findoc_EXCEL_DATA): [Date,string]{
    const search_terms = ["document period end date"];

    const sheet_data: Findoc_SHEET_DATA = getSheetAt(data, 0);

    for (let row = 0; row < sheet_data.rows.length;row++) {
        const key_: string = normStr(sheet_data.rows[row][0] as string);
        const value_: string|number = sheet_data.rows[row][1];
        
        if (search_terms.includes(key_)) {
            // console.log(value_);
            const cleanstring = (value_ as string).replace(/[\n\t\r]+/, "").replace(/[ ]+/, " ");
            const dateobj: Date = new Date(cleanstring);
            return [dateobj, cleanstring];
        }
    }
    throw "no date found";
    return [new Date(0),""];
}

export function getBalanceSheet(data: Findoc_EXCEL_DATA): FindocBalanceSheet {
    const balancesheet: PropertySet = getFinancialStatement(data, "BalanceSheetIdentity.json", FindocBalanceSheet_EMPTY());
    const balancesheet_parenthetical: PropertySet = getFinancialStatement(data, "BalanceSheetParentheticalIdentity.json", FindocBalanceSheet_EMPTY());

    const out_data:FindocBalanceSheet = combinePropertySet(balancesheet, balancesheet_parenthetical, EXC_OR) as FindocBalanceSheet;
    // console.log(JSON.stringify(out_data));
    if (!(out_data['total_liabilities'].is_set)
        && out_data['total_liabilities_and_equity'].is_set
        && out_data['total_shareholder_equity'].is_set) {
        
        out_data["total_liabilities"] = combineDataSets(out_data["total_liabilities_and_equity"], out_data["total_shareholder_equity"], onValid((a: number, b: number): number => { return a - b; }));
    }
    return out_data;
}

export function getFinancialStatement(data: Findoc_EXCEL_DATA, config_name: string, data_default: PropertySet, exclusions: string[] = []): PropertySet {
    
    const config_data = JSON.parse(fs.readFileSync(`configs/${config_name}`).toString()) as ConfigIdentity;
    
    const search_term = config_data["main"]["search_terms"];

    console.log("-----" + config_name);

    const sheet_data: Findoc_SHEET_DATA = getSheetWithSearch(data, search_term);
    const data_out: PropertySet = data_default;

    for (let row = 0; row < sheet_data.rows.length;row++) {
        const key_: string = normStrStrong(sheet_data.rows[row][0] as string);
        let value_: string | number = sheet_data.rows[row][1];
        
        const search = sheet_data.rows[row].find((val, i) => (i > 1 && !isEmptyString(String(val))));
        if (isEmptyString(String(value_)) && search != null) {
            value_ = search;
        }

        // if(config_name == "BalanceSheetParentheticalIdentity.json")
        //     console.log(`[${key_}     ${sheet_data.rows[row]}]`);
        
        if (typeof value_ != "number") {
            continue;
        }
       
        let num_value:number = value_ as number;

        let parenthesis_search: string[] = [];
        const match_set:{[key:string]:string}|undefined = key_.match(/(?<=\().+(?=\))/g)?.groups;
        if (match_set != null) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            parenthesis_search = getDictionaryValues(match_set) as string[]
        }

        if (parenthesis_search != null && parenthesis_search.length != 0) {
            if (parenthesis_search.includes("loss") || parenthesis_search.includes("expense")) {
                num_value = -num_value;
            }
        }

        if (value_ == null || String(value_).replace(/\s/, "").length == 0) {
            
            let found = false;
            for (const str_ of exclusions) {
                if (normStr(key_).includes(normStr(str_))) {
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

        const props = getDictionaryValues(config_data["properties"]) as ConfigIdentitySet[];

        for (let i = 0;i<props.length;i++) {
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
 * @param {Findoc_EXCEL_DATA} data 
 * @returns 
 */
 export function getIdentifyingInformation(data: Findoc_EXCEL_DATA): FindocCoverPage {
    const document_type_terms = ["document type"];
    const fiscal_year_terms = ["document fiscal year focus"];
    const fiscal_year_enddate_terms = ["company fiscal year end date", "document period end date"];
    const fiscal_period_terms = ["document fiscal period focus"];
    
    const json_data = getSheetAt(data, 0);

    let document_type = "";
    let fiscal_year_focus = -1;
    let fiscal_year_end_date = "";
    let fiscal_period_focus = "";

    for (let row = 0; row < json_data.rows.length;row++) {
        const key_: string = normStr(json_data.rows[row][0] as string);
        const value_: string|number = json_data.rows[row][1];
        
        const value_str: string = value_ as string;
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
        "year_end_date": new Date(fiscal_year_end_date)
    }
}

/**
 * Gets the sheet at the index
 * @param {Findoc_EXCEL_DATA} data 
 * @param {number} index 
 * @returns 
 */
export function getSheetAt(data:Findoc_EXCEL_DATA, index: number):Findoc_SHEET_DATA {
    const names = getDictionaryKeys(data) as string[];
    if (names==null)
        throw new Error("sheet not found")
    return data[names[index]];
}

/**
 * Gets the sheet with any of the given names
 * @param {Findoc_EXCEL_DATA} data 
 * @param {string[]} search_names 
 * @returns 
 */
export function getSheetWithSearch(data: Findoc_EXCEL_DATA, search_val: string): Findoc_SHEET_DATA {
    const sheet_names = (getDictionaryKeys(data) as string[]).map(x=>normStr(x.replace("unaudited", "")));
    const re = new RegExp(search_val, "i");
    
    for (const i in sheet_names) {
        const name = sheet_names[i];

        const match_ = name.match(re);
        if (match_ != null)
            return getDictionaryValues(data)[i] as Findoc_SHEET_DATA;
    }
    console.log(sheet_names.map(x => normStr(x)));
    throw `no sheet found (find ${search_val})`;
}


export type FormattedDataValue = {
    value: number,
    is_set: boolean
}

export function FormattedDataValue_EMPTY(): FormattedDataValue {
    return {
        "value": 0,
        "is_set": false
    };
}

export type FindocCoverPage = {
    type: string;
    year_focus: number;
    quarter_focus: string;
    year_end_date: Date;
}

export function FindocCoverPage_EMPTY(): FindocCoverPage{
    return {
        "quarter_focus":"",
        "type":"",
        "year_end_date":new Date(0),
        "year_focus":0
    }
}


export type PropertySet = { [name: string]: FormattedDataValue };

export type FindocIncomeStatement = {
    revenue: FormattedDataValue,
    gross_income: FormattedDataValue,
    operating_income: FormattedDataValue
    net_income: FormattedDataValue,
    cost_of_goods: FormattedDataValue
}

export function FindocIncomeStatement_EMPTY():FindocIncomeStatement {
    
    return {
        "revenue": FormattedDataValue_EMPTY(),
        "cost_of_goods": FormattedDataValue_EMPTY(),
        "operating_income": FormattedDataValue_EMPTY(),
        "gross_income": FormattedDataValue_EMPTY(),
        "net_income": FormattedDataValue_EMPTY()
    };
}

export type FindocBalanceSheet = {
    total_assets: FormattedDataValue,
    total_liabilities: FormattedDataValue,
    total_shareholder_equity: FormattedDataValue,
    total_current_liabilities: FormattedDataValue,
    total_current_assets: FormattedDataValue,
    total_liabilities_and_equity: FormattedDataValue,
    cash_assets: FormattedDataValue,
    accounts_receivable: FormattedDataValue,
    shares_outstanding: FormattedDataValue
}

export function FindocBalanceSheet_EMPTY(): FindocBalanceSheet {
    return {
        "total_assets": FormattedDataValue_EMPTY(),
        "total_liabilities": FormattedDataValue_EMPTY(),
        "total_shareholder_equity": FormattedDataValue_EMPTY(),
        "total_current_liabilities": FormattedDataValue_EMPTY(),
        "total_current_assets": FormattedDataValue_EMPTY(),
        "total_liabilities_and_equity": FormattedDataValue_EMPTY(),
        "accounts_receivable": FormattedDataValue_EMPTY(),
        "cash_assets": FormattedDataValue_EMPTY(),
        "shares_outstanding": FormattedDataValue_EMPTY()
    }
}

export type FindocCashFlow = {
    a: FormattedDataValue
}

export function FindocCashFlow_EMPTY(): FindocCashFlow {
    return {
        "a": FormattedDataValue_EMPTY()
    }
}
