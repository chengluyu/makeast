const { parse } = require("./parser.pegjs");
const transpiler = require("./index");
const path = require("path");
const { readFileSync } = require("fs");

const testCaseFolder = path.resolve(__dirname, "..", "test");

function loadTestCaseInput(fileName) {
  return readFileSync(path.join(testCaseFolder, fileName), "utf-8");
}

describe("Transpiler Test", () => {
  it("Some Hand-Written Examples", () => {
    const testCases = ["arithmetic.txt", "ast.txt", "element.txt", "import.txt"];
    for (const fileName of testCases) {
      transpiler.reset();
      const source = loadTestCaseInput(fileName);
      const ast = parse(source);
      ast.decls.forEach(d => transpiler.traverse(d));
      console.log(transpiler.assemble());
    }
  });
});
