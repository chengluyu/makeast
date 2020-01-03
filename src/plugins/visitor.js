const { separateProps, flattenLines, commonJSify } = require("../utils");

function makeTypeScriptVisitorClass(visitorClassName, nodeTypes, enumInfo, rootType, options) {
  return [
    `abstract class ${visitorClassName}<T> {`,
    nodeTypes.map(t => `abstract visit${t}(t: ${t}): T;`),
    [
      `public visit(t: ${rootType}): T {`,
      [
        `switch (t.${enumInfo.property}) {`,
        nodeTypes.flatMap(t => [
          `case ${enumInfo.type}.${t}:`,
          [`return this.visit${t}(t${options.forciblyConversion ? ` as ${t}` : ""});`],
        ]),
        options.includeDefault
          ? [
              "default:",
              [
                `throw new Error(\`unrecognized ${enumInfo.property}: \${t.${enumInfo.property}}\`);`,
              ],
            ]
          : [],
        "}",
      ],
      "}",
    ],
    "}",
  ];
}

function makeJavaScriptVisitorClass(visitorClassName, nodeTypes, enumInfo) {
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
        `switch (t.${enumInfo.property}) {`,
        nodeTypes.flatMap(t => [`case ${enumInfo.type}.${t}:`, [`return this.visit${t}(t);`]]),
        [
          "default:",
          [`throw new Error(\`unknown ${enumInfo.property} "\${t.${enumInfo.property}}"\`);`],
        ],
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
  handler(visitorClassName, options) {
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
      let enumInfo;
      if (
        typeof options.enumPropertyName === "string" &&
        typeof options.enumTypeName === "string"
      ) {
        enumInfo = { type: options.enumTypeName, property: options.enumPropertyName };
      } else {
        const tagDecorator = root.decorators.find(x => x.name === "tag");
        if (tagDecorator === undefined) {
          throw new Error("to use the visitor decorator, you must apply a tag decorator before it");
        }
        enumInfo = { type: tagDecorator.args[1], property: tagDecorator.args[0] };
      }
      traverse = traverse.bind(this);
      traverse(root);
      const lines = (this.options.language === "typescript"
        ? makeTypeScriptVisitorClass
        : makeJavaScriptVisitorClass)(visitorClassName, nodeTypes, enumInfo, root.name, options);
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
