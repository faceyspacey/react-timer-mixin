/*
 *  Copyright (c) 2015-present, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 *
 */
'use strict';

var GLOBAL = typeof window === 'undefined' ? global : window;

var setter = function(_setter, _clearer, array) {
  return function(callback, delta) {
    var id = _setter(function() {
      _clearer.call(this, id);
      callback.apply(this, arguments);
    }.bind(this), delta);

    if (!this[array]) {
      this[array] = [id];
    } else {
      this[array].push(id);
    }
    return id;
  };
};

var clearer = function(_clearer, array) {
  return function(id) {
    if (this[array]) {
      var index = this[array].indexOf(id);
      if (index !== -1) {
        this[array].splice(index, 1);
      }
    }
    _clearer(id);
  };
};

var _timeouts = 'TimerMixin_timeouts';
var _clearTimeout = clearer(GLOBAL.clearTimeout, _timeouts);
var _setTimeout = setter(GLOBAL.setTimeout, _clearTimeout, _timeouts);

var _intervals = 'TimerMixin_intervals';
var _clearInterval = clearer(GLOBAL.clearInterval, _intervals);
var _setInterval = setter(GLOBAL.setInterval, function() {/* noop */}, _intervals);

var _immediates = 'TimerMixin_immediates';
var _clearImmediate = clearer(GLOBAL.clearImmediate, _immediates);
var _setImmediate = setter(GLOBAL.setImmediate, _clearImmediate, _immediates);

var _rafs = 'TimerMixin_rafs';
var _cancelAnimationFrame = clearer(GLOBAL.cancelAnimationFrame, _rafs);
var _requestAnimationFrame = setter(GLOBAL.requestAnimationFrame, _cancelAnimationFrame, _rafs);


var componentWillUnmount = function() {
  this[_timeouts] && this[_timeouts].forEach(function(id) {
    GLOBAL.clearTimeout(id);
  });
  this[_timeouts] = null;
  this[_intervals] && this[_intervals].forEach(function(id) {
    GLOBAL.clearInterval(id);
  });
  this[_intervals] = null;
  this[_immediates] && this[_immediates].forEach(function(id) {
    GLOBAL.clearImmediate(id);
  });
  this[_immediates] = null;
  this[_rafs] && this[_rafs].forEach(function(id) {
    GLOBAL.cancelAnimationFrame(id);
  });
  this[_rafs] = null;
};

var TimerMixin = {
  componentWillUnmount: componentWillUnmount,
  setTimeout: _setTimeout,
  clearTimeout: _clearTimeout,

  setInterval: _setInterval,
  clearInterval: _clearInterval,

  setImmediate: _setImmediate,
  clearImmediate: _clearImmediate,

  requestAnimationFrame: _requestAnimationFrame,
  cancelAnimationFrame: _cancelAnimationFrame,
};


module.exports = Object.assign({
  componentWillUnmount: componentWillUnmount,
}, TimerMixin);

module.exports.Timer = function Timer(Component) {
  class TimerComponent extends Component {
    constructor(...args) {
      super(...args);

      /*
       Overloading the constructors `componentWillUnmount` method to ensure that computations are stopped and a
       forceUpdate prevented, without overwriting the prototype. This is a potential bug, as of React 14.7 the
       componentWillUnmount() method does not fire, if the top level component has one. It gets overwritten. This
       implementation is however similar to what a transpiler would do anyway.
       GitHub Issue: https://github.com/facebook/react/issues/6162
       */
      if (!this.constructor.prototype._extendsTimerMixin) {
        this.constructor.prototype._extendsTimerMixin = true;
        let superComponentWillUnmount = this.constructor.prototype.componentWillUnmount;

        this.constructor.prototype.componentWillUnmount = function (...args) {
          superComponentWillUnmount.call(this, ...args);
          componentWillUnmount.call(this);
        };
      }
    }
  }

  Object.assign(TimerComponent.prototype, TimerMixin);

  return TimerComponent;
};
