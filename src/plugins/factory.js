const TypeVisitor = require("../type");
const { braceList, separateProps } = require("../utils");

const typeVisitor = new TypeVisitor({ visitNode() {} });

function generateFactoryMethod(t, inheritedProps) {
  // properties = inherited - overrided + own
  const ownProps = new Set(t.decls.map(x => x.name));
  inheritedProps = inheritedProps.filter(x => !ownProps.has(x.name));
  const propsToCollect = inheritedProps.concat(t.decls);
  // Collect parameters and constructors
  const parameters = [];
  const constructors = [];
  for (const d of propsToCollect) {
    const { hideFromParameters, parameterName, parameterType, defaultValue, initializer } =
      d.attributes.factory || {};
    if (hideFromParameters) {
      constructors.push(
        `${d.name}: ${typeof defaultValue === "string" ? defaultValue : "undefined"}`
      );
    } else {
      parameters.push(
        `${parameterName || d.name}` +
          (this.options.language === "typescript"
            ? `: ${parameterType || typeVisitor.visitType(d.type)}`
            : "") +
          (typeof defaultValue === "string" ? ` = ${defaultValue}` : "")
      );
      constructors.push(
        typeof initializer === "string"
          ? `${d.name}: ${initializer}`
          : typeof parameterName === "string" && parameterName !== d.name
          ? `${d.name}: ${parameterName}`
          : d.name
      );
    }
  }
  // Piece fragments together
  const signature = `create${t.name}(${parameters.join(", ")})`;
  let firstLine =
    this.options.language === "typescript"
      ? `  public ${signature}: ${t.name} {`
      : `  ${signature} {`;
  if (firstLine.length > this.options.style.printWidth) {
    firstLine = [
      `  public create${t.name}(`,
      ...parameters.map(x => `    ${x},`),
      `  ): ${t.name} {`,
    ].join("\n");
  }
  let body = `    return ${braceList(constructors)};`;
  if (body.length > this.options.style.printWidth) {
    body = ["    return {", ...constructors.map(x => `      ${x},`), "    };"].join("\n");
  }
  const lastLine = "  }";
  return [firstLine, body, lastLine].join("\n");
}

module.exports = {
  // This decorator is only applicable to tree declarations.
  applicable: "tree",
  // This decorator is aiming to modify the node.
  target: "node",
  handler(factoryClassName) {
    const factoryMethods = [];
    const lengthStack = [];
    const inheritedProps = [];

    function push(props) {
      lengthStack.push(props.length);
      inheritedProps.push(...props);
    }

    function pop() {
      const n = lengthStack.pop();
      for (let i = 0; i < n; i += 1) {
        inheritedProps.pop();
      }
    }

    let traverse = function(t) {
      if (t.kind === "node") {
        factoryMethods.push(generateFactoryMethod.call(this, t, inheritedProps));
      } else if (t.kind === "tree") {
        const [props, nonProps] = separateProps(t.decls);
        push(props);
        nonProps.forEach(traverse);
        pop();
      } else if (t.kind === "union") {
        t.decls.forEach(traverse);
      } else {
        throw new Error(`FactoryGenerator: unknown declaration kind "${t.kind}"`);
      }
    };

    return function(root) {
      traverse = traverse.bind(this);
      traverse(root);
      let first;
      let last;
      if (this.options.module === "esmodule") {
        first = `export class ${factoryClassName} {`;
        last = "}";
      } else {
        first = `class ${factoryClassName} {`;
        last = `}\nmodule.exports.${factoryClassName} = ${factoryClassName};`;
      }
      this.results.push({
        type: "source",
        source:
          factoryMethods.length === 0 ? first + last : [first, ...factoryMethods, last].join("\n"),
      });
    };
  },
};
