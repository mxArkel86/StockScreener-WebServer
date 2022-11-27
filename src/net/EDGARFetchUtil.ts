import syncfetch from 'sync-fetch';
import fs from 'fs';
import {execSync} from 'child_process'

import { getDictionaryValues } from "../util/DataUtil";
import {setCache, cachePath, isCache} from "../sys/CacheManager"

export type EDGARReportInfo = {
    "cik":string,
    "accessionNumberRaw": string,
    "accessionNumberParts": {
        "filer_id": string,
        "year": string,
        "doc_id":string
    }
    "primaryDocument":string,
    "filingDate": string,
    "reportDate": string,
    "form": string
}
export type TICKER_SET = {
    cik_str:number,
    ticker:string, 
    title:string
}
export type TICKER_FILE = {
    [key:string]:TICKER_SET
}

const headerPref = {
    "User-Agent": "Nicholas Kading Personal nicholas.lkading@outlook.com"
}

/**
 * Saves the excel doc associated with the report to a local directory. It then returns its file
 * @param {string} cik 
 * @param {EDGARReportInfo} inf 
 * @returns 
 */
export function saveExcelDoc(inf:EDGARReportInfo) {
    const requestOptions = {
        method: 'GET',
        headers: headerPref
    };
    
    const filename:string = inf.accessionNumberRaw + ".xlsx";
    const cacheExists = isCache(filename);

    if (!cacheExists) {
        const url = `https://www.sec.gov/Archives/edgar/data/${inf.cik.replace("^(0)+", "")}/${inf.accessionNumberParts.filer_id}${inf.accessionNumberParts.year}${inf.accessionNumberParts.doc_id}/Financial_Report.xlsx`;
    
    
        const command = `curl "${url}" --silent --location --header "User-Agent: ${headerPref["User-Agent"]}" --output "${cachePath(filename)}"`;
        execSync(command);
        
    }
    return cachePath(filename);
}

export function getMostRecentReport(cik:string, formtypes:string[]):EDGARReportInfo {
   return getSubmissionData(cik, formtypes, 1)[0];
}

/**
 * Gets the primary document associated with the report, and returns its text data
 * @param {string} cik 
 * @param {EDGARReportInfo} inf 
 * @returns 
 */
export function getPrimaryReport(cik:string, inf: EDGARReportInfo) {
    const requestOptions = {
        method: 'GET',
        headers: headerPref
      };
      
    const response = syncfetch(`https://www.sec.gov/Archives/edgar/data/${cik.replace("^(0)+", "")}/${inf.accessionNumberParts.filer_id}${inf.accessionNumberParts.year}${inf.accessionNumberParts.doc_id}/${inf.primaryDocument}`, requestOptions);
    
    const strdata: string = response.text();
    return strdata;
}
/**
 * Gets a list of the most recent reports for a company
 * @param {string} cik 
 * @param {string[]} formtypes 
 * @param {number} maxfetch 
 * @returns 
 */
export function getSubmissionData(cik: string, formtypes:string[], maxfetch:number):EDGARReportInfo[] {
    
    const requestOptions = {
        method: 'GET',
        headers: headerPref
    };
    
    const cacheExists: boolean = isCache(`CIK${cik}.json`);
    
    // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
    var data: any;
    if (cacheExists) {
        data = JSON.parse(fs.readFileSync(cachePath(`CIK${cik}.json`)).toString());
    } else {
        const response = syncfetch(`https://data.sec.gov/submissions/CIK${cik}.json`, requestOptions);
        data = response.json()
        
        setCache(`CIK${cik}.json`, JSON.stringify(data));
    }
      
    const listdata = data["filings"]["recent"]
    
    const recentinfo: EDGARReportInfo[] = [];
    for (let i = 0; i < listdata["accessionNumber"].length && recentinfo.length<maxfetch;i++) {
        
        if (!formtypes.includes(listdata["form"][i]))
            continue;
        
        const accession: string = listdata[`accessionNumber`][i];
        
        const elem: EDGARReportInfo = {
            "cik":cik,
            "accessionNumberRaw": listdata[`accessionNumber`][i],
            "accessionNumberParts": {
                "filer_id": accession.split("-")[0],
                "year": accession.split("-")[1],
                "doc_id":accession.split("-")[2]
            },
            "primaryDocument":listdata["primaryDocument"][i],
            "filingDate": listdata["filingDate"][i],
            "reportDate": listdata["reportDate"][i],
            "form": listdata["form"][i]
        }
        recentinfo.push(elem);
    }
    return recentinfo;
}
/**
 * Gets the CIK id of the company
 * @param ticker 
 * @returns {string}
 */
export function CIKFromTicker(ticker: string): string{
    
    const cacheExists: boolean = isCache("tickers.json");
    let data: { [num: string]:any}={};
    if (cacheExists) {
        /*
        {"0":{"cik_str":320193,"ticker":"AAPL","title":"Apple Inc."},
        */
        data = JSON.parse(fs.readFileSync(cachePath("tickers.json")).toString()) as TICKER_FILE;
    } else {
        const requestOptions = {
            method: 'GET',
            headers: headerPref
          };
          
        const response = syncfetch("https://www.sec.gov/files/company_tickers.json", requestOptions);
          
        data = response.json();
        setCache("tickers.json", JSON.stringify(data));
    }

    const elem = (getDictionaryValues(data) as TICKER_SET[]).find(element => element["ticker"] == ticker)
    
    if (elem == null)
        throw "You spelled the ticker wrong or the ticker cache has not been updated in a while";

    const cik: number = elem["cik_str"];
    const cik_str: string = cik.toString().padStart(10, '0');

    return cik_str;
}

