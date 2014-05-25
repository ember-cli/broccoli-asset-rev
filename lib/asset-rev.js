var Fingerprint = require('./fingerprint');
var UseRev = require('./use-rev');

function AssetRev(inputTree, options) {
  if (!(this instanceof AssetRev)) {
    return new AssetRev(inputTree, options);
  }

  options = options || {};

  this.assetMap = {};
  this.inputTree = inputTree;
  this.fingerprintExtensions = options.fingerprintExtensions || ['js', 'css', 'png'];
  this.replaceExtensions = options.replaceExtensions || ['html', 'css'];

  var fingerprintTree = Fingerprint(inputTree, {
    assetMap: this.assetMap,
    extensions: this.fingerprintExtensions
  });

  return UseRev(fingerprintTree, {
    assetMap: this.assetMap,
    extensions: this.replaceExtensions,
    prepend: options.prependPath || ''
  });
}

module.exports = AssetRev;
