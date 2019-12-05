const Context = require("./context");

const shared = new Context();

shared.registerDecorator("factory", require("./plugins/factory"));
shared.registerDecorator("import", require("./plugins/import"));
shared.registerDecorator("interface", require("./plugins/interface"));
shared.registerDecorator("tag", require("./plugins/tag"));

shared.setDefaultDecorator("import");
shared.setDefaultDecorator("interface");

module.exports = shared;
