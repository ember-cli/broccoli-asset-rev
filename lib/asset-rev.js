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
  this.extensions = options.extensions || ['js', 'css', 'png'];
  this.replaceExtensions = options.replaceExtensions || ['html', 'css'];
  this.exclude = options.exclude || [];
  this.generateRailsManifest = options.generateRailsManifest;
  this.prepend = options.prepend || '';
  this.description = options.description;

  var fingerprintTree = Fingerprint(inputTree, this);


  return UseRev(fingerprintTree, this);
}

module.exports = AssetRev;
