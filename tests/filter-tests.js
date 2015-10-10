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

function confirmOutput(actualPath, expectedPath) {
  var actualFiles = walkSync(actualPath);
  var expectedFiles = walkSync(expectedPath);

  assert.deepEqual(actualFiles, expectedFiles, 'files output should be the same as those input');

  expectedFiles.forEach(function(relativePath) {
    if (relativePath.slice(-1) === '/') { return; }

    var actual   = fs.readFileSync(path.join(actualPath, relativePath), { encoding: 'utf8'});
    var expected = fs.readFileSync(path.join(expectedPath, relativePath), { encoding: 'utf8' });

    assert.equal(actual, expected, relativePath + ': does not match expected output');
  });
}

function confirmPathPresent(list, pattern) {
  return list.some(function(item) {
    return item.search(pattern) !== -1;
  });
}

describe('broccoli-asset-rev', function() {
  afterEach(function() {
    if (builder) {
      builder.cleanup();
    }
  });

  it('revs the assets and rewrites the source', function(){
    var sourcePath = 'tests/fixtures/basic';

    var node = new AssetRev(sourcePath + '/input', {
      extensions: ['js', 'css', 'png', 'jpg', 'gif', 'map'],
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
      extensions: ['js', 'css', 'png', 'jpg', 'gif', 'map'],
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
      extensions: ['js', 'css', 'png', 'jpg', 'gif'],
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
      extensions: ['js', 'css', 'png', 'jpg', 'gif'],
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

  it("uses a custom path for the rails-style manifest", function () {
    var sourcePath = 'tests/fixtures/basic';

    var node = new AssetRev(sourcePath + '/input', {
      extensions: ['js', 'css', 'png', 'jpg', 'gif'],
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

    var node = new AssetRev(sourcePath + '/input', {
      extensions: ['js', 'css', 'png', 'jpg', 'gif'],
      generateAssetMap: true,
      replaceExtensions: ['html', 'js', 'css']
    });

    builder = new broccoli.Builder(node);
    return builder.build().then(function(graph) {
      var actualFiles = walkSync(graph.directory);
      var pathPresent = confirmPathPresent(actualFiles, /assetMap\.json/);

      assert(pathPresent, "asset map file not found");
    });
  });

  it("fingerprints the asset map if requested", function () {
    var sourcePath = 'tests/fixtures/basic';

    var node = new AssetRev(sourcePath + '/input', {
      extensions: ['js', 'css', 'png', 'jpg', 'gif'],
      fingerprintAssetMap: true,
      generateAssetMap: true,
      replaceExtensions: ['html', 'js', 'css']
    });

    builder = new broccoli.Builder(node);
    return builder.build().then(function(graph) {
      var actualFiles = walkSync(graph.directory);
      var pathPresent = confirmPathPresent(actualFiles, /assetMap-[0-9a-f]{32}\.json/);

      assert(pathPresent, "fingerprinted asset map file not found");
    });
  });

  it("uses a custom path for the asset map", function () {
    var sourcePath = 'tests/fixtures/basic';

    var node = new AssetRev(sourcePath + '/input', {
      extensions: ['js', 'css', 'png', 'jpg', 'gif'],
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
      customHash: function(buf) {
        var sha1 = crypto.createHash('sha1');
        sha1.update(buf);
        return sha1.digest('hex');
      }
    });

    builder = new broccoli.Builder(node);
    return builder.build().then(function(graph) {
      confirmOutput(graph.directory, sourcePath + '/output');
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
});
