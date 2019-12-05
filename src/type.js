const typePower = {
  union: 1,
  array: 2,
  optional: 1,
  tuple: 3,
  function: 3,
  node: 4,
};

class TypeVisitor {
  constructor(nodeVisitor) {
    this.nodeVisitor = nodeVisitor;
    this.visitType = this.visitType.bind(this);
  }

  visitType(t, parentPower = 0) {
    if (typeof t === "string") {
      return t;
    }
    let s;
    const myPower = typePower[t.kind];
    if (t.kind === "union") {
      s = t.choices.map(u => this.visitType(u, myPower)).join(" | ");
    } else if (t.kind === "array") {
      s = `${this.visitType(t.element, myPower)}[]`;
    } else if (t.kind === "optional") {
      s = `${this.visitType(t.type, myPower)} | null`;
    } else if (t.kind === "tuple") {
      s = `[${t.elements.map(this.visitType).join(", ")}]`;
    } else if (t.kind === "function") {
      const args = t.argumentTypes.map(this.visitType).join(", ");
      const rt = this.visitType(t.returnType, myPower);
      s = `(${args}) => ${rt}`;
    } else if (t.kind === "node") {
      this.nodeVisitor.visitNode(t);
      return t.name;
    } else {
      throw new Error(`unknown type kind: ${t.kind}`);
    }
    return myPower < parentPower ? `(${s})` : s;
  }
}

module.exports = TypeVisitor;
