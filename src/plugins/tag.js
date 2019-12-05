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
          attributes: { readonly: options.readonly },
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
      const first = `export enum ${enumTypeName} {`;
      const last = "}";
      this.results.push({
        type: "source",
        source:
          nodeNames.length === 0
            ? first + last
            : [first, ...nodeNames.map(x => `  ${x},`), last].join("\n"),
      });
    };
  },
};
