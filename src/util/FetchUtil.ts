const syncfetch = require('sync-fetch')
const fs = require('fs');
const execSync = require('child_process').execSync;

import { getDictionaryValues } from "./DataUtil";
import {setCache, cachePath, isCache} from "../sys/CacheManager"

export type ReportInfo = {
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

var headerPref = {
    "User-Agent": "Nicholas Kading Personal nicholas.lkading@outlook.com"
}

/**
 * Saves the excel doc associated with the report to a local directory. It then returns its file
 * @param {string} cik 
 * @param {ReportInfo} inf 
 * @returns 
 */
export function saveExcelDoc(cik: string, inf:ReportInfo) {
    var requestOptions = {
        method: 'GET',
        headers: headerPref
    };
    
    var filename:string = inf.accessionNumberRaw + ".xlsx";
    var cacheExists = isCache(filename);

    if (!cacheExists) {
        var url = `https://www.sec.gov/Archives/edgar/data/${cik.replace("^(0)+", "")}/${inf.accessionNumberParts.filer_id}${inf.accessionNumberParts.year}${inf.accessionNumberParts.doc_id}/Financial_Report.xlsx`;
    
    
        var command = `curl "${url}" --silent --location --header "User-Agent: ${headerPref["User-Agent"]}" --output "${cachePath(filename)}"`;
        execSync(command);
        
    }
    return cachePath(filename);
}

export function getMostRecentReport(cik:string, formtypes:string[]):ReportInfo {
   return getSubmissionData(cik, formtypes, 1)[0];
}

/**
 * Gets the primary document associated with the report, and returns its text data
 * @param {string} cik 
 * @param {ReportInfo} inf 
 * @returns 
 */
export function getPrimaryReport(cik:string, inf: ReportInfo) {
    var requestOptions = {
        method: 'GET',
        headers: headerPref
      };
      
    var response = syncfetch(`https://www.sec.gov/Archives/edgar/data/${cik.replace("^(0)+", "")}/${inf.accessionNumberParts.filer_id}${inf.accessionNumberParts.year}${inf.accessionNumberParts.doc_id}/${inf.primaryDocument}`, requestOptions);
    
    var strdata: string = response.text();
    return strdata;
}
/**
 * Gets a list of the most recent reports for a company
 * @param {string} cik 
 * @param {string[]} formtypes 
 * @param {number} maxfetch 
 * @returns 
 */
export function getSubmissionData(cik: string, formtypes:string[], maxfetch:number):ReportInfo[] {
    
    var requestOptions = {
        method: 'GET',
        headers: headerPref
    };
    
    var cacheExists: boolean = isCache(`CIK${cik}.json`);
    
    var data: any;
    if (cacheExists) {
        data = JSON.parse(fs.readFileSync(cachePath(`CIK${cik}.json`)));
    } else {
        var response = syncfetch(`https://data.sec.gov/submissions/CIK${cik}.json`, requestOptions);
        var data = response.json()
        
        setCache(`CIK${cik}.json`, JSON.stringify(data));
        
    }
      
    var listdata = data["filings"]["recent"]
    
    let recentinfo: ReportInfo[] = [];
    for (var i = 0; i < listdata["accessionNumber"].length && recentinfo.length<maxfetch;i++) {
        
        if (!formtypes.includes(listdata["form"][i]))
            continue;
        
        var accession: string = listdata[`accessionNumber`][i];
        
        var elem:ReportInfo = {
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
    
    var cacheExists: boolean = isCache("tickers.json");
    var data: { [num: string]:any}={};
    if (cacheExists) {
        data = JSON.parse(fs.readFileSync(cachePath("tickers.json")));
    } else {
        var requestOptions = {
            method: 'GET',
            headers: headerPref
          };
          
        var response = syncfetch("https://www.sec.gov/files/company_tickers.json", requestOptions);
          
        data = response.json();
        setCache("tickers.json", JSON.stringify(data));
    }

    var elem = getDictionaryValues(data).find(element => element["ticker"] == ticker)
    
    if (elem == undefined)
        throw "You spelled the ticker wrong or the ticker cache has not been updated in a while";

    var cik: number = elem["cik_str"];
    var cik_str: string = cik.toString().padStart(10, '0');

    return cik_str;
}

