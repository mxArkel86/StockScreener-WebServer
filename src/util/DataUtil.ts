import { FormattedDataValue } from 'FinancialDocumentParser'

import { addDays, addMonths, addYears } from 'date-fns'
import { Parser as MathParser } from 'expr-eval'


export function evaluateExpression (exp: string): number {
  try {
    return MathParser.evaluate(exp)
  } catch (e) {
    throw new Error('EXP=' + exp)
  }
}

export function weighted_average (left: [number, number], right: [number, number], x_val: number) {
  const dist_total = Math.abs(left[0] - right[0])

  const weight_left = Math.abs(x_val - right[0]) / dist_total
  const weight_right = Math.abs(x_val - left[0]) / dist_total
  return left[1] * weight_left + right[1] * weight_right
}

export function getDictionaryValues (dict_: { [name: string | number]: unknown }): unknown[] {
  if (dict_ == null) { return [] }
  const values = Object.keys(dict_).map((key) => {
    return dict_[key]
  })
  return values
}
export function getDictionaryKeys (dict_: { [name: string | number]: unknown }): unknown[] {
  if (dict_ == null) { return [] }
  return Object.keys(dict_)
}

export function valueInSearchTerms (searchTerms: string[], val: string): boolean {
  return (searchTerms.map(x => normStr(x)).includes(normStr(val)))
}

export function normStr (val: string): string {
  return val.toLowerCase().replace(/[^A-z ]/g, '').replace(/[ ]+/g, ' ').trim()
}
export function normStrStrong (val: string): string {
  const str = val.toLowerCase().replace(/\([^()]*\)/g, '').replace(/\[[^[\]]*\]/g, '')
    .replace(/[^A-z ]/g, '').replace(/[ ]+/g, ' ').trim()
  return str
}

export function normNum (val: string): string {
  const str: string = val + ''
  // eslint-disable-next-line no-useless-escape
  return str.replace(/[^\d-\.]/g, '')
}

export function getMonthString (num: number): string {
  const months: string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  if (num < 1 || num > 12) { return 'NULL MONTH' } else { return months[num - 1] }
}
export function offsetDate (datein: Date, years: number, months: number, days: number): Date {
  let date = addYears(datein, years)
  date = addMonths(date, months)
  date = addDays(date, days)
  return date
}

export function isNumeric (num: number): boolean {
  return !isNaN(num)
}

export function isEmptyString (str: string): boolean {
  return str.replace(/[\s]*/g, '').length == 0
}

export function combinePropertySet (a: { [val: string]: FormattedDataValue }, b: { [val: string]: FormattedDataValue }, callback: (a: number | null, b: number | null) => number | null): { [val: string]: FormattedDataValue } {
  const data_out: { [val: string]: FormattedDataValue } = {}
  for (const prop in b) {
    const data = combineDataSets(a[prop], b[prop], callback)
    data_out[prop] = data
  }

  return data_out
}

export function combineDataSets (a: FormattedDataValue, b: FormattedDataValue, callback: (a: number | null, b: number | null) => number | null): FormattedDataValue {
  // const get_invalid: () => FormattedDataValue = () => {
  //   return {
  //     value: 0,
  //     is_set: false
  //   }
  // }

  const output = callback(a.is_set ? a.value : null, b.is_set ? b.value : null)
  if (output != null) {
    return {
      value: output,
      is_set: true
    }
  } else {
    return {
      value: 0,
      is_set: false
    }
  }
}

export function EXC_OR (a: number | null, b: number | null): number | null {
  if (a == null && b != null) {
    return b
  } else if (a != null && b == null) {
    return a
  } else if (a != null || b != null) {
    throw 'both gave a value'
  } else {
    return null
  }
}

export function onValid (funcin: (a: number, b: number) => number):
((a: number | null, b: number | null) => number | null) {
  const newfunc = (a: number | null, b: number | null) => {
    if (a != null && b != null) {
      return funcin(a, b)
    } else {
      return null
    }
  }
  return newfunc
}

export function dataIsEmpty (a: FormattedDataValue) {
  if (a.value == 0) { return true }
  return false
}

export function anyAreInvalid (...args: Array<string | number>) {
  for (const value of args) {
    if (typeof (value) === 'string') {
      const str: string = value
      if (!str || str.length == 0) {
        return true
      }
    } else if (typeof (value) === 'number') {
      const num: number = value
      if (num == -1) {
        return true
      }
    }
  }
  return false
}
