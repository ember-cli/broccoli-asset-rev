var fs       = require('fs');
var path     = require('path');
var crypto   = require('crypto');
var assert   = require('assert');
var walkSync = require('walk-sync');
var broccoli = require('broccoli');
var MergeTrees = require('broccoli-merge-trees');
var AssetRev = require('../lib/asset-rev');
var sinon    = require('sinon');
var builder;

function md5Hash(buf) {
  var md5 = crypto.createHash('md5');
  md5.update(buf);
  return md5.digest('hex');
}
function sha1Hash(buf) {
  var sha1 = crypto.createHash('sha1');
  sha1.update(buf);
  return sha1.digest('hex');
}

function confirmOutput(actualPath, expectedPath, hashFn) {
  var actualFiles = walkSync(actualPath);
  var expectedFiles = walkSync(expectedPath);
  hashFn = hashFn || md5Hash;

  assert.deepEqual(actualFiles, expectedFiles, 'files output should be the same as those input');

  expectedFiles.forEach(function(relativePath) {
    if (relativePath.slice(-1) === '/') { return; }

    var actual   = fs.readFileSync(path.join(actualPath, relativePath), { encoding: null });
    var expected = fs.readFileSync(path.join(expectedPath, relativePath), { encoding: null });

    assert(0 === actual.compare(expected), relativePath + ': does not match expected output');

    var m = relativePath.match(/-([0-9a-f]+)\./i);
    if (m) {
      assert.equal(m[1], hashFn(actual), relativePath + ': file hash does not match fingerprint');
    }
  });
}

function confirmPathPresent(list, pattern) {
  return list.some(function(item) {
    return item.search(pattern) !== -1;
  });
}

function countPathMatches(list, pattern) {
  const count = list.reduce((count, current) => {
    if (current.search(pattern) !== -1) {
      return count + 1;
    }
    return count;
  }, 0)

  return count;
}

describe('broccoli-asset-rev', function() {
  afterEach(function() {
    if (builder) {
      builder.cleanup();
    }
  });

  it('revs the assets and rewrites the source', function(){
    var sourcePath = 'tests/fixtures/basic';

    var node = AssetRev(sourcePath + '/input', {
      extensions: ['js', 'json', 'css', 'png', 'jpg', 'gif', 'map'],
      replaceExtensions: ['html', 'js', 'css']
    });

    builder = new broccoli.Builder(node);
    return builder.build().then(function(graph) {
      confirmOutput(graph.directory, sourcePath + '/output');
    });
  });

  it('revs the assets when it is not the first plugin', function () {
    var sourcePath = 'tests/fixtures/basic';

    var merged = new MergeTrees([sourcePath + '/input']);

    var node = new AssetRev(merged, {
      extensions: ['js', 'json', 'css', 'png', 'jpg', 'gif', 'map'],
      replaceExtensions: ['html', 'js', 'css']
    });

    builder = new broccoli.Builder(node);
    return builder.build().then(function(graph) {
      confirmOutput(graph.directory, sourcePath + '/output');
    });
  });

  it('generates a rails-style asset manifest if requested', function () {
    var sourcePath = 'tests/fixtures/basic';

    var node = new AssetRev(sourcePath + '/input', {
      extensions: ['js', 'json', 'css', 'png', 'jpg', 'gif'],
      generateRailsManifest: true,
      replaceExtensions: ['html', 'js', 'css']
    });

    builder = new broccoli.Builder(node);
    return builder.build().then(function(graph) {
      var actualFiles = walkSync(graph.directory);
      var pathPresent = confirmPathPresent(actualFiles, /manifest-[0-9a-f]{32}\.json/);

      assert(pathPresent, "manifest file not found");
    });
  });

  it("doesn't fingerprint rails-style manifest if excluded", function () {
    var sourcePath = 'tests/fixtures/basic';

    var node = new AssetRev(sourcePath + '/input', {
      extensions: ['js', 'json', 'css', 'png', 'jpg', 'gif'],
      exclude: ['manifest.json'],
      generateRailsManifest: true,
      replaceExtensions: ['html', 'js', 'css']
    });

    builder = new broccoli.Builder(node);
    return builder.build().then(function(graph) {
      var actualFiles = walkSync(graph.directory);
      var pathPresent = confirmPathPresent(actualFiles, /manifest\.json/);

      assert(pathPresent, "manifest file not found");
    });
  });

  it('accepts an array of strings as exclude parameter', function () {
    var sourcePath = 'tests/fixtures/exclude';

    var node = new AssetRev(sourcePath + '/input', {
      extensions: ['js', 'css', 'png', 'jpg', 'gif', 'map', 'ttf'],
      exclude: ['assets/fonts'],
      replaceExtensions: ['html', 'js', 'css']
    });

    builder = new broccoli.Builder(node);
    return builder.build().then(function(graph) {
      confirmOutput(graph.directory, sourcePath + '/output');
    });
  });

  it('accepts an array of strings as exclude parameter', function () {
    var sourcePath = 'tests/fixtures/exclude';

    var node = new AssetRev(sourcePath + '/input', {
      extensions: ['js', 'css', 'png', 'jpg', 'gif', 'map', 'ttf'],
      exclude: ['fonts'],
      replaceExtensions: ['html', 'js', 'css']
    });

    builder = new broccoli.Builder(node);
    return builder.build().then(function(graph) {
      confirmOutput(graph.directory, sourcePath + '/output');
    });
  });

  it("accepts an array of globs as exclude parameter", function() {
    var sourcePath = 'tests/fixtures/exclude';

    var node = new AssetRev(sourcePath + '/input', {
      extensions: ['js', 'css', 'png', 'jpg', 'gif', 'map', 'ttf'],
      exclude: ['assets/fonts/**/*'],
      replaceExtensions: ['html', 'js', 'css']
    });

    builder = new broccoli.Builder(node);
    return builder.build().then(function(graph) {
      confirmOutput(graph.directory, sourcePath + '/output');
    });
  });

  it("uses a custom path for the rails-style manifest", function () {
    var sourcePath = 'tests/fixtures/basic';

    var node = new AssetRev(sourcePath + '/input', {
      extensions: ['js', 'json', 'css', 'png', 'jpg', 'gif'],
      generateRailsManifest: true,
      railsManifestPath: 'otherManifest.json',
      replaceExtensions: ['html', 'js', 'css']
    });

    builder = new broccoli.Builder(node);
    return builder.build().then(function(graph) {
      var actualFiles = walkSync(graph.directory);
      var defaultPathNotPresent = !confirmPathPresent(actualFiles, /manifest-[0-9a-f]{32}\.json/);
      var pathPresent = confirmPathPresent(actualFiles, /otherManifest\.json/);

      assert(pathPresent, "custom manifest file found");
      assert(defaultPathNotPresent, "default fingerprinted manifest file not found");
    });
  });

  it('generates an asset map if requested', function () {
    var sourcePath = 'tests/fixtures/basic';

    var extensions = ['js', 'json', 'css', 'png', 'jpg', 'gif'];
    var node = new AssetRev(sourcePath + '/input', {
      extensions: extensions,
      generateAssetMap: true,
      replaceExtensions: ['html', 'js', 'css']
    });

    builder = new broccoli.Builder(node);
    return builder.build().then(function(graph) {
      var actualFiles = walkSync(graph.directory);
      const matches = countPathMatches(actualFiles, /assetMap\.json/);

      assert((matches > 0), "asset map file not found");
      assert((matches < 2), "more than 1 asset map found");

      var assetMap = JSON.parse(
        fs.readFileSync(
          path.join(graph.directory, 'assets/assetMap.json'),
          { encoding: 'utf8'}
        )
      );

      var mappedFiles = actualFiles.filter(function(name) {
        if (-1 !== name.lastIndexOf('assetMap.json')) return true;
        for (var i = 0; i < extensions.length; ++i) {
          if (-1 !== name.lastIndexOf(extensions[i])) {
            return fs.statSync(path.join(graph.directory, name)).isFile();
          }
        }
        return false;
      });
      for (var k in assetMap.assets) {
        if (Object.prototype.hasOwnProperty.call(assetMap.assets, k)) {
          var assetFile = assetMap.assets[k];
          assert(false === /-([0-9a-f]+)\./i.test(k), k + ': mapped asset key contains fingerprinted file?');

          var mappedFileIndex = mappedFiles.indexOf(assetFile);
          assert(mappedFileIndex >= 0, k + ': unexpected entry in asset map');
          mappedFiles.splice(mappedFileIndex, 1);
        }
      }
      assert(0 === mappedFiles.length, 'One or more files were not mentioned in the asset map - ' + mappedFiles.join(', '));
    });
  });

  it("fingerprints the asset map if requested", function () {
    var sourcePath = 'tests/fixtures/basic';

    var node = new AssetRev(sourcePath + '/input', {
      extensions: ['js', 'json', 'css', 'png', 'jpg', 'gif'],
      fingerprintAssetMap: true,
      generateAssetMap: true,
      replaceExtensions: ['html', 'js', 'css']
    });

    builder = new broccoli.Builder(node);
    return builder.build().then(function(graph) {
      var actualFiles = walkSync(graph.directory);
      var matches = countPathMatches(actualFiles, /assetMap-[0-9a-f]{32}\.json/);

      assert((matches > 0), "fingerprinted asset map file not found");
      assert((matches < 2), "more than 1 asset map file found");
    });
  });

  it("uses a custom path for the asset map", function () {
    var sourcePath = 'tests/fixtures/basic';

    var node = new AssetRev(sourcePath + '/input', {
      extensions: ['js', 'json', 'css', 'png', 'jpg', 'gif'],
      fingerprintAssetMap: true,
      generateAssetMap: true,
      assetMapPath: 'otherAssetMap.json',
      replaceExtensions: ['html', 'js', 'css']
    });

    builder = new broccoli.Builder(node);
    return builder.build().then(function(graph) {
      var actualFiles = walkSync(graph.directory);
      var defaultPathNotPresent = !confirmPathPresent(actualFiles, /assetMap-[0-9a-f]{32}\.json/);
      var pathPresent = confirmPathPresent(actualFiles, /otherAssetMap\.json/);

      assert(pathPresent, "custom asset map file found");
      assert(defaultPathNotPresent, "default fingerprinted asset map file not found");
    });
  });

  it('will prepend if set', function () {
    var sourcePath = 'tests/fixtures/prepend';

    var node = new AssetRev(sourcePath + '/input', {
      extensions: ['js', 'css', 'png', 'jpg', 'gif', 'map'],
      replaceExtensions: ['html', 'js', 'css'],
      prepend: 'https://foobar.cloudfront.net/'
    });

    builder = new broccoli.Builder(node);
    return builder.build().then(function(graph) {
      confirmOutput(graph.directory, sourcePath + '/output');
    });
  });

  it('skips fingerprint and prepends when set and customHash is null', function () {
    var sourcePath = 'tests/fixtures/prepend';

    var node = new AssetRev(sourcePath + '/input', {
      extensions: ['js', 'css', 'png', 'jpg', 'gif', 'map'],
      replaceExtensions: ['html', 'js', 'css'],
      prepend: 'https://foobar.cloudfront.net/',
      customHash: null
    });

    builder = new broccoli.Builder(node);
    return builder.build().then(function(graph) {
      confirmOutput(graph.directory, sourcePath + '/output-customHash-null');
    });
  });

  it('skips fingerprint when customHash is null', function () {
    var sourcePath = 'tests/fixtures/customHash-null';

    var node = new AssetRev(sourcePath + '/input-output', {
      extensions: ['js', 'css', 'png', 'jpg', 'gif', 'map'],
      replaceExtensions: ['html', 'js', 'css'],
      customHash: null
    });

    builder = new broccoli.Builder(node);
    return builder.build().then(function(graph) {
      confirmOutput(graph.directory, sourcePath + '/input-output');
    });
  });

  it('replaces the correct match for the file extension', function () {
    var sourcePath = 'tests/fixtures/extensions';

    var node = new AssetRev(sourcePath + '/input', {
      extensions: ['js', 'css', 'png', 'jpg', 'gif', 'woff', 'woff2', 'ttf', 'svg', 'eot'],
      replaceExtensions: ['html', 'js' ,'css']
    });

    builder = new broccoli.Builder(node);
    return builder.build().then(function (graph) {
      confirmOutput(graph.directory, sourcePath + '/output');
    });
  });

  it('uses customHash string value', function(){
    var sourcePath = 'tests/fixtures/customHash-simple';

    var node = new AssetRev(sourcePath + '/input', {
      extensions: ['js', 'css', 'png', 'jpg', 'gif'],
      replaceExtensions: ['html', 'js', 'css'],
      customHash: 'test'
    });

    builder = new broccoli.Builder(node);
    return builder.build().then(function(graph) {
      confirmOutput(graph.directory, sourcePath + '/output');
    });
  });

  it('uses customHash function value', function(){
    var sourcePath = 'tests/fixtures/customHash-function';

    var node = new AssetRev(sourcePath + '/input', {
      extensions: ['js', 'css', 'png', 'jpg', 'gif'],
      replaceExtensions: ['html', 'js', 'css'],
      customHash: sha1Hash
    });

    builder = new broccoli.Builder(node);
    return builder.build().then(function(graph) {
      confirmOutput(graph.directory, sourcePath + '/output', sha1Hash);
    });
  });

  it('creates a sprockets-style manifest', function(){
    var sourcePath = 'tests/fixtures/manifest';
    var date  = new Date(Date.UTC(2015, 0, 1, 8));
    var original = fs.statSync;

    sinon.stub(fs, 'statSync', function (path) {
      var stats = original.apply(this, arguments);
      stats.mtime = date;

      return stats;
    });

    var node = new AssetRev(sourcePath + '/input', {
      extensions: ['js', 'css', 'png', 'jpg', 'gif', 'map'],
      replaceExtensions: ['html', 'js', 'css'],
      generateRailsManifest: true
    });

    builder = new broccoli.Builder(node);
    return builder.build().then(function(graph) {
      confirmOutput(graph.directory, sourcePath + '/output');
      fs.statSync.restore()
    });
  });

  it('merges the generated manifest with the sprockets manifest', function(){
    var sourcePath = 'tests/fixtures/existing-manifest';

    var original = fs.statSync;
    var date = new Date(Date.UTC(2015, 0, 1, 8));

    sinon.stub(fs, 'statSync', function (path) {
      var stats = original.apply(this, arguments);
      stats.mtime = date;

      return stats;
    });

    var node = new AssetRev(sourcePath + '/input', {
      extensions: ['js', 'css', 'png', 'jpg', 'gif', 'map'],
      replaceExtensions: ['html', 'js', 'css'],
      generateRailsManifest: true
    });

    builder = new broccoli.Builder(node);
    return builder.build().then(function(graph) {
      confirmOutput(graph.directory, sourcePath + '/output');
      fs.statSync.restore()
    });
  });

  it('rewrites the fastboot manifest', function(){
    var sourcePath = 'tests/fixtures/fastboot';

    var node = AssetRev(sourcePath + '/input', {
      extensions: ['js', 'css', 'png', 'jpg', 'gif', 'map'],
      replaceExtensions: ['html', 'js', 'css']
    });

    builder = new broccoli.Builder(node);
    return builder.build().then(function(graph) {
      confirmOutput(graph.directory, sourcePath + '/output');
    });
  });

});
