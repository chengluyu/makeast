#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { parse } = require("./parser");
const Context = require("./context");

function buildErrorMessage(e) {
  return e.location !== undefined
    ? `Line ${e.location.start.line}, column ${e.location.start.column}: ${e.message}`
    : e.message;
}

function main() {
  const argv = require("yargs")
    .option("module", {
      alias: "m",
      default: "esmodule",
    })
    .option("language", {
      alias: "l",
      default: "typescript",
    })
    .option("output", {
      alias: "o",
      default: null,
    })
    .option("print-width", {
      alias: "p",
      default: 120,
    }).argv;

  if (argv.module !== "esmodule" && argv.module !== "commonjs") {
    console.log(`Module can only be either "esmodule" or "commonjs"`);
    return;
  }

  if (argv.language !== "typescript" && argv.language !== "javascript") {
    console.log(`Language can only be either "typescript" or "javascript"`);
    return;
  }
  if (argv.language === "typescript" && argv.module !== "esmodule") {
    argv.module = "esmodule";
  }

  const transpiler = new Context({
    module: argv.module,
    language: argv.language,
    style: {
      tabWidth: argv.tabWidth,
      printWidth: argv["print-width"],
    },
  });
  transpiler.registerDecorator("factory", require("./plugins/factory"));
  transpiler.registerDecorator("import", require("./plugins/import"));
  transpiler.registerDecorator("interface", require("./plugins/interface"));
  transpiler.registerDecorator("tag", require("./plugins/tag"));
  transpiler.registerDecorator("visitor", require("./plugins/visitor"));

  transpiler.setDefaultDecorator("import");
  if (argv.language === "typescript") {
    transpiler.setDefaultDecorator("interface");
  }

  let source;
  try {
    source = fs.readFileSync(argv._[0], "utf-8");
  } catch (e) {
    console.log(`Error in open the input file: ${e.message}`);
    return;
  }
  let tree;
  try {
    tree = parse(source);
  } catch (e) {
    console.log(buildErrorMessage(e));
    return;
  }
  tree.decls.forEach(d => transpiler.traverse(d));

  const output = transpiler.assemble();
  if (argv.output === "stdout") {
    console.log(output);
  } else {
    let outputPath;
    if (argv.output === null) {
      const { dir, name } = path.parse(argv._[0]);
      outputPath = path.join(dir, `${name}.${argv.language === "typescript" ? "ts" : "js"}`);
    } else {
      outputPath = argv.output;
    }
    try {
      fs.writeFileSync(outputPath, output);
      console.log(`Output had been written to ${outputPath}`);
    } catch (e) {
      console.log(`Error in save the output: ${e.message}`);
    }
  }
}

main();
