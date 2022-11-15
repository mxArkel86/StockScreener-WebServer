"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cachePath = exports.setCache = exports.isCache = void 0;
var fs = require("fs");
function isCache(filename) {
    var entries = fs.readdirSync(cachePath(""));
    if (entries.includes(filename))
        return true;
    else
        return false;
}
exports.isCache = isCache;
function setCache(filename, data) {
    fs.writeFileSync(cachePath(filename), data);
}
exports.setCache = setCache;
function cachePath(filename) {
    return "cache/" + filename;
}
exports.cachePath = cachePath;
//# sourceMappingURL=CacheManager.js.map