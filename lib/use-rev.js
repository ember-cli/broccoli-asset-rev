var Filter = require('broccoli-filter');

function UseRev(inputTree, options) {
  if (!(this instanceof UseRev)) {
    return new UseRev(inputTree, options);
  }

  options = options || {};

  this.inputTree = inputTree;
  this.assetMap = options.assetMap || {};
  this.extensions = options.extensions || [];
  this.prepend = options.prepend || '';
}

UseRev.prototype = Object.create(Filter.prototype);
UseRev.prototype.constructor = UseRev;

UseRev.prototype.processString = function (string) {
  var newString = string;

  for (var key in this.assetMap) {
    if (this.assetMap.hasOwnProperty(key)) {
      newString = newString.split(key).join(this.prepend + this.assetMap[key]);
    }
  }

  return newString;
};

module.exports = UseRev;
