const { parse } = require("./parser.pegjs");
const { transpile, reset } = require("./transpiler");
const path = require("path");
const { readFileSync } = require("fs");

const testCaseFolder = path.resolve(__dirname, "..", "test");

function loadTestCaseInput(fileName) {
  return readFileSync(path.join(testCaseFolder, fileName), "utf-8");
}

describe("Transpiler Test", () => {
  it("A Hand-Written Example", () => {
    const source = loadTestCaseInput("ast.txt");
    const ast = parse(source);
    console.log(transpile(ast));
    reset();
    const source2 = loadTestCaseInput("import.txt");
    const ast2 = parse(source2);
    const inputLines = source2.split("\n").map(x => x + ";");
    const outputLines = transpile(ast2)
      .split("\n")
      .filter(x => x);
    expect(outputLines).toEqual(inputLines);
  });
});
