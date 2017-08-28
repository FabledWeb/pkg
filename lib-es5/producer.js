'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

exports.default = function (_ref) {
  var stripe = _ref.stripe,
      options = _ref.options,
      target = _ref.target;

  return new _promise2.default(function (resolve, reject) {
    var _fs$statSync = _fs2.default.statSync(target.binaryPath),
        size = _fs$statSync.size;

    var bakery = bakeryFromOptions(options);

    (0, _multistream2.default)([_fs2.default.createReadStream(target.binaryPath), function () {
      return (0, _simpleBufferstream2.default)(paddingBuffer(size));
    }, function () {
      return (0, _simpleBufferstream2.default)(bakery);
    }, function () {
      return (0, _simpleBufferstream2.default)(paddingBuffer(bakery.length));
    }, function () {
      // TODO streams? from packer?
      // using multistream factory?
      stripe = stripe.join('');
      var cmd = target.fabricator.binaryPath;
      var child = _child_process2.default.spawn(cmd, ['-e', script, '--runtime'].concat(options), { stdio: ['pipe', 'pipe', 'inherit'] });

      child.on('error', function (error) {
        reject(error);
      }).on('close', function (code) {
        if (code !== 0) {
          return reject(new Error(cmd + ' failed with code ' + code));
        }
        resolve();
      });

      child.stdin.on('error', function (error) {
        if (error.code === 'EPIPE') {
          return reject(new Error('Was not able to compile for \'' + (0, _stringify2.default)(target) + '\''));
        }
        reject(error);
      });

      child.stdin.write(prepend);
      child.stdin.write(stripe);
      child.stdin.write(append);
      child.stdin.end();
      return child.stdout;
    }]).pipe(_fs2.default.createWriteStream(target.output)).on('error', function (error) {
      reject(error);
    });
  });
};

var _simpleBufferstream = require('simple-bufferstream');

var _simpleBufferstream2 = _interopRequireDefault(_simpleBufferstream);

var _child_process = require('child_process');

var _child_process2 = _interopRequireDefault(_child_process);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _multistream = require('multistream');

var _multistream2 = _interopRequireDefault(_multistream);

var _log = require('./log.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var prepend = '(function(process, require, console) {\n';
var append = '\n})'; // dont remove \n
var boundary = 4096;

var script = '\n  var stdin = new Buffer(0);\n  process.stdin.on(\'data\', function (data) {\n    // TODO compare it with concat-stream approach\n    stdin = Buffer.concat([ stdin, data ]);\n  });\n  process.stdin.on(\'end\', function (data) {\n    var vm = require(\'vm\');\n    var s = new vm.Script(stdin, {\n      produceCachedData: true,\n      sourceless: true\n    });\n    if (!s.cachedDataProduced) {\n      console.error(\'Pkg: Cached data not produced.\');\n      process.exit(2);\n    }\n    var sentinel = new Buffer(16);\n    sentinel.writeInt32LE(0x26e0c928, 0);\n    sentinel.writeInt32LE(0x41f32b66, 4);\n    sentinel.writeInt32LE(0x3ea13ccf, 8);\n    sentinel.writeInt32LE(s.cachedData.length, 12);\n    var boundary = ' + boundary + ';\n    var size = sentinel.length + s.cachedData.length;\n    var remainder = size % boundary;\n    var padding = (remainder === 0 ? 0 : boundary - remainder);\n    process.stdout.write(sentinel);\n    process.stdout.write(s.cachedData);\n    process.stdout.write(new Buffer(padding));\n  });\n  process.stdin.resume();\n';

function paddingBuffer(size) {
  var remainder = size % boundary;
  var padding = remainder === 0 ? 0 : boundary - remainder;
  return Buffer.alloc(padding);
}

function bakeryFromOptions(options) {
  if (!Buffer.alloc) {
    throw (0, _log.wasReported)('Your node.js does not have Buffer.alloc. Please upgrade!');
  }

  var parts = [];
  for (var i = 0; i < options.length; i += 1) {
    parts.push(Buffer.from(options[i]));
    parts.push(Buffer.alloc(1));
  }
  parts.push(Buffer.alloc(1));
  var bakery = Buffer.concat(parts);

  var sentinel = new Buffer(16);
  sentinel.writeInt32LE(0x4818c4df, 0);
  sentinel.writeInt32LE(0x7ac30670, 4);
  sentinel.writeInt32LE(0x56558a76, 8);
  sentinel.writeInt32LE(bakery.length, 12);
  return Buffer.concat([sentinel, bakery]);
}