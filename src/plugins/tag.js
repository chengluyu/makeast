function makeTypeScriptEnum(typeName, members) {
  const first = `export enum ${typeName} {`;
  const last = "}";
  return members.length === 0
    ? first + last
    : [first, ...members.map(x => `  ${x},`), last].join("\n");
}

function makeJavaScriptEnum(typeName, members, options) {
  let prologue = `let ${typeName};\n(function (e) {`;
  let epilogue = `})(${typeName} || (${typeName} = {}));`;
  if (options.module === "esmodule") {
    prologue = `export ${prologue}`;
  } else {
    epilogue += `\nmodule.exports.${typeName} = ${typeName};`;
  }
  return [prologue, ...members.map((x, i) => `  e[e["${x}"] = ${i}] = "${x}";`), epilogue].join(
    "\n"
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
      traverse(root);
      this.results.push({
        type: "source",
        source: (this.options === "typescript" ? makeTypeScriptEnum : makeJavaScriptEnum)(
          enumTypeName,
          nodeNames,
          this.options
        ),
      });
    };
  },
};
