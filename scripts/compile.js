const pegjs = require("pegjs");
const { readFileSync, writeFileSync, existsSync } = require("fs");
const { createHash } = require("crypto");
const path = require("path");

const srcFolder = path.resolve(__dirname, "..", "src");
const grammar = readFileSync(path.join(srcFolder, "parser.pegjs"), "utf-8");
const grammarHash = createHash("md5")
  .update(grammar)
  .digest("hex");
const outputPath = path.join(srcFolder, "parser.js");

const compile = () =>
  writeFileSync(
    outputPath,
    `// ${grammarHash}\n` +
      pegjs.generate(grammar, {
        output: "source",
        format: "commonjs",
      })
  );

if (existsSync(outputPath)) {
  const output = readFileSync(outputPath, "utf-8");
  const hash = output.slice(3, 35);
  if (hash === grammarHash) {
    console.log("Parser: Nothing to do.");
  } else {
    compile();
    console.log("Parser: Updated.");
  }
} else {
  compile();
  console.log("Parser: Generated.");
}
