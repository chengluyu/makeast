const { flattenLines } = require("../utils");

function makeTypeScriptEnum(typeName, members) {
  return flattenLines([`export enum ${typeName} {`, ...members.map(x => `  ${x},`), "}"], "  ");
}

function makeJavaScriptEnum(typeName, members, { module }) {
  return flattenLines(
    [
      `${module === "esmodule" ? "export " : ""}const ${typeName} = {`,
      members.map((x, i) => `${x}: ${i},`),
      members.map((x, i) => `${i}: "${x}",`),
      `};${module === "commonjs" ? `\nmodule.exports.${typeName} = ${typeName};` : ""}`,
    ],
    "  "
  );
}

module.exports = {
  // This decorator is only applicable to tree declarations.
  applicable: "tree",
  // This decorator is aiming to modify the node.
  target: "node",
  handler(propName, enumTypeName, options = { readonly: true }) {
    const nodeNames = [];

    function traverse(t) {
      if (t.kind === "prop") {
        return;
      }
      if (t.kind === "node") {
        t.decls.unshift({
          kind: "prop",
          attributes: {
            readonly: options.readonly,
            factory: { hideFromParameters: true, defaultValue: `${enumTypeName}.${t.name}` },
          },
          decorators: [],
          name: propName,
          type: `${enumTypeName}.${t.name}`,
        });
        return nodeNames.push(t.name);
      }
      t.decls.forEach(traverse);
    }

    // If you'll use the context, you can't use arrow function.
    return function(root) {
      if (root.kind === "tree" && root.decls.find(x => x.kind === "prop") !== undefined) {
        root.decls.unshift({
          kind: "prop",
          attributes: {
            readonly: options.readonly,
            factory: { hideFromParameters: true, defaultValue: `${enumTypeName}` },
          },
          decorators: [],
          name: propName,
          type: `${enumTypeName}`,
        });
      }
      traverse(root);
      this.results.push({
        type: "source",
        source: (this.options.language === "typescript" ? makeTypeScriptEnum : makeJavaScriptEnum)(
          enumTypeName,
          nodeNames,
          this.options
        ),
      });
    };
  },
};
