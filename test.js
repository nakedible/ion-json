const ionJson = require("./index.js");

console.log(ionJson.jsonToIonBinary({__ion: "int", value: "2147483646"}));
console.log(ionJson.ionToJson("{__ion: 'foo', a: 3e0, b: 3e0, a: 4e0, a: 5e0, a: 6 }"));
console.log(ionJson.ionToJson("{__ion: 'foo'}"));
console.log(ionJson.jsonToIonPretty(ionJson.ionToJson("{__ion: 'foo'}")));
console.log(ionJson.ionToJson(ionJson.jsonToIonBinary(ionJson.ionToJson("foo::bar::2147483647"))));
