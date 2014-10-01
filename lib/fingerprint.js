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
  this.customHash = options.customHash;
  this.extensions = options.extensions || [];
  this.exclude = options.exclude || [];
  this.description = options.description;
  this.generateAssetMap = options.generateAssetMap;
  this.generateRailsManifest = options.generateRailsManifest;
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
    var hash;

    if (this.customHash) {
      hash = this.customHash;
    } else {
      var md5 = crypto.createHash('md5');
      md5.update(file);
      hash = md5.digest('hex');
    }

    var ext = path.extname(relativePath);
    var newPath = relativePath.replace(ext, '-' + hash + ext);
    this.assetMap[relativePath] = newPath;

    return newPath;
  }

  return null;
};

Fingerprint.prototype.writeAssetMap = function (destDir) {
  var toWrite = {
    assets: this.assetMap,
    prepend: this.prepend
  };

  fs.writeFileSync(destDir + '/assets/assetMap.json', JSON.stringify(toWrite));
};

Fingerprint.prototype.writeRailsManifest = function(destDir) {
    var assetRegex = /^assets\//,
        digestRegex = /-([0-9a-f]+)\.\w+$/,
        assetMap = {},
        files = {};

    for (var key in this.assetMap) {
      if (assetRegex.test(key)) {
        var fingerprintedPath = this.assetMap[key],
            assetlessKey = key.replace(assetRegex, ''),
            assetlessFingerprintedPath = fingerprintedPath.replace(assetRegex, ''),
            stats = fs.statSync(destDir + '/' + fingerprintedPath);

        files[assetlessFingerprintedPath] = {
          mtime: stats.mtime,
          logical_path: assetlessKey,
          digest: fingerprintedPath.match(digestRegex)[1],
          size: stats.size
        }
        assetMap[assetlessKey] = assetlessFingerprintedPath;
      }
    }
    var assets = { assets: assetMap, files:  files };
    var contents = JSON.stringify(assets);
    var hash = '';
    var md5 = crypto.createHash('md5');
    md5.update(contents);
    hash = md5.digest('hex');
    fs.writeFileSync(destDir + '/assets/manifest-' + hash + '.json', contents);
};

Fingerprint.prototype.write = function(readTree, destDir) {
  var self = this;

  return Filter.prototype.write.apply(this, arguments).then(function() {
    if (!!self.generateAssetMap) {
      self.writeAssetMap(destDir);
    }

    if (!!self.generateRailsManifest) {
      self.writeRailsManifest(destDir);
    }
  });
};

module.exports = Fingerprint;
