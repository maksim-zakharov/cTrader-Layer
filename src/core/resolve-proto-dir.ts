import * as fs from "fs";
import * as path from "path";

/**
 * Ищет каталог bundled proto-файлов Spotware.
 * Обходит родителей от каталога модуля и от cwd — работает и в CJS, и в ESM-бандле.
 * @param explicit - Явно заданный путь
 * @returns Абсолютный путь к openapi-proto-messages-main
 */
export function resolveProtoDir (explicit?: string): string {
    if (explicit) {
        return path.resolve(explicit);
    }

    const starts: string[] = [ process.cwd(), ];

    if (typeof __dirname !== "undefined") {
        starts.unshift(__dirname);
    }

    for (const start of starts) {
        let current = start;

        for (let depth = 0; depth < 10; depth++) {
            const candidate = path.join(current, "openapi-proto-messages-main");

            if (fs.existsSync(path.join(candidate, "OpenApiMessages.proto"))) {
                return candidate;
            }

            const parent = path.dirname(current);

            if (parent === current) {
                break;
            }

            current = parent;
        }
    }

    throw new Error("Не найден каталог proto-файлов openapi-proto-messages-main");
}
