const { separateProps, flattenLines, commonJSify } = require("../utils");

function makeTypeScriptVisitorClass(visitorClassName, rootType, nodeTypes, enumType) {
  return [
    `export abstract class ${visitorClassName}<T> {`,
    ...nodeTypes.map(t => `abstract visit${t}(t: ${t}): T;`),
    [
      `public visit(t: ${rootType}): T {`,
      ["switch (t.kind) {", nodeTypes.map(t => `case ${enumType}.${t}`), "}"],
      "}",
    ],
    "}",
  ];
}

function makeJavaScriptVisitorClass(visitorClassName, enumType, nodeTypes) {
  return [
    `class ${visitorClassName} {`,
    ...nodeTypes.map(t => [
      `visit${t}(t) {`,
      ['throw new Error("try to call an abstract method");'],
      "}",
    ]),
    [
      `visit(t) {`,
      [
        "switch (t.kind) {",
        nodeTypes.flatMap(t => [`case ${enumType}.${t}:`, [`this.visit${t}(t);`, "break;"]]),
        "}",
      ],
      "}",
    ],
    "}",
  ];
}

module.exports = {
  // This decorator is only applicable to tree declarations.
  applicable: "tree",
  // This decorator is aiming to modify the node.
  target: "node",
  handler(visitorClassName, enumTypeName) {
    const nodeTypes = [];

    let traverse = function(t) {
      if (t.kind === "node") {
        nodeTypes.push(t.name);
      } else if (t.kind === "tree") {
        const [, nonProps] = separateProps(t.decls);
        nonProps.forEach(traverse);
      } else if (t.kind === "union") {
        t.decls.forEach(traverse);
      } else {
        throw new Error(`VisitorGenerator: unknown declaration kind "${t.kind}"`);
      }
    };

    return function(root) {
      traverse = traverse.bind(this);
      traverse(root);
      const lines = (this.options.language === "typescript"
        ? makeTypeScriptVisitorClass
        : makeJavaScriptVisitorClass)(visitorClassName, root.name, nodeTypes, enumTypeName);
      this.results.push({
        type: "source",
        source: commonJSify(
          flattenLines(lines, "  "),
          visitorClassName,
          this.options.module === "commonjs"
        ),
      });
    };
  },
};
