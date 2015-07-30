var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var Filter = require('broccoli-filter');
var Promise = require('rsvp').Promise;

var MANIFEST_REGEX = /^manifest(-[0-9a-f]+)?.json$/;
var MULTIPLE_MANIFEST_FILES = 'Multiple manifest files found. Using the first one.';

function Fingerprint(inputNode, options) {
  if (!(this instanceof Fingerprint)) {
    return new Fingerprint(inputNode, options);
  }

  options = options || {};

  Filter.call(this, inputNode, {
    extensions: options.extensions || []
  })

  this.assetMap = options.assetMap || {};
  this.exclude = options.exclude || [];
  this.description = options.description;
  this.generateAssetMap = options.generateAssetMap;
  this.generateRailsManifest = options.generateRailsManifest;
  this.prepend = options.prepend;

  if (typeof options.customHash === 'function') {
    this.customHash = '';
    this.hashFn = options.customHash;
  } else {
    this.customHash = options.customHash;
    this.hashFn = md5Hash;
  }
}

Fingerprint.prototype = Object.create(Filter.prototype);
Fingerprint.prototype.constructor = Fingerprint;

Fingerprint.prototype.canProcessFile = function (relativePath) {
  for (var i = 0; i < this.exclude.length; i++) {
    if (relativePath.indexOf(this.exclude[i]) !== -1) {
      return false;
    }
  }

  return Filter.prototype.getDestFilePath.apply(this, arguments) != null;
};

Fingerprint.prototype.processFile = function (srcDir, destDir, relativePath) {
  this._srcDir = srcDir;

  var file = fs.readFileSync(srcDir + '/' + relativePath);
  var self = this;

  return Promise.resolve().then(function () {
    var outputPath = self.getDestFilePath(relativePath);
    fs.writeFileSync(destDir + '/' + outputPath, file);
  });
};

Fingerprint.prototype.getDestFilePath = function (relativePath) {
  var destFilePath = Filter.prototype.getDestFilePath.apply(this, arguments);
  if (destFilePath) {
    if (this.assetMap[relativePath]) {
      return this.assetMap[relativePath];
    }
    if (this.customHash === null) {
      return this.assetMap[relativePath] = destFilePath;
    }

    var tmpPath = path.join(this._srcDir, relativePath);
    var file = fs.readFileSync(tmpPath, { encoding: 'utf8' });
    var hash;

    if (this.customHash) {
      hash = this.customHash;
    } else {
      hash = this.hashFn(file, tmpPath);
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

  if (!fs.existsSync(destDir + '/assets')) {
    fs.mkdirSync(destDir + '/assets');
  }

  fs.writeFileSync(destDir + '/assets/assetMap.json', JSON.stringify(toWrite));
};

Fingerprint.prototype.findExistingManifest = function(destDir) {
  var files = fs.readdirSync(destDir + '/assets');
  var manifestFiles = files.filter(function(file) {
    return MANIFEST_REGEX.test(file);
  });
  if(manifestFiles.length > 1) {
    console.warn(MULTIPLE_MANIFEST_FILES);
  }
  return manifestFiles[0];
}


Fingerprint.prototype.writeRailsManifest = function(destDir) {
    var assetRegex = /^assets\//,
        digestRegex = /-([0-9a-f]+)\.\w+$/,
        existingManifestPath = this.findExistingManifest(destDir),
        fullExistingManifestPath = destDir + '/assets/' + existingManifestPath,
        existingManifest = {},
        assetMap = {},
        files = {};

    if(existingManifestPath){
      existingManifest = JSON.parse(fs.readFileSync(fullExistingManifestPath));
      assetMap = existingManifest.assets;
      files = existingManifest.files;
    }

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

    var fileName = 'manifest';
    var assets   = { assets: assetMap, files:  files }
    var contents = new Buffer(JSON.stringify(assets));

    if (this.exclude.indexOf('manifest.json') === -1) {
      var hash = this.hashFn(contents);
      fileName += '-' + hash;
    }

    if(existingManifestPath) {
      fs.unlinkSync(fullExistingManifestPath);
    }

    fs.writeFileSync(destDir + '/assets/' + fileName + '.json', contents);
};

Fingerprint.prototype.build = function() {
  var self = this;

  return Filter.prototype.build.call(this).then(function() {
    if (!!self.generateAssetMap) {
      self.writeAssetMap(self.outputPath);
    }

    if (!!self.generateRailsManifest) {
      self.writeRailsManifest(self.outputPath);
    }
  });
};

function md5Hash(buf) {
  var md5 = crypto.createHash('md5');
  md5.update(buf);
  return md5.digest('hex');
}

module.exports = Fingerprint;
