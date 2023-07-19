(function(e, t) {
	"use strict";

	function getDummyValue() {
		var e = new Date;
		return e.getUTCDate() + "" + e.getUTCMilliseconds()
	}

	function error(e) {
		var t = config("error");
		t && typeof t == "function" ? t(e) : alert(e)
	}

	function getUrlParameter(e) {
		if (!e || typeof e != "string") return "";
		var t = new RegExp(e + "=([^\\&]*)", "i"),
			r = t.exec(n.location.search);
		return r ? r.length < 2 ? "" : r[1] : ""
	}

	function onConfigChange(e) {
		if (!e) return;
		var t, n;
		e.localeUrlParam && (n = config("locale"), n === "en" && (t = getUrlParameter(config("localeUrlParam")), t && t !== n && config({
			locale: t
		}))), e.languageUrlParam && (u.language || (t = getUrlParameter(config("languageUrlParam")), t && config({
			language: t
		}))), e.locale && loadLocale(config("locale"))
	}

	function config(e) {
		if (!e) return u;
		if (!v.isObject(e)) return u[e];
		var t;
		for (t in e) e.hasOwnProperty(t) && (t in u || t in s) && (v.isObject(u[t]) ? u[t] = v.extend(!0, {}, u[t], e[t]) : (u[t] = e[t], t === "baseUrl" && (u.url === "http://localhost/AskiaVistaReader.Net4/AjaxEmbedHandler.aspx" && (u.url = u.baseUrl + "AjaxEmbedHandler.aspx"), u.loadingMessage === '<img src="http://localhost/AskiaVistaReader.Net4/ajax-loader.gif" alt="Loading..." />' && (u.loadingMessage = '<img src="' + u.baseUrl + 'ajax-loader.gif" alt="Loading..." />'))));
		return onConfigChange(e), u
	}

	function loadLocale(e) {
		if (g || !e && typeof e != "string") return;
		var t = f.getAllWithLocale(),
			n = 0,
			r = t.length,
			s = {
				action: i.loadLocale,
				locale: "askiavista-" + e,
				dmy: getDummyValue(),
				async: !1,
				dataType: "script"
			},
			o;
		o = new c(s), o.execute();
		for (; n < r; n += 1) s = {
			action: i.loadLocale,
			locale: t[n].localeFile + "-" + e,
			dmy: getDummyValue(),
			async: !1,
			dataType: "script"
		}, o = new c(s), o.execute()
	}

	function translate(e) {
		if (typeof e != "string") return e;
		var t, n, r, i = /^[\S]+$/gi,
			s = "[" + config("locale") + "] {" + e + "}",
			o = config("i18n"),
			u = e.split(".");
		if (!i.test(e)) return e;
		for (t = 0, n = u.length; t < n; t += 1) {
			if (!o[u[t]]) return s;
			o = o[u[t]]
		}
		if (typeof o != "string") return s;
		if (arguments.length > 1)
			for (t = 1, n = arguments.length; t < n; t += 1) r = new RegExp("\\{" + (t - 1) + "\\}", "gi"), o = o.replace(r, arguments[t]);
		return o
	}

	function version() {
		return r.version
	}

	function about(e) {
		f.refresh(), e = e || "askiaVista";
		var n = "",
			i, s;
		if (e === "askiaVista") n = translate("about.message", r.version), i = f.about(), i.length > 0 && (n += translate("about.enablePlugins")), n += i;
		else if (e === "jquery") n = " + jquery\r\n", n += translate("about.version", t.fn.jquery), n += translate("about.site", "http://www.jquery.com"), n += translate("about.help", r.jqueryHelpUrl);
		else {
			s = f.get(e);
			if (!s || !s.about) return;
			n = s.about(!0)
		}
		if (n === "") return;
		n += "\r\n\r\njquery.askiaVista is distributed under the AskiaVistaSDK license\r\nCopyright Askia © 2011", alert(n)
	}

	function help(t) {
		var n = r.helpUrl,
			i = /^https?:\/\//,
			s;
		t = t || "askiaVista";
		if (t === "jquery") n = r.jqueryHelpUrl;
		else if (t !== "askiaVista") {
			s = f.get(t);
			if (!s) return;
			n = s.helpUrl || "", n === "" && (n = s.website || "")
		}
		if (n === "") {
			error(translate("error.cannotFoundHelpFor", t));
			return
		}
		if (!i.test(n)) return;
		e.open(n)
	}

	function abort() {
		l.abort()
	}

	function encrypt(n) {
		var r = "",
			i, s = "",
			o = function(e, t) {
				var n = e + Math.random() * (t - e);
				return Math.round(n)
			};
		while (r.length < 16) i = o(0, 1), i ? r += s + o(0, 9) : r += s + String.fromCharCode(o(97, 122));
		t.ajax({
			url: config("url"),
			async: !1,
			dataType: "script",
			data: v.param({
				action: "getEncAl",
				key: r,
				dmy: getDummyValue()
			}),
			success: function() {
				if (!e.moonWalk || typeof e.moonWalk != "function") {
					n.error && n.error(translate("error.unknowErrorDuringEncryption"), {});
					return
				}
				var t = n.value,
					i, s, o;
				if (v.isArray(t)) {
					i = [];
					for (s = 0, o = t.length; s < o; s += 1) i.push(r + "-" + e.moonWalk(t[s]))
				} else i = r + "-" + e.moonWalk(t);
				e.moonWalk = null, n.success && n.success(i, {})
			},
			error: function(e) {
				n.error && n.error(e, {})
			}
		})
	}

	function login(e) {
		e = e || {}, e.dmy = getDummyValue(), e.action = i.login, e.xhr = new c(e), e.password ? encrypt({
			value: e.password,
			success: function(t) {
				e.password = t, l.executeNow(e)
			}
		}) : l.executeNow(e)
	}

	function logout(e) {
		e = e || {}, e.dmy = getDummyValue(), e.action = i.logout, e.xhr = new c(e), l.executeNow(e), l.logout()
	}

	function clearTimers(e) {
		if (!arguments.length) {
			a.each(function clearAll(e) {
				e.remove()
			});
			return
		}
		var t, n, r;
		for (t = 0, n = arguments.length; t < n; t += 1) r = a.getTimer(arguments[t]), r && r.remove()
	}

	function stopTimers(e) {
		if (!arguments.length) {
			a.each(function stopAll(e) {
				e.stop()
			});
			return
		}
		var t, n, r;
		for (t = 0, n = arguments.length; t < n; t += 1) r = a.getTimer(arguments[t]), r && r.stop()
	}

	function startTimers(e) {
		if (!arguments.length) {
			a.each(function startAll(e) {
				e.start()
			});
			return
		}
		var t, n, r;
		for (t = 0, n = arguments.length; t < n; t += 1) r = a.getTimer(arguments[t]), r && r.start()
	}

	function initAskiaVista() {
		m.ready(function() {
			p.loadLocale(config("locale")), f.validate(), l.execute()
		})
	}
	var n = e.document,
		r, i, s, o, u, a, f, l, c, h, p, d, v, m, g = !0,
		y = 1,
		b = 10;
	r = {
		version: "2.2.6",
		helpUrl: "http://www.askia.com/Downloads/dev/docs/AskiaVistaAJAX/index.html",
		jqueryHelpUrl: "http://docs.jquery.com",
		dependencies: [{
			name: "jquery",
			version: ">=1.5.2"
		}],
		timeOffset: (new Date).getTimezoneOffset() / 60 * -1
	}, i = {
		login: "login",
		logout: "logout",
		getUserInfo: "getUserInfo",
		saveUserInfo: "saveUserInfo",
		display: "display",
		getQuestions: "getQuestions",
		getResponses: "getResponses",
		getLanguages: "getLanguages",
		getSurveys: "getSurveys",
		getSurveyStatus: "getSurveyStatus",
		getSurveySettings: "getSurveySettings",
		saveSurveySettings: "saveSurveySettings",
		getProfiles: "getProfiles",
		saveProfile: "saveProfile",
		deleteProfile: "deleteProfile",
		getSubPopulation: "getSubPopulation",
		getSubPopulations: "getSubPopulations",
		saveSubPopulation: "saveSubPopulation",
		deleteSubPopulation: "deleteSubPopulation",
		getWaves: "getWaves",
		getUniverses: "getUniverses",
		getWeightings: "getWeightings",
		getLevels: "getLevels",
		getChartTemplates: "getChartTemplates",
		saveChartTemplate: "saveChartTemplate",
		deleteChartTemplate: "deleteChartTemplate",
		getTabStyles: "getTabStyles",
		saveTabStyle: "saveTabStyle",
		deleteTabStyle: "deleteTabStyle",
		getXTabSettings: "getXTabSettings",
		saveXTabSettings: "saveXTabSettings",
		deleteXTabSettings: "deleteXTabSettings",
		getPortfolio: "getPortfolio",
		getPortfolioToken: "getPortfolioToken",
		getPortfolios: "getPortfolios",
		savePortfolio: "savePortfolio",
		deletePortfolio: "deletePortfolio",
		getPortfolioLink: "getPortfolioLink",
		getPortfolioLinks: "getPortfolioLinks",
		savePortfolioLink: "savePortfolioLink",
		deletePortfolioLink: "deletePortfolioLink",
		getPortfolioLinkLayouts: "getPortfolioLinkLayouts",
		getPortfolioLinkThemes: "getPortfolioLinkThemes",
		savePortfolioLinkTheme: "savePortfolioLinkTheme",
		deletePortfolioLinkTheme: "deletePortfolioLinkTheme",
		getPortfolioItems: "getPortfolioItems",
		getPortfolioItem: "getPortfolioItem",
		savePortfolioItem: "savePortfolioItem",
		movePortfolioItems: "movePortfolioItems",
		deletePortfolioItem: "deletePortfolioItem",
		getCalculatedQuestions: "getCalculatedQuestions",
		saveCalculatedQuestion: "saveCalculatedQuestion",
		validateCalculatedQuestion: "validateCalculatedQuestion",
		deleteCalculatedQuestion: "deleteCalculatedQuestion",
		validateCalculation: "validateCalculation",
		getCalculations: "getCalculations",
		validateCalculatedResponse: "validateCalculatedResponse",
		getPages: "getPages",
		loadLocale: "loadLocale",
		search: "search",
		getInterviews: "getInterviews",
		getSharings: "getSharings",
		saveSharing: "saveSharing",
		deleteSharing: "deleteSharing",
		getContacts: "getContacts",
		validateScript: "validateScript",
		validateCleanupScript: "validateCleanupScript",
		exportTo: "exportTo",
		download: "download",
		createIFrame: "createIFrame",
		getResources: "getResources",
		saveResource: "saveResource",
		deleteResource: "deleteResource",
		getActivity: "getActivity",
		getActivityStats: "getActivityStats",
		getActivityFilters: "getActivityFilters"
	}, s = {
		action: "action",
		appName: "appName",
		appVersion: "appVersion",
		ajaxApiVersion: "ajaxApiVersion",
		timeOffset: "timeOffset",
		id: "id",
		fields: "fields",
		name: "name",
		type: "type",
		index: "index",
		shortcut: "shortcut",
		key: "key",
		caption: "caption",
		description: "description",
		definition: "definition",
		responses: "responses",
		script: "script",
		survey: "survey",
		profile: "profile",
		portfolio: "portfolio",
		question: "question",
		questions: "questions",
		portfolioItem: "portfolioItem",
		profileRows: "profileRows",
		rows: "rows",
		profileColumns: "profileColumns",
		columns: "columns",
		profileEdges: "profileEdges",
		edges: "edges",
		settings: "settings",
		calculations: "calculations",
		changeScriptOfCalculation: "changeScriptOfCalculation",
		chart: "chart",
		chartTemplate: "chartTemplate",
		tabStyle: "tabStyle",
		subPopulation: "subPopulation",
		calculatedQuestion: "calculatedQuestion",
		waves: "waves",
		weighting: "weighting",
		universe: "universe",
		level: "level",
		title: "title",
		maxPerPage: "maxPerPage",
		page: "page",
		dimension: "dimension",
		toBuild: "toBuild",
		width: "width",
		height: "height",
		pattern: "pattern",
		containerId: "containerId",
		login: "login",
		password: "password",
		confirmSessionDisconnection: "confirmSessionDisconnection",
		passwordConfirm: "passwordConfirm",
		passwordActual: "passwordActual",
		explicitAuthenticityToken: "explicitAuthenticityToken",
		authenticityToken: "authenticityToken",
		portfolioToken: "portfolioToken",
		portfolioItemToken: "portfolioItemToken",
		linkId: "linkId",
		expireAt: "expireAt",
		layout: "layout",
		theme: "theme",
		portfolioLinkTheme: "portfolioLinkTheme",
		defaultPortfolioItem: "defaultPortfolioItem",
		format: "format",
		lazyLoading: "lazyLoading",
		verbose: "verbose",
		locale: "locale",
		parentNode: "parentNode",
		recursive: "recursive",
		transactions: "transactions",
		entity: "entity",
		fileFormat: "fileFormat",
		fileName: "fileName",
		fileNameFromTitle: "fileNameFromTitle",
		overwrite: "overwrite",
		useDefinition: "useDefinition",
		temporary: "temporary",
		sharings: "sharings",
		currentSurveyOnly: "currentSurveyOnly",
		language: "language",
		defaultSurvey: "defaultSurvey",
		email: "email",
		uiPreferences: "uiPreferences",
		captionInTree: "captionInTree",
		captionInDimension: "captionInDimension",
		fromIFrame: "fromIFrame",
		fileUploadName: "fileUploadName",
		timer: "timer",
		resources: "resources",
		resource: "resource",
		content: "content",
		url: "url",
		items: "items",
		before: "before",
		after: "after",
		ssoKey: "ssoKey",
		metrics: "metrics",
		groupBy: "groupBy",
		filters: "filters",
		totalResponses: "totalResponses",
		dmy: "dmy"
	}, o = ["crosstab", "interviews", "portfolio", "portfolioItem", "subPopulations", "calculatedQuestions", "weightings", "universes", "levels", "waves", "profiles", "portfolios", "portfolioItems", "surveys", "xTabSettings", "tabStyle", "chartTemplate", "portfolioLinkTheme", "activity", "activityStats"], u = {
		appName: "",
		appVersion: "",
		baseUrl: "http://localhost/AskiaVistaReader.Net4/",
		url: "http://localhost/AskiaVistaReader.Net4/AjaxEmbedHandler.aspx",
		locale: "en",
		localeUrlParam: "locale",
		languageUrlParam: "language",
		survey: "",
		i18n: {
			aborted: "Aborted.",
			error: {
				undefinedDrawMethod: "The draw method of the chart plugin '{0}' is not defined or is not a function",
				undefinedPluginName: "Please indicates the name of the plugin.",
				undefinedTypeOfQuery: "The type of query was undefined",
				unknownErrorDuringEncryption: "Unknown error during the encryption",
				unknownErrorDuringSearch: "Error while searching.",
				missingDependency: "     - Missing dependency '{0}' for the plugin '{1}'",
				incorrectVersionOfPlugin: "     - The version {0} of '{1}' is require for the plugin '{2}'",
				pluginsExceptions: "Plugins exceptions:\r\n",
				unhandleError: "Oops an unhandled error was occured.",
				authenticationRequire: "Authentication required!",
				deprecatedMethod: "Sorry but the method '{0}' was deprecated.",
				invalidAuthenticityToken: "Invalid authenticity token",
				allowedDomainsUndefined: "The allowed domains are undefined",
				pageNotAllowedToQuery: "Sorry this page is not allowed to execute the query",
				surveyDeleted: "This survey was deleted",
				surveyAccessDenied: "Survey access denied",
				incorrectLoginOrPwd: "Incorrect login or password",
				incorrectPassword: "Incorrect password",
				userAccountDisabled: "You're account was disabled",
				userAccountDeleted: "Your account was deleted",
				portfolioDeleted: "The portfolio was deleted",
				licenseExpired: "Your licence was expired",
				passwordExpired: "Your password was expired",
				noResult: "No results.",
				noQuestionsDefined: "No questions defined",
				cannotFoundListOfSurveys: "Cannot find the list of surveys",
				cannotFoundListOfProfiles: "Cannot find the list of Profiles",
				cannotFoundListOfSubPops: "Cannot find the list of Filters",
				cannotFoundListOfWaves: "Cannot find the list of waves",
				cannotFoundListOfUniverses: "Cannot find the list of universes",
				cannotFoundListOfWeightings: "Cannot find the list of weightings",
				cannotFoundListOfLevels: "Cannot find the list of levels",
				cannotFoundListOfChartTemplates: "Cannot find the list of chart templates",
				cannotFoundListOfTabStyles: "Cannot find the list of table styles",
				cannotFoundListOfXTabSettings: "Cannot find the list of settings",
				cannotFoundListOfPortfolios: "Cannot find the list of portfolios",
				cannotFoundListOfCalculatedQuestions: "Cannot find the list of Variables",
				cannotFoundListOfCalculations: "Cannot find the list of calculations",
				cannotFoundListOfPortfolioLinks: "Cannot find the list of portfolio links",
				cannotFoundProfile: "Cannot find the Profile",
				cannotFoundQuestion: "Cannot find the question",
				cannotFoundPortfolio: "Cannot find the Portfolio",
				cannotFoundPortfolioItem: "Cannot find the Portfolio item",
				cannotFoundSettingsForUserAndSurvey: "Cannot find user settings for the current survey",
				cannotFoundHelpFor: "Cannot find help for '{0}'",
				cannotFoundPlugin: "Cannot find the plugin {0}.",
				cannotFoundSurvey: "Cannot find the survey",
				cannotReadUsersTable: "Cannot obtain the DataReader to the users table",
				cannotFoundUser: "Cannot find the user",
				cannotShowLoginForm: "Cannot display the login form.\r\n In order to solve the problem, you can apply one of this following fix: \r\n- Include the jquery.blockUI.js\r\n- Authenticate the user explicitly \r\n- Implement your own showLoginForm() function through the askiaVista.config method",
				cannotExecuteCrossTab: "Cannot execute the cross-tab. Unknown exception",
				cannotCreateCrossTabDef: "Cannot create the cross-tab definition",
				cannotCreateRawDataDef: "Cannot create the raw-data definition",
				expectedSurveyParam: "The survey parameter is expected",
				expectedQuestionParam: "The question parameter is expected",
				expectedClosedQuestion: "This method must be invoked on closed question",
				expectedSurfFile: "The survey is not a surf file (.qew), you cannot obtain the list of waves",
				expectedPortfolioParam: "The portfolio parameter is expected",
				expectedPatternParam: "The pattern parameter is expected",
				expectedIdOrName: "The id or name parameter is expected",
				expectedEntityParameter: "The entity parameter is expected",
				invalidEntityParameter: "Invalid entity parameter.\r\n Available entities are:\r\n'crosstab', 'interviews', 'portfolio', 'portfolioItem', 'portfolioLinkTheme'\r\n'subPopulations', 'calculatedQuestions', 'weightings', 'universes', 'levels', 'waves',\r\n 'profiles', 'portfolios', 'portfolioItems',\r\n 'surveys', 'xTabSettings',\r\n'tabStyle', 'chartTemplate'",
				expectedFileFormatParameter: "The fileFormat parameter is expected",
				invalidFileFormat: "The export doesn't support the specified file format",
				invalidFileExtension: "Invalid file extension",
				unknowErrorDuringExport: "An unknown error occurred during the export",
				incorrectExportDownloadDataArg: "The 'data' argument of the method askiaVista.download must be a string or a flat hash object",
				invalidSubPopulationId: "Invalid Filter id",
				cannotFoundSpecifySubPopulation: "Cannot find the specified Filter",
				invalidCalculatedQuestionId: "Invalid Variable id",
				cannotFoundSpecifyCalculatedQuestion: "Cannot find the specified Variable",
				expectedDefinitionOrResponses: "One of the parameter 'definition' or 'responses' is expected",
				expectedDefinitionOrScript: "One of the parameter 'definition' or 'script' is expected",
				invalidResponseObject: "Invalid response object",
				invalidProfileId: "Invalid Profile id",
				cannotFoundSpecifyProfile: "Cannot find the specify profile",
				invalidProfileDefinition: "Invalid Profile definition",
				invalidXTabSettingsId: "Invalid settings id",
				cannotFoundSpecifyXTabSettings: "Cannot find the specify settings",
				invalidXTabSettingsDefinition: "Invalid settings definition",
				invalidPortfolioItemId: "Invalid portfolio item id",
				invalidPortfolioId: "Invalid portfolio id",
				expectedTransactionsParameter: "The transactions parameter is expected",
				invalidTransactionParameter: "Invalid transactions parameter",
				invalidTransactionItem: "Invalid transaction item",
				cannotExecuteTransaction: "Cannot execute the transaction",
				unauthorizedQuery: "Unauthorized query",
				noSubPopulationsCreated: "No sub-population created",
				incompleteQuery: "Incomplete query",
				invalidPermissionParameter: "Invalid permission parameter",
				invalidResharingParameter: "Invalid resharing parameter",
				expectedSharingsParameter: "Expected 'sharings' parameter",
				invalidSharingsParameter: "The 'sharings' parameter is invalid, expect an array of sharing",
				notAllowedToShareThisItem: "You're not allowed to share this item",
				notAllowedToShareWithEveryBody: "You're not allowed to share with every body.",
				cannotFoundTheSpecifyContact: "Cannot found the specify contact",
				cannotFoundSurveyLanguage: "Cannot found the specify language",
				cannotFoundSpecifyWeighting: "Cannot found the specify weighting",
				cannotFoundSpecifyLevel: "Cannot found the specify level",
				cannotFoundSpecifyUniverse: "Cannot found the specify universe",
				cannotFoundSpecifyTabStyle: "Cannot found the specify table style",
				expectedActualAndConfirmPassword: "Expected the password confirmation and the actual password",
				passwordDoesntMatchConfirm: "The password and the confirmation doesn't match",
				unexpectedCharacters: "Unexpected characters",
				cannotFoundTheSpecifyLanguage: "Cannot found the specify language",
				invalidEmailAddress: "Invalid email address",
				invalidTabStyleId: "Invalid Table style id",
				couldNotFindTheIFrame: "Could not find the specified iFrame",
				incorrectIFrameArg: "Incorrect iframe arguments",
				noFileUploadNameSpecified: "Input file name was not specified use the parameter `fileUploadName`",
				couldNotFindInputFile: "Could not find or create the input file",
				invalidChartTemplateId: "Invalid Chart template id",
				cannotFoundSpecifyChartTemplate: "Cannot found the specify Chart template",
				invalidPortfolioLinkId: "Invalid portfolio link id",
				cannotFoundSpecifyPortfolioLink: "Cannot found the specify portfolio link",
				invalidPortfolioLinkIdFormat: "Invalid portfolio link format, min chars: 3, max chars: 25, only alpha-numeric characters without spaces",
				invalidDateFormat: "Invalid date format, expected ISO date",
				invalidSubPopulationObject: "Invalid sub-population object",
				invalidLevelObject: "Invalid level object",
				invalidWavesObject: "Invalid waves object",
				invalidProfileObject: "Invalid profile object",
				invalidPortfolioResourceFormat: "Invalid format of the resource",
				expectedResourceParam: "`resource` parameter is expected",
				invalidResourceParam: "Invalid `resource` parameter",
				cannotFoundResource: "Cannot found the resource",
				invalidResourceId: "Invalid resource id",
				resourceSizeTooLarge: "The file size is too large (max: 2 MB)",
				expectedItemsParam: "Expected `items` parameter",
				invalidItemsParam: "Invalid `items` parameter",
				expectedBeforeOrAfterParam: "Expected `before` OR `after` parameter",
				couldNotContainsBeforeAndAfter: "`before` AND `after` parameters could not be use at the same time",
				cannotFoundTheme: "Could not find the theme",
				cannotFoundLayout: "Could not find the layout",
				invalidThemeId: "Invalid theme id",
				expectedCalculationsParam: "Expected `calculations` parameter",
				invalidCalculationsParam: "Invalid `calculations` parameter",
				expectedIndexParam: "Expected `index` parameter",
				invalidIndexParam: "Invalid `index` parameter",
				scriptEmpty: "Expected a non-empty script",
				invalidSSOKey: "Invalid SSO key",
				sessionDisconnected: "Your session has been disconnected.",
				expectedMediocrePasswordQuality: "The quality of the password is too low, please mix at least 2 criteria between lower/upper case, punctuations and numbers.",
				expectedGoodPasswordQuality: "The quality of the password is too low, please mix at least 3 criteria between lower/upper case, punctuations and numbers.",
				expectedGreatPasswordQuality: "The quality of the password is too low, please mix all of these criteria lower/upper case, punctuations and numbers."
			},
			showLoginForm: {
				message: "This page requires an authentication.",
				sessionTimeoutMessage: "Your session has timed out.<br />Please re-enter your password:",
				login: "Login",
				password: "Password",
				submit: "Ok",
				cancel: "Cancel",
				changeUserAccount: "Switch user account",
				reconnect: "Reconnect",
				unsupportedType: "Unsupported type"
			},
			confirmSessionDisconnection: {
				message: "Your account seems already in use elsewhere.<br /> Do you want to enforce the connection?",
				yes: "Yes",
				no: "No"
			},
			about: {
				message: "You are using the AskiaVista AJAX jQuery plugin version {0}",
				enablePlugins: "\r\n\r\nEnable plugins:\r\n",
				category: "      - Category: {0}\r\n",
				version: "      - Version: {0}\r\n",
				date: "      - Date: {0}\r\n",
				author: "      - Author: {0}\r\n",
				site: "      - Site: {0}\r\n",
				help: "      - Help: {0}\r\n",
				description: "      - Description: {0}\r\n",
				dependencies: "\r\n      DEPENDENCIES:\r\n",
				optional: " [Optional]"
			},
			humanActionSingular: {
				getQuestions: "a question",
				getResponses: "a response",
				getSurveys: "a survey",
				getProfiles: "a profile",
				getSubPopulations: "a sub-population",
				getWaves: "a wave",
				getUniverses: "a universe",
				getWeightings: "a weighting",
				getLevels: "a level",
				getChartTemplates: "a chart template",
				getTabStyles: "a table style",
				getXTabSettings: "a cross-tab settings",
				getPortfolios: "a portfolio",
				getPortfolioItems: "a portfolio item",
				getCalculatedQuestions: "a calculated question",
				getCalculations: "a calculation",
				getPages: "a page",
				search: "a question"
			}
		},
		cookie: {
			enable: !0,
			name: "askiavistaAuth",
			secure: !1
		},
		loadingMessage: '<img src="http://localhost/AskiaVistaReader.Net4/ajax-loader.gif" alt="Loading..." />',
		authenticityToken: "",
		authenticityTokenUrlParam: "askiaAuth",
		error: function(e) {
			alert(e)
		},
		showLoginForm: function(e) {
			if (!t.blockUI) return error(translate("error.cannotShowLoginForm")), p.abort(), !1;
			var r = e === "sessionTimeout" ? "showLoginForm.sessionTimeoutMessage" : "showLoginForm.message",
				i = e === "sessionTimeout" ? "showLoginForm.reconnect" : "showLoginForm.submit",
				s = e === "sessionTimeout" ? "showLoginForm.changeUserAccount" : "showLoginForm.cancel",
				o = [];
			return o.push("<h3>" + translate(r) + "</h3>"), o.push("<div>"), o.push('<p id="askiavista_error_message"></p>'), o.push('<table align="center">'), e !== "sessionTimeout" && (o.push("<tr>"), o.push('<td align="right"><label for="askiavista_login">' + translate("showLoginForm.login") + "</label></td>"), o.push('<td><input type="text" id="askiavista_login" size="20" /></td>'), o.push("</tr>")), o.push("<tr>"), o.push('<td align="right"><label for="askiavista_password">' + translate("showLoginForm.password") + "</label></td>"), o.push('<td align="left"><input type="password" id="askiavista_password" size="20" /></td>'), o.push("</tr>"), o.push("<tr>"), o.push('<td><a href="#" id="askiavista_cancel">' + translate(s) + "</a></td>"), o.push('<td align="right"><input type="button" id="askiavista_submit" value="' + translate(i) + '" /></td>'), o.push("</tr>"), o.push("</table>"), o.push("<br/></div>"), t.blockUI({
				css: {
					cursor: ""
				},
				message: o.join("")
			}), n.getElementById("askiavista_cancel").addEventListener("click", function() {
				return e !== "sessionTimeout" ? (t.unblockUI(), p.abort()) : (p.logout(), location.reload()), !1
			}), n.getElementById("askiavista_password").addEventListener("keyup", function(e) {
				e.keyCode === 13 && n.getElementById("askiavista_submit").click()
			}), n.getElementById("askiavista_submit").addEventListener("click", function() {
				n.getElementById("askiavista_error_message").innerHTML = config("loadingMessage");
				var r = {
					password: n.getElementById("askiavista_password").value,
					success: function() {
						t.unblockUI()
					},
					error: function(e) {
						n.getElementById("askiavista_error_message").innerHTML = e
					}
				};
				e !== "sessionTimeout" && (r.login = n.getElementById("askiavista_login").value), p.login(r)
			}), !0
		},
		confirmSessionDisconnection: function(e) {
			e = e || {};
			if (!t.blockUI) return confirm(translate("confirmSessionDisconnection.message").replace(/<br\s*\/?>/gi, "\r\n"));
			var r = [];
			r.push("<h3>" + translate("confirmSessionDisconnection.message") + "</h3>"), r.push("<div>"), r.push('<table align="center">'), r.push('<tr><td align="right"><input type="button" id="askiavista_dont_confirm" value="' + translate("confirmSessionDisconnection.no") + '" /></td>'), r.push('<td align="right"><input type="button" id="askiavista_confirm" value="' + translate(confirmSessionDisconnection.yes) + '" /></td>'), r.push("</tr>"), r.push("</table>"), r.push("<br/></div>"), t.blockUI({
				css: {
					cursor: ""
				},
				message: r.join("")
			}), n.getElementById("askiavista_dont_confirm").addEventListener("click", function() {
				return p.login({
					confirmSessionDisconnection: !1,
					success: e.success,
					error: e.error
				}), t.unblockUI(), p.abort(), !1
			}), n.getElementById("askiavista_confirm").addEventListener("click", function() {
				p.login({
					confirmSessionDisconnection: !0,
					success: e.success,
					error: e.error
				})
			})
		},
		disconnect: function() {
			alert(translate("error.sessionDisconnected"));
			var t = getUrlParameter("sso");
			t ? e.location = e.location.toString().replace("sso=" + t, "") : e.location.reload()
		}
	}, v = {
		isObject: function isObject(e) {
			return e != null && Object.prototype.toString.call(e) === "[object Object]"
		},
		isArray: function isArray(e) {
			return typeof Array.isArray == "function" ? Array.isArray(e) : Object.prototype.toString.call(e) === "[object Array]"
		},
		extend: function extend() {
			var e, t, n, r, i, s, o = arguments[0] || {},
				u = 1,
				a = arguments.length,
				f = !1;
			typeof o == "boolean" && (f = o, o = arguments[1] || {}, u = 2), typeof o != "object" && typeof o != "function" && (o = {}), a === u && (o = this, --u);
			for (; u < a; u++)
				if ((e = arguments[u]) != null)
					for (t in e) {
						n = o[t], r = e[t];
						if (o === r) continue;
						f && r && (v.isObject(r) || (i = v.isArray(r))) ? (i ? (i = !1, s = n && v.isArray(n) ? n : []) : s = n && v.isPlainObject(n) ? n : {}, o[t] = v.extend(f, s, r)) : r !== undefined && (o[t] = r)
					}
			return o
		},
		cookie: function cookie(t, r, i) {
			if (typeof r == "undefined") {
				var l = null;
				if (n.cookie && n.cookie != "") {
					var c = n.cookie.split(";");
					for (var h = 0; h < c.length; h++) {
						var e = c[h].toString().trim();
						if (e.substring(0, t.length + 1) == t + "=") {
							l = decodeURIComponent(e.substring(t.length + 1));
							break
						}
					}
				}
				return l
			}
			i = i || {}, r === null && (r = "", i.expires = -1);
			var s = "";
			if (i.expires && (typeof i.expires == "number" || i.expires.toUTCString)) {
				var o;
				typeof i.expires == "number" ? (o = new Date, o.setTime(o.getTime() + i.expires * 24 * 60 * 60 * 1e3)) : o = i.expires, s = "; expires=" + o.toUTCString()
			}
			var u = i.path ? "; path=" + i.path : "",
				a = i.domain ? "; domain=" + i.domain : "",
				f = i.secure ? "; secure" : "";
			n.cookie = [t, "=", encodeURIComponent(r), s, u, a, f].join("")
		},
		_param_add: function addParam(e, t, n) {
			n = typeof n == "function" ? n() : n, n = n === null ? "" : n === undefined ? "" : n, e.push(encodeURIComponent(t) + "=" + encodeURIComponent(n))
		},
		_param_build: function buildParams(e, t, n) {
			var r, i, s, o = /\[\]$/;
			if (t)
				if (v.isArray(n))
					for (r = 0, i = n.length; r < i; r++) o.test(t) ? v._param_add(e, t, n[r]) : v._param_build(e, t + "[" + (typeof n[r] == "object" ? r : "") + "]", n[r]);
				else if (n && v.isObject(n))
				for (s in n) n.hasOwnProperty(s) && v._param_build(e, t + "[" + s + "]", n[s]);
			else v._param_add(e, t, n);
			else if (v.isArray(n))
				for (r = 0, i = n.length; r < i; r++) v._param_add(e, n[r].name, n[r].value);
			else
				for (s in n) n.hasOwnProperty(s) && v._param_build(e, s, n[s]);
			return e
		},
		param: function param(e) {
			return v._param_build([], "", e).join("&").replace(/%20/g, "+")
		}
	}, m = {
		isReady: !1,
		callbacks: [],
		onDomReady: function onDomReady() {
			if (this.isReady) return;
			this.isReady = !0;
			var e, t;
			for (e = 0, t = this.callbacks.length; e < t; e += 1) this.callbacks[e]();
			this.callbacks.length = 0
		},
		ready: function ready(e) {
			if (this.isReady) {
				e();
				return
			}
			this.callbacks.push(e)
		},
		listen: function listen() {
			function fireDomReady() {
				m.onDomReady()
			}
			if (n.addEventListener) n.addEventListener("DOMContentLoaded", fireDomReady, !1);
			else if (n.all && !e.opera) {
				n.write('<script type="text/javascript" id="contentloadtag" defer="defer" src="javascript:void(0)"></script>');
				var t = n.getElementById("contentloadtag");
				t.onreadystatechange = function onReadyState() {
					this.readyState === "complete" && fireDomReady()
				}
			} else {
				var r = e.onload;
				e.onload = function() {
					setTimeout(fireDomReady, 0), typeof r == "function" && r()
				}
			}
		}
	}, a = function() {
		function Timer(r) {
			if (!r || !r.timer || typeof r.timer != "object") return null;
			if (!r.action || !n[r.action]) return null;
			if (r.timer.id && e[r.timer.id]) return e[r.timer.id].query = r, e[r.timer.id];
			var i = r.timer;
			return i.id = i.id || i.id || "timer_" + ++t, this.query = r, this.id = i.id, this.timeout = i.timeout && i.timeout > 5e3 ? i.timeout : 5e3, this.maxAttempts = i.maxAttempts || 5, this.maxExecutions = i.maxExecutions, this.wasStopped = !1, this.executionsCount = 0, this.errorCount = 0, this.pid = null, e[this.id] = this, e[this.id]
		}
		var e = {},
			t = 0,
			n = {
				display: !0,
				getQuestions: !0,
				getResponses: !0,
				getLanguages: !0,
				getSurveys: !0,
				getSurveyStatus: !0,
				getSurveySettings: !0,
				getProfiles: !0,
				getSubPopulation: !0,
				getSubPopulations: !0,
				getWaves: !0,
				getUniverses: !0,
				getWeightings: !0,
				getLevels: !0,
				getChartTemplates: !0,
				getTabStyles: !0,
				getXTabSettings: !0,
				getUserInfo: !0,
				getPortfolios: !0,
				getPortfolioItems: !0,
				getCalculatedQuestions: !0,
				getCalculations: !0,
				getPages: !0,
				search: !0,
				getInterviews: !0,
				getSharings: !0,
				getContacts: !0
			};
		return Timer.prototype.start = function timerStart(e) {
			this.wasStopped = !1;
			if (this.pid) return;
			if (!this.query.action || !n[this.query.action]) {
				this.isRunning = !1;
				return
			}
			e ? this.errorCount++ : this.errorCount = 0;
			if (this.errorCount >= this.maxAttempts) {
				this.remove();
				return
			}
			this.executionsCount++;
			if (this.maxExecutions && this.executionsCount >= this.maxExecutions) {
				this.remove();
				return
			}
			var t = this;
			this.pid = setTimeout(function onTimer() {
				if (t.wasStopped) return;
				t.pid = null, t.query.dmy = getDummyValue(), l.launcher.execute("AddQuery", t.query), l.wasRunning && l.execute()
			}, this.timeout)
		}, Timer.prototype.stop = function() {
			this.pid && clearTimeout(this.pid), this.pid = null, this.wasStopped = !0
		}, Timer.prototype.remove = function() {
			this.stop(), delete e[this.id]
		}, {
			create: function createTimer(e) {
				return !e || !e.timer || typeof e.timer != "object" ? null : new Timer(e)
			},
			getTimer: function getTimer(t) {
				return t ? e[t] : null
			},
			each: function(t) {
				if (typeof t != "function") return;
				var n;
				for (n in e) e.hasOwnProperty(n) && t(e[n])
			}
		}
	}(), d = function() {
		function Encoder(e) {
			this.encodeType = e || "entity", this.arr1 = ["&nbsp;", "&iexcl;", "&cent;", "&pound;", "&curren;", "&yen;", "&brvbar;", "&sect;", "&uml;", "&copy;", "&ordf;", "&laquo;", "&not;", "&shy;", "&reg;", "&macr;", "&deg;", "&plusmn;", "&sup2;", "&sup3;", "&acute;", "&micro;", "&para;", "&middot;", "&cedil;", "&sup1;", "&ordm;", "&raquo;", "&frac14;", "&frac12;", "&frac34;", "&iquest;", "&Agrave;", "&Aacute;", "&Acirc;", "&Atilde;", "&Auml;", "&Aring;", "&AElig;", "&Ccedil;", "&Egrave;", "&Eacute;", "&Ecirc;", "&Euml;", "&Igrave;", "&Iacute;", "&Icirc;", "&Iuml;", "&ETH;", "&Ntilde;", "&Ograve;", "&Oacute;", "&Ocirc;", "&Otilde;", "&Ouml;", "&times;", "&Oslash;", "&Ugrave;", "&Uacute;", "&Ucirc;", "&Uuml;", "&Yacute;", "&THORN;", "&szlig;", "&agrave;", "&aacute;", "&acirc;", "&atilde;", "&auml;", "&aring;", "&aelig;", "&ccedil;", "&egrave;", "&eacute;", "&ecirc;", "&euml;", "&igrave;", "&iacute;", "&icirc;", "&iuml;", "&eth;", "&ntilde;", "&ograve;", "&oacute;", "&ocirc;", "&otilde;", "&ouml;", "&divide;", "&oslash;", "&ugrave;", "&uacute;", "&ucirc;", "&uuml;", "&yacute;", "&thorn;", "&yuml;", "&quot;", "&amp;", "&lt;", "&gt;", "&OElig;", "&oelig;", "&Scaron;", "&scaron;", "&Yuml;", "&circ;", "&tilde;", "&ensp;", "&emsp;", "&thinsp;", "&zwnj;", "&zwj;", "&lrm;", "&rlm;", "&ndash;", "&mdash;", "&lsquo;", "&rsquo;", "&sbquo;", "&ldquo;", "&rdquo;", "&bdquo;", "&dagger;", "&Dagger;", "&permil;", "&lsaquo;", "&rsaquo;", "&euro;", "&fnof;", "&Alpha;", "&Beta;", "&Gamma;", "&Delta;", "&Epsilon;", "&Zeta;", "&Eta;", "&Theta;", "&Iota;", "&Kappa;", "&Lambda;", "&Mu;", "&Nu;", "&Xi;", "&Omicron;", "&Pi;", "&Rho;", "&Sigma;", "&Tau;", "&Upsilon;", "&Phi;", "&Chi;", "&Psi;", "&Omega;", "&alpha;", "&beta;", "&gamma;", "&delta;", "&epsilon;", "&zeta;", "&eta;", "&theta;", "&iota;", "&kappa;", "&lambda;", "&mu;", "&nu;", "&xi;", "&omicron;", "&pi;", "&rho;", "&sigmaf;", "&sigma;", "&tau;", "&upsilon;", "&phi;", "&chi;", "&psi;", "&omega;", "&thetasym;", "&upsih;", "&piv;", "&bull;", "&hellip;", "&prime;", "&Prime;", "&oline;", "&frasl;", "&weierp;", "&image;", "&real;", "&trade;", "&alefsym;", "&larr;", "&uarr;", "&rarr;", "&darr;", "&harr;", "&crarr;", "&lArr;", "&uArr;", "&rArr;", "&dArr;", "&hArr;", "&forall;", "&part;", "&exist;", "&empty;", "&nabla;", "&isin;", "&notin;", "&ni;", "&prod;", "&sum;", "&minus;", "&lowast;", "&radic;", "&prop;", "&infin;", "&ang;", "&and;", "&or;", "&cap;", "&cup;", "&int;", "&there4;", "&sim;", "&cong;", "&asymp;", "&ne;", "&equiv;", "&le;", "&ge;", "&sub;", "&sup;", "&nsub;", "&sube;", "&supe;", "&oplus;", "&otimes;", "&perp;", "&sdot;", "&lceil;", "&rceil;", "&lfloor;", "&rfloor;", "&lang;", "&rang;", "&loz;", "&spades;", "&clubs;", "&hearts;", "&diams;"], this.arr2 = ["&#160;", "&#161;", "&#162;", "&#163;", "&#164;", "&#165;", "&#166;", "&#167;", "&#168;", "&#169;", "&#170;", "&#171;", "&#172;", "&#173;", "&#174;", "&#175;", "&#176;", "&#177;", "&#178;", "&#179;", "&#180;", "&#181;", "&#182;", "&#183;", "&#184;", "&#185;", "&#186;", "&#187;", "&#188;", "&#189;", "&#190;", "&#191;", "&#192;", "&#193;", "&#194;", "&#195;", "&#196;", "&#197;", "&#198;", "&#199;", "&#200;", "&#201;", "&#202;", "&#203;", "&#204;", "&#205;", "&#206;", "&#207;", "&#208;", "&#209;", "&#210;", "&#211;", "&#212;", "&#213;", "&#214;", "&#215;", "&#216;", "&#217;", "&#218;", "&#219;", "&#220;", "&#221;", "&#222;", "&#223;", "&#224;", "&#225;", "&#226;", "&#227;", "&#228;", "&#229;", "&#230;", "&#231;", "&#232;", "&#233;", "&#234;", "&#235;", "&#236;", "&#237;", "&#238;", "&#239;", "&#240;", "&#241;", "&#242;", "&#243;", "&#244;", "&#245;", "&#246;", "&#247;", "&#248;", "&#249;", "&#250;", "&#251;", "&#252;", "&#253;", "&#254;", "&#255;", "&#34;", "&#38;", "&#60;", "&#62;", "&#338;", "&#339;", "&#352;", "&#353;", "&#376;", "&#710;", "&#732;", "&#8194;", "&#8195;", "&#8201;", "&#8204;", "&#8205;", "&#8206;", "&#8207;", "&#8211;", "&#8212;", "&#8216;", "&#8217;", "&#8218;", "&#8220;", "&#8221;", "&#8222;", "&#8224;", "&#8225;", "&#8240;", "&#8249;", "&#8250;", "&#8364;", "&#402;", "&#913;", "&#914;", "&#915;", "&#916;", "&#917;", "&#918;", "&#919;", "&#920;", "&#921;", "&#922;", "&#923;", "&#924;", "&#925;", "&#926;", "&#927;", "&#928;", "&#929;", "&#931;", "&#932;", "&#933;", "&#934;", "&#935;", "&#936;", "&#937;", "&#945;", "&#946;", "&#947;", "&#948;", "&#949;", "&#950;", "&#951;", "&#952;", "&#953;", "&#954;", "&#955;", "&#956;", "&#957;", "&#958;", "&#959;", "&#960;", "&#961;", "&#962;", "&#963;", "&#964;", "&#965;", "&#966;", "&#967;", "&#968;", "&#969;", "&#977;", "&#978;", "&#982;", "&#8226;", "&#8230;", "&#8242;", "&#8243;", "&#8254;", "&#8260;", "&#8472;", "&#8465;", "&#8476;", "&#8482;", "&#8501;", "&#8592;", "&#8593;", "&#8594;", "&#8595;", "&#8596;", "&#8629;", "&#8656;", "&#8657;", "&#8658;", "&#8659;", "&#8660;", "&#8704;", "&#8706;", "&#8707;", "&#8709;", "&#8711;", "&#8712;", "&#8713;", "&#8715;", "&#8719;", "&#8721;", "&#8722;", "&#8727;", "&#8730;", "&#8733;", "&#8734;", "&#8736;", "&#8743;", "&#8744;", "&#8745;", "&#8746;", "&#8747;", "&#8756;", "&#8764;", "&#8773;", "&#8776;", "&#8800;", "&#8801;", "&#8804;", "&#8805;", "&#8834;", "&#8835;", "&#8836;", "&#8838;", "&#8839;", "&#8853;", "&#8855;", "&#8869;", "&#8901;", "&#8968;", "&#8969;", "&#8970;", "&#8971;", "&#9001;", "&#9002;", "&#9674;", "&#9824;", "&#9827;", "&#9829;", "&#9830;"]
		}
		return Encoder.prototype = {
			isEmpty: function isEmpty(e) {
				return e ? e === null || e.length === 0 || /^\s+$/.test(e) : !0
			},
			html2Numerical: function html2Numerical(e) {
				return this.swapArrayVals(e, this.arr1, this.arr2)
			},
			numerical2Html: function numerical2Hml(e) {
				return this.swapArrayVals(e, this.arr2, this.arr1)
			},
			numEncode: function numEncode(e) {
				if (this.isEmpty(e)) return "";
				var t = [],
					n, r;
				for (n = 0, r = e.length; n < r; n++) {
					var i = e.charAt(n);
					i < " " || i > "~" ? (t.push("&#"), t.push(i.charCodeAt()), t.push(";")) : t.push(i)
				}
				return t.join("")
			},
			htmlDecode: function htmlDecode(e) {
				var t, n, r, i = e,
					s, o;
				if (this.isEmpty(i)) return "";
				i = this.html2Numerical(i), r = i.match(/&#[0-9]{1,5};/g);
				if (r !== null)
					for (s = 0, o = r.length; s < o; s++) n = r[s], t = n.substring(2, n.length - 1), t >= -32768 && t <= 65535 ? i = i.replace(n, String.fromCharCode(t)) : i = i.replace(n, "");
				return i
			},
			htmlEncode: function htmlEncode(e, t) {
				if (this.isEmpty(e)) return "";
				t = t || !1, t && (this.encodeType === "numerical" ? e = e.replace(/&/g, "&#38;") : e = e.replace(/&/g, "&amp;")), e = this.xssEncode(e, !1);
				if (this.EncodeType === "numerical" || !t) e = this.html2Numerical(e);
				return e = this.numEncode(e), t || (e = e.replace(/&#/g, "##AMPHASH##"), this.encodeType === "numerical" ? e = e.replace(/&/g, "&#38;") : e = e.replace(/&/g, "&amp;"), e = e.replace(/##AMPHASH##/g, "&#")), e = e.replace(/&#\d*([^\d;]|$)/g, "$1"), t || (e = this.correctEncoding(e)), this.encodeType === "entity" && (e = this.numerical2Html(e)), e
			},
			xssEncode: function xssEncode(e, t) {
				return this.isEmpty(e) ? "" : (t = t || !0, t ? (e = e.replace(/\'/g, "&#39;"), e = e.replace(/\"/g, "&quot;"), e = e.replace(/</g, "&lt;"), e = e.replace(/>/g, "&gt;")) : (e = e.replace(/\'/g, "&#39;"), e = e.replace(/\"/g, "&#34;"), e = e.replace(/</g, "&#60;"), e = e.replace(/>/g, "&#62;")), e)
			},
			hasEncoded: function hasEncoded(e) {
				return /&#[0-9]{1,5};/g.test(e) ? !0 : /&[A-Z]{2,6};/gi.test(e) ? !0 : !1
			},
			stripUnicode: function stripUnicode(e) {
				return e.replace(/[^\x20-\x7E]/g, "")
			},
			correctEncoding: function correctEncoding(e) {
				return e.replace(/(&amp;)(amp;)+/, "$1")
			},
			swapArrayVals: function swapArrayVals(e, t, n) {
				if (this.isEmpty(e)) return "";
				var r, i, s;
				if (t && n && t.length === n.length)
					for (i = 0, s = t.length; i < s; i++) r = new RegExp(t[i], "g"), e = e.replace(r, n[i]);
				return e
			},
			inArray: function inArray(e, t) {
				for (var n = 0, r = t.length; n < r; n++)
					if (t[n] === e) return n;
				return -1
			}
		}, {
			htmlEncode: function htmlEncode(e, t, n) {
				var r = new Encoder(n);
				return r.htmlEncode(e, t).replace(/&#10;/g, "\r\n").replace(/&#9;/g, "	").replace(/&#39;/g, "'")
			},
			htmlDecode: function htmlDecode(e) {
				var t = new Encoder;
				return t.htmlDecode(e)
			}
		}
	}(), f = function() {
		function verifyChartCategory(e) {
			return !e.draw || typeof e.draw != "function" ? (error(translate("error.undefinedDrawMethod", e.name)), !1) : !0
		}

		function verifyPluginCategory(e) {
			return e.category ? e.category === "chart" ? verifyChartCategory(e) : !0 : !0
		}

		function verifyPlugin(e) {
			return e.name ? n[e.name] ? !1 : verifyPluginCategory(e) : (error(translate("error.undefinedPluginName")), !1)
		}

		function initPluginDeprecations(t) {
			if (!t.deprecatedMethods) return;
			var n, r;
			for (n = 0, r = t.deprecatedMethods.length; n < r; n += 1) e.askiaVista.deprecate(t.deprecatedMethods[n])
		}

		function initPluginAbout(e) {
			if (e.about && typeof e.about == "function") return e;
			var t = e;
			return t.about = function(e) {
				var t, n, r, i, s, o = " + " + this.name + "\r\n";
				this.category && (o += translate("about.category", this.category)), this.version && (o += translate("about.version", this.version)), this.date && (o += translate("about.date", this.date)), this.author && (o += translate("about.author", this.author)), this.website && (o += translate("about.site", this.website));
				if (!e) return o;
				this.helpUrl && (o += translate("about.help", this.helpUrl)), this.description && (o += translate("about.description", this.description));
				if (this.dependencies && this.dependencies.length) {
					o += translate("about.dependencies");
					for (t = 0, n = this.dependencies.length; t < n; t += 1) typeof this.dependencies[t] != "function" && (r = typeof this.dependencies[t] == "string" ? this.dependencies[t] : "", i = "", s = !0, v.isObject(this.dependencies[t]) && (r = this.dependencies[t].name || "", i = this.dependencies[t].version || "", s = typeof this.dependencies[t].require == "boolean" ? this.dependencies[t].require : !0), r !== "" && (i !== "" && (i = " (" + i + ")"), s = s ? "" : translate("about.optional"), o += "            * " + r + i + s + "\r\n"))
				}
				return o
			}, t
		}

		function initPluginTranslation(e) {
			return e.translate && typeof e.translate == "function" ? e : (e.translate = function(e) {
				var t = this.name.replace(/\s/gi, "_") + ".",
					n, r, i = [];
				e.indexOf(t, 0) === -1 && (e = t + e), i.push(e);
				if (arguments.length > 1)
					for (n = 1, r = arguments.length; n < r; n += 1) i.push(arguments[n]);
				return translate.apply(null, i)
			}, e)
		}

		function initPlugin(e) {
			var t = e;
			return initPluginDeprecations(t), t = initPluginAbout(t), t = initPluginTranslation(t), t
		}

		function addPlugin(e) {
			var t = e;
			typeof e == "string" && (t = {
				name: e
			});
			if (!verifyPlugin(t)) return;
			t = initPlugin(t), n[t.name] = t, i.push(n[t.name]), n[t.name].init && typeof n[t.name].init == "function" && n[t.name].init()
		}

		function isCompatibleVersion(e, t) {
			var n = function(e, t) {
					var n = /([><=]*)\s*([0-9.]+)[ -.]*(alpha|beta|rc)?[ -.]*([0-9]*)/,
						r = n.exec(e),
						i = r[1] || ">=",
						s = r[2].replace(/[.]/gi, ""),
						o, u, a, f = "";
					while (s.length < 3) s += "0";
					return o = r[3] || ".9", u = r[4], o === "alpha" && (o = ".1"), o === "beta" && (o = ".2"), o === "rc" && (o = ".3"), a = parseFloat(s + f + o + f + u), t ? i + f + a : a + f
				},
				r = function(e) {
					var t = /([0-9.]+)([><=]+)([0-9.]+)/,
						n = t.exec(e),
						r = parseFloat(n[1]),
						i = n[2],
						s = parseFloat(n[3]);
					switch (i) {
						case "<":
							return r < s;
						case "<=":
							return r <= s;
						case ">":
							return r > s;
						case ">=":
							return r >= s;
						case "=":
							return r === s;
						case "==":
							return r === s;
						default:
							return r <= s
					}
				};
			return r("(" + n(e) + n(t, !0) + ")")
		}

		function refreshPlugins() {
			t.blockUI && addPlugin({
				name: "jquery.blockUI",
				author: "M. Alsup",
				category: "Windows and Overlays",
				website: "http://malsup.com/jquery/block/",
				version: t.blockUI.version,
				date: "06-JAN-2010"
			})
		}

		function validateDependencies() {
			refreshPlugins();
			var e = [],
				s, o, u, a = function(i) {
					var s, o, u, a, f, l, c;
					for (s = 0, o = i.dependencies.length; s < o; s += 1) {
						a = "", f = "", l = !0, v.isObject(i.dependencies[s]) && (a = i.dependencies[s].name || "", f = i.dependencies[s].version || "", i.dependencies[s].require !== undefined && typeof i.dependencies[s].require == "boolean" && (l = i.dependencies[s].require)), typeof i.dependencies[s] == "string" && (a = i.dependencies[s]);
						if (typeof i.dependencies[s] == "function") u = i.dependencies[s](), typeof u == "string" && u.length && e.push(u);
						else if (a !== "")
							if (!n[a] && a !== "askiaVista" && a !== "jquery") l && e.push(translate("error.missingDependency", a, i.name));
							else {
								c = "";
								switch (a) {
									case "askiaVista":
										c = r.version;
										break;
									case "jquery":
										c = t.fn.jquery;
										break;
									default:
										c = n[a].version
								}
								c !== "" && f !== "" && (isCompatibleVersion(c, f) || e.push(translate("error.incorrectVersionOfPlugin", f, a, i.name)))
							}
					}
				};
			a({
				name: "askiaVista",
				version: r.version,
				dependencies: r.dependencies
			});
			for (s = 0, o = i.length; s < o; s += 1) u = i[s], u.dependencies && a(u);
			e.length && error(translate("error.pluginsExceptions") + e.join("\r\n"))
		}

		function getPluginByName(e) {
			return n[e] ? n[e] : (error(translate("error.cannotFoundPlugin", e)), !1)
		}

		function getPluginsByAction(e) {
			var t = [],
				n, r;
			for (n = 0, r = i.length; n < r; n += 1) i[n][e] && typeof i[n][e] == "function" && t.push(i[n]);
			return t
		}

		function getPluginsByLocale() {
			var e = [],
				t, n;
			for (t = 0, n = i.length; t < n; t += 1) i[t].localeFile && typeof i[t].localeFile == "string" && e.push(i[t]);
			return e
		}

		function contains(e) {
			return n[e] ? !0 : !1
		}

		function getAboutText() {
			var e = "",
				t, n;
			for (t = 0, n = i.length; t < n; t += 1) e.length > 2 && e.substring(e.length - 2, e.length) !== "\r\n" && (e += "\r\n"), e += i[t].about();
			return e
		}
		var n = {},
			i = [];
		return {
			add: addPlugin,
			get: getPluginByName,
			getAllByAction: getPluginsByAction,
			getAllWithLocale: getPluginsByLocale,
			contains: contains,
			refresh: refreshPlugins,
			validate: validateDependencies,
			about: getAboutText
		}
	}(), l = function() {
		function addQuery(e, n) {
			var i = e.transaction ? r : t;
			n ? i.unshift(e) : i.push(e)
		}

		function authenticityToken(e) {
			var t, n, r = config("cookie"),
				i, s = {};
			if (e) return u = e, r.enable && (r.secure && (s.secure = !0), v.cookie(r.name, u, s)), u;
			if (u !== "") return u;
			t = config("authenticityToken");
			if (t !== "") return t;
			n = config("authenticityTokenUrlParam"), t = getUrlParameter(n);
			if (t !== "") return t;
			if (r.enable) {
				i = v.cookie(r.name);
				if (i) return i
			}
			return ""
		}

		function explicitToken(e) {
			var t = config("cookie"),
				n, r = {};
			if (e) return h = e, t.enable && (t.secure && (r.secure = !0), v.cookie("askiaVistaExplicit", h, r)), h;
			if (h !== "") return h;
			if (t.enable) {
				n = v.cookie("askiaVistaExplicit");
				if (n) return n
			}
			return ""
		}

		function getSSOKey() {
			var e = getUrlParameter("sso");
			return d[e] ? "" : e
		}

		function logout() {
			u = "", h = "", config("authenticityToken", "");
			var e = config("cookie");
			e.enable && (v.cookie(e.name, null), v.cookie("askiaVistaExplicit", null));
			var t = getSSOKey();
			t && (d[t] = !0)
		}

		function executeQueryNow(e) {
			if (p) return;
			e && e.xhr && e.xhr.execute && e.xhr.execute()
		}

		function executeNextQuery(e) {
			if (p) return;
			e && (o = !1), l.wasRunning = !0;
			if (o) return;
			if (!t.length) return;
			o = !0;
			var n = t.shift();
			executeQueryNow(n)
		}

		function abortQueries(e) {
			p = !0, a.each(function removeAllTimers(e) {
				e.remove()
			}), e && (t = []);
			var n, r, i;
			for (r = 0, i = t.length; r < i; r += 1) n = t[r], m.execute("Abort", n)
		}
		var t = [],
			r = [],
			s = !1,
			o = !1,
			u = "",
			h = "",
			p = !1,
			d = {},
			m = function() {
				function execute(e, n, r, i) {
					var s = f.getAllByAction("before" + e),
						o = !0,
						u, l, c, h = function(e) {
							return e && v.isObject(e) && e.action
						},
						p = function(e, t) {
							return h(t) ? t : h(t) ? e : null
						},
						d = function(e) {
							if (!e || !v.isObject(e)) return;
							var t = p(n, r),
								i;
							if (!t) return;
							for (i in e) e.hasOwnProperty(i) && (t[i] = e[i]);
							h(r) ? r = t : h(n) && (n = t)
						};
					for (u = 0, l = s.length; u < l; u += 1) c = s[u]["before" + e](n, r, i), c !== undefined && (typeof c == "boolean" && !c && (o = !1), d(c));
					return o && d(t["execute" + e](n, r, i)), setTimeout(function() {
						var t = f.getAllByAction("after" + e),
							s, o, u;
						for (s = 0, o = t.length; s < o; s += 1) d(t[s]["after" + e](n, r, i));
						(e === "Success" || e === "Error") && r.timer && typeof r.timer == "object" && r.timer.id && (u = a.getTimer(r.timer.id), u && !u.wasStopped && u.start(e === "Error"))
					}, 10), p(n, r)
				}
				var t = {
					executeBeginTransaction: function() {
						r = []
					},
					executeCommit: function(e) {
						if (!r.length) return;
						var n = {
								action: "doTransaction",
								transactions: []
							},
							i = 0,
							s = r.length,
							o;
						e && v.isObject(e) && v.extend(!0, n, e);
						for (; i < s; i += 1) delete r[i].transaction, n.transactions.push(r[i]);
						n.xhr = new c(n), o = n.success, n.success = function(e) {
							var t, r, i, s, u;
							for (t = 0, r = n.transactions.length; t < r; t += 1) i = e[t], i.stylesheet && (u = {
								stylesheet: i.stylesheet
							}), s = i.success ? "Success" : "Error", l.launcher.execute(s, i.data, n.transactions[t], u);
							typeof o == "function" && o()
						}, t.executeAddQuery(n), l.wasRunning && l.execute()
					},
					executeAddQuery: function(e) {
						e.async === !1 && !e.transaction ? l.executeNow(e) : l.add(e)
					},
					executeAbort: function(e) {
						if (e.timer && typeof e.timer == "object" && e.timer.id) {
							var t = a.getTimer(e.timer.id);
							t && t.remove()
						}
						if (e.action !== i.display) return;
						if (e.success) return;
						if (!e.containerId) return;
						n.getElementById(e.containerId).innerHTML = translate("aborted")
					},
					executeError: function(e, t) {
						e = translate(e), t.error ? t.error(e, t) : t.action === i.display ? (e = e ? e : translate("error.unhandleError"), n.getElementById(t.containerId).innerHTML = e) : t.action === i.login && error(e)
					},
					executeSecurityError: function(e, t) {
						e = translate(e), error(e)
					},
					executeSuccess: function(e, t, n) {
						t.success ? t.success(e, t, n) : execute("DisplayResult", e, t, n)
					},
					executeDisplayResult: function(e, r, s) {
						var o = !0,
							u, a, l = typeof s == "number" ? s : v.isObject(s) && "page" in s ? s.page || 0 : r.page || 0,
							c, h, p = !1,
							d = e,
							m = v.extend({}, r),
							g, y = r.containerId,
							b, w, E;
						v.isObject(s) && (s.stylesheet && (c = s.stylesheet), s.chart && (h = s.chart), s.singlePage && (p = s.singlePage)), r.action === i.getPortfolioItem && (m = v.extend(!0, {}, m, {
							action: i.getPages
						}), typeof d == "string" && (b = JSON.parse(d)), m = v.extend(!0, m, b.definition || {}), d = b.results || []);
						if (m.action === i.display || m.action === i.getPages && m.containerId || m.action === i.getInterviews && m.containerId || m.action === i.getActivity && m.containerId || m.action === i.getActivityStats && m.containerId) {
							m.action === i.getPages && (typeof d == "string" ? a = JSON.parse(d) : a = d, l > a.length ? l = a.length : l < 0 && (l = 0)), m.action === i.getInterviews && (typeof d == "string" && (d = JSON.parse(e)), d = d.interviews);
							if (m.action === i.getActivity || m.action === i.getActivityStats) typeof d == "string" && (d = JSON.parse(e)), d = d.items;
							(!m.chart || !v.isObject(m.chart)) && h && (m.chart = h), m.chart && typeof m.chart != "string" && m.chart.name && (u = f.get(m.chart.name), !p && u && (m.action === i.getPages ? a[l].type === "chart" && a[l].output && (u.draw(a[l].output, m.chart.options, m), o = !1) : (u.draw(d, m.chart.options, m), o = !1)));
							if (o) {
								if (m.action === i.getPages)
									if (p) {
										d = [];
										for (w = 0, E = a.length; w < E; w += 1) a[w].type === "chart" && a[w].output ? d.push('<div id="' + y + "_page" + w + '" class="askiavista-page"></div>') : (d.push('<div id="' + y + "_page" + w + '" class="askiavista-page">'), d.push(a[w].output || a[w].id + ". " + a[w].name + " (" + a[w].type + ")"), d.push("</div>"));
										d = d.join("")
									} else d = a[l].output || a[l].id + ". " + a[l].name + " (" + a[l].type + ")";
								(m.action === i.getInterviews && l > 0 || m.action === i.getActivity && m.before > 0) && m.lazyLoading ? n.getElementById(y).querySelector(".askiatable.askia-rawdata tbody").insertAdjacentHTML("beforeEnd", d) : m.action === i.getActivity && m.after > 0 && m.lazyLoading ? n.getElementById(y).querySelector(".askiatable.askia-rawdata tbody").insertAdjacentHTML("afterBegin", d) : (t.executeLoadStylesheet(c), n.getElementById(y).innerHTML = d);
								if (p)
									for (w = 0, E = a.length; w < E; w += 1) a[w].type === "chart" && a[w].output && (g = v.extend({}, m, {
										containerId: y + "_page" + w
									}), u.draw(a[w].output, m.chart.options, g))
							}
						}
					},
					executeLoadStylesheet: function(t) {
						if (!t || typeof t.root != "string" || typeof t.definition != "string") return;
						var r = e.document,
							i, s;
						if (r.getElementById("tabstyle-" + t.root)) return;
						i = r.createElement("style"), i.setAttribute("type", "text/css"), i.id = "tabstyle-" + t.root, i.styleSheet ? i.styleSheet.cssText = t.definition : (s = n.createTextNode(t.definition), i.appendChild(s)), r.getElementsByTagName("head")[0].appendChild(i)
					}
				};
				return {
					execute: execute,
					executeSuccess: t.executeSuccess,
					executeDisplayResult: function executeDisplayResult(e, t, n) {
						return execute("DisplayResult", e, t, n)
					},
					executeLoadStylesheet: t.executeLoadStylesheet
				}
			}();
		return {
			authenticityToken: authenticityToken,
			explicitToken: explicitToken,
			getSSOKey: getSSOKey,
			logout: logout,
			wasRunning: s,
			add: addQuery,
			executeNow: executeQueryNow,
			execute: executeNextQuery,
			abort: abortQueries,
			launcher: m
		}
	}(), c = function() {
		function sanitizeParam(e) {
			var t = {},
				n, r, o = [],
				u, a;
			for (n in e) {
				if (!e.hasOwnProperty(n) || !s.hasOwnProperty(n) || typeof e[n] == "function" || e[n] === null || e[n] === undefined) continue;
				r = e[n], (n === s.rows || n === s.columns || n === s.edges || n === s.questions || n === s.calculations) && typeof r == "string" && (r = r.split("|")), n === "timer" && (r = !0);
				if (v.isObject(r) || v.isArray(r)) {
					if (n === s.transactions) {
						for (u = 0, a = r.length; u < a; u += 1) o[u] = sanitizeParam(r[u]);
						r = o
					}
					n === s.chart && (r = {}, e.chart.name && (r.name = e.chart.name), e.chart.options && (r.options = e.chart.options), e.format || (e.action === i.display ? t.format = "json" : e.action === i.getPages && (t.format = {
						table: "html",
						chart: "json"
					}))), r = JSON.stringify(r)
				}
				t[n] = r
			}
			return t
		}

		function sanitizeQuery(e) {
			var t = sanitizeParam(e),
				n = l.explicitToken(),
				i = l.getSSOKey(),
				o = config("appName"),
				u = config("appVersion");
			return t[s.authenticityToken] = l.authenticityToken(), n && (t[s.explicitAuthenticityToken] = n), i && (t[s.ssoKey] = i), o && (t[s.appName] = o), u && (t[s.appVersion] = u), t[s.ajaxApiVersion] = r.version, t[s.timeOffset] = r.timeOffset, t
		}

		function getAJAX(t) {
      console.log(t.query)
      console.log(v.param(sanitizeQuery(t.query)))
			var n = sanitizeQuery(t.query),
				r = {
					url: config("url"),
					async: t.query.async !== !1,
					data: v.param(n),
					type: "post",
					originalData: n,
					error: function(n, r) {
						if (r === "abort") {
							l.execute(e);
							return
						}
						if (t.query.action === i.loadLocale) {
							t.query.error && typeof t.query.error == "function" && t.query.error(), l.execute(e);
							return
						}
						try {
							JSON.parse(n)
						} catch (s) {
              console.log(n,r,s)
							n = d.htmlEncode(n, !0)
						}
						l.launcher.execute("Error", n, t.query);
						if (t.query.action === i.login) return;
						l.execute(e)
					},
					success: function(n) {
						if (t.aborted) {
							this.error("", "abort");
							return
						}
						var r, s, o, u, a, f;
						if (t.query.action === i.loadLocale) {
							t.query.success && typeof t.query.success == "function" && t.query.success(), l.execute(e);
							return
						}
						typeof n == "string" ? r = JSON.parse(n) : r = n, r = r[0];
						if (t.query.action === i.logout) {
							l.launcher.execute("Success", r.data, t.query);
							return
						}
						if (!r.success && r.severity === b || r.token === "" && t.query.action !== i.login && t.query.action !== i.logout) {
							l.launcher.execute("SecurityError", d.htmlEncode(r.data, !0), t.query), this.error(r.data);
							return
						}
						if (!r.success && r.severity !== y) {
							this.error(r.data);
							return
						}
						if (r.token === "sessionDisconnected") {
							l.logout(), l.abort(!0), s = config("disconnect"), typeof s == "function" ? s() : this.error(translate("error.sessionDisconnected"));
							return
						}
						if (r.token === "requireLogin" || r.severity === y || r.token === "sessionTimeout" || r.token === "confirmSessionDisconnection") {
							(r.token === "sessionTimeout" || r.token === "confirmSessionDisconnection") && r.explicitToken && l.explicitToken(r.explicitToken), u = r.token !== "confirmSessionDisconnection" || !r.explicitToken ? "showLoginForm" : "confirmSessionDisconnection", a = u === "showLoginForm" ? r.token : t.query, u !== "confirmSessionDisconnection" && l.add(t.query, !0), s = config(u), typeof s == "function" ? (f = s(a), u === "confirmSessionDisconnection" && typeof f == "boolean" && p.login({
								confirmSessionDisconnection: f,
								success: t.query.success,
								error: t.query.error
							})) : this.error(translate("error.authenticationRequire"));
							return
						}
						r.token !== "portfolioToken" && r.token !== "portfolioItemToken" && l.authenticityToken(r.token), r.explicitToken && l.explicitToken(r.explicitToken), r.stylesheet && (o = o || {}, o.stylesheet = r.stylesheet), r.singlePage && (o = o || {}, o.singlePage = r.singlePage), r.chart && (o = o || {}, o.chart = r.chart), l.launcher.execute("Success", r.data, t.query, o), l.execute(e)
					}
				};
			return t.query.dataType && (r.dataType = t.query.dataType), r
		}

		function appendQueryToInputForm(e, n, r) {
			function addInput(t, r) {
				var i = e.createElement("input");
				i.setAttribute("type", "hidden"), i.setAttribute("name", t), i.value = r, n.appendChild(i)
			}
			var i, s;
			if (v.isObject(r)) {
				for (i in r)
					if (r.hasOwnProperty(i)) {
						if (r[i] === null || r[i] === undefined) continue;
						addInput(i.toString(), r[i].toString())
					}
			} else {
				if (typeof r != "string") return !1;
				t.each(r.split("&"), function() {
					s = this.split("="), addInput(s[0], s[1])
				})
			}
			return !0
		}

		function executeWithIFrame(e, t) {
			var n = e.context.document,
				r = t.originalData;
			if (!appendQueryToInputForm(n, e.form[0], r)) {
				t.error(translate("error.incorrectIFrameArg"));
				return
			}
			e.callback = function iFrameCallback(n) {
				t.success(n), e.reload(), delete e.callback
			}, e.form.submit()
		}

		function XHR(e) {
			this.query = e, this.jqxhr = null, this.aborted = !1
		}
		var e = !0;
		return XHR.prototype.execute = function executeXHR() {
			var e = getAJAX(this);
			if (this.query.fromIFrame) {
				p.iFrames[this.query.fromIFrame] || e.error("error.couldNotFindTheIFrame"), executeWithIFrame(p.iFrames[this.query.fromIFrame], e);
				return
			}
			this.aborted ? e.error("", "abort") : this.jqxhr = t.ajax(e)
		}, XHR.prototype.abort = function() {
			this.aborted = !0, this.jqxhr && this.jqxhr.abort && this.jqxhr.abort()
		}, XHR.sanitizeQuery = sanitizeQuery, XHR.appendQueryToInputForm = appendQueryToInputForm, XHR
	}(), h = function() {
		function IFrame(e) {
			e.action = i.createIFrame, this.options = e, this.id = e.id, t('<iframe id="' + e.id + '" src="' + this.getURL() + '" style="display:none"></iframe>').appendTo("body"), this.element = t("#" + e.id)
		}
		return IFrame.prototype.setContext = function setContext(e) {
			this.context = e, this.form = t(this.context.document).find("form"), this.options.fileUploadName && this.form.append('<input type="file" id="' + this.options.fileUploadName + '" name="' + this.options.fileUploadName + '" />'), typeof this.options.success == "function" && this.options.success(this, this.options)
		}, IFrame.prototype.selectFile = function selectFile(e) {
			e = e || {};
			var t = e.fileUploadName || this.options.fileUploadName,
				n;
			if (!t) {
				typeof e.error == "function" && e.error(translate("error.noFileUploadNameSpecified"), e);
				return
			}
			n = this.form.find("#" + t), n.length || (this.form.append('<input type="file" id="' + t + '" name="' + t + '" />'), this.form.find("#" + t));
			if (!n.length) {
				typeof e.error == "function" && e.error(translate("error.couldNotFindInputFile"), e);
				return
			}
			n.unbind("change.askiavista").bind("change.askiavista", function onChange() {
				var t = this.value,
					n = /[\/\\]?([^\/\\]+)$/,
					r;
				if (t && e.pattern && !e.pattern.test(t)) {
					this.value = "", typeof e.error == "function" && e.error(translate("error.invalidFileExtension"), e);
					return
				}
				r = t.match(n), r && r.length && (t = r[1]), typeof e.success == "function" && e.success(t, e)
			}).click()
		}, IFrame.prototype.reset = function reset() {
			this.form && this.form.length && this.form[0].reset()
		}, IFrame.prototype.getURL = function getURL() {
			var e = c.sanitizeQuery(this.options),
				t = [];
			return t.push(config("url") + "?action=" + e.action), t.push("id=" + encodeURIComponent(this.options.id)), t.push(s.authenticityToken + "=" + encodeURIComponent(e.authenticityToken)), e.explicitAuthenticityToken && t.push(s.explicitAuthenticityToken + "=" + encodeURIComponent(e.explicitAuthenticityToken)), t.push("dmy=" + getDummyValue()), t.join("&")
		}, IFrame.prototype.reload = function reload() {
			this.element.attr("src", this.getURL())
		}, IFrame.prototype.destroy = function destroy() {
			this.element.empty().remove(), delete this.element, delete this.form, delete this.context, delete p.iFrames[this.options.id]
		}, IFrame
	}(), p = function() {
		function isRequireSurvey(e) {
			var t = [i.getSurveys, i.loadLocale, i.login, i.getChartTemplates, i.getTabStyles, i.getCalculations, i.getUserInfo, i.saveUserInfo, i.getResources, i.getActivity, i.getActivityStats, i.getActivityFilters];
			return t.indexOf(e) === -1
		}

		function extendQuery(e, t) {
			var n = [s.language],
				r = [s.settings, s.calculations, s.chart, s.tabStyle, s.subPopulation, s.waves, s.universe, s.weighting, s.level, s.title, s.width, s.height],
				o, a, f, l, h = e.entity && e.entity.toLowerCase(),
				p = e.portfolioToken || e.portfolioItemToken,
				d = h === "crosstab" || h === "portfolio",
				v = e.action === i.getPages || e.action === i.display || e.action === i.getInterviews || e.action === i.exportTo && (d || p);
			e.dmy = getDummyValue(), isRequireSurvey(e.action) && !e.survey && (e.survey = config("survey")), t || (u ? e.transaction = !0 : e.xhr = new c(e)), e.action === i.getPages && e.containerId && (e.verbose === undefined || e.verbose === null) && (e.verbose = !0);
			if (e.action !== "doTransaction")
				for (o = 0, a = n.length; o < a; o += 1) f = n[o], e.hasOwnProperty(f) || (l = config(f), l !== undefined && l !== null && (e[f] = l));
			if (v)
				for (o = 0, a = r.length; o < a; o += 1) f = r[o], e.hasOwnProperty(f) || (l = config(f), l !== undefined && l !== null && (e[f] = l));
			return e
		}

		function displayLoadingMessage(e) {
			if (!e || e.action !== i.display && e.action !== i.getPages && e.action !== i.getInterviews && e.action !== i.getActivity && e.action !== i.getActivityStats) return;
			if ((e.action === i.getPages || e.action === i.getInterviews || e.action === i.getActivity || e.action === i.getActivityStats) && !e.containerId) return;
			var t = e.loadingMessage !== null && e.loadingMessage !== undefined ? e.loadingMessage : config("loadingMessage"),
				s = "";
			t && typeof t == "string" && (s = t);
			if ((e.action === i.getInterviews || e.action === i.getActivity) && e.lazyLoading && (e.page || e.before || e.after)) {
				typeof t == "function" && t(e);
				return
			}
			if (!e.containerId) {
				r += 1, e.containerId = "askiareport-" + r;
				var o = n.createElement("div");
				o.setAttribute("id", e.containerId), o.innerHTML = s, n.body.appendChild(o)
			} else s && m.ready(function() {
				n.getElementById(e.containerId).innerHTML = s
			});
			typeof t == "function" && t(e)
		}

		function addQuery(e, t) {
			t = t || {}, t.action = e, extendQuery(t), t.timer && typeof t.timer == "object" && a.create(t), displayLoadingMessage(t), l.launcher.execute("AddQuery", t), l.wasRunning && l.execute()
		}

		function addPlugin(e) {
			f.add(e)
		}

		function getPlugin(e) {
			return f.get(e)
		}

		function appendCoreMethod(t) {
			e[t] = function(e) {
				addQuery(t, e)
			}
		}

		function appendDeprecatedMethod(t) {
			var n = "",
				r = "";
			typeof t == "string" && (n = t), v.isObject(t) && (n = t.name || "", r = t.message || "");
			if (n === "") return;
			r === "" && (r = translate("error.deprecatedMethod", n)), e[n] = function() {
				error(r)
			}
		}

		function doTransaction(e, t) {
			u = !0, l.launcher.execute("BeginTransaction"), e(), u = !1, l.launcher.execute("Commit", t)
		}

		function download(e, r) {
			var i = n.createElement("form");
			i.setAttribute("name", "askiaVistaExportTo"), i.setAttribute("action", e), i.setAttribute("method", "post"), i.setAttribute("target", "_blank"), i.style.display = "none";
			if (!c.appendQueryToInputForm(n, i, r)) {
				error(translate("error.incorrectExportDownloadDataArg"));
				return
			}
			t(i).appendTo("body").submit().remove()
		}

		function exportTo(e) {
			if (!v.isObject(e)) {
				error(translate("error.undefinedTypeOfQuery"));
				return
			}
			var t = e.portfolioToken || e.portfolioItemToken;
			if (!e.entity && !t) {
				error(translate("error.expectedEntityParameter"));
				return
			}
			if (!e.fileFormat) {
				error(translate("error.expectedFileFormatParameter"));
				return
			}
			if (!t && o.indexOf(e.entity) === -1) {
				error(translate("error.invalidEntityParameter"));
				return
			}
			e.action = i.exportTo, e = c.sanitizeQuery(extendQuery(e)), download(config("url"), e)
		}

		function saveUserInfo(e) {
			!e.password && !e.passwordConfirm && !e.passwordActual ? addQuery(i.saveUserInfo, e) : encrypt({
				value: [e.passwordActual || "", e.password || "", e.passwordConfirm || ""],
				success: function(t) {
					e.passwordActual = t[0], e.password = t[1], e.passwordConfirm = t[2], addQuery(i.saveUserInfo, e)
				}
			})
		}

		function createIFrame(e) {
			return e.id ? (p.iFrames[e.id] && typeof p.iFrames[e.id].destroy == "function" && p.iFrames[e.id].destroy(), p.iFrames[e.id] = new h(e), p.iFrames[e.id]) : (error(translate("error.incompleteQuery")), null)
		}

		function extend(t) {
			if (!t) return;
			var n;
			if (v.isObject(t))
				for (n in t) t.hasOwnProperty(n) && (i[n] || (e[n] = t[n]))
		}

		function initConfigWithUrlParams() {
			var e = getUrlParameter(config("localeUrlParam")),
				t = getUrlParameter(config("languageUrlParam"));
			e && config({
				locale: e
			}), t && config({
				language: t
			})
		}

		function init() {
			initConfigWithUrlParams(), f.refresh();
			var t, n;
			for (t in i) i.hasOwnProperty(t) && (n = i[t], e[n] || appendCoreMethod(n));
			appendDeprecatedMethod({
				name: "getProfile",
				message: "Sorry, but the method 'getProfile' was deprecated, please use the method 'getQuestions' instead\r\n or include the back-compatibility plugin (1.00) to re-activate this method"
			}), g = !1
		}
		var e = {},
			r = 0,
			u = !1;
		return e = {
			action: i,
			parameter: s,
			loadLocale: loadLocale,
			translate: translate,
			config: config,
			error: error,
			login: login,
			logout: logout,
			saveUserInfo: saveUserInfo,
			encrypt: encrypt,
			displayResult: l.launcher.executeDisplayResult,
			loadStylesheet: l.launcher.executeLoadStylesheet,
			sanitizeQuery: c.sanitizeQuery,
			abort: abort,
			doTransaction: doTransaction,
			executeSuccess: function(e, t, n) {
				l.launcher.execute("Success", e, t, n)
			},
			executeError: function(e, t) {
				l.launcher.execute("Error", e, t)
			},
			iFrames: {},
			createIFrame: createIFrame,
			exportTo: exportTo,
			download: download,
			addPlugin: addPlugin,
			getPlugin: getPlugin,
			extend: extend,
			deprecate: appendDeprecatedMethod,
			startTimers: startTimers,
			stopTimers: stopTimers,
			clearTimers: clearTimers,
			htmlEncode: d.htmlEncode,
			version: version,
			about: about,
			help: help
		}, init(), e
	}(), v.extend(t, {
		getUrlParameter: getUrlParameter
	}), e.askiaVista = p, m.listen(), typeof define == "function" && define.amd ? define("askiaVista", ["module"], function defineAskiaVista(e) {
		var t = e.config();
		return v.isObject(t) && p.config(t), initAskiaVista(), p
	}) : initAskiaVista()
})(window, jQuery);
