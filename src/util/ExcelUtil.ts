import { anyAreInvalid, combineDataSets, combinePropertySet, dataIsEmpty, EXC_OR, getDictionaryKeys, getDictionaryValues, isEmptyString, isNumeric, norm, num_norm, onValid, valueInSearchTerms } from "./DataUtil";

const xlsx = require("xlsx");
const fs = require("fs");


export type SHEET_DATA_ROW = (string|number)[]
export type SHEET_DATA = { header: (string | number)[], rows: SHEET_DATA_ROW[] };
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
        const json_data:{[val:string]:string|number}[] = xlsx.utils.sheet_to_json(file.Sheets[name]);

        // console.log("------------")
        // console.log(json_data);
        // console.log("============")
        if (json_data.length <= 1)
            continue;

        var header:(string)[] = getDictionaryKeys(json_data[1]);
        var title = norm(header[0].split('-')[0]);
        var newrows:SHEET_DATA_ROW[] = [];
        for (var i = 0; i < json_data.length;i++) {
            var rowelem: { [name: string]: (string | number) } = json_data[i];
            var newrow = header.map(x => "");
            for (var row in getDictionaryValues(rowelem)) {
                newrow[row] = getDictionaryValues(rowelem)[row];
            }

            
            newrows.push(newrow);
        }
        out_data[title] = {
            "header": header,
            "rows": newrows
        }
        // var measure = header.split('-')[1];
    }

    return out_data;
    
}


export function writeToExcel(path: string, data: any) {
    
    var workbook = xlsx.utils.book_new();

    var worksheet = xlsx.utils.aoa_to_sheet(data);
    
    xlsx.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    xlsx.writeFileXLSX(workbook, path);
}

