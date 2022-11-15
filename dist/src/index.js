"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var DataCompiler_1 = require("./DataCompiler");
var http = require("http");
var hostname = "127.0.0.1";
var port = 3215;
var fs = require("fs");
var urlUtil = require('url');
var cwd = process.cwd();
function main() {
    var server = http.createServer(function (req, res) {
        res.statusCode = 200;
        console.log("URL=" + req.url);
        var urlinfo = urlUtil.parse(req.url, true);
        var URL = urlinfo.pathname;
        var args = urlinfo.query;
        if (URL == "/") {
            var data = index();
            res.setHeader("Content-Type", "text/html");
            res.write(data);
            res.end("\n");
        }
        else if (URL.startsWith("/file/")) {
            var filename = URL.substring("/file/".length);
            if (filename.endsWith(".css")) {
                res.setHeader("Content-Type", "text/css");
            }
            else if (filename.endsWith(".js")) {
                res.setHeader("Content-Type", "text/javascript");
            }
            else {
                res.setHeader("Content-Type", "text/plain");
            }
            var data = fs.readFileSync(cwd + "/static/" + filename);
            res.write(data);
            res.end("\n");
        }
        else if (URL == "/getGraph.json") {
            var ticker = args["ticker"];
            var data = args["data"];
            var listdata = JSON.parse(decodeURIComponent(data));
            var promises = (0, DataCompiler_1.chartRequest)(ticker, listdata);
            for (var _i = 0, promises_1 = promises; _i < promises_1.length; _i++) {
                var prom_ = promises_1[_i];
                prom_.then(function (buffer) {
                    res.write(buffer);
                    res.end("");
                });
            }
        }
        else if (URL == "/favicon.ico") {
            res.end("\n");
        }
        else {
            throw "Unknown query";
        }
    });
    server.listen(port, hostname, function () {
        console.log("Server running at http://".concat(hostname, ":").concat(port, "/"));
    });
}
function index() {
    return fs.readFileSync(cwd + "/static/index.html");
}
main();
//# sourceMappingURL=index.js.map