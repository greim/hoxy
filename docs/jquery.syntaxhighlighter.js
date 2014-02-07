/**
 * @depends nothing
 * @name core.console
 * @package jquery-sparkle {@link http://balupton.com/projects/jquery-sparkle}
 */

/**
 * Console Emulator
 * We have to convert arguments into arrays, and do this explicitly as webkit (chrome) hates function references, and arguments cannot be passed as is
 * @version 1.0.3
 * @date August 31, 2010
 * @since 0.1.0-dev, December 01, 2009
 * @package jquery-sparkle {@link http://balupton.com/projects/jquery-sparkle}
 * @author Benjamin "balupton" Lupton {@link http://balupton.com}
 * @copyright (c) 2009-2010 Benjamin Arthur Lupton {@link http://balupton.com}
 * @license MIT License {@link http://creativecommons.org/licenses/MIT/}
 */

// Check to see if console exists, if not define it
if ( typeof window.console === 'undefined' ) {
	window.console = {};
}

// Check to see if we have emulated the console yet
if ( typeof window.console.emulated === 'undefined' ) {
	// Emulate Log
	if ( typeof window.console.log === 'function' ) {
		window.console.hasLog = true;
	}
	else {
		if ( typeof window.console.log === 'undefined' ) {
			window.console.log = function(){};
		}
		window.console.hasLog = false;
	}

	// Emulate Debug
	if ( typeof window.console.debug === 'function' ) {
		window.console.hasDebug = true;
	}
	else {
		if ( typeof window.console.debug === 'undefined' ) {
			window.console.debug = !window.console.hasLog ? function(){} : function(){
				var arr = ['console.debug:']; for(var i = 0; i < arguments.length; i++) { arr.push(arguments[i]); };
		    	window.console.log.apply(window.console, arr);
			};
		}
		window.console.hasDebug = false;
	}

	// Emulate Warn
	if ( typeof window.console.warn === 'function' ) {
		window.console.hasWarn = true;
	}
	else {
		if ( typeof window.console.warn === 'undefined' ) {
			window.console.warn = !window.console.hasLog ? function(){} : function(){
				var arr = ['console.warn:']; for(var i = 0; i < arguments.length; i++) { arr.push(arguments[i]); };
		    	window.console.log.apply(window.console, arr);
			};
		}
		window.console.hasWarn = false;
	}

	// Emulate Error
	if ( typeof window.console.error === 'function' ) {
		window.console.hasError = true;
	}
	else {
		if ( typeof window.console.error === 'undefined' ) {
			window.console.error = function(){
				var msg = "An error has occured.";

				// Log
				if ( window.console.hasLog ) {
					var arr = ['console.error:']; for(var i = 0; i < arguments.length; i++) { arr.push(arguments[i]); };
		    		window.console.log.apply(window.console, arr);
					// Adjust Message
					msg = 'An error has occured. More information is available in your browser\'s javascript console.'
				}

				// Prepare Arguments
				for ( var i = 0; i < arguments.length; ++i ) {
					if ( typeof arguments[i] !== 'string' ) {
						break;
					}
					msg += "\n"+arguments[i];
				}

				// Throw Error
				if ( typeof Error !== 'undefined' ) {
					throw new Error(msg);
				}
				else {
					throw(msg);
				}
			};
		}
		window.console.hasError = false;
	}

	// Emulate Trace
	if ( typeof window.console.trace === 'function' ) {
		window.console.hasTrace = true;
	}
	else {
		if ( typeof window.console.trace === 'undefined' ) {
			window.console.trace = function(){
				window.console.error('console.trace does not exist');
			};
		}
		window.console.hasTrace = false;
	}

	// Done
	window.console.emulated = true;
}
/**
 * @depends jquery
 * @name jquery.appendscriptstyle
 * @package jquery-sparkle {@link http://balupton.com/projects/jquery-sparkle}
 */

/**
 * jQuery Aliaser
 */
(function($){
	/**
	 * if jquery version is >= 1.9 add browser detection functionality from jquery-migrate
	 */
		 if (!jQuery.browser) {
	   jQuery.uaMatch = function (ua) {
	     ua = ua.toLowerCase();
		     var match = /(chrome)[ \/]([\w.]+)/.exec(ua) ||
	       /(webkit)[ \/]([\w.]+)/.exec(ua) ||
	       /(opera)(?:.*version|)[ \/]([\w.]+)/.exec(ua) ||
	       /(msie) ([\w.]+)/.exec(ua) ||
	       ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec(ua) ||
	       [];
		     return {
	       browser: match[1] || "",
	       version: match[2] || "0"
	     };
	   };
		   matched = jQuery.uaMatch(navigator.userAgent);
	   browser = {};
		   if (matched.browser) {
	     browser[matched.browser] = true;
	     browser.version = matched.version;
	   }
		   // Chrome is Webkit, but Webkit is also Safari.
	   if (browser.chrome) {
	     browser.webkit = true;
	   } else if (browser.webkit) {
	     browser.safari = true;
	   }
		   jQuery.browser = browser;
	 }

	/**
	 * Append a Stylesheet to the DOM
	 * @version 1.1.0
	 * @date July 23, 2010
	 * @since 1.0.0, June 30, 2010
     * @package jquery-sparkle {@link http://balupton.com/projects/jquery-sparkle}
	 * @author Benjamin "balupton" Lupton {@link http://balupton.com}
	 * @copyright (c) 2009-2010 Benjamin Arthur Lupton {@link http://balupton.com}
	 * @license MIT License {@link http://creativecommons.org/licenses/MIT/}
	 */
	$.appendStylesheet = $.appendStylesheet || function(url, overwrite){
		// Check
		if ( !(document.body||false) ) {
			setTimeout(function(){
				$.appendStylesheet.apply($,[url,overwrite]);
			},500);
			// Chain
			return $;
		}

		// Prepare
		var id = 'stylesheet-'+url.replace(/[^a-zA-Z0-9]/g, '');;
		var $old = $('#'+id);
		if ( typeof overwrite === 'undefined' ) {
			overwrite = false;
		}

		// Check
		if ( $old.length === 1 ) {
			if ( overwrite ) {
				$old.remove();
			}
			else {
				// Chain
				return $;
			}
		}

		// Create
		var bodyEl = document.getElementsByTagName($.browser.safari ? 'head' : 'body')[0];
		var linkEl = document.createElement('link');
		linkEl.type = 'text/css';
		linkEl.rel = 'stylesheet';
		linkEl.media = 'screen';
		linkEl.href = url;
		linkEl.id = id;
		bodyEl.appendChild(linkEl);

		// Chain
		return $;
	};

	/**
	 * Append a Script to the DOM
	 * @version 1.1.0
	 * @date July 23, 2010
	 * @since 1.0.0, June 30, 2010
     * @package jquery-sparkle {@link http://balupton.com/projects/jquery-sparkle}
	 * @author Benjamin "balupton" Lupton {@link http://balupton.com}
	 * @copyright (c) 2009-2010 Benjamin Arthur Lupton {@link http://balupton.com}
	 * @license MIT License {@link http://creativecommons.org/licenses/MIT/}
	 */
	$.appendScript = $.appendScript || function(url, overwrite){
		// Check
		if ( !(document.body||false) ) {
			setTimeout(function(){
				$.appendScript.apply($,[url,overwrite]);
			},500);
			// Chain
			return $;
		}

		// Prepare
		var id = 'script-'+url.replace(/[^a-zA-Z0-9]/g, '');;
		var $old = $('#'+id);
		if ( typeof overwrite === 'undefined' ) {
			overwrite = false;
		}

		// Check
		if ( $old.length === 1 ) {
			if ( overwrite ) {
				$old.remove();
			}
			else {
				// Chain
				return $;
			}
		}

		// Create
		var bodyEl = document.getElementsByTagName($.browser.safari ? 'head' : 'body')[0];
		var scriptEl = document.createElement('script');
		scriptEl.type = 'text/javascript';
		scriptEl.src = url;
		scriptEl.id = id;
		bodyEl.appendChild(scriptEl);

		// Chain
		return $;
	};


})(jQuery);
/**
 * @depends core.console, jquery, jquery.appendscriptstyle
 * @name jquery.syntaxhighlighter
 * @package jquery-syntaxhighlighter {@link http://balupton.com/projects/jquery-syntaxhighlighter}
 */

/**
 * jQuery Aliaser
 */
(function($){

	/**
	 * Get all elements within ourself which match the selector, and include ourself in the search
	 * @version 1.0.0
	 * @date June 30, 2010
     * @package jquery-sparkle {@link http://balupton.com/projects/jquery-sparkle}
	 * @author Benjamin "balupton" Lupton {@link http://balupton.com}
	 * @copyright (c) 2009-2010 Benjamin Arthur Lupton {@link http://balupton.com}
	 * @license MIT License {@link http://creativecommons.org/licenses/MIT/}
	 */
	$.fn.findAndSelf = $.fn.findAndSelf || function(selector){
		var $this = $(this);
		return $this.find(selector).andSelf().filter(selector);
	};

	/**
	 * Add the String replace method to the Number prototype
	 * This is to fix an error with jQuery v1.4.2 when $('#el').val() contains a numeric value on Firefox.
	 * Error is here: http://getsatisfaction.com/balupton/topics/word_jumbles
	 * @version 1.0.0
	 * @date September 01, 2010
     * @package jquery-sparkle {@link http://balupton.com/projects/jquery-sparkle}
	 * @author Benjamin "balupton" Lupton {@link http://balupton.com}
	 * @copyright (c) 2009-2010 Benjamin Arthur Lupton {@link http://balupton.com}
	 * @license MIT License {@link http://creativecommons.org/licenses/MIT/}
	 */
	Number.prototype.replace = Number.prototype.replace || function(){
		var str = String(this);
		return str.replace.apply(this,arguments);
	}

	/**
	 * jQuery SyntaxHighlighter
 	 * @version 1.0.1-beta
 	 * @date August 16, 2010
 	 * @since 0.1.0-dev, July 23, 2010
     * @package jquery-syntaxhighlighter {@link http://balupton.com/projects/jquery-syntaxhighlighter}
	 * @author Benjamin "balupton" Lupton {@link http://balupton.com}
	 * @copyright (c) 2009-2010 Benjamin Arthur Lupton {@link http://balupton.com}
	 * @license MIT License {@link http://creativecommons.org/licenses/MIT/}
	 */
	if ( !($.SyntaxHighlighter||false) ) {
		$.SyntaxHighlighter = {
			// Configuration
			'config': {
				/**
				 * Whether or not we should load in Google Prettify automatically if it was not detected.
				 */
				'load': true,

				/**
				 * Whether or not we should highlight all appropriate code blocks automatically once the page has finished loading.
				 */
				'highlight': true,

				/**
				 * Whether or not we should output debug information in case something is not working correctly.
				 */
				'debug': false,

				/**
				 * Whether or not we should wrap the code blocks lines, or have them scrollable.
				 */
				'wrapLines': true,

				/**
				 * Whether or not we should display line numbers next to the code blocks.
				 */
				'lineNumbers': true,

				/**
				 * Whether or not we should strip empty start and finish lines from the code blocks.
				 */
				'stripEmptyStartFinishLines': true,

				/**
				 * Whether or not we should remove whitespaces/indentations which are only there for HTML formatting of our code block.
				 */
				'stripInitialWhitespace': true,

				/**
				 * Whether or not we should alternate the lines background colours on odd and even rows.
				 */
				'alternateLines': false,

				/**
				 * The default class to look for in case we have not explicitly specified a language.
				 */
				'defaultClassname': 'highlight',

				/**
				 * The theme that should be used by our highlighted code blocks.
				 */
				'theme': 'balupton',

				/**
				 * The themes to load in for use with our highlighted code blocks.
				 */
				'themes': ['balupton'],

				/**
				 * Whether or not we should add a Syntax Highlighter Sparkle extension if jQuery Sparkle is detected.
				 */
				'addSparkleExtension': true,

				/**
				 * The baseUrl to load Google's Prettify from.
				 * This is used to load in Google's Prettify if the load option is true and it was not found.
				 */
				'prettifyBaseUrl': false ? 'http://192.168.1.2/repos/jquery-syntaxhighlighter/prettify' : 'http://balupton.github.com/jquery-syntaxhighlighter/prettify',

				/**
				 * The baseUrl to load our Syntax Highlighter from.
				 * This is used to load in the stylesheet and additional themes.
				 */
				'baseUrl': false ? 'http://192.168.1.2/repos/jquery-syntaxhighlighter' : 'http://balupton.github.com/jquery-syntaxhighlighter'
			},

			// Init
			init: function(options){
				// Prepare
				var	SyntaxHighlighter = this,
					config = SyntaxHighlighter.config;

				// Fix baseUrl
				var	baseUrl = config.baseUrl;
				if ( baseUrl[baseUrl.length-1] === '/' ) {
					config.baseUrl = baseUrl.substr(0,baseUrl.length-2);
				}
				delete baseUrl;

				// Configure
				$.extend(true, SyntaxHighlighter.config, options||{});

				// Sparkle
				if ( $.Sparkle||false && config.addSparkleExtension ) {
					// Add Syntax Highlighter to Sparkle
					$.Sparkle.addExtension('syntaxhighlighter', function(){
						$(this).syntaxHighlight();
					});
				}

				// Attach
				$.fn.syntaxHighlight = $.fn.SyntaxHighlight = SyntaxHighlighter.fn;

				// Load
				if ( config.load ) SyntaxHighlighter.load();

				// Highlight
				if ( config.highlight ) SyntaxHighlighter.highlight();

				// Chain
				return this;
			},

			// Load
			load: function(){
				// Prepare
				var	SyntaxHighlighter = this,
					config = SyntaxHighlighter.config,
					prettifyBaseUrl = config.prettifyBaseUrl,
					baseUrl = config.baseUrl,
					themes = config.themes;

				// Append
				if ( !SyntaxHighlighter.loaded() ) {
					$.appendScript(prettifyBaseUrl+'/prettify.min.js');
					$.appendStylesheet(prettifyBaseUrl+'/prettify.min.css');
					$.appendStylesheet(baseUrl+'/styles/style.min.css');
					$.each(themes,function(i,theme){
						$.appendStylesheet(baseUrl+'/styles/theme-'+theme+'.min.css');
					});
					if ( $.browser.msie ) {
						$.appendStylesheet(baseUrl+'/styles/ie.min.css');
					}
					SyntaxHighlighter.loadedExtras = true;
				}

				// Chain
				return this;
			},

			// Loaded Extras
			loadedExtras: false,

			// Loaded
			loaded: function(){
				return typeof prettyPrint !== 'undefined' && this.loadedExtras;
			},

			// Determine Language
			determineLanguage: function(css){
				// Prepare
				var	language = null,
					regex = /lang(uage)?-([a-z0-9]+)/g,
					match = regex.exec(css);

				// Handle
				while ( match !== null ) {
					language = match[2];
					match = regex.exec(css);
				}

				// Return langauge
				return language;
			},

			// jQuery Function
			fn: function(){
				// Prepare
				var	SyntaxHighlighter = $.SyntaxHighlighter,
					config = SyntaxHighlighter.config,
					$el = $(this);

				// Highlight
				$.SyntaxHighlighter.highlight({
					'el': $el
				});

				// Chain
				return this;
			},

			// Highlight
			highlight: function(params){
				// Prepare
				if ( typeof params !== 'object' ) {
					params = {};
				}
				var	SyntaxHighlighter = this,
					config = SyntaxHighlighter.config,
					$el = params.el||false;

				// Adjust
				if ( !($el instanceof jQuery) ) {
					$el = $('body');
				}

				// Check
				if ( !SyntaxHighlighter.loaded() ) {
					if ( config.debug ) window.console.debug('SyntaxHighlighter.highlight: Chosen SyntaxHighlighter is not yet defined. Waiting 1200 ms then trying again.');
					setTimeout(function(){
						SyntaxHighlighter.highlight.apply(SyntaxHighlighter, [params]);
					},1200);
					return;
				}

				// Prepare Classnames
				var defaultClassname = config.defaultClassname,
					defaultSelector = '';
				if ( typeof defaultClassname === 'array' ) {
					defaultSelector = '.'+defaultClassname.join(',.');
					defaultClassname = defaultClassname.join(' ');
				}
				else {
					defaultClassname = String(defaultClassname);
					defaultSelector = '.'+defaultClassname.replace(' ',',.');
				}

				// Check Classnames
				if ( defaultSelector === '.' || !defaultClassname ) {
					window.console.error('SyntaxHighlighter.highlight: Invalid defaultClassname.', [this,arguments], [config.defaultClassname]);
					window.console.trace();
				}

				// Fetch
				var	$codes = $el.findAndSelf('code,pre').filter('[class*=lang],'+defaultSelector).filter(':not(.prettyprint)');

				// Highlight
				$codes.css({
					'overflow-y': 'visible',
					'overflow-x': 'visible',
					'white-space': 'pre'
				}).addClass('prettyprint '+defaultClassname).each(function(){
					// Prepare
					var	$code = $(this),
						css = $code.attr('class'),
						language = SyntaxHighlighter.determineLanguage(css);

					// Language
					$code.addClass('lang-'+language);
				});

				// WrapLines
				if ( config.lineNumbers ) {
					$codes.addClass('linenums');
				}

				// Theme
				if ( config.theme ) {
					$codes.addClass('theme-'+config.theme);
				}

				// AlternateLines
				if ( config.alternateLines ) {
					$codes.addClass('alternate');
				}

				// Fire
				prettyPrint();

				// Adjust HTML: stripEmptyStartFinishLines
				// we have to do this here, as before prettyPrint IE has issues with newlines
				if ( config.stripEmptyStartFinishLines ) {
					$codes.find('li:first-child > :first-child, li:last-child > :first-child').each(function(){
						// Prepare
						var	$initialText = $(this),
							html = $initialText.html(),
							empty = /^([\r\n\s\t]|\&nbsp;)*$/.test(html),
							$parent = $initialText.parent(),
							$siblings = $initialText.siblings();

						// Check
						if ( empty && ($siblings.length === 0 || ($siblings.length === 1 && $siblings.filter(':last').is('br'))) ) {
							// Remove Line
							var	$parent = $initialText.parent(),
								value = $parent.val();
							$parent.next().val(value);
							$parent.remove();
						}
					});
				}

				// Adjust HTML: stripInitialWhitespace
				// we have to do this here, as before prettyPrint IE has issues with newlines
				if ( config.stripInitialWhitespace ) {
					$codes.find('li:first-child > :first-child').each(function(){
						// Prepare
						var	$initialText = $(this),
							html = $initialText.html(),
							match = html.match(/^(([\r\n\s\t]|\&nbsp;)+)/)||[],
							whitespace = (match[1]||'');

						// Check
						if ( whitespace.length ) {
							// Replace
							$initialText.parent().siblings().children(':first-child').add($initialText).each(function(){
								// Prepare
								var	$nextText = $(this),
									html = $nextText.html();
								// Replace
								html = html.replace(new RegExp('^'+whitespace,'gm'), '');
								// Apply
								$nextText.html(html);
							});
						}
					});
				}

				// Adjust Lines
				if ( config.wrapLines ) {
					$codes.css({
						'overflow-x':'hidden',
						'overflow-y':'hidden',
						'white-space':'pre-wrap',
						'max-height':'none'
					});
				} else {
					$codes.css({
						'overflow-x':'auto',
						'overflow-y':'auto',
						'white-space':'normal',
						'max-height':'500px'
					});
				}

				// Chain
				return this;
			}

		};
	}
	else {
		window.console.warn("SyntaxHighlighter has already been defined...");
	}

})(jQuery);
