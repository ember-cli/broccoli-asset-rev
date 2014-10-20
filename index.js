var path = require('path');
var fs   = require('fs');

var assetRev = require('./lib/asset-rev');

module.exports = {
  name: 'broccoli-asset-rev',
  initializeOptions: function() {
    var defaultOptions = {
      enabled: this.app.env === 'production',
      exclude: [],
      ignore: [],
      extensions: ['js', 'css', 'png', 'jpg', 'gif'],
      prepend: '',
      replaceExtensions: ['html', 'css', 'js']
    }

    this.options = this.app.options.fingerprint = this.app.options.fingerprint || {};

    for (var option in defaultOptions) {
      if (!this.options.hasOwnProperty(option)) {
        this.options[option] = defaultOptions[option];
      }
    }
  },
  postprocessTree: function (type, tree) {
    if (type === 'all' && this.options.enabled) {
      tree = assetRev(tree, this.options);
    }

    return tree;
  },
  included: function (app) {
    this.app = app;
    this.initializeOptions();
  },
  treeFor: function() {}
}
