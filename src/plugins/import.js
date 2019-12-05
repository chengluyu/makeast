const { braceList } = require("../utils");

function bipartite(xs, pred) {
  const yes = [];
  const no = [];
  xs.forEach(x => (pred(x) ? yes : no).push(x));
  return [yes, no];
}

function visitImport(t) {
  let s;
  if (this.options.module === "commonjs") {
    const temp = "_" + t.module.replace(/[^a-zA-Z0-9_]/g, "");
    const tail = ` = require("${t.module}");`;
    if (t.body === null) {
      s = `require("${t.module}");`;
    } else if (t.body.kind === "default") {
      s = `const ${t.body.defaultName}${tail}`;
    } else if (t.body.kind === "namespace") {
      s = `const ${t.body.name}${tail}`;
    } else if (t.body.kind === "bindings") {
      let [keepName, rename] = bipartite(t.body.bindings, b => b[1] === null);
      keepName = keepName.map(x => x[0]);
      // If there exists at least one rename binding
      if (rename.length === 0) {
        s = `const ${braceList(keepName)}${tail}`;
      } else {
        s = [
          `const ${temp}${tail}`,
          ...(keepName.length === 0 ? [] : [`const ${braceList(keepName)} = ${temp};`]),
          ...rename.map(([name, alias]) => `const ${alias} = ${temp}.${name};`),
        ].join("\n");
      }
    }
  } else if (this.options.module === "esmodule") {
    const tail = ` "${t.module}";`;
    if (t.body === null) {
      s = `import${tail}`;
    } else if (t.body.kind === "default") {
      s = `import ${t.body.defaultName} from${tail}`;
    } else if (t.body.kind === "namespace") {
      s = `import * as ${t.body.name} from${tail}`;
    } else if (t.body.kind === "bindings") {
      const items = t.body.bindings.map(([name, newName]) =>
        newName === null ? name : `${name} as ${newName}`
      );
      s = `import ${braceList(items)} from${tail}`;
    }
  } else {
    throw new Error(`unknown module type: ${this.options.module}`);
  }
  this.results.push({ type: "source", source: s });
}

module.exports = {
  applicable: "import",
  target: "node",
  handler() {
    return visitImport;
  },
};
