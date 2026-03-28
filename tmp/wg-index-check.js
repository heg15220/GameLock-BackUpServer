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
        function useCallback(callback, deps) {
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
        exports.useCallback = useCallback;
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

// src/games/knowledge/wikipedia-gacha/index.jsx
var import_react2 = __toESM(require_react(), 1);

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

// src/games/knowledge/wikipedia-gacha/backendClient.js
var BACKEND_ROOT = import.meta.env.VITE_WIKIPEDIA_GACHA_BACKEND_URL ?? "http://127.0.0.1:8791";
async function request(path, options = {}) {
  const response = await fetch(`${BACKEND_ROOT}${path}`, {
    headers: {
      Accept: "application/json",
      ...options.body ? { "Content-Type": "application/json" } : {},
      ...options.headers ?? {}
    },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || `backend_${response.status}`);
    error.code = payload.error || `backend_${response.status}`;
    error.status = response.status;
    throw error;
  }
  return payload;
}
function authHeaders(browserToken) {
  return browserToken ? { "X-Browser-Token": browserToken } : {};
}
function bootstrapWikipediaGachaSession(payload = {}) {
  return request("/api/wikipedia-gacha/session/bootstrap", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
function fetchWikipediaGachaSession(browserToken) {
  return request("/api/wikipedia-gacha/session/me", {
    headers: authHeaders(browserToken)
  });
}
function fetchWikipediaGachaCollection(browserToken, params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === void 0 || value === null || value === "") {
      return;
    }
    search.set(key, String(value));
  });
  return request(`/api/wikipedia-gacha/collection?${search.toString()}`, {
    headers: authHeaders(browserToken)
  });
}
function fetchWikipediaGachaMissions(browserToken) {
  return request("/api/wikipedia-gacha/missions", {
    headers: authHeaders(browserToken)
  });
}
function fetchWikipediaGachaTrophies(browserToken, unlockedOnly = false) {
  return request(
    unlockedOnly ? "/api/wikipedia-gacha/trophies/unlocked" : "/api/wikipedia-gacha/trophies",
    {
      headers: authHeaders(browserToken)
    }
  );
}
function openWikipediaGachaPack(browserToken) {
  return request("/api/wikipedia-gacha/packs/open", {
    method: "POST",
    headers: authHeaders(browserToken),
    body: JSON.stringify({ browserToken })
  });
}
function toggleWikipediaGachaFavorite(browserToken, articleId, favorite) {
  return request(`/api/wikipedia-gacha/collection/${articleId}/favorite`, {
    method: "PATCH",
    headers: authHeaders(browserToken),
    body: JSON.stringify({ browserToken, favorite })
  });
}
function fetchWikipediaGachaArticle(browserToken, articleId) {
  return request(`/api/wikipedia-gacha/articles/${articleId}`, {
    headers: authHeaders(browserToken)
  });
}
function registerWikipediaGachaArticleClick(browserToken, articleId) {
  return request(`/api/wikipedia-gacha/articles/${articleId}/click`, {
    method: "POST",
    headers: authHeaders(browserToken),
    body: JSON.stringify({ browserToken })
  });
}
function claimWikipediaGachaMission(browserToken, missionId) {
  return request(`/api/wikipedia-gacha/missions/${missionId}/claim`, {
    method: "POST",
    headers: authHeaders(browserToken),
    body: JSON.stringify({ browserToken })
  });
}
function exportWikipediaGachaRecovery(browserToken) {
  return request("/api/wikipedia-gacha/recovery/export", {
    method: "POST",
    headers: authHeaders(browserToken),
    body: JSON.stringify({ browserToken })
  });
}
function importWikipediaGachaRecovery(browserToken, recoveryCode) {
  return request("/api/wikipedia-gacha/recovery/import", {
    method: "POST",
    headers: authHeaders(browserToken),
    body: JSON.stringify({ browserToken, recoveryCode })
  });
}

// src/games/knowledge/wikipedia-gacha/index.jsx
var STORAGE_KEY = "wikipedia_gacha_browser_token";
var TAB_ORDER = ["home", "packs", "collection", "missions", "trophies"];
var RARITY_ORDER = ["LR", "UR", "SSR", "SR", "R", "UC", "C"];
var TOP_TIER_RARITIES = new Set(RARITY_ORDER.slice(0, 2));
var PACK_PITY_TARGET = 10;
var PACK_REGEN_SECONDS = 60;
var RARITY_ACCENTS = {
  C: "#8e8a82",
  UC: "#7a93b8",
  R: "#3fcb6a",
  SR: "#48a2ff",
  SSR: "#ff7a4b",
  UR: "#ffca48",
  LR: "#f0edcd"
};
function formatCountdown(totalSeconds) {
  if (totalSeconds <= 0)
    return "00:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
function getErrorMessage(error, es) {
  if (error?.code === "invalid_browser_token") {
    return es ? "La sesion local del navegador ya no es valida. Recarga el juego para crear otra." : "The local browser session is no longer valid. Reload the game to create a fresh one.";
  }
  if (error?.code === "no_packs_available") {
    return es ? "No quedan sobres disponibles. Espera la recarga o reclama misiones." : "No packs are available. Wait for regeneration or claim missions.";
  }
  if (error?.message)
    return error.message;
  return es ? "No se puede contactar con el backend local de Wikipedia Gacha." : "I cannot reach the local Wikipedia Gacha backend.";
}
function getTitle(card) {
  return card?.title ?? card?.wikipediaTitle ?? "Unknown article";
}
function getRarity(card) {
  return card?.rarity ?? card?.rarityCode ?? "C";
}
function getDef(card) {
  return card?.def ?? card?.defStat ?? 0;
}
function normalizeArticleCopy(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}
function getBlurb(card) {
  const extract = normalizeArticleCopy(card?.cardDescription ?? card?.extractText ?? card?.description ?? card?.summary);
  if (extract)
    return extract;
  const flavor = normalizeArticleCopy(card?.flavorText);
  if (flavor)
    return flavor;
  return card?.topicGroup ? `${card.topicGroup} archive entry added to your browser vault.` : "Wikipedia entry archived for your browser collection.";
}
function getExtendedBlurb(card) {
  const detailedExtract = normalizeArticleCopy(
    card?.longExtractText ?? card?.extendedExtractText ?? card?.cardDescriptionLong ?? card?.longDescription
  );
  if (detailedExtract)
    return detailedExtract;
  return getBlurb(card);
}
function toCollectionParams(filters) {
  return {
    q: filters.query,
    rarity: filters.rarity || void 0,
    topicGroup: filters.topicGroup || void 0,
    favorite: filters.favorite ? true : void 0,
    duplicatesOnly: filters.duplicatesOnly ? true : void 0,
    sortBy: filters.sortBy,
    page: filters.page,
    pageSize: filters.pageSize
  };
}
function getDisplayPackStatus(packStatus) {
  const maxPacks = Math.max(0, Number(packStatus?.maxPacks) || 0);
  const rawAvailable = Math.max(0, Number(packStatus?.packsAvailable) || 0);
  return {
    ...packStatus,
    maxPacks,
    packsAvailable: maxPacks > 0 ? Math.min(maxPacks, rawAvailable) : rawAvailable
  };
}
function getPackFillPercent(packStatus) {
  if (!packStatus?.maxPacks)
    return 0;
  return Math.round(packStatus.packsAvailable / packStatus.maxPacks * 100);
}
function getPackRegenPercent(packStatus) {
  if (!packStatus)
    return 0;
  if (packStatus.packsAvailable >= packStatus.maxPacks)
    return 100;
  const seconds = Math.max(0, Number(packStatus.secondsUntilNextPack) || 0);
  return Math.round(
    (PACK_REGEN_SECONDS - Math.min(PACK_REGEN_SECONDS, seconds)) / PACK_REGEN_SECONDS * 100
  );
}
function getMissionPercent(mission) {
  const targetValue = Math.max(1, Number(mission?.targetValue) || 1);
  const progressValue = Math.max(0, Number(mission?.progressValue) || 0);
  return Math.max(0, Math.min(100, Math.round(progressValue / targetValue * 100)));
}
function formatDateTime(value, locale) {
  try {
    return new Date(value).toLocaleString(locale === "es" ? "es-ES" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  } catch (_error) {
    return value;
  }
}
function normalizeRewardType(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "pack")
    return "packs";
  if (normalized === "gem")
    return "gems";
  if (normalized === "shard")
    return "shards";
  if (normalized === "packs" || normalized === "gems" || normalized === "shards") {
    return normalized;
  }
  return "reward";
}
function getRewardTypeLabel(rewardType, es) {
  const normalized = normalizeRewardType(rewardType);
  if (normalized === "packs")
    return es ? "sobres" : "packs";
  if (normalized === "gems")
    return es ? "gemas" : "gems";
  if (normalized === "shards")
    return "shards";
  return es ? "recompensa" : "reward";
}
function getRewardSourceLabel(rewardSource, es) {
  if (rewardSource === "mission_claim") {
    return es ? "Mision" : "Mission";
  }
  if (rewardSource === "duplicate_cards") {
    return es ? "Duplicados" : "Duplicates";
  }
  return es ? "Sistema" : "System";
}
function buildClaimMessage(mission, es, fallbackMessage) {
  if (!mission)
    return fallbackMessage;
  return es ? `Recompensa reclamada: +${mission.rewardAmount} ${getRewardTypeLabel(mission.rewardType, true)}.` : `Reward claimed: +${mission.rewardAmount} ${getRewardTypeLabel(mission.rewardType, false)}.`;
}
function FavoriteIcon({ active }) {
  return /* @__PURE__ */ import_react2.default.createElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, /* @__PURE__ */ import_react2.default.createElement(
    "path",
    {
      d: "M12 17.7 6.1 21l1.6-6.6L2.6 10l6.7-.6L12 3.2l2.7 6.2 6.7.6-5.1 4.4 1.6 6.6Z",
      fill: active ? "currentColor" : "none",
      stroke: "currentColor",
      strokeWidth: "1.7",
      strokeLinejoin: "round"
    }
  ));
}
function InspectIcon() {
  return /* @__PURE__ */ import_react2.default.createElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, /* @__PURE__ */ import_react2.default.createElement("circle", { cx: "12", cy: "12", r: "8.25", fill: "none", stroke: "currentColor", strokeWidth: "1.8" }), /* @__PURE__ */ import_react2.default.createElement("path", { d: "M12 10.2v5", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" }), /* @__PURE__ */ import_react2.default.createElement("circle", { cx: "12", cy: "7.4", r: "1", fill: "currentColor" }));
}
function ExternalIcon() {
  return /* @__PURE__ */ import_react2.default.createElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, /* @__PURE__ */ import_react2.default.createElement(
    "path",
    {
      d: "M13 5h6v6M10 14 19 5M19 13v4.5A1.5 1.5 0 0 1 17.5 19h-11A1.5 1.5 0 0 1 5 17.5v-11A1.5 1.5 0 0 1 6.5 5H11",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }
  ));
}
function SummaryTile({ label, value, accent, note }) {
  return /* @__PURE__ */ import_react2.default.createElement("article", { className: "wg-summary-tile", style: { "--wg-summary-accent": accent } }, /* @__PURE__ */ import_react2.default.createElement("span", null, label), /* @__PURE__ */ import_react2.default.createElement("strong", null, value), note ? /* @__PURE__ */ import_react2.default.createElement("small", null, note) : null);
}
function RarityBadge({ rarity }) {
  return /* @__PURE__ */ import_react2.default.createElement(
    "span",
    {
      className: "wg-rarity-badge",
      style: { "--wg-rarity-accent": RARITY_ACCENTS[rarity] ?? "#8e8a82" }
    },
    rarity
  );
}
function TopicGlyph({ topicGroup }) {
  const normalized = String(topicGroup ?? "").toLowerCase();
  if (normalized.includes("people") || normalized.includes("persona") || normalized.includes("person")) {
    return /* @__PURE__ */ import_react2.default.createElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, /* @__PURE__ */ import_react2.default.createElement("circle", { cx: "12", cy: "8", r: "3.25", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ import_react2.default.createElement("path", { d: "M6.5 18.5c1.4-3 3.2-4.5 5.5-4.5s4.1 1.5 5.5 4.5", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }));
  }
  if (normalized.includes("bio") || normalized.includes("taxon") || normalized.includes("science")) {
    return /* @__PURE__ */ import_react2.default.createElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, /* @__PURE__ */ import_react2.default.createElement("path", { d: "M18.5 6.5c-6 0-10 3.7-10 9.5 5.8 0 9.5-4 9.5-10Z", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ import_react2.default.createElement("path", { d: "M8.5 16c1.4-1.4 3.2-3.2 6-4.8", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }));
  }
  if (normalized.includes("geo") || normalized.includes("location") || normalized.includes("places")) {
    return /* @__PURE__ */ import_react2.default.createElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, /* @__PURE__ */ import_react2.default.createElement("path", { d: "M12 20s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10Z", fill: "none", stroke: "currentColor", strokeWidth: "1.8" }), /* @__PURE__ */ import_react2.default.createElement("circle", { cx: "12", cy: "10", r: "2.1", fill: "none", stroke: "currentColor", strokeWidth: "1.8" }));
  }
  return /* @__PURE__ */ import_react2.default.createElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, /* @__PURE__ */ import_react2.default.createElement("path", { d: "M12 4 5 8v8l7 4 7-4V8Z", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinejoin: "round" }), /* @__PURE__ */ import_react2.default.createElement("path", { d: "M12 4v16M5 8l7 4 7-4", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinejoin: "round" }));
}
function StackCard({ card, archiveLabel, formatNumber, onOpen, onToggleFavorite, onCardActivate }) {
  const rarity = getRarity(card);
  const title = getTitle(card);
  const titleClassName = `wg-stack-title${title.length > 72 ? " is-longer" : title.length > 48 ? " is-long" : ""}`;
  const hasImage = Boolean(card?.imageUrl);
  const articleId = card.articleId ?? card.id;
  const topicLabel = card.topicGroup ?? archiveLabel;
  const qualityValue = Number.isFinite(Number(card?.qualityScore)) ? Number(card.qualityScore) : "--";
  const serialId = articleId ? String(articleId).padStart(4, "0") : "----";
  const handleActivate = () => {
    if (!articleId)
      return;
    if (typeof onCardActivate === "function") {
      onCardActivate(articleId);
      return;
    }
    if (typeof onOpen === "function")
      onOpen(articleId);
  };
  return /* @__PURE__ */ import_react2.default.createElement(
    "article",
    {
      className: "wg-stack-card",
      style: { "--wg-rarity-accent": RARITY_ACCENTS[rarity] ?? "#8e8a82" },
      role: "button",
      tabIndex: 0,
      onClick: handleActivate,
      onKeyDown: (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleActivate();
        }
      }
    },
    /* @__PURE__ */ import_react2.default.createElement(
      "button",
      {
        type: "button",
        className: `wg-stack-favorite${card.favorite ? " is-active" : ""}`,
        title: card.favorite ? "Remove favorite" : "Add favorite",
        "aria-label": card.favorite ? "Remove favorite" : "Add favorite",
        onClick: (event) => {
          event.stopPropagation();
          if (articleId && typeof onToggleFavorite === "function")
            onToggleFavorite(articleId, !card.favorite);
        }
      },
      /* @__PURE__ */ import_react2.default.createElement(FavoriteIcon, { active: Boolean(card.favorite) })
    ),
    /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-stack-frame" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-stack-fx" }), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-stack-inner" }, /* @__PURE__ */ import_react2.default.createElement("header", { className: "wg-stack-header" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-stack-header-main" }, /* @__PURE__ */ import_react2.default.createElement("span", { className: "wg-stack-rarity" }, rarity), /* @__PURE__ */ import_react2.default.createElement("span", { className: titleClassName }, title)), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-stack-header-meta" }, /* @__PURE__ */ import_react2.default.createElement("span", { className: "wg-stack-topic-tag" }, topicLabel), /* @__PURE__ */ import_react2.default.createElement("span", { className: "wg-stack-quality-badge" }, "Q ", qualityValue))), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-stack-art" }, /* @__PURE__ */ import_react2.default.createElement("span", { className: "wg-stack-topic", title: card.topicGroup ?? archiveLabel, "aria-label": card.topicGroup ?? archiveLabel }, /* @__PURE__ */ import_react2.default.createElement(TopicGlyph, { topicGroup: card.topicGroup })), hasImage ? /* @__PURE__ */ import_react2.default.createElement("img", { src: card.imageUrl, alt: title, loading: "lazy" }) : /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-stack-art-fallback" }, /* @__PURE__ */ import_react2.default.createElement("span", null, "W"), /* @__PURE__ */ import_react2.default.createElement("h2", null, title)), /* @__PURE__ */ import_react2.default.createElement(
      "button",
      {
        type: "button",
        className: "wg-stack-info",
        "data-no-stack-swipe": "1",
        "aria-label": "Inspect card",
        onClick: (event) => {
          event.stopPropagation();
          if (articleId && typeof onOpen === "function")
            onOpen(articleId);
        }
      },
      "i"
    )), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-stack-blurb" }, /* @__PURE__ */ import_react2.default.createElement("p", null, getBlurb(card))), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-stack-serial" }, /* @__PURE__ */ import_react2.default.createElement("span", null, "#", serialId), /* @__PURE__ */ import_react2.default.createElement("span", null, rarity), /* @__PURE__ */ import_react2.default.createElement("span", null, "x", formatNumber(card?.copies ?? 1))), /* @__PURE__ */ import_react2.default.createElement("footer", { className: "wg-stack-stats" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-stack-stat is-attack" }, /* @__PURE__ */ import_react2.default.createElement("span", null, "ATK"), /* @__PURE__ */ import_react2.default.createElement("strong", null, formatNumber(card.atk))), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-stack-stat is-defense" }, /* @__PURE__ */ import_react2.default.createElement("span", null, "DEF"), /* @__PURE__ */ import_react2.default.createElement("strong", null, formatNumber(getDef(card)))))))
  );
}
function DetailFlipCard({
  card,
  archiveLabel,
  formatNumber,
  isFlipped,
  onFlip,
  flipHint,
  flipBackHint,
  detailDescriptionTitle
}) {
  const rarity = getRarity(card);
  const title = getTitle(card);
  const detailText = getExtendedBlurb(card);
  return /* @__PURE__ */ import_react2.default.createElement(
    "div",
    {
      className: `wg-detail-flip${isFlipped ? " is-flipped" : ""}`,
      role: "button",
      tabIndex: 0,
      "aria-label": isFlipped ? flipBackHint : flipHint,
      onClick: onFlip,
      onKeyDown: (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onFlip();
        }
      }
    },
    /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-detail-flip-face is-front" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-detail-front-card" }, /* @__PURE__ */ import_react2.default.createElement(
      StackCard,
      {
        card,
        archiveLabel,
        formatNumber,
        onOpen: () => {
        },
        onToggleFavorite: () => {
        }
      }
    )), /* @__PURE__ */ import_react2.default.createElement("p", { className: "wg-detail-flip-hint" }, flipHint)),
    /* @__PURE__ */ import_react2.default.createElement("article", { className: "wg-detail-flip-face is-back" }, /* @__PURE__ */ import_react2.default.createElement("header", { className: "wg-detail-back-head" }, /* @__PURE__ */ import_react2.default.createElement(RarityBadge, { rarity }), /* @__PURE__ */ import_react2.default.createElement("span", { className: "wg-chip" }, card.topicGroup ?? archiveLabel)), /* @__PURE__ */ import_react2.default.createElement("h4", null, title), /* @__PURE__ */ import_react2.default.createElement("h5", null, detailDescriptionTitle), /* @__PURE__ */ import_react2.default.createElement("p", { className: "wg-detail-back-description" }, detailText), /* @__PURE__ */ import_react2.default.createElement("p", { className: "wg-detail-flip-hint" }, flipBackHint))
  );
}
function TrophyIcon({ iconKey }) {
  if (iconKey === "atom") {
    return /* @__PURE__ */ import_react2.default.createElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, /* @__PURE__ */ import_react2.default.createElement("circle", { cx: "12", cy: "12", r: "1.7", fill: "currentColor" }), /* @__PURE__ */ import_react2.default.createElement("ellipse", { cx: "12", cy: "12", rx: "8", ry: "3.4", fill: "none", stroke: "currentColor", strokeWidth: "1.5" }), /* @__PURE__ */ import_react2.default.createElement("ellipse", { cx: "12", cy: "12", rx: "3.4", ry: "8", fill: "none", stroke: "currentColor", strokeWidth: "1.5" }), /* @__PURE__ */ import_react2.default.createElement("path", { d: "M6.4 6.4c3.1 3.1 8.1 8.1 11.2 11.2", fill: "none", stroke: "currentColor", strokeWidth: "1.5" }));
  }
  if (iconKey === "laurel") {
    return /* @__PURE__ */ import_react2.default.createElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, /* @__PURE__ */ import_react2.default.createElement("path", { d: "M9 18c-3-1-4.8-3.6-5-7 2 .7 3.5 2.1 4.3 4.1M15 18c3-1 4.8-3.6 5-7-2 .7-3.5 2.1-4.3 4.1M12 8v11", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round" }));
  }
  if (iconKey === "shelf") {
    return /* @__PURE__ */ import_react2.default.createElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, /* @__PURE__ */ import_react2.default.createElement("path", { d: "M5 7h4v10H5zM10 5h4v12h-4zM15 8h4v9h-4zM4 18h16", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinejoin: "round" }));
  }
  if (iconKey === "echo") {
    return /* @__PURE__ */ import_react2.default.createElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, /* @__PURE__ */ import_react2.default.createElement("path", { d: "M6 12a6 6 0 0 1 6-6M4 12a8 8 0 0 1 8-8M18 12a6 6 0 0 0-6-6M20 12a8 8 0 0 0-8-8", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round" }));
  }
  if (iconKey === "gold-frame") {
    return /* @__PURE__ */ import_react2.default.createElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, /* @__PURE__ */ import_react2.default.createElement("rect", { x: "5", y: "5", width: "14", height: "14", rx: "2", fill: "none", stroke: "currentColor", strokeWidth: "1.7" }), /* @__PURE__ */ import_react2.default.createElement("rect", { x: "8", y: "8", width: "8", height: "8", rx: "1.2", fill: "none", stroke: "currentColor", strokeWidth: "1.7" }));
  }
  if (iconKey === "flare") {
    return /* @__PURE__ */ import_react2.default.createElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, /* @__PURE__ */ import_react2.default.createElement("path", { d: "m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinejoin: "round" }));
  }
  return /* @__PURE__ */ import_react2.default.createElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, /* @__PURE__ */ import_react2.default.createElement("path", { d: "m12 4 1.7 4.8L18.5 10l-4.8 1.2L12 16l-1.7-4.8L5.5 10l4.8-1.2Z", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinejoin: "round" }));
}
function MissionCard({ mission, title, progressLabel, rewardLabel, doneLabel, claimedLabel, claimLabel, activeLabel, busy, onClaim }) {
  const progressPercent = getMissionPercent(mission);
  const statusLabel = mission.claimed ? claimedLabel : mission.completed ? doneLabel : activeLabel;
  return /* @__PURE__ */ import_react2.default.createElement("article", { className: `wg-mission-card${mission.completed ? " is-completed" : ""}${mission.claimed ? " is-claimed" : ""}` }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-section-head" }, /* @__PURE__ */ import_react2.default.createElement("div", null, /* @__PURE__ */ import_react2.default.createElement("h3", null, mission.title), /* @__PURE__ */ import_react2.default.createElement("p", null, mission.description)), /* @__PURE__ */ import_react2.default.createElement("span", { className: `wg-mission-state${mission.completed ? " is-completed" : ""}${mission.claimed ? " is-claimed" : ""}` }, statusLabel)), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-mission-progress-head" }, /* @__PURE__ */ import_react2.default.createElement("span", null, progressLabel), /* @__PURE__ */ import_react2.default.createElement("strong", null, mission.progressValue, "/", mission.targetValue)), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-progress-bar" }, /* @__PURE__ */ import_react2.default.createElement("span", { style: { width: `${progressPercent}%` } })), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-row-meta" }, /* @__PURE__ */ import_react2.default.createElement("span", { className: "wg-pill-accent" }, rewardLabel, ": +", mission.rewardAmount, " ", mission.rewardType), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "wg-primary-btn", disabled: !mission.completed || mission.claimed || busy, onClick: () => onClaim(mission.id) }, mission.claimed ? claimedLabel : mission.completed ? claimLabel : activeLabel)));
}
function TrophyCard({ trophy, pointsLabel, unlockedLabel, lockedLabel }) {
  return /* @__PURE__ */ import_react2.default.createElement("article", { className: `wg-trophy-card${trophy.unlocked ? " is-unlocked" : ""}` }, /* @__PURE__ */ import_react2.default.createElement("span", { className: "wg-trophy-icon" }, /* @__PURE__ */ import_react2.default.createElement(TrophyIcon, { iconKey: trophy.iconKey })), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-trophy-copy" }, /* @__PURE__ */ import_react2.default.createElement("h3", null, trophy.name), /* @__PURE__ */ import_react2.default.createElement("p", null, trophy.description)), /* @__PURE__ */ import_react2.default.createElement("small", null, "+", trophy.points, " ", pointsLabel, " | ", trophy.unlocked ? unlockedLabel : lockedLabel));
}
function WikipediaGachaGame() {
  const browserLocale = (0, import_react2.useMemo)(resolveBrowserLanguage, []);
  const [locale, setLocale] = (0, import_react2.useState)(browserLocale);
  const es = locale === "es";
  const formatNumber = (0, import_react2.useMemo)(() => {
    const formatter = new Intl.NumberFormat(es ? "es-ES" : "en-US");
    return (value) => formatter.format(Number(value) || 0);
  }, [es]);
  const text = {
    archive: es ? "Archivo" : "Archive",
    quality: "Q",
    copies: es ? "Copias" : "Copies",
    shards: es ? "shards" : "shards",
    favoriteTag: "Fav",
    favoriteOnly: es ? "Solo favoritas" : "Favorites only",
    duplicateOnly: es ? "Solo duplicadas" : "Duplicates only",
    sync: es ? "Sincronizar" : "Sync",
    syncOk: es ? "Estado sincronizado." : "State synced.",
    openPack: es ? "Abrir sobre" : "Open pack",
    opening: es ? "Abriendo..." : "Opening...",
    inspect: es ? "Inspeccionar" : "Inspect",
    wikipedia: "Wikipedia",
    close: es ? "Cerrar" : "Close",
    exportCode: es ? "Exportar codigo" : "Export code",
    importCode: es ? "Importar codigo" : "Import code",
    recoveryOk: es ? "Coleccion restaurada." : "Collection restored.",
    exportOk: es ? "Codigo de respaldo generado." : "Backup code generated.",
    claimOk: es ? "Recompensa reclamada." : "Reward claimed.",
    dailyPacks: es ? "Sobres diarios" : "Daily packs",
    nextPack: es ? "Siguiente sobre" : "Next pack",
    gems: es ? "Gemas" : "Gems",
    trophyPoints: es ? "Puntos trofeo" : "Trophy pts",
    unique: es ? "Unicas" : "Unique",
    missionsReady: es ? "Misiones listas" : "Missions ready",
    trophiesUnlocked: es ? "Trofeos abiertos" : "Trophies unlocked",
    totalPulls: es ? "Tiradas totales" : "Total pulls",
    packFull: es ? "Sobres al maximo" : "Packs full",
    searchPlaceholder: es ? "Buscar por titulo..." : "Search by title...",
    rarityPlaceholder: es ? "Rareza" : "Rarity",
    topicPlaceholder: es ? "Tema" : "Topic",
    noSource: es ? "Sin enlace" : "No source",
    categories: es ? "Categorias" : "Categories",
    noCategories: es ? "Sin categorias" : "No categories",
    reward: es ? "Recompensa" : "Reward",
    progress: es ? "Progreso" : "Progress",
    done: es ? "Completada" : "Completed",
    claimed: es ? "Reclamada" : "Claimed",
    claim: es ? "Reclamar" : "Claim",
    active: es ? "En curso" : "In progress",
    unlocked: es ? "Desbloqueado" : "Unlocked",
    locked: es ? "Bloqueado" : "Locked",
    points: es ? "Puntos" : "Points",
    guaranteed: es ? "SR+ garantizado" : "Guaranteed SR+",
    newCard: es ? "Nueva" : "New",
    duplicateCard: es ? "Duplicada" : "Duplicate",
    pending: es ? "Pendiente" : "Pending",
    rail: es ? "Slots del sobre" : "Pack slots",
    reveal: es ? "Reveal de sobre" : "Pack reveal",
    currentPack: es ? "Sobre actual" : "Current pack",
    latestPack: es ? "Ultimo pack" : "Latest pack",
    gachaTab: "Gacha",
    collectionTab: es ? "Coleccion" : "Collection",
    battleTab: es ? "Cartas" : "Cards",
    missionsTab: es ? "Misiones" : "Missions",
    trophiesTab: es ? "Trofeos" : "Trophies",
    packsReady: es ? "Sobres cargados" : "Packs full",
    specialPackReady: es ? "Sobre especial listo" : "Special pack ready",
    specialPackHint: es ? "Se activa cada 10 sobres y garantiza al menos 1 carta SR+." : "It unlocks every 10 packs and guarantees at least 1 SR+ card.",
    tapToOpen: es ? "\u25B2 TOCA PARA ABRIR \u25B2" : "\u25B2 TAP TO OPEN \u25B2",
    quickRules: es ? "Reglas rapidas" : "Quick rules",
    support: es ? "Soporte" : "Support",
    missionRewardNote: es ? "Recompensa: +2 sobres por mision completada" : "Reward: +2 packs per completed mission",
    noPackCards: es ? "Abre un sobre para cargar cartas en la baraja." : "Open a pack to load cards into the deck.",
    fullHandReady: es ? "Todas vistas: mazo en mano." : "All seen: full hand view.",
    tapToFlip: es ? "Toca la carta para girarla." : "Tap the card to flip it.",
    tapToNextCard: es ? "Toca de nuevo para pasar a la siguiente." : "Tap again to move to the next card.",
    dailyMissionUnlocked: es ? "Mision diaria desbloqueada" : "Daily mission unlocked",
    topRarityPull: es ? "Drop de rareza maxima" : "Top-tier rarity pull",
    topRarityPullHint: es ? "Has obtenido una carta de las rarezas mas altas." : "You pulled at least one card from the top rarities.",
    cardCarousel: es ? "Carrusel de cartas" : "Card carousel",
    sourceLink: es ? "Ver fuente" : "View source",
    backToGacha: es ? "Volver al Gacha" : "Back to Gacha",
    detailFlipHint: es ? "Haz click en la carta para ver mas descripcion." : "Click the card to read more description.",
    detailFlipBackHint: es ? "Haz click para volver al frente." : "Click to flip back to the front.",
    detailDescriptionTitle: es ? "Descripcion extendida" : "Extended description",
    pullsUntilGold: es ? "sobres hasta sobre especial" : "packs until special pack",
    rewardVaultTitle: es ? "Boveda de recompensas" : "Reward vault",
    rewardVaultSubtitle: es ? "Las recompensas de misiones quedan registradas y disponibles para usar al instante." : "Mission rewards are logged and become instantly usable.",
    rewardVaultHint: es ? "Ultimas recompensas de misiones" : "Latest mission rewards",
    noMissionRewards: es ? "Todavia no has reclamado recompensas de mision hoy." : "You have not claimed mission rewards yet today.",
    rewardHistoryTitle: es ? "Historial de recompensas" : "Reward history",
    rewardHistorySubtitle: es ? "Todo lo reclamado y su utilidad directa." : "Everything claimed and its immediate utility.",
    claimedAt: es ? "Reclamada" : "Claimed",
    rewardSource: es ? "Origen" : "Source",
    useRewardsNow: es ? "Usar recompensas" : "Use rewards now",
    reviewMissions: es ? "Ver misiones" : "Review missions",
    unknownMission: es ? "Mision diaria" : "Daily mission",
    totalMissionRewards: es ? "Total reclamado hoy" : "Total claimed today"
  };
  const [activeTab, setActiveTab] = (0, import_react2.useState)("home");
  const [nowMs, setNowMs] = (0, import_react2.useState)(() => Date.now());
  const [dashboardStampMs, setDashboardStampMs] = (0, import_react2.useState)(() => Date.now());
  const [browserToken, setBrowserToken] = (0, import_react2.useState)(() => window.localStorage.getItem(STORAGE_KEY) ?? "");
  const [dashboard, setDashboard] = (0, import_react2.useState)(null);
  const [collection, setCollection] = (0, import_react2.useState)({ items: [], total: 0, page: 1, pageSize: 12, availableTopics: [], summary: null });
  const [missions, setMissions] = (0, import_react2.useState)({ missions: [], summary: null });
  const [trophies, setTrophies] = (0, import_react2.useState)({ trophies: [], summary: null });
  const [collectionFilters, setCollectionFilters] = (0, import_react2.useState)({ query: "", rarity: "", topicGroup: "", favorite: false, duplicatesOnly: false, sortBy: "recent", page: 1, pageSize: 12 });
  const [packResult, setPackResult] = (0, import_react2.useState)(null);
  const [revealCursor, setRevealCursor] = (0, import_react2.useState)(0);
  const [revealFace, setRevealFace] = (0, import_react2.useState)("back");
  const [seenPackCardIndices, setSeenPackCardIndices] = (0, import_react2.useState)([]);
  const [fanShiftDirection, setFanShiftDirection] = (0, import_react2.useState)("");
  const [handCenterIndex, setHandCenterIndex] = (0, import_react2.useState)(0);
  const [packHeroAnimState, setPackHeroAnimState] = (0, import_react2.useState)("idle");
  const [selectedArticle, setSelectedArticle] = (0, import_react2.useState)(null);
  const [detailCardFlipped, setDetailCardFlipped] = (0, import_react2.useState)(false);
  const [recoveryCode, setRecoveryCode] = (0, import_react2.useState)("");
  const [recoveryImport, setRecoveryImport] = (0, import_react2.useState)("");
  const [loading, setLoading] = (0, import_react2.useState)(true);
  const [busy, setBusy] = (0, import_react2.useState)(false);
  const [errorMessage, setErrorMessage] = (0, import_react2.useState)("");
  const [statusMessage, setStatusMessage] = (0, import_react2.useState)("");
  const [missionUnlockFeed, setMissionUnlockFeed] = (0, import_react2.useState)([]);
  const [rareDropFx, setRareDropFx] = (0, import_react2.useState)(null);
  const tokenRef = (0, import_react2.useRef)(browserToken);
  const nowRef = (0, import_react2.useRef)(nowMs);
  const autoRefreshKeyRef = (0, import_react2.useRef)("");
  const packHeroTimeoutsRef = (0, import_react2.useRef)([]);
  const revealFlipTimeoutRef = (0, import_react2.useRef)(null);
  const fanShiftTimeoutRef = (0, import_react2.useRef)(null);
  const missionFeedTimeoutsRef = (0, import_react2.useRef)([]);
  const rareDropTimeoutRef = (0, import_react2.useRef)(null);
  (0, import_react2.useEffect)(() => {
    tokenRef.current = browserToken;
  }, [browserToken]);
  (0, import_react2.useEffect)(() => {
    nowRef.current = nowMs;
  }, [nowMs]);
  (0, import_react2.useEffect)(() => {
    setDetailCardFlipped(false);
  }, [selectedArticle?.articleId, selectedArticle?.id]);
  const clearPackHeroTimeouts = () => {
    packHeroTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    packHeroTimeoutsRef.current = [];
  };
  const clearRevealTimeouts = () => {
    if (revealFlipTimeoutRef.current) {
      window.clearTimeout(revealFlipTimeoutRef.current);
      revealFlipTimeoutRef.current = null;
    }
  };
  const clearFanShiftTimeout = () => {
    if (fanShiftTimeoutRef.current) {
      window.clearTimeout(fanShiftTimeoutRef.current);
      fanShiftTimeoutRef.current = null;
    }
  };
  const clearMissionFeedTimeouts = () => {
    missionFeedTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    missionFeedTimeoutsRef.current = [];
  };
  const clearRareDropTimeout = () => {
    if (rareDropTimeoutRef.current) {
      window.clearTimeout(rareDropTimeoutRef.current);
      rareDropTimeoutRef.current = null;
    }
  };
  (0, import_react2.useEffect)(
    () => () => {
      clearPackHeroTimeouts();
      clearRevealTimeouts();
      clearFanShiftTimeout();
      clearMissionFeedTimeouts();
      clearRareDropTimeout();
    },
    []
  );
  (0, import_react2.useEffect)(() => {
    const intervalId = window.setInterval(() => setNowMs((current) => current + 200), 200);
    return () => window.clearInterval(intervalId);
  }, []);
  (0, import_react2.useEffect)(() => {
    const bootstrap = async () => {
      setLoading(true);
      try {
        let token = tokenRef.current;
        if (!token) {
          token = (await bootstrapWikipediaGachaSession()).browserToken;
          window.localStorage.setItem(STORAGE_KEY, token);
          setBrowserToken(token);
        }
        try {
          const [dashboardData, collectionData, missionsData, trophiesData] = await Promise.all([
            fetchWikipediaGachaSession(token),
            fetchWikipediaGachaCollection(token, toCollectionParams(collectionFilters)),
            fetchWikipediaGachaMissions(token),
            fetchWikipediaGachaTrophies(token)
          ]);
          setDashboard(dashboardData);
          setDashboardStampMs(nowRef.current);
          setCollection(collectionData);
          setMissions(missionsData);
          setTrophies(trophiesData);
        } catch (error) {
          if (error?.code !== "invalid_browser_token")
            throw error;
          window.localStorage.removeItem(STORAGE_KEY);
          const freshToken = (await bootstrapWikipediaGachaSession()).browserToken;
          window.localStorage.setItem(STORAGE_KEY, freshToken);
          setBrowserToken(freshToken);
          const [dashboardData, collectionData, missionsData, trophiesData] = await Promise.all([
            fetchWikipediaGachaSession(freshToken),
            fetchWikipediaGachaCollection(freshToken, toCollectionParams(collectionFilters)),
            fetchWikipediaGachaMissions(freshToken),
            fetchWikipediaGachaTrophies(freshToken)
          ]);
          setDashboard(dashboardData);
          setDashboardStampMs(nowRef.current);
          setCollection(collectionData);
          setMissions(missionsData);
          setTrophies(trophiesData);
        }
      } catch (error) {
        setErrorMessage(getErrorMessage(error, es));
      } finally {
        setLoading(false);
      }
    };
    void bootstrap();
  }, []);
  (0, import_react2.useEffect)(() => {
    if (!browserToken)
      return void 0;
    const timeoutId = window.setTimeout(() => {
      void fetchWikipediaGachaCollection(browserToken, toCollectionParams(collectionFilters)).then(setCollection).catch((error) => setErrorMessage(getErrorMessage(error, es)));
    }, 180);
    return () => window.clearTimeout(timeoutId);
  }, [browserToken, collectionFilters, es]);
  const refreshAll = async (message = "") => {
    if (!tokenRef.current)
      return null;
    const sessionToken = tokenRef.current;
    setBusy(true);
    setErrorMessage("");
    try {
      const [dashboardResult, collectionResult, missionsResult, trophiesResult] = await Promise.allSettled([
        fetchWikipediaGachaSession(sessionToken),
        fetchWikipediaGachaCollection(sessionToken, toCollectionParams(collectionFilters)),
        fetchWikipediaGachaMissions(sessionToken),
        fetchWikipediaGachaTrophies(sessionToken)
      ]);
      if (dashboardResult.status !== "fulfilled") {
        throw dashboardResult.reason;
      }
      const dashboardData = dashboardResult.value;
      const collectionData = collectionResult.status === "fulfilled" ? collectionResult.value : null;
      const missionsData = missionsResult.status === "fulfilled" ? missionsResult.value : null;
      const trophiesData = trophiesResult.status === "fulfilled" ? trophiesResult.value : null;
      setDashboard(dashboardData);
      setDashboardStampMs(nowRef.current);
      if (collectionData)
        setCollection(collectionData);
      if (missionsData)
        setMissions(missionsData);
      if (trophiesData)
        setTrophies(trophiesData);
      if (collectionResult.status !== "fulfilled" || missionsResult.status !== "fulfilled" || trophiesResult.status !== "fulfilled") {
        const partialErrors = [collectionResult, missionsResult, trophiesResult].filter((result) => result.status !== "fulfilled").map((result) => result.reason);
        console.warn("[wikipedia-gacha] partial refresh failed", partialErrors);
      }
      if (message)
        setStatusMessage(message);
      return { dashboardData, collectionData, missionsData, trophiesData };
    } catch (error) {
      setErrorMessage(getErrorMessage(error, es));
      return null;
    } finally {
      setBusy(false);
    }
  };
  const showMissionUnlockFeed = (missionsUnlocked) => {
    if (!missionsUnlocked.length)
      return;
    const baseTime = Date.now();
    const entries = missionsUnlocked.slice(0, 3).map((mission, index) => ({
      id: `mission-unlock-${mission.id}-${baseTime}-${index}`,
      title: mission.title,
      rewardAmount: mission.rewardAmount,
      rewardType: mission.rewardType
    }));
    setMissionUnlockFeed((current) => [...current, ...entries].slice(-4));
    entries.forEach((entry, index) => {
      const timeoutId = window.setTimeout(() => {
        setMissionUnlockFeed((current) => current.filter((notice) => notice.id !== entry.id));
        missionFeedTimeoutsRef.current = missionFeedTimeoutsRef.current.filter((scheduled) => scheduled !== timeoutId);
      }, 4300 + index * 240);
      missionFeedTimeoutsRef.current.push(timeoutId);
    });
  };
  const showTopRarityFx = (packCards) => {
    const topRarityCards = packCards.filter((card) => TOP_TIER_RARITIES.has(getRarity(card)));
    if (!topRarityCards.length)
      return;
    const rarities = [...new Set(topRarityCards.map((card) => getRarity(card)))].sort(
      (left, right) => RARITY_ORDER.indexOf(left) - RARITY_ORDER.indexOf(right)
    );
    const eventId = `top-rarity-${Date.now()}`;
    setRareDropFx({ id: eventId, rarities, topRarity: rarities[0] ?? "UR" });
    clearRareDropTimeout();
    rareDropTimeoutRef.current = window.setTimeout(() => {
      setRareDropFx((current) => current?.id === eventId ? null : current);
      rareDropTimeoutRef.current = null;
    }, 2200);
  };
  const livePackStatus = (0, import_react2.useMemo)(() => {
    if (!dashboard?.packStatus)
      return null;
    const elapsedSeconds = Math.floor((nowMs - dashboardStampMs) / 1e3);
    return getDisplayPackStatus({
      ...dashboard.packStatus,
      secondsUntilNextPack: Math.max(0, dashboard.packStatus.secondsUntilNextPack - elapsedSeconds)
    });
  }, [dashboard, dashboardStampMs, nowMs]);
  (0, import_react2.useEffect)(() => {
    if (!browserToken || !dashboard?.packStatus || !livePackStatus)
      return;
    if (dashboard.packStatus.packsAvailable >= dashboard.packStatus.maxPacks)
      return;
    if (livePackStatus.secondsUntilNextPack !== 0)
      return;
    const refreshKey = `${dashboard.packStatus.packsAvailable}:${dashboard.packStatus.lastPackRegenAt}`;
    if (autoRefreshKeyRef.current === refreshKey)
      return;
    autoRefreshKeyRef.current = refreshKey;
    void refreshAll();
  }, [browserToken, dashboard, livePackStatus]);
  const revealedCount = packResult ? Math.max(0, Math.min(packResult.cards.length, Math.floor((nowMs - packResult.startedAtMs) / 240))) : 0;
  const currentPackCards = packResult?.cards ?? dashboard?.recentPackHistory?.[0]?.cards ?? [];
  const visiblePackCards = packResult ? currentPackCards.slice(0, Math.max(1, revealedCount)) : currentPackCards;
  const packDeckSignature = (0, import_react2.useMemo)(
    () => currentPackCards.map((card, index) => String(card.articleId ?? card.id ?? `${getTitle(card)}-${index}`)).join("|"),
    [currentPackCards]
  );
  const clampedRevealCursor = Math.max(0, Math.min(revealCursor, Math.max(0, currentPackCards.length - 1)));
  const focusedPackCard = currentPackCards[clampedRevealCursor] ?? null;
  const focusedPackDeckIndex = clampedRevealCursor;
  const canCyclePackDeck = currentPackCards.length > 1;
  const allPackCardsSeen = currentPackCards.length > 0 && seenPackCardIndices.length >= currentPackCards.length;
  const revealHistoryIndices = (0, import_react2.useMemo)(
    () => seenPackCardIndices.filter((index) => index < clampedRevealCursor).sort((a, b) => a - b).slice(-4),
    [seenPackCardIndices, clampedRevealCursor]
  );
  const clampedHandCenterIndex = Math.max(0, Math.min(handCenterIndex, Math.max(0, currentPackCards.length - 1)));
  const activePackDeckIndex = allPackCardsSeen ? clampedHandCenterIndex : focusedPackDeckIndex;
  const activePackCard = allPackCardsSeen ? currentPackCards[clampedHandCenterIndex] ?? focusedPackCard : focusedPackCard;
  (0, import_react2.useEffect)(() => {
    clearRevealTimeouts();
    clearFanShiftTimeout();
    setFanShiftDirection("");
    setRevealCursor(0);
    setRevealFace("back");
    setSeenPackCardIndices([]);
    setHandCenterIndex(0);
  }, [packDeckSignature]);
  const handleOpenPack = async () => {
    if (!tokenRef.current || busy || loading)
      return;
    setBusy(true);
    setErrorMessage("");
    setStatusMessage("");
    try {
      const previousMissionsById = new Map(
        (missions.missions ?? []).map((mission) => [mission.id, { completed: Boolean(mission.completed) }])
      );
      const result = await openWikipediaGachaPack(tokenRef.current);
      setPackResult({ ...result, startedAtMs: nowRef.current + 120 });
      setDashboard((current) => {
        if (!current)
          return current;
        const parsedPityCounter = Number(result.pityCounter);
        const parsedPacksRemaining = Number(result.packStatus?.packsAvailable ?? result.packsRemaining);
        const parsedTotalPackOpens = Number(result.totalPackOpens);
        const hasPityCounter = Number.isFinite(parsedPityCounter);
        const hasPacksRemaining = Number.isFinite(parsedPacksRemaining);
        const hasTotalPackOpens = Number.isFinite(parsedTotalPackOpens);
        const nextPityCounter = hasPityCounter ? Math.max(0, Math.min(PACK_PITY_TARGET, Math.floor(parsedPityCounter))) : current.packStatus?.pityCounter ?? 0;
        const nextPackStatus = getDisplayPackStatus(
          result.packStatus ? result.packStatus : {
            ...current.packStatus ?? {},
            packsAvailable: hasPacksRemaining ? Math.max(0, parsedPacksRemaining) : current.packStatus?.packsAvailable,
            pityCounter: nextPityCounter,
            nextPackGuaranteedSrPlus: nextPityCounter >= PACK_PITY_TARGET
          }
        );
        return {
          ...current,
          profile: {
            ...current.profile ?? {},
            packsAvailable: hasPacksRemaining ? Math.max(0, parsedPacksRemaining) : current.profile?.packsAvailable,
            pityCounter: nextPityCounter,
            totalPackOpens: hasTotalPackOpens ? Math.max(0, Math.floor(parsedTotalPackOpens)) : current.profile?.totalPackOpens
          },
          packStatus: nextPackStatus
        };
      });
      setDashboardStampMs(nowRef.current);
      setActiveTab("packs");
      showTopRarityFx(result.cards ?? []);
      const refreshed = await refreshAll();
      const updatedMissions = refreshed?.missionsData?.missions ?? [];
      if (updatedMissions.length) {
        const unlockedNow = updatedMissions.filter((mission) => {
          if (!mission.completed || mission.claimed)
            return false;
          return !previousMissionsById.get(mission.id)?.completed;
        });
        showMissionUnlockFeed(unlockedNow);
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, es));
    } finally {
      setBusy(false);
    }
  };
  const handleOpenPackFromHero = () => {
    if (!tokenRef.current || busy || loading || packHeroAnimState !== "idle")
      return;
    if ((packStatus?.packsAvailable ?? 0) <= 0)
      return;
    clearPackHeroTimeouts();
    setPackHeroAnimState("priming");
    const burstTimeoutId = window.setTimeout(() => {
      setPackHeroAnimState("burst");
    }, 560);
    const openTimeoutId = window.setTimeout(() => {
      setActiveTab("packs");
      void handleOpenPack();
    }, 820);
    const resetTimeoutId = window.setTimeout(() => {
      setPackHeroAnimState("idle");
    }, 1800);
    packHeroTimeoutsRef.current.push(burstTimeoutId, openTimeoutId, resetTimeoutId);
  };
  const handleRevealCurrentCard = () => {
    if (allPackCardsSeen)
      return;
    if (!currentPackCards.length)
      return;
    if (revealFace !== "back")
      return;
    clearRevealTimeouts();
    setRevealFace("flipping");
    revealFlipTimeoutRef.current = window.setTimeout(() => {
      setRevealFace("front");
      revealFlipTimeoutRef.current = null;
    }, 320);
  };
  const handleAdvanceRevealedCard = () => {
    if (allPackCardsSeen)
      return;
    if (!currentPackCards.length)
      return;
    if (revealFace !== "front")
      return;
    const revealedIndex = clampedRevealCursor;
    const lastIndex = Math.max(0, currentPackCards.length - 1);
    const isLastCard = revealedIndex >= lastIndex;
    setSeenPackCardIndices((current) => current.includes(revealedIndex) ? current : [...current, revealedIndex]);
    if (isLastCard) {
      setHandCenterIndex(revealedIndex);
      return;
    }
    setRevealCursor(revealedIndex + 1);
    setRevealFace("back");
  };
  const handleRevealStep = () => {
    if (revealFace === "back") {
      handleRevealCurrentCard();
      return;
    }
    if (revealFace === "front")
      handleAdvanceRevealedCard();
  };
  const handleShiftPackDeck = (direction) => {
    if (!canCyclePackDeck || fanShiftDirection)
      return;
    if (allPackCardsSeen) {
      const nextIndex = Math.max(0, Math.min(clampedHandCenterIndex + direction, currentPackCards.length - 1));
      if (nextIndex === clampedHandCenterIndex)
        return;
      clearFanShiftTimeout();
      setFanShiftDirection(direction < 0 ? "left" : "right");
      fanShiftTimeoutRef.current = window.setTimeout(() => {
        setFanShiftDirection("");
        fanShiftTimeoutRef.current = null;
      }, 460);
      setHandCenterIndex(nextIndex);
      return;
    }
  };
  const handleSelectPackSlot = (targetDeckIndex) => {
    if (allPackCardsSeen) {
      if (targetDeckIndex === clampedHandCenterIndex)
        return;
      const direction = targetDeckIndex > clampedHandCenterIndex ? 1 : -1;
      clearFanShiftTimeout();
      setFanShiftDirection(direction < 0 ? "left" : "right");
      fanShiftTimeoutRef.current = window.setTimeout(() => {
        setFanShiftDirection("");
        fanShiftTimeoutRef.current = null;
      }, 460);
      setHandCenterIndex(targetDeckIndex);
      return;
    }
    clearRevealTimeouts();
    setRevealCursor(targetDeckIndex);
    setRevealFace("back");
  };
  const handleToggleFavorite = async (articleId, favorite) => {
    if (!tokenRef.current)
      return;
    try {
      const updated = await toggleWikipediaGachaFavorite(tokenRef.current, articleId, favorite);
      setCollection((current) => ({
        ...current,
        items: current.items.map((item) => item.articleId === articleId ? { ...item, favorite: updated.favorite } : item)
      }));
      if ((selectedArticle?.articleId ?? selectedArticle?.id) === articleId) {
        setSelectedArticle((current) => current ? { ...current, favorite: updated.favorite } : current);
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, es));
    }
  };
  const handleSelectArticle = async (articleId) => {
    if (!tokenRef.current)
      return;
    try {
      setSelectedArticle(await fetchWikipediaGachaArticle(tokenRef.current, articleId));
    } catch (error) {
      setErrorMessage(getErrorMessage(error, es));
    }
  };
  const handleOpenSource = async (article) => {
    if (!tokenRef.current || !article?.articleId || !article?.sourceUrl)
      return;
    try {
      await registerWikipediaGachaArticleClick(tokenRef.current, article.articleId);
      window.open(article.sourceUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, es));
    }
  };
  const handleClaimMission = async (missionId) => {
    if (!tokenRef.current)
      return;
    setBusy(true);
    try {
      const claimResult = await claimWikipediaGachaMission(tokenRef.current, missionId);
      await refreshAll(buildClaimMessage(claimResult?.mission, es, text.claimOk));
    } catch (error) {
      setErrorMessage(getErrorMessage(error, es));
    } finally {
      setBusy(false);
    }
  };
  const handleExportRecovery = async () => {
    if (!tokenRef.current)
      return;
    setBusy(true);
    try {
      const result = await exportWikipediaGachaRecovery(tokenRef.current);
      setRecoveryCode(result.recoveryCode);
      setStatusMessage(text.exportOk);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, es));
    } finally {
      setBusy(false);
    }
  };
  const handleImportRecovery = async () => {
    if (!tokenRef.current || !recoveryImport.trim())
      return;
    setBusy(true);
    try {
      await importWikipediaGachaRecovery(tokenRef.current, recoveryImport.trim());
      setRecoveryImport("");
      await refreshAll(text.recoveryOk);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, es));
    } finally {
      setBusy(false);
    }
  };
  (0, import_react2.useEffect)(() => {
    const handleKeydown = (event) => {
      if (["INPUT", "TEXTAREA"].includes(event.target?.tagName))
        return;
      if (["1", "2", "3", "4", "5"].includes(event.key))
        setActiveTab(TAB_ORDER[Number(event.key) - 1]);
      if ((event.key === " " || event.key === "Enter") && activeTab === "packs") {
        event.preventDefault();
        if (currentPackCards.length && !allPackCardsSeen) {
          handleRevealStep();
        } else if (!currentPackCards.length) {
          void handleOpenPack();
        }
      }
      if (event.key === "ArrowLeft" && activeTab === "packs" && currentPackCards.length > 1 && allPackCardsSeen) {
        event.preventDefault();
        handleShiftPackDeck(-1);
      }
      if (event.key === "ArrowRight" && activeTab === "packs" && currentPackCards.length > 1) {
        event.preventDefault();
        if (allPackCardsSeen) {
          handleShiftPackDeck(1);
        } else {
          handleRevealStep();
        }
      }
      if (event.key.toLowerCase() === "r")
        void refreshAll(text.syncOk);
      if (event.key === "Escape")
        setSelectedArticle(null);
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [activeTab, currentPackCards.length, text.syncOk, canCyclePackDeck, allPackCardsSeen, revealFace, clampedRevealCursor]);
  const packStatus = livePackStatus ?? getDisplayPackStatus(dashboard?.packStatus ?? null);
  const pityPullsRemaining = packStatus ? Math.max(0, PACK_PITY_TARGET - (packStatus.pityCounter ?? 0)) : PACK_PITY_TARGET;
  const specialPackReady = Boolean(packStatus?.nextPackGuaranteedSrPlus);
  const packFillPercent = getPackFillPercent(packStatus);
  const packRegenPercent = getPackRegenPercent(packStatus);
  const collectionSummary = collection.summary ?? dashboard?.collectionSummary ?? { uniqueCards: 0, totalCopies: 0, favorites: 0, rarityBreakdown: {} };
  const missionSummary = missions.summary ?? dashboard?.missionSummary ?? { total: 0, completed: 0, claimable: 0 };
  const trophySummary = trophies.summary ?? dashboard?.trophySummary ?? { total: 0, unlocked: 0, points: 0 };
  const historyEntries = dashboard?.recentPackHistory ?? [];
  const recentRewardEvents = dashboard?.recentRewardEvents ?? [];
  const missionRewardHistory = (0, import_react2.useMemo)(
    () => recentRewardEvents.filter((entry) => entry.rewardSource === "mission_claim"),
    [recentRewardEvents]
  );
  const missionRewardTotals = (0, import_react2.useMemo)(
    () => missionRewardHistory.reduce(
      (accumulator, rewardEntry) => {
        const rewardType = normalizeRewardType(rewardEntry.rewardType);
        if (rewardType === "packs" || rewardType === "gems" || rewardType === "shards") {
          accumulator[rewardType] += Number(rewardEntry.rewardAmount) || 0;
        }
        return accumulator;
      },
      { packs: 0, gems: 0, shards: 0 }
    ),
    [missionRewardHistory]
  );
  const packSlots = Array.from({ length: Math.max(currentPackCards.length || 0, 5) }, (_, index) => currentPackCards[index] ?? null);
  const packMetaSource = packResult ?? historyEntries[0] ?? null;
  const collectionTotalPages = Math.max(1, Math.ceil(collection.total / (collection.pageSize || 1)));
  const sortOptions = [
    { value: "recent", label: es ? "Recientes" : "Recent" },
    { value: "rarity_desc", label: es ? "Rareza" : "Rarity" },
    { value: "atk_desc", label: "ATK" },
    { value: "def_desc", label: "DEF" },
    { value: "title_asc", label: es ? "Nombre" : "Name" }
  ];
  const navTabs = [
    { id: "home", label: text.gachaTab },
    { id: "collection", label: text.collectionTab },
    { id: "packs", label: text.battleTab },
    { id: "missions", label: text.missionsTab },
    { id: "trophies", label: text.trophiesTab }
  ];
  const focusedPackSource = activePackCard ?? currentPackCards[0] ?? null;
  useGameRuntimeBridge(
    {
      mode: loading ? "loading" : errorMessage ? "error" : "ready",
      coordinateSystem: "ui_dom_top_left_x_right_y_down",
      activeTab,
      browserTokenSuffix: browserToken ? browserToken.slice(-8) : null,
      profile: {
        packsAvailable: packStatus?.packsAvailable ?? 0,
        maxPacks: packStatus?.maxPacks ?? 0,
        gems: dashboard?.profile?.gems ?? 0,
        shards: dashboard?.profile?.shards ?? 0,
        trophiesPoints: dashboard?.profile?.trophiesPoints ?? 0,
        pityCounter: packStatus?.pityCounter ?? 0,
        secondsUntilNextPack: packStatus?.secondsUntilNextPack ?? 0,
        nextPackGuaranteedSrPlus: Boolean(packStatus?.nextPackGuaranteedSrPlus)
      },
      collection: {
        total: collection.total,
        page: collection.page,
        visibleItems: collection.items.length,
        filters: {
          q: collectionFilters.query,
          rarity: collectionFilters.rarity,
          topicGroup: collectionFilters.topicGroup,
          favorite: collectionFilters.favorite,
          duplicatesOnly: collectionFilters.duplicatesOnly
        }
      },
      latestPack: currentPackCards.length ? {
        packOpeningId: packMetaSource?.packOpeningId ?? null,
        guaranteedSrPlus: Boolean(packMetaSource?.guaranteedSrPlus),
        revealedCount: visiblePackCards.length,
        totalCards: currentPackCards.length,
        cards: currentPackCards.map((card, index) => ({
          title: getTitle(card),
          rarity: getRarity(card),
          wasNew: Boolean(card.wasNew),
          visible: index < visiblePackCards.length
        }))
      } : null,
      missions: {
        total: missionSummary.total ?? 0,
        completed: missionSummary.completed ?? 0,
        claimable: missionSummary.claimable ?? 0
      },
      missionRewards: {
        totalLogged: missionRewardHistory.length,
        totalsByType: missionRewardTotals,
        latest: missionRewardHistory.length ? {
          rewardType: normalizeRewardType(missionRewardHistory[0].rewardType),
          rewardAmount: missionRewardHistory[0].rewardAmount ?? 0,
          missionTitle: missionRewardHistory[0].missionTitle ?? null
        } : null
      },
      trophies: {
        total: trophySummary.total ?? 0,
        unlocked: trophySummary.unlocked ?? 0,
        points: trophySummary.points ?? 0
      },
      selectedArticle: selectedArticle ? {
        articleId: selectedArticle.articleId ?? selectedArticle.id,
        title: getTitle(selectedArticle),
        rarity: getRarity(selectedArticle)
      } : null
    },
    (state) => state,
    (ms) => setNowMs((current) => current + ms)
  );
  return /* @__PURE__ */ import_react2.default.createElement("section", { className: "wg-shell antialiased" }, /* @__PURE__ */ import_react2.default.createElement("nav", { className: "wg-top-nav" }, /* @__PURE__ */ import_react2.default.createElement(
    "button",
    {
      type: "button",
      className: "wg-top-icon wg-lang-toggle",
      "aria-label": es ? "Switch to English" : "Cambiar a Espanol",
      onClick: () => setLocale((current) => current === "es" ? "en" : "es")
    },
    es ? "EN" : "ES"
  ), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-top-tabs" }, navTabs.map((tab) => /* @__PURE__ */ import_react2.default.createElement(
    "button",
    {
      key: tab.id,
      type: "button",
      className: `wg-top-tab${activeTab === tab.id ? " is-active" : ""}`,
      onClick: () => setActiveTab(tab.id)
    },
    tab.label
  ))), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-top-tools" }, /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "wg-top-icon wg-top-icon-info", "aria-label": text.sync, onClick: () => void refreshAll(text.syncOk) }, "?"))), /* @__PURE__ */ import_react2.default.createElement("div", { className: `wg-live-feedback-layer${activeTab === "packs" ? " is-packs" : ""}`, "aria-live": "polite" }, rareDropFx ? /* @__PURE__ */ import_react2.default.createElement("div", { className: `wg-rare-drop-fx is-${String(rareDropFx.topRarity).toLowerCase()}` }, /* @__PURE__ */ import_react2.default.createElement("span", { className: "wg-rare-drop-kicker" }, text.topRarityPull), /* @__PURE__ */ import_react2.default.createElement("strong", null, rareDropFx.rarities.join(" \xB7 ")), /* @__PURE__ */ import_react2.default.createElement("p", null, text.topRarityPullHint)) : null, missionUnlockFeed.length ? /* @__PURE__ */ import_react2.default.createElement("aside", { className: "wg-mission-unlock-stack" }, missionUnlockFeed.map((notice) => /* @__PURE__ */ import_react2.default.createElement("article", { key: notice.id, className: "wg-mission-unlock-toast" }, /* @__PURE__ */ import_react2.default.createElement("header", null, /* @__PURE__ */ import_react2.default.createElement("strong", null, text.dailyMissionUnlocked), /* @__PURE__ */ import_react2.default.createElement("span", null, "+", notice.rewardAmount, " ", String(notice.rewardType).toUpperCase())), /* @__PURE__ */ import_react2.default.createElement("p", null, notice.title)))) : null), /* @__PURE__ */ import_react2.default.createElement("main", { className: "wg-main-content" }, errorMessage ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-banner is-error" }, errorMessage) : null, statusMessage ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-banner is-ok" }, statusMessage) : null, loading ? /* @__PURE__ */ import_react2.default.createElement("section", { className: "wg-panel" }, "Bootstrapping browser archive...") : null, !loading && activeTab === "home" ? /* @__PURE__ */ import_react2.default.createElement("section", { className: "wg-home-stage" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-home-center" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-pack-status-pill" }, /* @__PURE__ */ import_react2.default.createElement("span", null, text.dailyPacks, ":"), /* @__PURE__ */ import_react2.default.createElement("strong", null, packStatus?.packsAvailable ?? "--", " / ", packStatus?.maxPacks ?? "--")), /* @__PURE__ */ import_react2.default.createElement("p", { className: "wg-pack-subline" }, packStatus && packStatus.packsAvailable >= packStatus.maxPacks ? text.packsReady : `${text.nextPack}: ${formatCountdown(packStatus?.secondsUntilNextPack ?? 0)}`), /* @__PURE__ */ import_react2.default.createElement("p", { className: "wg-pack-progress" }, pityPullsRemaining <= 0 ? text.guaranteed : `${pityPullsRemaining} ${text.pullsUntilGold}`), specialPackReady ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-special-pack-banner" }, /* @__PURE__ */ import_react2.default.createElement("strong", null, text.specialPackReady), /* @__PURE__ */ import_react2.default.createElement("p", null, text.specialPackHint)) : null, /* @__PURE__ */ import_react2.default.createElement(
    "button",
    {
      type: "button",
      id: "gacha-pack-container",
      className: `wg-pack-hero${packHeroAnimState !== "idle" ? " is-opening" : ""}${packHeroAnimState === "burst" ? " is-burst" : ""}${specialPackReady ? " is-special" : ""}`,
      onClick: handleOpenPackFromHero,
      disabled: busy || packHeroAnimState !== "idle" || (packStatus?.packsAvailable ?? 0) <= 0
    },
    /* @__PURE__ */ import_react2.default.createElement("span", { className: "wg-pack-hero-aura", "aria-hidden": "true" }),
    /* @__PURE__ */ import_react2.default.createElement("span", { className: "wg-pack-hero-rim", "aria-hidden": "true" }),
    /* @__PURE__ */ import_react2.default.createElement("span", { className: "wg-pack-hero-spark is-1", "aria-hidden": "true" }),
    /* @__PURE__ */ import_react2.default.createElement("span", { className: "wg-pack-hero-spark is-2", "aria-hidden": "true" }),
    /* @__PURE__ */ import_react2.default.createElement("span", { className: "wg-pack-hero-spark is-3", "aria-hidden": "true" }),
    /* @__PURE__ */ import_react2.default.createElement("span", { className: "wg-pack-hero-spark is-4", "aria-hidden": "true" }),
    /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-pack-hero-art" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-pack-envelope" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-pack-envelope-paper" }), /* @__PURE__ */ import_react2.default.createElement("img", { className: "wg-pack-logo-globe", src: "/wikipedia-logo-globe.png", alt: "Wikipedia globe logo" }), /* @__PURE__ */ import_react2.default.createElement("img", { className: "wg-pack-logo-w", src: "/wikipedia-logo-w.png", alt: "Wikipedia W logo" }))),
    /* @__PURE__ */ import_react2.default.createElement("span", { className: "wg-pack-call-action" }, packHeroAnimState === "idle" ? specialPackReady ? text.specialPackReady : text.tapToOpen : text.opening)
  )), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-home-intel-grid" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-home-mission-card" }, /* @__PURE__ */ import_react2.default.createElement("h3", null, text.missionsTab), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-home-mission-list" }, missions.missions.length ? missions.missions.slice(0, 5).map((mission) => /* @__PURE__ */ import_react2.default.createElement("article", { key: mission.id, className: "wg-home-mission-row" }, /* @__PURE__ */ import_react2.default.createElement("span", null, mission.title), /* @__PURE__ */ import_react2.default.createElement("span", null, mission.progressValue, "/", mission.targetValue))) : /* @__PURE__ */ import_react2.default.createElement("p", { className: "wg-empty" }, es ? "No hay misiones activas." : "No active missions.")), /* @__PURE__ */ import_react2.default.createElement("p", { className: "wg-mission-reward-note" }, text.missionRewardNote)))) : null, !loading && activeTab === "packs" ? /* @__PURE__ */ import_react2.default.createElement("section", { className: "wg-stack-panel" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-stack-shell is-deck" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-stack-track" }, currentPackCards.length ? allPackCardsSeen ? /* @__PURE__ */ import_react2.default.createElement("div", { className: `wg-hand-wrap${fanShiftDirection ? ` is-shifting-${fanShiftDirection}` : ""}` }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-hand-shell" }, canCyclePackDeck ? /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, /* @__PURE__ */ import_react2.default.createElement(
    "button",
    {
      type: "button",
      className: "wg-hand-nav is-prev",
      "aria-label": es ? "Mover mazo a la izquierda" : "Move deck left",
      onClick: () => handleShiftPackDeck(-1),
      disabled: Boolean(fanShiftDirection) || clampedHandCenterIndex <= 0
    },
    "<"
  ), /* @__PURE__ */ import_react2.default.createElement(
    "button",
    {
      type: "button",
      className: "wg-hand-nav is-next",
      "aria-label": es ? "Mover mazo a la derecha" : "Move deck right",
      onClick: () => handleShiftPackDeck(1),
      disabled: Boolean(fanShiftDirection) || clampedHandCenterIndex >= currentPackCards.length - 1
    },
    ">"
  )) : null, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-hand-viewport" }, currentPackCards.map((card, index) => {
    const offset = index - clampedHandCenterIndex;
    if (Math.abs(offset) > 4)
      return null;
    const depth = Math.abs(offset);
    const translateX = offset * 16;
    const translateY = depth * 8;
    const scale = Math.max(0.88, 1 - depth * 0.03);
    const rotate = offset * 2;
    const layer = 120 - depth;
    const isActive = offset === 0;
    return /* @__PURE__ */ import_react2.default.createElement(
      "div",
      {
        key: `${card.articleId ?? card.id ?? getTitle(card)}-${index}`,
        className: `wg-hand-layer${isActive ? " is-active" : ""}`,
        style: {
          "--wg-hand-x": `${translateX}px`,
          "--wg-hand-y": `${translateY}px`,
          "--wg-hand-scale": scale,
          "--wg-hand-rotate": `${rotate}deg`,
          "--wg-hand-z": layer
        }
      },
      /* @__PURE__ */ import_react2.default.createElement(
        StackCard,
        {
          card,
          archiveLabel: text.archive,
          formatNumber,
          onOpen: (articleId) => void handleSelectArticle(articleId),
          onToggleFavorite: (articleId, favorite) => void handleToggleFavorite(articleId, favorite),
          onCardActivate: () => {
            const articleId = card.articleId ?? card.id;
            if (articleId)
              void handleSelectArticle(articleId);
          }
        }
      )
    );
  })))) : /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-deck-stage" }, revealHistoryIndices.map((historyIndex, listIndex) => {
    const historyCard = currentPackCards[historyIndex];
    if (!historyCard)
      return null;
    const distance = revealHistoryIndices.length - listIndex;
    const translateX = -Math.min(176, 56 + (distance - 1) * 42);
    const translateY = 8 + distance * 8;
    const scale = Math.max(0.88, 1 - distance * 0.03);
    const rotate = -distance * 2;
    const layer = 104 - distance;
    return /* @__PURE__ */ import_react2.default.createElement(
      "div",
      {
        key: `revealed-left-${historyIndex}`,
        className: "wg-stack-layer wg-deck-history-layer",
        style: {
          "--wg-stack-x": `${translateX}px`,
          "--wg-stack-y": `${translateY}px`,
          "--wg-stack-scale": scale,
          "--wg-stack-rotate": `${rotate}deg`,
          "--wg-stack-z": layer
        }
      },
      /* @__PURE__ */ import_react2.default.createElement(
        StackCard,
        {
          card: historyCard,
          archiveLabel: text.archive,
          formatNumber,
          onOpen: (articleId) => void handleSelectArticle(articleId),
          onToggleFavorite: (articleId, favorite) => void handleToggleFavorite(articleId, favorite)
        }
      )
    );
  }), focusedPackCard ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-stack-layer is-active wg-deck-active" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: `wg-reveal-flip${revealFace === "back" ? "" : " is-flipped"}${revealFace === "flipping" ? " is-animating" : ""}` }, /* @__PURE__ */ import_react2.default.createElement(
    "button",
    {
      type: "button",
      className: "wg-reveal-face is-back",
      "aria-label": text.tapToFlip,
      onClick: handleRevealCurrentCard,
      style: { "--wg-rarity-accent": RARITY_ACCENTS[getRarity(focusedPackCard)] ?? "#8e8a82" }
    },
    /* @__PURE__ */ import_react2.default.createElement("span", { className: "wg-reveal-back-glow", "aria-hidden": "true" }),
    /* @__PURE__ */ import_react2.default.createElement("span", { className: "wg-reveal-back-frame", "aria-hidden": "true" }),
    /* @__PURE__ */ import_react2.default.createElement("span", { className: "wg-reveal-back-mark" }, /* @__PURE__ */ import_react2.default.createElement("img", { src: "/wikipedia-logo-w.png", alt: "Wikipedia W logo" }))
  ), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-reveal-face is-front" }, /* @__PURE__ */ import_react2.default.createElement(
    StackCard,
    {
      card: focusedPackCard,
      archiveLabel: text.archive,
      formatNumber,
      onOpen: (articleId) => void handleSelectArticle(articleId),
      onToggleFavorite: (articleId, favorite) => void handleToggleFavorite(articleId, favorite),
      onCardActivate: handleAdvanceRevealedCard
    }
  )))) : null) : /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-pack-empty-state" }, /* @__PURE__ */ import_react2.default.createElement("p", null, text.noPackCards), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "wg-primary-btn", onClick: () => void handleOpenPack() }, busy ? text.opening : text.openPack)))), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-stack-footer" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-back-gacha-wrap" }, /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "wg-back-gacha-btn", onClick: () => setActiveTab("home") }, text.backToGacha)), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-pack-actions-row" }, /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "wg-primary-btn", onClick: () => void handleOpenPack() }, busy ? text.opening : text.openPack), /* @__PURE__ */ import_react2.default.createElement(
    "button",
    {
      type: "button",
      className: "wg-secondary-btn with-icon",
      onClick: () => focusedPackSource && void handleSelectArticle(focusedPackSource.articleId),
      disabled: !focusedPackSource
    },
    /* @__PURE__ */ import_react2.default.createElement(InspectIcon, null),
    /* @__PURE__ */ import_react2.default.createElement("span", null, text.inspect)
  ), /* @__PURE__ */ import_react2.default.createElement(
    "button",
    {
      type: "button",
      className: "wg-secondary-btn with-icon",
      onClick: () => focusedPackSource && void handleOpenSource({ articleId: focusedPackSource.articleId, sourceUrl: focusedPackSource.sourceUrl }),
      disabled: !focusedPackSource?.sourceUrl
    },
    /* @__PURE__ */ import_react2.default.createElement(ExternalIcon, null),
    /* @__PURE__ */ import_react2.default.createElement("span", null, text.sourceLink)
  )), canCyclePackDeck && !allPackCardsSeen ? /* @__PURE__ */ import_react2.default.createElement("p", { className: "wg-deck-hint" }, revealFace === "front" ? text.tapToNextCard : text.tapToFlip) : null, allPackCardsSeen ? /* @__PURE__ */ import_react2.default.createElement("p", { className: "wg-deck-hint" }, text.fullHandReady) : null, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-stack-slots" }, packSlots.map((card, index) => /* @__PURE__ */ import_react2.default.createElement(
    "button",
    {
      key: `slot-${index}`,
      type: "button",
      className: `wg-stack-slot${activePackDeckIndex === index ? " is-active" : ""}`,
      onClick: () => {
        if (!card)
          return;
        handleSelectPackSlot(index);
      },
      disabled: !card || !allPackCardsSeen && index !== clampedRevealCursor
    },
    /* @__PURE__ */ import_react2.default.createElement("span", null, "#", index + 1),
    /* @__PURE__ */ import_react2.default.createElement("strong", null, card ? `${getRarity(card)} - ${getTitle(card)}` : text.pending)
  ))))) : null, !loading && activeTab === "collection" ? /* @__PURE__ */ import_react2.default.createElement("section", { className: "wg-panel" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-section-head" }, /* @__PURE__ */ import_react2.default.createElement("div", null, /* @__PURE__ */ import_react2.default.createElement("h3", null, es ? "Coleccion" : "Collection"), /* @__PURE__ */ import_react2.default.createElement("p", null, es ? "La tabla se convierte en una galeria real de cartas." : "The utilitarian table becomes a real card gallery.")), /* @__PURE__ */ import_react2.default.createElement("span", { className: "wg-pill-muted" }, text.totalPulls, ": ", dashboard?.profile?.totalPackOpens ?? 0)), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-summary-grid is-collection" }, /* @__PURE__ */ import_react2.default.createElement(SummaryTile, { label: es ? "Copias" : "Copies", value: formatNumber(collectionSummary.totalCopies), accent: "#48a2ff" }), /* @__PURE__ */ import_react2.default.createElement(SummaryTile, { label: es ? "Favoritas" : "Favorites", value: formatNumber(collectionSummary.favorites), accent: "#ff7a4b" }), /* @__PURE__ */ import_react2.default.createElement(SummaryTile, { label: text.unique, value: formatNumber(collectionSummary.uniqueCards), accent: "#3fcb6a" })), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-rarity-summary-grid" }, RARITY_ORDER.map((rarity) => /* @__PURE__ */ import_react2.default.createElement("article", { key: rarity, className: "wg-rarity-summary-card", style: { "--wg-rarity-accent": RARITY_ACCENTS[rarity] ?? "#8e8a82" } }, /* @__PURE__ */ import_react2.default.createElement(RarityBadge, { rarity }), /* @__PURE__ */ import_react2.default.createElement("strong", null, collectionSummary.rarityBreakdown?.[rarity] ?? 0)))), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-filter-shell" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-filter-grid" }, /* @__PURE__ */ import_react2.default.createElement("input", { type: "text", value: collectionFilters.query, placeholder: text.searchPlaceholder, onChange: (event) => setCollectionFilters((current) => ({ ...current, query: event.target.value, page: 1 })) }), /* @__PURE__ */ import_react2.default.createElement("select", { value: collectionFilters.rarity, onChange: (event) => setCollectionFilters((current) => ({ ...current, rarity: event.target.value, page: 1 })) }, /* @__PURE__ */ import_react2.default.createElement("option", { value: "" }, text.rarityPlaceholder), RARITY_ORDER.map((rarity) => /* @__PURE__ */ import_react2.default.createElement("option", { key: rarity, value: rarity }, rarity))), /* @__PURE__ */ import_react2.default.createElement("select", { value: collectionFilters.topicGroup, onChange: (event) => setCollectionFilters((current) => ({ ...current, topicGroup: event.target.value, page: 1 })) }, /* @__PURE__ */ import_react2.default.createElement("option", { value: "" }, text.topicPlaceholder), collection.availableTopics.map((topic) => /* @__PURE__ */ import_react2.default.createElement("option", { key: topic, value: topic }, topic)))), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-sort-row" }, sortOptions.map((option) => /* @__PURE__ */ import_react2.default.createElement("button", { key: option.value, type: "button", className: collectionFilters.sortBy === option.value ? "is-active" : "", onClick: () => setCollectionFilters((current) => ({ ...current, sortBy: option.value, page: 1 })) }, option.label))), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-toggle-row" }, /* @__PURE__ */ import_react2.default.createElement("label", { className: "wg-check" }, /* @__PURE__ */ import_react2.default.createElement("input", { type: "checkbox", checked: collectionFilters.favorite, onChange: (event) => setCollectionFilters((current) => ({ ...current, favorite: event.target.checked, page: 1 })) }), text.favoriteOnly), /* @__PURE__ */ import_react2.default.createElement("label", { className: "wg-check" }, /* @__PURE__ */ import_react2.default.createElement("input", { type: "checkbox", checked: collectionFilters.duplicatesOnly, onChange: (event) => setCollectionFilters((current) => ({ ...current, duplicatesOnly: event.target.checked, page: 1 })) }), text.duplicateOnly))), collection.items.length ? /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-collection-grid" }, collection.items.map((item) => /* @__PURE__ */ import_react2.default.createElement(
    StackCard,
    {
      key: item.articleId,
      card: item,
      archiveLabel: text.archive,
      formatNumber,
      onOpen: (articleId) => void handleSelectArticle(articleId),
      onToggleFavorite: (articleId, favorite) => void handleToggleFavorite(articleId, favorite)
    }
  ))), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-pagination" }, /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "wg-secondary-btn", disabled: collection.page <= 1, onClick: () => setCollectionFilters((current) => ({ ...current, page: current.page - 1 })) }, "<"), /* @__PURE__ */ import_react2.default.createElement("span", null, es ? `Pagina ${collection.page} / ${collectionTotalPages}` : `Page ${collection.page} / ${collectionTotalPages}`), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "wg-secondary-btn", disabled: collection.page >= collectionTotalPages, onClick: () => setCollectionFilters((current) => ({ ...current, page: current.page + 1 })) }, ">"))) : /* @__PURE__ */ import_react2.default.createElement("p", { className: "wg-empty" }, es ? "No hay cartas que cumplan esos filtros." : "No cards match those filters.")) : null, !loading && activeTab === "missions" ? /* @__PURE__ */ import_react2.default.createElement("section", { className: "wg-panel" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-section-head" }, /* @__PURE__ */ import_react2.default.createElement("div", null, /* @__PURE__ */ import_react2.default.createElement("h3", null, es ? "Misiones diarias" : "Daily missions"), /* @__PURE__ */ import_react2.default.createElement("p", null, es ? "Cada objetivo muestra progreso, estado y recompensa en la misma tarjeta." : "Each goal exposes progress, state, and reward on the same card.")), /* @__PURE__ */ import_react2.default.createElement("span", { className: "wg-pill-muted" }, text.missionsReady, ": ", missionSummary.claimable ?? 0)), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-summary-grid is-missions" }, /* @__PURE__ */ import_react2.default.createElement(SummaryTile, { label: text.missionsReady, value: formatNumber(missionSummary.claimable), accent: "#ffbf2f" }), /* @__PURE__ */ import_react2.default.createElement(SummaryTile, { label: text.done, value: formatNumber(missionSummary.completed), accent: "#3fcb6a" }), /* @__PURE__ */ import_react2.default.createElement(SummaryTile, { label: text.progress, value: `${formatNumber(missionSummary.completed)} / ${formatNumber(missionSummary.total)}`, accent: "#48a2ff" })), /* @__PURE__ */ import_react2.default.createElement("article", { className: "wg-mission-ledger-panel" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-section-head" }, /* @__PURE__ */ import_react2.default.createElement("div", null, /* @__PURE__ */ import_react2.default.createElement("h3", null, text.rewardHistoryTitle), /* @__PURE__ */ import_react2.default.createElement("p", null, text.rewardHistorySubtitle)), /* @__PURE__ */ import_react2.default.createElement("span", { className: "wg-pill-muted" }, text.totalMissionRewards, ": ", formatNumber(missionRewardHistory.length))), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-mission-ledger-grid" }, /* @__PURE__ */ import_react2.default.createElement("article", null, /* @__PURE__ */ import_react2.default.createElement("span", null, text.dailyPacks), /* @__PURE__ */ import_react2.default.createElement("strong", null, "+", formatNumber(missionRewardTotals.packs))), /* @__PURE__ */ import_react2.default.createElement("article", null, /* @__PURE__ */ import_react2.default.createElement("span", null, text.gems), /* @__PURE__ */ import_react2.default.createElement("strong", null, "+", formatNumber(missionRewardTotals.gems))), /* @__PURE__ */ import_react2.default.createElement("article", null, /* @__PURE__ */ import_react2.default.createElement("span", null, text.shards), /* @__PURE__ */ import_react2.default.createElement("strong", null, "+", formatNumber(missionRewardTotals.shards)))), missionRewardHistory.length ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-reward-log-shell is-missions" }, missionRewardHistory.slice(0, 8).map((rewardEntry) => {
    const rewardType = normalizeRewardType(rewardEntry.rewardType);
    return /* @__PURE__ */ import_react2.default.createElement("article", { key: rewardEntry.id, className: `wg-reward-log-row is-${rewardType}` }, /* @__PURE__ */ import_react2.default.createElement("div", null, /* @__PURE__ */ import_react2.default.createElement("strong", null, "+", formatNumber(rewardEntry.rewardAmount), " ", getRewardTypeLabel(rewardType, es)), /* @__PURE__ */ import_react2.default.createElement("p", null, rewardEntry.missionTitle ?? text.unknownMission)), /* @__PURE__ */ import_react2.default.createElement("small", null, text.rewardSource, ": ", getRewardSourceLabel(rewardEntry.rewardSource, es), " \xB7 ", text.claimedAt, ": ", formatDateTime(rewardEntry.createdAt, locale)));
  })) : /* @__PURE__ */ import_react2.default.createElement("p", { className: "wg-empty" }, text.noMissionRewards)), missions.missions.length ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-mission-grid" }, missions.missions.map((mission) => /* @__PURE__ */ import_react2.default.createElement(MissionCard, { key: mission.id, mission, progressLabel: text.progress, rewardLabel: text.reward, doneLabel: text.done, claimedLabel: text.claimed, claimLabel: text.claim, activeLabel: text.active, busy, onClaim: (missionId) => void handleClaimMission(missionId) }))) : /* @__PURE__ */ import_react2.default.createElement("p", { className: "wg-empty" }, es ? "No hay misiones activas." : "No active missions.")) : null, !loading && activeTab === "trophies" ? /* @__PURE__ */ import_react2.default.createElement("section", { className: "wg-panel" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-section-head" }, /* @__PURE__ */ import_react2.default.createElement("div", null, /* @__PURE__ */ import_react2.default.createElement("h3", null, es ? "Trofeos" : "Trophies"), /* @__PURE__ */ import_react2.default.createElement("p", null, es ? "Los logros pasan a un muro de gabinete con estado y puntos visibles." : "Achievements now live on a cabinet wall with visible state and points.")), /* @__PURE__ */ import_react2.default.createElement("span", { className: "wg-pill-muted" }, text.trophyPoints, ": ", formatNumber(trophySummary.points))), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-summary-grid is-trophies" }, /* @__PURE__ */ import_react2.default.createElement(SummaryTile, { label: es ? "Total" : "Total", value: formatNumber(trophySummary.total), accent: "#7a93b8" }), /* @__PURE__ */ import_react2.default.createElement(SummaryTile, { label: text.trophiesUnlocked, value: formatNumber(trophySummary.unlocked), accent: "#3fcb6a" }), /* @__PURE__ */ import_react2.default.createElement(SummaryTile, { label: text.points, value: formatNumber(trophySummary.points), accent: "#ffbf2f" })), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-trophy-grid" }, trophies.trophies.length ? trophies.trophies.map((trophy) => /* @__PURE__ */ import_react2.default.createElement(TrophyCard, { key: trophy.id, trophy, pointsLabel: text.points, unlockedLabel: text.unlocked, lockedLabel: text.locked })) : /* @__PURE__ */ import_react2.default.createElement("p", { className: "wg-empty" }, es ? "Todavia no hay trofeos en el archivo." : "There are no trophies in this archive yet."))) : null, !loading && activeTab === "home" ? /* @__PURE__ */ import_react2.default.createElement("section", { className: "wg-support-grid" }, /* @__PURE__ */ import_react2.default.createElement("article", { className: "wg-panel" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-section-head" }, /* @__PURE__ */ import_react2.default.createElement("h3", null, text.quickRules), packStatus?.nextPackGuaranteedSrPlus ? /* @__PURE__ */ import_react2.default.createElement("span", { className: "wg-pill-accent" }, text.guaranteed) : null), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-rule-meters" }, /* @__PURE__ */ import_react2.default.createElement("article", { className: "wg-rule-meter-card" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-meter-head" }, /* @__PURE__ */ import_react2.default.createElement("span", null, es ? "Recarga" : "Refill"), /* @__PURE__ */ import_react2.default.createElement("strong", null, packRegenPercent, "%")), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-progress-bar is-refill" }, /* @__PURE__ */ import_react2.default.createElement("span", { style: { width: `${packRegenPercent}%` } }))), /* @__PURE__ */ import_react2.default.createElement("article", { className: "wg-rule-meter-card" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-meter-head" }, /* @__PURE__ */ import_react2.default.createElement("span", null, "Pity"), /* @__PURE__ */ import_react2.default.createElement("strong", null, packStatus?.pityCounter ?? 0, " / ", PACK_PITY_TARGET)), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-progress-bar is-pity" }, /* @__PURE__ */ import_react2.default.createElement("span", { style: { width: `${Math.round((packStatus?.pityCounter ?? 0) / PACK_PITY_TARGET * 100)}%` } })))), /* @__PURE__ */ import_react2.default.createElement("ul", { className: "wg-rule-list" }, (es ? [
    "Cada pack contiene 5 cartas.",
    "Cada 10 sobres abiertos, el siguiente es un sobre especial con garantia SR+.",
    "Los sobres regeneran 1 por minuto hasta el tope.",
    "Los duplicados entregan shards y el progreso queda ligado al navegador."
  ] : [
    "Each pack contains 5 cards.",
    "Every 10 opened packs, the next one becomes a special pack with SR+ guarantee.",
    "Packs regenerate once per minute until the cap.",
    "Duplicates grant shards and progress stays bound to the browser."
  ]).map((rule) => /* @__PURE__ */ import_react2.default.createElement("li", { key: rule }, rule)))), /* @__PURE__ */ import_react2.default.createElement("article", { className: "wg-panel" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-section-head" }, /* @__PURE__ */ import_react2.default.createElement("div", null, /* @__PURE__ */ import_react2.default.createElement("h3", null, text.support), /* @__PURE__ */ import_react2.default.createElement("p", null, es ? "Exporta o importa un codigo para mover tu progreso." : "Export or import a code to move your progress.")), /* @__PURE__ */ import_react2.default.createElement("span", { className: "wg-pill-muted" }, browserToken ? browserToken.slice(-8) : "--")), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-recovery-box" }, /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "wg-secondary-btn", onClick: () => void handleExportRecovery() }, text.exportCode), recoveryCode ? /* @__PURE__ */ import_react2.default.createElement("code", null, recoveryCode) : null, /* @__PURE__ */ import_react2.default.createElement("input", { type: "text", value: recoveryImport, placeholder: "WKVLT-XXXX-XXXX-XXXX", onChange: (event) => setRecoveryImport(event.target.value.toUpperCase()) }), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "wg-primary-btn", onClick: () => void handleImportRecovery() }, text.importCode)))) : null), /* @__PURE__ */ import_react2.default.createElement("footer", { className: "wg-footer" }, /* @__PURE__ */ import_react2.default.createElement("p", { className: "wg-footer-note" }, es ? "Este sitio es independiente. Si quieres apoyar el proyecto visita la pagina de contacto." : "This site is independently operated. If you would like to support it, please visit the contact page."), /* @__PURE__ */ import_react2.default.createElement("p", { className: "wg-footer-subnote" }, es ? "Servicio no oficial y no afiliado con Wikipedia." : "This service is unofficial and not affiliated with Wikipedia."), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-footer-links" }, /* @__PURE__ */ import_react2.default.createElement("a", { href: "/privacy?lang=EN" }, "Privacy Policy"), /* @__PURE__ */ import_react2.default.createElement("span", null, "|"), /* @__PURE__ */ import_react2.default.createElement("a", { href: "/terms?lang=EN" }, "Terms of Service"), /* @__PURE__ */ import_react2.default.createElement("span", null, "|"), /* @__PURE__ */ import_react2.default.createElement("a", { href: "/contact?lang=EN" }, "Contact"))), selectedArticle ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-modal-backdrop", role: "presentation", onClick: () => setSelectedArticle(null) }, /* @__PURE__ */ import_react2.default.createElement("article", { className: "wg-modal", onClick: (event) => event.stopPropagation() }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-section-head" }, /* @__PURE__ */ import_react2.default.createElement("div", null, /* @__PURE__ */ import_react2.default.createElement("h3", null, getTitle(selectedArticle)), /* @__PURE__ */ import_react2.default.createElement("p", null, selectedArticle.topicGroup ?? text.archive)), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "wg-secondary-btn", onClick: () => setSelectedArticle(null) }, text.close)), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-modal-grid" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-modal-card-shell" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-modal-stack-preview" }, /* @__PURE__ */ import_react2.default.createElement(
    DetailFlipCard,
    {
      card: selectedArticle,
      archiveLabel: text.archive,
      formatNumber,
      isFlipped: detailCardFlipped,
      onFlip: () => setDetailCardFlipped((current) => !current),
      flipHint: text.detailFlipHint,
      flipBackHint: text.detailFlipBackHint,
      detailDescriptionTitle: text.detailDescriptionTitle
    }
  ))), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-article-stats" }, /* @__PURE__ */ import_react2.default.createElement("h4", null, es ? "Estadisticas de la carta" : "Card stats"), /* @__PURE__ */ import_react2.default.createElement("p", null, /* @__PURE__ */ import_react2.default.createElement("span", null, "ATK"), /* @__PURE__ */ import_react2.default.createElement("strong", null, formatNumber(selectedArticle.atk))), /* @__PURE__ */ import_react2.default.createElement("p", null, /* @__PURE__ */ import_react2.default.createElement("span", null, "DEF"), /* @__PURE__ */ import_react2.default.createElement("strong", null, formatNumber(getDef(selectedArticle)))), /* @__PURE__ */ import_react2.default.createElement("p", null, /* @__PURE__ */ import_react2.default.createElement("span", null, "Q-Score"), /* @__PURE__ */ import_react2.default.createElement("strong", null, selectedArticle.qualityScore)), /* @__PURE__ */ import_react2.default.createElement("p", null, /* @__PURE__ */ import_react2.default.createElement("span", null, text.copies), /* @__PURE__ */ import_react2.default.createElement("strong", null, selectedArticle.copies ?? 0)), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-category-block" }, /* @__PURE__ */ import_react2.default.createElement("span", null, text.categories), /* @__PURE__ */ import_react2.default.createElement("div", { className: "wg-category-list" }, (selectedArticle.categories ?? []).length ? (selectedArticle.categories ?? []).map((category) => /* @__PURE__ */ import_react2.default.createElement("span", { key: category }, category)) : /* @__PURE__ */ import_react2.default.createElement("span", null, text.noCategories))), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "wg-primary-btn", onClick: () => void handleOpenSource({ articleId: selectedArticle.articleId ?? selectedArticle.id, sourceUrl: selectedArticle.sourceUrl }), disabled: !selectedArticle.sourceUrl }, selectedArticle.sourceUrl ? es ? "Ver en Wikipedia" : "View on Wikipedia" : text.noSource))))) : null);
}
export {
  WikipediaGachaGame as default
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
