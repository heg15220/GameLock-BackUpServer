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
        function useState(initialState) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useState(initialState);
        }
        function useReducer(reducer, initialArg, init) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useReducer(reducer, initialArg, init);
        }
        function useRef2(initialValue) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useRef(initialValue);
        }
        function useEffect2(create, deps) {
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
        function useCallback(callback, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useCallback(callback, deps);
        }
        function useMemo(create, deps) {
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
        exports.useCallback = useCallback;
        exports.useContext = useContext;
        exports.useDebugValue = useDebugValue;
        exports.useDeferredValue = useDeferredValue;
        exports.useEffect = useEffect2;
        exports.useId = useId;
        exports.useImperativeHandle = useImperativeHandle;
        exports.useInsertionEffect = useInsertionEffect;
        exports.useLayoutEffect = useLayoutEffect;
        exports.useMemo = useMemo;
        exports.useReducer = useReducer;
        exports.useRef = useRef2;
        exports.useState = useState;
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

// src/games/arcade/ice-strike-pro/index.jsx
var import_react = __toESM(require_react(), 1);
var W = 960;
var H = 590;
var ICE_W = 430;
var SH_L = 62;
var SH_R = 368;
var SH_W = SH_R - SH_L;
var SH_MID = (SH_L + SH_R) / 2;
var HOUSE_X = SH_MID;
var HOUSE_Y = 100;
var HACK_X = SH_MID;
var HACK_Y = 530;
var HOG_Y = 440;
var BACK_Y = 36;
var DIV_Y = 315;
var TEE_Y = HOUSE_Y;
var RH = 90;
var RM = 60;
var RI = 30;
var RB = 9;
var STONE_R = 15;
var BASE_FRICTION = 60;
var CURL_K = 0.056;
var SWEEP_MULT = 0.7;
var COR = 0.91;
var BOARD_BOUNCE_X = 0.42;
var BOARD_BOUNCE_Y = 0.36;
var SHOT_CLOCK_SECONDS = 18;
var SWEEP_HEAT_GAIN = 0.42;
var SWEEP_HEAT_COOL = 0.24;
var FONT_DISPLAY = '"Rajdhani", "Trebuchet MS", "Segoe UI", sans-serif';
var FONT_BODY = '"Exo 2", "Trebuchet MS", "Segoe UI", sans-serif';
var ENDS = 6;
var SHOTS_PER_TEAM = 4;
var ICE_CONDITIONS = {
  pebbled: { label: "Pebbled", frictionMult: 1, curlMult: 1, color: "#4a9eff" },
  fast: { label: "Fast Ice", frictionMult: 0.82, curlMult: 0.85, color: "#28e0a0" },
  slow: { label: "Slow Ice", frictionMult: 1.22, curlMult: 1.18, color: "#f0a030" }
};
var ICE_COND_KEYS = ["pebbled", "fast", "slow"];
var STRATEGIES = {
  draw: { label: "Draw", key: "1", powerBias: 0.46, color: "#38c8f0", desc: "Aim to button" },
  guard: { label: "Guard", key: "2", powerBias: 0.42, color: "#40e080", desc: "Front of house" },
  takeout: { label: "Takeout", key: "3", powerBias: 0.82, color: "#f05050", desc: "Remove opponent" },
  raise: { label: "Raise", key: "4", powerBias: 0.68, color: "#f0c030", desc: "Promote own stone" }
};
var CLR = {
  bg: "#04080f",
  // Ice sheet
  iceTop: "#c2dbee",
  iceMid: "#d4ecf8",
  iceBot: "#c8e4f2",
  iceEdge: "#6a96b0",
  boardA: "#1a2c42",
  boardB: "#243550",
  boardLine: "#304a68",
  // Lines on ice
  hog: "rgba(200,32,32,0.80)",
  tee: "rgba(40,100,180,0.60)",
  centre: "rgba(40,100,180,0.28)",
  divLine: "rgba(40,100,180,0.22)",
  // House rings (curling standard)
  ring12: "rgba(204,28,28,0.88)",
  // red 12-foot
  ring8: "rgba(240,244,255,0.94)",
  // white 8-foot
  ring4: "rgba(28,80,188,0.90)",
  // blue 4-foot
  ringBtn: "rgba(240,244,255,0.96)",
  // white button
  // Panel
  panelBg: "#050911",
  panelBdr: "rgba(50,100,190,0.28)",
  accent: "#4a9eff",
  // Teams
  playerCol: "#e03030",
  playerEdge: "#ff8080",
  aiCol: "#d4a800",
  aiEdge: "#ffe060",
  // Misc
  sweepIce: "#c0ddf0",
  trajDraw: "rgba(68,200,248,0.50)",
  trajTakeout: "rgba(240,80,80,0.50)",
  trajGuard: "rgba(60,224,128,0.50)",
  trajRaise: "rgba(240,192,48,0.50)"
};
var PEBBLES = (() => {
  const pb = [];
  for (let i = 0; i < 280; i++) {
    pb.push({
      x: SH_L + Math.random() * SH_W,
      y: BACK_Y + Math.random() * (HACK_Y - BACK_Y + 30),
      r: 0.5 + Math.random() * 1.6,
      a: 0.08 + Math.random() * 0.18
    });
  }
  return pb;
})();
var SCRATCHES = (() => {
  const sc = [];
  for (let i = 0; i < 18; i++) {
    const x1 = SH_L + Math.random() * SH_W;
    const y1 = BACK_Y + Math.random() * (HACK_Y - BACK_Y);
    const len = 30 + Math.random() * 80;
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * 0.4;
    sc.push({
      x1,
      y1,
      x2: x1 + Math.cos(ang) * len,
      y2: y1 + Math.sin(ang) * len,
      a: 0.04 + Math.random() * 0.08
    });
  }
  return sc;
})();
function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
function wrapDeg(v) {
  let n = (Number(v) || 0) % 360;
  if (n > 180)
    n -= 360;
  if (n < -180)
    n += 360;
  return n;
}
function angleDiffDeg(a, b) {
  return Math.abs(wrapDeg(a - b));
}
function makeStoneGrain() {
  const grain = [];
  for (let i = 0; i < 8; i++) {
    grain.push({
      a: Math.random() * Math.PI * 2,
      d: 0.28 + Math.random() * 0.58,
      r: 1 + Math.random() * 1.1,
      o: 0.18 + Math.random() * 0.18
    });
  }
  return grain;
}
function rr(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function stepStone(s, dt, sweepIntensity, frMult, curlMult) {
  const spd = Math.hypot(s.vx, s.vy);
  if (spd < 0.5) {
    s.vx = 0;
    s.vy = 0;
    return;
  }
  const sweepFactor = clamp(Number(sweepIntensity) || 0, 0, 1);
  const frictionMult = 1 - (1 - SWEEP_MULT) * sweepFactor;
  const friction = BASE_FRICTION * frMult * frictionMult;
  const ratio = Math.max(0, spd - friction * dt) / spd;
  s.vx *= ratio;
  s.vy *= ratio;
  const fwd = -s.vy;
  if (fwd > 8) {
    const curlDamp = 1 - 0.25 * sweepFactor;
    s.vx += s.rotation * CURL_K * curlMult * curlDamp * fwd * dt;
  }
  s.x += s.vx * dt;
  s.y += s.vy * dt;
}
function resolveCollisions(stones, particles) {
  for (let i = 0; i < stones.length; i++) {
    for (let j = i + 1; j < stones.length; j++) {
      const a = stones[i], b = stones[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= STONE_R * 2 || d < 1e-3)
        continue;
      const ov = (STONE_R * 2 - d) * 0.52;
      const nx = dx / d, ny = dy / d;
      a.x -= nx * ov;
      a.y -= ny * ov;
      b.x += nx * ov;
      b.y += ny * ov;
      const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rel >= 0)
        continue;
      const imp = rel * (1 + COR) * 0.5;
      a.vx += imp * nx;
      a.vy += imp * ny;
      b.vx -= imp * nx;
      b.vy -= imp * ny;
      if (particles) {
        const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
        for (let k = 0; k < 10; k++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 30 + Math.random() * 90;
          particles.push({
            x: cx,
            y: cy,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            life: 0.4 + Math.random() * 0.3,
            maxLife: 0.7,
            col: "#c8e8ff",
            r: 1.5 + Math.random() * 2
          });
        }
      }
    }
  }
}
function computeScore(stones) {
  const hc = { x: HOUSE_X, y: HOUSE_Y };
  const inHouse = stones.map((s) => ({ s, d: dist(s, hc) })).filter(({ d }) => d < RH + STONE_R * 0.5).sort((a, b) => a.d - b.d);
  if (!inHouse.length)
    return { team: null, pts: 0, closest: null };
  const winner = inHouse[0].s.team;
  let pts = 0;
  for (const { s } of inHouse) {
    if (s.team === winner)
      pts++;
    else
      break;
  }
  return { team: winner, pts, closest: inHouse[0] };
}
function planAIShot(stones, difficulty, frMult, curlMult, context = {}) {
  const hc = { x: HOUSE_X, y: HOUSE_Y };
  const all = stones.filter((s) => dist(s, hc) < RH + STONE_R);
  const pIn = all.filter((s) => s.team === "player").sort((a, b) => dist(a, hc) - dist(b, hc));
  const aIn = all.filter((s) => s.team === "ai").sort((a, b) => dist(a, hc) - dist(b, hc));
  const guards = stones.filter(
    (s) => s.y > HOUSE_Y + RH + STONE_R * 0.5 && s.y < HOG_Y - STONE_R * 0.5 && s.x > SH_L + STONE_R && s.x < SH_R - STONE_R
  ).sort((a, b) => Math.abs(a.x - SH_MID) - Math.abs(b.x - SH_MID));
  const earlyEnd = (context.delivIdx ?? 0) < 4;
  let target, powerBias, planName;
  const pLeading = pIn.length > 0 && (aIn.length === 0 || dist(pIn[0], hc) < dist(aIn[0], hc));
  const canTakeout = difficulty !== "easy" && !earlyEnd;
  if (canTakeout && pLeading) {
    target = { x: pIn[0].x, y: pIn[0].y };
    powerBias = difficulty === "hard" ? 0.84 : 0.8;
    planName = "takeout";
  } else if (guards.length > 0 && canTakeout && Math.random() > 0.45) {
    const guard = guards[0];
    target = { x: guard.x, y: guard.y - 2 };
    powerBias = difficulty === "hard" ? 0.74 : 0.69;
    planName = "clear-guard";
  } else if (aIn.length === 0) {
    const sp = difficulty === "easy" ? 36 : difficulty === "hard" ? 10 : 22;
    target = { x: HOUSE_X + (Math.random() - 0.5) * sp, y: HOUSE_Y + (Math.random() - 0.5) * sp };
    powerBias = 0.47;
    planName = "draw";
  } else if (aIn.length < 2) {
    const sp = difficulty === "easy" ? 30 : difficulty === "hard" ? 12 : 22;
    target = { x: HOUSE_X + (Math.random() - 0.5) * sp, y: HOUSE_Y + (Math.random() - 0.5) * sp };
    powerBias = 0.47;
    planName = "draw";
  } else {
    const sp = difficulty === "easy" ? 44 : difficulty === "hard" ? 16 : 30;
    target = { x: HOUSE_X + (Math.random() - 0.5) * sp, y: HOUSE_Y + RH * 0.72 };
    powerBias = 0.43;
    planName = "guard";
  }
  const rotation = target.x <= HACK_X ? 1 : -1;
  const dy = target.y - HACK_Y;
  const spd = 200 + powerBias * 280;
  const tEst = Math.abs(dy) / (spd * 0.8);
  const drift = rotation * CURL_K * curlMult * spd * tEst * tEst * 0.5;
  const aimX = target.x - drift;
  const angle = Math.atan2(dy, aimX - HACK_X);
  const eS = difficulty === "easy" ? 2.6 : difficulty === "hard" ? 0.26 : 0.9;
  const errA = (Math.random() - 0.5) * 0.07 * eS;
  const errP = (Math.random() - 0.5) * 0.1 * eS;
  return {
    vx: Math.cos(angle + errA) * spd * (1 + errP),
    vy: Math.sin(angle + errA) * spd * (1 + errP),
    rotation,
    planName,
    target,
    sweepProfile: {
      enabled: difficulty !== "easy",
      startY: HOG_Y - 34 - Math.random() * 34,
      minSpeed: 95 + Math.random() * 40,
      chance: difficulty === "hard" ? 0.9 : 0.68
    }
  };
}
var IceStrikeRuntime = class {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.vW = W;
    this.vH = H;
    this.screen = "menu";
    this.phase = "playerAim";
    this.time = 0;
    this.end = 1;
    this.delivIdx = 0;
    this.hammer = "player";
    this.scores = { player: 0, ai: 0 };
    this.endLog = [];
    this.lastResult = null;
    this.endTransitionMessage = "";
    this.scorePulse = { player: 0, ai: 0 };
    this.endTimer = 0;
    this.stones = [];
    this.flyingStone = null;
    this.particles = [];
    this.aim = { angle: -100, power: 0.5, rotation: 1 };
    this.strategy = "draw";
    this.iceCondKey = "pebbled";
    this.difficulty = "medium";
    this.aiTimer = 0;
    this.sweeping = false;
    this.sweepHeat = 0;
    this._effectiveSweep = false;
    this._dragActive = false;
    this._dragMoved = false;
    this._dragStartY = 0;
    this._dragStartPower = 0.5;
    this.shotClock = SHOT_CLOCK_SECONDS;
    this.lastRelease = null;
    this.aiLastPlan = null;
    this.keys = {};
    this.mouse = { x: W / 2, y: H / 2 };
    this._onKD = (e) => this._keyDown(e);
    this._onKU = (e) => this._keyUp(e);
    this._onMM = (e) => this._mouseMove(e);
    this._onClick = (e) => this._click(e);
    this._onMD = (e) => this._mouseDown(e);
    this._onMU = (e) => this._mouseUp(e);
    this._onResize = () => this._resize();
    this._running = false;
    this._last = 0;
    this._raf = null;
    this._frame = (ts) => this._tick(ts);
  }
  // ── Lifecycle ──────────────────────────────────────────────────────────────
  start() {
    this._running = true;
    this._resize();
    window.addEventListener("resize", this._onResize);
    window.addEventListener("keydown", this._onKD);
    window.addEventListener("keyup", this._onKU);
    this.canvas.addEventListener("mousemove", this._onMM);
    this.canvas.addEventListener("click", this._onClick);
    this.canvas.addEventListener("mousedown", this._onMD);
    this.canvas.addEventListener("mouseup", this._onMU);
    this._last = performance.now();
    this._raf = requestAnimationFrame(this._frame);
  }
  destroy() {
    this._running = false;
    if (this._raf)
      cancelAnimationFrame(this._raf);
    window.removeEventListener("resize", this._onResize);
    window.removeEventListener("keydown", this._onKD);
    window.removeEventListener("keyup", this._onKU);
    this.canvas.removeEventListener("mousemove", this._onMM);
    this.canvas.removeEventListener("click", this._onClick);
    this.canvas.removeEventListener("mousedown", this._onMD);
    this.canvas.removeEventListener("mouseup", this._onMU);
  }
  _resize() {
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || W, h = rect.height || H;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.vW = w;
    this.vH = h;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._render();
  }
  // ── Coordinate helpers ─────────────────────────────────────────────────────
  _lx(e) {
    const r = this.canvas.getBoundingClientRect();
    return (e.clientX - r.left) * (W / r.width);
  }
  _ly(e) {
    const r = this.canvas.getBoundingClientRect();
    return (e.clientY - r.top) * (H / r.height);
  }
  // ── Input ──────────────────────────────────────────────────────────────────
  _keyDown(e) {
    const { code } = e;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(code))
      e.preventDefault();
    this.keys[code] = true;
    if (e.repeat)
      return;
    if (code === "Escape") {
      this.screen = "menu";
      return;
    }
    if (this.screen === "menu" && (code === "Enter" || code === "Space")) {
      this._startGame();
      return;
    }
    if (this.screen === "gameOver" && (code === "Enter" || code === "Space" || code === "KeyR")) {
      this.screen = "menu";
      return;
    }
    if (this.screen !== "play")
      return;
    if (code === "KeyR") {
      this._startGame();
      return;
    }
    if (this.phase === "endResult" && (code === "Space" || code === "Enter" || code === "KeyN")) {
      this._nextEnd();
      return;
    }
    if (this.phase === "playerAim") {
      if (code === "KeyQ") {
        this.aim.rotation = -1;
        return;
      }
      if (code === "KeyE") {
        this.aim.rotation = 1;
        return;
      }
      if (code === "Digit1") {
        this._setStrategy("draw");
        return;
      }
      if (code === "Digit2") {
        this._setStrategy("guard");
        return;
      }
      if (code === "Digit3") {
        this._setStrategy("takeout");
        return;
      }
      if (code === "Digit4") {
        this._setStrategy("raise");
        return;
      }
      if (code === "Space" || code === "Enter") {
        this._deliver();
        return;
      }
    }
    if (this.phase === "flight") {
      if (code === "KeyS" || code === "ArrowDown") {
        this.sweeping = true;
        return;
      }
    }
  }
  _keyUp(e) {
    this.keys[e.code] = false;
    if (e.code === "KeyS" || e.code === "ArrowDown")
      this.sweeping = false;
  }
  _mouseMove(e) {
    this.mouse.x = this._lx(e);
    this.mouse.y = this._ly(e);
    if (this.phase !== "playerAim" || this.screen !== "play")
      return;
    const mx = this.mouse.x, my = this.mouse.y;
    if (mx > ICE_W)
      return;
    if (this._dragActive) {
      const delta = this._dragStartY - my;
      if (Math.abs(delta) > 3)
        this._dragMoved = true;
      this.aim.power = clamp(this._dragStartPower + delta / 200, 0, 1);
      return;
    }
    const adx = mx - HACK_X, ady = my - HACK_Y;
    if (Math.abs(adx) < 4 && Math.abs(ady) < 4)
      return;
    const ang = Math.atan2(ady, adx) * 180 / Math.PI;
    this.aim.angle = clamp(ang, -168, -12);
  }
  _mouseDown(e) {
    if (this.screen === "menu")
      return;
    if (this.phase !== "playerAim" || this.screen !== "play")
      return;
    const mx = this._lx(e), my = this._ly(e);
    if (mx > ICE_W)
      return;
    this._dragActive = true;
    this._dragMoved = false;
    this._dragStartY = my;
    this._dragStartPower = this.aim.power;
  }
  _mouseUp() {
    this._dragActive = false;
  }
  _click(e) {
    const mx = this._lx(e), my = this._ly(e);
    if (this.screen === "menu") {
      const bY = H / 2 + 8, bH = 34, bW = 90;
      const bEx = W / 2 - 148, bMx = W / 2 - 45, bHx = W / 2 + 58;
      if (my > bY && my < bY + bH) {
        if (mx > bEx && mx < bEx + bW) {
          this.difficulty = "easy";
          return;
        }
        if (mx > bMx && mx < bMx + bW) {
          this.difficulty = "medium";
          return;
        }
        if (mx > bHx && mx < bHx + bW) {
          this.difficulty = "hard";
          return;
        }
      }
      this._startGame();
      return;
    }
    if (this.screen === "gameOver") {
      this.screen = "menu";
      return;
    }
    if (this.screen !== "play")
      return;
    if (this.phase === "endResult") {
      this._nextEnd();
      return;
    }
    if (this.phase === "playerAim" && mx < ICE_W) {
      if (this._dragMoved) {
        this._dragMoved = false;
        return;
      }
      const adx = mx - HACK_X, ady = my - HACK_Y;
      if (Math.abs(adx) > 4 || Math.abs(ady) > 4) {
        const ang = Math.atan2(ady, adx) * 180 / Math.PI;
        this.aim.angle = clamp(ang, -168, -12);
      }
      this._deliver();
    }
  }
  // ── Game control ──────────────────────────────────────────────────────────
  _setStrategy(name) {
    if (name === "takeout" && this.delivIdx < 4) {
      this.strategy = "guard";
    } else {
      this.strategy = name;
    }
    const strategyName = this.strategy;
    const strat = STRATEGIES[strategyName];
    this.aim.power = strat.powerBias;
    const target = this._strategyTarget(strategyName);
    if (target) {
      const dx = target.x - HACK_X, dy = target.y - HACK_Y;
      const ang = Math.atan2(dy, dx) * 180 / Math.PI;
      this.aim.angle = clamp(ang, -168, -12);
    }
  }
  _strategyTarget(name) {
    const hc = { x: HOUSE_X, y: HOUSE_Y };
    const pIn = this.stones.filter((s) => s.team === "player" && dist(s, hc) < RH);
    const aIn = this.stones.filter((s) => s.team === "ai" && dist(s, hc) < RH);
    switch (name) {
      case "draw":
        return { x: HOUSE_X, y: HOUSE_Y };
      case "guard":
        return { x: HOUSE_X, y: HOUSE_Y + RH + STONE_R * 2 };
      case "takeout": {
        const enemy = pIn.sort((a, b) => dist(a, hc) - dist(b, hc))[0];
        return enemy ? { x: enemy.x, y: enemy.y } : { x: HOUSE_X, y: HOUSE_Y };
      }
      case "raise": {
        const own = aIn.sort((a, b) => dist(a, hc) - dist(b, hc))[0];
        return own ? { x: own.x, y: own.y } : { x: HOUSE_X, y: HOUSE_Y };
      }
      default:
        return null;
    }
  }
  get _iceCond() {
    return ICE_CONDITIONS[this.iceCondKey];
  }
  get _frMult() {
    return this._iceCond.frictionMult;
  }
  get _curlMult() {
    return this._iceCond.curlMult;
  }
  get _currentTeam() {
    return this.hammer === "player" ? this.delivIdx % 2 === 0 ? "ai" : "player" : this.delivIdx % 2 === 0 ? "player" : "ai";
  }
  _startGame() {
    this.iceCondKey = ICE_COND_KEYS[Math.floor(Math.random() * ICE_COND_KEYS.length)];
    this.end = 1;
    this.delivIdx = 0;
    this.stones = [];
    this.flyingStone = null;
    this.scores = { player: 0, ai: 0 };
    this.endLog = [];
    this.lastResult = null;
    this.endTransitionMessage = "";
    this.hammer = "player";
    this.scorePulse = { player: 0, ai: 0 };
    this.sweeping = false;
    this.sweepHeat = 0;
    this._effectiveSweep = false;
    this.particles = [];
    this._dragActive = false;
    this._dragMoved = false;
    this.aim = { angle: -100, power: 0.5, rotation: 1 };
    this.strategy = "draw";
    this.lastRelease = null;
    this.aiLastPlan = null;
    this.screen = "play";
    this.phase = this._currentTeam === "player" ? "playerAim" : "aiTurn";
    this.shotClock = this.phase === "playerAim" ? SHOT_CLOCK_SECONDS : 0;
    this.aiTimer = this.phase === "aiTurn" ? 1.4 : 0;
  }
  _deliver() {
    if (this.phase !== "playerAim")
      return;
    const target = this._strategyTarget(this.strategy) ?? { x: HOUSE_X, y: HOUSE_Y };
    const strategyBias = STRATEGIES[this.strategy]?.powerBias ?? 0.5;
    const baseAngle = this.aim.angle;
    const desiredAngle = Math.atan2(target.y - HACK_Y, target.x - HACK_X) * 180 / Math.PI;
    const angleError = angleDiffDeg(baseAngle, desiredAngle);
    const powerError = Math.abs(this.aim.power - strategyBias);
    const releaseQuality = clamp(1 - angleError / 30 - powerError * 1.35, 0, 1);
    const releaseJitter = 1 - releaseQuality;
    const releaseAngle = baseAngle + (Math.random() - 0.5) * releaseJitter * 8.5;
    const powerMod = 1 + (Math.random() - 0.5) * releaseJitter * 0.2;
    const qualityBoost = 0.92 + releaseQuality * 0.16;
    const releaseLabel = releaseQuality > 0.86 ? "Perfect release" : releaseQuality > 0.62 ? "Good release" : releaseQuality > 0.4 ? "Late release" : "Loose release";
    const spd = (200 + this.aim.power * 280) * qualityBoost * powerMod;
    const relRad = releaseAngle * Math.PI / 180;
    const s = {
      x: HACK_X,
      y: HACK_Y,
      vx: Math.cos(relRad) * spd,
      vy: Math.sin(relRad) * spd,
      rotation: this.aim.rotation,
      team: "player",
      id: `p${this.delivIdx}`,
      delivNum: this.delivIdx + 1,
      crossed_hog: false,
      trail: [],
      spinAngle: 0,
      releaseQuality,
      grain: makeStoneGrain()
    };
    this.lastRelease = {
      quality: releaseQuality,
      label: releaseLabel,
      angleError,
      powerError,
      target,
      strategy: this.strategy,
      at: this.time
    };
    this.stones.push(s);
    this.flyingStone = s;
    this.phase = "flight";
    this.sweeping = false;
    this.sweepHeat = 0;
    this._effectiveSweep = false;
    this.shotClock = 0;
    this.aiLastPlan = null;
  }
  _aiDeliver() {
    const shot = planAIShot(this.stones, this.difficulty, this._frMult, this._curlMult, {
      delivIdx: this.delivIdx,
      end: this.end,
      hammer: this.hammer
    });
    const s = {
      x: HACK_X,
      y: HACK_Y,
      vx: shot.vx,
      vy: shot.vy,
      rotation: shot.rotation,
      team: "ai",
      id: `a${this.delivIdx}`,
      delivNum: this.delivIdx + 1,
      crossed_hog: false,
      trail: [],
      spinAngle: 0,
      aiSweepProfile: shot.sweepProfile,
      aiSweepCommit: Boolean(shot.sweepProfile?.enabled && Math.random() < (shot.sweepProfile?.chance ?? 0)),
      grain: makeStoneGrain()
    };
    this.stones.push(s);
    this.flyingStone = s;
    this.phase = "flight";
    this.sweeping = false;
    this.sweepHeat = 0;
    this._effectiveSweep = false;
    this.aiLastPlan = shot.planName ?? "draw";
    this.shotClock = 0;
    this.aiTimer = 0;
  }
  _finishEnd() {
    const result = computeScore(this.stones);
    this.lastResult = result;
    if (result.team === "player") {
      this.scores.player += result.pts;
      this.scorePulse.player = 1;
    } else if (result.team === "ai") {
      this.scores.ai += result.pts;
      this.scorePulse.ai = 1;
    }
    this.endLog.push({
      player: result.team === "player" ? result.pts : 0,
      ai: result.team === "ai" ? result.pts : 0
    });
    if (result.team === "player")
      this.hammer = "ai";
    else if (result.team === "ai")
      this.hammer = "player";
    const isFinalEnd = this.end >= ENDS;
    if (result.team === "player") {
      this.endTransitionMessage = isFinalEnd ? `You score ${result.pts}. Final end complete.` : `You score ${result.pts}. Next end loading.`;
    } else if (result.team === "ai") {
      this.endTransitionMessage = isFinalEnd ? `CPU scores ${result.pts}. Final end complete.` : `CPU scores ${result.pts}. Next end loading.`;
    } else {
      this.endTransitionMessage = isFinalEnd ? "Blank end. Match complete." : "Blank end. Next end loading.";
    }
    this.phase = "endResult";
    this.endTimer = 3.8;
  }
  _nextEnd() {
    this.end++;
    if (this.end > ENDS) {
      this.screen = "gameOver";
      return;
    }
    this.iceCondKey = ICE_COND_KEYS[Math.floor(Math.random() * ICE_COND_KEYS.length)];
    this.delivIdx = 0;
    this.stones = [];
    this.flyingStone = null;
    this.lastResult = null;
    this.endTransitionMessage = "";
    this.scorePulse = { player: 0, ai: 0 };
    this.sweeping = false;
    this.sweepHeat = 0;
    this._effectiveSweep = false;
    this.particles = [];
    this.aim = { angle: -100, power: 0.5, rotation: 1 };
    this.strategy = "draw";
    this.lastRelease = null;
    this.aiLastPlan = null;
    this.phase = this._currentTeam === "player" ? "playerAim" : "aiTurn";
    this.shotClock = this.phase === "playerAim" ? SHOT_CLOCK_SECONDS : 0;
    this.aiTimer = this.phase === "aiTurn" ? 1.4 : 0;
  }
  _advanceDeliveryFlowIfReady() {
    const anyMoving = this.stones.some((s) => Math.hypot(s.vx, s.vy) > 0.5);
    if (anyMoving || this.flyingStone !== null)
      return false;
    this.delivIdx++;
    this.sweeping = false;
    this.sweepHeat = 0;
    this._effectiveSweep = false;
    if (this.delivIdx >= SHOTS_PER_TEAM * 2) {
      this._finishEnd();
      return true;
    }
    const team = this._currentTeam;
    if (team === "player") {
      this.phase = "playerAim";
      this.aim = { angle: -100, power: 0.5, rotation: 1 };
      this.strategy = "draw";
      this.shotClock = SHOT_CLOCK_SECONDS;
    } else {
      this.phase = "aiTurn";
      this.aiTimer = 0.9 + Math.random() * 0.7;
      this.shotClock = 0;
    }
    return true;
  }
  // ── Update ─────────────────────────────────────────────────────────────────
  _tick(ts) {
    if (!this._running)
      return;
    const dt = clamp((ts - this._last) / 1e3, 0, 0.05);
    this._last = ts;
    this._update(dt);
    this._render();
    this._raf = requestAnimationFrame(this._frame);
  }
  snapshot() {
    const flying = this.flyingStone;
    const preview = computeScore(this.stones);
    return {
      screen: this.screen,
      phase: this.phase,
      coordinates: {
        origin: "top-left",
        x_positive: "right",
        y_positive: "down"
      },
      end: this.end,
      ends: ENDS,
      shot: this.delivIdx + 1,
      shotsPerEnd: SHOTS_PER_TEAM * 2,
      hammer: this.hammer,
      scores: { ...this.scores },
      shotClock: Number(this.shotClock.toFixed(2)),
      sweepHeat: Number(this.sweepHeat.toFixed(3)),
      effectiveSweep: this._effectiveSweep,
      currentTeam: this._currentTeam,
      ice: {
        id: this.iceCondKey,
        label: this._iceCond.label,
        friction: this._frMult,
        curl: this._curlMult
      },
      aim: this.phase === "playerAim" ? {
        angle: Number(this.aim.angle.toFixed(2)),
        power: Number(this.aim.power.toFixed(3)),
        rotation: this.aim.rotation,
        strategy: this.strategy
      } : null,
      flyingStone: flying ? {
        team: flying.team,
        x: Number(flying.x.toFixed(2)),
        y: Number(flying.y.toFixed(2)),
        vx: Number(flying.vx.toFixed(2)),
        vy: Number(flying.vy.toFixed(2)),
        speed: Number(Math.hypot(flying.vx, flying.vy).toFixed(2))
      } : null,
      stones: this.stones.slice(0, 16).map((s) => ({
        team: s.team,
        x: Number(s.x.toFixed(1)),
        y: Number(s.y.toFixed(1)),
        moving: Math.hypot(s.vx, s.vy) > 0.5
      })),
      preview: {
        team: preview.team,
        pts: preview.pts
      },
      aiPlan: this.aiLastPlan,
      lastRelease: this.lastRelease ? {
        label: this.lastRelease.label,
        quality: Number(this.lastRelease.quality.toFixed(3)),
        strategy: this.lastRelease.strategy,
        secondsAgo: Number((this.time - this.lastRelease.at).toFixed(2))
      } : null
    };
  }
  advance(ms) {
    const totalMs = Math.max(0, Number(ms) || 0);
    if (totalMs <= 0)
      return;
    const steps = Math.max(1, Math.round(totalMs / (1e3 / 60)));
    const dt = totalMs / 1e3 / steps;
    for (let i = 0; i < steps; i++)
      this._update(dt);
    this._render();
  }
  _update(dt) {
    this.time += dt;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.88;
      p.vy *= 0.88;
      p.life -= dt;
      if (p.life <= 0)
        this.particles.splice(i, 1);
    }
    this.scorePulse.player = Math.max(0, this.scorePulse.player - dt * 1.65);
    this.scorePulse.ai = Math.max(0, this.scorePulse.ai - dt * 1.65);
    if (this.screen !== "play")
      return;
    if (this.phase === "playerAim") {
      const ANG = 44 * dt, POW = 0.52 * dt;
      if (this.keys["ArrowLeft"] || this.keys["KeyA"])
        this.aim.angle = clamp(this.aim.angle - ANG, -168, -12);
      if (this.keys["ArrowRight"] || this.keys["KeyD"])
        this.aim.angle = clamp(this.aim.angle + ANG, -168, -12);
      if (this.keys["ArrowUp"] || this.keys["KeyW"])
        this.aim.power = clamp(this.aim.power + POW, 0, 1);
      if (this.keys["ArrowDown"])
        this.aim.power = clamp(this.aim.power - POW, 0, 1);
      this.shotClock = Math.max(0, this.shotClock - dt);
      if (this.shotClock <= 0)
        this._deliver();
    }
    if (this.phase === "endResult") {
      this.endTimer -= dt;
      if (this.endTimer <= 0)
        this._nextEnd();
      return;
    }
    if (this.phase === "aiTurn") {
      this.aiTimer -= dt;
      if (this.aiTimer <= 0)
        this._aiDeliver();
      return;
    }
    if (this.phase !== "flight")
      return;
    const flying = this.flyingStone;
    if (!flying) {
      this._advanceDeliveryFlowIfReady();
      return;
    }
    const fSpd = Math.hypot(flying.vx, flying.vy);
    const aiProfile = flying.aiSweepProfile;
    const aiSweep = flying.team === "ai" && Boolean(flying.aiSweepCommit) && aiProfile?.enabled && flying.y <= (aiProfile.startY ?? HOG_Y) && fSpd >= (aiProfile.minSpeed ?? 96);
    const wantsSweep = flying.team === "player" ? this.sweeping : aiSweep;
    const effectiveSweepWindow = wantsSweep && fSpd > 42 && flying.y > BACK_Y + STONE_R * 0.7;
    if (effectiveSweepWindow) {
      const gainMul = flying.team === "player" ? 1 : 0.86;
      this.sweepHeat = clamp(this.sweepHeat + SWEEP_HEAT_GAIN * gainMul * dt, 0, 1);
    } else {
      this.sweepHeat = clamp(this.sweepHeat - SWEEP_HEAT_COOL * dt, 0, 1);
    }
    const sweepIntensity = this.sweepHeat > 0.05 ? this.sweepHeat : 0;
    this._effectiveSweep = sweepIntensity > 0.12;
    const SUBS = 4;
    for (let sub = 0; sub < SUBS; sub++) {
      const sdt = dt / SUBS;
      for (const s of this.stones) {
        if (s.vx === 0 && s.vy === 0)
          continue;
        const isFlying = s === flying;
        const stoneSweep = isFlying ? sweepIntensity : 0;
        stepStone(s, sdt, stoneSweep, this._frMult, this._curlMult);
        if (!s.crossed_hog && s.y < HOG_Y)
          s.crossed_hog = true;
        let bounced = false;
        if (s.x < SH_L + STONE_R) {
          s.x = SH_L + STONE_R;
          if (s.vx < 0) {
            s.vx = -s.vx * BOARD_BOUNCE_X;
            s.vy *= 0.985;
            bounced = true;
          }
        } else if (s.x > SH_R - STONE_R) {
          s.x = SH_R - STONE_R;
          if (s.vx > 0) {
            s.vx = -s.vx * BOARD_BOUNCE_X;
            s.vy *= 0.985;
            bounced = true;
          }
        }
        if (s.y < BACK_Y + STONE_R) {
          s.y = BACK_Y + STONE_R;
          if (s.vy < 0) {
            s.vy = -s.vy * BOARD_BOUNCE_Y;
            s.vx *= 0.97;
            bounced = true;
          }
        }
        if (bounced && this.particles && Math.hypot(s.vx, s.vy) > 24) {
          const sparks = 3 + Math.floor(Math.random() * 3);
          for (let k = 0; k < sparks; k++) {
            const ang = (Math.random() - 0.5) * Math.PI;
            const spd2 = 24 + Math.random() * 46;
            this.particles.push({
              x: s.x + (Math.random() - 0.5) * 6,
              y: s.y + STONE_R * 0.7,
              vx: Math.cos(ang) * spd2,
              vy: Math.abs(Math.sin(ang)) * spd2 * 0.55,
              life: 0.24 + Math.random() * 0.12,
              maxLife: 0.36,
              col: "rgba(200,228,255,0.9)",
              r: 1 + Math.random() * 1.3
            });
          }
        }
        const spd = Math.hypot(s.vx, s.vy);
        s.spinAngle = (s.spinAngle || 0) + s.rotation * spd * sdt * 0.04;
      }
      resolveCollisions(this.stones, this.particles);
    }
    if (this._effectiveSweep && this.flyingStone) {
      const f = this.flyingStone;
      if (Math.hypot(f.vx, f.vy) > 24) {
        for (let k = 0; k < 3; k++) {
          this.particles.push({
            x: f.x + (Math.random() - 0.5) * 22,
            y: f.y + STONE_R + Math.random() * 9,
            vx: (Math.random() - 0.5) * 28,
            vy: -6 - Math.random() * 15,
            life: 0.34,
            maxLife: 0.34,
            col: CLR.sweepIce,
            r: 1.6
          });
        }
      }
    }
    if (this.flyingStone) {
      const f = this.flyingStone;
      f.trail.push({ x: f.x, y: f.y });
      if (f.trail.length > 35)
        f.trail.shift();
    }
    for (let i = this.stones.length - 1; i >= 0; i--) {
      const s = this.stones[i];
      const spd = Math.hypot(s.vx, s.vy);
      if (spd > 0.2) {
        const hardOob = s.x < SH_L - STONE_R * 5 || s.x > SH_R + STONE_R * 5 || s.y < BACK_Y - STONE_R * 5 || s.y > HACK_Y + STONE_R * 3;
        if (hardOob) {
          if (s === this.flyingStone)
            this.flyingStone = null;
          this.stones.splice(i, 1);
        }
        continue;
      }
      const oob = s.x < SH_L + STONE_R || s.x > SH_R - STONE_R || s.y < BACK_Y || s.y > HACK_Y + 26 || !s.crossed_hog;
      if (oob) {
        if (s === this.flyingStone)
          this.flyingStone = null;
        this.stones.splice(i, 1);
      }
    }
    if (this.flyingStone && !this.stones.includes(this.flyingStone))
      this.flyingStone = null;
    if (this.flyingStone && Math.hypot(this.flyingStone.vx, this.flyingStone.vy) <= 0.5)
      this.flyingStone = null;
    this._advanceDeliveryFlowIfReady();
  }
  // ── Rendering ──────────────────────────────────────────────────────────────
  _render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.vW, this.vH);
    const sx = this.vW / W, sy = this.vH / H;
    ctx.save();
    ctx.scale(sx, sy);
    if (this.screen === "menu") {
      this._drawMenu(ctx, W, H);
      ctx.restore();
      return;
    }
    if (this.screen === "gameOver") {
      this._drawGameOver(ctx, W, H);
      ctx.restore();
      return;
    }
    this._drawIce(ctx);
    this._drawAim(ctx);
    this._drawStones(ctx);
    this._drawParticles(ctx);
    this._drawHUD(ctx);
    if (this.phase === "endResult")
      this._drawEndBanner(ctx);
    ctx.restore();
  }
  _drawIce(ctx) {
    ctx.fillStyle = CLR.bg;
    ctx.fillRect(0, 0, W, H);
    const BL = SH_L - 28, BR = SH_R + 28, BT = BACK_Y - 28, BB = HACK_Y + 38;
    const BW = BR - BL, BH = BB - BT;
    const bgr = ctx.createLinearGradient(BL, BT, BR, BB);
    bgr.addColorStop(0, CLR.boardA);
    bgr.addColorStop(1, CLR.boardB);
    ctx.fillStyle = bgr;
    ctx.beginPath();
    rr(ctx, BL, BT, BW, BH, 14);
    ctx.fill();
    ctx.strokeStyle = CLR.boardLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    rr(ctx, BL + 6, BT + 6, BW - 12, BH - 12, 10);
    ctx.stroke();
    const iceGrad = ctx.createLinearGradient(SH_L, HOUSE_Y, SH_MID, HACK_Y);
    iceGrad.addColorStop(0, CLR.iceTop);
    iceGrad.addColorStop(0.4, CLR.iceMid);
    iceGrad.addColorStop(1, CLR.iceBot);
    ctx.fillStyle = iceGrad;
    ctx.beginPath();
    rr(ctx, SH_L - 2, BACK_Y - 2, SH_W + 4, HACK_Y - BACK_Y + 24, 4);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    rr(ctx, SH_L - 2, BACK_Y - 2, SH_W + 4, HACK_Y - BACK_Y + 24, 4);
    ctx.clip();
    ctx.lineWidth = 0.7;
    for (const sc of SCRATCHES) {
      ctx.beginPath();
      ctx.moveTo(sc.x1, sc.y1);
      ctx.lineTo(sc.x2, sc.y2);
      ctx.strokeStyle = `rgba(255,255,255,${sc.a})`;
      ctx.stroke();
    }
    for (const p of PEBBLES) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${p.a})`;
      ctx.fill();
    }
    const condCol = this._iceCond.color;
    ctx.fillStyle = condCol + "12";
    ctx.fillRect(SH_L, BACK_Y, SH_W, HACK_Y - BACK_Y);
    const gl = ctx.createLinearGradient(SH_L, BACK_Y, SH_MID, HOUSE_Y + 100);
    gl.addColorStop(0, "rgba(255,255,255,0.22)");
    gl.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gl;
    ctx.fillRect(SH_L, BACK_Y, SH_W, (HACK_Y - BACK_Y) * 0.45);
    ctx.restore();
    ctx.strokeStyle = CLR.iceEdge;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(SH_L, BACK_Y - 6);
    ctx.lineTo(SH_L, HACK_Y + 22);
    ctx.moveTo(SH_R, BACK_Y - 6);
    ctx.lineTo(SH_R, HACK_Y + 22);
    ctx.stroke();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = CLR.centre;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(SH_MID, BACK_Y);
    ctx.lineTo(SH_MID, HACK_Y + 22);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = CLR.divLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(SH_L, DIV_Y);
    ctx.lineTo(SH_R, DIV_Y);
    ctx.stroke();
    ctx.strokeStyle = CLR.tee;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(SH_L, BACK_Y);
    ctx.lineTo(SH_R, BACK_Y);
    ctx.stroke();
    ctx.strokeStyle = CLR.tee;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(SH_L, TEE_Y);
    ctx.lineTo(SH_R, TEE_Y);
    ctx.stroke();
    ctx.strokeStyle = CLR.hog;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(SH_L, HOG_Y);
    ctx.lineTo(SH_R, HOG_Y);
    ctx.stroke();
    const houseCtx = ctx;
    houseCtx.beginPath();
    houseCtx.arc(HOUSE_X, HOUSE_Y, RH, 0, Math.PI * 2);
    houseCtx.fillStyle = CLR.ring12;
    houseCtx.fill();
    houseCtx.beginPath();
    houseCtx.arc(HOUSE_X, HOUSE_Y, RM, 0, Math.PI * 2);
    houseCtx.fillStyle = CLR.ring8;
    houseCtx.fill();
    houseCtx.beginPath();
    houseCtx.arc(HOUSE_X, HOUSE_Y, RI, 0, Math.PI * 2);
    houseCtx.fillStyle = CLR.ring4;
    houseCtx.fill();
    houseCtx.beginPath();
    houseCtx.arc(HOUSE_X, HOUSE_Y, RB, 0, Math.PI * 2);
    houseCtx.fillStyle = CLR.ringBtn;
    houseCtx.fill();
    ctx.lineWidth = 0.8;
    [RH, RM, RI, RB].forEach((r, i) => {
      ctx.beginPath();
      ctx.arc(HOUSE_X, HOUSE_Y, r, 0, Math.PI * 2);
      ctx.strokeStyle = i === 0 ? "rgba(140,20,20,0.35)" : "rgba(120,120,160,0.30)";
      ctx.stroke();
    });
    ctx.font = "bold 8px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.textAlign = "center";
    ctx.fillText("12", HOUSE_X, HOUSE_Y - RH + 14);
    ctx.fillStyle = "rgba(80,80,80,0.60)";
    ctx.fillText("8", HOUSE_X, HOUSE_Y - RM + 13);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText("4", HOUSE_X, HOUSE_Y - RI + 12);
    ctx.strokeStyle = "rgba(40,80,160,0.55)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(HOUSE_X - 18, HOUSE_Y);
    ctx.lineTo(HOUSE_X + 18, HOUSE_Y);
    ctx.moveTo(HOUSE_X, HOUSE_Y - 18);
    ctx.lineTo(HOUSE_X, HOUSE_Y + 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(HACK_X, HACK_Y, 11, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(25,45,85,0.50)";
    ctx.fill();
    ctx.strokeStyle = "rgba(70,130,220,0.65)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(70,130,220,0.30)";
    ctx.lineWidth = 1;
    for (let d = -8; d <= 8; d += 4) {
      ctx.beginPath();
      ctx.moveTo(HACK_X + d, HACK_Y - 8);
      ctx.lineTo(HACK_X + d, HACK_Y + 8);
      ctx.stroke();
    }
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(140,180,210,0.60)";
    ctx.font = "bold 8px Arial";
    ctx.fillText("BACK", SH_L - 10, BACK_Y + 3);
    ctx.fillText("TEE", SH_L - 10, TEE_Y + 3);
    ctx.fillText("HOG", SH_L - 10, HOG_Y + 3);
    ctx.fillText("HACK", SH_L - 10, HACK_Y + 3);
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(110,150,190,0.42)";
    ctx.font = "7px Arial";
    const distY = [BACK_Y, TEE_Y, HOG_Y];
    distY.forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(SH_R + 4, y);
      ctx.lineTo(SH_R + 12, y);
      ctx.strokeStyle = "rgba(110,150,190,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }
  _drawAim(ctx) {
    if (this.phase !== "playerAim")
      return;
    const rad = this.aim.angle * Math.PI / 180;
    const spd = 200 + this.aim.power * 280;
    const rot = this.aim.rotation;
    const strat = STRATEGIES[this.strategy];
    const trajCol = CLR[`traj${this.strategy.charAt(0).toUpperCase() + this.strategy.slice(1)}`] || CLR.trajDraw;
    let bx = HACK_X, by = HACK_Y;
    let bvx = Math.cos(rad) * spd, bvy = Math.sin(rad) * spd;
    const path = [{ x: bx, y: by }];
    const SDT = 1 / 20;
    for (let i = 0; i < 100; i++) {
      const sp = Math.hypot(bvx, bvy);
      if (sp < 2)
        break;
      const ratio = Math.max(0, sp - BASE_FRICTION * this._frMult * SDT) / sp;
      bvx *= ratio;
      bvy *= ratio;
      const fwd = -bvy;
      if (fwd > 8)
        bvx += rot * CURL_K * this._curlMult * fwd * SDT;
      bx += bvx * SDT;
      by += bvy * SDT;
      if (bx < SH_L - 6 || bx > SH_R + 6 || by < BACK_Y - 14)
        break;
      path.push({ x: bx, y: by });
    }
    if (path.length > 2) {
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (const pt of path)
        ctx.lineTo(pt.x, pt.y);
      ctx.strokeStyle = trajCol;
      ctx.lineWidth = 2.2;
      ctx.setLineDash([6, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      const ep = path[path.length - 1];
      ctx.beginPath();
      ctx.arc(ep.x, ep.y, STONE_R, 0, Math.PI * 2);
      ctx.strokeStyle = trajCol;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.fillStyle = trajCol.replace("0.50", "0.18");
      ctx.fill();
    }
    const arcR = 28;
    ctx.beginPath();
    ctx.arc(HACK_X, HACK_Y, arcR, -Math.PI * 0.08, Math.PI * 1.08, rot < 0);
    ctx.strokeStyle = rot > 0 ? "rgba(90,200,255,0.70)" : "rgba(255,120,80,0.70)";
    ctx.lineWidth = 2.2;
    ctx.stroke();
    const arrowT = rot > 0 ? Math.PI * 1.08 : -Math.PI * 0.08;
    const ax = HACK_X + Math.cos(arrowT) * arcR;
    const ay = HACK_Y + Math.sin(arrowT) * arcR;
    ctx.beginPath();
    ctx.arc(ax, ay, 4, 0, Math.PI * 2);
    ctx.fillStyle = rot > 0 ? "rgba(90,200,255,0.75)" : "rgba(255,120,80,0.75)";
    ctx.fill();
    if (this._dragActive) {
      const bX = HACK_X + 26, bTop = HACK_Y - 44, bH = 88;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(bX, bTop, 10, bH);
      ctx.fillStyle = "#4ab8ff";
      ctx.fillRect(bX, bTop + bH * (1 - this.aim.power), 10, bH * this.aim.power);
      ctx.strokeStyle = "rgba(140,210,255,0.65)";
      ctx.lineWidth = 1;
      ctx.strokeRect(bX, bTop, 10, bH);
    }
  }
  _drawStones(ctx) {
    const hc = { x: HOUSE_X, y: HOUSE_Y };
    for (const s of this.stones) {
      const cx = s.x, cy = s.y;
      const isFlying = s === this.flyingStone;
      const team = s.team;
      const spin = s.spinAngle || 0;
      if (isFlying && s.trail.length > 2) {
        for (let ti = 1; ti < s.trail.length; ti++) {
          const a = ti / s.trail.length;
          ctx.beginPath();
          ctx.moveTo(s.trail[ti - 1].x, s.trail[ti - 1].y);
          ctx.lineTo(s.trail[ti].x, s.trail[ti].y);
          ctx.strokeStyle = team === "player" ? `rgba(232,48,48,${a * 0.4})` : `rgba(212,168,0,${a * 0.4})`;
          ctx.lineWidth = STONE_R * 1.8 * a * 0.7;
          ctx.stroke();
        }
      }
      ctx.beginPath();
      ctx.ellipse(cx + 3, cy + 5, STONE_R * 0.9, STONE_R * 0.35, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fill();
      const g = ctx.createRadialGradient(cx - STONE_R * 0.3, cy - STONE_R * 0.3, 2, cx, cy, STONE_R);
      if (team === "player") {
        g.addColorStop(0, "#ff9898");
        g.addColorStop(0.45, "#d42020");
        g.addColorStop(0.78, "#880808");
        g.addColorStop(1, "#440404");
      } else {
        g.addColorStop(0, "#fff8a0");
        g.addColorStop(0.45, "#d4a000");
        g.addColorStop(0.78, "#806000");
        g.addColorStop(1, "#402800");
      }
      ctx.beginPath();
      ctx.arc(cx, cy, STONE_R, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, STONE_R - 1, 0, Math.PI * 2);
      ctx.clip();
      const grain = s.grain || (s.grain = makeStoneGrain());
      for (const gpt of grain) {
        const ang = gpt.a + spin;
        const rr2 = STONE_R * gpt.d;
        const sx2 = cx + Math.cos(ang) * rr2;
        const sy2 = cy + Math.sin(ang) * rr2;
        ctx.beginPath();
        ctx.arc(sx2, sy2, gpt.r, 0, Math.PI * 2);
        ctx.fillStyle = team === "player" ? `rgba(120,20,20,${gpt.o})` : `rgba(100,80,0,${gpt.o})`;
        ctx.fill();
      }
      ctx.restore();
      ctx.beginPath();
      ctx.arc(cx, cy, STONE_R, 0, Math.PI * 2);
      ctx.strokeStyle = team === "player" ? "rgba(255,140,140,0.70)" : "rgba(255,220,80,0.70)";
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, STONE_R * 0.55, 0, Math.PI * 2);
      ctx.strokeStyle = team === "player" ? "rgba(200,60,60,0.50)" : "rgba(200,150,0,0.50)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(spin);
      const hLen = STONE_R * 0.52;
      ctx.beginPath();
      ctx.moveTo(-hLen * 0.4, -STONE_R * 0.08);
      ctx.lineTo(hLen * 0.4, -STONE_R * 0.08);
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = team === "player" ? "#e83838" : "#d4a000";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-hLen * 0.28, 0, 2.5, 0, Math.PI * 2);
      ctx.beginPath();
      ctx.arc(hLen * 0.28, 0, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = team === "player" ? "#ff8080" : "#ffe060";
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.arc(cx - STONE_R * 0.28, cy - STONE_R * 0.28, STONE_R * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.30)";
      ctx.fill();
      if (isFlying) {
        const glow = ctx.createRadialGradient(cx, cy, STONE_R, cx, cy, STONE_R + 12);
        glow.addColorStop(0, team === "player" ? "rgba(232,48,48,0.45)" : "rgba(212,168,0,0.45)");
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(cx, cy, STONE_R + 12, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.90)";
      ctx.font = `700 ${STONE_R < 13 ? 7 : 8}px ${FONT_DISPLAY}`;
      ctx.fillText(s.delivNum, cx, cy + 3);
      const hd = dist(s, hc);
      if (!isFlying && hd < RH + STONE_R) {
        ctx.fillStyle = "rgba(255,255,255,0.70)";
        ctx.font = `600 6px ${FONT_BODY}`;
        ctx.fillText(Math.round(hd), cx, cy + STONE_R + 10);
      }
      const scoring = computeScore(this.stones);
      if (scoring.closest && scoring.closest.s === s) {
        ctx.beginPath();
        ctx.arc(cx, cy, STONE_R + 5, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,180,0.90)";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    if (this._effectiveSweep && this.flyingStone) {
      const f = this.flyingStone;
      const spd = Math.hypot(f.vx, f.vy);
      if (spd > 20) {
        const t = this.time * 22 % 1;
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = "#a8cce8";
        ctx.lineWidth = 2.5;
        for (let i = -2; i <= 2; i++) {
          const ox = i * 8 + (t - 0.5) * 6;
          ctx.beginPath();
          ctx.moveTo(f.x + ox, f.y + STONE_R + 2);
          ctx.lineTo(f.x + ox + (Math.random() - 0.5) * 5, f.y + STONE_R + 22);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }
  _drawParticles(ctx) {
    for (const p of this.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a * 0.75;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * a + 0.5, 0, Math.PI * 2);
      ctx.fillStyle = p.col;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  _drawHUD(ctx) {
    const px = ICE_W + 4;
    const pw = W - px - 4;
    const cx2 = px + pw / 2;
    const totalShots = SHOTS_PER_TEAM * 2;
    const shotNum = clamp(this.delivIdx + 1, 1, totalShots);
    const isPlayerTurn = this.phase === "playerAim" || this.phase === "flight" && this.flyingStone?.team === "player";
    const isAiTurn = this.phase === "aiTurn" || this.phase === "flight" && this.flyingStone?.team === "ai";
    const scoring = computeScore(this.stones);
    const cond = this._iceCond;
    const panelBg = ctx.createLinearGradient(px, 0, px, H);
    panelBg.addColorStop(0, "#060f1f");
    panelBg.addColorStop(0.45, "#050b16");
    panelBg.addColorStop(1, "#04070f");
    ctx.fillStyle = panelBg;
    ctx.fillRect(px, 0, pw, H);
    ctx.strokeStyle = "rgba(70,124,206,0.34)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, H);
    ctx.stroke();
    for (let gy = 0; gy < H; gy += 26) {
      ctx.strokeStyle = `rgba(98,148,214,${gy % 52 === 0 ? 0.07 : 0.03})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + 2, gy + 0.5);
      ctx.lineTo(px + pw - 2, gy + 0.5);
      ctx.stroke();
    }
    const drawCard = (x, y2, w, h, accent = "rgba(92,148,230,0.24)") => {
      const bg = ctx.createLinearGradient(x, y2, x, y2 + h);
      bg.addColorStop(0, "rgba(8,18,34,0.94)");
      bg.addColorStop(1, "rgba(4,10,20,0.82)");
      ctx.fillStyle = bg;
      ctx.beginPath();
      rr(ctx, x, y2, w, h, 10);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      rr(ctx, x, y2, w, h, 10);
      ctx.stroke();
    };
    ctx.textAlign = "center";
    ctx.fillStyle = "#8fc5ff";
    ctx.font = `700 17px ${FONT_DISPLAY}`;
    ctx.fillText("ICE STRIKE PRO", cx2, 25);
    ctx.fillStyle = "rgba(148,190,238,0.72)";
    ctx.font = `600 10px ${FONT_BODY}`;
    ctx.fillText(`END ${this.end}/${ENDS}  \uFFFD  ${this.difficulty.toUpperCase()}  \uFFFD  ${this.hammer === "player" ? "YOU HAMMER" : "CPU HAMMER"}`, cx2, 40);
    const cardX = px + 10;
    const cardW = pw - 20;
    let y = 50;
    drawCard(cardX, y, cardW, 98, "rgba(88,148,230,0.34)");
    const half = cardW / 2;
    ctx.fillStyle = isPlayerTurn ? "rgba(154,44,44,0.28)" : "rgba(80,26,26,0.2)";
    ctx.beginPath();
    rr(ctx, cardX + 8, y + 8, half - 12, 56, 8);
    ctx.fill();
    ctx.fillStyle = isAiTurn ? "rgba(176,142,18,0.28)" : "rgba(74,58,12,0.2)";
    ctx.beginPath();
    rr(ctx, cardX + half + 4, y + 8, half - 12, 56, 8);
    ctx.fill();
    ctx.textAlign = "center";
    ctx.fillStyle = isPlayerTurn ? "#ff8b8b" : "rgba(214,134,134,0.66)";
    ctx.font = `700 11px ${FONT_DISPLAY}`;
    ctx.fillText("YOU", cardX + half * 0.5, y + 23);
    ctx.fillStyle = isAiTurn ? "#ffe68c" : "rgba(210,194,132,0.62)";
    ctx.fillText("CPU", cardX + half * 1.5, y + 23);
    const pPulse = this.scorePulse.player;
    const aPulse = this.scorePulse.ai;
    ctx.font = `700 36px ${FONT_DISPLAY}`;
    ctx.save();
    ctx.translate(cardX + half * 0.5, y + 56);
    const ps = 1 + pPulse * 0.12;
    ctx.scale(ps, ps);
    ctx.fillStyle = pPulse > 0 ? "#ffffff" : "#ffdfe0";
    ctx.fillText(this.scores.player, 0, 0);
    ctx.restore();
    ctx.save();
    ctx.translate(cardX + half * 1.5, y + 56);
    const as = 1 + aPulse * 0.12;
    ctx.scale(as, as);
    ctx.fillStyle = aPulse > 0 ? "#fffef2" : "#fff0b8";
    ctx.fillText(this.scores.ai, 0, 0);
    ctx.restore();
    ctx.strokeStyle = "rgba(158,190,234,0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX + half, y + 12);
    ctx.lineTo(cardX + half, y + 62);
    ctx.stroke();
    ctx.fillStyle = "rgba(156,198,244,0.7)";
    ctx.font = `600 9px ${FONT_BODY}`;
    ctx.fillText(`SHOT ${shotNum}/${totalShots}`, cx2, y + 78);
    const progL = cardX + 24;
    const progR = cardX + cardW - 24;
    for (let i = 0; i < totalShots; i++) {
      const team = this.hammer === "player" ? i % 2 === 0 ? "ai" : "player" : i % 2 === 0 ? "player" : "ai";
      const col = team === "player" ? "rgba(236,86,90,0.95)" : "rgba(245,206,80,0.95)";
      const t = totalShots <= 1 ? 0.5 : i / (totalShots - 1);
      const dx = progL + (progR - progL) * t;
      const done = i < this.delivIdx;
      const current = i === this.delivIdx;
      ctx.beginPath();
      ctx.arc(dx, y + 90, current ? 5.6 : 3.8, 0, Math.PI * 2);
      ctx.fillStyle = done ? "rgba(58,82,116,0.52)" : col;
      ctx.fill();
      if (current) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }
    y += 108;
    drawCard(cardX, y, cardW, 84, "rgba(72,196,244,0.32)");
    const clockX = cardX + 42;
    const clockY = y + 42;
    const clockR = 22;
    const clockRatio = this.phase === "playerAim" ? clamp(this.shotClock / SHOT_CLOCK_SECONDS, 0, 1) : 1;
    ctx.strokeStyle = "rgba(86,120,168,0.44)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(clockX, clockY, clockR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = clockRatio > 0.5 ? "#60d0ff" : clockRatio > 0.22 ? "#ffd972" : "#ff7e70";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(clockX, clockY, clockR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clockRatio);
    ctx.stroke();
    ctx.fillStyle = "#d8eeff";
    ctx.font = `700 12px ${FONT_DISPLAY}`;
    const clockText = this.phase === "playerAim" ? `${Math.ceil(this.shotClock)}s` : this.phase === "aiTurn" ? "AI" : this.phase === "flight" ? "RUN" : "--";
    ctx.fillText(clockText, clockX, clockY + 4);
    ctx.fillStyle = "rgba(144,188,236,0.74)";
    ctx.font = `600 9px ${FONT_BODY}`;
    ctx.fillText("SHOT CLOCK", clockX, y + 72);
    const barX = cardX + 80;
    const barY = y + 36;
    const barW = cardW - 98;
    ctx.fillStyle = "rgba(10,20,36,0.9)";
    ctx.beginPath();
    rr(ctx, barX, barY, barW, 12, 6);
    ctx.fill();
    const sweepGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    sweepGrad.addColorStop(0, "#3db6ff");
    sweepGrad.addColorStop(1, "#9befff");
    ctx.fillStyle = sweepGrad;
    ctx.beginPath();
    rr(ctx, barX, barY, barW * this.sweepHeat, 12, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(138,194,236,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    rr(ctx, barX, barY, barW, 12, 6);
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(168,208,246,0.82)";
    ctx.font = `600 10px ${FONT_BODY}`;
    ctx.fillText("SWEEP HEAT", barX, y + 26);
    ctx.textAlign = "right";
    ctx.fillStyle = this._effectiveSweep ? "#a8efff" : "rgba(156,198,236,0.72)";
    ctx.fillText(this._effectiveSweep ? "ACTIVE" : this.phase === "flight" ? "READY" : "IDLE", barX + barW, y + 26);
    const spdNow = this.flyingStone ? Math.round(Math.hypot(this.flyingStone.vx, this.flyingStone.vy)) : 0;
    ctx.fillStyle = "rgba(126,176,224,0.72)";
    ctx.font = `600 9px ${FONT_BODY}`;
    ctx.fillText(`ICE: ${cond.label}  \uFFFD  SPEED ${spdNow}`, barX + barW, y + 58);
    y += 94;
    drawCard(cardX, y, cardW, 72, "rgba(120,146,224,0.32)");
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(156,204,244,0.72)";
    ctx.font = `600 9px ${FONT_BODY}`;
    ctx.fillText("END PRESSURE", cardX + 14, y + 16);
    if (scoring.team) {
      const leadColor = scoring.team === "player" ? "#ff8a8a" : "#ffe08a";
      const leadName = scoring.team === "player" ? "YOU" : "CPU";
      ctx.fillStyle = leadColor;
      ctx.font = `700 20px ${FONT_DISPLAY}`;
      ctx.fillText(`${leadName} +${scoring.pts}`, cardX + 14, y + 41);
      ctx.fillStyle = "rgba(156,196,236,0.72)";
      ctx.font = `600 10px ${FONT_BODY}`;
      ctx.fillText("currently counting in the house", cardX + 14, y + 58);
    } else {
      ctx.fillStyle = "rgba(164,198,236,0.78)";
      ctx.font = `700 15px ${FONT_DISPLAY}`;
      ctx.fillText(this.stones.length > 0 ? "NO STONE IS SCORING" : "SHEET CLEAR", cardX + 14, y + 44);
    }
    ctx.textAlign = "right";
    ctx.fillStyle = cond.color;
    ctx.font = `700 10px ${FONT_BODY}`;
    ctx.fillText(cond.label.toUpperCase(), cardX + cardW - 14, y + 18);
    y += 82;
    const footerY = H - 48;
    const histRows = Math.min(this.endLog.length, ENDS);
    const histH = histRows > 0 ? 26 + histRows * 15 : 0;
    const histY = footerY - 10 - histH;
    const phaseTop = y;
    const phaseH = Math.max(72, (histRows > 0 ? histY : footerY) - phaseTop - 10);
    drawCard(cardX, phaseTop, cardW, phaseH, "rgba(98,170,236,0.29)");
    if (this.phase === "playerAim") {
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(176,214,248,0.84)";
      ctx.font = `700 11px ${FONT_DISPLAY}`;
      ctx.fillText("DELIVERY SETUP", cardX + 14, phaseTop + 18);
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(124,188,246,0.9)";
      ctx.font = `700 11px ${FONT_DISPLAY}`;
      ctx.fillText(`${Math.round(this.aim.power * 100)}% POWER`, cardX + cardW - 14, phaseTop + 18);
      const pbx = cardX + 14;
      const pby = phaseTop + 26;
      const pbw = cardW - 28;
      ctx.fillStyle = "rgba(8,18,34,0.9)";
      ctx.beginPath();
      rr(ctx, pbx, pby, pbw, 12, 6);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fillRect(pbx + pbw * 0.34, pby, pbw * 0.32, 12);
      const powerColor = this.aim.power < 0.34 ? "#ff6f67" : this.aim.power < 0.66 ? "#58dc86" : "#59b3ff";
      ctx.fillStyle = powerColor;
      ctx.beginPath();
      rr(ctx, pbx, pby, pbw * this.aim.power, 12, 6);
      ctx.fill();
      ctx.strokeStyle = "rgba(132,184,236,0.42)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      rr(ctx, pbx, pby, pbw, 12, 6);
      ctx.stroke();
      const chips = Object.keys(STRATEGIES);
      const chipW = (cardW - 32) / 4;
      chips.forEach((k, i) => {
        const sx = cardX + 14 + chipW * i;
        const sy = phaseTop + 46;
        const active = this.strategy === k;
        const strat = STRATEGIES[k];
        ctx.fillStyle = active ? strat.color + "d9" : "rgba(20,34,54,0.92)";
        ctx.beginPath();
        rr(ctx, sx, sy, chipW - 4, 28, 7);
        ctx.fill();
        ctx.strokeStyle = active ? strat.color : "rgba(92,132,186,0.34)";
        ctx.lineWidth = active ? 1.6 : 1;
        ctx.beginPath();
        rr(ctx, sx, sy, chipW - 4, 28, 7);
        ctx.stroke();
        ctx.textAlign = "center";
        ctx.fillStyle = active ? "#fff" : "rgba(170,204,240,0.8)";
        ctx.font = `700 9px ${FONT_DISPLAY}`;
        ctx.fillText(strat.label.toUpperCase(), sx + (chipW - 4) / 2, sy + 12);
        ctx.fillStyle = active ? "rgba(255,255,255,0.92)" : "rgba(138,174,214,0.72)";
        ctx.font = `600 8px ${FONT_BODY}`;
        ctx.fillText(strat.key, sx + (chipW - 4) / 2, sy + 22);
      });
      const rel = this.lastRelease;
      if (rel && this.time - rel.at < 12) {
        const qColor = rel.quality > 0.86 ? "#84ffd0" : rel.quality > 0.62 ? "#9ed4ff" : rel.quality > 0.4 ? "#ffd07a" : "#ff9b8e";
        ctx.textAlign = "left";
        ctx.fillStyle = qColor;
        ctx.font = `700 10px ${FONT_DISPLAY}`;
        ctx.fillText(`LAST: ${rel.label.toUpperCase()} (${Math.round(rel.quality * 100)}%)`, cardX + 14, phaseTop + phaseH - 11);
        ctx.textAlign = "right";
        ctx.fillStyle = "rgba(140,188,236,0.72)";
        ctx.font = `600 8px ${FONT_BODY}`;
        ctx.fillText("Space/Click throw  |  Q/E curl  |  S sweep in flight", cardX + cardW - 14, phaseTop + phaseH - 11);
      } else {
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(142,192,238,0.75)";
        ctx.font = `600 9px ${FONT_BODY}`;
        ctx.fillText("Space/Click throw  \uFFFD  Q/E curl  \uFFFD  1/2/3/4 strategy", cx2, phaseTop + phaseH - 11);
      }
    } else if (this.phase === "aiTurn") {
      const dots = ".".repeat(1 + Math.floor(this.time * 2.8) % 3);
      const planLabels = {
        draw: "DRAW TO BUTTON",
        guard: "CENTER GUARD",
        takeout: "TAKEOUT",
        "clear-guard": "CLEAR GUARD"
      };
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,228,136,0.94)";
      ctx.font = `700 17px ${FONT_DISPLAY}`;
      ctx.fillText(`CPU THINKING${dots}`, cx2, phaseTop + 30);
      ctx.fillStyle = "rgba(180,214,244,0.76)";
      ctx.font = `600 10px ${FONT_BODY}`;
      const label = planLabels[this.aiLastPlan] || "READING THE HOUSE";
      ctx.fillText(label, cx2, phaseTop + 49);
      ctx.fillText("watch lane and prepare your counter", cx2, phaseTop + 66);
    } else if (this.phase === "flight") {
      const flyingTeam = this.flyingStone?.team === "player" ? "YOU" : "CPU";
      const sweepLabel = this._effectiveSweep ? "SWEEP ACTIVE" : "SWEEP READY";
      ctx.textAlign = "center";
      ctx.fillStyle = this._effectiveSweep ? "#95efff" : "rgba(170,206,246,0.84)";
      ctx.font = `700 16px ${FONT_DISPLAY}`;
      ctx.fillText(`${flyingTeam} IN FLIGHT`, cx2, phaseTop + 29);
      ctx.fillText(sweepLabel, cx2, phaseTop + 50);
      ctx.fillStyle = "rgba(152,198,244,0.78)";
      ctx.font = `600 10px ${FONT_BODY}`;
      if (this.flyingStone?.team === "player") {
        ctx.fillText("Hold S or ArrowDown near hog line to carry further", cx2, phaseTop + 69);
      } else {
        ctx.fillText("CPU sweep timing adapts to line and speed", cx2, phaseTop + 69);
      }
    } else if (this.phase === "endResult") {
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(186,222,248,0.92)";
      ctx.font = `700 16px ${FONT_DISPLAY}`;
      ctx.fillText("END COMPLETE", cx2, phaseTop + 30);
      ctx.fillStyle = "rgba(144,190,236,0.76)";
      ctx.font = `600 10px ${FONT_BODY}`;
      ctx.fillText(this.endTransitionMessage || "round finished", cx2, phaseTop + 50);
      const nextAction = this.end >= ENDS ? "Final result incoming" : "Space/Enter/click to continue now";
      ctx.fillText(`${nextAction}  \uFFFD  auto in ${Math.ceil(Math.max(0, this.endTimer))}s`, cx2, phaseTop + 67);
    }
    if (histRows > 0) {
      drawCard(cardX, histY, cardW, histH, "rgba(114,150,220,0.26)");
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(162,206,246,0.8)";
      ctx.font = `700 9px ${FONT_DISPLAY}`;
      ctx.fillText("END LOG", cardX + 14, histY + 15);
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(252,164,164,0.86)";
      ctx.fillText("YOU", cardX + cardW * 0.44, histY + 15);
      ctx.fillStyle = "rgba(252,228,144,0.88)";
      ctx.fillText("CPU", cardX + cardW * 0.72, histY + 15);
      this.endLog.forEach((entry, i) => {
        const ry = histY + 30 + i * 15;
        ctx.textAlign = "left";
        ctx.fillStyle = "rgba(138,184,232,0.72)";
        ctx.font = `600 8px ${FONT_BODY}`;
        ctx.fillText(`E${i + 1}`, cardX + 14, ry);
        ctx.textAlign = "center";
        ctx.fillStyle = entry.player > 0 ? "#ff9ea0" : "rgba(112,150,190,0.55)";
        ctx.fillText(entry.player, cardX + cardW * 0.44, ry);
        ctx.fillStyle = entry.ai > 0 ? "#ffe28d" : "rgba(112,150,190,0.55)";
        ctx.fillText(entry.ai, cardX + cardW * 0.72, ry);
      });
    }
    drawCard(cardX, footerY, cardW, 38, "rgba(86,136,212,0.24)");
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(144,196,244,0.78)";
    ctx.font = `600 8px ${FONT_BODY}`;
    ctx.fillText("AIM mouse or arrows  |  POWER drag or up/down  |  R restart  |  ESC menu", cx2, footerY + 15);
    ctx.fillText("COLLIDE, SWEEP, AND MANAGE HAMMER FOR END CONTROL", cx2, footerY + 29);
  }
  _drawEndBanner(ctx) {
    const res = this.lastResult;
    ctx.fillStyle = "rgba(4,10,22,0.62)";
    ctx.fillRect(SH_L - 20, H * 0.38, SH_W + 40, H * 0.26);
    ctx.textAlign = "center";
    const mX = SH_MID, mY = H * 0.52;
    if (res && res.team) {
      const col = res.team === "player" ? "#ff8080" : "#f0c020";
      const name = res.team === "player" ? "YOU SCORE" : "CPU SCORES";
      ctx.fillStyle = col;
      ctx.font = `700 28px ${FONT_DISPLAY}`;
      ctx.fillText(`${name}  ${res.pts}!`, mX, mY - 12);
    } else {
      ctx.fillStyle = "#88a8cc";
      ctx.font = `700 24px ${FONT_DISPLAY}`;
      ctx.fillText("BLANK END", mX, mY - 12);
    }
    const isFinalEnd = this.end >= ENDS;
    ctx.fillStyle = "rgba(155,195,240,0.65)";
    ctx.font = `600 11px ${FONT_BODY}`;
    if (isFinalEnd) {
      ctx.fillText(`Final end complete. Scoreboard in ${Math.ceil(Math.max(0, this.endTimer))}s...`, mX, mY + 16);
    } else {
      ctx.fillText(`Next end in ${Math.ceil(Math.max(0, this.endTimer))}s (Space/Enter/click to continue)`, mX, mY + 16);
    }
    const nextCond = ICE_CONDITIONS[this.iceCondKey];
    ctx.fillStyle = nextCond.color;
    ctx.font = `600 9px ${FONT_BODY}`;
    ctx.fillText(`Next: ${nextCond.label} ice`, mX, mY + 34);
  }
  _drawMenu(ctx, vW, vH) {
    const sx = vW / W, sy = vH / H;
    ctx.save();
    ctx.scale(sx, sy);
    ctx.fillStyle = "#040810";
    ctx.fillRect(0, 0, W, H);
    const atm = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, H * 0.65);
    atm.addColorStop(0, "rgba(15,40,100,0.25)");
    atm.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = atm;
    ctx.fillRect(0, 0, W, H);
    [RH * 2.6, RM * 2.4, RI * 2.8, RB * 3].forEach((r, i) => {
      ctx.beginPath();
      ctx.arc(W / 2, H / 2 + 40, r, 0, Math.PI * 2);
      ctx.fillStyle = [CLR.ring12, CLR.ring8, CLR.ring4, CLR.ringBtn][i % 4].replace("0.88", "0.08").replace("0.94", "0.07").replace("0.90", "0.08").replace("0.96", "0.07");
      ctx.fill();
    });
    ctx.textAlign = "center";
    ctx.fillStyle = "#b0d8ff";
    ctx.font = `700 40px ${FONT_DISPLAY}`;
    ctx.fillText("ICE STRIKE PRO", W / 2, H / 2 - 108);
    ctx.fillStyle = "rgba(110,165,220,0.72)";
    ctx.font = `600 13px ${FONT_BODY}`;
    ctx.fillText("Professional curling simulator \uFFFD precision stone control", W / 2, H / 2 - 78);
    const feats = [
      "Real curl + rebound physics with dynamic ice conditions.",
      "Choose strategy each delivery: Draw, Guard, Takeout, Raise.",
      "Sweep timing and release quality decide the final line."
    ];
    ctx.font = `600 10px ${FONT_BODY}`;
    ctx.fillStyle = "rgba(130,175,220,0.72)";
    feats.forEach((f, i) => ctx.fillText(f, W / 2, H / 2 - 46 + i * 14));
    ctx.fillStyle = "rgba(130,175,225,0.78)";
    ctx.font = `700 11px ${FONT_DISPLAY}`;
    ctx.fillText("SELECT DIFFICULTY", W / 2, H / 2 - 2);
    const diffs = [
      { id: "easy", label: "EASY", col: "#1a8a3a", bdr: "#50d870" },
      { id: "medium", label: "MEDIUM", col: "#7a6e00", bdr: "#f0c020" },
      { id: "hard", label: "HARD", col: "#8a1818", bdr: "#ff5050" }
    ];
    const bW = 90, bH = 34, bGap = 8;
    const totalW = diffs.length * bW + (diffs.length - 1) * bGap;
    const bStartX = W / 2 - totalW / 2;
    diffs.forEach(({ id, label, col, bdr }, i) => {
      const bx = bStartX + i * (bW + bGap), by = H / 2 + 8;
      const active = this.difficulty === id;
      ctx.fillStyle = active ? col : "rgba(15,25,45,0.75)";
      ctx.beginPath();
      rr(ctx, bx, by, bW, bH, 7);
      ctx.fill();
      ctx.strokeStyle = active ? bdr : "rgba(70,105,160,0.38)";
      ctx.lineWidth = active ? 2 : 1;
      ctx.beginPath();
      rr(ctx, bx, by, bW, bH, 7);
      ctx.stroke();
      ctx.fillStyle = active ? "#fff" : "rgba(130,165,210,0.60)";
      ctx.font = `700 ${active ? 12 : 11}px ${FONT_DISPLAY}`;
      ctx.fillText(label, bx + bW / 2, by + 22);
    });
    ctx.fillStyle = "rgba(40,100,210,0.85)";
    ctx.beginPath();
    rr(ctx, W / 2 - 120, H / 2 + 54, 240, 50, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(80,165,255,0.55)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    rr(ctx, W / 2 - 120, H / 2 + 54, 240, 50, 12);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = `700 18px ${FONT_DISPLAY}`;
    ctx.fillText("START GAME  ( Enter )", W / 2, H / 2 + 86);
    ctx.restore();
  }
  _drawGameOver(ctx, vW, vH) {
    const sx = vW / W, sy = vH / H;
    ctx.save();
    ctx.scale(sx, sy);
    ctx.fillStyle = "rgba(4,10,22,0.97)";
    ctx.fillRect(0, 0, W, H);
    const won = this.scores.player > this.scores.ai;
    const tie = this.scores.player === this.scores.ai;
    const wTxt = tie ? "TIE GAME" : won ? "YOU WIN!" : "CPU WINS";
    const wCol = tie ? "#80c0ff" : won ? "#ff8080" : "#f0c020";
    ctx.textAlign = "center";
    ctx.fillStyle = wCol;
    ctx.font = "bold 44px Arial";
    ctx.fillText(wTxt, W / 2, H / 2 - 108);
    ctx.fillStyle = won ? "#ff8080" : "#f0c020";
    ctx.font = "bold 30px Arial";
    ctx.fillText(`${this.scores.player}  \u2014  ${this.scores.ai}`, W / 2, H / 2 - 60);
    ctx.fillStyle = "rgba(170,200,230,0.50)";
    ctx.font = "13px Arial";
    ctx.fillText("You  \u2014  CPU", W / 2, H / 2 - 36);
    ctx.fillStyle = "rgba(70,110,170,0.40)";
    ctx.beginPath();
    rr(ctx, W / 2 - 150, H / 2 - 22, 300, this.endLog.length * 20 + 18, 8);
    ctx.fill();
    this.endLog.forEach((e, i) => {
      const ry = H / 2 - 10 + i * 20;
      ctx.fillStyle = "rgba(140,175,215,0.60)";
      ctx.font = "11px Arial";
      ctx.textAlign = "left";
      ctx.fillText(`End ${i + 1}`, W / 2 - 138, ry);
      ctx.fillStyle = e.player > 0 ? CLR.playerCol : "rgba(90,120,155,0.45)";
      ctx.textAlign = "center";
      ctx.fillText(e.player, W / 2 - 28, ry);
      ctx.fillStyle = "rgba(140,165,195,0.30)";
      ctx.fillText("\u2014", W / 2, ry);
      ctx.fillStyle = e.ai > 0 ? CLR.aiCol : "rgba(90,120,155,0.45)";
      ctx.fillText(e.ai, W / 2 + 28, ry);
    });
    ctx.fillStyle = "rgba(195,225,255,0.85)";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Press  Enter  or  click  to  return", W / 2, H - 42);
    ctx.restore();
  }
};
function IceStrikeProGame() {
  const canvasRef = (0, import_react.useRef)(null);
  const rtRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    const canvas = canvasRef.current;
    if (!canvas)
      return;
    const rt = new IceStrikeRuntime(canvas);
    rtRef.current = rt;
    rt.start();
    const renderGameToText = () => {
      const active = rtRef.current;
      return JSON.stringify(active ? active.snapshot() : { screen: "unmounted" });
    };
    const advanceTime = (ms = 1e3 / 60) => {
      const active = rtRef.current;
      if (!active)
        return;
      active.advance(ms);
    };
    window.render_game_to_text = renderGameToText;
    window.advanceTime = advanceTime;
    return () => {
      if (window.render_game_to_text === renderGameToText)
        delete window.render_game_to_text;
      if (window.advanceTime === advanceTime)
        delete window.advanceTime;
      rt.destroy();
      rtRef.current = null;
    };
  }, []);
  return /* @__PURE__ */ import_react.default.createElement("div", { style: {
    width: "100%",
    height: "100%",
    display: "flex",
    background: "#04080f"
  } }, /* @__PURE__ */ import_react.default.createElement(
    "canvas",
    {
      ref: canvasRef,
      style: { width: "100%", height: "100%", display: "block" }
    }
  ));
}
export {
  IceStrikeProGame as default
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
