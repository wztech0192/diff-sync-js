"use strict";

function _createForOfIteratorHelper(o) { if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (o = _unsupportedIterableToArray(o))) { var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var it, normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * @author Wei Zheng
 * @github https://github.com/weijie0192/diff-sync-js
 * @summary A JavaScript implementation of Neil Fraser Differential Synchronization Algorithm
 */
var DiffSyncAlghorithm = /*#__PURE__*/function () {
  /**
   * @param {object} options.jsonpatch json-fast-patch library instance (REQUIRED)
   * @param {string} options.thisVersion version tag of the receiving end
   * @param {string} options.senderVersion version tag of the sending end
   * @param {boolean} options.useBackup indicate if use backup copy (DEFAULT true)
   * @param {boolean} options.debug indicate if print out debug message (DEFAULT false)
   */
  function DiffSyncAlghorithm(_ref) {
    var jsonpatch = _ref.jsonpatch,
        thisVersion = _ref.thisVersion,
        senderVersion = _ref.senderVersion,
        _ref$useBackup = _ref.useBackup,
        useBackup = _ref$useBackup === void 0 ? true : _ref$useBackup,
        _ref$debug = _ref.debug,
        debug = _ref$debug === void 0 ? false : _ref$debug;

    _classCallCheck(this, DiffSyncAlghorithm);

    if (!jsonpatch) {
      throw "jsonpatch instance is required";
    }

    this.jsonpatch = jsonpatch;
    this.thisVersion = thisVersion;
    this.senderVersion = senderVersion;
    this.useBackup = useBackup;
    this.debug = debug;
  }

  _createClass(DiffSyncAlghorithm, [{
    key: "log",
    value: function log() {
      if (this.debug) {
        var _console;

        for (var _len = arguments.length, anything = new Array(_len), _key = 0; _key < _len; _key++) {
          anything[_key] = arguments[_key];
        }

        (_console = console).debug.apply(_console, ["DIFF SYNC- "].concat(anything));
      }
    }
    /**
     * Initialize the container
     * @param {object} container any
     * @param {object} mainText any
     */

  }, {
    key: "initObject",
    value: function initObject(container, mainText) {
      var jsonpatch = this.jsonpatch,
          thisVersion = this.thisVersion,
          senderVersion = this.senderVersion,
          useBackup = this.useBackup;

      if (mainText !== null || mainText !== undefined) {
        var _container$shadow;

        container.shadow = (_container$shadow = {}, _defineProperty(_container$shadow, thisVersion, 0), _defineProperty(_container$shadow, senderVersion, 0), _defineProperty(_container$shadow, "value", jsonpatch.deepClone(mainText)), _defineProperty(_container$shadow, "edits", []), _container$shadow);

        if (useBackup) {
          var _container$backup;

          container.backup = (_container$backup = {}, _defineProperty(_container$backup, thisVersion, 0), _defineProperty(_container$backup, senderVersion, 0), _defineProperty(_container$backup, "value", jsonpatch.deepClone(mainText)), _container$backup);
        }
      } else {
        container.shadow = {};
        container.backup = {};
      }
    }
    /**
     * On Receive Packet
     * @param {object} options.payload payload object that contains {thisVersion, edits}. Edits should be a list of {senderVersion, patch}
     * @param {object} options.container container object {shadow, backup}
     * @param {func} options.onUpdateMain (patches, patchOperations, shadow[thisVersion]) => void
     * @param {func} options.afterUpdate (shadow[senderVersion]) => void
     * @param {func} options.onUpdateShadow (shadow, patch) => newShadowValue
     */

  }, {
    key: "onReceive",
    value: function onReceive(_ref2) {
      var payload = _ref2.payload,
          container = _ref2.container,
          onUpdateMain = _ref2.onUpdateMain,
          afterUpdate = _ref2.afterUpdate,
          onUpdateShadow = _ref2.onUpdateShadow;
      var jsonpatch = this.jsonpatch,
          thisVersion = this.thisVersion,
          senderVersion = this.senderVersion,
          useBackup = this.useBackup;
      var shadow = container.shadow,
          backup = container.backup;
      this.log("****************");
      this.log("--RECEIVED PAYLOAD --");
      this.log(thisVersion + ": " + payload[thisVersion]);
      this.log(senderVersion + ": ", payload.edits);
      this.log("-- CURRENT SHADOW --");
      this.log(shadow);

      if (useBackup) {
        if (shadow[thisVersion] !== payload[thisVersion]) {
          this.log("-- NOT MATCH --");
          this.log("backup: ", backup[thisVersion]); //STEP 4: if the receive version does not match with the shadow version, try to find the match backup or drop the process.

          if (backup[thisVersion] === payload[thisVersion]) {
            this.log("-- REVERT --");
            this.log(backup); //revert to backup

            shadow.value = jsonpatch.deepClone(backup.value);
            shadow[thisVersion] = backup[thisVersion];
            shadow.edits = [];
          } else {
            this.log("-- ** NOT MATCH, DROP THE PROCESS ** --");
            return;
          }
        }
      } //generate patch that ignore old n


      var filteredEdits = payload.edits.filter(function (edit) {
        return edit[senderVersion] >= shadow[senderVersion];
      });

      if (filteredEdits.length > 0) {
        var patches = filteredEdits.map(function (edit) {
          return edit.patch;
        });
        var patchOperations = [];

        var _iterator = _createForOfIteratorHelper(patches),
            _step;

        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var patch = _step.value;

            if (patch.length > 0) {
              var _iterator2 = _createForOfIteratorHelper(patch),
                  _step2;

              try {
                for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
                  var operation = _step2.value;
                  patchOperations.push(operation);
                } //STEP 5a, 5b: apply each patch to the shadow value

              } catch (err) {
                _iterator2.e(err);
              } finally {
                _iterator2.f();
              }

              if (onUpdateShadow) {
                shadow.value = onUpdateShadow(shadow, patch);
              } else {
                shadow.value = jsonpatch.applyPatch(shadow.value, patch).newDocument;
              }
            } //STEP 6: for each patch applied, increment senderVersion


            shadow[senderVersion]++;
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }

        if (useBackup) {
          //STEP 7: copy the shadow value and version over to the backup.
          backup[thisVersion] = shadow[thisVersion];
          backup[senderVersion] = shadow[senderVersion];
        } //clear old edits


        this.clearOldEdits(shadow, payload[thisVersion]);

        if (patchOperations.length > 0) {
          if (useBackup) {
            backup.value = jsonpatch.deepClone(shadow.value);
          }

          onUpdateMain(patches, patchOperations, shadow[thisVersion]);
        }

        this.log("***RESULT****");
        this.log("shadow: ", shadow);

        if (afterUpdate) {
          afterUpdate(shadow[senderVersion]);
        }

        this.log("**********");
      } else {
        this.log("**XXX* not match " + senderVersion);
      }
    }
    /**
     * On Sending Packet
     * @param {object} options.container container object {shadow, backup}
     * @param {object} options.mainText any
     * @param {func} options.whenSend (shadow[senderVersion], shadow.edits) => void
     * @param {func} options.whenUnchange (shadow[senderVersion]) => void
     */

  }, {
    key: "onSend",
    value: function onSend(_ref3) {
      var container = _ref3.container,
          mainText = _ref3.mainText,
          whenSend = _ref3.whenSend,
          whenUnchange = _ref3.whenUnchange;
      var shadow = container.shadow;
      var jsonpatch = this.jsonpatch,
          thisVersion = this.thisVersion,
          senderVersion = this.senderVersion; //STEP 1a, 1b: generate diff

      var patch = jsonpatch.compare(shadow.value, mainText);

      if (patch.length > 0) {
        var _shadow$edits$push;

        //STEP 2: push diff into edits stack
        shadow.edits.push((_shadow$edits$push = {}, _defineProperty(_shadow$edits$push, thisVersion, shadow[thisVersion]), _defineProperty(_shadow$edits$push, "patch", patch), _shadow$edits$push)); //STEP 3: copy main text over to the shadow and increment thisVersion

        shadow.value = jsonpatch.deepClone(mainText);
        shadow[thisVersion]++;
        whenSend(shadow[senderVersion], shadow.edits);
      } else if (whenUnchange) {
        whenUnchange(shadow[senderVersion]);
      }
    }
    /**
     * Acknowledge the other side when no change were made
     * @param {object} container container object {shadow, backup}
     * @param {object} payload payload object that contains {thisVersion, edits}. Edits should be a list of {senderVersion, patch}
     */

  }, {
    key: "onAck",
    value: function onAck(container, payload) {
      var backup = container.backup,
          shadow = container.shadow;
      var thisVersion = this.thisVersion,
          jsonpatch = this.jsonpatch;
      this.log("--- ON ACK ---");
      this.log("Receive version: ", payload[thisVersion]);
      this.log("Shadow version: ", shadow[thisVersion]);
      this.log("Backup version: ", backup[thisVersion]);
      this.clearOldEdits(shadow, payload[thisVersion]);

      if (shadow[thisVersion] === payload[thisVersion] && backup[thisVersion] !== payload[thisVersion]) {
        this.log("backup not match, clone backup!");
        backup.value = jsonpatch.deepClone(shadow.value);
        backup[thisVersion] = shadow[thisVersion];
      }
    }
    /**
     * clear old edits
     * @param {object} shadow
     * @param {string} version
     */

  }, {
    key: "clearOldEdits",
    value: function clearOldEdits(shadow, version) {
      var _this = this;

      shadow.edits = shadow.edits.filter(function (edit) {
        return edit[_this.thisVersion] > version;
      });
    }
    /**
     * apply patch to string
     * @param {string} val
     * @param {patch} patch
     * @return string
     */

  }, {
    key: "strPatch",
    value: function strPatch(val, patch) {
      var newDoc = this.jsonpatch.applyPatch(val.split(""), patch).newDocument;
      if (typeof newDoc === "string") return newDoc;
      return newDoc.join("");
    }
  }]);

  return DiffSyncAlghorithm;
}();