const TypeVisitor = require("./type");

describe("TypeVisitor", () => {
  const v = new TypeVisitor({ visitNode() {} });

  it("Errorneous Cases", () => {
    expect(() => {
      v.visitType({ kind: "foobar" });
    }).toThrow("unknown type kind: foobar");
  });

  it("Function Type", () => {
    expect(v.visitType({ kind: "function", argumentTypes: [], returnType: "number" })).toBe(
      "() => number"
    );
    expect(
      v.visitType({ kind: "function", argumentTypes: ["number", "number"], returnType: "number" })
    ).toBe("(number, number) => number");
    expect(
      v.visitType({
        kind: "function",
        argumentTypes: [
          { kind: "array", element: "number" },
          { kind: "union", choices: ["number", "string"] },
        ],
        returnType: { kind: "union", choices: ["number", "string"] },
      })
    ).toBe("(number[], number | string) => (number | string)");
  });

  it("Optional Type", () => {
    expect(v.visitType({ kind: "optional", type: "number" })).toBe("number | null");
    expect(v.visitType({ kind: "optional", type: { kind: "union", choices: ["a", "b"] } })).toBe(
      "a | b | null"
    );
  });

  it("Tuple Type", () => {
    expect(v.visitType({ kind: "tuple", elements: [] })).toBe("[]");
    expect(v.visitType({ kind: "tuple", elements: ["a", "b"] })).toBe("[a, b]");
    expect(v.visitType({ kind: "tuple", elements: ["a", "b", "c"] })).toBe("[a, b, c]");
  });

  it("Union Type", () => {
    expect(v.visitType({ kind: "union", choices: ["a"] })).toBe("a");
    expect(v.visitType({ kind: "union", choices: ["a", "b"] })).toBe("a | b");
    expect(v.visitType({ kind: "union", choices: ["a", "b", "c"] })).toBe("a | b | c");
  });

  it("Array Type", () => {
    expect(v.visitType({ kind: "array", element: "Foo" })).toBe("Foo[]");
    expect(v.visitType({ kind: "array", element: { kind: "union", choices: ["a", "b"] } })).toBe(
      "(a | b)[]"
    );
  });
});
