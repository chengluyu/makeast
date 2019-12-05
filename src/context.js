const merge = require("deepmerge");

function isApplicable(d, t) {
  return Array.isArray(d.applicable)
    ? d.applicable.find(t.kind) !== undefined
    : d.applicable === t.kind || d.applicable === "all";
}

const defaultOptions = {
  treatEmptyTreeAsUnion: true,
  module: "esmodule", // or "commonjs"
  style: {
    tabWidth: 2,
    useTab: false,
    printWidth: 120,
    blockDelimiter: "\n\n",
  },
};

module.exports = class Context {
  constructor(options) {
    this.results = [];
    this.decoratorRegistry = new Map();
    this.options = merge(options, defaultOptions);
    this.traverse = this.traverse.bind(this);
    this.defaultDecorators = { node: [], prop: [], tree: [], import: [], union: [] };
  }

  setDefaultDecorator(name, argsOrFn = []) {
    const d = this.getDecorator(name);
    this.defaultDecorators[d.applicable].push({ name, argsOrFn });
  }

  registerDecorator(name, options) {
    if (this.decoratorRegistry.has(name)) {
      throw new Error(`duplicated decorator name ${name}`);
    }
    this.decoratorRegistry.set(name, options);
  }

  getDecorator(name) {
    const d = this.decoratorRegistry.get(name);
    if (d === undefined) {
      throw new Error(`unknown decorator ${name}`);
    }
    return d;
  }

  applyDecorator(t, name, args) {
    const decorator = this.getDecorator(name);
    if (!isApplicable(decorator, t)) {
      throw new Error(`expect a decorator applicable to tree declarations`);
    }
    if (decorator.target === "node") {
      const f = decorator.handler(...args);
      f.call(this, t);
    } else {
      throw new Error(`unknown target ${decorator.target} for a tree declaration`);
    }
  }

  traverse(t) {
    // Apply default decorators
    for (const { name, argsOrFn } of this.defaultDecorators[t.kind]) {
      if (typeof argsOrFn === "function") {
        this.applyDecorator(t, name, argsOrFn(t));
      } else {
        this.applyDecorator(t, name, argsOrFn);
      }
    }
    // Apply explicitly declared decorators
    for (const { name, args } of t.decorators) {
      this.applyDecorator(t, name, args);
    }
    if (Array.isArray(t.decls)) {
      t.decls.forEach(this.traverse);
    }
  }

  reset() {
    this.results = [];
  }

  assemble() {
    const blocks = [];
    for (const t of this.results) {
      if (t.type === "source") {
        blocks.push(t.source);
      } else {
        throw new Error(`unknown block type ${t.type}`);
      }
    }
    return blocks.join(this.options.style.blockDelimiter);
  }
};
