const https = require("https");
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

const ROOT = path.resolve(__dirname, "..");
const ZIP_URL = "https://github.com/spotware/openapi-proto-messages/archive/refs/heads/main.zip";
const ZIP_PATH = path.join(ROOT, "proto.zip");
const VERSION_PATH = path.join(ROOT, "PROTO_VERSION");

/**
 * Скачивает zip с редиректами GitHub.
 * @param url - Исходный URL
 * @returns Promise без значения
 */
function download (url) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, {
            headers: { "User-Agent": "ctrader-layer", },
        }, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                response.resume();
                download(response.headers.location).then(resolve).catch(reject);

                return;
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Не удалось скачать proto: HTTP ${response.statusCode}`));

                return;
            }

            const file = fs.createWriteStream(ZIP_PATH);

            response.pipe(file);
            file.on("finish", () => file.close(resolve));
            file.on("error", reject);
        });

        request.on("error", reject);
    });
}

async function main () {
    console.log(`Скачиваю proto: ${ZIP_URL}`);
    await download(ZIP_URL);

    const zip = new AdmZip(ZIP_PATH);

    zip.extractAllTo(ROOT, true);
    fs.unlinkSync(ZIP_PATH);

    const stamp = [
        `source=${ZIP_URL}`,
        `pulledAt=${new Date().toISOString()}`,
    ].join("\n");

    fs.writeFileSync(VERSION_PATH, `${stamp}\n`, "utf8");
    console.log("Proto-файлы обновлены (openapi-proto-messages-main)");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
