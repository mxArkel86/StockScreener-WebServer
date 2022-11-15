import { chartRequest } from "./DataCompiler";

const http = require("http");
const hostname = "127.0.0.1";
const port = 3215;
const fs = require("fs");
var urlUtil = require('url');
const cwd = process.cwd();


function main(): void {

  const server = http.createServer((req: any, res: any) => {
    res.statusCode = 200;

    console.log("URL=" + req.url);
    const urlinfo = urlUtil.parse(req.url, true);
    
    const URL: string = urlinfo.pathname;
    const args: any = urlinfo.query;

    if (URL == "/") {
      const data: string = index();
      res.setHeader("Content-Type", "text/html");
      res.write(data);
      
      res.end("\n");
    } else if (URL.startsWith("/file/")) {
      const filename: string = URL.substring("/file/".length);

      if (filename.endsWith(".css")) {
        res.setHeader("Content-Type", "text/css");
      } else if (filename.endsWith(".js")) {
        res.setHeader("Content-Type", "text/javascript");
      } else {
        res.setHeader("Content-Type", "text/plain");
      }

      const data = fs.readFileSync(cwd + "/static/" + filename);
      res.write(data);

      res.end("\n");
    } else if (URL == "/getGraph.json") {

      const ticker = args["ticker"];
      const data = args["data"];

      var listdata: string[][] = JSON.parse(decodeURIComponent(data));

      var promises = chartRequest(ticker, listdata);
      for (var prom_ of promises) {
        prom_.then((buffer: any) => {
          res.write(buffer);
          res.end("");
        });
      }
    } else if(URL=="/favicon.ico") {
      res.end("\n");
    } else {
      throw "Unknown query"
    }
  });
  
  server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
  });
}

function index() {
  return fs.readFileSync(cwd + "/static/index.html");
}

main();
