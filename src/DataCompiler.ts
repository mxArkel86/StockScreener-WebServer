import { FindocBalanceSheet, FindocBalanceSheet_EMPTY, FindocCashFlow, FindocCashFlow_EMPTY, FindocCoverPage, getBalanceSheet, getDate, getIdentifyingInformation, getIncomeStatement, FindocIncomeStatement, FindocIncomeStatement_EMPTY, PropertySet, FindocCoverPage_EMPTY } from './FinancialDocumentParser'
import { CIKFromTicker, getSubmissionData, EDGARReportInfo, saveExcelDoc } from './net/EDGARFetchUtil'
import { createChart } from './util/ChartUtil'
import { date_range, getFormattedStockPriceData, getStockPriceHistory } from './net/YahooFinanceFetch'
import { getDictionaryValues, getMonthString, evaluateExpression, combinePropertySet } from './util/DataUtil'
import { getExcelJSON } from './util/ExcelUtil'
import fs from 'fs'

export interface ReportDecodedData {
  'Cover': FindocCoverPage
  'Income-statement': FindocIncomeStatement
  'Balance-sheet': FindocBalanceSheet
  'Cash-flow': FindocCashFlow
}
export type ConfigIdentitySet = {
    tag:string,
    path:string,
    search_terms:string[]
    
}
export type ConfigIdentity = {
    main: {
        search_terms:string,
        examples:string[]
    },
    properties:
    {[name:string]:ConfigIdentitySet}
}

export function ReportDecodedData_EMPTY (): ReportDecodedData {
  return {
    Cover: FindocCoverPage_EMPTY(),
    'Income-statement': FindocIncomeStatement_EMPTY(),
    'Balance-sheet': FindocBalanceSheet_EMPTY(),
    'Cash-flow': FindocCashFlow_EMPTY()
  }
}

/**
 * Inserts values in the place of variable names given by the parameters of each financial statement
 * @param expression
 * @param config_data
 * @param values
 * @returns
 */
function insertExpressionVariables (expression: string, configData: ConfigIdentity, values: PropertySet): string {
  const elems = getDictionaryValues(configData.properties)
  for (let i = 0; i < elems.length; i++) {
    // console.log(JSON.stringify(values));
    // console.log(elems[i]["path"]);
    // if it is erroring here, it means the path is spelled wrong in the config
    const set:ConfigIdentitySet = elems[i] as ConfigIdentitySet;
    expression = expression.replace(set.tag, values[set.path].value.toString())
  }
  return expression
}

export function chartHybrid (ticker: string, quarters: number, frequency: date_range, functions_: string[]): [string[], number[][]] {
  const cik = CIKFromTicker(ticker)

  const decoded_data_infrequent = dataCompiler(cik, quarters)
  const earliest_date = decoded_data_infrequent[0][0]

  const freq_data: Array<[Date, number]> = getFormattedStockPriceData(getStockPriceHistory(ticker, frequency, earliest_date, new Date(Date.now())))

  const latest_date: Date = freq_data[freq_data.length - 1][0]

  const x_vals =  Array(freq_data.length).fill('')
  for (let i = 0; i < decoded_data_infrequent.length; i++) {
    const date = decoded_data_infrequent[i][0]
    const index_top = freq_data.findIndex(x => x[0].getTime() >= date.getTime())

    console.log(index_top)
    x_vals[index_top] = `${getMonthString(date.getUTCMonth())} ${date.getUTCFullYear()}`
  }

  x_vals[x_vals.length - 1] = `${getMonthString(latest_date.getUTCMonth())} ${latest_date.getUTCFullYear()}`

  const y_vals: number[][] = []
  for (let j = 0; j < functions_.length; j++) {
    const func_ = functions_[j]

    const y_val_set: number[] = []

    for (let i = 0; i < freq_data.length; i++) {
      const date = freq_data[i][0]
      const val = freq_data[i][1]

      let findoc_index = decoded_data_infrequent.findIndex((x) => (x[0].getTime() > date.getTime())) - 1
      findoc_index = findoc_index < 0 ? decoded_data_infrequent.length - 1 : findoc_index

      const findoc_data = decoded_data_infrequent[findoc_index][1]

      let substituted_func = substituteFindocVariables(func_, findoc_data)

      substituted_func = substituted_func.replace('STOCK', val.toString())

      const y_val: number = evaluateExpression(substituted_func)

      y_val_set.push(y_val)
    }
    y_vals.push(y_val_set)
  }
  console.log(x_vals)
  return [x_vals, y_vals]
}

function substituteFindocVariables (func: string, alldat: ReportDecodedData): string {
  const income_data: FindocIncomeStatement = alldat['Income-statement']
  const balance_data: FindocBalanceSheet = alldat['Balance-sheet']

  const income_config:ConfigIdentity = JSON.parse(fs.readFileSync('configs/IncomeStatementIdentity.json').toString())
  const balance_config:ConfigIdentity = JSON.parse(fs.readFileSync('configs/BalanceSheetIdentity.json').toString())
  const balance_parenthetical_config:ConfigIdentity = JSON.parse(fs.readFileSync('configs/BalanceSheetParentheticalIdentity.json').toString())

  let substituted_func: string = func

  substituted_func = insertExpressionVariables(substituted_func, income_config, income_data)

  substituted_func = insertExpressionVariables(substituted_func, balance_config, balance_data)

  substituted_func = insertExpressionVariables(substituted_func, balance_parenthetical_config, balance_data)
  return substituted_func
}

export function chartInfrequent (ticker: string, quarters: number, functions_: string[]): [string[], number[][]] {
  const cik = CIKFromTicker(ticker)

  const y_vals: number[][] = []

  const decoded_data = dataCompiler(cik, quarters)

  const x_vals = decoded_data.map(x => `${getMonthString(x[0].getUTCMonth())} ${x[0].getUTCFullYear()}`)

  for (const j in functions_) {
    const y_val_set: number[] = []
    const func: string = functions_[j]

    for (const alldat of decoded_data) {
      const substituted_func = substituteFindocVariables(func, alldat[1])
      const y_val: number = evaluateExpression(substituted_func)

      y_val_set.push(y_val)
    }
    y_vals.push(y_val_set)
  }
  return [x_vals, y_vals]
}

export function chartRequest (ticker: string, listdata: string[][]): Array<Promise<Buffer>> {
  const quarters = 4

  const line_titles: string[] = listdata.map(x => x[0])
  const colors: string[] = listdata.map(x => x[2])
  const functions_: string[] = listdata.map(x => x[1])

  let raw_data = []
  if (functions_.findIndex(x => x.includes('STOCK')) != -1) {
    raw_data = chartHybrid(ticker, quarters, date_range.day, functions_)
  } else {
    raw_data = chartInfrequent(ticker, quarters, functions_)
  }

  const promises: Array<Promise<Buffer>> = []
  for(let i = 0;i<listdata.length;i++){
    const prom_ = createChart(raw_data[0], raw_data[1], line_titles, colors, 1300, 500)
    promises.push(prom_)
  }
  return promises
}

/**
 * Get the JSON data to a report without clutter
 * @param report
 * @returns
 */
function getJSONBrief (report: EDGARReportInfo) {
  const year_path = saveExcelDoc(report)
  const yearly_data = getExcelJSON(year_path)
  return yearly_data
}

/**
 * Get the last quarter's info by Q4=YR-Q1-Q2-Q3
 * @param cik
 * @param yearly
 * @param q1
 * @param q2
 * @param q3
 * @returns
 */
function getRemainderSet (cik: string, yearly: PropertySet, q1: PropertySet, q2: PropertySet, q3: PropertySet) {
  let out_data: PropertySet = yearly

  const sub_func = (a: number | null, b: number | null) => {
    if (a != null && b != null) {
      return a - b
    } else {
      return null
    }
  }

  out_data = combinePropertySet(out_data, q1, sub_func)
  out_data = combinePropertySet(out_data, q2, sub_func)
  out_data = combinePropertySet(out_data, q3, sub_func)
  return out_data
}

/**
 * Compiles financial data by the quarter dates
 * @param cik
 * @param quarters
 * @returns
 */
export function dataCompiler (cik: string, quarters: number): Array<[Date, ReportDecodedData]> {
  const submissionData: EDGARReportInfo[] = getSubmissionData(cik, ['10-K', '10-Q'], quarters + 3)

  const out_data: Array<[Date, ReportDecodedData]> = []

  for (let quarter = 0; quarter < quarters; quarter++) {
    const filepath = saveExcelDoc(submissionData[quarter])

    const json_data = getExcelJSON(filepath)
    const document_info: FindocCoverPage = getIdentifyingInformation(json_data)
    const date = getDate(json_data)

    if (date[1].length == 0) { throw 'Date not fetched' }

    // console.log(`--- path=[${filepath}] date=[${date}]`);

    const out_set: ReportDecodedData = {
      Cover: FindocCoverPage_EMPTY(),
      'Income-statement': FindocIncomeStatement_EMPTY(),
      'Balance-sheet': FindocBalanceSheet_EMPTY(),
      'Cash-flow': FindocCashFlow_EMPTY()
    }

    out_set['Balance-sheet'] = getBalanceSheet(json_data)
    out_set.Cover = getIdentifyingInformation(json_data)

    if (document_info.type == '10-Q') {
      out_set['Income-statement'] = getIncomeStatement(json_data)
    } else {
      // console.log(filepath);
      const q1_json = getJSONBrief(submissionData[quarter + 1])
      const q2_json = getJSONBrief(submissionData[quarter + 2])
      const q3_json = getJSONBrief(submissionData[quarter + 3])

      out_set['Income-statement'] = getRemainderSet(cik, getIncomeStatement(json_data),
        getIncomeStatement(q1_json),
        getIncomeStatement(q2_json),
        getIncomeStatement(q3_json)) as FindocIncomeStatement
      console.log(`yin=${getIncomeStatement(json_data).revenue.value}  q3=${getIncomeStatement(q1_json).revenue.value} q2=${getIncomeStatement(q2_json).revenue.value} q1=${getIncomeStatement(q3_json).revenue.value} yout=${out_set['Income-statement'].revenue.value}`)
    }

    out_data.push([date[0], out_set])
  }
  return out_data.reverse()
}
