/**
 * Smoke: require (CJS) и import (ESM) резолвят публичный API пакета.
 * Запускать после npm run build из корня репозитория.
 */
import { createRequire } from "module";
import { pathToFileURL } from "url";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "package.json"));

const cjs = require(root);
const missingCjs = [ "CTraderConnection", "CTraderCommandError", ].filter((name) => typeof cjs[name] !== "function");

if (missingCjs.length > 0) {
    console.error("CJS: нет экспортов:", missingCjs.join(", "));
    process.exit(1);
}

const esmPath = pathToFileURL(path.join(root, "build", "main.mjs")).href;
const esm = await import(esmPath);
const missingEsm = [ "CTraderConnection", "CTraderCommandError", ].filter((name) => typeof esm[name] !== "function");

if (missingEsm.length > 0) {
    console.error("ESM: нет экспортов:", missingEsm.join(", "));
    process.exit(1);
}

console.log("dual exports OK: require + import");
