var Fingerprint = require('./fingerprint');
var UseRev = require('./use-rev');

function AssetRev(inputTree, options) {
  if (!(this instanceof AssetRev)) {
    return new AssetRev(inputTree, options);
  }

  options = options || {};

  this.assetMap = {};
  this.inputTree = inputTree;
  this.customHash = options.customHash;
  this.fingerprintExtensions = options.fingerprintExtensions || ['js', 'css', 'png'];
  this.replaceExtensions = options.replaceExtensions || ['html', 'css'];
  this.description = options.description;

  var fingerprintTree = Fingerprint(inputTree, {
    assetMap: this.assetMap,
    customHash: this.customHash,
    extensions: this.fingerprintExtensions,
    exclude: options.fingerprintExclude || [],
    generateRailsManifest: options.generateRailsManifest
    description: options.description
  });

  return UseRev(fingerprintTree, {
    assetMap: this.assetMap,
    extensions: this.replaceExtensions,
    prepend: options.prependPath || '',
    description: options.description
  });
}

module.exports = AssetRev;
