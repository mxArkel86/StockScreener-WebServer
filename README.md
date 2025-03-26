# StockScreener
This is a demo web server written in TypeScript and using the node http package.

- It pulls data from the SECs public EDGAR database about stock information
- It parses the spreadsheet data and converts it into datapoints
- Then it sends the data to a frontend

![img](/Users/nicho/GitHub/StockScreener/img.png)

Additionally, the web server caches EDGAR files and uses config files to ease in customizing behavior.
