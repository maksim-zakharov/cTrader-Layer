import * as fs from "fs";
import * as path from "path";

/**
 * Ищет каталог bundled proto-файлов Spotware.
 * @param explicit - Явно заданный путь
 * @returns Абсолютный путь к openapi-proto-messages-main
 */
export function resolveProtoDir (explicit?: string): string {
    if (explicit) {
        return path.resolve(explicit);
    }

    const candidates = [
        path.resolve(__dirname, "../../openapi-proto-messages-main"),
        path.resolve(__dirname, "../../../openapi-proto-messages-main"),
        path.resolve(process.cwd(), "openapi-proto-messages-main"),
    ];

    for (const dir of candidates) {
        if (fs.existsSync(path.join(dir, "OpenApiMessages.proto"))) {
            return dir;
        }
    }

    throw new Error("Не найден каталог proto-файлов openapi-proto-messages-main");
}
