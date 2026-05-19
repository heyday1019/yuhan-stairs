const assert = require("node:assert/strict");

const exported = require("../src/index.js");

assert.deepEqual(exported, {});

console.log("utils basic test passed");
