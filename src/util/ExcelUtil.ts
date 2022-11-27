import { getDictionaryKeys, getDictionaryValues, normStr } from "./DataUtil";

import xlsx from "xlsx";

export type Findoc_SHEET_DATA_ROW = (string|number)[]
export type Findoc_SHEET_DATA = { header: (string | number)[], rows: Findoc_SHEET_DATA_ROW[] };
export type Findoc_EXCEL_DATA = { [name: string]: Findoc_SHEET_DATA };

/** 
     * Parses raw json data into a structured object
     * @param {string} path
     * @returns {Findoc_EXCEL_DATA}
     * */
export function getExcelJSON(path:string): Findoc_EXCEL_DATA {
    const file = xlsx.readFile(path);

    

    const out_data: Findoc_EXCEL_DATA = {};
    for (const name of file.SheetNames) {
        const json_data:{[val:string]:string|number}[] = xlsx.utils.sheet_to_json(file.Sheets[name]);

        // console.log("------------")
        // console.log(json_data);
        // console.log("============")
        if (json_data.length <= 1)
            continue;

        const header:string[] = getDictionaryKeys(json_data[1]) as string[];
        const title = normStr(header[0].split('-')[0]);
        //var units = normStr(header[0].split('-')[1]);
        const newrows:Findoc_SHEET_DATA_ROW[] = [];
        for (let i = 0; i < json_data.length;i++) {
            const rowelem: { [name: string]: (string | number) } = json_data[i];
            const newrow = Array(header.length).fill('')
            for (const row in getDictionaryValues(rowelem)) {
                newrow[row] = getDictionaryValues(rowelem)[row] as string;
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


export function writeToExcel(path: string, data: unknown[][]) {
    
    const workbook = xlsx.utils.book_new();

    const worksheet = xlsx.utils.aoa_to_sheet(data);
    
    xlsx.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    xlsx.writeFileXLSX(workbook, path);
}

