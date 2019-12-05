const { parse } = require("./parser.pegjs");
const transpiler = require("./index");
const path = require("path");
const { readFileSync } = require("fs");
const Context = require("./context");

const testCaseFolder = path.resolve(__dirname, "..", "test");

function loadTestCaseInput(fileName) {
  return readFileSync(path.join(testCaseFolder, fileName), "utf-8");
}

function toLines(text) {
  return text.split("\n").filter(x => x);
}

describe("Transpiler Test", () => {
  it("Some Hand-Written Examples", () => {
    const testCases = ["arithmetic.txt", "ast.txt", "element.txt"];
    for (const fileName of testCases) {
      transpiler.reset();
      const source = loadTestCaseInput(fileName);
      const ast = parse(source);
      ast.decls.forEach(d => transpiler.traverse(d));
      // console.log(transpiler.assemble());
    }
  });

  it("Transpile imports to ES module", () => {
    let t = new Context({ module: "esmodule" });
    const importPlugin = require("./plugins/import");
    t.registerDecorator("import", importPlugin);
    t.setDefaultDecorator("import");
    const source = loadTestCaseInput("import.txt");
    const answer = loadTestCaseInput("import.esmodule.txt");
    const ast = parse(source);
    ast.decls.forEach(d => t.traverse(d));
    expect(toLines(t.assemble())).toStrictEqual(toLines(answer));
  });

  it("Transpile imports to CommonJS", () => {
    let t = new Context({ module: "commonjs" });
    const importPlugin = require("./plugins/import");
    t.registerDecorator("import", importPlugin);
    t.setDefaultDecorator("import");
    const source = loadTestCaseInput("import.txt");
    const answer = loadTestCaseInput("import.commonjs.txt");
    const ast = parse(source);
    ast.decls.forEach(d => t.traverse(d));
    expect(toLines(t.assemble())).toStrictEqual(toLines(answer));
  });
});
