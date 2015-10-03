var Fingerprint = require('./fingerprint');
var UseRev = require('broccoli-asset-rewrite');

function AssetRev(inputTree, options) {
  if (!(this instanceof AssetRev)) {
    return new AssetRev(inputTree, options);
  }

  options = options || {};

  this.assetMap = {};
  this.inputTree = inputTree;
  this.customHash = options.customHash;
  this.extensions = options.extensions || ['js', 'css', 'png', 'jpg', 'gif', 'map'];
  this.replaceExtensions = options.replaceExtensions || ['html', 'css', 'js'];
  this.exclude = options.exclude || [];
  this.fingerprintAssetMap = options.fingerprintAssetMap || false;
  this.generateAssetMap = options.generateAssetMap;
  this.generateRailsManifest = options.generateRailsManifest;
  this.assetMapPath = options.assetMapPath || '';
  this.railsManifestPath = options.railsManifestPath || '';
  this.prepend = options.prepend || '';
  this.ignore = options.ignore;
  this.description = options.description;

  var fingerprintTree = Fingerprint(inputTree, this);

  return UseRev(fingerprintTree, this);
}

module.exports = AssetRev;
