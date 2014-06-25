var Filter = require('broccoli-filter');

function UseRev(inputTree, options) {
  if (!(this instanceof UseRev)) {
    return new UseRev(inputTree, options);
  }

  options = options || {};

  this.inputTree = inputTree;
  this.assetMap = options.assetMap || {};
  this.extensions = options.replaceExtensions || [];
  this.prepend = options.prepend || '';
  this.description = options.description;
}

UseRev.prototype = Object.create(Filter.prototype);
UseRev.prototype.constructor = UseRev;

UseRev.prototype.processString = function (string) {
  var newString = string;

  /*
   * Replace all of the assets with their new fingerprint name
   *
   * Uses a regular expression to find assets in html tags, css backgrounds, handlebars pre-compiled templates, etc.
   *
   * ["\'\\(=]{1} - Match one of "'(= exactly one time
   * \\s* - Any amount of white space
   * ( - Starts the first pattern match
   * [^"\'\\(\\)=]* - Do not match any of ^"'()= 0 or more times
   * /([.*+?^=!:${}()|\[\]\/\\])/g - Replace .*+?^=!:${}()|[]/\ in filenames with an escaped version for an exact name match
   * [^"\'\\(\\)\\\\>=]* - Do not match any of ^"'()\>= 0 or more times - Explicitly add \ here because of handlebars compilation
   * ) - End first pattern match
   * \\s* - Any amount of white space
   * [\\\\]* - Allow any amount of \ - For handlebars compilation (includes \\\)
   * \\s* - Any amount of white space
   * ["\'\\)> ]{1} - Match one of "'( > exactly one time
   */

  for (var key in this.assetMap) {
    if (this.assetMap.hasOwnProperty(key)) {
      var re = new RegExp('["\'\\(=]{1}\\s*([^"\'\\(\\)=]*' + key.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1") + '[^"\'\\(\\)\\\\>=]*)\\s*[\\\\]*\\s*["\'\\)> ]{1}', 'g');
      var match = null;

      while (match = re.exec(newString)) {
        var replaceString = '';

        if (this.prepend && this.prepend !== '') {
          replaceString = this.prepend + this.assetMap[key];
        } else {
          replaceString = match[1].replace(key, this.assetMap[key]);
        }

        newString = newString.replace(new RegExp(match[1], 'g'), replaceString);
      }
    }
  }

  return newString;
};

module.exports = UseRev;
