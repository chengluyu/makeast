const { parse, SyntaxError } = require("./parser");
const path = require("path");
const { readFileSync } = require("fs");

function buildErrorMessage(e) {
  return `ParseError: Line ${e.location.start.line}, column ${e.location.start.column}: ${e.message}`;
}

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

const results = [];
const treeStack = [];

function tree(t) {
  treeStack.unshift(t.name);
  const [props, nonProps] = separateProps(t.decls);
  node({ name: t.name, decls: props });
  nonProps.forEach(visitDecl);
  treeStack.shift();
}

function union(t) {
  t.decls.forEach(visitDecl);
  results.push({
    type: "source",
    source: `type ${t.name} = ${t.decls.map(u => u.name).join(" | ")};`,
  });
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
        : [first, ...t.decls.map(u => `  ${u.name}: ${visitType(u.type)};`), last].join("\n"),
  });
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
  throw new Error(`unknown node kind ${t.kind}`);
}

function output() {
  const blocks = [];
  for (const t of results) {
    if (t.type === "source") {
      blocks.push(t.source);
    } else {
      throw new Error(`unknown block type ${t.type}`);
    }
  }
  return blocks.join("\n\n\n");
}

try {
  const source = readFileSync(path.join(__dirname, "tree.ast"), "utf-8");
  const ast = parse(source);
  ast.decls.forEach(visitDecl);
  console.log(output());
} catch (e) {
  if (e instanceof SyntaxError) {
    console.log(buildErrorMessage(e));
  } else {
    console.log(e.stack);
  }
}
