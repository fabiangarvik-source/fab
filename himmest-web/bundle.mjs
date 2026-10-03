// Joins src/*.js into app.js (one scope, wrapped so nothing leaks to window).
import fs from "node:fs";
const parts = fs.readdirSync("src").filter(f => f.endsWith(".js")).sort().map(f => `/* ---- ${f} ---- */\n` + fs.readFileSync(`src/${f}`, "utf8"));
fs.writeFileSync("app.js", "(() => {\n" + parts.join("\n") + "\n})();\n");
console.log("app.js", fs.statSync("app.js").size, "bytes");
