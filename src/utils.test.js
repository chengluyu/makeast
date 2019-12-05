const utils = require("./utils");

describe("Utils", () => {
  it("braceList", () => {
    expect(utils.braceList([])).toBe("{}");
    expect(utils.braceList(["a", "b"])).toBe("{ a, b }");
  });
});
