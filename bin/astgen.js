const fs = require("fs");
const { parse } = require("../src/parser");
const Context = require("../src/context");

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
    },
  });
  transpiler.registerDecorator("factory", require("../src/plugins/factory"));
  transpiler.registerDecorator("import", require("../src/plugins/import"));
  transpiler.registerDecorator("interface", require("../src/plugins/interface"));
  transpiler.registerDecorator("tag", require("../src/plugins/tag"));

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
  console.log(transpiler.assemble());
}

main();
