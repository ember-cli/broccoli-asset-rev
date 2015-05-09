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
  this.generateAssetMap = options.generateAssetMap;
  this.exportAssetMap = options.exportAssetMap;
  this.generateRailsManifest = options.generateRailsManifest;
  this.prepend = options.prepend || '';
  this.description = options.description;

  if (this.exportAssetMap) {
    this.replaceExtensions = this.replaceExtensions.filter(function (item) {
      return item !== 'js';
    });
  }

  var fingerprintTree = Fingerprint(inputTree, this);

  return UseRev(fingerprintTree, this);
}

module.exports = AssetRev;
