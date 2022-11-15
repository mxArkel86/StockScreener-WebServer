const fs = require("fs")

export function isCache(filename: string): boolean {
    var entries: string[] = fs.readdirSync(cachePath(""));

    if (entries.includes(filename))
        return true;
    else
        return false;
}

export function setCache(filename: string, data:string): void{
    fs.writeFileSync(cachePath(filename), data);
}

export function cachePath(filename: string): string{
    return "cache/" + filename;
}