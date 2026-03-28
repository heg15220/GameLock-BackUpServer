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

// src/games/knowledge/TangramKnowledgeGame.jsx
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

// src/games/knowledge/knowledgeArcadeUtils.js
var KNOWLEDGE_ARCADE_MATCH_COUNT = 1e4;
var resolveKnowledgeArcadeLocale = () => {
  const locale = resolveBrowserLanguage();
  return locale === "es" ? "es" : "en";
};
var getRandomKnowledgeMatchId = () => Math.floor(Math.random() * KNOWLEDGE_ARCADE_MATCH_COUNT);
var getRandomKnowledgeMatchIdExcept = (matchId) => {
  if (KNOWLEDGE_ARCADE_MATCH_COUNT <= 1)
    return 0;
  const current = ((Number(matchId) || 0) + KNOWLEDGE_ARCADE_MATCH_COUNT) % KNOWLEDGE_ARCADE_MATCH_COUNT;
  const candidate = getRandomKnowledgeMatchId();
  if (candidate !== current) {
    return candidate;
  }
  return (candidate + 1 + Math.floor(Math.random() * (KNOWLEDGE_ARCADE_MATCH_COUNT - 1))) % KNOWLEDGE_ARCADE_MATCH_COUNT;
};

// src/games/knowledge/tangramEngine.js
var SQRT2 = Math.SQRT2;
var TANGRAM_BOARD_CONFIG = Object.freeze({
  width: 980,
  height: 560,
  trayCenterX: 248,
  trayCenterY: 282,
  targetCenterX: 708,
  targetCenterY: 282,
  scale: 58,
  snapDistance: 30
});
var TANGRAM_PIECES = Object.freeze([
  { id: "piece-large-a", type: "largeTriangle", color: "#f97316" },
  { id: "piece-large-b", type: "largeTriangle", color: "#fb923c" },
  { id: "piece-medium", type: "mediumTriangle", color: "#22c55e" },
  { id: "piece-small-a", type: "smallTriangle", color: "#06b6d4" },
  { id: "piece-small-b", type: "smallTriangle", color: "#3b82f6" },
  { id: "piece-square", type: "square", color: "#a855f7" },
  { id: "piece-parallelogram", type: "parallelogram", color: "#ef4444" }
]);
var RAW_SHAPES_BY_TYPE = Object.freeze({
  largeTriangle: [
    [0, 0],
    [2, 0],
    [0, 2]
  ],
  mediumTriangle: [
    [0, 0],
    [SQRT2, 0],
    [0, SQRT2]
  ],
  smallTriangle: [
    [0, 0],
    [1, 0],
    [0, 1]
  ],
  square: [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1]
  ],
  parallelogram: [
    [0, 0],
    [SQRT2, 0],
    [SQRT2 + 1 / SQRT2, 1 / SQRT2],
    [1 / SQRT2, 1 / SQRT2]
  ]
});
var centerPolygon = (points) => {
  const total = points.reduce(
    (accumulator, [x, y]) => {
      accumulator.x += x;
      accumulator.y += y;
      return accumulator;
    },
    { x: 0, y: 0 }
  );
  const centerX = total.x / points.length;
  const centerY = total.y / points.length;
  return points.map(([x, y]) => [x - centerX, y - centerY]);
};
var TANGRAM_SHAPES_BY_TYPE = Object.freeze(
  Object.fromEntries(
    Object.entries(RAW_SHAPES_BY_TYPE).map(([type, points]) => [type, centerPolygon(points)])
  )
);
var normalizeRotationSteps = (steps) => {
  const value = Number(steps) || 0;
  return (Math.round(value) % 8 + 8) % 8;
};
var rotatePointBySteps = ([x, y], steps) => {
  const radians = normalizeRotationSteps(steps) * (Math.PI / 4);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return [x * cos - y * sin, x * sin + y * cos];
};
var transformTangramPolygon = (polygon, pose, scale = 1) => {
  const positionX = Number(pose?.x) || 0;
  const positionY = Number(pose?.y) || 0;
  const rotation = normalizeRotationSteps(pose?.rotation);
  const flipped = Boolean(pose?.flip);
  const unitScale = Number(scale) || 1;
  return polygon.map(([pointX, pointY]) => {
    const sourceX = flipped ? -pointX : pointX;
    const sourceY = pointY;
    const [rotatedX, rotatedY] = rotatePointBySteps([sourceX, sourceY], rotation);
    return [positionX + rotatedX * unitScale, positionY + rotatedY * unitScale];
  });
};
var getTangramPolygonForPiece = (piece, scale = TANGRAM_BOARD_CONFIG.scale) => transformTangramPolygon(
  TANGRAM_SHAPES_BY_TYPE[piece.type] ?? TANGRAM_SHAPES_BY_TYPE.smallTriangle,
  piece,
  scale
);
var getPolygonAxes = (polygon) => polygon.map((point, index) => {
  const next = polygon[(index + 1) % polygon.length];
  const edgeX = next[0] - point[0];
  const edgeY = next[1] - point[1];
  const normalX = -edgeY;
  const normalY = edgeX;
  const length = Math.hypot(normalX, normalY) || 1;
  return [normalX / length, normalY / length];
});
var projectPolygonOnAxis = (polygon, [axisX, axisY]) => {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const [x, y] of polygon) {
    const projection = x * axisX + y * axisY;
    if (projection < min)
      min = projection;
    if (projection > max)
      max = projection;
  }
  return [min, max];
};
var polygonsOverlapSAT = (leftPolygon, rightPolygon, epsilon = 1e-6) => {
  const axes = [...getPolygonAxes(leftPolygon), ...getPolygonAxes(rightPolygon)];
  for (const axis of axes) {
    const [leftMin, leftMax] = projectPolygonOnAxis(leftPolygon, axis);
    const [rightMin, rightMax] = projectPolygonOnAxis(rightPolygon, axis);
    if (leftMax <= rightMin + epsilon || rightMax <= leftMin + epsilon) {
      return false;
    }
  }
  return true;
};
var computeTangramOverlapPairs = (pieces, scale = TANGRAM_BOARD_CONFIG.scale) => {
  const polygons = pieces.map((piece) => ({
    id: piece.id,
    polygon: getTangramPolygonForPiece(piece, scale)
  }));
  const overlaps = [];
  for (let index = 0; index < polygons.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < polygons.length; nextIndex += 1) {
      if (polygonsOverlapSAT(polygons[index].polygon, polygons[nextIndex].polygon)) {
        overlaps.push([polygons[index].id, polygons[nextIndex].id]);
      }
    }
  }
  return overlaps;
};
var SLOT_TYPES_BY_INDEX = Object.freeze([
  "largeTriangle",
  "largeTriangle",
  "mediumTriangle",
  "smallTriangle",
  "smallTriangle",
  "square",
  "parallelogram"
]);
var BASE_TEMPLATE_POSES = Object.freeze([
  {
    id: "silueta-a",
    label: { es: "Silueta A", en: "Silhouette A" },
    poses: [
      { x: 1.868, y: 1.167, rotation: 7, flip: false },
      { x: 0.868, y: -0.833, rotation: 6, flip: false },
      { x: -0.132, y: 0.667, rotation: 7, flip: false },
      { x: 0.368, y: -2.333, rotation: 2, flip: false },
      { x: -0.632, y: -0.833, rotation: 6, flip: false },
      { x: -1.632, y: 0.667, rotation: 3, flip: false },
      { x: -0.132, y: 2.167, rotation: 1, flip: true }
    ]
  },
  {
    id: "silueta-b",
    label: { es: "Silueta B", en: "Silhouette B" },
    poses: [
      { x: 1.029, y: 1.417, rotation: 1, flip: false },
      { x: -0.471, y: -1.083, rotation: 1, flip: false },
      { x: -0.971, y: 0.417, rotation: 7, flip: false },
      { x: -1.971, y: 1.417, rotation: 7, flip: false },
      { x: -0.971, y: 1.917, rotation: 0, flip: false },
      { x: 0.029, y: -0.083, rotation: 6, flip: false },
      { x: 1.029, y: -2.083, rotation: 3, flip: false }
    ]
  },
  {
    id: "silueta-c",
    label: { es: "Silueta C", en: "Silhouette C" },
    poses: [
      { x: 1.785, y: -1.687, rotation: 4, flip: false },
      { x: 0.285, y: 1.813, rotation: 6, flip: false },
      { x: 1.785, y: 1.813, rotation: 7, flip: false },
      { x: 0.285, y: -0.687, rotation: 6, flip: false },
      { x: -2.215, y: 2.313, rotation: 3, flip: false },
      { x: -0.715, y: -0.187, rotation: 5, flip: false },
      { x: -1.215, y: 2.313, rotation: 5, flip: true }
    ]
  },
  {
    id: "silueta-d",
    label: { es: "Silueta D", en: "Silhouette D" },
    poses: [
      { x: 0.833, y: -0.971, rotation: 6, flip: false },
      { x: -0.167, y: 2.529, rotation: 5, flip: false },
      { x: 0.333, y: 0.529, rotation: 3, flip: false },
      { x: -0.667, y: -1.971, rotation: 0, flip: false },
      { x: 1.833, y: -1.971, rotation: 4, flip: false },
      { x: -0.667, y: 1.529, rotation: 0, flip: false },
      { x: -1.167, y: -2.971, rotation: 7, flip: false }
    ]
  },
  {
    id: "silueta-e",
    label: { es: "Silueta E", en: "Silhouette E" },
    poses: [
      { x: -0.583, y: 1.73, rotation: 4, flip: false },
      { x: 0.417, y: -0.27, rotation: 7, flip: false },
      { x: 0.917, y: -2.27, rotation: 2, flip: false },
      { x: 0.417, y: 3.23, rotation: 3, flip: false },
      { x: -0.083, y: -3.27, rotation: 4, flip: false },
      { x: 1.417, y: -0.27, rotation: 0, flip: false },
      { x: -0.583, y: -1.77, rotation: 3, flip: false }
    ]
  }
]);
var BASE_TEMPLATES = Object.freeze(
  BASE_TEMPLATE_POSES.map((template) => ({
    ...template,
    slots: template.poses.map((pose, index) => ({
      slotId: `${template.id}-${index + 1}`,
      type: SLOT_TYPES_BY_INDEX[index],
      x: pose.x,
      y: pose.y,
      rotation: normalizeRotationSteps(pose.rotation),
      flip: Boolean(pose.flip)
    }))
  }))
);
var rotateSlot = (slot, rotationSteps) => {
  const [nextX, nextY] = rotatePointBySteps([slot.x, slot.y], rotationSteps);
  return {
    ...slot,
    x: Number(nextX.toFixed(4)),
    y: Number(nextY.toFixed(4)),
    rotation: normalizeRotationSteps(slot.rotation + rotationSteps)
  };
};
var buildTangramChallenge = (matchId, locale = "es") => {
  const safeMatchId = Math.max(0, Number(matchId) || 0);
  const templateIndex = safeMatchId % BASE_TEMPLATES.length;
  const rotationVariant = Math.floor(safeMatchId / BASE_TEMPLATES.length) % 8;
  const baseTemplate = BASE_TEMPLATES[templateIndex];
  const challengeLabel = baseTemplate.label?.[locale] ?? baseTemplate.label?.en ?? baseTemplate.id;
  const slots = baseTemplate.slots.map((slot) => rotateSlot(slot, rotationVariant));
  return {
    id: `${baseTemplate.id}-r${rotationVariant}`,
    baseId: baseTemplate.id,
    label: challengeLabel,
    rotationVariant,
    slots
  };
};
var getBoardPoseFromSlot = (slot, boardConfig = TANGRAM_BOARD_CONFIG) => ({
  x: boardConfig.targetCenterX + slot.x * boardConfig.scale,
  y: boardConfig.targetCenterY + slot.y * boardConfig.scale,
  rotation: normalizeRotationSteps(slot.rotation),
  flip: Boolean(slot.flip)
});
var getBoardSlotsForChallenge = (challenge, boardConfig = TANGRAM_BOARD_CONFIG) => challenge.slots.map((slot) => ({ slot, pose: getBoardPoseFromSlot(slot, boardConfig) }));
var ROTATION_PERIOD_BY_TYPE = Object.freeze({
  square: 2,
  parallelogram: 4
});
var doesPieceRotationMatchSlot = (pieceType, pieceRotation, slotRotation) => {
  const delta = normalizeRotationSteps(pieceRotation - slotRotation);
  const period = ROTATION_PERIOD_BY_TYPE[pieceType] ?? 8;
  return delta % period === 0;
};
var createSeededRandom = (seed) => {
  let state = Number(seed) >>> 0 || 1;
  return () => {
    state = Math.imul(1664525, state) + 1013904223 >>> 0;
    return state / 4294967296;
  };
};
var BASE_TRAY_OFFSETS = Object.freeze([
  [-140, -140],
  [-140, 118],
  [-36, -18],
  [74, -150],
  [74, 122],
  [172, -44],
  [168, 132]
]);
var buildInitialTangramPieces = (matchId, boardConfig = TANGRAM_BOARD_CONFIG) => {
  const random = createSeededRandom((Number(matchId) || 0) + 31);
  return TANGRAM_PIECES.map((piece, index) => {
    const offset = BASE_TRAY_OFFSETS[index];
    const jitterX = (random() - 0.5) * 18;
    const jitterY = (random() - 0.5) * 18;
    return {
      ...piece,
      x: boardConfig.trayCenterX + offset[0] + jitterX,
      y: boardConfig.trayCenterY + offset[1] + jitterY,
      rotation: Math.floor(random() * 8),
      flip: piece.type === "parallelogram" ? random() < 0.5 : false,
      locked: false,
      targetSlotId: null
    };
  });
};
var findSnapCandidateForPiece = (piece, challenge, occupiedSlotIds, boardConfig = TANGRAM_BOARD_CONFIG) => {
  const occupied = occupiedSlotIds ?? /* @__PURE__ */ new Set();
  let bestCandidate = null;
  for (const slot of challenge.slots) {
    if (slot.type !== piece.type)
      continue;
    if (occupied.has(slot.slotId))
      continue;
    const pose = getBoardPoseFromSlot(slot, boardConfig);
    const distance = Math.hypot(piece.x - pose.x, piece.y - pose.y);
    if (distance > boardConfig.snapDistance)
      continue;
    if (!doesPieceRotationMatchSlot(piece.type, piece.rotation, pose.rotation))
      continue;
    if (piece.type === "parallelogram" && Boolean(piece.flip) !== Boolean(pose.flip))
      continue;
    if (!bestCandidate || distance < bestCandidate.distance) {
      bestCandidate = { slot, pose, distance };
    }
  }
  return bestCandidate;
};
var formatTangramElapsed = (milliseconds) => {
  const safeMs = Math.max(0, Number(milliseconds) || 0);
  const totalSeconds = Math.floor(safeMs / 1e3);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

// src/games/knowledge/TangramKnowledgeGame.jsx
var COPY = {
  es: {
    title: "Tangram Pro",
    subtitle: "Usa las 7 tans (2 triangulos grandes, 1 mediano, 2 pequenos, 1 cuadrado y 1 paralelogramo) para reconstruir la silueta.",
    match: "Partida",
    challenge: "Silueta",
    locked: "Encajadas",
    overlap: "Solapes",
    moves: "Movimientos",
    time: "Tiempo",
    status: "Estado",
    statusPlaying: "En curso",
    statusSolved: "Resuelto",
    restart: "Reiniciar",
    next: "Nueva silueta",
    hintOn: "Mostrar guia",
    hintOff: "Ocultar guia",
    rotateLeft: "Rotar -45",
    rotateRight: "Rotar +45",
    flip: "Voltear",
    snap: "Ajustar pieza",
    trayLabel: "Zona de piezas",
    targetLabel: "Objetivo",
    selected: "Pieza seleccionada",
    noneSelected: "Ninguna",
    help: "Arrastra piezas al objetivo. Q/E rotan, F voltea el paralelogramo, Enter intenta encajar, H alterna guia, R reinicia y N carga otra silueta.",
    startMessage: "Recrea la silueta usando las 7 tans sin solapar piezas.",
    moved: "Pieza movida.",
    snapped: "Pieza encajada.",
    rotated: "Rotacion aplicada.",
    flipped: "Volteo aplicado.",
    flipOnlyParallelogram: "Solo el paralelogramo necesita volteo.",
    overlapWarning: (count) => `Hay ${count} solape(s): separa piezas para validar.`,
    solved: (time) => `Silueta completada en ${time}.`,
    hintShown: "Guia visual activada.",
    hintHidden: "Guia visual desactivada."
  },
  en: {
    title: "Tangram Pro",
    subtitle: "Use all 7 tans (2 large triangles, 1 medium, 2 small, 1 square and 1 parallelogram) to rebuild the silhouette.",
    match: "Match",
    challenge: "Silhouette",
    locked: "Locked",
    overlap: "Overlaps",
    moves: "Moves",
    time: "Time",
    status: "Status",
    statusPlaying: "In progress",
    statusSolved: "Solved",
    restart: "Restart",
    next: "New silhouette",
    hintOn: "Show guide",
    hintOff: "Hide guide",
    rotateLeft: "Rotate -45",
    rotateRight: "Rotate +45",
    flip: "Flip",
    snap: "Snap piece",
    trayLabel: "Piece zone",
    targetLabel: "Target",
    selected: "Selected piece",
    noneSelected: "None",
    help: "Drag pieces into the target. Q/E rotate, F flips the parallelogram, Enter snaps, H toggles guide, R restarts, and N loads another silhouette.",
    startMessage: "Rebuild the silhouette using all 7 tans without overlapping pieces.",
    moved: "Piece moved.",
    snapped: "Piece snapped.",
    rotated: "Rotation applied.",
    flipped: "Flip applied.",
    flipOnlyParallelogram: "Only the parallelogram needs flipping.",
    overlapWarning: (count) => `${count} overlap(s) detected: separate pieces to validate.`,
    solved: (time) => `Silhouette completed in ${time}.`,
    hintShown: "Guide layer enabled.",
    hintHidden: "Guide layer hidden."
  }
};
var PIECE_LABEL_BY_TYPE = {
  es: {
    largeTriangle: "Triangulo grande",
    mediumTriangle: "Triangulo mediano",
    smallTriangle: "Triangulo pequeno",
    square: "Cuadrado",
    parallelogram: "Paralelogramo"
  },
  en: {
    largeTriangle: "Large triangle",
    mediumTriangle: "Medium triangle",
    smallTriangle: "Small triangle",
    square: "Square",
    parallelogram: "Parallelogram"
  }
};
var pointToString = (polygon) => polygon.map((point) => `${point[0].toFixed(2)},${point[1].toFixed(2)}`).join(" ");
var TANGRAM_BOARD_MARGIN = 18;
var getPolygonBounds = (polygon) => {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const [x, y] of polygon) {
    if (x < minX)
      minX = x;
    if (x > maxX)
      maxX = x;
    if (y < minY)
      minY = y;
    if (y > maxY)
      maxY = y;
  }
  return { minX, maxX, minY, maxY };
};
var confinePieceToBoard = (piece, boardConfig = TANGRAM_BOARD_CONFIG, margin = TANGRAM_BOARD_MARGIN) => {
  const polygon = getTangramPolygonForPiece(piece, boardConfig.scale);
  const bounds = getPolygonBounds(polygon);
  const minBoundX = margin;
  const maxBoundX = boardConfig.width - margin;
  const minBoundY = margin;
  const maxBoundY = boardConfig.height - margin;
  let shiftX = 0;
  if (bounds.minX < minBoundX) {
    shiftX = minBoundX - bounds.minX;
  } else if (bounds.maxX > maxBoundX) {
    shiftX = maxBoundX - bounds.maxX;
  }
  let shiftY = 0;
  if (bounds.minY < minBoundY) {
    shiftY = minBoundY - bounds.minY;
  } else if (bounds.maxY > maxBoundY) {
    shiftY = maxBoundY - bounds.maxY;
  }
  if (!shiftX && !shiftY)
    return piece;
  return {
    ...piece,
    x: piece.x + shiftX,
    y: piece.y + shiftY
  };
};
var getSvgPoint = (svg, event) => {
  if (!svg)
    return null;
  const matrix = svg.getScreenCTM();
  if (!matrix)
    return null;
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(matrix.inverse());
};
var collectOverlappingPieceIds = (pairs) => {
  const ids = /* @__PURE__ */ new Set();
  pairs.forEach(([leftId, rightId]) => {
    ids.add(leftId);
    ids.add(rightId);
  });
  return ids;
};
var createTangramState = (matchId, locale, copy) => {
  const challenge = buildTangramChallenge(matchId, locale);
  const pieces = buildInitialTangramPieces(matchId, TANGRAM_BOARD_CONFIG).map(
    (piece) => confinePieceToBoard(piece, TANGRAM_BOARD_CONFIG)
  );
  return {
    matchId,
    challenge,
    pieces,
    overlaps: computeTangramOverlapPairs(pieces, TANGRAM_BOARD_CONFIG.scale),
    selectedPieceId: pieces[0]?.id ?? null,
    status: "playing",
    moves: 0,
    elapsedMs: 0,
    hintVisible: false,
    hintsUsed: 0,
    message: copy.startMessage
  };
};
function TangramKnowledgeGame() {
  const locale = (0, import_react2.useMemo)(resolveKnowledgeArcadeLocale, []);
  const copy = (0, import_react2.useMemo)(() => COPY[locale] ?? COPY.en, [locale]);
  const pieceLabels = (0, import_react2.useMemo)(
    () => PIECE_LABEL_BY_TYPE[locale] ?? PIECE_LABEL_BY_TYPE.en,
    [locale]
  );
  const [state, setState] = (0, import_react2.useState)(
    () => createTangramState(getRandomKnowledgeMatchId(), locale, copy)
  );
  const svgRef = (0, import_react2.useRef)(null);
  const dragRef = (0, import_react2.useRef)(null);
  const stateRef = (0, import_react2.useRef)(state);
  (0, import_react2.useEffect)(() => {
    stateRef.current = state;
  }, [state]);
  const updateWithSelectionMutation = (0, import_react2.useCallback)((mutation, message) => {
    setState((previous) => {
      if (!previous.selectedPieceId)
        return previous;
      const pieceIndex = previous.pieces.findIndex((piece2) => piece2.id === previous.selectedPieceId);
      if (pieceIndex < 0)
        return previous;
      const piece = previous.pieces[pieceIndex];
      const mutatedPiece = confinePieceToBoard({
        ...mutation(piece),
        locked: false,
        targetSlotId: null
      }, TANGRAM_BOARD_CONFIG);
      const nextPieces = [...previous.pieces];
      nextPieces[pieceIndex] = mutatedPiece;
      const overlaps = computeTangramOverlapPairs(nextPieces, TANGRAM_BOARD_CONFIG.scale);
      return {
        ...previous,
        pieces: nextPieces,
        overlaps,
        status: "playing",
        moves: previous.moves + 1,
        message: overlaps.length ? copy.overlapWarning(overlaps.length) : message
      };
    });
  }, [copy]);
  const settlePiece = (0, import_react2.useCallback)((pieceId, moved = false) => {
    setState((previous) => {
      const pieceIndex = previous.pieces.findIndex((piece2) => piece2.id === pieceId);
      if (pieceIndex < 0)
        return previous;
      const piece = previous.pieces[pieceIndex];
      const occupiedSlotIds = new Set(
        previous.pieces.filter(
          (candidate) => candidate.id !== pieceId && candidate.locked && candidate.targetSlotId
        ).map((candidate) => candidate.targetSlotId)
      );
      const snapCandidate = findSnapCandidateForPiece(
        piece,
        previous.challenge,
        occupiedSlotIds,
        TANGRAM_BOARD_CONFIG
      );
      const nextPieces = [...previous.pieces];
      if (snapCandidate) {
        nextPieces[pieceIndex] = {
          ...piece,
          x: snapCandidate.pose.x,
          y: snapCandidate.pose.y,
          rotation: snapCandidate.pose.rotation,
          flip: snapCandidate.pose.flip,
          locked: true,
          targetSlotId: snapCandidate.slot.slotId
        };
      } else {
        nextPieces[pieceIndex] = {
          ...piece,
          locked: false,
          targetSlotId: null
        };
      }
      const overlaps = computeTangramOverlapPairs(nextPieces, TANGRAM_BOARD_CONFIG.scale);
      const solved = nextPieces.every((candidate) => candidate.locked) && overlaps.length === 0;
      const nextTime = formatTangramElapsed(previous.elapsedMs);
      let message = previous.message;
      if (solved) {
        message = copy.solved(nextTime);
      } else if (overlaps.length > 0) {
        message = copy.overlapWarning(overlaps.length);
      } else if (snapCandidate) {
        message = copy.snapped;
      } else if (moved) {
        message = copy.moved;
      }
      return {
        ...previous,
        pieces: nextPieces,
        overlaps,
        selectedPieceId: pieceId,
        status: solved ? "solved" : "playing",
        moves: moved ? previous.moves + 1 : previous.moves,
        message
      };
    });
  }, [copy]);
  const restart = (0, import_react2.useCallback)(() => {
    setState((previous) => createTangramState(previous.matchId, locale, copy));
  }, [copy, locale]);
  const nextChallenge = (0, import_react2.useCallback)(() => {
    setState(
      (previous) => createTangramState(getRandomKnowledgeMatchIdExcept(previous.matchId), locale, copy)
    );
  }, [copy, locale]);
  const rotateSelected = (0, import_react2.useCallback)((delta) => {
    updateWithSelectionMutation(
      (piece) => ({
        ...piece,
        rotation: normalizeRotationSteps(piece.rotation + delta)
      }),
      copy.rotated
    );
  }, [copy, updateWithSelectionMutation]);
  const flipSelected = (0, import_react2.useCallback)(() => {
    const selectedPiece2 = stateRef.current.pieces.find(
      (piece) => piece.id === stateRef.current.selectedPieceId
    );
    if (!selectedPiece2)
      return;
    if (selectedPiece2.type !== "parallelogram") {
      setState((previous) => ({ ...previous, message: copy.flipOnlyParallelogram }));
      return;
    }
    updateWithSelectionMutation(
      (piece) => ({
        ...piece,
        flip: !piece.flip
      }),
      copy.flipped
    );
  }, [copy, updateWithSelectionMutation]);
  const toggleHintLayer = (0, import_react2.useCallback)(() => {
    setState((previous) => {
      const nextVisible = !previous.hintVisible;
      return {
        ...previous,
        hintVisible: nextVisible,
        hintsUsed: nextVisible ? previous.hintsUsed + 1 : previous.hintsUsed,
        message: nextVisible ? copy.hintShown : copy.hintHidden
      };
    });
  }, [copy]);
  const snapSelectedPiece = (0, import_react2.useCallback)(() => {
    const selected = stateRef.current.selectedPieceId;
    if (!selected)
      return;
    settlePiece(selected, true);
  }, [settlePiece]);
  const onPiecePointerDown = (0, import_react2.useCallback)((event, pieceId) => {
    if (event.button !== 0)
      return;
    const point = getSvgPoint(svgRef.current, event);
    if (!point)
      return;
    const currentPiece = stateRef.current.pieces.find((piece) => piece.id === pieceId);
    if (!currentPiece)
      return;
    dragRef.current = {
      pieceId,
      pointerId: event.pointerId,
      offsetX: currentPiece.x - point.x,
      offsetY: currentPiece.y - point.y,
      moved: false
    };
    setState((previous) => ({
      ...previous,
      selectedPieceId: pieceId,
      pieces: previous.pieces.map(
        (piece) => piece.id === pieceId ? { ...piece, locked: false, targetSlotId: null } : piece
      ),
      status: "playing"
    }));
  }, []);
  (0, import_react2.useEffect)(() => {
    const onPointerMove = (event) => {
      const drag = dragRef.current;
      if (!drag)
        return;
      if (event.pointerId !== drag.pointerId)
        return;
      const point = getSvgPoint(svgRef.current, event);
      if (!point)
        return;
      drag.moved = true;
      setState((previous) => {
        const pieceIndex = previous.pieces.findIndex((piece) => piece.id === drag.pieceId);
        if (pieceIndex < 0)
          return previous;
        const nextPieces = [...previous.pieces];
        const currentPiece = nextPieces[pieceIndex];
        const confinedPiece = confinePieceToBoard(
          {
            ...currentPiece,
            x: point.x + drag.offsetX,
            y: point.y + drag.offsetY,
            locked: false,
            targetSlotId: null
          },
          TANGRAM_BOARD_CONFIG
        );
        nextPieces[pieceIndex] = {
          ...currentPiece,
          ...confinedPiece,
          locked: false,
          targetSlotId: null
        };
        return {
          ...previous,
          pieces: nextPieces,
          selectedPieceId: drag.pieceId
        };
      });
    };
    const onPointerRelease = (event) => {
      const drag = dragRef.current;
      if (!drag)
        return;
      if (event.pointerId !== drag.pointerId)
        return;
      dragRef.current = null;
      settlePiece(drag.pieceId, drag.moved);
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerRelease);
    window.addEventListener("pointercancel", onPointerRelease);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerRelease);
      window.removeEventListener("pointercancel", onPointerRelease);
    };
  }, [settlePiece]);
  (0, import_react2.useEffect)(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      const tagName = target?.tagName?.toLowerCase();
      const writing = tagName === "input" || tagName === "textarea" || target?.isContentEditable;
      if (writing)
        return;
      const key = event.key.toLowerCase();
      if (key === "r") {
        event.preventDefault();
        restart();
        return;
      }
      if (key === "n") {
        event.preventDefault();
        nextChallenge();
        return;
      }
      if (key === "q") {
        event.preventDefault();
        rotateSelected(-1);
        return;
      }
      if (key === "e") {
        event.preventDefault();
        rotateSelected(1);
        return;
      }
      if (key === "f") {
        event.preventDefault();
        flipSelected();
        return;
      }
      if (key === "h") {
        event.preventDefault();
        toggleHintLayer();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        snapSelectedPiece();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    flipSelected,
    nextChallenge,
    restart,
    rotateSelected,
    snapSelectedPiece,
    toggleHintLayer
  ]);
  (0, import_react2.useEffect)(() => {
    if (state.status !== "playing")
      return void 0;
    const timer = window.setInterval(() => {
      setState((previous) => previous.status === "playing" ? { ...previous, elapsedMs: previous.elapsedMs + 250 } : previous);
    }, 250);
    return () => window.clearInterval(timer);
  }, [state.status]);
  const payloadBuilder = (0, import_react2.useCallback)((snapshot) => {
    const targetSlots = getBoardSlotsForChallenge(snapshot.challenge, TANGRAM_BOARD_CONFIG);
    return {
      mode: "knowledge-arcade",
      variant: "tangram",
      coordinates: "svg_px_origin_top_left_xRight_yDown",
      locale,
      match: {
        current: snapshot.matchId + 1,
        total: KNOWLEDGE_ARCADE_MATCH_COUNT
      },
      challenge: {
        id: snapshot.challenge.id,
        label: snapshot.challenge.label,
        rotationVariant: snapshot.challenge.rotationVariant
      },
      board: {
        width: TANGRAM_BOARD_CONFIG.width,
        height: TANGRAM_BOARD_CONFIG.height,
        trayCenter: [TANGRAM_BOARD_CONFIG.trayCenterX, TANGRAM_BOARD_CONFIG.trayCenterY],
        targetCenter: [TANGRAM_BOARD_CONFIG.targetCenterX, TANGRAM_BOARD_CONFIG.targetCenterY]
      },
      progress: {
        status: snapshot.status,
        moves: snapshot.moves,
        elapsedMs: snapshot.elapsedMs,
        elapsedText: formatTangramElapsed(snapshot.elapsedMs),
        hintsUsed: snapshot.hintsUsed,
        overlapCount: snapshot.overlaps.length,
        lockedPieces: snapshot.pieces.filter((piece) => piece.locked).length
      },
      selectedPieceId: snapshot.selectedPieceId,
      message: snapshot.message,
      targetSlots: targetSlots.map((entry) => ({
        slotId: entry.slot.slotId,
        type: entry.slot.type,
        x: entry.pose.x,
        y: entry.pose.y,
        rotation: entry.pose.rotation,
        flip: entry.pose.flip
      })),
      overlaps: snapshot.overlaps.map((pair) => [...pair]),
      pieces: snapshot.pieces.map((piece) => ({
        id: piece.id,
        type: piece.type,
        x: Number(piece.x.toFixed(2)),
        y: Number(piece.y.toFixed(2)),
        rotation: piece.rotation,
        flip: piece.flip,
        locked: piece.locked,
        targetSlotId: piece.targetSlotId ?? null
      }))
    };
  }, [locale]);
  const advanceTime = (0, import_react2.useCallback)((milliseconds) => {
    setState((previous) => previous.status === "playing" ? { ...previous, elapsedMs: previous.elapsedMs + milliseconds } : previous);
  }, []);
  useGameRuntimeBridge(state, payloadBuilder, advanceTime);
  const selectedPiece = state.pieces.find((piece) => piece.id === state.selectedPieceId) ?? null;
  const overlapIds = collectOverlappingPieceIds(state.overlaps);
  const boardSlots = getBoardSlotsForChallenge(state.challenge, TANGRAM_BOARD_CONFIG);
  const orderedPieces = [...state.pieces].sort((leftPiece, rightPiece) => {
    const leftPriority = leftPiece.id === state.selectedPieceId ? 1 : 0;
    const rightPriority = rightPiece.id === state.selectedPieceId ? 1 : 0;
    return leftPriority - rightPriority;
  });
  const elapsedText = formatTangramElapsed(state.elapsedMs);
  const lockedCount = state.pieces.filter((piece) => piece.locked).length;
  return /* @__PURE__ */ import_react2.default.createElement("div", { className: "mini-game knowledge-game knowledge-arcade-game knowledge-tangram" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "mini-head" }, /* @__PURE__ */ import_react2.default.createElement("div", null, /* @__PURE__ */ import_react2.default.createElement("h4", null, copy.title), /* @__PURE__ */ import_react2.default.createElement("p", null, copy.subtitle)), /* @__PURE__ */ import_react2.default.createElement("div", { className: "tangram-head-actions" }, /* @__PURE__ */ import_react2.default.createElement(
    "button",
    {
      type: "button",
      className: "knowledge-ui-btn knowledge-ui-btn-secondary",
      onClick: nextChallenge
    },
    copy.next
  ), /* @__PURE__ */ import_react2.default.createElement(
    "button",
    {
      type: "button",
      className: "knowledge-ui-btn knowledge-ui-btn-primary",
      onClick: restart
    },
    copy.restart
  ))), /* @__PURE__ */ import_react2.default.createElement("section", { className: "knowledge-mode-shell tangram-shell" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "knowledge-status-row" }, /* @__PURE__ */ import_react2.default.createElement("span", null, copy.match, ": ", state.matchId + 1, "/", KNOWLEDGE_ARCADE_MATCH_COUNT), /* @__PURE__ */ import_react2.default.createElement("span", null, copy.challenge, ": ", state.challenge.label), /* @__PURE__ */ import_react2.default.createElement("span", null, copy.locked, ": ", lockedCount, "/", TANGRAM_PIECES.length), /* @__PURE__ */ import_react2.default.createElement("span", null, copy.overlap, ": ", state.overlaps.length), /* @__PURE__ */ import_react2.default.createElement("span", null, copy.moves, ": ", state.moves), /* @__PURE__ */ import_react2.default.createElement("span", null, copy.time, ": ", elapsedText), /* @__PURE__ */ import_react2.default.createElement("span", null, copy.status, ": ", state.status === "solved" ? copy.statusSolved : copy.statusPlaying)), /* @__PURE__ */ import_react2.default.createElement("p", { className: "tangram-help" }, copy.help), /* @__PURE__ */ import_react2.default.createElement("div", { className: "tangram-tools" }, /* @__PURE__ */ import_react2.default.createElement("span", null, copy.selected, ": ", selectedPiece ? pieceLabels[selectedPiece.type] : copy.noneSelected), /* @__PURE__ */ import_react2.default.createElement("div", { className: "tangram-tools-actions" }, /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "knowledge-ui-btn", onClick: () => rotateSelected(-1) }, copy.rotateLeft), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "knowledge-ui-btn", onClick: () => rotateSelected(1) }, copy.rotateRight), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "knowledge-ui-btn", onClick: flipSelected }, copy.flip), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "knowledge-ui-btn", onClick: snapSelectedPiece }, copy.snap), /* @__PURE__ */ import_react2.default.createElement(
    "button",
    {
      type: "button",
      className: `knowledge-ui-btn ${state.hintVisible ? "knowledge-ui-btn-accent" : ""}`.trim(),
      onClick: toggleHintLayer
    },
    state.hintVisible ? copy.hintOff : copy.hintOn
  ))), /* @__PURE__ */ import_react2.default.createElement("div", { className: "tangram-board-shell" }, /* @__PURE__ */ import_react2.default.createElement(
    "svg",
    {
      ref: svgRef,
      className: "tangram-board",
      viewBox: `0 0 ${TANGRAM_BOARD_CONFIG.width} ${TANGRAM_BOARD_CONFIG.height}`,
      role: "img",
      "aria-label": `${copy.title} ${state.challenge.label}`
    },
    /* @__PURE__ */ import_react2.default.createElement("rect", { className: "tangram-zone tangram-zone-tray", x: "18", y: "18", width: "430", height: "524", rx: "20" }),
    /* @__PURE__ */ import_react2.default.createElement("rect", { className: "tangram-zone tangram-zone-target", x: "498", y: "18", width: "464", height: "524", rx: "20" }),
    /* @__PURE__ */ import_react2.default.createElement("text", { className: "tangram-zone-label", x: "44", y: "58" }, copy.trayLabel),
    /* @__PURE__ */ import_react2.default.createElement("text", { className: "tangram-zone-label", x: "526", y: "58" }, copy.targetLabel),
    /* @__PURE__ */ import_react2.default.createElement("g", { className: "tangram-target-layer" }, boardSlots.map(({ slot, pose }) => {
      const polygon = transformTangramPolygon(
        TANGRAM_SHAPES_BY_TYPE[slot.type],
        pose,
        TANGRAM_BOARD_CONFIG.scale
      );
      return /* @__PURE__ */ import_react2.default.createElement(
        "polygon",
        {
          key: `target-${slot.slotId}`,
          className: "tangram-target-shape",
          points: pointToString(polygon)
        }
      );
    })),
    state.hintVisible ? /* @__PURE__ */ import_react2.default.createElement("g", { className: "tangram-hint-layer" }, boardSlots.map(({ slot, pose }) => {
      const polygon = transformTangramPolygon(
        TANGRAM_SHAPES_BY_TYPE[slot.type],
        pose,
        TANGRAM_BOARD_CONFIG.scale
      );
      return /* @__PURE__ */ import_react2.default.createElement(
        "polygon",
        {
          key: `hint-${slot.slotId}`,
          className: `tangram-hint-shape type-${slot.type}`,
          points: pointToString(polygon)
        }
      );
    })) : null,
    /* @__PURE__ */ import_react2.default.createElement("g", { className: "tangram-piece-layer" }, orderedPieces.map((piece) => {
      const polygon = getTangramPolygonForPiece(piece, TANGRAM_BOARD_CONFIG.scale);
      const className = [
        "tangram-piece",
        `type-${piece.type}`,
        piece.locked ? "locked" : "",
        piece.id === state.selectedPieceId ? "selected" : "",
        overlapIds.has(piece.id) ? "overlap" : ""
      ].filter(Boolean).join(" ");
      return /* @__PURE__ */ import_react2.default.createElement(
        "polygon",
        {
          key: piece.id,
          className,
          points: pointToString(polygon),
          style: { "--piece-color": piece.color },
          onPointerDown: (event) => onPiecePointerDown(event, piece.id)
        }
      );
    }))
  ))), /* @__PURE__ */ import_react2.default.createElement("p", { className: "game-message" }, state.message));
}
var TangramKnowledgeGame_default = TangramKnowledgeGame;
export {
  TangramKnowledgeGame_default as default
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
