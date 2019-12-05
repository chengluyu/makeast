function separateProps(ts) {
  const props = [],
    nonProps = [];
  ts.forEach(t => (t.kind === "prop" ? props : nonProps).push(t));
  return [props, nonProps];
}

const typePower = {
  union: 1,
  array: 2,
  optional: 1,
  tuple: 3,
  function: 3,
  node: 4,
};

class InterfaceGenerator {
  constructor(context) {
    this.context = context;
    this.treeStack = [];
    this.visit = this.visit.bind(this);
  }

  visit(t) {
    if (t.kind === "tree") {
      this.visitTree(t);
    } else if (t.kind === "union") {
      this.visitUnion(t);
    } else if (t.kind === "node") {
      this.visitNode(t);
    } else {
      throw new Error(`InterfaceGenerator: unrecognized declaration kind "${t.kind}"`);
    }
  }

  visitTree(t) {
    // Transpile
    const [props, nonProps] = separateProps(t.decls);
    if (props.length === 0) {
      // Treat as union if the tree doesn't have own properties
      this.visitUnion({ name: t.name, decls: nonProps });
    } else {
      this.visitNode({ name: t.name, decls: props });
      this.treeStack.unshift(t.name);
      nonProps.forEach(this.visit);
      this.treeStack.shift();
    }
  }

  visitNode(t) {
    const extendsClause = this.treeStack.length === 0 ? "" : `extends ${this.treeStack[0]} `;
    const first = `export interface ${t.name} ${extendsClause}{`;
    const last = "}";
    this.context.results.push({
      type: "source",
      source:
        t.decls.length === 0
          ? first + last
          : [first, ...t.decls.map(u => `  ${this.visitProp(u)};`), last].join("\n"),
    });
  }

  visitUnion(t) {
    t.decls.forEach(this.visit);
    this.context.results.push({
      type: "source",
      source: `type ${t.name} = ${t.decls.map(u => u.name).join(" | ")};`,
    });
  }

  visitProp(t) {
    let s = `${t.name}: ${this.visitType(t.type)}`;
    // Readonly
    if (t.attributes.readonly) {
      s = `readonly ${s}`;
    }
    // Visibility
    const v = t.attributes.visibility;
    if (typeof v === "string") {
      if (v === "public" || v === "private") {
        s = `${v} ${s}`;
      } else {
        throw Error(`unknown property visibility ${v}`);
      }
    }
    return s;
  }

  visitType(t, parentPower = 0) {
    if (typeof t === "string") {
      return t;
    }
    if (typePower[t.kind] === undefined) {
      throw new Error(`unknown type kind: ${t.kind}`);
    }
    let s;
    const myPower = typePower[t.kind];
    if (t.kind === "union") {
      s = t.choices.map(u => this.visitType(u, myPower)).join(" | ");
    } else if (t.kind === "array") {
      s = `${this.visitType(t.element, myPower)}[]`;
    } else if (t.kind === "optional") {
      s = `${this.visitType(t.element, myPower)} | null`;
    } else if (t.kind === "tuple") {
      s = `[${t.elements.map(this.visitType).join(", ")}]`;
    } else if (t.kind === "function") {
      const args = t.argumentTypes.map(this.visitType).join(", ");
      const rt = this.visitType(t.returnType, myPower);
      s = `(${args}) => ${rt}`;
    } else if (t.kind === "node") {
      this.visit(t);
      return t.name;
    } else {
      throw new Error(`unknown type kind: ${t.kind}`);
    }
    return myPower < parentPower ? `(${s})` : s;
  }
}

module.exports = {
  applicable: "tree",
  target: "node",
  handler() {
    return function(t) {
      const gen = new InterfaceGenerator(this);
      gen.visit(t);
    };
  },
};
