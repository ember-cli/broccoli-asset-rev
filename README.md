#broccoli-asset-rev

[Broccoli](https://github.com/broccolijs/broccoli) plugin to add fingerprint checksums to your files and update the source to reflect the new filenames.

## Installation

```js
npm install broccoli-asset-rev --save-dev
```

## Usage

```js
var assetRev = require('broccoli-asset-rev');

var assetTree = assetRev(tree, {
  fingerprintExtensions: ['js', 'css', 'png', 'jpg', 'gif'],
  replaceExtensions: ['html', 'js', 'css']
});
```

## Options

  - `fingerprintExtensions` - Default: `['js', 'css', 'png']` - The file types to add md5 checksums.
  - `fingerprintExclude` - Default: `[]` - An array of strings. If a filename contains any item in the exclude array, it will not be fingerprinted.
  - `replaceExtensions` - Default: `['html', 'css']` - The file types to replace source code with new checksum file names.
