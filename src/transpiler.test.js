const { parse } = require("./parser.pegjs");
const { transpile } = require("./transpiler");
const path = require("path");
const { readFileSync } = require("fs");

describe("Transpiler Test", () => {
  it("A Hand-Written Example", () => {
    const filePath = path.resolve(__dirname, "..", "test", "ast.txt");
    const source = readFileSync(filePath, "utf-8");
    const ast = parse(source);
    console.log(transpile(ast));
  });
});
