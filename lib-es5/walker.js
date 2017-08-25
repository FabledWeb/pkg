'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _common = require('../prelude/common.js');

var _log = require('./log.js');

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _detector = require('./detector.js');

var _detector2 = _interopRequireDefault(_detector);

var _follow = require('./follow.js');

var _follow2 = _interopRequireDefault(_follow);

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _globby = require('globby');

var _globby2 = _interopRequireDefault(_globby);

var _natives = require('./natives.js');

var _natives2 = _interopRequireDefault(_natives);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function shortFromAlias(alias) {
  // alias = fs-promise or @types/node
  if (alias[0] === '@') {
    return alias.match(/^([^\\\/]+[\\\/][^\\\/]+)/)[0];
  } else {
    return alias.match(/^[^\\\/]+/)[0];
  }
}

function isPermissive(config) {
  if (config.private) return false;
  var license = config.license,
      licenses = config.licenses;

  if (!license && licenses) license = licenses[0];
  if ((typeof license === 'undefined' ? 'undefined' : (0, _typeof3.default)(license)) === 'object') license = license.type;
  if (!license) return false;
  if (/^\(/.test(license)) license = license.slice(1);
  if (/\)$/.test(license)) license = license.slice(0, -1);
  license = license.toLowerCase();
  licenses = Array.prototype.concat(license.split(' or '), license.split(' and '), license.split('/'), license.split(','));
  var result = false;
  var foss = ['isc', 'mit', 'apache-2.0', 'apache 2.0', 'public domain', 'bsd', 'bsd-2-clause', 'bsd-3-clause', 'wtfpl', 'cc-by-3.0', 'x11', 'artistic-2.0', 'gplv3', 'mpl', 'mplv2.0'];
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = (0, _getIterator3.default)(licenses), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var c = _step.value;

      result = foss.indexOf(c) >= 0;
      if (result) break;
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return result;
}

function upon(p, base) {
  if (typeof p !== 'string') {
    throw (0, _log.wasReported)('Config items must be strings. See examples.');
  }
  var negate = false;
  if (p[0] === '!') {
    p = p.slice(1);
    negate = true;
  }
  if (!_path2.default.isAbsolute(p)) {
    p = _path2.default.join(base, p);
  }
  if (negate) {
    p = '!' + p;
  }
  return p;
}

function collect(ps) {
  return _globby2.default.sync(ps, { dot: true });
}

function expandFiles(efs, base) {
  if (!Array.isArray(efs)) {
    efs = [efs];
  }
  efs = efs.concat(efs.map(function (ef) {
    return (
      // npm/node_modules/fstream-npm/fstream-npm.js
      // Packer.prototype.readRules
      ef.replace(/\/+$/, '') + '/**'
    );
  }));
  efs = collect(efs.map(function (p) {
    return upon(p, base);
  }));
  return efs;
}

var Walker = function () {
  function Walker() {
    (0, _classCallCheck3.default)(this, Walker);
  }

  (0, _createClass3.default)(Walker, [{
    key: 'appendSub',
    value: function appendSub(r, key) {
      this.recordsMap[key] = r;
      this.records.push(r);
      if (r.reason) {
        _log.log.debug('File %1 added to queue. It was required from %2', [r.file, r.reason]);
      } else {
        _log.log.debug('File %1 added to queue', [r.file]);
      }
    }
  }, {
    key: 'append',
    value: function append(r) {
      r.file = (0, _common.normalizePath)(r.file);
      var key = (0, _stringify2.default)([r.file, r.store.toString()]);
      var prev = this.recordsMap[key];
      if (!prev) return this.appendSub(r, key);
      if (r.store === _common.STORE_CONTENT) {
        if (r.treatAsCODE && !prev.treatAsCODE) {
          prev.discard = true;
          this.appendSub(r, key);
        }
      } else if (r.store === _common.STORE_LINKS) {
        (0, _assert2.default)(prev.body, 'walker: expected body for STORE_LINKS');
        (0, _assert2.default)(r.body.length === 1, 'walker: expected body length 1');
        prev.body.push(r.body[0]);
      }
    }
  }, {
    key: 'appendFilesFromConfig',
    value: function () {
      var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(tuple) {
        var config, base, pkgConfig, scripts, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, script, stat, assets, _iteratorNormalCompletion3, _didIteratorError3, _iteratorError3, _iterator3, _step3, asset, _stat, files, _iteratorNormalCompletion4, _didIteratorError4, _iteratorError4, _iterator4, _step4, file, _stat2;

        return _regenerator2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                config = tuple.config, base = tuple.base;
                pkgConfig = config.pkg;

                if (!pkgConfig) {
                  _context.next = 67;
                  break;
                }

                scripts = pkgConfig.scripts;

                if (!scripts) {
                  _context.next = 34;
                  break;
                }

                scripts = expandFiles(scripts, base);
                _iteratorNormalCompletion2 = true;
                _didIteratorError2 = false;
                _iteratorError2 = undefined;
                _context.prev = 9;
                _iterator2 = (0, _getIterator3.default)(scripts);

              case 11:
                if (_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done) {
                  _context.next = 20;
                  break;
                }

                script = _step2.value;
                _context.next = 15;
                return _fsExtra2.default.stat(script);

              case 15:
                stat = _context.sent;

                if (stat.isFile()) {
                  this.append({
                    file: script,
                    tuple: tuple,
                    store: _common.STORE_CODE
                  });
                }

              case 17:
                _iteratorNormalCompletion2 = true;
                _context.next = 11;
                break;

              case 20:
                _context.next = 26;
                break;

              case 22:
                _context.prev = 22;
                _context.t0 = _context['catch'](9);
                _didIteratorError2 = true;
                _iteratorError2 = _context.t0;

              case 26:
                _context.prev = 26;
                _context.prev = 27;

                if (!_iteratorNormalCompletion2 && _iterator2.return) {
                  _iterator2.return();
                }

              case 29:
                _context.prev = 29;

                if (!_didIteratorError2) {
                  _context.next = 32;
                  break;
                }

                throw _iteratorError2;

              case 32:
                return _context.finish(29);

              case 33:
                return _context.finish(26);

              case 34:
                assets = pkgConfig.assets;

                if (!assets) {
                  _context.next = 65;
                  break;
                }

                assets = expandFiles(assets, base);
                _iteratorNormalCompletion3 = true;
                _didIteratorError3 = false;
                _iteratorError3 = undefined;
                _context.prev = 40;
                _iterator3 = (0, _getIterator3.default)(assets);

              case 42:
                if (_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done) {
                  _context.next = 51;
                  break;
                }

                asset = _step3.value;
                _context.next = 46;
                return _fsExtra2.default.stat(asset);

              case 46:
                _stat = _context.sent;

                if (_stat.isFile()) {
                  this.append({
                    file: asset,
                    tuple: tuple,
                    store: _common.STORE_CONTENT
                  });
                }

              case 48:
                _iteratorNormalCompletion3 = true;
                _context.next = 42;
                break;

              case 51:
                _context.next = 57;
                break;

              case 53:
                _context.prev = 53;
                _context.t1 = _context['catch'](40);
                _didIteratorError3 = true;
                _iteratorError3 = _context.t1;

              case 57:
                _context.prev = 57;
                _context.prev = 58;

                if (!_iteratorNormalCompletion3 && _iterator3.return) {
                  _iterator3.return();
                }

              case 60:
                _context.prev = 60;

                if (!_didIteratorError3) {
                  _context.next = 63;
                  break;
                }

                throw _iteratorError3;

              case 63:
                return _context.finish(60);

              case 64:
                return _context.finish(57);

              case 65:
                _context.next = 98;
                break;

              case 67:
                files = config.files;

                if (!files) {
                  _context.next = 98;
                  break;
                }

                files = expandFiles(files, base);
                _iteratorNormalCompletion4 = true;
                _didIteratorError4 = false;
                _iteratorError4 = undefined;
                _context.prev = 73;
                _iterator4 = (0, _getIterator3.default)(files);

              case 75:
                if (_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done) {
                  _context.next = 84;
                  break;
                }

                file = _step4.value;
                _context.next = 79;
                return _fsExtra2.default.stat(file);

              case 79:
                _stat2 = _context.sent;

                if (_stat2.isFile()) {
                  // 1) remove sources of top-level(!) package 'files' i.e. ship as CODE
                  // 2) non-source (non-js) files of top-level package are shipped as CONTENT
                  // 3) parsing all js 'files' of non-top-level packages fails, hence CONTENT
                  if (tuple.toplevel) {
                    this.append({
                      file: file,
                      tuple: tuple,
                      store: (0, _common.isDotJS)(file) ? _common.STORE_CODE : _common.STORE_CONTENT
                    });
                  } else {
                    this.append({
                      file: file,
                      tuple: tuple,
                      store: _common.STORE_CONTENT
                    });
                  }
                }

              case 81:
                _iteratorNormalCompletion4 = true;
                _context.next = 75;
                break;

              case 84:
                _context.next = 90;
                break;

              case 86:
                _context.prev = 86;
                _context.t2 = _context['catch'](73);
                _didIteratorError4 = true;
                _iteratorError4 = _context.t2;

              case 90:
                _context.prev = 90;
                _context.prev = 91;

                if (!_iteratorNormalCompletion4 && _iterator4.return) {
                  _iterator4.return();
                }

              case 93:
                _context.prev = 93;

                if (!_didIteratorError4) {
                  _context.next = 96;
                  break;
                }

                throw _iteratorError4;

              case 96:
                return _context.finish(93);

              case 97:
                return _context.finish(90);

              case 98:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this, [[9, 22, 26, 34], [27,, 29, 33], [40, 53, 57, 65], [58,, 60, 64], [73, 86, 90, 98], [91,, 93, 97]]);
      }));

      function appendFilesFromConfig(_x) {
        return _ref.apply(this, arguments);
      }

      return appendFilesFromConfig;
    }()
  }, {
    key: 'stepActivate',
    value: function () {
      var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(record, derivatives) {
        var tuple, config, name, d, pkgConfig, patches, key, p, dependencies, dependency;
        return _regenerator2.default.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                tuple = record.tuple;

                if (!tuple) (0, _assert2.default)(false);

                if (!tuple.activated) {
                  _context2.next = 4;
                  break;
                }

                return _context2.abrupt('return');

              case 4:
                config = tuple.config;

                if (!config) (0, _assert2.default)(false);

                name = config.name;

                if (name) {
                  d = this.dictionaries[name];

                  if (d) {
                    if ((0, _typeof3.default)(config.dependencies) === 'object' && (0, _typeof3.default)(d.dependencies) === 'object') {
                      (0, _assign2.default)(config.dependencies, d.dependencies);
                      delete d.dependencies;
                    }
                    (0, _assign2.default)(config, d);
                    tuple.dictionary = true;
                  }
                }

                pkgConfig = config.pkg;

                if (pkgConfig) {
                  patches = pkgConfig.patches;

                  if (patches) {
                    for (key in patches) {
                      p = _path2.default.join(tuple.base, key);

                      this.patches[p] = patches[key];
                    }
                  }
                }

                dependencies = config.dependencies;

                if ((typeof dependencies === 'undefined' ? 'undefined' : (0, _typeof3.default)(dependencies)) === 'object') {
                  for (dependency in dependencies) {
                    // it may be `undefined` - overridden
                    // in dictionary (see publicsuffixlist)
                    if (dependencies[dependency]) {
                      derivatives.push({
                        alias: dependency,
                        aliasType: _common.ALIAS_AS_RESOLVABLE
                      });
                    }
                  }
                }

                _context2.next = 14;
                return this.appendFilesFromConfig(tuple);

              case 14:
                tuple.permissive = isPermissive(config);
                tuple.activated = true;

              case 16:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function stepActivate(_x2, _x3) {
        return _ref2.apply(this, arguments);
      }

      return stepActivate;
    }()
  }, {
    key: 'stepRead',
    value: function () {
      var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(record) {
        var body;
        return _regenerator2.default.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                body = void 0;
                _context3.prev = 1;
                _context3.next = 4;
                return _fsExtra2.default.readFile(record.file);

              case 4:
                body = _context3.sent;
                _context3.next = 11;
                break;

              case 7:
                _context3.prev = 7;
                _context3.t0 = _context3['catch'](1);

                _log.log.error('Cannot read file, ' + _context3.t0.code, record.file);
                throw (0, _log.wasReported)(_context3.t0);

              case 11:

                record.body = body;

              case 12:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this, [[1, 7]]);
      }));

      function stepRead(_x4) {
        return _ref3.apply(this, arguments);
      }

      return stepRead;
    }()
  }, {
    key: 'stepPatch',
    value: function stepPatch(record) {
      var patch = this.patches[record.file];
      if (!patch) return;

      var body = record.body.toString('utf8');

      for (var i = 0; i < patch.length; i += 2) {
        if ((0, _typeof3.default)(patch[i]) === 'object') {
          if (patch[i].do === 'erase') {
            body = patch[i + 1];
          } else if (patch[i].do === 'prepend') {
            body = patch[i + 1] + body;
          } else if (patch[i].do === 'append') {
            body += patch[i + 1];
          }
        } else if (typeof patch[i] === 'string') {
          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
          // function escapeRegExp
          var esc = patch[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          var regexp = new RegExp(esc, 'g');
          body = body.replace(regexp, patch[i + 1]);
        }
      }

      record.body = body;
    }
  }, {
    key: 'stepStrip',
    value: function stepStrip(record) {
      var body = record.body.toString('utf8');

      if (/^\ufeff/.test(body)) {
        body = body.replace(/^\ufeff/, '');
      }
      if (/^#!/.test(body)) {
        body = body.replace(/^#![^\n]*\n/, '\n');
      }

      record.body = body;
    }
  }, {
    key: 'stepDetect',
    value: function stepDetect(record, derivatives) {
      var body = record.body;

      try {
        _detector2.default.detect(body, function (node, trying) {
          var dictionary = record.tuple.dictionary;

          var d = _detector2.default.visitor_SUCCESSFUL(node);
          if (d) {
            if (d.mustExclude) return false;
            d.mayExclude = d.mayExclude || trying;
            derivatives.push(d);
            return false;
          }
          d = _detector2.default.visitor_NONLITERAL(node);
          if (d) {
            if (d.mustExclude) return false;
            var debug = dictionary || d.mayExclude || trying;
            var level = debug ? 'debug' : 'warn';
            _log.log[level]('Cannot resolve \'' + d.alias + '\'', [record.file, 'Use a string literal as argument for \'require\', or leave it', 'as is and specify the resolved file name in \'scripts\' option.']);
            return false;
          }
          d = _detector2.default.visitor_MALFORMED(node);
          if (d) {
            // there is no 'mustExclude'
            var _debug = dictionary || trying;
            var _level = _debug ? 'debug' : 'warn'; // there is no 'mayExclude'
            _log.log[_level]('Malformed requirement \'' + d.alias + '\'', [record.file]);
            return false;
          }
          d = _detector2.default.visitor_USESCWD(node);
          if (d) {
            // there is no 'mustExclude'
            var _level2 = 'debug'; // there is no 'mayExclude'
            _log.log[_level2]('Path.resolve(' + d.alias + ') is ambiguous', [record.file, 'It resolves relatively to \'process.cwd\' by default, however', 'you may want to use \'path.dirname(require.main.filename)\'']);
            return false;
          }
          return true; // can i go inside?
        });
      } catch (error) {
        _log.log.error(error.message, record.file);
        throw (0, _log.wasReported)(error);
      }
    }
  }, {
    key: 'stepDerivatives_ALIAS_AS_RELATIVE',
    value: function () {
      var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(record, derivative) {
        var file, stat;
        return _regenerator2.default.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                // eslint-disable-line camelcase
                file = _path2.default.join(_path2.default.dirname(record.file), derivative.alias);
                stat = void 0;
                _context4.prev = 2;
                _context4.next = 5;
                return _fsExtra2.default.stat(file);

              case 5:
                stat = _context4.sent;
                _context4.next = 12;
                break;

              case 8:
                _context4.prev = 8;
                _context4.t0 = _context4['catch'](2);

                _log.log.error('Cannot stat, ' + _context4.t0.code, [file, 'The file was required from \'' + record.file + '\'']);
                throw (0, _log.wasReported)(_context4.t0);

              case 12:

                if (stat.isFile()) {
                  this.append({
                    file: file,
                    tuple: record.tuple,
                    store: _common.STORE_CONTENT,
                    reason: record.file
                  });
                }

              case 13:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this, [[2, 8]]);
      }));

      function stepDerivatives_ALIAS_AS_RELATIVE(_x5, _x6) {
        return _ref4.apply(this, arguments);
      }

      return stepDerivatives_ALIAS_AS_RELATIVE;
    }()
  }, {
    key: 'stepDerivatives_ALIAS_AS_RESOLVABLE',
    value: function () {
      var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5(record, derivative) {
        var catcher, stage, newPackage, newTuple, newFile1, failure, isNear, mainNotFound, short, _failure, message, name, dictionary, debug, level;

        return _regenerator2.default.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                // eslint-disable-line camelcase
                catcher = {};
                stage = 0;
                newPackage = void 0;
                newTuple = void 0;


                catcher.readFileSync = function (file) {
                  // only first occurence from loadNodeModulesSync
                  if (stage === 2) return;
                  (0, _assert2.default)(stage === 0);
                  (0, _assert2.default)((0, _common.isPackageJson)(file), 'walker: ' + file + ' must be package.json');
                  newPackage = file;
                  newTuple = undefined;
                  stage = 1;
                  return _fsExtra2.default.readFileSync(file);
                };

                catcher.packageFilter = function (config, base) {
                  (0, _assert2.default)(stage === 1);
                  newTuple = { config: config, base: base };
                  stage = 2;
                  return config;
                };

                newFile1 = void 0, failure = void 0;
                _context5.prev = 7;
                _context5.next = 10;
                return (0, _follow2.default)(derivative.alias, {
                  basedir: _path2.default.dirname(record.file),
                  // default is extensions: ['.js'], but
                  // it is not enough because 'typos.json'
                  // is not taken in require('./typos')
                  // in 'normalize-package-data/lib/fixer.js'
                  extensions: ['.js', '.json', '.node'],
                  readFileSync: catcher.readFileSync,
                  packageFilter: catcher.packageFilter
                });

              case 10:
                newFile1 = _context5.sent;
                _context5.next = 16;
                break;

              case 13:
                _context5.prev = 13;
                _context5.t0 = _context5['catch'](7);

                failure = _context5.t0;

              case 16:

                // was taken from resolve/lib/sync.js
                isNear = /^(?:\.\.?(?:\/|$)|\/|([A-Za-z]:)?[\\\/])/;
                mainNotFound = false;

                if (isNear.test(derivative.alias)) {
                  _context5.next = 29;
                  break;
                }

                short = shortFromAlias(derivative.alias);
                // 'npm' !== 'npm/bin/npm-cli.js'

                if (!(short !== derivative.alias)) {
                  _context5.next = 28;
                  break;
                }

                _context5.prev = 21;
                _context5.next = 24;
                return (0, _follow2.default)(short, {
                  basedir: _path2.default.dirname(record.file),
                  extensions: ['.js', '.json', '.node'],
                  readFileSync: catcher.readFileSync,
                  packageFilter: catcher.packageFilter
                });

              case 24:
                _context5.next = 28;
                break;

              case 26:
                _context5.prev = 26;
                _context5.t1 = _context5['catch'](21);

              case 28:
                // 'babel-runtime' === 'babel-runtime'
                if (short === derivative.alias) {
                  // 1) not near 2) pure package name as alias
                  // 3) failure to obtain 'main' entry file
                  // 4) on the other hand newPackage is ok
                  // this means we deal with babel-runtime-like
                  // main-less package. hence no warnings
                  mainNotFound = failure && newPackage;
                }

              case 29:

                (0, _assert2.default)(newPackage && newTuple || !newPackage && !newTuple, 'Probably, package.json is malformed');

                if (newPackage) {
                  this.append({
                    file: newPackage,
                    tuple: newTuple,
                    store: _common.STORE_CONTENT,
                    reason: record.file
                  });
                }

                if (!failure) {
                  _context5.next = 39;
                  break;
                }

                _failure = failure, message = _failure.message;

                if (mainNotFound && newTuple.config) {
                  name = newTuple.config.name.name;

                  message = 'Package.json.main entry not found in ' + name;
                }
                dictionary = record.tuple.dictionary;
                debug = dictionary || derivative.mayExclude || mainNotFound;
                level = debug ? 'debug' : 'warn';

                _log.log[level](message, [record.file]);
                return _context5.abrupt('return');

              case 39:

                this.append({
                  file: newFile1,
                  tuple: newTuple || record.tuple,
                  store: _common.STORE_CODE,
                  reason: record.file
                });

              case 40:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this, [[7, 13], [21, 26]]);
      }));

      function stepDerivatives_ALIAS_AS_RESOLVABLE(_x7, _x8) {
        return _ref5.apply(this, arguments);
      }

      return stepDerivatives_ALIAS_AS_RESOLVABLE;
    }()
  }, {
    key: 'stepDerivatives',
    value: function () {
      var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6(record, derivatives) {
        var _iteratorNormalCompletion5, _didIteratorError5, _iteratorError5, _iterator5, _step5, derivative;

        return _regenerator2.default.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                _iteratorNormalCompletion5 = true;
                _didIteratorError5 = false;
                _iteratorError5 = undefined;
                _context6.prev = 3;
                _iterator5 = (0, _getIterator3.default)(derivatives);

              case 5:
                if (_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done) {
                  _context6.next = 23;
                  break;
                }

                derivative = _step5.value;

                if (!_natives2.default[derivative.alias]) {
                  _context6.next = 9;
                  break;
                }

                return _context6.abrupt('continue', 20);

              case 9:
                if (!(derivative.aliasType === _common.ALIAS_AS_RELATIVE)) {
                  _context6.next = 14;
                  break;
                }

                _context6.next = 12;
                return this.stepDerivatives_ALIAS_AS_RELATIVE(record, derivative);

              case 12:
                _context6.next = 20;
                break;

              case 14:
                if (!(derivative.aliasType === _common.ALIAS_AS_RESOLVABLE)) {
                  _context6.next = 19;
                  break;
                }

                _context6.next = 17;
                return this.stepDerivatives_ALIAS_AS_RESOLVABLE(record, derivative);

              case 17:
                _context6.next = 20;
                break;

              case 19:
                (0, _assert2.default)(false, 'walker: unknown aliasType ' + derivative.aliasType);

              case 20:
                _iteratorNormalCompletion5 = true;
                _context6.next = 5;
                break;

              case 23:
                _context6.next = 29;
                break;

              case 25:
                _context6.prev = 25;
                _context6.t0 = _context6['catch'](3);
                _didIteratorError5 = true;
                _iteratorError5 = _context6.t0;

              case 29:
                _context6.prev = 29;
                _context6.prev = 30;

                if (!_iteratorNormalCompletion5 && _iterator5.return) {
                  _iterator5.return();
                }

              case 32:
                _context6.prev = 32;

                if (!_didIteratorError5) {
                  _context6.next = 35;
                  break;
                }

                throw _iteratorError5;

              case 35:
                return _context6.finish(32);

              case 36:
                return _context6.finish(29);

              case 37:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this, [[3, 25, 29, 37], [30,, 32, 36]]);
      }));

      function stepDerivatives(_x9, _x10) {
        return _ref6.apply(this, arguments);
      }

      return stepDerivatives;
    }()
  }, {
    key: 'step_STORE_ANY',
    value: function () {
      var _ref7 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee7(record) {
        var derivatives1, derivatives2;
        return _regenerator2.default.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                // eslint-disable-line camelcase
                (0, _assert2.default)(typeof record.body === 'undefined', 'walker: unexpected body ' + record.file);

                if (!(0, _common.isDotNODE)(record.file)) {
                  _context7.next = 5;
                  break;
                }

                record.discard = true;
                _log.log.warn('Cannot include native addon into executable.', [record.file, 'The addon file must be distributed with executable.']);
                return _context7.abrupt('return');

              case 5:
                derivatives1 = [];
                _context7.next = 8;
                return this.stepActivate(record, derivatives1);

              case 8:
                _context7.next = 10;
                return this.stepDerivatives(record, derivatives1);

              case 10:
                if (!(record.store === _common.STORE_CODE)) {
                  _context7.next = 19;
                  break;
                }

                if (!(0, _common.isDotJSON)(record.file)) {
                  _context7.next = 15;
                  break;
                }

                this.append({
                  file: record.file,
                  tuple: record.tuple,
                  store: _common.STORE_CONTENT
                });
                record.discard = true;
                return _context7.abrupt('return');

              case 15:
                if (!(record.tuple.permissive || record.tuple.dictionary)) {
                  _context7.next = 19;
                  break;
                }

                // ejs 0.8.8 has no license field
                this.append({
                  file: record.file,
                  tuple: record.tuple,
                  store: _common.STORE_CONTENT,
                  treatAsCODE: true
                });
                record.discard = true;
                return _context7.abrupt('return');

              case 19:

                this.append({
                  file: record.file,
                  tuple: record.tuple,
                  store: _common.STORE_STAT
                });

                _context7.next = 22;
                return this.stepRead(record);

              case 22:
                this.stepPatch(record);

                if (!(record.treatAsCODE || record.store === _common.STORE_CODE)) {
                  _context7.next = 29;
                  break;
                }

                this.stepStrip(record);
                derivatives2 = [];

                this.stepDetect(record, derivatives2);
                _context7.next = 29;
                return this.stepDerivatives(record, derivatives2);

              case 29:
              case 'end':
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function step_STORE_ANY(_x11) {
        return _ref7.apply(this, arguments);
      }

      return step_STORE_ANY;
    }()
  }, {
    key: 'step_STORE_LINKS',
    value: function step_STORE_LINKS(record) {
      // eslint-disable-line camelcase
      (0, _assert2.default)(typeof record.body !== 'undefined', 'walker: expected body ' + record.file);

      this.append({
        file: record.file,
        tuple: record.tuple,
        store: _common.STORE_STAT
      });
    }
  }, {
    key: 'step_STORE_STAT',
    value: function () {
      var _ref8 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee8(record) {
        var body;
        return _regenerator2.default.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                // eslint-disable-line camelcase
                (0, _assert2.default)(typeof record.body === 'undefined', 'walker: unexpected body ' + record.file);

                body = void 0;
                _context8.prev = 2;
                _context8.next = 5;
                return _fsExtra2.default.stat(record.file);

              case 5:
                body = _context8.sent;
                _context8.next = 12;
                break;

              case 8:
                _context8.prev = 8;
                _context8.t0 = _context8['catch'](2);

                _log.log.error('Cannot stat, ' + _context8.t0.code, record.file);
                throw (0, _log.wasReported)(_context8.t0);

              case 12:

                if (_path2.default.dirname(record.file) !== record.file) {
                  // root directory
                  this.append({
                    file: _path2.default.dirname(record.file),
                    tuple: record.tuple,
                    store: _common.STORE_LINKS,
                    body: [_path2.default.basename(record.file)]
                  });
                }

                record.body = body;

              case 14:
              case 'end':
                return _context8.stop();
            }
          }
        }, _callee8, this, [[2, 8]]);
      }));

      function step_STORE_STAT(_x12) {
        return _ref8.apply(this, arguments);
      }

      return step_STORE_STAT;
    }()
  }, {
    key: 'step',
    value: function () {
      var _ref9 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee9(record) {
        return _regenerator2.default.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                if (!(record.store === _common.STORE_CODE)) {
                  _context9.next = 5;
                  break;
                }

                _context9.next = 3;
                return this.step_STORE_ANY(record);

              case 3:
                _context9.next = 20;
                break;

              case 5:
                if (!(record.store === _common.STORE_CONTENT)) {
                  _context9.next = 10;
                  break;
                }

                _context9.next = 8;
                return this.step_STORE_ANY(record);

              case 8:
                _context9.next = 20;
                break;

              case 10:
                if (!(record.store === _common.STORE_LINKS)) {
                  _context9.next = 14;
                  break;
                }

                this.step_STORE_LINKS(record);
                _context9.next = 20;
                break;

              case 14:
                if (!(record.store === _common.STORE_STAT)) {
                  _context9.next = 19;
                  break;
                }

                _context9.next = 17;
                return this.step_STORE_STAT(record);

              case 17:
                _context9.next = 20;
                break;

              case 19:
                (0, _assert2.default)(false, 'walker: unknown store ' + record.store);

              case 20:
              case 'end':
                return _context9.stop();
            }
          }
        }, _callee9, this);
      }));

      function step(_x13) {
        return _ref9.apply(this, arguments);
      }

      return step;
    }()
  }, {
    key: 'readDictionaries',
    value: function () {
      var _ref10 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee10() {
        var dd, files, _iteratorNormalCompletion6, _didIteratorError6, _iteratorError6, _iterator6, _step6, file, name, config;

        return _regenerator2.default.wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                dd = _path2.default.join(__dirname, '../dictionary');
                _context10.next = 3;
                return _fsExtra2.default.readdir(dd);

              case 3:
                files = _context10.sent;
                _iteratorNormalCompletion6 = true;
                _didIteratorError6 = false;
                _iteratorError6 = undefined;
                _context10.prev = 7;


                for (_iterator6 = (0, _getIterator3.default)(files); !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                  file = _step6.value;

                  if (/\.js$/.test(file)) {
                    name = file.slice(0, -3);
                    config = require(_path2.default.join(dd, file));

                    this.dictionaries[name] = config;
                  }
                }
                _context10.next = 15;
                break;

              case 11:
                _context10.prev = 11;
                _context10.t0 = _context10['catch'](7);
                _didIteratorError6 = true;
                _iteratorError6 = _context10.t0;

              case 15:
                _context10.prev = 15;
                _context10.prev = 16;

                if (!_iteratorNormalCompletion6 && _iterator6.return) {
                  _iterator6.return();
                }

              case 18:
                _context10.prev = 18;

                if (!_didIteratorError6) {
                  _context10.next = 21;
                  break;
                }

                throw _iteratorError6;

              case 21:
                return _context10.finish(18);

              case 22:
                return _context10.finish(15);

              case 23:
              case 'end':
                return _context10.stop();
            }
          }
        }, _callee10, this, [[7, 11, 15, 23], [16,, 18, 22]]);
      }));

      function readDictionaries() {
        return _ref10.apply(this, arguments);
      }

      return readDictionaries;
    }()
  }, {
    key: 'start',
    value: function () {
      var _ref11 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee11(opts) {
        var tuple, input, records, i;
        return _regenerator2.default.wrap(function _callee11$(_context11) {
          while (1) {
            switch (_context11.prev = _context11.next) {
              case 0:
                tuple = opts.tuple, input = opts.input;

                tuple.toplevel = true;

                this.records = [];
                this.recordsMap = {};
                this.dictionaries = {};
                this.patches = {};

                _context11.next = 8;
                return this.readDictionaries();

              case 8:

                this.append({
                  file: input,
                  tuple: tuple,
                  store: _common.STORE_CODE,
                  entrypoint: true
                });

                records = this.records;
                i = 0;

              case 11:
                if (!(i < records.length)) {
                  _context11.next = 17;
                  break;
                }

                _context11.next = 14;
                return this.step(records[i]);

              case 14:
                i += 1;
                _context11.next = 11;
                break;

              case 17:
                return _context11.abrupt('return', this.records);

              case 18:
              case 'end':
                return _context11.stop();
            }
          }
        }, _callee11, this);
      }));

      function start(_x14) {
        return _ref11.apply(this, arguments);
      }

      return start;
    }()
  }]);
  return Walker;
}();

exports.default = function () {
  var _ref12 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee12(opts) {
    var w;
    return _regenerator2.default.wrap(function _callee12$(_context12) {
      while (1) {
        switch (_context12.prev = _context12.next) {
          case 0:
            w = new Walker();
            _context12.next = 3;
            return w.start(opts);

          case 3:
            return _context12.abrupt('return', _context12.sent);

          case 4:
          case 'end':
            return _context12.stop();
        }
      }
    }, _callee12, this);
  }));

  return function (_x15) {
    return _ref12.apply(this, arguments);
  };
}();