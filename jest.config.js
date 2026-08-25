/** @type {import("jest").Config} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: [ "<rootDir>/src", ],
    testMatch: [ "**/*.spec.ts", ],
    moduleNameMapper: {
        "^#(.*)$": "<rootDir>/src/core/$1",
        "^!/(.*)$": "<rootDir>/$1",
    },
    transform: {
        "^.+\\.ts$": [ "ts-jest", { tsconfig: "tsconfig.spec.json", }, ],
    },
    clearMocks: true,
};
