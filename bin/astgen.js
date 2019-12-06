const fs = require("fs");
const { parse } = require("../src/parser");
const argv = require("yargs")
  .option("module", {
    alias: "m",
    default: "esmodule",
  })
  .option("language", {
    alias: "l",
    default: "typescript",
  }).argv;

const Context = require("../src/context");
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

const source = fs.readFileSync(argv._[0], "utf-8");
const tree = parse(source);
tree.decls.forEach(d => transpiler.traverse(d));
console.log(transpiler.assemble());
