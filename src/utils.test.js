const utils = require("./utils");

describe("Utils", () => {
  it("braceList", () => {
    expect(utils.braceList([])).toBe("{}");
    expect(utils.braceList(["a", "b"])).toBe("{ a, b }");
  });

  it("flattenLines", () => {
    const f = x => utils.flattenLines(x, "  ");
    expect(f([])).toBe("");
    expect(f(["a {", "}"])).toBe("a {}");
    expect(f(["a", "b", "c"])).toBe("a\nb\nc");
    expect(f(["a", "b", ["b.1", "b.2"], "c"])).toBe("a\nb\n  b.1\n  b.2\nc");
  });
});
