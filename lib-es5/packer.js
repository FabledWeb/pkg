'use strict';

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var fs = require('fs');
var assert = require('assert');
var common = require('../prelude/common.js');
var log = require('./log.js').log;
var pkgVersion = require('../package.json').version;

var STORE_CODE = common.STORE_CODE;
var STORE_CONTENT = common.STORE_CONTENT;
var STORE_LINKS = common.STORE_LINKS;
var STORE_STAT = common.STORE_STAT;

var isDotJS = common.isDotJS;
var isDotJSON = common.isDotJSON;
var snapshotify = common.snapshotify;

var bootstrapText = fs.readFileSync(require.resolve('../prelude/bootstrap.js'), 'utf8').replace('%PKG_VERSION%', pkgVersion);

var commonText = fs.readFileSync(require.resolve('../prelude/common.js'), 'utf8');

function itemsToText(items) {
  var len = items.length;
  return len.toString() + (len % 10 === 1 ? ' item' : ' items');
}

function reduceRecords(records) {
  assert(Array.isArray(records), 'packer: bad records to reduce');
  var result = {};

  records.some(function (record) {
    if (record.discard) return;
    var file = record.file;
    if (!result[file]) result[file] = {};
    result[file][record.store] = record.body;
  });

  return result;
}

module.exports = function packer(opts) {
  var stripe = [];

  function write(x) {
    assert(typeof x === 'string', 'packer: can write only strings');
    stripe.push(x);
  }

  var records = reduceRecords(opts.records);

  write('(function(REQUIRE_COMMON, VIRTUAL_FILESYSTEM, DEFAULT_ENTRYPOINT) {');
  write(bootstrapText);
  write('})(function(exports) {');
  write(commonText);
  write('}, {\n');

  var first1 = true;

  (0, _keys2.default)(records).some(function (file) {
    if (!first1) write(',');
    first1 = false;

    write((0, _stringify2.default)(snapshotify(file, opts.slash)));
    write(':[\n');

    var record = records[file];
    assert(record[STORE_STAT], 'packer: no STORE_STAT');

    if (typeof record[STORE_CODE] !== 'undefined' && typeof record[STORE_CONTENT] !== 'undefined') {
      delete record[STORE_CODE];
    }

    var first2 = true;

    [STORE_CODE, STORE_CONTENT, STORE_LINKS, STORE_STAT].some(function (store, index) {
      assert(store === index, 'packer: stores misordered');
      if (!first2) write(',');
      first2 = false;

      var value = record[store];

      if (typeof value === 'undefined') {
        write('null');
        return;
      }

      if (store === STORE_CODE) {
        assert(typeof value === 'string', 'packer: bad STORE_CODE');

        write('function(exports, require, module, __filename, __dirname) {\n');
        write(value);
        write('\n}'); // dont remove \n, otherwise last comment will cover right brace

        log.debug('The file was included as compiled code (no sources)', file);
      } else if (store === STORE_CONTENT) {
        if (Buffer.isBuffer(value)) {
          write('new Buffer(\'');
          write(value.toString('base64'));
          write('\',\'base64\')');
        } else if (typeof value === 'string') {
          write('new Buffer(\'');
          write(new Buffer(value).toString('base64'));
          write('\',\'base64\')');
        } else {
          assert(false, 'packer: bad STORE_CONTENT');
        }

        var disclosed = isDotJS(file) || isDotJSON(file);
        log.debug(disclosed ? 'The file was included as DISCLOSED code (with sources)' : 'The file was included as asset content', file);
      } else if (store === STORE_LINKS) {
        assert(Array.isArray(value), 'packer: bad STORE_LINKS');
        write((0, _stringify2.default)(value));
        log.debug('The directory files list was included (' + itemsToText(value) + ')', file);
      } else if (store === STORE_STAT) {
        assert((typeof value === 'undefined' ? 'undefined' : (0, _typeof3.default)(value)) === 'object', 'packer: bad STORE_STAT');
        var newValue = (0, _assign2.default)({}, value);
        newValue.atime = value.atime.getTime();
        newValue.mtime = value.mtime.getTime();
        newValue.ctime = value.ctime.getTime();
        newValue.birthtime = value.birthtime.getTime();
        newValue.isFileValue = value.isFile();
        newValue.isDirectoryValue = value.isDirectory();
        write((0, _stringify2.default)(newValue));
      } else {
        assert(false, 'packer: unknown store');
      }
    });

    write('\n]');
  });

  write('\n},');

  opts.records.some(function (record) {
    if (record.entrypoint) {
      write((0, _stringify2.default)(snapshotify(record.file, opts.slash)));
      return true;
    }
  });

  write('\n)');

  return stripe;
};