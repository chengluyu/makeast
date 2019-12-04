function separateProps(ts) {
  const props = [],
    nonProps = [];
  ts.forEach(t => (t.kind === "prop" ? props : nonProps).push(t));
  return [props, nonProps];
}

function bipartite(xs, pred) {
  const yes = [];
  const no = [];
  xs.forEach(x => (pred(x) ? yes : no).push(x));
  return [yes, no];
}

// TODO: Respect options here
const transpilerOptions = {
  treatEmptyTreeAsUnion: true,
  module: "esmodule", // or "commonjs"
  style: {
    tabWidth: 2,
    useTab: false,
    printWidth: 120,
  },
};

const typePower = {
  union: 1,
  array: 2,
  optional: 1,
  tuple: 3,
  function: 3,
  node: 4,
};

function visitType(t, parentPower = 0) {
  if (typeof t === "string") {
    return t;
  }
  if (typePower[t.kind] === undefined) {
    throw new Error(`unknown type kind: ${t.kind}`);
  }
  let s;
  const myPower = typePower[t.kind];
  if (t.kind === "union") {
    s = t.choices.map(u => visitType(u, myPower)).join(" | ");
  } else if (t.kind === "array") {
    s = `${visitType(t.element, myPower)}[]`;
  } else if (t.kind === "optional") {
    s = `${visitType(t.element, myPower)} | null`;
  } else if (t.kind === "tuple") {
    s = `[${t.elements.map(visitType).join(", ")}]`;
  } else if (t.kind === "function") {
    const args = t.argumentTypes.map(visitType).join(", ");
    const rt = visitType(t.returnType, myPower);
    s = `(${args}) => ${rt}`;
  } else if (t.kind === "node") {
    visitDecl(t);
    return t.name;
  } else {
    throw new Error(`unknown type kind: ${t.kind}`);
  }
  return myPower < parentPower ? `(${s})` : s;
}

const decoratorRegistry = new Map();

function registerDecorator(name, options) {
  if (decoratorRegistry.has(name)) {
    throw new Error(`duplicated decorator name ${name}`);
  }
  decoratorRegistry.set(name, options);
}

function getDecorator(name) {
  const d = decoratorRegistry.get(name);
  if (d === undefined) {
    throw new Error(`unknown decorator ${name}`);
  }
  return d;
}

function isApplicable(d, t) {
  return Array.isArray(d.applicable)
    ? d.applicable.find(t.kind) !== undefined
    : d.applicable === t.kind || d.applicable === "all";
}

module.exports.registerDecorator = registerDecorator;

// Built-in decorators
registerDecorator("readonly", {
  applicable: "prop",
  target: "source",
  handler() {
    return x => `readonly ${x}`;
  },
});

registerDecorator("tag", {
  // This decorator is only applicable to tree declarations.
  applicable: "tree",
  // This decorator is aiming to modify the node.
  target: "node",
  handler(propName, enumTypeName) {
    const nodeNames = [];

    function traverse(t) {
      if (t.kind === "node") {
        t.decls.unshift({
          kind: "prop",
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
});

const results = [];
const treeStack = [];

function tree(t) {
  // Apply decorators
  // Why can't I use for-of loop here?
  t.decorators = [...t.decorators];
  for (const { name, args } of t.decorators) {
    const decorator = getDecorator(name);
    if (!isApplicable(decorator, t)) {
      throw new Error(`expect a decorator applicable to tree declarations`);
    }
    if (decorator.target === "node") {
      const f = decorator.handler(...args);
      f.call({ results }, t); // TODO: encapsulation
    } else {
      throw new Error(`unknown target ${decorator.target} for a tree declaration`);
    }
  }
  // Transpile
  const [props, nonProps] = separateProps(t.decls);
  if (props.length === 0) {
    // Treat as union if the tree doesn't have own properties
    union({ name: t.name, decls: nonProps });
  } else {
    node({ name: t.name, decls: props });
    treeStack.unshift(t.name);
    nonProps.forEach(visitDecl);
    treeStack.shift();
  }
}

function union(t) {
  t.decls.forEach(visitDecl);
  results.push({
    type: "source",
    source: `type ${t.name} = ${t.decls.map(u => u.name).join(" | ")};`,
  });
}

function visitProp(t) {
  const byTarget = { name: [], type: [], source: [] };
  for (const { name, args } of t.decorators) {
    const d = getDecorator(name);
    if (
      Array.isArray(d.applicable)
        ? d.applicable.find(t.kind) !== undefined
        : d.applicable === t.kind || d.applicable === "all"
    ) {
      if (d.target in byTarget) {
        byTarget[d.target].push(d.handler(...args));
      } else {
        throw new Error(`unknown target ${d.target} for a property decorator`);
      }
    } else {
      throw new Error(`expect a decorator applicable to property declarations`);
    }
  }
  const name = byTarget.name.reduce((x, f) => f(x), t.name);
  const type = byTarget.type.reduce((x, f) => f(x), t.type);
  return byTarget.source.reduce((x, f) => f(x), `${name}: ${visitType(type)}`);
}

function node(t) {
  const extendsClause = treeStack.length === 0 ? "" : `extends ${treeStack[0]} `;
  const first = `export interface ${t.name} ${extendsClause}{`;
  const last = "}";
  results.push({
    type: "source",
    source:
      t.decls.length === 0
        ? first + last
        : [first, ...t.decls.map(u => `  ${visitProp(u)};`), last].join("\n"),
  });
}

function braceList(xs) {
  return `{${xs.length === 0 ? ` ${xs.join(", ")} ` : " "}}`;
}

function visitImport(t) {
  let s;
  if (transpilerOptions.module === "commonjs") {
    const temp = "_" + t.module.replace(/[^a-zA-Z0-9_]/g, "");
    const tail = ` = require("${t.module}");`;
    if (t.body === null) {
      s = `const ${temp}${tail}`;
    } else if (t.body.kind === "default") {
      s = `const ${t.body.defaultName}${tail});`;
    } else if (t.body.kind === "namespace") {
      s = `const ${t.body.name}${tail})`;
    } else if (t.body.kind === "bindings") {
      const [keepName, rename] = bipartite(t.body.bindings, b => b[1] === null);
      // If there exists at least one rename binding
      if (rename.length === 0) {
        s = `const ${braceList(keepName)}${tail})`;
      } else {
        s = [
          `const ${temp}${tail}`,
          `const ${braceList(keepName)} = ${temp};`,
          ...rename.map(([name, alias]) => `const ${alias} = ${temp}.${name};`),
        ].join("\n");
      }
    }
  } else if (transpilerOptions.module === "esmodule") {
    const tail = ` "${t.module}"`;
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
    throw new Error(`unknown module type: ${transpilerOptions.module}`);
  }
  results.push({ type: "source", source: s });
}

function visitDecl(t) {
  if (t.kind === "tree") {
    return tree(t);
  }
  if (t.kind === "union") {
    return union(t);
  }
  if (t.kind === "node") {
    return node(t);
  }
  if (t.kind === "import") {
    return visitImport(t);
  }
  throw new Error(`unknown node kind ${t.kind}`);
}

function assemble() {
  const blocks = [];
  for (const t of results) {
    if (t.type === "source") {
      blocks.push(t.source);
    } else {
      throw new Error(`unknown block type ${t.type}`);
    }
  }
  return blocks.join("\n\n");
}

module.exports.transpile = function transpile(t) {
  t.decls.forEach(visitDecl);
  return assemble();
};
