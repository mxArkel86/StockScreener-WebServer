"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CIKFromTicker = exports.getSubmissionData = exports.getPrimaryReport = exports.getMostRecentReport = exports.saveExcelDoc = void 0;
var syncfetch = require('sync-fetch');
var fs = require('fs');
var execSync = require('child_process').execSync;
var DataUtil_1 = require("./util/DataUtil");
var CacheManager_1 = require("./sys/CacheManager");
var headerPref = {
    "User-Agent": "Nicholas Kading Personal nicholas.lkading@outlook.com"
};
/**
 * Saves the excel doc associated with the report to a local directory. It then returns its file
 * @param {string} cik
 * @param {ReportInfo} inf
 * @returns
 */
function saveExcelDoc(cik, inf) {
    var requestOptions = {
        method: 'GET',
        headers: headerPref
    };
    var filename = inf.accessionNumberRaw + ".xlsx";
    var cacheExists = (0, CacheManager_1.isCache)(filename);
    if (!cacheExists) {
        var url = "https://www.sec.gov/Archives/edgar/data/".concat(cik.replace("^(0)+", ""), "/").concat(inf.accessionNumberParts.filer_id).concat(inf.accessionNumberParts.year).concat(inf.accessionNumberParts.doc_id, "/Financial_Report.xlsx");
        var command = "curl \"".concat(url, "\" --silent --location --header \"User-Agent: ").concat(headerPref["User-Agent"], "\" --output \"").concat((0, CacheManager_1.cachePath)(filename), "\"");
        execSync(command);
    }
    return (0, CacheManager_1.cachePath)(filename);
}
exports.saveExcelDoc = saveExcelDoc;
function getMostRecentReport(cik, formtypes) {
    return getSubmissionData(cik, formtypes, 1)[0];
}
exports.getMostRecentReport = getMostRecentReport;
/**
 * Gets the primary document associated with the report, and returns its text data
 * @param {string} cik
 * @param {ReportInfo} inf
 * @returns
 */
function getPrimaryReport(cik, inf) {
    var requestOptions = {
        method: 'GET',
        headers: headerPref
    };
    var response = syncfetch("https://www.sec.gov/Archives/edgar/data/".concat(cik.replace("^(0)+", ""), "/").concat(inf.accessionNumberParts.filer_id).concat(inf.accessionNumberParts.year).concat(inf.accessionNumberParts.doc_id, "/").concat(inf.primaryDocument), requestOptions);
    var strdata = response.text();
    return strdata;
}
exports.getPrimaryReport = getPrimaryReport;
/**
 * Gets a list of the most recent reports for a company
 * @param {string} cik
 * @param {string[]} formtypes
 * @param {number} maxfetch
 * @returns
 */
function getSubmissionData(cik, formtypes, maxfetch) {
    var requestOptions = {
        method: 'GET',
        headers: headerPref
    };
    var cacheExists = (0, CacheManager_1.isCache)("CIK".concat(cik, ".json"));
    var data;
    if (cacheExists) {
        data = JSON.parse(fs.readFileSync((0, CacheManager_1.cachePath)("CIK".concat(cik, ".json"))));
    }
    else {
        var response = syncfetch("https://data.sec.gov/submissions/CIK".concat(cik, ".json"), requestOptions);
        var data = response.json();
        (0, CacheManager_1.setCache)("CIK".concat(cik, ".json"), JSON.stringify(data));
    }
    var listdata = data["filings"]["recent"];
    var recentinfo = [];
    for (var i = 0; i < listdata["accessionNumber"].length && recentinfo.length < maxfetch; i++) {
        if (!formtypes.includes(listdata["form"][i]))
            continue;
        var accession = listdata["accessionNumber"][i];
        var elem = {
            "accessionNumberRaw": listdata["accessionNumber"][i],
            "accessionNumberParts": {
                "filer_id": accession.split("-")[0],
                "year": accession.split("-")[1],
                "doc_id": accession.split("-")[2]
            },
            "primaryDocument": listdata["primaryDocument"][i],
            "filingDate": listdata["filingDate"][i],
            "reportDate": listdata["reportDate"][i],
            "form": listdata["form"][i]
        };
        recentinfo.push(elem);
    }
    return recentinfo;
}
exports.getSubmissionData = getSubmissionData;
/**
 * Gets the CIK id of the company
 * @param ticker
 * @returns {string}
 */
function CIKFromTicker(ticker) {
    var cacheExists = (0, CacheManager_1.isCache)("tickers.json");
    var data = {};
    if (cacheExists) {
        data = JSON.parse(fs.readFileSync((0, CacheManager_1.cachePath)("tickers.json")));
    }
    else {
        var requestOptions = {
            method: 'GET',
            headers: headerPref
        };
        var response = syncfetch("https://www.sec.gov/files/company_tickers.json", requestOptions);
        data = response.json();
        (0, CacheManager_1.setCache)("tickers.json", JSON.stringify(data));
    }
    var elem = (0, DataUtil_1.getDictionaryValues)(data).find(function (element) { return element["ticker"] == ticker; });
    var cik = elem["cik_str"];
    var cik_str = cik.toString().padStart(10, '0');
    return cik_str;
}
exports.CIKFromTicker = CIKFromTicker;
//# sourceMappingURL=FetchUtil.js.map