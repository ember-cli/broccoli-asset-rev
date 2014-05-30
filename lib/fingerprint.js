var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var Filter = require('broccoli-filter');
var Promise = require('rsvp').Promise;

function Fingerprint(inputTree, options) {
  if (!(this instanceof Fingerprint)) {
    return new Fingerprint(inputTree, options);
  }

  options = options || {};

  this.inputTree = inputTree;
  this.assetMap = options.assetMap || {};
  this.extensions = options.extensions || [];
  this.exclude = options.exclude || [];
  this.description = options.description;
}

Fingerprint.prototype = Object.create(Filter.prototype);
Fingerprint.prototype.constructor = Fingerprint;

Fingerprint.prototype.canProcessFile = function (relativePath) {
  for (var i = 0; i < this.exclude.length; i++) {
    if (relativePath.indexOf(this.exclude[i]) !== -1) {
      return false;
    }
  }

  return Filter.prototype.canProcessFile.apply(this, arguments);
};

Fingerprint.prototype.processFile = function (srcDir, destDir, relativePath) {
  var file = fs.readFileSync(srcDir + '/' + relativePath);
  var self = this;

  return Promise.resolve().then(function () {
    var outputPath = self.getDestFilePath(relativePath);
    fs.writeFileSync(destDir + '/' + outputPath, file);
  });
};

Fingerprint.prototype.getDestFilePath = function (relativePath) {
  if (Filter.prototype.getDestFilePath.apply(this, arguments)) {
    var tmpPath = path.join(this.inputTree.tmpDestDir, relativePath);
    var file = fs.readFileSync(tmpPath, { encoding: 'utf8' });

    var md5 = crypto.createHash('md5');
    md5.update(file);
    var hex = md5.digest('hex');

    var ext = path.extname(relativePath);
    var newPath = relativePath.replace(ext, '-' + hex + ext);
    this.assetMap[relativePath] = newPath;

    return newPath;
  }

  return null;
};

module.exports = Fingerprint;
