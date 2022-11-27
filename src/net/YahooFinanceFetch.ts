const syncfetch = require('sync-fetch')

var headerPref = {
    "User-Agent": "Nicholas Kading Personal nicholas.lkading@outlook.com"
}

export enum date_range {
    day="1d",
    shortweek = "5d",
    month = "1m",
    quarter = "3m"
}

export function getCurrentDate() {
    return Date.now();
}

export function getStockPriceHistory(ticker:string,range:date_range, startDate:Date, endDate:Date){
    var requestOptions = {
        method: 'GET',
        headers: headerPref
      };
      
    var response = syncfetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${range}&period1=${Math.round(startDate.getTime()/1000)}&period2=${Math.round(endDate.getTime()/1000)}`, requestOptions);
      
    var data = response.json();
    //console.log(JSON.stringify(data));
    return data;
}

export function getFormattedStockPriceData(json_data: any):[Date,number][] {
    var timestamps:number[] = json_data["chart"]["result"][0]["timestamp"];
    var quotes:{[name:string]:number[]} = json_data["chart"]["result"][0]["indicators"]["quote"][0];
    
    var new_freq_data:[Date, number][] = [];
    for (var i = 0; i < timestamps.length; i++){
        var date = new Date(timestamps[i]*1000);
        // console.log(date);
        var price = (quotes["close"][i] + quotes["open"][i]) / 2;
        new_freq_data.push([date, price]);
    }
    
    return new_freq_data;
}