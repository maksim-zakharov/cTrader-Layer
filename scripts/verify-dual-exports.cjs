/**
 * Smoke CJS require через package exports (как Nest / Node require).
 */
const path = require("path");
const pkgRoot = path.resolve(__dirname, "..");
const api = require(pkgRoot);

if (typeof api.CTraderConnection !== "function") {
    console.error("CJS require: CTraderConnection не найден");
    process.exit(1);
}

if (typeof api.CTraderCommandError !== "function") {
    console.error("CJS require: CTraderCommandError не найден");
    process.exit(1);
}

console.log("CJS package exports OK");
