const globals = require("globals");
const tseslint = require("typescript-eslint");

/**
 * Flat ESLint 9: стиль близкий к прежнему @reiryoku/eslint-config-reiryoku.
 */
module.exports = tseslint.config(
    {
        ignores: [
            "build/**",
            "node_modules/**",
            ".idea/**",
            "openapi-proto-messages-main/**",
            "scripts/**",
            "eslint.config.js",
            "jest.config.js",
            "tsup.config.js",
            "**/*.spec.ts",
            "src/core/__tests__/**",
        ],
    },
    ...tseslint.configs.recommended,
    {
        files: [ "**/*.ts", ],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "commonjs",
            globals: {
                ...globals.node,
            },
            parserOptions: {
                projectService: true,
                tsconfigRootDir: __dirname,
            },
        },
        rules: {
            "@typescript-eslint/explicit-function-return-type": "error",
            "@typescript-eslint/no-empty-object-type": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unused-vars": [ "error", {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
            }, ],
            "array-bracket-spacing": [ "error", "always", ],
            "arrow-parens": [ "error", "always", ],
            "brace-style": [ "error", "stroustrup", ],
            "comma-dangle": [ "error", {
                arrays: "always",
                objects: "always",
                imports: "always-multiline",
                exports: "always-multiline",
                functions: "never",
            }, ],
            "comma-spacing": "error",
            complexity: [ "error", 20, ],
            curly: [ "error", "all", ],
            "eol-last": "error",
            "function-paren-newline": [ "error", { minItems: 5, }, ],
            indent: [ "error", 4, {
                SwitchCase: 1,
                flatTernaryExpressions: false,
                offsetTernaryExpressions: false,
                ignoreComments: false,
            }, ],
            "max-len": [ "error", { code: 150, }, ],
            "no-duplicate-imports": "error",
            "no-trailing-spaces": "error",
            "object-curly-newline": [ "error", {
                multiline: true,
                minProperties: 3,
                consistent: true,
            }, ],
            quotes: [ "error", "double", ],
            semi: [ "error", "always", ],
            "space-before-function-paren": "error",
        },
    },
);
