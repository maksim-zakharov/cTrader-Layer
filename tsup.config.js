const fs = require("fs");
const path = require("path");

/**
 * Резолвит путь к файлу с типичными расширениями TypeScript.
 * @param {string} basePath - Путь без расширения или к директории
 * @returns {string | undefined}
 */
function resolveTsFile (basePath) {
    const candidates = [
        basePath,
        `${basePath}.ts`,
        `${basePath}.tsx`,
        path.join(basePath, "index.ts"),
        path.join(basePath, "index.tsx"),
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            return candidate;
        }
    }

    return undefined;
}

/**
 * Резолв алиасов `#*` → src/core и `!/` → корень репозитория для esbuild/tsup.
 */
function pathAliasesPlugin () {
    return {
        name: "ctrader-path-aliases",
        setup (build) {
            build.onResolve({ filter: /^#/, }, (args) => {
                const resolved = resolveTsFile(path.resolve(__dirname, "src/core", args.path.slice(1)));

                if (!resolved) {
                    return { path: args.path, errors: [ { text: `Не найден алиас ${args.path}`, }, ], };
                }

                return { path: resolved, };
            });
            build.onResolve({ filter: /^!\//, }, (args) => {
                const resolved = resolveTsFile(path.resolve(__dirname, args.path.slice(2)));

                if (!resolved) {
                    return { path: args.path, errors: [ { text: `Не найден алиас ${args.path}`, }, ], };
                }

                return { path: resolved, };
            });
        },
    };
}

/** @type {import("tsup").Options} */
module.exports = {
    entry: {
        main: "entry/node/main.ts",
    },
    format: [ "cjs", "esm", ],
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: "build",
    target: "node18",
    platform: "node",
    splitting: false,
    treeshake: true,
    external: [ "axios", "protobufjs", ],
    tsconfig: "tsconfig.build.json",
    outExtension ({ format, }) {
        return {
            js: format === "esm" ? ".mjs" : ".js",
        };
    },
    esbuildPlugins: [ pathAliasesPlugin(), ],
};
