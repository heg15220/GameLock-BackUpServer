var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/react/cjs/react.development.js
var require_react_development = __commonJS({
  "node_modules/react/cjs/react.development.js"(exports, module) {
    "use strict";
    if (true) {
      (function() {
        "use strict";
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart === "function") {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(new Error());
        }
        var ReactVersion = "18.3.1";
        var REACT_ELEMENT_TYPE = Symbol.for("react.element");
        var REACT_PORTAL_TYPE = Symbol.for("react.portal");
        var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
        var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
        var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
        var REACT_PROVIDER_TYPE = Symbol.for("react.provider");
        var REACT_CONTEXT_TYPE = Symbol.for("react.context");
        var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
        var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
        var REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list");
        var REACT_MEMO_TYPE = Symbol.for("react.memo");
        var REACT_LAZY_TYPE = Symbol.for("react.lazy");
        var REACT_OFFSCREEN_TYPE = Symbol.for("react.offscreen");
        var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
        var FAUX_ITERATOR_SYMBOL = "@@iterator";
        function getIteratorFn(maybeIterable) {
          if (maybeIterable === null || typeof maybeIterable !== "object") {
            return null;
          }
          var maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];
          if (typeof maybeIterator === "function") {
            return maybeIterator;
          }
          return null;
        }
        var ReactCurrentDispatcher = {
          /**
           * @internal
           * @type {ReactComponent}
           */
          current: null
        };
        var ReactCurrentBatchConfig = {
          transition: null
        };
        var ReactCurrentActQueue = {
          current: null,
          // Used to reproduce behavior of `batchedUpdates` in legacy mode.
          isBatchingLegacy: false,
          didScheduleLegacyUpdate: false
        };
        var ReactCurrentOwner = {
          /**
           * @internal
           * @type {ReactComponent}
           */
          current: null
        };
        var ReactDebugCurrentFrame = {};
        var currentExtraStackFrame = null;
        function setExtraStackFrame(stack) {
          {
            currentExtraStackFrame = stack;
          }
        }
        {
          ReactDebugCurrentFrame.setExtraStackFrame = function(stack) {
            {
              currentExtraStackFrame = stack;
            }
          };
          ReactDebugCurrentFrame.getCurrentStack = null;
          ReactDebugCurrentFrame.getStackAddendum = function() {
            var stack = "";
            if (currentExtraStackFrame) {
              stack += currentExtraStackFrame;
            }
            var impl = ReactDebugCurrentFrame.getCurrentStack;
            if (impl) {
              stack += impl() || "";
            }
            return stack;
          };
        }
        var enableScopeAPI = false;
        var enableCacheElement = false;
        var enableTransitionTracing = false;
        var enableLegacyHidden = false;
        var enableDebugTracing = false;
        var ReactSharedInternals = {
          ReactCurrentDispatcher,
          ReactCurrentBatchConfig,
          ReactCurrentOwner
        };
        {
          ReactSharedInternals.ReactDebugCurrentFrame = ReactDebugCurrentFrame;
          ReactSharedInternals.ReactCurrentActQueue = ReactCurrentActQueue;
        }
        function warn(format) {
          {
            {
              for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = arguments[_key];
              }
              printWarning("warn", format, args);
            }
          }
        }
        function error(format) {
          {
            {
              for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                args[_key2 - 1] = arguments[_key2];
              }
              printWarning("error", format, args);
            }
          }
        }
        function printWarning(level, format, args) {
          {
            var ReactDebugCurrentFrame2 = ReactSharedInternals.ReactDebugCurrentFrame;
            var stack = ReactDebugCurrentFrame2.getStackAddendum();
            if (stack !== "") {
              format += "%s";
              args = args.concat([stack]);
            }
            var argsWithFormat = args.map(function(item) {
              return String(item);
            });
            argsWithFormat.unshift("Warning: " + format);
            Function.prototype.apply.call(console[level], console, argsWithFormat);
          }
        }
        var didWarnStateUpdateForUnmountedComponent = {};
        function warnNoop(publicInstance, callerName) {
          {
            var _constructor = publicInstance.constructor;
            var componentName = _constructor && (_constructor.displayName || _constructor.name) || "ReactClass";
            var warningKey = componentName + "." + callerName;
            if (didWarnStateUpdateForUnmountedComponent[warningKey]) {
              return;
            }
            error("Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.", callerName, componentName);
            didWarnStateUpdateForUnmountedComponent[warningKey] = true;
          }
        }
        var ReactNoopUpdateQueue = {
          /**
           * Checks whether or not this composite component is mounted.
           * @param {ReactClass} publicInstance The instance we want to test.
           * @return {boolean} True if mounted, false otherwise.
           * @protected
           * @final
           */
          isMounted: function(publicInstance) {
            return false;
          },
          /**
           * Forces an update. This should only be invoked when it is known with
           * certainty that we are **not** in a DOM transaction.
           *
           * You may want to call this when you know that some deeper aspect of the
           * component's state has changed but `setState` was not called.
           *
           * This will not invoke `shouldComponentUpdate`, but it will invoke
           * `componentWillUpdate` and `componentDidUpdate`.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {?function} callback Called after component is updated.
           * @param {?string} callerName name of the calling function in the public API.
           * @internal
           */
          enqueueForceUpdate: function(publicInstance, callback, callerName) {
            warnNoop(publicInstance, "forceUpdate");
          },
          /**
           * Replaces all of the state. Always use this or `setState` to mutate state.
           * You should treat `this.state` as immutable.
           *
           * There is no guarantee that `this.state` will be immediately updated, so
           * accessing `this.state` after calling this method may return the old value.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {object} completeState Next state.
           * @param {?function} callback Called after component is updated.
           * @param {?string} callerName name of the calling function in the public API.
           * @internal
           */
          enqueueReplaceState: function(publicInstance, completeState, callback, callerName) {
            warnNoop(publicInstance, "replaceState");
          },
          /**
           * Sets a subset of the state. This only exists because _pendingState is
           * internal. This provides a merging strategy that is not available to deep
           * properties which is confusing. TODO: Expose pendingState or don't use it
           * during the merge.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {object} partialState Next partial state to be merged with state.
           * @param {?function} callback Called after component is updated.
           * @param {?string} Name of the calling function in the public API.
           * @internal
           */
          enqueueSetState: function(publicInstance, partialState, callback, callerName) {
            warnNoop(publicInstance, "setState");
          }
        };
        var assign = Object.assign;
        var emptyObject = {};
        {
          Object.freeze(emptyObject);
        }
        function Component(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        Component.prototype.isReactComponent = {};
        Component.prototype.setState = function(partialState, callback) {
          if (typeof partialState !== "object" && typeof partialState !== "function" && partialState != null) {
            throw new Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
          }
          this.updater.enqueueSetState(this, partialState, callback, "setState");
        };
        Component.prototype.forceUpdate = function(callback) {
          this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
        };
        {
          var deprecatedAPIs = {
            isMounted: ["isMounted", "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."],
            replaceState: ["replaceState", "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."]
          };
          var defineDeprecationWarning = function(methodName, info) {
            Object.defineProperty(Component.prototype, methodName, {
              get: function() {
                warn("%s(...) is deprecated in plain JavaScript React classes. %s", info[0], info[1]);
                return void 0;
              }
            });
          };
          for (var fnName in deprecatedAPIs) {
            if (deprecatedAPIs.hasOwnProperty(fnName)) {
              defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
            }
          }
        }
        function ComponentDummy() {
        }
        ComponentDummy.prototype = Component.prototype;
        function PureComponent(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
        pureComponentPrototype.constructor = PureComponent;
        assign(pureComponentPrototype, Component.prototype);
        pureComponentPrototype.isPureReactComponent = true;
        function createRef() {
          var refObject = {
            current: null
          };
          {
            Object.seal(refObject);
          }
          return refObject;
        }
        var isArrayImpl = Array.isArray;
        function isArray(a) {
          return isArrayImpl(a);
        }
        function typeName(value) {
          {
            var hasToStringTag = typeof Symbol === "function" && Symbol.toStringTag;
            var type = hasToStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            return type;
          }
        }
        function willCoercionThrow(value) {
          {
            try {
              testStringCoercion(value);
              return false;
            } catch (e) {
              return true;
            }
          }
        }
        function testStringCoercion(value) {
          return "" + value;
        }
        function checkKeyStringCoercion(value) {
          {
            if (willCoercionThrow(value)) {
              error("The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.", typeName(value));
              return testStringCoercion(value);
            }
          }
        }
        function getWrappedName(outerType, innerType, wrapperName) {
          var displayName = outerType.displayName;
          if (displayName) {
            return displayName;
          }
          var functionName = innerType.displayName || innerType.name || "";
          return functionName !== "" ? wrapperName + "(" + functionName + ")" : wrapperName;
        }
        function getContextName(type) {
          return type.displayName || "Context";
        }
        function getComponentNameFromType(type) {
          if (type == null) {
            return null;
          }
          {
            if (typeof type.tag === "number") {
              error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue.");
            }
          }
          if (typeof type === "function") {
            return type.displayName || type.name || null;
          }
          if (typeof type === "string") {
            return type;
          }
          switch (type) {
            case REACT_FRAGMENT_TYPE:
              return "Fragment";
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_PROFILER_TYPE:
              return "Profiler";
            case REACT_STRICT_MODE_TYPE:
              return "StrictMode";
            case REACT_SUSPENSE_TYPE:
              return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
              return "SuspenseList";
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_CONTEXT_TYPE:
                var context = type;
                return getContextName(context) + ".Consumer";
              case REACT_PROVIDER_TYPE:
                var provider = type;
                return getContextName(provider._context) + ".Provider";
              case REACT_FORWARD_REF_TYPE:
                return getWrappedName(type, type.render, "ForwardRef");
              case REACT_MEMO_TYPE:
                var outerName = type.displayName || null;
                if (outerName !== null) {
                  return outerName;
                }
                return getComponentNameFromType(type.type) || "Memo";
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init = lazyComponent._init;
                try {
                  return getComponentNameFromType(init(payload));
                } catch (x) {
                  return null;
                }
              }
            }
          }
          return null;
        }
        var hasOwnProperty = Object.prototype.hasOwnProperty;
        var RESERVED_PROPS = {
          key: true,
          ref: true,
          __self: true,
          __source: true
        };
        var specialPropKeyWarningShown, specialPropRefWarningShown, didWarnAboutStringRefs;
        {
          didWarnAboutStringRefs = {};
        }
        function hasValidRef(config) {
          {
            if (hasOwnProperty.call(config, "ref")) {
              var getter = Object.getOwnPropertyDescriptor(config, "ref").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.ref !== void 0;
        }
        function hasValidKey(config) {
          {
            if (hasOwnProperty.call(config, "key")) {
              var getter = Object.getOwnPropertyDescriptor(config, "key").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.key !== void 0;
        }
        function defineKeyPropWarningGetter(props, displayName) {
          var warnAboutAccessingKey = function() {
            {
              if (!specialPropKeyWarningShown) {
                specialPropKeyWarningShown = true;
                error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            }
          };
          warnAboutAccessingKey.isReactWarning = true;
          Object.defineProperty(props, "key", {
            get: warnAboutAccessingKey,
            configurable: true
          });
        }
        function defineRefPropWarningGetter(props, displayName) {
          var warnAboutAccessingRef = function() {
            {
              if (!specialPropRefWarningShown) {
                specialPropRefWarningShown = true;
                error("%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            }
          };
          warnAboutAccessingRef.isReactWarning = true;
          Object.defineProperty(props, "ref", {
            get: warnAboutAccessingRef,
            configurable: true
          });
        }
        function warnIfStringRefCannotBeAutoConverted(config) {
          {
            if (typeof config.ref === "string" && ReactCurrentOwner.current && config.__self && ReactCurrentOwner.current.stateNode !== config.__self) {
              var componentName = getComponentNameFromType(ReactCurrentOwner.current.type);
              if (!didWarnAboutStringRefs[componentName]) {
                error('Component "%s" contains the string ref "%s". Support for string refs will be removed in a future major release. This case cannot be automatically converted to an arrow function. We ask you to manually fix this case by using useRef() or createRef() instead. Learn more about using refs safely here: https://reactjs.org/link/strict-mode-string-ref', componentName, config.ref);
                didWarnAboutStringRefs[componentName] = true;
              }
            }
          }
        }
        var ReactElement = function(type, key, ref, self, source, owner, props) {
          var element = {
            // This tag allows us to uniquely identify this as a React Element
            $$typeof: REACT_ELEMENT_TYPE,
            // Built-in properties that belong on the element
            type,
            key,
            ref,
            props,
            // Record the component responsible for creating this element.
            _owner: owner
          };
          {
            element._store = {};
            Object.defineProperty(element._store, "validated", {
              configurable: false,
              enumerable: false,
              writable: true,
              value: false
            });
            Object.defineProperty(element, "_self", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: self
            });
            Object.defineProperty(element, "_source", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: source
            });
            if (Object.freeze) {
              Object.freeze(element.props);
              Object.freeze(element);
            }
          }
          return element;
        };
        function createElement(type, config, children) {
          var propName;
          var props = {};
          var key = null;
          var ref = null;
          var self = null;
          var source = null;
          if (config != null) {
            if (hasValidRef(config)) {
              ref = config.ref;
              {
                warnIfStringRefCannotBeAutoConverted(config);
              }
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            self = config.__self === void 0 ? null : config.__self;
            source = config.__source === void 0 ? null : config.__source;
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                props[propName] = config[propName];
              }
            }
          }
          var childrenLength = arguments.length - 2;
          if (childrenLength === 1) {
            props.children = children;
          } else if (childrenLength > 1) {
            var childArray = Array(childrenLength);
            for (var i = 0; i < childrenLength; i++) {
              childArray[i] = arguments[i + 2];
            }
            {
              if (Object.freeze) {
                Object.freeze(childArray);
              }
            }
            props.children = childArray;
          }
          if (type && type.defaultProps) {
            var defaultProps = type.defaultProps;
            for (propName in defaultProps) {
              if (props[propName] === void 0) {
                props[propName] = defaultProps[propName];
              }
            }
          }
          {
            if (key || ref) {
              var displayName = typeof type === "function" ? type.displayName || type.name || "Unknown" : type;
              if (key) {
                defineKeyPropWarningGetter(props, displayName);
              }
              if (ref) {
                defineRefPropWarningGetter(props, displayName);
              }
            }
          }
          return ReactElement(type, key, ref, self, source, ReactCurrentOwner.current, props);
        }
        function cloneAndReplaceKey(oldElement, newKey) {
          var newElement = ReactElement(oldElement.type, newKey, oldElement.ref, oldElement._self, oldElement._source, oldElement._owner, oldElement.props);
          return newElement;
        }
        function cloneElement(element, config, children) {
          if (element === null || element === void 0) {
            throw new Error("React.cloneElement(...): The argument must be a React element, but you passed " + element + ".");
          }
          var propName;
          var props = assign({}, element.props);
          var key = element.key;
          var ref = element.ref;
          var self = element._self;
          var source = element._source;
          var owner = element._owner;
          if (config != null) {
            if (hasValidRef(config)) {
              ref = config.ref;
              owner = ReactCurrentOwner.current;
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            var defaultProps;
            if (element.type && element.type.defaultProps) {
              defaultProps = element.type.defaultProps;
            }
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                if (config[propName] === void 0 && defaultProps !== void 0) {
                  props[propName] = defaultProps[propName];
                } else {
                  props[propName] = config[propName];
                }
              }
            }
          }
          var childrenLength = arguments.length - 2;
          if (childrenLength === 1) {
            props.children = children;
          } else if (childrenLength > 1) {
            var childArray = Array(childrenLength);
            for (var i = 0; i < childrenLength; i++) {
              childArray[i] = arguments[i + 2];
            }
            props.children = childArray;
          }
          return ReactElement(element.type, key, ref, self, source, owner, props);
        }
        function isValidElement(object) {
          return typeof object === "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
        }
        var SEPARATOR = ".";
        var SUBSEPARATOR = ":";
        function escape(key) {
          var escapeRegex = /[=:]/g;
          var escaperLookup = {
            "=": "=0",
            ":": "=2"
          };
          var escapedString = key.replace(escapeRegex, function(match) {
            return escaperLookup[match];
          });
          return "$" + escapedString;
        }
        var didWarnAboutMaps = false;
        var userProvidedKeyEscapeRegex = /\/+/g;
        function escapeUserProvidedKey(text) {
          return text.replace(userProvidedKeyEscapeRegex, "$&/");
        }
        function getElementKey(element, index) {
          if (typeof element === "object" && element !== null && element.key != null) {
            {
              checkKeyStringCoercion(element.key);
            }
            return escape("" + element.key);
          }
          return index.toString(36);
        }
        function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
          var type = typeof children;
          if (type === "undefined" || type === "boolean") {
            children = null;
          }
          var invokeCallback = false;
          if (children === null) {
            invokeCallback = true;
          } else {
            switch (type) {
              case "string":
              case "number":
                invokeCallback = true;
                break;
              case "object":
                switch (children.$$typeof) {
                  case REACT_ELEMENT_TYPE:
                  case REACT_PORTAL_TYPE:
                    invokeCallback = true;
                }
            }
          }
          if (invokeCallback) {
            var _child = children;
            var mappedChild = callback(_child);
            var childKey = nameSoFar === "" ? SEPARATOR + getElementKey(_child, 0) : nameSoFar;
            if (isArray(mappedChild)) {
              var escapedChildKey = "";
              if (childKey != null) {
                escapedChildKey = escapeUserProvidedKey(childKey) + "/";
              }
              mapIntoArray(mappedChild, array, escapedChildKey, "", function(c) {
                return c;
              });
            } else if (mappedChild != null) {
              if (isValidElement(mappedChild)) {
                {
                  if (mappedChild.key && (!_child || _child.key !== mappedChild.key)) {
                    checkKeyStringCoercion(mappedChild.key);
                  }
                }
                mappedChild = cloneAndReplaceKey(
                  mappedChild,
                  // Keep both the (mapped) and old keys if they differ, just as
                  // traverseAllChildren used to do for objects as children
                  escapedPrefix + // $FlowFixMe Flow incorrectly thinks React.Portal doesn't have a key
                  (mappedChild.key && (!_child || _child.key !== mappedChild.key) ? (
                    // $FlowFixMe Flow incorrectly thinks existing element's key can be a number
                    // eslint-disable-next-line react-internal/safe-string-coercion
                    escapeUserProvidedKey("" + mappedChild.key) + "/"
                  ) : "") + childKey
                );
              }
              array.push(mappedChild);
            }
            return 1;
          }
          var child;
          var nextName;
          var subtreeCount = 0;
          var nextNamePrefix = nameSoFar === "" ? SEPARATOR : nameSoFar + SUBSEPARATOR;
          if (isArray(children)) {
            for (var i = 0; i < children.length; i++) {
              child = children[i];
              nextName = nextNamePrefix + getElementKey(child, i);
              subtreeCount += mapIntoArray(child, array, escapedPrefix, nextName, callback);
            }
          } else {
            var iteratorFn = getIteratorFn(children);
            if (typeof iteratorFn === "function") {
              var iterableChildren = children;
              {
                if (iteratorFn === iterableChildren.entries) {
                  if (!didWarnAboutMaps) {
                    warn("Using Maps as children is not supported. Use an array of keyed ReactElements instead.");
                  }
                  didWarnAboutMaps = true;
                }
              }
              var iterator = iteratorFn.call(iterableChildren);
              var step;
              var ii = 0;
              while (!(step = iterator.next()).done) {
                child = step.value;
                nextName = nextNamePrefix + getElementKey(child, ii++);
                subtreeCount += mapIntoArray(child, array, escapedPrefix, nextName, callback);
              }
            } else if (type === "object") {
              var childrenString = String(children);
              throw new Error("Objects are not valid as a React child (found: " + (childrenString === "[object Object]" ? "object with keys {" + Object.keys(children).join(", ") + "}" : childrenString) + "). If you meant to render a collection of children, use an array instead.");
            }
          }
          return subtreeCount;
        }
        function mapChildren(children, func, context) {
          if (children == null) {
            return children;
          }
          var result = [];
          var count = 0;
          mapIntoArray(children, result, "", "", function(child) {
            return func.call(context, child, count++);
          });
          return result;
        }
        function countChildren(children) {
          var n = 0;
          mapChildren(children, function() {
            n++;
          });
          return n;
        }
        function forEachChildren(children, forEachFunc, forEachContext) {
          mapChildren(children, function() {
            forEachFunc.apply(this, arguments);
          }, forEachContext);
        }
        function toArray(children) {
          return mapChildren(children, function(child) {
            return child;
          }) || [];
        }
        function onlyChild(children) {
          if (!isValidElement(children)) {
            throw new Error("React.Children.only expected to receive a single React element child.");
          }
          return children;
        }
        function createContext(defaultValue) {
          var context = {
            $$typeof: REACT_CONTEXT_TYPE,
            // As a workaround to support multiple concurrent renderers, we categorize
            // some renderers as primary and others as secondary. We only expect
            // there to be two concurrent renderers at most: React Native (primary) and
            // Fabric (secondary); React DOM (primary) and React ART (secondary).
            // Secondary renderers store their context values on separate fields.
            _currentValue: defaultValue,
            _currentValue2: defaultValue,
            // Used to track how many concurrent renderers this context currently
            // supports within in a single renderer. Such as parallel server rendering.
            _threadCount: 0,
            // These are circular
            Provider: null,
            Consumer: null,
            // Add these to use same hidden class in VM as ServerContext
            _defaultValue: null,
            _globalName: null
          };
          context.Provider = {
            $$typeof: REACT_PROVIDER_TYPE,
            _context: context
          };
          var hasWarnedAboutUsingNestedContextConsumers = false;
          var hasWarnedAboutUsingConsumerProvider = false;
          var hasWarnedAboutDisplayNameOnConsumer = false;
          {
            var Consumer = {
              $$typeof: REACT_CONTEXT_TYPE,
              _context: context
            };
            Object.defineProperties(Consumer, {
              Provider: {
                get: function() {
                  if (!hasWarnedAboutUsingConsumerProvider) {
                    hasWarnedAboutUsingConsumerProvider = true;
                    error("Rendering <Context.Consumer.Provider> is not supported and will be removed in a future major release. Did you mean to render <Context.Provider> instead?");
                  }
                  return context.Provider;
                },
                set: function(_Provider) {
                  context.Provider = _Provider;
                }
              },
              _currentValue: {
                get: function() {
                  return context._currentValue;
                },
                set: function(_currentValue) {
                  context._currentValue = _currentValue;
                }
              },
              _currentValue2: {
                get: function() {
                  return context._currentValue2;
                },
                set: function(_currentValue2) {
                  context._currentValue2 = _currentValue2;
                }
              },
              _threadCount: {
                get: function() {
                  return context._threadCount;
                },
                set: function(_threadCount) {
                  context._threadCount = _threadCount;
                }
              },
              Consumer: {
                get: function() {
                  if (!hasWarnedAboutUsingNestedContextConsumers) {
                    hasWarnedAboutUsingNestedContextConsumers = true;
                    error("Rendering <Context.Consumer.Consumer> is not supported and will be removed in a future major release. Did you mean to render <Context.Consumer> instead?");
                  }
                  return context.Consumer;
                }
              },
              displayName: {
                get: function() {
                  return context.displayName;
                },
                set: function(displayName) {
                  if (!hasWarnedAboutDisplayNameOnConsumer) {
                    warn("Setting `displayName` on Context.Consumer has no effect. You should set it directly on the context with Context.displayName = '%s'.", displayName);
                    hasWarnedAboutDisplayNameOnConsumer = true;
                  }
                }
              }
            });
            context.Consumer = Consumer;
          }
          {
            context._currentRenderer = null;
            context._currentRenderer2 = null;
          }
          return context;
        }
        var Uninitialized = -1;
        var Pending = 0;
        var Resolved = 1;
        var Rejected = 2;
        function lazyInitializer(payload) {
          if (payload._status === Uninitialized) {
            var ctor = payload._result;
            var thenable = ctor();
            thenable.then(function(moduleObject2) {
              if (payload._status === Pending || payload._status === Uninitialized) {
                var resolved = payload;
                resolved._status = Resolved;
                resolved._result = moduleObject2;
              }
            }, function(error2) {
              if (payload._status === Pending || payload._status === Uninitialized) {
                var rejected = payload;
                rejected._status = Rejected;
                rejected._result = error2;
              }
            });
            if (payload._status === Uninitialized) {
              var pending = payload;
              pending._status = Pending;
              pending._result = thenable;
            }
          }
          if (payload._status === Resolved) {
            var moduleObject = payload._result;
            {
              if (moduleObject === void 0) {
                error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?", moduleObject);
              }
            }
            {
              if (!("default" in moduleObject)) {
                error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))", moduleObject);
              }
            }
            return moduleObject.default;
          } else {
            throw payload._result;
          }
        }
        function lazy(ctor) {
          var payload = {
            // We use these fields to store the result.
            _status: Uninitialized,
            _result: ctor
          };
          var lazyType = {
            $$typeof: REACT_LAZY_TYPE,
            _payload: payload,
            _init: lazyInitializer
          };
          {
            var defaultProps;
            var propTypes;
            Object.defineProperties(lazyType, {
              defaultProps: {
                configurable: true,
                get: function() {
                  return defaultProps;
                },
                set: function(newDefaultProps) {
                  error("React.lazy(...): It is not supported to assign `defaultProps` to a lazy component import. Either specify them where the component is defined, or create a wrapping component around it.");
                  defaultProps = newDefaultProps;
                  Object.defineProperty(lazyType, "defaultProps", {
                    enumerable: true
                  });
                }
              },
              propTypes: {
                configurable: true,
                get: function() {
                  return propTypes;
                },
                set: function(newPropTypes) {
                  error("React.lazy(...): It is not supported to assign `propTypes` to a lazy component import. Either specify them where the component is defined, or create a wrapping component around it.");
                  propTypes = newPropTypes;
                  Object.defineProperty(lazyType, "propTypes", {
                    enumerable: true
                  });
                }
              }
            });
          }
          return lazyType;
        }
        function forwardRef(render) {
          {
            if (render != null && render.$$typeof === REACT_MEMO_TYPE) {
              error("forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...)).");
            } else if (typeof render !== "function") {
              error("forwardRef requires a render function but was given %s.", render === null ? "null" : typeof render);
            } else {
              if (render.length !== 0 && render.length !== 2) {
                error("forwardRef render functions accept exactly two parameters: props and ref. %s", render.length === 1 ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined.");
              }
            }
            if (render != null) {
              if (render.defaultProps != null || render.propTypes != null) {
                error("forwardRef render functions do not support propTypes or defaultProps. Did you accidentally pass a React component?");
              }
            }
          }
          var elementType = {
            $$typeof: REACT_FORWARD_REF_TYPE,
            render
          };
          {
            var ownName;
            Object.defineProperty(elementType, "displayName", {
              enumerable: false,
              configurable: true,
              get: function() {
                return ownName;
              },
              set: function(name) {
                ownName = name;
                if (!render.name && !render.displayName) {
                  render.displayName = name;
                }
              }
            });
          }
          return elementType;
        }
        var REACT_MODULE_REFERENCE;
        {
          REACT_MODULE_REFERENCE = Symbol.for("react.module.reference");
        }
        function isValidElementType(type) {
          if (typeof type === "string" || typeof type === "function") {
            return true;
          }
          if (type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || enableDebugTracing || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || enableLegacyHidden || type === REACT_OFFSCREEN_TYPE || enableScopeAPI || enableCacheElement || enableTransitionTracing) {
            return true;
          }
          if (typeof type === "object" && type !== null) {
            if (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || // This needs to include all possible module reference object
            // types supported by any Flight configuration anywhere since
            // we don't know which Flight build this will end up being used
            // with.
            type.$$typeof === REACT_MODULE_REFERENCE || type.getModuleId !== void 0) {
              return true;
            }
          }
          return false;
        }
        function memo(type, compare) {
          {
            if (!isValidElementType(type)) {
              error("memo: The first argument must be a component. Instead received: %s", type === null ? "null" : typeof type);
            }
          }
          var elementType = {
            $$typeof: REACT_MEMO_TYPE,
            type,
            compare: compare === void 0 ? null : compare
          };
          {
            var ownName;
            Object.defineProperty(elementType, "displayName", {
              enumerable: false,
              configurable: true,
              get: function() {
                return ownName;
              },
              set: function(name) {
                ownName = name;
                if (!type.name && !type.displayName) {
                  type.displayName = name;
                }
              }
            });
          }
          return elementType;
        }
        function resolveDispatcher() {
          var dispatcher = ReactCurrentDispatcher.current;
          {
            if (dispatcher === null) {
              error("Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://reactjs.org/link/invalid-hook-call for tips about how to debug and fix this problem.");
            }
          }
          return dispatcher;
        }
        function useContext(Context) {
          var dispatcher = resolveDispatcher();
          {
            if (Context._context !== void 0) {
              var realContext = Context._context;
              if (realContext.Consumer === Context) {
                error("Calling useContext(Context.Consumer) is not supported, may cause bugs, and will be removed in a future major release. Did you mean to call useContext(Context) instead?");
              } else if (realContext.Provider === Context) {
                error("Calling useContext(Context.Provider) is not supported. Did you mean to call useContext(Context) instead?");
              }
            }
          }
          return dispatcher.useContext(Context);
        }
        function useState2(initialState) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useState(initialState);
        }
        function useReducer(reducer, initialArg, init) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useReducer(reducer, initialArg, init);
        }
        function useRef3(initialValue) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useRef(initialValue);
        }
        function useEffect3(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useEffect(create, deps);
        }
        function useInsertionEffect(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useInsertionEffect(create, deps);
        }
        function useLayoutEffect(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useLayoutEffect(create, deps);
        }
        function useCallback2(callback, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useCallback(callback, deps);
        }
        function useMemo2(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useMemo(create, deps);
        }
        function useImperativeHandle(ref, create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useImperativeHandle(ref, create, deps);
        }
        function useDebugValue(value, formatterFn) {
          {
            var dispatcher = resolveDispatcher();
            return dispatcher.useDebugValue(value, formatterFn);
          }
        }
        function useTransition() {
          var dispatcher = resolveDispatcher();
          return dispatcher.useTransition();
        }
        function useDeferredValue(value) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useDeferredValue(value);
        }
        function useId() {
          var dispatcher = resolveDispatcher();
          return dispatcher.useId();
        }
        function useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
        }
        var disabledDepth = 0;
        var prevLog;
        var prevInfo;
        var prevWarn;
        var prevError;
        var prevGroup;
        var prevGroupCollapsed;
        var prevGroupEnd;
        function disabledLog() {
        }
        disabledLog.__reactDisabledLog = true;
        function disableLogs() {
          {
            if (disabledDepth === 0) {
              prevLog = console.log;
              prevInfo = console.info;
              prevWarn = console.warn;
              prevError = console.error;
              prevGroup = console.group;
              prevGroupCollapsed = console.groupCollapsed;
              prevGroupEnd = console.groupEnd;
              var props = {
                configurable: true,
                enumerable: true,
                value: disabledLog,
                writable: true
              };
              Object.defineProperties(console, {
                info: props,
                log: props,
                warn: props,
                error: props,
                group: props,
                groupCollapsed: props,
                groupEnd: props
              });
            }
            disabledDepth++;
          }
        }
        function reenableLogs() {
          {
            disabledDepth--;
            if (disabledDepth === 0) {
              var props = {
                configurable: true,
                enumerable: true,
                writable: true
              };
              Object.defineProperties(console, {
                log: assign({}, props, {
                  value: prevLog
                }),
                info: assign({}, props, {
                  value: prevInfo
                }),
                warn: assign({}, props, {
                  value: prevWarn
                }),
                error: assign({}, props, {
                  value: prevError
                }),
                group: assign({}, props, {
                  value: prevGroup
                }),
                groupCollapsed: assign({}, props, {
                  value: prevGroupCollapsed
                }),
                groupEnd: assign({}, props, {
                  value: prevGroupEnd
                })
              });
            }
            if (disabledDepth < 0) {
              error("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
            }
          }
        }
        var ReactCurrentDispatcher$1 = ReactSharedInternals.ReactCurrentDispatcher;
        var prefix;
        function describeBuiltInComponentFrame(name, source, ownerFn) {
          {
            if (prefix === void 0) {
              try {
                throw Error();
              } catch (x) {
                var match = x.stack.trim().match(/\n( *(at )?)/);
                prefix = match && match[1] || "";
              }
            }
            return "\n" + prefix + name;
          }
        }
        var reentry = false;
        var componentFrameCache;
        {
          var PossiblyWeakMap = typeof WeakMap === "function" ? WeakMap : Map;
          componentFrameCache = new PossiblyWeakMap();
        }
        function describeNativeComponentFrame(fn, construct) {
          if (!fn || reentry) {
            return "";
          }
          {
            var frame = componentFrameCache.get(fn);
            if (frame !== void 0) {
              return frame;
            }
          }
          var control;
          reentry = true;
          var previousPrepareStackTrace = Error.prepareStackTrace;
          Error.prepareStackTrace = void 0;
          var previousDispatcher;
          {
            previousDispatcher = ReactCurrentDispatcher$1.current;
            ReactCurrentDispatcher$1.current = null;
            disableLogs();
          }
          try {
            if (construct) {
              var Fake = function() {
                throw Error();
              };
              Object.defineProperty(Fake.prototype, "props", {
                set: function() {
                  throw Error();
                }
              });
              if (typeof Reflect === "object" && Reflect.construct) {
                try {
                  Reflect.construct(Fake, []);
                } catch (x) {
                  control = x;
                }
                Reflect.construct(fn, [], Fake);
              } else {
                try {
                  Fake.call();
                } catch (x) {
                  control = x;
                }
                fn.call(Fake.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (x) {
                control = x;
              }
              fn();
            }
          } catch (sample) {
            if (sample && control && typeof sample.stack === "string") {
              var sampleLines = sample.stack.split("\n");
              var controlLines = control.stack.split("\n");
              var s = sampleLines.length - 1;
              var c = controlLines.length - 1;
              while (s >= 1 && c >= 0 && sampleLines[s] !== controlLines[c]) {
                c--;
              }
              for (; s >= 1 && c >= 0; s--, c--) {
                if (sampleLines[s] !== controlLines[c]) {
                  if (s !== 1 || c !== 1) {
                    do {
                      s--;
                      c--;
                      if (c < 0 || sampleLines[s] !== controlLines[c]) {
                        var _frame = "\n" + sampleLines[s].replace(" at new ", " at ");
                        if (fn.displayName && _frame.includes("<anonymous>")) {
                          _frame = _frame.replace("<anonymous>", fn.displayName);
                        }
                        {
                          if (typeof fn === "function") {
                            componentFrameCache.set(fn, _frame);
                          }
                        }
                        return _frame;
                      }
                    } while (s >= 1 && c >= 0);
                  }
                  break;
                }
              }
            }
          } finally {
            reentry = false;
            {
              ReactCurrentDispatcher$1.current = previousDispatcher;
              reenableLogs();
            }
            Error.prepareStackTrace = previousPrepareStackTrace;
          }
          var name = fn ? fn.displayName || fn.name : "";
          var syntheticFrame = name ? describeBuiltInComponentFrame(name) : "";
          {
            if (typeof fn === "function") {
              componentFrameCache.set(fn, syntheticFrame);
            }
          }
          return syntheticFrame;
        }
        function describeFunctionComponentFrame(fn, source, ownerFn) {
          {
            return describeNativeComponentFrame(fn, false);
          }
        }
        function shouldConstruct(Component2) {
          var prototype = Component2.prototype;
          return !!(prototype && prototype.isReactComponent);
        }
        function describeUnknownElementTypeFrameInDEV(type, source, ownerFn) {
          if (type == null) {
            return "";
          }
          if (typeof type === "function") {
            {
              return describeNativeComponentFrame(type, shouldConstruct(type));
            }
          }
          if (typeof type === "string") {
            return describeBuiltInComponentFrame(type);
          }
          switch (type) {
            case REACT_SUSPENSE_TYPE:
              return describeBuiltInComponentFrame("Suspense");
            case REACT_SUSPENSE_LIST_TYPE:
              return describeBuiltInComponentFrame("SuspenseList");
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_FORWARD_REF_TYPE:
                return describeFunctionComponentFrame(type.render);
              case REACT_MEMO_TYPE:
                return describeUnknownElementTypeFrameInDEV(type.type, source, ownerFn);
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init = lazyComponent._init;
                try {
                  return describeUnknownElementTypeFrameInDEV(init(payload), source, ownerFn);
                } catch (x) {
                }
              }
            }
          }
          return "";
        }
        var loggedTypeFailures = {};
        var ReactDebugCurrentFrame$1 = ReactSharedInternals.ReactDebugCurrentFrame;
        function setCurrentlyValidatingElement(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              ReactDebugCurrentFrame$1.setExtraStackFrame(stack);
            } else {
              ReactDebugCurrentFrame$1.setExtraStackFrame(null);
            }
          }
        }
        function checkPropTypes(typeSpecs, values, location, componentName, element) {
          {
            var has = Function.call.bind(hasOwnProperty);
            for (var typeSpecName in typeSpecs) {
              if (has(typeSpecs, typeSpecName)) {
                var error$1 = void 0;
                try {
                  if (typeof typeSpecs[typeSpecName] !== "function") {
                    var err = Error((componentName || "React class") + ": " + location + " type `" + typeSpecName + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof typeSpecs[typeSpecName] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                    err.name = "Invariant Violation";
                    throw err;
                  }
                  error$1 = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
                } catch (ex) {
                  error$1 = ex;
                }
                if (error$1 && !(error$1 instanceof Error)) {
                  setCurrentlyValidatingElement(element);
                  error("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", componentName || "React class", location, typeSpecName, typeof error$1);
                  setCurrentlyValidatingElement(null);
                }
                if (error$1 instanceof Error && !(error$1.message in loggedTypeFailures)) {
                  loggedTypeFailures[error$1.message] = true;
                  setCurrentlyValidatingElement(element);
                  error("Failed %s type: %s", location, error$1.message);
                  setCurrentlyValidatingElement(null);
                }
              }
            }
          }
        }
        function setCurrentlyValidatingElement$1(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              setExtraStackFrame(stack);
            } else {
              setExtraStackFrame(null);
            }
          }
        }
        var propTypesMisspellWarningShown;
        {
          propTypesMisspellWarningShown = false;
        }
        function getDeclarationErrorAddendum() {
          if (ReactCurrentOwner.current) {
            var name = getComponentNameFromType(ReactCurrentOwner.current.type);
            if (name) {
              return "\n\nCheck the render method of `" + name + "`.";
            }
          }
          return "";
        }
        function getSourceInfoErrorAddendum(source) {
          if (source !== void 0) {
            var fileName = source.fileName.replace(/^.*[\\\/]/, "");
            var lineNumber = source.lineNumber;
            return "\n\nCheck your code at " + fileName + ":" + lineNumber + ".";
          }
          return "";
        }
        function getSourceInfoErrorAddendumForProps(elementProps) {
          if (elementProps !== null && elementProps !== void 0) {
            return getSourceInfoErrorAddendum(elementProps.__source);
          }
          return "";
        }
        var ownerHasKeyUseWarning = {};
        function getCurrentComponentErrorInfo(parentType) {
          var info = getDeclarationErrorAddendum();
          if (!info) {
            var parentName = typeof parentType === "string" ? parentType : parentType.displayName || parentType.name;
            if (parentName) {
              info = "\n\nCheck the top-level render call using <" + parentName + ">.";
            }
          }
          return info;
        }
        function validateExplicitKey(element, parentType) {
          if (!element._store || element._store.validated || element.key != null) {
            return;
          }
          element._store.validated = true;
          var currentComponentErrorInfo = getCurrentComponentErrorInfo(parentType);
          if (ownerHasKeyUseWarning[currentComponentErrorInfo]) {
            return;
          }
          ownerHasKeyUseWarning[currentComponentErrorInfo] = true;
          var childOwner = "";
          if (element && element._owner && element._owner !== ReactCurrentOwner.current) {
            childOwner = " It was passed a child from " + getComponentNameFromType(element._owner.type) + ".";
          }
          {
            setCurrentlyValidatingElement$1(element);
            error('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', currentComponentErrorInfo, childOwner);
            setCurrentlyValidatingElement$1(null);
          }
        }
        function validateChildKeys(node, parentType) {
          if (typeof node !== "object") {
            return;
          }
          if (isArray(node)) {
            for (var i = 0; i < node.length; i++) {
              var child = node[i];
              if (isValidElement(child)) {
                validateExplicitKey(child, parentType);
              }
            }
          } else if (isValidElement(node)) {
            if (node._store) {
              node._store.validated = true;
            }
          } else if (node) {
            var iteratorFn = getIteratorFn(node);
            if (typeof iteratorFn === "function") {
              if (iteratorFn !== node.entries) {
                var iterator = iteratorFn.call(node);
                var step;
                while (!(step = iterator.next()).done) {
                  if (isValidElement(step.value)) {
                    validateExplicitKey(step.value, parentType);
                  }
                }
              }
            }
          }
        }
        function validatePropTypes(element) {
          {
            var type = element.type;
            if (type === null || type === void 0 || typeof type === "string") {
              return;
            }
            var propTypes;
            if (typeof type === "function") {
              propTypes = type.propTypes;
            } else if (typeof type === "object" && (type.$$typeof === REACT_FORWARD_REF_TYPE || // Note: Memo only checks outer props here.
            // Inner props are checked in the reconciler.
            type.$$typeof === REACT_MEMO_TYPE)) {
              propTypes = type.propTypes;
            } else {
              return;
            }
            if (propTypes) {
              var name = getComponentNameFromType(type);
              checkPropTypes(propTypes, element.props, "prop", name, element);
            } else if (type.PropTypes !== void 0 && !propTypesMisspellWarningShown) {
              propTypesMisspellWarningShown = true;
              var _name = getComponentNameFromType(type);
              error("Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?", _name || "Unknown");
            }
            if (typeof type.getDefaultProps === "function" && !type.getDefaultProps.isReactClassApproved) {
              error("getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.");
            }
          }
        }
        function validateFragmentProps(fragment) {
          {
            var keys = Object.keys(fragment.props);
            for (var i = 0; i < keys.length; i++) {
              var key = keys[i];
              if (key !== "children" && key !== "key") {
                setCurrentlyValidatingElement$1(fragment);
                error("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", key);
                setCurrentlyValidatingElement$1(null);
                break;
              }
            }
            if (fragment.ref !== null) {
              setCurrentlyValidatingElement$1(fragment);
              error("Invalid attribute `ref` supplied to `React.Fragment`.");
              setCurrentlyValidatingElement$1(null);
            }
          }
        }
        function createElementWithValidation(type, props, children) {
          var validType = isValidElementType(type);
          if (!validType) {
            var info = "";
            if (type === void 0 || typeof type === "object" && type !== null && Object.keys(type).length === 0) {
              info += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.";
            }
            var sourceInfo = getSourceInfoErrorAddendumForProps(props);
            if (sourceInfo) {
              info += sourceInfo;
            } else {
              info += getDeclarationErrorAddendum();
            }
            var typeString;
            if (type === null) {
              typeString = "null";
            } else if (isArray(type)) {
              typeString = "array";
            } else if (type !== void 0 && type.$$typeof === REACT_ELEMENT_TYPE) {
              typeString = "<" + (getComponentNameFromType(type.type) || "Unknown") + " />";
              info = " Did you accidentally export a JSX literal instead of a component?";
            } else {
              typeString = typeof type;
            }
            {
              error("React.createElement: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", typeString, info);
            }
          }
          var element = createElement.apply(this, arguments);
          if (element == null) {
            return element;
          }
          if (validType) {
            for (var i = 2; i < arguments.length; i++) {
              validateChildKeys(arguments[i], type);
            }
          }
          if (type === REACT_FRAGMENT_TYPE) {
            validateFragmentProps(element);
          } else {
            validatePropTypes(element);
          }
          return element;
        }
        var didWarnAboutDeprecatedCreateFactory = false;
        function createFactoryWithValidation(type) {
          var validatedFactory = createElementWithValidation.bind(null, type);
          validatedFactory.type = type;
          {
            if (!didWarnAboutDeprecatedCreateFactory) {
              didWarnAboutDeprecatedCreateFactory = true;
              warn("React.createFactory() is deprecated and will be removed in a future major release. Consider using JSX or use React.createElement() directly instead.");
            }
            Object.defineProperty(validatedFactory, "type", {
              enumerable: false,
              get: function() {
                warn("Factory.type is deprecated. Access the class directly before passing it to createFactory.");
                Object.defineProperty(this, "type", {
                  value: type
                });
                return type;
              }
            });
          }
          return validatedFactory;
        }
        function cloneElementWithValidation(element, props, children) {
          var newElement = cloneElement.apply(this, arguments);
          for (var i = 2; i < arguments.length; i++) {
            validateChildKeys(arguments[i], newElement.type);
          }
          validatePropTypes(newElement);
          return newElement;
        }
        function startTransition(scope, options) {
          var prevTransition = ReactCurrentBatchConfig.transition;
          ReactCurrentBatchConfig.transition = {};
          var currentTransition = ReactCurrentBatchConfig.transition;
          {
            ReactCurrentBatchConfig.transition._updatedFibers = /* @__PURE__ */ new Set();
          }
          try {
            scope();
          } finally {
            ReactCurrentBatchConfig.transition = prevTransition;
            {
              if (prevTransition === null && currentTransition._updatedFibers) {
                var updatedFibersCount = currentTransition._updatedFibers.size;
                if (updatedFibersCount > 10) {
                  warn("Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table.");
                }
                currentTransition._updatedFibers.clear();
              }
            }
          }
        }
        var didWarnAboutMessageChannel = false;
        var enqueueTaskImpl = null;
        function enqueueTask(task) {
          if (enqueueTaskImpl === null) {
            try {
              var requireString = ("require" + Math.random()).slice(0, 7);
              var nodeRequire = module && module[requireString];
              enqueueTaskImpl = nodeRequire.call(module, "timers").setImmediate;
            } catch (_err) {
              enqueueTaskImpl = function(callback) {
                {
                  if (didWarnAboutMessageChannel === false) {
                    didWarnAboutMessageChannel = true;
                    if (typeof MessageChannel === "undefined") {
                      error("This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning.");
                    }
                  }
                }
                var channel = new MessageChannel();
                channel.port1.onmessage = callback;
                channel.port2.postMessage(void 0);
              };
            }
          }
          return enqueueTaskImpl(task);
        }
        var actScopeDepth = 0;
        var didWarnNoAwaitAct = false;
        function act(callback) {
          {
            var prevActScopeDepth = actScopeDepth;
            actScopeDepth++;
            if (ReactCurrentActQueue.current === null) {
              ReactCurrentActQueue.current = [];
            }
            var prevIsBatchingLegacy = ReactCurrentActQueue.isBatchingLegacy;
            var result;
            try {
              ReactCurrentActQueue.isBatchingLegacy = true;
              result = callback();
              if (!prevIsBatchingLegacy && ReactCurrentActQueue.didScheduleLegacyUpdate) {
                var queue = ReactCurrentActQueue.current;
                if (queue !== null) {
                  ReactCurrentActQueue.didScheduleLegacyUpdate = false;
                  flushActQueue(queue);
                }
              }
            } catch (error2) {
              popActScope(prevActScopeDepth);
              throw error2;
            } finally {
              ReactCurrentActQueue.isBatchingLegacy = prevIsBatchingLegacy;
            }
            if (result !== null && typeof result === "object" && typeof result.then === "function") {
              var thenableResult = result;
              var wasAwaited = false;
              var thenable = {
                then: function(resolve, reject) {
                  wasAwaited = true;
                  thenableResult.then(function(returnValue2) {
                    popActScope(prevActScopeDepth);
                    if (actScopeDepth === 0) {
                      recursivelyFlushAsyncActWork(returnValue2, resolve, reject);
                    } else {
                      resolve(returnValue2);
                    }
                  }, function(error2) {
                    popActScope(prevActScopeDepth);
                    reject(error2);
                  });
                }
              };
              {
                if (!didWarnNoAwaitAct && typeof Promise !== "undefined") {
                  Promise.resolve().then(function() {
                  }).then(function() {
                    if (!wasAwaited) {
                      didWarnNoAwaitAct = true;
                      error("You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);");
                    }
                  });
                }
              }
              return thenable;
            } else {
              var returnValue = result;
              popActScope(prevActScopeDepth);
              if (actScopeDepth === 0) {
                var _queue = ReactCurrentActQueue.current;
                if (_queue !== null) {
                  flushActQueue(_queue);
                  ReactCurrentActQueue.current = null;
                }
                var _thenable = {
                  then: function(resolve, reject) {
                    if (ReactCurrentActQueue.current === null) {
                      ReactCurrentActQueue.current = [];
                      recursivelyFlushAsyncActWork(returnValue, resolve, reject);
                    } else {
                      resolve(returnValue);
                    }
                  }
                };
                return _thenable;
              } else {
                var _thenable2 = {
                  then: function(resolve, reject) {
                    resolve(returnValue);
                  }
                };
                return _thenable2;
              }
            }
          }
        }
        function popActScope(prevActScopeDepth) {
          {
            if (prevActScopeDepth !== actScopeDepth - 1) {
              error("You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. ");
            }
            actScopeDepth = prevActScopeDepth;
          }
        }
        function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
          {
            var queue = ReactCurrentActQueue.current;
            if (queue !== null) {
              try {
                flushActQueue(queue);
                enqueueTask(function() {
                  if (queue.length === 0) {
                    ReactCurrentActQueue.current = null;
                    resolve(returnValue);
                  } else {
                    recursivelyFlushAsyncActWork(returnValue, resolve, reject);
                  }
                });
              } catch (error2) {
                reject(error2);
              }
            } else {
              resolve(returnValue);
            }
          }
        }
        var isFlushing = false;
        function flushActQueue(queue) {
          {
            if (!isFlushing) {
              isFlushing = true;
              var i = 0;
              try {
                for (; i < queue.length; i++) {
                  var callback = queue[i];
                  do {
                    callback = callback(true);
                  } while (callback !== null);
                }
                queue.length = 0;
              } catch (error2) {
                queue = queue.slice(i + 1);
                throw error2;
              } finally {
                isFlushing = false;
              }
            }
          }
        }
        var createElement$1 = createElementWithValidation;
        var cloneElement$1 = cloneElementWithValidation;
        var createFactory = createFactoryWithValidation;
        var Children = {
          map: mapChildren,
          forEach: forEachChildren,
          count: countChildren,
          toArray,
          only: onlyChild
        };
        exports.Children = Children;
        exports.Component = Component;
        exports.Fragment = REACT_FRAGMENT_TYPE;
        exports.Profiler = REACT_PROFILER_TYPE;
        exports.PureComponent = PureComponent;
        exports.StrictMode = REACT_STRICT_MODE_TYPE;
        exports.Suspense = REACT_SUSPENSE_TYPE;
        exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = ReactSharedInternals;
        exports.act = act;
        exports.cloneElement = cloneElement$1;
        exports.createContext = createContext;
        exports.createElement = createElement$1;
        exports.createFactory = createFactory;
        exports.createRef = createRef;
        exports.forwardRef = forwardRef;
        exports.isValidElement = isValidElement;
        exports.lazy = lazy;
        exports.memo = memo;
        exports.startTransition = startTransition;
        exports.unstable_act = act;
        exports.useCallback = useCallback2;
        exports.useContext = useContext;
        exports.useDebugValue = useDebugValue;
        exports.useDeferredValue = useDeferredValue;
        exports.useEffect = useEffect3;
        exports.useId = useId;
        exports.useImperativeHandle = useImperativeHandle;
        exports.useInsertionEffect = useInsertionEffect;
        exports.useLayoutEffect = useLayoutEffect;
        exports.useMemo = useMemo2;
        exports.useReducer = useReducer;
        exports.useRef = useRef3;
        exports.useState = useState2;
        exports.useSyncExternalStore = useSyncExternalStore;
        exports.useTransition = useTransition;
        exports.version = ReactVersion;
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop === "function") {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(new Error());
        }
      })();
    }
  }
});

// node_modules/react/index.js
var require_react = __commonJS({
  "node_modules/react/index.js"(exports, module) {
    "use strict";
    if (false) {
      module.exports = null;
    } else {
      module.exports = require_react_development();
    }
  }
});

// src/games/arcade/dig-hole-treasure/index.jsx
var import_react2 = __toESM(require_react(), 1);

// src/utils/useGameRuntimeBridge.js
var import_react = __toESM(require_react(), 1);
var toSafeNumber = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, numeric);
};
function useGameRuntimeBridge(state, buildTextPayload, advanceTimeHandler) {
  const stateRef = (0, import_react.useRef)(state);
  const payloadBuilderRef = (0, import_react.useRef)(buildTextPayload);
  const advanceTimeRef = (0, import_react.useRef)(advanceTimeHandler);
  (0, import_react.useEffect)(() => {
    stateRef.current = state;
  }, [state]);
  (0, import_react.useEffect)(() => {
    payloadBuilderRef.current = buildTextPayload;
  }, [buildTextPayload]);
  (0, import_react.useEffect)(() => {
    advanceTimeRef.current = advanceTimeHandler;
  }, [advanceTimeHandler]);
  (0, import_react.useEffect)(() => {
    const renderState = () => {
      try {
        return JSON.stringify(payloadBuilderRef.current(stateRef.current));
      } catch (error) {
        return JSON.stringify({
          mode: "error",
          message: "render_state_failed"
        });
      }
    };
    const advanceTime = (ms = 0) => {
      const safeMs = toSafeNumber(ms);
      const handler = advanceTimeRef.current;
      if (typeof handler === "function") {
        return handler(safeMs);
      }
      return void 0;
    };
    window.render_game_to_text = renderState;
    window.advanceTime = advanceTime;
    return () => {
      if (window.render_game_to_text === renderState) {
        window.render_game_to_text = void 0;
      }
      if (window.advanceTime === advanceTime) {
        window.advanceTime = void 0;
      }
    };
  }, []);
}

// src/utils/resolveBrowserLanguage.js
var DEFAULT_LANGUAGE = "en";
var pickNavigatorLanguage = () => {
  if (typeof navigator === "undefined") {
    return DEFAULT_LANGUAGE;
  }
  if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
    return navigator.languages[0] || DEFAULT_LANGUAGE;
  }
  return navigator.language || DEFAULT_LANGUAGE;
};
function resolveBrowserLanguage() {
  const language = String(pickNavigatorLanguage()).toLowerCase();
  return language.startsWith("es") ? "es" : "en";
}

// src/games/arcade/dig-hole-treasure/worlds.js
var WORLD_IDS = ["jungle", "desert", "urban"];
var RARITY_LABELS = {
  es: {
    common: "Comun",
    uncommon: "Poco comun",
    rare: "Raro",
    epic: "Epico",
    legendary: "Legendario",
    mythic: "Mitico"
  },
  en: {
    common: "Common",
    uncommon: "Uncommon",
    rare: "Rare",
    epic: "Epic",
    legendary: "Legendary",
    mythic: "Mythic"
  }
};
var sharedStone = {
  id: "stone",
  labelEs: "Piedra",
  labelEn: "Stone",
  rarity: "common",
  value: 3,
  hardness: 1.05,
  color: "#6f695e",
  accent: "#9c9589",
  weights: [64, 48, 30, 18, 10],
  floor: 10
};
var WORLD_CONFIGS = {
  jungle: {
    id: "jungle",
    titleEs: "Selva Abisal",
    titleEn: "Abyssal Jungle",
    subtitleEs: "Baja entre lianas, barro fosil y geodas verdes hasta una camara del tesoro oculta bajo la selva.",
    subtitleEn: "Descend through vines, fossil mud, and green geodes until you reach a treasure chamber hidden below the jungle.",
    shopNameEs: "Puesto del Explorador",
    shopNameEn: "Explorer Outpost",
    treasureNameEs: "Corazon de la Selva",
    treasureNameEn: "Heart of the Jungle",
    surfaceLabelEs: "Campamento tropical",
    surfaceLabelEn: "Tropical camp",
    palette: {
      skyTop: "#79d6a1",
      skyBottom: "#e6ffcf",
      haze: "#b9f2bb",
      surface: "#5b4b2e",
      surfaceGrass: "#2f8d4d",
      stallMain: "#ae6d3b",
      stallTrim: "#ffd596",
      rope: "#9a7b4f",
      beacon: "#b8ffe1",
      darkTint: "rgba(4, 19, 12, 0.75)",
      treasureGlow: "#57f6a7",
      chamberStone: "#2f3f2f",
      chamberGold: "#e6d66b"
    },
    mineralsPitchEs: [
      "Piedra y barro fosil cerca de la superficie.",
      "Ambar y jade en profundidad media.",
      "Esmeralda, obsidiana ritual y cristal canopy en la zona abisal."
    ],
    mineralsPitchEn: [
      "Stone and fossil mud near the surface.",
      "Amber and jade in the mid-depth layers.",
      "Emerald, ritual obsidian, and canopy crystal in the abyss."
    ],
    materials: [
      sharedStone,
      {
        id: "fossil_clay",
        labelEs: "Barro fosil",
        labelEn: "Fossil clay",
        rarity: "common",
        value: 5,
        hardness: 0.9,
        color: "#8f7058",
        accent: "#c7a17d",
        weights: [28, 23, 16, 7, 2],
        floor: 1.2
      },
      {
        id: "amber",
        labelEs: "Ambar",
        labelEn: "Amber",
        rarity: "uncommon",
        value: 12,
        hardness: 1.25,
        color: "#f0a632",
        accent: "#ffd875",
        weights: [3, 12, 10, 5, 1.2],
        floor: 0.8
      },
      {
        id: "jade",
        labelEs: "Jade",
        labelEn: "Jade",
        rarity: "rare",
        value: 22,
        hardness: 1.45,
        color: "#2fbf83",
        accent: "#aef0c8",
        weights: [0.8, 4, 11, 12, 6],
        floor: 0.5
      },
      {
        id: "emerald",
        labelEs: "Esmeralda salvaje",
        labelEn: "Wild emerald",
        rarity: "epic",
        value: 42,
        hardness: 1.7,
        color: "#09a75f",
        accent: "#7ff2b8",
        weights: [0.2, 1.5, 4, 10, 12],
        floor: 0.18
      },
      {
        id: "idol_obsidian",
        labelEs: "Obsidiana ritual",
        labelEn: "Ritual obsidian",
        rarity: "legendary",
        value: 88,
        hardness: 2.15,
        color: "#31253d",
        accent: "#b983ff",
        weights: [0.1, 0.5, 1.6, 5.5, 9],
        floor: 0.09
      },
      {
        id: "canopy_crystal",
        labelEs: "Cristal canopy",
        labelEn: "Canopy crystal",
        rarity: "mythic",
        value: 170,
        hardness: 2.4,
        color: "#8fffe2",
        accent: "#ffffff",
        weights: [0.04, 0.15, 0.7, 1.8, 5.6],
        floor: 0.05
      }
    ]
  },
  desert: {
    id: "desert",
    titleEs: "Desierto Solar",
    titleEn: "Solar Desert",
    subtitleEs: "Excava dunas compactas, vetas de sal y roca meteorica hasta encontrar una puerta sellada bajo la arena.",
    subtitleEn: "Dig through compact dunes, salt veins, and meteoric rock until you find a sealed door beneath the sands.",
    shopNameEs: "Mercado del Oasis",
    shopNameEn: "Oasis Market",
    treasureNameEs: "Corona del Sol",
    treasureNameEn: "Sun Crown",
    surfaceLabelEs: "Campamento del oasis",
    surfaceLabelEn: "Oasis camp",
    palette: {
      skyTop: "#ffd678",
      skyBottom: "#fff0c8",
      haze: "#ffdcb4",
      surface: "#9f6a26",
      surfaceGrass: "#d9af52",
      stallMain: "#b85d2a",
      stallTrim: "#ffe2aa",
      rope: "#aa7a45",
      beacon: "#fff6af",
      darkTint: "rgba(22, 12, 1, 0.78)",
      treasureGlow: "#ffcb5c",
      chamberStone: "#48331f",
      chamberGold: "#f4c659"
    },
    mineralsPitchEs: [
      "Piedra, arenisca y sal cristalina en capas altas.",
      "Cobre y turquesa en estratos intermedios.",
      "Opalo solar, rubi escarabajo y vidrio meteorico en la fosa profunda."
    ],
    mineralsPitchEn: [
      "Stone, sandstone, and crystal salt in the upper layers.",
      "Copper and turquoise in the mid-depth strata.",
      "Sun opal, scarab ruby, and meteor glass in the deep basin."
    ],
    materials: [
      sharedStone,
      {
        id: "sandstone",
        labelEs: "Arenisca",
        labelEn: "Sandstone",
        rarity: "common",
        value: 4,
        hardness: 0.95,
        color: "#d69a54",
        accent: "#f6d8a5",
        weights: [30, 24, 14, 6, 2],
        floor: 1.4
      },
      {
        id: "salt_crystal",
        labelEs: "Sal cristalina",
        labelEn: "Crystal salt",
        rarity: "uncommon",
        value: 11,
        hardness: 1.2,
        color: "#f2f4ff",
        accent: "#bdd4ff",
        weights: [4, 10, 11, 5, 1.2],
        floor: 0.7
      },
      {
        id: "copper_ore",
        labelEs: "Cobre",
        labelEn: "Copper ore",
        rarity: "uncommon",
        value: 15,
        hardness: 1.35,
        color: "#bb6d34",
        accent: "#ffd3a1",
        weights: [2, 8, 12, 10, 4],
        floor: 0.9
      },
      {
        id: "turquoise",
        labelEs: "Turquesa",
        labelEn: "Turquoise",
        rarity: "rare",
        value: 30,
        hardness: 1.65,
        color: "#1bbec7",
        accent: "#aff6ff",
        weights: [0.5, 2.2, 8.2, 10.5, 7.4],
        floor: 0.4
      },
      {
        id: "sun_opal",
        labelEs: "Opalo solar",
        labelEn: "Sun opal",
        rarity: "epic",
        value: 54,
        hardness: 1.82,
        color: "#ff9248",
        accent: "#fff1ab",
        weights: [0.15, 0.8, 3.6, 8.6, 11],
        floor: 0.15
      },
      {
        id: "scarab_ruby",
        labelEs: "Rubi escarabajo",
        labelEn: "Scarab ruby",
        rarity: "legendary",
        value: 96,
        hardness: 2.2,
        color: "#c8242d",
        accent: "#ff98a0",
        weights: [0.08, 0.4, 1.4, 4.7, 8.2],
        floor: 0.08
      },
      {
        id: "meteor_glass",
        labelEs: "Vidrio meteorico",
        labelEn: "Meteor glass",
        rarity: "mythic",
        value: 182,
        hardness: 2.45,
        color: "#5b3f77",
        accent: "#d7c4ff",
        weights: [0.03, 0.12, 0.5, 1.9, 5.2],
        floor: 0.04
      }
    ]
  },
  urban: {
    id: "urban",
    titleEs: "Jardin Urbano",
    titleEn: "Urban Backyard",
    subtitleEs: "Empieza en el jardin de una casa, atraviesa escombros antiguos y baja hasta una camara secreta bajo la zona urbana.",
    subtitleEn: "Start in a house garden, cross old debris layers, and descend into a secret chamber beneath the urban district.",
    shopNameEs: "Puesto del Vecindario",
    shopNameEn: "Neighborhood Stall",
    treasureNameEs: "Capsula del Barrio",
    treasureNameEn: "Neighborhood Vault",
    surfaceLabelEs: "Patio principal",
    surfaceLabelEn: "Main backyard",
    palette: {
      skyTop: "#9ed1ff",
      skyBottom: "#eef8ff",
      haze: "#dbeeff",
      surface: "#6e4f33",
      surfaceGrass: "#5db55c",
      stallMain: "#d85f5f",
      stallTrim: "#f9f0c2",
      rope: "#8b6a46",
      beacon: "#8ae1ff",
      darkTint: "rgba(6, 12, 24, 0.8)",
      treasureGlow: "#6fd0ff",
      chamberStone: "#333842",
      chamberGold: "#f4d96c"
    },
    mineralsPitchEs: [
      "Piedra, ladrillo y ceramica cerca del jardin.",
      "Tuberia de cobre y piezas de plata a media profundidad.",
      "Anillos, fichas antiguas y cristal prismico junto a la boveda final."
    ],
    mineralsPitchEn: [
      "Stone, brick, and ceramic near the garden layer.",
      "Copper pipes and silver parts in the mid-depth range.",
      "Rings, old tokens, and prismatic crystal near the final vault."
    ],
    materials: [
      sharedStone,
      {
        id: "brick_shard",
        labelEs: "Ladrillo antiguo",
        labelEn: "Old brick shard",
        rarity: "common",
        value: 4,
        hardness: 0.94,
        color: "#b65b44",
        accent: "#f0b39a",
        weights: [24, 18, 10, 4, 1.2],
        floor: 1.1
      },
      {
        id: "ceramic",
        labelEs: "Ceramica",
        labelEn: "Ceramic shard",
        rarity: "uncommon",
        value: 10,
        hardness: 1.18,
        color: "#d9d8cf",
        accent: "#ffffff",
        weights: [6, 10, 9, 4, 1.1],
        floor: 0.75
      },
      {
        id: "copper_pipe",
        labelEs: "Tuberia de cobre",
        labelEn: "Copper pipe",
        rarity: "uncommon",
        value: 16,
        hardness: 1.34,
        color: "#ab6b3d",
        accent: "#ffe1bb",
        weights: [2, 8, 11, 9, 4.5],
        floor: 0.8
      },
      {
        id: "silver_gear",
        labelEs: "Pieza de plata",
        labelEn: "Silver gear",
        rarity: "rare",
        value: 31,
        hardness: 1.6,
        color: "#9eb2cc",
        accent: "#f4fbff",
        weights: [0.4, 2.5, 7.5, 10.5, 7],
        floor: 0.36
      },
      {
        id: "gold_ring",
        labelEs: "Anillo enterrado",
        labelEn: "Buried gold ring",
        rarity: "epic",
        value: 57,
        hardness: 1.85,
        color: "#f1c44a",
        accent: "#fff2b9",
        weights: [0.12, 0.8, 3.2, 8, 10.4],
        floor: 0.14
      },
      {
        id: "vault_token",
        labelEs: "Ficha de boveda",
        labelEn: "Vault token",
        rarity: "legendary",
        value: 102,
        hardness: 2.18,
        color: "#5368b3",
        accent: "#ccd9ff",
        weights: [0.06, 0.24, 1.2, 4.4, 7.8],
        floor: 0.07
      },
      {
        id: "prism_core",
        labelEs: "Cristal prismico",
        labelEn: "Prism crystal",
        rarity: "mythic",
        value: 188,
        hardness: 2.45,
        color: "#6bd0ff",
        accent: "#ffffff",
        weights: [0.03, 0.1, 0.42, 1.6, 5.4],
        floor: 0.04
      }
    ]
  }
};
function getWorldConfig(worldId) {
  return WORLD_CONFIGS[worldId] ?? WORLD_CONFIGS.jungle;
}
function getWorldText(world, locale, key) {
  const normalizedLocale = locale === "es" ? "Es" : "En";
  return world?.[`${key}${normalizedLocale}`] ?? "";
}
function getRarityLabel(locale, rarity) {
  return (RARITY_LABELS[locale] ?? RARITY_LABELS.en)[rarity] ?? rarity;
}
function formatDepthLabel(locale, meters) {
  const safeMeters = Math.max(0, Math.round(meters));
  if (safeMeters >= 1e3) {
    const km = (safeMeters / 1e3).toFixed(2);
    return locale === "es" ? `${km} km` : `${km} km`;
  }
  return locale === "es" ? `${safeMeters} m` : `${safeMeters} m`;
}
function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = state + 1831565813 | 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// src/games/arcade/dig-hole-treasure/runtime.js
var STAGE_WIDTH = 960;
var STAGE_HEIGHT = 560;
var STORAGE_KEY = "dig-hole-treasure-progress-v1";
var STEP = 1 / 60;
var TILE_SIZE = 32;
var WORLD_COLS = 68;
var WORLD_ROWS = 220;
var SURFACE_ROW = 7;
var METERS_PER_ROW = 22;
var PLAYER_WIDTH = 24;
var PLAYER_HEIGHT = 44;
var MOVE_SPEED = 210;
var AIR_DRAG = 12;
var GRAVITY = 1780;
var JUMP_SPEED = 620;
var JETPACK_ASCENT_SPEED = 520;
var DIG_REACH = TILE_SIZE * 2.25;
var DARKNESS_START_ROW = 42;
var ABYSS_START_ROW = 118;
var SHOP_X = 9.5 * TILE_SIZE;
var SHAFT_X = 33.5 * TILE_SIZE;
var SHAFT_CLEAR_WIDTH = 2;
var TORCH_PACK_AMOUNT = 4;
var TORCH_PACK_COST = 24;
var JETPACK_COST = 190;
var JETPACK_UNLOCK_DEPTH = 260;
var SPEED_COSTS = [0, 55, 120, 210, 330, 490];
var CAPACITY_COSTS = [0, 45, 110, 190, 290, 430];
var CAPACITY_VALUES = [18, 30, 44, 60, 78, 98];
var DIG_SPEED_VALUES = [1, 1.35, 1.75, 2.15, 2.6, 3.1];
var DUST_COLORS = ["#f7e4b8", "#e4c37c", "#d19f57", "#ffffff"];
var ONE_SHOT_CONTROLS = /* @__PURE__ */ new Set([
  "jump",
  "digLeft",
  "digDown",
  "digRight",
  "torch",
  "jetpack",
  "interact"
]);
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function approach(current, target, delta) {
  if (current < target) {
    return Math.min(target, current + delta);
  }
  if (current > target) {
    return Math.max(target, current - delta);
  }
  return target;
}
function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
function distanceSq(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}
function hashString(seedText) {
  let hash = 2166136261;
  for (let index = 0; index < seedText.length; index += 1) {
    hash ^= seedText.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function getBandIndex(depthRatio) {
  if (depthRatio < 0.12) {
    return 0;
  }
  if (depthRatio < 0.28) {
    return 1;
  }
  if (depthRatio < 0.52) {
    return 2;
  }
  if (depthRatio < 0.78) {
    return 3;
  }
  return 4;
}
function worldIndex(tx, ty) {
  return ty * WORLD_COLS + tx;
}
function tileBounds(tx, ty) {
  return {
    x: tx * TILE_SIZE,
    y: ty * TILE_SIZE,
    w: TILE_SIZE,
    h: TILE_SIZE
  };
}
function playerCenter(player) {
  return {
    x: player.x + PLAYER_WIDTH * 0.5,
    y: player.y + PLAYER_HEIGHT * 0.5
  };
}
function feetRowFromPlayer(player) {
  return Math.floor((player.y + PLAYER_HEIGHT) / TILE_SIZE);
}
function loadProgress() {
  if (typeof window === "undefined") {
    return {
      bestDepthByWorld: {},
      completedWorlds: {}
    };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        bestDepthByWorld: {},
        completedWorlds: {}
      };
    }
    const parsed = JSON.parse(raw);
    return {
      bestDepthByWorld: parsed.bestDepthByWorld ?? {},
      completedWorlds: parsed.completedWorlds ?? {}
    };
  } catch {
    return {
      bestDepthByWorld: {},
      completedWorlds: {}
    };
  }
}
function saveProgress(progress) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
  }
}
function makeWorldCards(locale, progress) {
  return WORLD_IDS.map((worldId) => {
    const world = getWorldConfig(worldId);
    return {
      id: worldId,
      title: getWorldText(world, locale, "title"),
      subtitle: getWorldText(world, locale, "subtitle"),
      treasureName: getWorldText(world, locale, "treasureName"),
      surfaceLabel: getWorldText(world, locale, "surfaceLabel"),
      bestDepthMeters: progress.bestDepthByWorld?.[worldId] ?? 0,
      completed: Boolean(progress.completedWorlds?.[worldId]),
      mineralsPitch: locale === "es" ? world.mineralsPitchEs : world.mineralsPitchEn
    };
  });
}
function materialLabel(material, locale) {
  return locale === "es" ? material.labelEs : material.labelEn;
}
function createMaterialMap(world) {
  const map = {};
  world.materials.forEach((material) => {
    map[material.id] = material;
  });
  return map;
}
function sampleMaterialId(world, row, rng) {
  const depthRatio = clamp((row - SURFACE_ROW) / (WORLD_ROWS - SURFACE_ROW - 1), 0, 1);
  const band = getBandIndex(depthRatio);
  let totalWeight = 0;
  const weighted = world.materials.map((material) => {
    const bandWeight = material.weights[band] ?? 0;
    const weight = Math.max(0, bandWeight + (material.floor ?? 0));
    totalWeight += weight;
    return {
      id: material.id,
      weight
    };
  });
  if (totalWeight <= 0) {
    return "stone";
  }
  let cursor = rng() * totalWeight;
  for (let index = 0; index < weighted.length; index += 1) {
    cursor -= weighted[index].weight;
    if (cursor <= 0) {
      return weighted[index].id;
    }
  }
  return weighted[weighted.length - 1]?.id ?? "stone";
}
function buildCluePath(startX, startY, doorX, doorY, rng) {
  const points = [{ x: startX, y: startY }];
  let currentX = startX;
  let currentY = startY;
  while (currentY < doorY - 14) {
    const verticalStep = 12 + Math.floor(rng() * 8);
    currentY = Math.min(doorY - 12, currentY + verticalStep);
    const horizontalBias = doorX > currentX ? 1 : -1;
    const horizontalSpan = 2 + Math.floor(rng() * 7);
    currentX = clamp(currentX + horizontalBias * horizontalSpan + Math.floor(rng() * 5) - 2, 8, WORLD_COLS - 9);
    points.push({ x: currentX, y: currentY });
  }
  points.push({ x: doorX, y: doorY - 1 });
  return points;
}
function createRun(worldId, locale) {
  const world = getWorldConfig(worldId);
  const materialsById = createMaterialMap(world);
  const seed = hashString(`${worldId}:dig-hole-treasure`);
  const rng = createSeededRandom(seed);
  const grid = new Array(WORLD_COLS * WORLD_ROWS).fill(null);
  for (let row = SURFACE_ROW; row < WORLD_ROWS; row += 1) {
    for (let col = 0; col < WORLD_COLS; col += 1) {
      grid[worldIndex(col, row)] = sampleMaterialId(world, row, rng);
    }
  }
  const doorX = 12 + Math.floor(rng() * (WORLD_COLS - 24));
  const doorY = WORLD_ROWS - 20;
  const chamberLeft = clamp(doorX - 5, 3, WORLD_COLS - 12);
  const chamberRight = clamp(doorX + 5, 10, WORLD_COLS - 4);
  const chamberTop = doorY - 4;
  const chamberBottom = doorY + 4;
  for (let row = chamberTop; row <= chamberBottom; row += 1) {
    for (let col = chamberLeft; col <= chamberRight; col += 1) {
      if (row >= 0 && row < WORLD_ROWS) {
        grid[worldIndex(col, row)] = null;
      }
    }
  }
  const shaftCol = Math.floor(SHAFT_X / TILE_SIZE);
  for (let row = 0; row < SURFACE_ROW; row += 1) {
    for (let delta = -SHAFT_CLEAR_WIDTH; delta <= SHAFT_CLEAR_WIDTH; delta += 1) {
      const col = clamp(shaftCol + delta, 0, WORLD_COLS - 1);
      grid[worldIndex(col, row)] = null;
    }
  }
  const pathPoints = buildCluePath(shaftCol, SURFACE_ROW + 3, doorX, doorY, rng);
  const clues = [];
  for (let index = 1; index < pathPoints.length - 1; index += 1) {
    const point = pathPoints[index];
    const next = pathPoints[index + 1];
    clues.push({
      id: `clue-${index}`,
      x: point.x,
      y: point.y,
      nextX: next.x,
      nextY: next.y,
      revealed: false,
      found: false,
      directionX: Math.sign(next.x - point.x),
      directionY: Math.sign(next.y - point.y),
      remainingDepthMeters: Math.max(0, (doorY - point.y) * METERS_PER_ROW)
    });
  }
  return {
    world,
    materialsById,
    grid,
    seed,
    clues,
    door: {
      x: doorX,
      y: doorY,
      unlocked: false,
      entered: false
    },
    player: {
      x: shaftCol * TILE_SIZE + TILE_SIZE * 0.5 - PLAYER_WIDTH * 0.5,
      y: (SURFACE_ROW - 1) * TILE_SIZE - PLAYER_HEIGHT,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: false,
      jetpacking: false
    },
    camera: {
      x: 0,
      y: 0
    },
    digAction: null,
    torches: [],
    drops: [],
    particles: [],
    message: locale === "es" ? "Elige un bloque cercano para empezar a cavar." : "Pick a nearby block to start digging.",
    messageTimer: 4,
    blocksDug: 0,
    currentClueIndex: 0,
    clueRevealTimerMs: 0,
    bestDepthMeters: 0,
    coins: 0,
    inventory: {},
    shovelLevel: 0,
    cargoLevel: 0,
    torchCount: 3,
    hasJetpack: false,
    treasureCollected: false,
    endingTime: 0,
    fullscreen: false,
    treasureRoom: {
      playerX: 120,
      playerY: 330,
      playerVx: 0,
      playerVy: 0,
      onGround: false,
      chestOpened: false,
      revealTime: 0
    }
  };
}
function getTile(run, tx, ty) {
  if (tx < 0 || tx >= WORLD_COLS || ty < 0 || ty >= WORLD_ROWS) {
    return "bedrock";
  }
  return run.grid[worldIndex(tx, ty)];
}
function setTile(run, tx, ty, tile) {
  if (tx < 0 || tx >= WORLD_COLS || ty < 0 || ty >= WORLD_ROWS) {
    return;
  }
  run.grid[worldIndex(tx, ty)] = tile;
}
function isTileSolid(run, tx, ty) {
  const tile = getTile(run, tx, ty);
  return typeof tile === "string" && tile.length > 0;
}
function getMaterialAt(run, tx, ty) {
  const tile = getTile(run, tx, ty);
  if (!tile || tile === "bedrock") {
    return null;
  }
  return run.materialsById[tile] ?? null;
}
function inventoryCount(run) {
  return Object.values(run.inventory).reduce((total, qty) => total + qty, 0);
}
function inventoryCapacity(run) {
  return CAPACITY_VALUES[run.cargoLevel] ?? CAPACITY_VALUES[0];
}
function digSpeed(run) {
  return DIG_SPEED_VALUES[run.shovelLevel] ?? DIG_SPEED_VALUES[0];
}
function maxLightRadius(row) {
  if (row < DARKNESS_START_ROW) {
    return 210;
  }
  if (row < ABYSS_START_ROW) {
    return lerp(200, 110, (row - DARKNESS_START_ROW) / (ABYSS_START_ROW - DARKNESS_START_ROW));
  }
  return 92;
}
function digDurationMs(run, material) {
  return Math.max(220, material.hardness * 730 / digSpeed(run));
}
function canCarryMore(run) {
  return inventoryCount(run) < inventoryCapacity(run);
}
function addInventory(run, materialId, amount) {
  if (!run.inventory[materialId]) {
    run.inventory[materialId] = 0;
  }
  run.inventory[materialId] += amount;
}
function spawnDust(run, x, y, tint) {
  for (let index = 0; index < 8; index += 1) {
    const angle = Math.PI * 2 * index / 8 + Math.random() * 0.35;
    const speed = 35 + Math.random() * 80;
    run.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      radius: 2 + Math.random() * 3,
      life: 0.5 + Math.random() * 0.3,
      color: tint ?? DUST_COLORS[index % DUST_COLORS.length]
    });
  }
}
function clampRectPlayer(run) {
  run.player.x = clamp(run.player.x, 0, WORLD_COLS * TILE_SIZE - PLAYER_WIDTH);
  run.player.y = clamp(run.player.y, -TILE_SIZE * 2, WORLD_ROWS * TILE_SIZE - PLAYER_HEIGHT);
}
function rectTileCollision(run, x, y, width, height) {
  const left = Math.floor(x / TILE_SIZE);
  const right = Math.floor((x + width - 1) / TILE_SIZE);
  const top = Math.floor(y / TILE_SIZE);
  const bottom = Math.floor((y + height - 1) / TILE_SIZE);
  const solids = [];
  for (let ty = top; ty <= bottom; ty += 1) {
    for (let tx = left; tx <= right; tx += 1) {
      if (isTileSolid(run, tx, ty)) {
        solids.push({ tx, ty, ...tileBounds(tx, ty) });
      }
    }
  }
  return solids;
}
function movePlayerWithWorld(run, dt) {
  const player = run.player;
  player.x += player.vx * dt;
  let collisions = rectTileCollision(run, player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT);
  collisions.forEach((tile) => {
    if (player.vx > 0) {
      player.x = tile.x - PLAYER_WIDTH;
    } else if (player.vx < 0) {
      player.x = tile.x + tile.w;
    }
  });
  player.y += player.vy * dt;
  player.onGround = false;
  collisions = rectTileCollision(run, player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT);
  collisions.forEach((tile) => {
    if (player.vy > 0) {
      player.y = tile.y - PLAYER_HEIGHT;
      player.vy = 0;
      player.onGround = true;
    } else if (player.vy < 0) {
      player.y = tile.y + tile.h;
      player.vy = 0;
    }
  });
  clampRectPlayer(run);
}
function treasureRoomFloorY() {
  return 410;
}
function makeShopOffers(locale, run) {
  const depthUnlocked = run.bestDepthMeters >= JETPACK_UNLOCK_DEPTH;
  const speedNext = Math.min(run.shovelLevel + 1, SPEED_COSTS.length - 1);
  const cargoNext = Math.min(run.cargoLevel + 1, CAPACITY_COSTS.length - 1);
  return {
    shovel: {
      key: "shovel",
      label: locale === "es" ? "Velocidad de pala" : "Shovel speed",
      level: run.shovelLevel,
      maxLevel: SPEED_COSTS.length - 1,
      nextCost: run.shovelLevel >= SPEED_COSTS.length - 1 ? null : SPEED_COSTS[speedNext],
      nextValue: digSpeed({ ...run, shovelLevel: speedNext }),
      canBuy: run.shovelLevel < SPEED_COSTS.length - 1 && run.coins >= SPEED_COSTS[speedNext]
    },
    cargo: {
      key: "cargo",
      label: locale === "es" ? "Capacidad" : "Capacity",
      level: run.cargoLevel,
      maxLevel: CAPACITY_COSTS.length - 1,
      nextCost: run.cargoLevel >= CAPACITY_COSTS.length - 1 ? null : CAPACITY_COSTS[cargoNext],
      nextValue: CAPACITY_VALUES[cargoNext],
      canBuy: run.cargoLevel < CAPACITY_COSTS.length - 1 && run.coins >= CAPACITY_COSTS[cargoNext]
    },
    jetpack: {
      key: "jetpack",
      label: locale === "es" ? "Jetpack de rescate" : "Rescue jetpack",
      owned: run.hasJetpack,
      nextCost: run.hasJetpack ? null : JETPACK_COST,
      unlockDepth: JETPACK_UNLOCK_DEPTH,
      unlocked: depthUnlocked,
      canBuy: !run.hasJetpack && depthUnlocked && run.coins >= JETPACK_COST
    },
    torchPack: {
      key: "torchPack",
      label: locale === "es" ? `Pack de ${TORCH_PACK_AMOUNT} antorchas` : `${TORCH_PACK_AMOUNT} torch pack`,
      nextCost: TORCH_PACK_COST,
      canBuy: run.coins >= TORCH_PACK_COST
    }
  };
}
function screenToWorld(runtime, clientX, clientY) {
  const rect = runtime.canvas.getBoundingClientRect();
  const sx = (clientX - rect.left) / rect.width * STAGE_WIDTH;
  const sy = (clientY - rect.top) / rect.height * STAGE_HEIGHT;
  const run = runtime.run;
  if (!run) {
    return { x: sx, y: sy };
  }
  return {
    x: sx + run.camera.x,
    y: sy + run.camera.y
  };
}
var DigHoleRuntime = class {
  constructor({ canvas, locale, onSnapshot, onFullscreenRequest }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.locale = locale === "es" ? "es" : "en";
    this.onSnapshot = onSnapshot;
    this.onFullscreenRequest = onFullscreenRequest;
    this.progress = loadProgress();
    this.selectedWorldId = WORLD_IDS[0];
    this.screen = "world_select";
    this.playState = "idle";
    this.run = null;
    this.fullscreen = false;
    this.pointer = {
      x: 0,
      y: 0,
      active: false
    };
    this.controls = {
      left: false,
      right: false
    };
    this.jumpQueued = false;
    this.frameHandle = 0;
    this.lastTime = 0;
    this.accumulator = 0;
    this.snapshot = this.buildSnapshot();
    this.boundFrame = (time) => this.frame(time);
    this.boundKeyDown = (event) => this.onKeyDown(event);
    this.boundKeyUp = (event) => this.onKeyUp(event);
    this.boundPointerMove = (event) => this.onPointerMove(event);
    this.boundPointerDown = (event) => this.onPointerDown(event);
    this.boundContextMenu = (event) => event.preventDefault();
  }
  start() {
    window.addEventListener("keydown", this.boundKeyDown);
    window.addEventListener("keyup", this.boundKeyUp);
    this.canvas.addEventListener("mousemove", this.boundPointerMove);
    this.canvas.addEventListener("mousedown", this.boundPointerDown);
    this.canvas.addEventListener("touchstart", this.boundPointerDown, { passive: false });
    this.canvas.addEventListener("touchmove", this.boundPointerMove, { passive: false });
    this.canvas.addEventListener("contextmenu", this.boundContextMenu);
    this.emitSnapshot();
    this.lastTime = performance.now();
    this.frameHandle = window.requestAnimationFrame(this.boundFrame);
  }
  destroy() {
    window.removeEventListener("keydown", this.boundKeyDown);
    window.removeEventListener("keyup", this.boundKeyUp);
    this.canvas.removeEventListener("mousemove", this.boundPointerMove);
    this.canvas.removeEventListener("mousedown", this.boundPointerDown);
    this.canvas.removeEventListener("touchstart", this.boundPointerDown);
    this.canvas.removeEventListener("touchmove", this.boundPointerMove);
    this.canvas.removeEventListener("contextmenu", this.boundContextMenu);
    if (this.frameHandle) {
      window.cancelAnimationFrame(this.frameHandle);
      this.frameHandle = 0;
    }
  }
  setFullscreenState(isFullscreen) {
    this.fullscreen = Boolean(isFullscreen);
    if (this.run) {
      this.run.fullscreen = this.fullscreen;
    }
    this.emitSnapshot();
  }
  setVirtualControl(control, active) {
    if (ONE_SHOT_CONTROLS.has(control)) {
      if (active) {
        if (control === "jump") {
          this.jumpQueued = true;
        } else if (control === "digLeft") {
          this.digRelative(-1, 0);
        } else if (control === "digDown") {
          this.digRelative(0, 1);
        } else if (control === "digRight") {
          this.digRelative(1, 0);
        } else if (control === "torch") {
          this.placeTorch();
        } else if (control === "jetpack") {
          this.useJetpack();
        } else if (control === "interact") {
          this.interact();
        }
      }
      return;
    }
    if (control === "left" || control === "right") {
      this.controls[control] = active;
    }
  }
  selectWorld(worldId) {
    if (!WORLD_IDS.includes(worldId)) {
      return;
    }
    this.selectedWorldId = worldId;
    if (this.screen === "world_select") {
      this.emitSnapshot();
    }
  }
  startRun(worldId = this.selectedWorldId) {
    this.selectedWorldId = worldId;
    this.run = createRun(worldId, this.locale);
    this.run.fullscreen = this.fullscreen;
    this.screen = "playing";
    this.playState = "running";
    this.controls.left = false;
    this.controls.right = false;
    this.jumpQueued = false;
    this.emitSnapshot();
  }
  restart() {
    this.startRun(this.selectedWorldId);
  }
  returnToWorldSelect() {
    this.screen = "world_select";
    this.playState = "idle";
    this.controls.left = false;
    this.controls.right = false;
    this.jumpQueued = false;
    this.emitSnapshot();
  }
  togglePause() {
    if (!this.run || this.screen === "world_select" || this.screen === "ending" || this.screen === "shop") {
      return;
    }
    this.playState = this.playState === "paused" ? "running" : "paused";
    this.emitSnapshot();
  }
  openShop() {
    if (!this.run || this.screen !== "playing" || !this.isNearShop()) {
      return;
    }
    this.screen = "shop";
    this.playState = "paused";
    this.showMessage(this.locale === "es" ? "Puesto abierto. Vende minerales y mejora tu equipo." : "Outpost open. Sell minerals and upgrade your gear.", 3.8);
    this.emitSnapshot();
  }
  closeShop() {
    if (this.screen !== "shop") {
      return;
    }
    this.screen = "playing";
    this.playState = "running";
    this.emitSnapshot();
  }
  purchaseOffer(key) {
    if (!this.run || this.screen !== "shop") {
      return;
    }
    const offers = makeShopOffers(this.locale, this.run);
    const offer = offers[key];
    if (!offer) {
      return;
    }
    if (key === "shovel" && offer.canBuy && offer.nextCost != null) {
      this.run.coins -= offer.nextCost;
      this.run.shovelLevel += 1;
      this.showMessage(this.locale === "es" ? "La pala ahora excava mas rapido." : "Your shovel now digs faster.");
    }
    if (key === "cargo" && offer.canBuy && offer.nextCost != null) {
      this.run.coins -= offer.nextCost;
      this.run.cargoLevel += 1;
      this.showMessage(this.locale === "es" ? "La mochila admite mas carga." : "Your backpack now holds more cargo.");
    }
    if (key === "jetpack" && offer.canBuy && offer.nextCost != null) {
      this.run.coins -= offer.nextCost;
      this.run.hasJetpack = true;
      this.showMessage(this.locale === "es" ? "Jetpack activado. Pulsa B para volver a la superficie." : "Jetpack unlocked. Press B to return to the surface.", 4.2);
    }
    if (key === "torchPack" && offer.canBuy && offer.nextCost != null) {
      this.run.coins -= offer.nextCost;
      this.run.torchCount += TORCH_PACK_AMOUNT;
      this.showMessage(this.locale === "es" ? "Has comprado un pack de antorchas." : "You bought a torch pack.");
    }
    this.emitSnapshot();
  }
  sellMaterial(materialId, amount) {
    if (!this.run || this.screen !== "shop") {
      return;
    }
    const material = this.run.materialsById[materialId];
    const owned = this.run.inventory[materialId] ?? 0;
    const qty = clamp(amount, 0, owned);
    if (!material || qty <= 0) {
      return;
    }
    this.run.inventory[materialId] -= qty;
    if (this.run.inventory[materialId] <= 0) {
      delete this.run.inventory[materialId];
    }
    this.run.coins += material.value * qty;
    this.showMessage(
      this.locale === "es" ? `Vendidas ${qty} unidades de ${materialLabel(material, this.locale)} por ${material.value * qty} monedas.` : `Sold ${qty} ${materialLabel(material, this.locale)} for ${material.value * qty} coins.`,
      2.8
    );
    this.emitSnapshot();
  }
  sellAllMaterials() {
    if (!this.run || this.screen !== "shop") {
      return;
    }
    const ids = Object.keys(this.run.inventory);
    ids.forEach((materialId) => {
      this.sellMaterial(materialId, this.run.inventory[materialId]);
    });
  }
  useJetpack() {
    if (!this.run || this.screen !== "playing" && this.screen !== "shop" || !this.run.hasJetpack) {
      return;
    }
    if (this.screen === "shop") {
      this.closeShop();
    }
    this.run.player.jetpacking = true;
    this.playState = "running";
    this.screen = "playing";
    this.showMessage(this.locale === "es" ? "Jetpack encendido. Ascenso automatico a la superficie." : "Jetpack engaged. Returning to the surface.", 2.8);
    this.emitSnapshot();
  }
  placeTorch() {
    if (!this.run || this.screen !== "playing" || this.playState !== "running") {
      return;
    }
    if (this.run.torchCount <= 0) {
      this.showMessage(this.locale === "es" ? "No quedan antorchas. Compra mas en el puesto." : "No torches left. Buy more at the outpost.");
      return;
    }
    const player = this.run.player;
    const center = playerCenter(player);
    const tx = clamp(Math.floor(center.x / TILE_SIZE), 1, WORLD_COLS - 2);
    const ty = clamp(Math.floor(center.y / TILE_SIZE), SURFACE_ROW + 1, WORLD_ROWS - 2);
    const wallLeft = isTileSolid(this.run, tx - 1, ty);
    const wallRight = isTileSolid(this.run, tx + 1, ty);
    if (!wallLeft && !wallRight) {
      this.showMessage(this.locale === "es" ? "Necesitas una pared lateral para fijar la antorcha." : "You need a side wall to place a torch.");
      return;
    }
    const anchorX = wallLeft ? tx - 0.2 : tx + 1.2;
    this.run.torches.push({
      x: anchorX * TILE_SIZE,
      y: ty * TILE_SIZE + TILE_SIZE * 0.5,
      radius: 150
    });
    this.run.torchCount -= 1;
    this.showMessage(this.locale === "es" ? "Antorcha colocada en la pared." : "Torch placed on the wall.");
    this.emitSnapshot();
  }
  interact() {
    if (!this.run) {
      return;
    }
    if (this.screen === "playing" && this.isNearShop()) {
      this.openShop();
      return;
    }
    if (this.screen === "playing" && this.canEnterDoor()) {
      this.enterTreasureRoom();
      return;
    }
    if (this.screen === "treasure_room" && this.canClaimTreasure()) {
      this.claimTreasure();
    }
  }
  enterTreasureRoom() {
    if (!this.run) {
      return;
    }
    this.screen = "treasure_room";
    this.playState = "running";
    this.run.door.entered = true;
    this.run.treasureRoom.playerX = 120;
    this.run.treasureRoom.playerY = 330;
    this.run.treasureRoom.playerVx = 0;
    this.run.treasureRoom.playerVy = 0;
    this.showMessage(
      this.locale === "es" ? "La puerta se abre. Cruza la camara y reclama el tesoro." : "The door opens. Cross the chamber and claim the treasure.",
      4
    );
    this.emitSnapshot();
  }
  claimTreasure() {
    if (!this.run || this.screen !== "treasure_room" || this.run.treasureCollected) {
      return;
    }
    this.run.treasureCollected = true;
    this.run.treasureRoom.chestOpened = true;
    this.run.endingTime = 0;
    this.screen = "ending";
    this.playState = "running";
    this.progress.completedWorlds[this.selectedWorldId] = true;
    const bestDepth = Math.max(this.progress.bestDepthByWorld[this.selectedWorldId] ?? 0, this.run.bestDepthMeters);
    this.progress.bestDepthByWorld[this.selectedWorldId] = bestDepth;
    saveProgress(this.progress);
    this.emitSnapshot();
  }
  isNearShop() {
    if (!this.run) {
      return false;
    }
    const center = playerCenter(this.run.player);
    return center.y <= SURFACE_ROW * TILE_SIZE + 24 && Math.abs(center.x - SHOP_X) <= 86;
  }
  canEnterDoor() {
    if (!this.run || this.screen !== "playing") {
      return false;
    }
    const center = playerCenter(this.run.player);
    const doorPx = {
      x: this.run.door.x * TILE_SIZE + TILE_SIZE * 0.5,
      y: this.run.door.y * TILE_SIZE + TILE_SIZE * 0.5
    };
    return distanceSq(center.x, center.y, doorPx.x, doorPx.y) <= 70 * 70;
  }
  canClaimTreasure() {
    if (!this.run || this.screen !== "treasure_room") {
      return false;
    }
    const dx = 690 - this.run.treasureRoom.playerX;
    const dy = treasureRoomFloorY() - this.run.treasureRoom.playerY;
    return dx * dx + dy * dy <= 120 * 120;
  }
  digRelative(dirX, dirY) {
    if (!this.run || this.screen !== "playing" || this.playState !== "running") {
      return;
    }
    const center = playerCenter(this.run.player);
    const tx = Math.floor(center.x / TILE_SIZE) + dirX;
    const ty = Math.floor((center.y + TILE_SIZE * 0.15) / TILE_SIZE) + dirY;
    this.startDigAtTile(tx, ty);
  }
  startDigAtTile(tx, ty) {
    if (!this.run || this.screen !== "playing") {
      return;
    }
    if (tx < 0 || tx >= WORLD_COLS || ty < SURFACE_ROW || ty >= WORLD_ROWS) {
      return;
    }
    const material = getMaterialAt(this.run, tx, ty);
    if (!material) {
      return;
    }
    const center = playerCenter(this.run.player);
    const targetX = tx * TILE_SIZE + TILE_SIZE * 0.5;
    const targetY = ty * TILE_SIZE + TILE_SIZE * 0.5;
    if (distanceSq(center.x, center.y, targetX, targetY) > DIG_REACH * DIG_REACH) {
      this.showMessage(this.locale === "es" ? "Ese bloque esta demasiado lejos." : "That block is out of reach.");
      return;
    }
    this.run.digAction = {
      tx,
      ty,
      progressMs: 0,
      durationMs: digDurationMs(this.run, material),
      materialId: material.id
    };
  }
  onKeyDown(event) {
    if (event.repeat && event.code !== "Space") {
      return;
    }
    if (event.code === "KeyA" || event.code === "ArrowLeft") {
      this.controls.left = true;
    }
    if (event.code === "KeyD" || event.code === "ArrowRight") {
      this.controls.right = true;
    }
    if (event.code === "KeyW" || event.code === "ArrowUp" || event.code === "Space") {
      this.jumpQueued = true;
      event.preventDefault();
    }
    if (event.code === "KeyJ") {
      this.digRelative(-1, 0);
    }
    if (event.code === "KeyK") {
      this.digRelative(0, 1);
    }
    if (event.code === "KeyL") {
      this.digRelative(1, 0);
    }
    if (event.code === "KeyT") {
      this.placeTorch();
    }
    if (event.code === "KeyB") {
      this.useJetpack();
    }
    if (event.code === "KeyE" || event.code === "Enter") {
      this.interact();
    }
    if (event.code === "KeyM") {
      if (this.screen === "shop") {
        this.closeShop();
      } else {
        this.openShop();
      }
    }
    if (event.code === "KeyP") {
      this.togglePause();
    }
    if (event.code === "KeyR") {
      this.restart();
    }
    if (event.code === "KeyF") {
      this.onFullscreenRequest?.();
    }
    if (event.code === "Escape" && this.screen === "shop") {
      this.closeShop();
    }
  }
  onKeyUp(event) {
    if (event.code === "KeyA" || event.code === "ArrowLeft") {
      this.controls.left = false;
    }
    if (event.code === "KeyD" || event.code === "ArrowRight") {
      this.controls.right = false;
    }
  }
  onPointerMove(event) {
    if (!this.run || this.screen === "world_select") {
      return;
    }
    const point = "touches" in event && event.touches?.[0] ? screenToWorld(this, event.touches[0].clientX, event.touches[0].clientY) : screenToWorld(this, event.clientX, event.clientY);
    this.pointer.x = point.x;
    this.pointer.y = point.y;
    this.pointer.active = true;
    if ("touches" in event) {
      event.preventDefault();
    }
  }
  onPointerDown(event) {
    if (this.screen === "world_select" || !this.run) {
      return;
    }
    const rawPoint = "touches" in event && event.touches?.[0] ? screenToWorld(this, event.touches[0].clientX, event.touches[0].clientY) : screenToWorld(this, event.clientX, event.clientY);
    this.pointer.x = rawPoint.x;
    this.pointer.y = rawPoint.y;
    this.pointer.active = true;
    if (this.screen === "playing" && this.playState === "running") {
      const tx = Math.floor(rawPoint.x / TILE_SIZE);
      const ty = Math.floor(rawPoint.y / TILE_SIZE);
      this.startDigAtTile(tx, ty);
    }
    if (this.screen === "treasure_room" && this.canClaimTreasure()) {
      this.claimTreasure();
    }
    if ("touches" in event) {
      event.preventDefault();
    }
  }
  showMessage(text, seconds = 2.6) {
    if (!this.run) {
      return;
    }
    this.run.message = text;
    this.run.messageTimer = seconds;
  }
  update(dt) {
    if (!this.run) {
      return;
    }
    if (this.run.messageTimer > 0) {
      this.run.messageTimer = Math.max(0, this.run.messageTimer - dt);
    }
    if (this.screen === "playing" && this.playState === "running") {
      this.updatePlaying(dt);
    } else if (this.screen === "treasure_room" && this.playState === "running") {
      this.updateTreasureRoom(dt);
    } else if (this.screen === "ending") {
      this.run.endingTime += dt;
      this.run.treasureRoom.revealTime += dt;
    }
    this.updateParticles(dt);
    this.updateCamera(dt);
    this.emitSnapshot();
  }
  updatePlaying(dt) {
    const run = this.run;
    const player = run.player;
    const horizontalInput = (this.controls.right ? 1 : 0) - (this.controls.left ? 1 : 0);
    if (player.jetpacking) {
      player.vx = approach(player.vx, 0, 520 * dt);
      player.x = approach(player.x, SHAFT_X - PLAYER_WIDTH * 0.5, 110 * dt);
      player.vy = -JETPACK_ASCENT_SPEED;
    } else {
      player.vx = approach(player.vx, horizontalInput * MOVE_SPEED, 860 * dt);
      if (horizontalInput === 0) {
        player.vx = approach(player.vx, 0, AIR_DRAG * TILE_SIZE * dt);
      }
      if (horizontalInput !== 0) {
        player.facing = horizontalInput;
      }
      if (this.jumpQueued && player.onGround) {
        player.vy = -JUMP_SPEED;
        player.onGround = false;
      }
      player.vy += GRAVITY * dt;
    }
    this.jumpQueued = false;
    movePlayerWithWorld(run, dt);
    if (player.jetpacking && player.y <= (SURFACE_ROW - 1) * TILE_SIZE - PLAYER_HEIGHT) {
      player.jetpacking = false;
      player.x = SHOP_X - 42;
      player.y = (SURFACE_ROW - 1) * TILE_SIZE - PLAYER_HEIGHT;
      player.vx = 0;
      player.vy = 0;
      this.showMessage(this.locale === "es" ? "Has regresado a la superficie. El puesto esta listo." : "Back on the surface. The outpost is ready.");
    }
    this.updateDigAction(dt);
    this.updateDrops();
    this.updateClues(dt);
    this.updateDepthProgress();
  }
  updateTreasureRoom(dt) {
    const room = this.run.treasureRoom;
    const horizontalInput = (this.controls.right ? 1 : 0) - (this.controls.left ? 1 : 0);
    room.playerVx = approach(room.playerVx, horizontalInput * (MOVE_SPEED - 20), 760 * dt);
    if (horizontalInput === 0) {
      room.playerVx = approach(room.playerVx, 0, 580 * dt);
    }
    if (this.jumpQueued && room.onGround) {
      room.playerVy = -JUMP_SPEED * 0.84;
      room.onGround = false;
    }
    this.jumpQueued = false;
    room.playerVy += GRAVITY * dt;
    room.playerX = clamp(room.playerX + room.playerVx * dt, 64, STAGE_WIDTH - 110);
    room.playerY += room.playerVy * dt;
    if (room.playerY >= treasureRoomFloorY()) {
      room.playerY = treasureRoomFloorY();
      room.playerVy = 0;
      room.onGround = true;
    } else {
      room.onGround = false;
    }
    room.revealTime += dt;
  }
  updateDigAction(dt) {
    const run = this.run;
    const action = run.digAction;
    if (!action) {
      return;
    }
    const material = getMaterialAt(run, action.tx, action.ty);
    if (!material) {
      run.digAction = null;
      return;
    }
    const center = playerCenter(run.player);
    const targetX = action.tx * TILE_SIZE + TILE_SIZE * 0.5;
    const targetY = action.ty * TILE_SIZE + TILE_SIZE * 0.5;
    if (distanceSq(center.x, center.y, targetX, targetY) > DIG_REACH * DIG_REACH) {
      run.digAction = null;
      return;
    }
    action.progressMs += dt * 1e3;
    if (action.progressMs >= action.durationMs) {
      setTile(run, action.tx, action.ty, null);
      run.blocksDug += 1;
      spawnDust(run, targetX, targetY, material.accent);
      if (canCarryMore(run)) {
        addInventory(run, material.id, 1);
      } else {
        run.drops.push({
          id: `drop-${run.blocksDug}-${material.id}`,
          x: targetX,
          y: targetY,
          materialId: material.id
        });
        this.showMessage(this.locale === "es" ? "Inventario lleno. El mineral ha caido al suelo." : "Inventory full. The mineral dropped on the ground.", 2.8);
      }
      const foundClue = this.revealClueNear(action.tx, action.ty);
      if (!foundClue) {
        const valueText = this.locale === "es" ? `${material.value} monedas` : `${material.value} coins`;
        this.showMessage(`${materialLabel(material, this.locale)} +1 | ${valueText}`, 1.8);
      }
      run.digAction = null;
    }
  }
  revealClueNear(tx, ty) {
    const run = this.run;
    const activeClue = run.clues[run.currentClueIndex];
    if (!activeClue) {
      return false;
    }
    const near = Math.abs(activeClue.x - tx) <= 1 && Math.abs(activeClue.y - ty) <= 1;
    if (!near) {
      return false;
    }
    activeClue.revealed = true;
    activeClue.found = true;
    run.currentClueIndex += 1;
    run.clueRevealTimerMs = 0;
    const horizontalHint = activeClue.directionX > 0 ? this.locale === "es" ? "a la derecha" : "to the right" : activeClue.directionX < 0 ? this.locale === "es" ? "a la izquierda" : "to the left" : this.locale === "es" ? "debajo" : "below";
    const depthHint = formatDepthLabel(this.locale, activeClue.remainingDepthMeters);
    this.showMessage(
      this.locale === "es" ? `Flecha hallada: sigue ${horizontalHint}. Tesoro a ${depthHint}.` : `Arrow found: keep digging ${horizontalHint}. Treasure at ${depthHint}.`,
      4
    );
    return true;
  }
  updateDrops() {
    const run = this.run;
    const center = playerCenter(run.player);
    run.drops = run.drops.filter((drop) => {
      if (!canCarryMore(run)) {
        return true;
      }
      if (distanceSq(center.x, center.y, drop.x, drop.y) <= 24 * 24) {
        addInventory(run, drop.materialId, 1);
        return false;
      }
      return true;
    });
  }
  updateClues(dt) {
    const run = this.run;
    const target = run.clues[run.currentClueIndex];
    if (!target) {
      run.door.unlocked = true;
      return;
    }
    const center = playerCenter(run.player);
    const clueX = target.x * TILE_SIZE + TILE_SIZE * 0.5;
    const clueY = target.y * TILE_SIZE + TILE_SIZE * 0.5;
    const far = distanceSq(center.x, center.y, clueX, clueY) >= TILE_SIZE * 10 * (TILE_SIZE * 10);
    run.clueRevealTimerMs = far ? run.clueRevealTimerMs + dt * 1e3 : Math.max(0, run.clueRevealTimerMs - dt * 700);
  }
  updateDepthProgress() {
    const run = this.run;
    const row = feetRowFromPlayer(run.player);
    const depthMeters = Math.max(0, (row - SURFACE_ROW) * METERS_PER_ROW);
    run.bestDepthMeters = Math.max(run.bestDepthMeters, depthMeters);
    const previousBest = this.progress.bestDepthByWorld[this.selectedWorldId] ?? 0;
    if (run.bestDepthMeters > previousBest) {
      this.progress.bestDepthByWorld[this.selectedWorldId] = Math.round(run.bestDepthMeters);
      saveProgress(this.progress);
    }
  }
  updateParticles(dt) {
    if (!this.run) {
      return;
    }
    this.run.particles = this.run.particles.filter((particle) => {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 160 * dt;
      return particle.life > 0;
    });
  }
  updateCamera(dt) {
    if (!this.run) {
      return;
    }
    const run = this.run;
    if (this.screen === "playing" || this.screen === "shop") {
      const center = playerCenter(run.player);
      const targetX = clamp(center.x - STAGE_WIDTH * 0.5, 0, WORLD_COLS * TILE_SIZE - STAGE_WIDTH);
      const targetY = clamp(center.y - STAGE_HEIGHT * 0.48, 0, WORLD_ROWS * TILE_SIZE - STAGE_HEIGHT);
      run.camera.x = lerp(run.camera.x, targetX, clamp(dt * 6.5, 0, 1));
      run.camera.y = lerp(run.camera.y, targetY, clamp(dt * 5.5, 0, 1));
    } else {
      run.camera.x = lerp(run.camera.x, 0, clamp(dt * 5, 0, 1));
      run.camera.y = lerp(run.camera.y, 0, clamp(dt * 5, 0, 1));
    }
  }
  frame(time) {
    const deltaSeconds = Math.min(0.05, (time - this.lastTime) / 1e3 || STEP);
    this.lastTime = time;
    this.accumulator += deltaSeconds;
    while (this.accumulator >= STEP) {
      this.update(STEP);
      this.accumulator -= STEP;
    }
    this.render();
    this.frameHandle = window.requestAnimationFrame(this.boundFrame);
  }
  advanceTime(ms = 0) {
    const durationSeconds = Math.max(0, ms / 1e3);
    let elapsed = 0;
    while (elapsed < durationSeconds) {
      const step = Math.min(STEP, durationSeconds - elapsed);
      this.update(step);
      elapsed += step;
    }
    this.render();
    return this.buildSnapshot();
  }
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    if (!this.run) {
      this.renderWorldPreview();
      return;
    }
    if (this.screen === "treasure_room" || this.screen === "ending") {
      this.renderTreasureRoom();
      if (this.screen === "ending") {
        this.renderEndingOverlay();
      }
      return;
    }
    this.renderWorld();
    if (this.playState === "paused" && this.screen === "playing") {
      this.renderPauseOverlay();
    }
  }
  renderWorldPreview() {
    const ctx = this.ctx;
    const world = getWorldConfig(this.selectedWorldId);
    const palette = world.palette;
    const gradient = ctx.createLinearGradient(0, 0, 0, STAGE_HEIGHT);
    gradient.addColorStop(0, palette.skyTop);
    gradient.addColorStop(1, palette.skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    ctx.fillStyle = palette.surface;
    ctx.fillRect(0, STAGE_HEIGHT * 0.72, STAGE_WIDTH, STAGE_HEIGHT * 0.28);
    ctx.fillStyle = palette.surfaceGrass;
    ctx.fillRect(0, STAGE_HEIGHT * 0.68, STAGE_WIDTH, 26);
    ctx.fillStyle = palette.stallMain;
    ctx.fillRect(112, STAGE_HEIGHT * 0.58, 108, 68);
    ctx.fillStyle = palette.stallTrim;
    ctx.fillRect(102, STAGE_HEIGHT * 0.54, 128, 18);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    for (let index = 0; index < 8; index += 1) {
      ctx.fillRect(300 + index * 44, STAGE_HEIGHT * 0.72, 22, 120 + index * 26);
    }
    ctx.fillStyle = "#102433";
    ctx.font = "700 42px Georgia";
    ctx.fillText(getWorldText(world, this.locale, "title"), 84, 90);
    ctx.font = "16px Arial";
    ctx.fillText(getWorldText(world, this.locale, "subtitle"), 84, 124);
  }
  renderWorld() {
    const ctx = this.ctx;
    const run = this.run;
    const { world, camera } = run;
    const palette = world.palette;
    const gradient = ctx.createLinearGradient(0, 0, 0, STAGE_HEIGHT);
    gradient.addColorStop(0, palette.skyTop);
    gradient.addColorStop(0.52, palette.skyBottom);
    gradient.addColorStop(1, "#251b16");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    const surfaceY = SURFACE_ROW * TILE_SIZE - camera.y;
    ctx.fillStyle = palette.surface;
    ctx.fillRect(-camera.x, surfaceY, WORLD_COLS * TILE_SIZE, STAGE_HEIGHT - surfaceY + camera.y);
    ctx.fillStyle = palette.surfaceGrass;
    ctx.fillRect(-camera.x, surfaceY - 8, WORLD_COLS * TILE_SIZE, 16);
    this.renderStall();
    this.renderTiles();
    this.renderDoor();
    this.renderClues();
    this.renderDrops();
    this.renderTorches();
    this.renderDigTarget();
    this.renderPlayer();
    this.renderParticles();
    this.renderDarkness();
    this.renderHud();
  }
  renderTiles() {
    const ctx = this.ctx;
    const run = this.run;
    const left = Math.max(0, Math.floor(run.camera.x / TILE_SIZE) - 1);
    const right = Math.min(WORLD_COLS - 1, Math.ceil((run.camera.x + STAGE_WIDTH) / TILE_SIZE) + 1);
    const top = Math.max(SURFACE_ROW, Math.floor(run.camera.y / TILE_SIZE) - 1);
    const bottom = Math.min(WORLD_ROWS - 1, Math.ceil((run.camera.y + STAGE_HEIGHT) / TILE_SIZE) + 1);
    for (let ty = top; ty <= bottom; ty += 1) {
      for (let tx = left; tx <= right; tx += 1) {
        const material = getMaterialAt(run, tx, ty);
        if (!material) {
          continue;
        }
        const px = tx * TILE_SIZE - run.camera.x;
        const py = ty * TILE_SIZE - run.camera.y;
        ctx.fillStyle = material.color;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = material.accent;
        ctx.globalAlpha = 0.25;
        ctx.fillRect(px + 5, py + 4, 7, 7);
        ctx.fillRect(px + 17, py + 15, 9, 6);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(0, 0, 0, 0.14)";
        ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
      }
    }
  }
  renderStall() {
    const ctx = this.ctx;
    const run = this.run;
    const palette = run.world.palette;
    const x = SHOP_X - run.camera.x;
    const y = SURFACE_ROW * TILE_SIZE - 98 - run.camera.y;
    ctx.fillStyle = palette.rope;
    ctx.fillRect(x - 42, y + 10, 10, 88);
    ctx.fillRect(x + 32, y + 10, 10, 88);
    ctx.fillStyle = palette.stallTrim;
    ctx.fillRect(x - 58, y - 8, 126, 28);
    ctx.fillStyle = palette.stallMain;
    ctx.fillRect(x - 52, y + 20, 114, 58);
    ctx.fillStyle = "#1b140d";
    ctx.font = "700 15px Arial";
    ctx.fillText(getWorldText(run.world, this.locale, "shopName"), x - 48, y + 52, 108);
  }
  renderDoor() {
    const ctx = this.ctx;
    const run = this.run;
    const x = run.door.x * TILE_SIZE - run.camera.x;
    const y = run.door.y * TILE_SIZE - run.camera.y;
    ctx.fillStyle = "#3d2a18";
    ctx.fillRect(x - 8, y - TILE_SIZE * 2, TILE_SIZE + 16, TILE_SIZE * 2);
    ctx.fillStyle = run.door.unlocked ? run.world.palette.treasureGlow : "#8d6f4b";
    ctx.fillRect(x - 2, y - TILE_SIZE * 2 + 8, TILE_SIZE + 4, TILE_SIZE * 2 - 8);
    ctx.fillStyle = "#f6e9b6";
    ctx.beginPath();
    ctx.arc(x + TILE_SIZE * 0.72, y - TILE_SIZE * 0.95, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  renderClues() {
    const ctx = this.ctx;
    const run = this.run;
    run.clues.forEach((clue, index) => {
      if (!clue.revealed && index >= run.currentClueIndex) {
        return;
      }
      const px = clue.x * TILE_SIZE + TILE_SIZE * 0.1 - run.camera.x;
      const py = clue.y * TILE_SIZE + TILE_SIZE * 0.08 - run.camera.y;
      ctx.save();
      ctx.translate(px, py);
      ctx.fillStyle = clue.found ? "#fff4c8" : "#9dc9ff";
      ctx.fillRect(0, 0, TILE_SIZE * 0.8, TILE_SIZE * 0.62);
      ctx.fillStyle = "#5a4020";
      ctx.fillRect(TILE_SIZE * 0.28, TILE_SIZE * 0.62, 5, 16);
      ctx.fillStyle = "#2d1b08";
      ctx.font = "700 13px Arial";
      const arrowGlyph = clue.directionX > 0 ? ">" : clue.directionX < 0 ? "<" : "v";
      ctx.fillText(arrowGlyph, 8, 18);
      ctx.font = "bold 9px Arial";
      ctx.fillText(formatDepthLabel(this.locale, clue.remainingDepthMeters), 5, 30, TILE_SIZE * 0.72);
      ctx.restore();
    });
  }
  renderDrops() {
    const ctx = this.ctx;
    const run = this.run;
    run.drops.forEach((drop, index) => {
      const material = run.materialsById[drop.materialId];
      if (!material) {
        return;
      }
      const px = drop.x - run.camera.x;
      const py = drop.y - run.camera.y + Math.sin(performance.now() * 3e-3 + index) * 2;
      ctx.fillStyle = material.color;
      ctx.beginPath();
      ctx.moveTo(px, py - 6);
      ctx.lineTo(px + 7, py);
      ctx.lineTo(px, py + 6);
      ctx.lineTo(px - 7, py);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = material.accent;
      ctx.stroke();
    });
  }
  renderTorches() {
    const ctx = this.ctx;
    const run = this.run;
    run.torches.forEach((torch, index) => {
      const pulse = 0.85 + Math.sin(performance.now() * 6e-3 + index) * 0.08;
      const px = torch.x - run.camera.x;
      const py = torch.y - run.camera.y;
      ctx.fillStyle = "#5e3514";
      ctx.fillRect(px - 3, py - 12, 6, 28);
      ctx.fillStyle = `rgba(255, 214, 116, ${0.18 * pulse})`;
      ctx.beginPath();
      ctx.arc(px, py - 16, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd06d";
      ctx.beginPath();
      ctx.arc(px, py - 18, 7, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  renderDigTarget() {
    if (!this.run || this.screen !== "playing") {
      return;
    }
    const ctx = this.ctx;
    const tx = Math.floor(this.pointer.x / TILE_SIZE);
    const ty = Math.floor(this.pointer.y / TILE_SIZE);
    const material = getMaterialAt(this.run, tx, ty);
    if (!material) {
      return;
    }
    const center = playerCenter(this.run.player);
    const targetX = tx * TILE_SIZE + TILE_SIZE * 0.5;
    const targetY = ty * TILE_SIZE + TILE_SIZE * 0.5;
    if (distanceSq(center.x, center.y, targetX, targetY) > DIG_REACH * DIG_REACH) {
      return;
    }
    const px = tx * TILE_SIZE - this.run.camera.x;
    const py = ty * TILE_SIZE - this.run.camera.y;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    if (this.run.digAction && this.run.digAction.tx === tx && this.run.digAction.ty === ty) {
      const progress = clamp(this.run.digAction.progressMs / this.run.digAction.durationMs, 0, 1);
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(px + 4, py + TILE_SIZE - 8, (TILE_SIZE - 8) * progress, 4);
    }
  }
  renderPlayer() {
    const ctx = this.ctx;
    const player = this.run.player;
    const px = player.x - this.run.camera.x;
    const py = player.y - this.run.camera.y;
    const walkCycle = Math.sin(performance.now() * 0.012 + player.x * 0.03) * 5;
    ctx.strokeStyle = "#10222c";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(px + PLAYER_WIDTH * 0.5, py + 8, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px + PLAYER_WIDTH * 0.5, py + 16);
    ctx.lineTo(px + PLAYER_WIDTH * 0.5, py + 31);
    ctx.lineTo(px + PLAYER_WIDTH * 0.5 - 8 + walkCycle * 0.2, py + 43);
    ctx.moveTo(px + PLAYER_WIDTH * 0.5, py + 31);
    ctx.lineTo(px + PLAYER_WIDTH * 0.5 + 8 - walkCycle * 0.2, py + 43);
    ctx.moveTo(px + PLAYER_WIDTH * 0.5, py + 22);
    ctx.lineTo(px + PLAYER_WIDTH * 0.5 + player.facing * 10, py + 27);
    ctx.moveTo(px + PLAYER_WIDTH * 0.5, py + 22);
    ctx.lineTo(px + PLAYER_WIDTH * 0.5 - player.facing * 8, py + 28);
    ctx.stroke();
    ctx.fillStyle = "#f9e8c6";
    ctx.beginPath();
    ctx.arc(px + PLAYER_WIDTH * 0.5, py + 8, 6.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f2c54a";
    ctx.fillRect(px + 6, py + 1, 12, 5);
    if (player.jetpacking) {
      ctx.fillStyle = "rgba(255, 150, 66, 0.75)";
      ctx.beginPath();
      ctx.moveTo(px + 7, py + 34);
      ctx.lineTo(px + 12, py + 56 + Math.random() * 8);
      ctx.lineTo(px + 16, py + 34);
      ctx.closePath();
      ctx.fill();
    }
  }
  renderParticles() {
    const ctx = this.ctx;
    this.run.particles.forEach((particle) => {
      const alpha = clamp(particle.life * 1.6, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(particle.x - this.run.camera.x, particle.y - this.run.camera.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  renderDarkness() {
    const ctx = this.ctx;
    const run = this.run;
    const row = feetRowFromPlayer(run.player);
    if (row < DARKNESS_START_ROW) {
      return;
    }
    const ambientRadius = maxLightRadius(row);
    const center = playerCenter(run.player);
    const lights = [
      {
        x: center.x - run.camera.x,
        y: center.y - run.camera.y,
        radius: ambientRadius
      }
    ];
    run.torches.forEach((torch) => {
      lights.push({
        x: torch.x - run.camera.x,
        y: torch.y - run.camera.y,
        radius: torch.radius
      });
    });
    ctx.save();
    ctx.fillStyle = run.world.palette.darkTint;
    ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    ctx.globalCompositeOperation = "destination-out";
    lights.forEach((light) => {
      const gradient = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.55, "rgba(255,255,255,0.55)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
  renderHud() {
    const ctx = this.ctx;
    const run = this.run;
    const row = feetRowFromPlayer(run.player);
    const depthMeters = Math.max(0, (row - SURFACE_ROW) * METERS_PER_ROW);
    const currentClue = run.clues[run.currentClueIndex] ?? null;
    const beaconActive = Boolean(currentClue) && run.clueRevealTimerMs > 6500;
    ctx.fillStyle = "rgba(8, 15, 24, 0.72)";
    ctx.fillRect(18, 16, 252, 98);
    ctx.fillStyle = "#eef5ff";
    ctx.font = "700 16px Arial";
    ctx.fillText(getWorldText(run.world, this.locale, "title"), 30, 38);
    ctx.font = "14px Arial";
    ctx.fillText(
      `${this.locale === "es" ? "Profundidad" : "Depth"}: ${formatDepthLabel(this.locale, depthMeters)}`,
      30,
      62
    );
    ctx.fillText(
      `${this.locale === "es" ? "Carga" : "Cargo"}: ${inventoryCount(run)}/${inventoryCapacity(run)}`,
      30,
      82
    );
    ctx.fillText(
      `${this.locale === "es" ? "Monedas" : "Coins"}: ${run.coins}`,
      30,
      102
    );
    const shopHint = this.isNearShop() ? this.locale === "es" ? "Enter/E abre el puesto" : "Press Enter/E to open the outpost" : this.locale === "es" ? "Click o J/K/L para cavar" : "Click or J/K/L to dig";
    ctx.fillStyle = "rgba(8, 15, 24, 0.6)";
    ctx.fillRect(18, STAGE_HEIGHT - 54, 330, 34);
    ctx.fillStyle = "#f8f3cf";
    ctx.font = "13px Arial";
    ctx.fillText(shopHint, 30, STAGE_HEIGHT - 32);
    if (currentClue) {
      const clueX = currentClue.x * TILE_SIZE + TILE_SIZE * 0.5;
      const clueY = currentClue.y * TILE_SIZE + TILE_SIZE * 0.5;
      const center = playerCenter(run.player);
      const angle = Math.atan2(clueY - center.y, clueX - center.x);
      const indicatorX = STAGE_WIDTH - 54;
      const indicatorY = 60;
      ctx.fillStyle = "rgba(8, 15, 24, 0.72)";
      ctx.fillRect(STAGE_WIDTH - 192, 16, 172, 98);
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 14px Arial";
      ctx.fillText(this.locale === "es" ? "Siguiente flecha" : "Next arrow", STAGE_WIDTH - 180, 38);
      ctx.font = "13px Arial";
      ctx.fillText(
        `${this.locale === "es" ? "Pistas" : "Clues"}: ${run.currentClueIndex}/${run.clues.length}`,
        STAGE_WIDTH - 180,
        60
      );
      ctx.fillText(
        `${this.locale === "es" ? "Tesoro" : "Treasure"}: ${formatDepthLabel(this.locale, currentClue.remainingDepthMeters)}`,
        STAGE_WIDTH - 180,
        80
      );
      ctx.save();
      ctx.translate(indicatorX, indicatorY);
      ctx.rotate(angle);
      ctx.fillStyle = beaconActive ? Math.sin(performance.now() * 0.012) > 0 ? run.world.palette.beacon : "#ffffff" : "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-10, -10);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-10, 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (beaconActive) {
        ctx.fillStyle = run.world.palette.beacon;
        ctx.font = "bold 12px Arial";
        ctx.fillText(
          this.locale === "es" ? "Baliza activa" : "Beacon active",
          STAGE_WIDTH - 180,
          100
        );
      }
    } else {
      ctx.fillStyle = "rgba(8, 15, 24, 0.72)";
      ctx.fillRect(STAGE_WIDTH - 192, 16, 172, 98);
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 14px Arial";
      ctx.fillText(this.locale === "es" ? "Puerta del tesoro" : "Treasure door", STAGE_WIDTH - 180, 38);
      ctx.font = "13px Arial";
      ctx.fillText(this.locale === "es" ? "Todas las flechas descubiertas." : "All clue arrows found.", STAGE_WIDTH - 180, 60, 156);
      ctx.fillText(this.locale === "es" ? "Busca la puerta y pulsa Enter." : "Find the door and press Enter.", STAGE_WIDTH - 180, 82, 156);
    }
    if (run.messageTimer > 0 && run.message) {
      const width = 460;
      ctx.fillStyle = "rgba(5, 7, 14, 0.74)";
      ctx.fillRect((STAGE_WIDTH - width) * 0.5, 16, width, 38);
      ctx.fillStyle = "#fff8dd";
      ctx.font = "14px Arial";
      ctx.fillText(run.message, (STAGE_WIDTH - width) * 0.5 + 14, 40, width - 28);
    }
  }
  renderPauseOverlay() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(8, 12, 20, 0.54)";
    ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 40px Georgia";
    ctx.fillText(this.locale === "es" ? "Pausa" : "Paused", STAGE_WIDTH * 0.5 - 60, STAGE_HEIGHT * 0.5);
  }
  renderTreasureRoom() {
    const ctx = this.ctx;
    const run = this.run;
    const palette = run.world.palette;
    const gradient = ctx.createLinearGradient(0, 0, 0, STAGE_HEIGHT);
    gradient.addColorStop(0, "#1b1610");
    gradient.addColorStop(1, palette.chamberStone);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    for (let index = 0; index < 14; index += 1) {
      ctx.fillStyle = index % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.05)";
      ctx.fillRect(index * 74, 40 + index % 3 * 12, 58, 210);
    }
    ctx.fillStyle = palette.chamberGold;
    for (let index = 0; index < 9; index += 1) {
      ctx.beginPath();
      ctx.arc(150 + index * 78, 472 + Math.sin(index) * 6, 20 + index % 3 * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#5f4833";
    ctx.fillRect(0, treasureRoomFloorY() + 36, STAGE_WIDTH, STAGE_HEIGHT - treasureRoomFloorY() - 36);
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.fillRect(0, treasureRoomFloorY() + 36, STAGE_WIDTH, 10);
    ctx.fillStyle = "#4b3522";
    ctx.fillRect(58, 216, 58, 228);
    ctx.fillStyle = palette.treasureGlow;
    ctx.fillRect(70, 236, 34, 190);
    const chestPulse = 0.82 + Math.sin(run.treasureRoom.revealTime * 4.2) * 0.12;
    ctx.fillStyle = `rgba(255, 238, 161, ${0.22 * chestPulse})`;
    ctx.beginPath();
    ctx.arc(710, 276, 128, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#704d24";
    ctx.fillRect(646, 266, 96, 62);
    ctx.fillStyle = palette.chamberGold;
    ctx.fillRect(646, 246, 96, 30);
    ctx.fillStyle = "#2a1c10";
    ctx.fillRect(688, 284, 12, 20);
    this.renderTreasureRoomPlayer();
    ctx.fillStyle = "#f6f3e3";
    ctx.font = "700 20px Georgia";
    ctx.fillText(getWorldText(run.world, this.locale, "treasureName"), 46, 72);
    ctx.font = "14px Arial";
    ctx.fillText(
      this.locale === "es" ? "Avanza hasta el cofre y pulsa Enter para canjear el tesoro." : "Walk to the chest and press Enter to claim the treasure.",
      46,
      98,
      420
    );
  }
  renderTreasureRoomPlayer() {
    const ctx = this.ctx;
    const room = this.run.treasureRoom;
    const px = room.playerX;
    const py = room.playerY - 44;
    ctx.strokeStyle = "#101d27";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(px + 12, py + 8, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px + 12, py + 17);
    ctx.lineTo(px + 12, py + 33);
    ctx.lineTo(px + 4, py + 45);
    ctx.moveTo(px + 12, py + 33);
    ctx.lineTo(px + 20, py + 45);
    ctx.moveTo(px + 12, py + 22);
    ctx.lineTo(px + 22, py + 25);
    ctx.moveTo(px + 12, py + 22);
    ctx.lineTo(px + 4, py + 28);
    ctx.stroke();
    ctx.fillStyle = "#f7e8ca";
    ctx.beginPath();
    ctx.arc(px + 12, py + 8, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  renderEndingOverlay() {
    const ctx = this.ctx;
    const run = this.run;
    const t = clamp(run.endingTime / 3.5, 0, 1);
    ctx.fillStyle = `rgba(4, 7, 16, ${0.45 + t * 0.3})`;
    ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    const centerX = STAGE_WIDTH * 0.5;
    const centerY = STAGE_HEIGHT * 0.45;
    for (let index = 0; index < 12; index += 1) {
      const angle = Math.PI * 2 * index / 12 + run.endingTime * 0.2;
      const radius = 90 + Math.sin(run.endingTime * 3 + index) * 20;
      ctx.strokeStyle = `rgba(255, 229, 156, ${0.16 + 0.08 * Math.sin(run.endingTime * 5 + index)})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(15, 21, 33, 0.82)";
    ctx.fillRect(170, 118, STAGE_WIDTH - 340, STAGE_HEIGHT - 210);
    ctx.strokeStyle = run.world.palette.treasureGlow;
    ctx.lineWidth = 2;
    ctx.strokeRect(170, 118, STAGE_WIDTH - 340, STAGE_HEIGHT - 210);
    ctx.fillStyle = "#fff6d7";
    ctx.font = "700 42px Georgia";
    ctx.fillText(this.locale === "es" ? "Tesoro reclamado" : "Treasure claimed", 248, 186);
    ctx.font = "16px Arial";
    ctx.fillText(getWorldText(run.world, this.locale, "treasureName"), 248, 218);
    ctx.fillText(
      this.locale === "es" ? "La expedicion termina con una extraccion limpia y una celebracion final." : "The expedition ends with a clean extraction and a full treasure celebration.",
      248,
      246,
      470
    );
    const depthMeters = Math.max(0, (feetRowFromPlayer(run.player) - SURFACE_ROW) * METERS_PER_ROW);
    const totalInventoryValue = Object.entries(run.inventory).reduce((total, [materialId, qty]) => {
      const material = run.materialsById[materialId];
      return total + (material?.value ?? 0) * qty;
    }, 0);
    ctx.font = "700 18px Arial";
    ctx.fillText(this.locale === "es" ? "Resumen final" : "Final summary", 248, 286);
    ctx.font = "15px Arial";
    ctx.fillText(
      `${this.locale === "es" ? "Profundidad maxima" : "Best depth"}: ${formatDepthLabel(this.locale, run.bestDepthMeters || depthMeters)}`,
      248,
      324
    );
    ctx.fillText(
      `${this.locale === "es" ? "Bloques excavados" : "Blocks dug"}: ${run.blocksDug}`,
      248,
      352
    );
    ctx.fillText(
      `${this.locale === "es" ? "Monedas acumuladas" : "Coins earned"}: ${run.coins + totalInventoryValue}`,
      248,
      380
    );
    ctx.fillText(
      `${this.locale === "es" ? "Flechas encontradas" : "Arrows found"}: ${run.clues.length}/${run.clues.length}`,
      248,
      408
    );
  }
  buildSnapshot() {
    const cards = makeWorldCards(this.locale, this.progress);
    const world = this.run?.world ?? getWorldConfig(this.selectedWorldId);
    const run = this.run;
    const inventoryRows = run ? Object.entries(run.inventory).map(([materialId, qty]) => {
      const material = run.materialsById[materialId];
      return {
        id: materialId,
        label: materialLabel(material, this.locale),
        rarity: material.rarity,
        rarityLabel: getRarityLabel(this.locale, material.rarity),
        qty,
        value: material.value
      };
    }).sort((a, b) => b.value - a.value) : [];
    const depthMeters = run ? Math.max(0, (feetRowFromPlayer(run.player) - SURFACE_ROW) * METERS_PER_ROW) : 0;
    const currentClue = run?.clues?.[run.currentClueIndex] ?? null;
    const player = run?.player ? {
      x: round(run.player.x),
      y: round(run.player.y),
      vx: round(run.player.vx),
      vy: round(run.player.vy),
      facing: run.player.facing,
      onGround: run.player.onGround,
      jetpacking: run.player.jetpacking
    } : null;
    const beaconAngleDeg = currentClue && run ? round(
      Math.atan2(
        currentClue.y * TILE_SIZE + TILE_SIZE * 0.5 - playerCenter(run.player).y,
        currentClue.x * TILE_SIZE + TILE_SIZE * 0.5 - playerCenter(run.player).x
      ) * 180 / Math.PI
    ) : 0;
    return {
      mode: "arcade-dig-hole-treasure",
      screen: this.screen,
      playState: this.playState,
      locale: this.locale,
      coordinates: "origin_top_left_x_right_y_down_pixels",
      selectedWorldId: this.selectedWorldId,
      worldName: getWorldText(world, this.locale, "title"),
      worldSubtitle: getWorldText(world, this.locale, "subtitle"),
      shopName: getWorldText(world, this.locale, "shopName"),
      treasureName: getWorldText(world, this.locale, "treasureName"),
      surfaceLabel: getWorldText(world, this.locale, "surfaceLabel"),
      worldCards: cards,
      player,
      fullscreen: this.fullscreen,
      depthMeters: round(depthMeters),
      depthLabel: formatDepthLabel(this.locale, depthMeters),
      bestDepthMeters: round(run?.bestDepthMeters ?? 0),
      blocksDug: run?.blocksDug ?? 0,
      coins: run?.coins ?? 0,
      inventoryCount: run ? inventoryCount(run) : 0,
      capacity: run ? inventoryCapacity(run) : CAPACITY_VALUES[0],
      shovelLevel: run?.shovelLevel ?? 0,
      shovelSpeed: run ? round(digSpeed(run), 2) : DIG_SPEED_VALUES[0],
      cargoLevel: run?.cargoLevel ?? 0,
      torchCount: run?.torchCount ?? 3,
      torchesPlaced: run?.torches.length ?? 0,
      hasJetpack: run?.hasJetpack ?? false,
      jetpackUnlocked: (run?.bestDepthMeters ?? 0) >= JETPACK_UNLOCK_DEPTH,
      shopAvailable: this.isNearShop(),
      digTarget: run?.digAction ? {
        tx: run.digAction.tx,
        ty: run.digAction.ty,
        progress: round(run.digAction.progressMs / run.digAction.durationMs, 3),
        materialId: run.digAction.materialId
      } : null,
      currentClue: currentClue ? {
        x: currentClue.x,
        y: currentClue.y,
        revealed: currentClue.revealed,
        remainingDepthMeters: currentClue.remainingDepthMeters,
        directionX: currentClue.directionX,
        directionY: currentClue.directionY
      } : null,
      cluesFound: run?.currentClueIndex ?? 0,
      cluesTotal: run?.clues.length ?? 0,
      beaconActive: Boolean(currentClue) && (run?.clueRevealTimerMs ?? 0) > 6500,
      beaconAngleDeg,
      door: run ? {
        x: run.door.x,
        y: run.door.y,
        unlocked: run.door.unlocked,
        entered: run.door.entered,
        nearby: this.canEnterDoor()
      } : null,
      treasureCollected: run?.treasureCollected ?? false,
      inventory: inventoryRows,
      drops: run?.drops.map((drop) => ({
        materialId: drop.materialId,
        x: round(drop.x),
        y: round(drop.y)
      })) ?? [],
      shopOffers: run ? makeShopOffers(this.locale, run) : null,
      message: run?.message ?? "",
      endingTime: run?.endingTime ?? 0,
      treasureRoom: run ? {
        playerX: round(run.treasureRoom.playerX),
        playerY: round(run.treasureRoom.playerY),
        chestOpened: run.treasureRoom.chestOpened
      } : null
    };
  }
  emitSnapshot() {
    this.snapshot = this.buildSnapshot();
    this.onSnapshot?.(this.snapshot);
  }
};

// src/games/arcade/dig-hole-treasure/index.jsx
var UI = {
  es: {
    title: "Cavar el Hoyo",
    subtitle: "Excava kilometros bajo tierra, descubre minerales por rareza, vende botin en superficie y sigue las flechas hasta el tesoro.",
    start: "Empezar expedicion",
    restart: "Reiniciar mundo",
    openShop: "Abrir puesto",
    closeShop: "Cerrar puesto",
    jetpack: "Jetpack",
    fullscreen: "Pantalla completa",
    backToWorlds: "Elegir otro mundo",
    worldSelectTitle: "Escoge donde cavar",
    worldSelectCopy: "Cada mundo cambia materiales, colores, economia y el tesoro final. La piedra sigue apareciendo en cualquier profundidad, pero el resto de vetas se especializan por entorno.",
    objectiveTitle: "Objetivo",
    objectiveText: "Cava hacia abajo y en lateral, descubre las flechas de guia, vende materiales en superficie, mejora pala y capacidad, compra el jetpack y entra por la puerta del tesoro al final de la ruta.",
    loopTitle: "Bucle de partida",
    loopItems: [
      "Excava bloques cercanos con raton o con J/K/L.",
      "Recolecta materiales raros segun la profundidad del mundo activo.",
      "Cuando te llenes o necesites mejoras, vuelve al puesto.",
      "Compra velocidad de pala, capacidad, antorchas y jetpack.",
      "Busca la puerta y reclama el tesoro para terminar la run."
    ],
    controlsTitle: "Controles",
    controlsText: "A/D o flechas mueven, W/Arriba/Espacio salta, click cava, J izquierda, K abajo, L derecha, T antorcha, B jetpack, E/Enter interactua, M abre puesto, P pausa, R reinicia y F pantalla completa.",
    inventoryTitle: "Inventario",
    noInventory: "Todavia no llevas minerales.",
    cluesTitle: "Rastreo del tesoro",
    cluesCopy: "Las flechas aparecen al excavar cerca de ellas. Si te desvias demasiado, se activa una baliza luminosa parpadeante que apunta a la siguiente.",
    touchTitle: "Controles tactiles",
    marketTitle: "Puesto de superficie",
    marketCopy: "Desde aqui vendes por cantidad, compras mejoras y repostas antorchas. El jetpack se desbloquea tras cavar lo suficiente.",
    sell1: "Vender 1",
    sellAll: "Vender todo",
    sellEverything: "Vender todo el inventario",
    buy: "Comprar",
    bought: "Comprado",
    lockedJetpack: "Se desbloquea al superar cierta profundidad.",
    finishedTitle: "Expedicion completada",
    finishedCopy: "Has llegado a la sala final, canjeado el tesoro y cerrado la partida con una extraccion completa.",
    bestDepth: "Profundidad maxima",
    clueProgress: "Flechas encontradas",
    cargo: "Carga",
    coins: "Monedas",
    depth: "Profundidad actual",
    torchs: "Antorchas",
    shovel: "Pala",
    capacity: "Capacidad",
    door: "Puerta del tesoro"
  },
  en: {
    title: "Dig the Hole",
    subtitle: "Dig kilometers underground, discover depth-based minerals, sell loot at the surface, and follow the clue arrows to the treasure.",
    start: "Start expedition",
    restart: "Restart world",
    openShop: "Open outpost",
    closeShop: "Close outpost",
    jetpack: "Jetpack",
    fullscreen: "Fullscreen",
    backToWorlds: "Choose another world",
    worldSelectTitle: "Choose where to dig",
    worldSelectCopy: "Each world changes materials, color direction, economy, and the final treasure. Stone can still appear at any depth, while every other vein shifts with the environment.",
    objectiveTitle: "Objective",
    objectiveText: "Dig downward and sideways, uncover the guide arrows, sell materials on the surface, upgrade shovel speed and capacity, buy the jetpack, and enter the treasure door at the end of the route.",
    loopTitle: "Gameplay loop",
    loopItems: [
      "Dig nearby blocks with the mouse or with J/K/L.",
      "Collect rarer minerals as you go deeper into the active world.",
      "When your cargo is full or you need upgrades, return to the outpost.",
      "Buy shovel speed, capacity, torches, and the jetpack.",
      "Find the final door and claim the treasure to finish the run."
    ],
    controlsTitle: "Controls",
    controlsText: "A/D or arrows move, W/Up/Space jumps, click digs, J left, K down, L right, T torch, B jetpack, E/Enter interact, M opens outpost, P pauses, R restarts, F fullscreen.",
    inventoryTitle: "Inventory",
    noInventory: "No minerals collected yet.",
    cluesTitle: "Treasure tracking",
    cluesCopy: "Arrow markers appear when you dig near them. If you drift away for too long, a blinking luminous beacon points toward the next clue.",
    touchTitle: "Touch controls",
    marketTitle: "Surface outpost",
    marketCopy: "Sell specific quantities, buy upgrades, and refill torches here. The jetpack unlocks once you have dug deep enough.",
    sell1: "Sell 1",
    sellAll: "Sell all",
    sellEverything: "Sell entire inventory",
    buy: "Buy",
    bought: "Owned",
    lockedJetpack: "Unlocks after reaching enough depth.",
    finishedTitle: "Expedition complete",
    finishedCopy: "You reached the final chamber, claimed the treasure, and closed the run with a full extraction.",
    bestDepth: "Best depth",
    clueProgress: "Arrows found",
    cargo: "Cargo",
    coins: "Coins",
    depth: "Current depth",
    torchs: "Torches",
    shovel: "Shovel",
    capacity: "Capacity",
    door: "Treasure door"
  }
};
var DEFAULT_SNAPSHOT = {
  mode: "arcade-dig-hole-treasure",
  screen: "world_select",
  playState: "idle",
  locale: "en",
  selectedWorldId: "jungle",
  worldCards: [],
  worldName: "",
  worldSubtitle: "",
  treasureName: "",
  depthLabel: "0 m",
  bestDepthMeters: 0,
  depthMeters: 0,
  coins: 0,
  inventoryCount: 0,
  capacity: 18,
  shovelLevel: 0,
  shovelSpeed: 1,
  cargoLevel: 0,
  torchCount: 3,
  torchesPlaced: 0,
  hasJetpack: false,
  jetpackUnlocked: false,
  shopAvailable: false,
  cluesFound: 0,
  cluesTotal: 0,
  beaconActive: false,
  currentClue: null,
  inventory: [],
  shopOffers: null,
  door: null,
  message: "",
  player: null,
  treasureCollected: false
};
function formatMeters(locale, value) {
  if (value >= 1e3) {
    return `${(value / 1e3).toFixed(2)} km`;
  }
  return `${Math.round(value)} ${locale === "es" ? "m" : "m"}`;
}
function DigHoleTreasureGame() {
  const locale = (0, import_react2.useMemo)(() => resolveBrowserLanguage() === "es" ? "es" : "en", []);
  const copy = UI[locale] ?? UI.en;
  const canvasRef = (0, import_react2.useRef)(null);
  const shellRef = (0, import_react2.useRef)(null);
  const runtimeRef = (0, import_react2.useRef)(null);
  const [snapshot, setSnapshot] = (0, import_react2.useState)({ ...DEFAULT_SNAPSHOT, locale });
  const requestFullscreen = (0, import_react2.useCallback)(async () => {
    const root = shellRef.current;
    if (!root) {
      return;
    }
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      } else if (root.requestFullscreen) {
        await root.requestFullscreen();
      } else if (root.webkitRequestFullscreen) {
        root.webkitRequestFullscreen();
      }
    } catch {
    }
  }, []);
  (0, import_react2.useEffect)(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return void 0;
    }
    const runtime = new DigHoleRuntime({
      canvas,
      locale,
      onSnapshot: setSnapshot,
      onFullscreenRequest: requestFullscreen
    });
    runtimeRef.current = runtime;
    runtime.start();
    return () => {
      runtime.destroy();
      runtimeRef.current = null;
    };
  }, [locale, requestFullscreen]);
  (0, import_react2.useEffect)(() => {
    const onFullscreen = () => {
      runtimeRef.current?.setFullscreenState(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("webkitfullscreenchange", onFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("webkitfullscreenchange", onFullscreen);
    };
  }, []);
  const buildTextPayload = (0, import_react2.useCallback)(
    (state) => ({
      mode: state.mode,
      screen: state.screen,
      playState: state.playState,
      locale: state.locale,
      worldId: state.selectedWorldId,
      worldName: state.worldName,
      treasureName: state.treasureName,
      coordinates: state.coordinates,
      depthMeters: state.depthMeters,
      bestDepthMeters: state.bestDepthMeters,
      coins: state.coins,
      inventoryCount: state.inventoryCount,
      capacity: state.capacity,
      shovelLevel: state.shovelLevel,
      shovelSpeed: state.shovelSpeed,
      cargoLevel: state.cargoLevel,
      torchCount: state.torchCount,
      hasJetpack: state.hasJetpack,
      jetpackUnlocked: state.jetpackUnlocked,
      shopAvailable: state.shopAvailable,
      cluesFound: state.cluesFound,
      cluesTotal: state.cluesTotal,
      beaconActive: state.beaconActive,
      beaconAngleDeg: state.beaconAngleDeg,
      currentClue: state.currentClue,
      door: state.door,
      player: state.player,
      digTarget: state.digTarget,
      inventory: state.inventory,
      drops: state.drops,
      message: state.message,
      treasureCollected: state.treasureCollected,
      treasureRoom: state.treasureRoom
    }),
    []
  );
  const advanceTime = (0, import_react2.useCallback)((ms) => runtimeRef.current?.advanceTime(ms), []);
  useGameRuntimeBridge(snapshot, buildTextPayload, advanceTime);
  const selectedWorldCard = (0, import_react2.useMemo)(
    () => snapshot.worldCards.find((card) => card.id === snapshot.selectedWorldId) ?? snapshot.worldCards[0] ?? null,
    [snapshot.selectedWorldId, snapshot.worldCards]
  );
  const holdControl = (0, import_react2.useCallback)(
    (control) => ({
      onMouseDown: () => runtimeRef.current?.setVirtualControl(control, true),
      onMouseUp: () => runtimeRef.current?.setVirtualControl(control, false),
      onMouseLeave: () => runtimeRef.current?.setVirtualControl(control, false),
      onTouchStart: (event) => {
        event.preventDefault();
        runtimeRef.current?.setVirtualControl(control, true);
      },
      onTouchEnd: (event) => {
        event.preventDefault();
        runtimeRef.current?.setVirtualControl(control, false);
      },
      onTouchCancel: () => runtimeRef.current?.setVirtualControl(control, false)
    }),
    []
  );
  const tapControl = (0, import_react2.useCallback)(
    (control) => ({
      onClick: () => runtimeRef.current?.setVirtualControl(control, true),
      onTouchStart: (event) => {
        event.preventDefault();
        runtimeRef.current?.setVirtualControl(control, true);
      }
    }),
    []
  );
  return /* @__PURE__ */ import_react2.default.createElement("section", { className: "mini-game dig-hole-game", ref: shellRef }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "mini-head dig-hole-head" }, /* @__PURE__ */ import_react2.default.createElement("div", null, /* @__PURE__ */ import_react2.default.createElement("h4", null, copy.title), /* @__PURE__ */ import_react2.default.createElement("p", null, copy.subtitle)), /* @__PURE__ */ import_react2.default.createElement("div", { className: "dig-hole-actions" }, /* @__PURE__ */ import_react2.default.createElement("button", { id: "dig-hole-start", type: "button", onClick: () => runtimeRef.current?.startRun(snapshot.selectedWorldId) }, copy.start), /* @__PURE__ */ import_react2.default.createElement("button", { id: "dig-hole-open-shop", type: "button", onClick: () => runtimeRef.current?.openShop(), disabled: !snapshot.shopAvailable }, copy.openShop), /* @__PURE__ */ import_react2.default.createElement("button", { id: "dig-hole-jetpack", type: "button", onClick: () => runtimeRef.current?.useJetpack(), disabled: !snapshot.hasJetpack }, copy.jetpack), /* @__PURE__ */ import_react2.default.createElement("button", { id: "dig-hole-restart", type: "button", onClick: () => runtimeRef.current?.restart() }, copy.restart), /* @__PURE__ */ import_react2.default.createElement("button", { id: "dig-hole-fullscreen", type: "button", onClick: requestFullscreen }, copy.fullscreen))), /* @__PURE__ */ import_react2.default.createElement("div", { className: "dig-hole-layout" }, /* @__PURE__ */ import_react2.default.createElement("aside", { className: "dig-hole-panel dig-hole-panel-left" }, /* @__PURE__ */ import_react2.default.createElement("section", null, /* @__PURE__ */ import_react2.default.createElement("h5", null, copy.objectiveTitle), /* @__PURE__ */ import_react2.default.createElement("p", null, copy.objectiveText)), /* @__PURE__ */ import_react2.default.createElement("section", { className: "dig-hole-stat-grid" }, /* @__PURE__ */ import_react2.default.createElement("article", null, /* @__PURE__ */ import_react2.default.createElement("span", null, copy.depth), /* @__PURE__ */ import_react2.default.createElement("strong", null, snapshot.depthLabel)), /* @__PURE__ */ import_react2.default.createElement("article", null, /* @__PURE__ */ import_react2.default.createElement("span", null, copy.bestDepth), /* @__PURE__ */ import_react2.default.createElement("strong", null, formatMeters(locale, snapshot.bestDepthMeters))), /* @__PURE__ */ import_react2.default.createElement("article", null, /* @__PURE__ */ import_react2.default.createElement("span", null, copy.coins), /* @__PURE__ */ import_react2.default.createElement("strong", null, snapshot.coins)), /* @__PURE__ */ import_react2.default.createElement("article", null, /* @__PURE__ */ import_react2.default.createElement("span", null, copy.cargo), /* @__PURE__ */ import_react2.default.createElement("strong", null, snapshot.inventoryCount, "/", snapshot.capacity)), /* @__PURE__ */ import_react2.default.createElement("article", null, /* @__PURE__ */ import_react2.default.createElement("span", null, copy.torchs), /* @__PURE__ */ import_react2.default.createElement("strong", null, snapshot.torchCount)), /* @__PURE__ */ import_react2.default.createElement("article", null, /* @__PURE__ */ import_react2.default.createElement("span", null, copy.clueProgress), /* @__PURE__ */ import_react2.default.createElement("strong", null, snapshot.cluesFound, "/", snapshot.cluesTotal))), /* @__PURE__ */ import_react2.default.createElement("section", null, /* @__PURE__ */ import_react2.default.createElement("h5", null, copy.loopTitle), /* @__PURE__ */ import_react2.default.createElement("ul", { className: "dig-hole-list" }, copy.loopItems.map((item) => /* @__PURE__ */ import_react2.default.createElement("li", { key: item }, item)))), /* @__PURE__ */ import_react2.default.createElement("section", null, /* @__PURE__ */ import_react2.default.createElement("h5", null, copy.cluesTitle), /* @__PURE__ */ import_react2.default.createElement("p", null, copy.cluesCopy), /* @__PURE__ */ import_react2.default.createElement("div", { className: "dig-hole-clue-card" }, /* @__PURE__ */ import_react2.default.createElement("strong", null, snapshot.currentClue ? `${snapshot.currentClue.remainingDepthMeters} m` : copy.door), /* @__PURE__ */ import_react2.default.createElement("p", null, snapshot.beaconActive ? "Beacon ON" : "Beacon OFF"))), /* @__PURE__ */ import_react2.default.createElement("section", null, /* @__PURE__ */ import_react2.default.createElement("h5", null, copy.controlsTitle), /* @__PURE__ */ import_react2.default.createElement("p", null, copy.controlsText))), /* @__PURE__ */ import_react2.default.createElement("div", { className: "dig-hole-stage-column" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "dig-hole-canvas-shell" }, /* @__PURE__ */ import_react2.default.createElement(
    "canvas",
    {
      ref: canvasRef,
      className: "dig-hole-canvas",
      width: STAGE_WIDTH,
      height: STAGE_HEIGHT,
      "aria-label": "Dig the Hole canvas"
    }
  ), snapshot.screen === "world_select" && selectedWorldCard ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "dig-hole-overlay" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "dig-hole-overlay-card dig-hole-world-select" }, /* @__PURE__ */ import_react2.default.createElement("p", { className: "dig-hole-eyebrow" }, copy.worldSelectTitle), /* @__PURE__ */ import_react2.default.createElement("h5", null, selectedWorldCard.title), /* @__PURE__ */ import_react2.default.createElement("p", null, copy.worldSelectCopy), /* @__PURE__ */ import_react2.default.createElement("div", { className: "dig-hole-world-grid" }, snapshot.worldCards.map((card) => /* @__PURE__ */ import_react2.default.createElement(
    "button",
    {
      id: `dig-hole-world-${card.id}`,
      key: card.id,
      type: "button",
      className: card.id === snapshot.selectedWorldId ? "active" : "",
      onClick: () => runtimeRef.current?.selectWorld(card.id)
    },
    /* @__PURE__ */ import_react2.default.createElement("strong", null, card.title),
    /* @__PURE__ */ import_react2.default.createElement("span", null, card.completed ? "Completed" : "Ready"),
    /* @__PURE__ */ import_react2.default.createElement("em", null, formatMeters(locale, card.bestDepthMeters))
  ))), /* @__PURE__ */ import_react2.default.createElement("ul", { className: "dig-hole-list" }, selectedWorldCard.mineralsPitch.map((item) => /* @__PURE__ */ import_react2.default.createElement("li", { key: item }, item))), /* @__PURE__ */ import_react2.default.createElement("div", { className: "dig-hole-overlay-actions" }, /* @__PURE__ */ import_react2.default.createElement("button", { id: "dig-hole-overlay-start", type: "button", onClick: () => runtimeRef.current?.startRun(snapshot.selectedWorldId) }, copy.start)))) : null, snapshot.screen === "shop" ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "dig-hole-overlay" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "dig-hole-overlay-card dig-hole-market" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "dig-hole-market-header" }, /* @__PURE__ */ import_react2.default.createElement("div", null, /* @__PURE__ */ import_react2.default.createElement("p", { className: "dig-hole-eyebrow" }, copy.marketTitle), /* @__PURE__ */ import_react2.default.createElement("h5", null, snapshot.shopName), /* @__PURE__ */ import_react2.default.createElement("p", null, copy.marketCopy)), /* @__PURE__ */ import_react2.default.createElement("button", { id: "dig-hole-close-shop", type: "button", onClick: () => runtimeRef.current?.closeShop() }, copy.closeShop)), /* @__PURE__ */ import_react2.default.createElement("div", { className: "dig-hole-market-grid" }, /* @__PURE__ */ import_react2.default.createElement("section", null, /* @__PURE__ */ import_react2.default.createElement("h6", null, copy.inventoryTitle), snapshot.inventory.length === 0 ? /* @__PURE__ */ import_react2.default.createElement("p", { className: "dig-hole-empty" }, copy.noInventory) : /* @__PURE__ */ import_react2.default.createElement("div", { className: "dig-hole-inventory-list" }, snapshot.inventory.map((item) => /* @__PURE__ */ import_react2.default.createElement("article", { key: item.id }, /* @__PURE__ */ import_react2.default.createElement("div", null, /* @__PURE__ */ import_react2.default.createElement("strong", null, item.label), /* @__PURE__ */ import_react2.default.createElement("span", null, item.rarityLabel)), /* @__PURE__ */ import_react2.default.createElement("p", null, "x", item.qty, " | ", item.value), /* @__PURE__ */ import_react2.default.createElement("div", { className: "dig-hole-inline-actions" }, /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", onClick: () => runtimeRef.current?.sellMaterial(item.id, 1) }, copy.sell1), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", onClick: () => runtimeRef.current?.sellMaterial(item.id, item.qty) }, copy.sellAll))))), /* @__PURE__ */ import_react2.default.createElement("button", { id: "dig-hole-sell-all", type: "button", onClick: () => runtimeRef.current?.sellAllMaterials() }, copy.sellEverything)), /* @__PURE__ */ import_react2.default.createElement("section", null, /* @__PURE__ */ import_react2.default.createElement("h6", null, copy.marketTitle), /* @__PURE__ */ import_react2.default.createElement("div", { className: "dig-hole-offer-list" }, snapshot.shopOffers ? Object.values(snapshot.shopOffers).map((offer) => /* @__PURE__ */ import_react2.default.createElement("article", { key: offer.key }, /* @__PURE__ */ import_react2.default.createElement("strong", null, offer.label), "level" in offer ? /* @__PURE__ */ import_react2.default.createElement("p", null, "Lv ", offer.level) : null, offer.nextCost != null ? /* @__PURE__ */ import_react2.default.createElement("p", null, offer.nextCost, " coins") : /* @__PURE__ */ import_react2.default.createElement("p", null, copy.bought), offer.key === "jetpack" && !offer.unlocked ? /* @__PURE__ */ import_react2.default.createElement("p", null, copy.lockedJetpack) : null, /* @__PURE__ */ import_react2.default.createElement(
    "button",
    {
      id: `dig-hole-buy-${offer.key}`,
      type: "button",
      onClick: () => runtimeRef.current?.purchaseOffer(offer.key),
      disabled: offer.key === "jetpack" ? !(offer.canBuy || offer.owned) : !offer.canBuy
    },
    offer.owned ? copy.bought : copy.buy
  ))) : null))))) : null, snapshot.screen === "ending" ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "dig-hole-overlay" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "dig-hole-overlay-card" }, /* @__PURE__ */ import_react2.default.createElement("p", { className: "dig-hole-eyebrow" }, copy.finishedTitle), /* @__PURE__ */ import_react2.default.createElement("h5", null, snapshot.treasureName), /* @__PURE__ */ import_react2.default.createElement("p", null, copy.finishedCopy), /* @__PURE__ */ import_react2.default.createElement("div", { className: "dig-hole-finish-stats" }, /* @__PURE__ */ import_react2.default.createElement("span", null, copy.bestDepth, ": ", formatMeters(locale, snapshot.bestDepthMeters)), /* @__PURE__ */ import_react2.default.createElement("span", null, copy.clueProgress, ": ", snapshot.cluesFound, "/", snapshot.cluesTotal), /* @__PURE__ */ import_react2.default.createElement("span", null, copy.coins, ": ", snapshot.coins)), /* @__PURE__ */ import_react2.default.createElement("div", { className: "dig-hole-overlay-actions" }, /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", onClick: () => runtimeRef.current?.restart() }, copy.restart), /* @__PURE__ */ import_react2.default.createElement("button", { id: "dig-hole-return-select", type: "button", onClick: () => runtimeRef.current?.returnToWorldSelect() }, copy.backToWorlds)))) : null), /* @__PURE__ */ import_react2.default.createElement("div", { className: "dig-hole-touch", role: "group", "aria-label": copy.touchTitle }, /* @__PURE__ */ import_react2.default.createElement("h6", null, copy.touchTitle), /* @__PURE__ */ import_react2.default.createElement("div", { className: "dig-hole-touch-grid" }, /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", ...holdControl("left") }, "Left"), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", ...tapControl("jump") }, "Jump"), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", ...holdControl("right") }, "Right"), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", ...tapControl("digLeft") }, "Dig L"), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", ...tapControl("digDown") }, "Dig D"), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", ...tapControl("digRight") }, "Dig R"), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", ...tapControl("torch") }, "Torch"), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", ...tapControl("jetpack") }, "Jetpack"), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", ...tapControl("interact") }, "Use")))), /* @__PURE__ */ import_react2.default.createElement("aside", { className: "dig-hole-panel dig-hole-panel-right" }, /* @__PURE__ */ import_react2.default.createElement("section", null, /* @__PURE__ */ import_react2.default.createElement("h5", null, copy.inventoryTitle), snapshot.inventory.length === 0 ? /* @__PURE__ */ import_react2.default.createElement("p", { className: "dig-hole-empty" }, copy.noInventory) : /* @__PURE__ */ import_react2.default.createElement("div", { className: "dig-hole-side-inventory" }, snapshot.inventory.map((item) => /* @__PURE__ */ import_react2.default.createElement("article", { key: `${item.id}-side` }, /* @__PURE__ */ import_react2.default.createElement("strong", null, item.label), /* @__PURE__ */ import_react2.default.createElement("span", null, "x", item.qty), /* @__PURE__ */ import_react2.default.createElement("em", null, item.rarityLabel))))), /* @__PURE__ */ import_react2.default.createElement("section", null, /* @__PURE__ */ import_react2.default.createElement("h5", null, copy.marketTitle), /* @__PURE__ */ import_react2.default.createElement("div", { className: "dig-hole-chip-grid" }, /* @__PURE__ */ import_react2.default.createElement("span", null, copy.shovel, ": Lv ", snapshot.shovelLevel), /* @__PURE__ */ import_react2.default.createElement("span", null, copy.capacity, ": Lv ", snapshot.cargoLevel), /* @__PURE__ */ import_react2.default.createElement("span", null, copy.torchs, ": ", snapshot.torchCount), /* @__PURE__ */ import_react2.default.createElement("span", null, copy.jetpack, ": ", snapshot.hasJetpack ? "ON" : "OFF"))), /* @__PURE__ */ import_react2.default.createElement("section", null, /* @__PURE__ */ import_react2.default.createElement("h5", null, selectedWorldCard?.title ?? snapshot.worldName), /* @__PURE__ */ import_react2.default.createElement("p", null, selectedWorldCard?.subtitle ?? snapshot.worldSubtitle), selectedWorldCard ? /* @__PURE__ */ import_react2.default.createElement("ul", { className: "dig-hole-list" }, selectedWorldCard.mineralsPitch.map((item) => /* @__PURE__ */ import_react2.default.createElement("li", { key: `${selectedWorldCard.id}-${item}` }, item))) : null))));
}
export {
  DigHoleTreasureGame as default
};
/*! Bundled license information:

react/cjs/react.development.js:
  (**
   * @license React
   * react.development.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
