define(['exports', 'aurelia-dependency-injection', 'aurelia-event-aggregator', 'aurelia-logging', 'deepmerge'], function (exports, _aureliaDependencyInjection, _aureliaEventAggregator, _aureliaLogging, _deepmerge) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
		value: true
	});
	exports.Analytics = undefined;

	var LogManager = _interopRequireWildcard(_aureliaLogging);

	var _deepmerge2 = _interopRequireDefault(_deepmerge);

	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : {
			default: obj
		};
	}

	function _interopRequireWildcard(obj) {
		if (obj && obj.__esModule) {
			return obj;
		} else {
			var newObj = {};

			if (obj != null) {
				for (var key in obj) {
					if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];
				}
			}

			newObj.default = obj;
			return newObj;
		}
	}

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
		return typeof obj;
	} : function (obj) {
		return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
	};

	function _classCallCheck(instance, Constructor) {
		if (!(instance instanceof Constructor)) {
			throw new TypeError("Cannot call a class as a function");
		}
	}

	var _dec, _class;

	var criteria = {
		isElement: function isElement(e) {
			return e instanceof HTMLElement;
		},
		hasClass: function hasClass(cls) {
			return function (e) {
				return criteria.isElement(e) && e.classList.contains(cls);
			};
		},
		hasTrackingInfo: function hasTrackingInfo(e) {
			return criteria.isElement(e) && e.hasAttribute('data-analytics-category') && e.hasAttribute('data-analytics-action');
		},
		hasVisibilityTracking: function hasVisibilityTracking(e) {
			return criteria.isElement(e) && e.hasAttribute('data-analytics-category') && e.hasAttribute('data-analytics-action');
			e.hasAttribute('data-analytics-track-visible');
		},
		isOfType: function isOfType(e, type) {
			return criteria.isElement(e) && e.nodeName.toLowerCase() === type.toLowerCase();
		},
		isAnchor: function isAnchor(e) {
			return criteria.isOfType(e, 'a');
		},
		isButton: function isButton(e) {
			return criteria.isOfType(e, 'button');
		}
	};

	var defaultOptions = {
		logging: {
			enabled: true
		},
		pageTracking: {
			enabled: false,
			getTitle: function getTitle(payload) {
				return payload.instruction.config.title;
			},
			getUrl: function getUrl(payload) {
				return payload.instruction.fragment;
			}
		},
		clickTracking: {
			enabled: false,
			filter: function filter(element) {
				return criteria.isAnchor(element) || criteria.isButton(element);
			}
		},
		visibilityTracking: {
			enabled: false,
			percentageShown: 0.5
		},
		exceptionTracking: {
			enabled: true,
			applicationName: undefined,
			applicationVersion: undefined
		}
	};

	var delegate = function delegate(criteria, listener) {
		return function (evt) {
			var el = evt.target;
			do {
				if (criteria && !criteria(el)) continue;
				evt.delegateTarget = el;
				listener.apply(this, arguments);
				return;
			} while (el = el.parentNode);
		};
	};

	var Analytics = exports.Analytics = (_dec = (0, _aureliaDependencyInjection.inject)(_aureliaEventAggregator.EventAggregator), _dec(_class = function () {
		function Analytics(eventAggregator) {
			_classCallCheck(this, Analytics);

			this._eventAggregator = eventAggregator;
			this._initialized = false;
			this._logger = LogManager.getLogger('analytics-plugin');
			this._options = defaultOptions;

			this._trackClick = this._trackClick.bind(this);
			this._trackPage = this._trackPage.bind(this);
			this._trackVisible = this._trackVisible.bind(this);
		}

		Analytics.prototype.attach = function attach() {
			var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : defaultOptions;

			this._options = (0, _deepmerge2.default)(defaultOptions, options);
			if (!this._initialized) {
				var errorMessage = "Analytics must be initialized before use.";
				this._log('error', errorMessage);
				throw new Error(errorMessage);
			}

			this._attachClickTracker();
			this._attachVisibilityTracker();
			this._attachPageTracker();
			this._attachExceptionTracker();
		};

		Analytics.prototype.init = function init(id) {
			var script = document.createElement('script');
			script.text = "(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){" + "(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o)," + "m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)" + "})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');";
			document.querySelector('body').appendChild(script);

			window.ga = window.ga || function () {
				(ga.q = ga.q || []).push(arguments);
			};
			ga.l = +new Date();
			ga('create', id, 'auto');

			this._initialized = true;
			this._trackedElements = [];
		};

		Analytics.prototype._attachClickTracker = function _attachClickTracker() {
			if (!this._options.clickTracking.enabled) {
				return;
			}

			document.querySelector('body').addEventListener('click', delegate(this._options.clickTracking.filter, this._trackClick));
		};

		Analytics.prototype._attachVisibilityTracker = function _attachVisibilityTracker() {
			if (!this._options.visibilityTracking.enabled) {
				return;
			}

			window.addEventListener('scroll', function (e) {
				var _this = this;

				var clientHeight = window.innerHeight || document.documentElement.clientHeight;
				var clientWidth = window.innerWidth || document.documentElement.clientWidth;

				document.querySelectorAll('*[data-analytics-track-visible]').forEach(function (element) {
					if (_this._trackedElements.indexOf(element) === -1) {
						var boundingRect = element.getBoundingClientRect();
						var totalArea = boundingRect.width * boundingRect.height;
						var shownHeight = clientHeight;
						var shownWidth = clientWidth;
						if (boundingRect.top >= 0) {
							shownHeight -= boundingRect.top;
						}
						if (boundingRect.bottom <= clientHeight) {
							shownHeight += boundingRect.bottom - clientHeight;
						}
						if (boundingRect.left >= 0) {
							shownWidth -= boundingRect.left;
						}
						if (boundingRect.right <= clientWidth) {
							shownWidth += boundingRect.right - clientWidth;
						}

						var shownArea = shownWidth < 0 || shownHeight < 0 ? 0 : shownHeight * shownWidth;
						if (shownArea / totalArea >= _this._options.visibilityTracking.percentageShown) {
							_this._trackedElements.push(element);
							_this._trackVisible(element);
						}
					}
				});
			}.bind(this));
		};

		Analytics.prototype._attachPageTracker = function _attachPageTracker() {
			var _this2 = this;

			if (!this._options.pageTracking.enabled) {
				return;
			}

			this._eventAggregator.subscribe('router:navigation:success', function (payload) {
				_this2._trackPage(_this2._options.pageTracking.getUrl(payload), _this2._options.pageTracking.getTitle(payload));
			});
		};

		Analytics.prototype._attachExceptionTracker = function _attachExceptionTracker() {
			if (!this._options.exceptionTracking.enabled) {
				return;
			}

			var options = this._options;
			var existingWindowErrorCallback = window.onerror;

			window.onerror = function (errorMessage, url, lineNumber, columnNumber, errorObject) {
				if (typeof ga === 'function') {
					var exceptionDescription = void 0;
					if (errorObject != undefined && _typeof(errorObject.message) != undefined) {
						exceptionDescription = errorObject.message;
					} else {
						exceptionDescription = errorMessage;
					}

					exceptionDescription += " @ " + url;

					if (lineNumber != undefined && columnNumber != undefined) {
						exceptionDescription += ":" + lineNumber + ":" + columnNumber;
					}

					var exOptions = {
						exDescription: exceptionDescription,
						exFatal: false
					};

					if (options.exceptionTracking.applicationName != undefined) {
						exOptions.appName = options.exceptionTracking.applicationName;
					}
					if (options.exceptionTracking.applicationVersion != undefined) {
						exOptions.appVersion = options.exceptionTracking.applicationVersion;
					}

					ga('send', 'exception', exOptions);
				}

				if (typeof existingWindowErrorCallback === 'function') {
					return existingWindowErrorCallback(errorMessage, url, lineNumber, columnNumber, errorObject);
				}

				return false;
			};
		};

		Analytics.prototype._log = function _log(level, message) {
			if (!this._options.logging.enabled) {
				return;
			}

			this._logger[level](message);
		};

		Analytics.prototype._trackClick = function _trackClick(evt) {
			if (!this._initialized) {
				this._log('warn', "The component has not been initialized. Please call 'init()' before calling 'attach()'.");
				return;
			}
			if (!evt || !evt.delegateTarget || !criteria.hasTrackingInfo(evt.delegateTarget)) {
				return;
			};

			var element = evt.delegateTarget;
			var tracking = {
				category: element.getAttribute('data-analytics-category'),
				action: element.getAttribute('data-analytics-action'),
				label: element.getAttribute('data-analytics-label'),
				value: element.getAttribute('data-analytics-value')
			};

			this._log('debug', 'click: category \'' + tracking.category + '\', action \'' + tracking.action + '\', label \'' + tracking.label + '\', value \'' + tracking.value + '\'');
			ga('send', 'event', tracking.category, tracking.action, tracking.label, tracking.value);
		};

		Analytics.prototype._trackVisible = function _trackVisible(element) {
			if (!this._initialized) {
				this._log('warn', "The component has not been initialized. Please call 'init()' before calling 'attach()'.");
				return;
			}
			if (!element || !criteria.hasTrackingInfo(element)) {
				return;
			};

			var tracking = {
				category: element.getAttribute('data-analytics-category'),
				action: element.getAttribute('data-analytics-action'),
				label: element.getAttribute('data-analytics-label'),
				value: element.getAttribute('data-analytics-value')
			};

			this._log('debug', 'click: category \'' + tracking.category + '\', action \'' + tracking.action + '\', label \'' + tracking.label + '\', value \'' + tracking.value + '\'');
			ga('send', 'event', tracking.category, tracking.action, tracking.label, tracking.value);
		};

		Analytics.prototype._trackPage = function _trackPage(path, title) {
			this._log('debug', 'Tracking path = ' + path + ', title = ' + title);
			if (!this._initialized) {
				this._log('warn', "Try calling 'init()' before calling 'attach()'.");
				return;
			}

			ga('set', {
				page: path,
				title: title
			});
			ga('send', 'pageview');
		};

		return Analytics;
	}()) || _class);
});