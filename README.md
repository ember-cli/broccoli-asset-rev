#broccoli-asset-rev

[Broccoli](https://github.com/broccolijs/broccoli) plugin to add fingerprint checksums to your files and update the source to reflect the new filenames.

Turns

```
<script src="assets/appname.js">
background: url('/images/foo.png');
```

Into

```
<script src="https://subdomain.cloudfront.net/assets/appname-342b0f87ea609e6d349c7925d86bd597.js">
background: url('https://subdomain.cloudfront.net/images/foo-735d6c098496507e26bb40ecc8c1394d.png');
```

## Installation

```js
npm install broccoli-asset-rev --save-dev
```

## Usage

```js
var assetRev = require('broccoli-asset-rev');

var assetTree = assetRev(tree, {
  fingerprintExtensions: ['js', 'css', 'png', 'jpg', 'gif'],
  fingerprintExclude: ['fonts/169929'],
  replaceExtensions: ['html', 'js', 'css'],
  prependPath: 'https://subdomain.cloudfront.net/'
});
```

## Options

  - `fingerprintExtensions` - Default: `['js', 'css', 'png']` - The file types to add md5 checksums.
  - `fingerprintExclude` - Default: `[]` - An array of strings. If a filename contains any item in the exclude array, it will not be fingerprinted.
  - `replaceExtensions` - Default: `['html', 'css']` - The file types to replace source code with new checksum file names.
  - `prependPath` - Default: `''` - A string to prepend to all of the assets. Useful for CDN urls like `https://subdomain.cloudfront.net/`
  - `customHash` - Default: none - If defined, will be appended to filename instead of a md5 checksum.
