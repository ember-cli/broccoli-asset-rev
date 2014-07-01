var path = require('path');
var fs   = require('fs');

var assetRev = require('./asset-rev');

function EmberCLIAssetRev(project) {
  this.project = project;
  this.name    = 'broccoli-asset-rev';
}

EmberCLIAssetRev.prototype.initializeOptions = function() {
  var defaultOptions = {
    enabled: this.app.env === 'production',
    exclude: [],
    extensions: ['js', 'css', 'png', 'jpg', 'gif'],
    prepend: '',
    replaceExtensions: ['html', 'css', 'js']
  }

  this.options = this.app.options.fingerprint || {};

  for (var option in defaultOptions) {
    if (!this.options.hasOwnProperty(option)) {
      this.options[option] = defaultOptions[option];
    }
  }
};

EmberCLIAssetRev.prototype.postprocessTree = function (type, tree) {
  if (type === 'all' && this.options.enabled) {
    tree = assetRev(tree, this.options);
  }

  return tree;
};

EmberCLIAssetRev.prototype.included = function (app) {
  this.app = app;
  this.initializeOptions();
};

module.exports = EmberCLIAssetRev;
