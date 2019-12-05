module.exports.braceList = function braceList(xs) {
  return `{${xs.length === 0 ? "" : ` ${xs.join(", ")} `}}`;
};

module.exports.separateProps = function separateProps(ts) {
  const props = [],
    nonProps = [];
  ts.forEach(t => (t.kind === "prop" ? props : nonProps).push(t));
  return [props, nonProps];
};
