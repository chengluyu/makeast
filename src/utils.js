module.exports.braceList = function braceList(xs) {
  return `{${xs.length === 0 ? "" : ` ${xs.join(", ")} `}}`;
};

module.exports.separateProps = function separateProps(ts) {
  const props = [],
    nonProps = [];
  ts.forEach(t => (t.kind === "prop" ? props : nonProps).push(t));
  return [props, nonProps];
};

module.exports.flattenLines = function flattenLines(lines, indent, level = 0) {
  if (
    lines.length === 2 &&
    typeof lines[0] === "string" &&
    typeof lines[1] === "string" &&
    lines[0].endsWith("{") &&
    lines[1].startsWith("}")
  ) {
    return indent.repeat(level) + lines[0] + lines[1];
  }
  return lines
    .map(x => (Array.isArray(x) ? flattenLines(x, indent, level + 1) : indent.repeat(level) + x))
    .join("\n");
};

module.exports.commonJSify = function commonJSify(text, symbolName, isCommonJS) {
  return isCommonJS ? text + `\nmodule.exports.${symbolName} = ${symbolName};` : "export " + text;
};
