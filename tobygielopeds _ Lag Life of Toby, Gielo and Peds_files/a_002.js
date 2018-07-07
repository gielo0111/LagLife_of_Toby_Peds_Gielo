/* Detect-zoom
 * -----------
 * Cross Browser Zoom and Pixel Ratio Detector
 * Version 1.0.4 | Apr 1 2013
 * dual-licensed under the WTFPL and MIT license
 * Maintained by https://github/tombigel
 * Original developer https://github.com/yonran
 */

//AMD and CommonJS initialization copied from https://github.com/zohararad/audio5js
(function (root, ns, factory) {
    "use strict";

    if (typeof (module) !== 'undefined' && module.exports) { // CommonJS
        module.exports = factory(ns, root);
    } else if (typeof (define) === 'function' && define.amd) { // AMD
        define("factory", function () {
            return factory(ns, root);
        });
    } else {
        root[ns] = factory(ns, root);
    }

}(window, 'detectZoom', function () {

    /**
     * Use devicePixelRatio if supported by the browser
     * @return {Number}
     * @private
     */
    var devicePixelRatio = function () {
        return window.devicePixelRatio || 1;
    };

    /**
     * Fallback function to set default values
     * @return {Object}
     * @private
     */
    var fallback = function () {
        return {
            zoom: 1,
            devicePxPerCssPx: 1
        };
    };
    /**
     * IE 8 and 9: no trick needed!
     * TODO: Test on IE10 and Windows 8 RT
     * @return {Object}
     * @private
     **/
    var ie8 = function () {
        var zoom = Math.round((screen.deviceXDPI / screen.logicalXDPI) * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * For IE10 we need to change our technique again...
     * thanks https://github.com/stefanvanburen
     * @return {Object}
     * @private
     */
    var ie10 = function () {
        var zoom = Math.round((document.documentElement.offsetHeight / window.innerHeight) * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * Mobile WebKit
     * the trick: window.innerWIdth is in CSS pixels, while
     * screen.width and screen.height are in system pixels.
     * And there are no scrollbars to mess up the measurement.
     * @return {Object}
     * @private
     */
    var webkitMobile = function () {
        var deviceWidth = (Math.abs(window.orientation) == 90) ? screen.height : screen.width;
        var zoom = deviceWidth / window.innerWidth;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * Desktop Webkit
     * the trick: an element's clientHeight is in CSS pixels, while you can
     * set its line-height in system pixels using font-size and
     * -webkit-text-size-adjust:none.
     * device-pixel-ratio: http://www.webkit.org/blog/55/high-dpi-web-sites/
     *
     * Previous trick (used before http://trac.webkit.org/changeset/100847):
     * documentElement.scrollWidth is in CSS pixels, while
     * document.width was in system pixels. Note that this is the
     * layout width of the document, which is slightly different from viewport
     * because document width does not include scrollbars and might be wider
     * due to big elements.
     * @return {Object}
     * @private
     */
    var webkit = function () {
        var important = function (str) {
            return str.replace(/;/g, " !important;");
        };

        var div = document.createElement('div');
        div.innerHTML = "1<br>2<br>3<br>4<br>5<br>6<br>7<br>8<br>9<br>0";
        div.setAttribute('style', important('font: 100px/1em sans-serif; -webkit-text-size-adjust: none; text-size-adjust: none; height: auto; width: 1em; padding: 0; overflow: visible;'));

        // The container exists so that the div will be laid out in its own flow
        // while not impacting the layout, viewport size, or display of the
        // webpage as a whole.
        // Add !important and relevant CSS rule resets
        // so that other rules cannot affect the results.
        var container = document.createElement('div');
        container.setAttribute('style', important('width:0; height:0; overflow:hidden; visibility:hidden; position: absolute;'));
        container.appendChild(div);

        document.body.appendChild(container);
        var zoom = 1000 / div.clientHeight;
        zoom = Math.round(zoom * 100) / 100;
        document.body.removeChild(container);

        return{
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * no real trick; device-pixel-ratio is the ratio of device dpi / css dpi.
     * (Note that this is a different interpretation than Webkit's device
     * pixel ratio, which is the ratio device dpi / system dpi).
     *
     * Also, for Mozilla, there is no difference between the zoom factor and the device ratio.
     *
     * @return {Object}
     * @private
     */
    var firefox4 = function () {
        var zoom = mediaQueryBinarySearch('min--moz-device-pixel-ratio', '', 0, 10, 20, 0.0001);
        zoom = Math.round(zoom * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom
        };
    };

    /**
     * Firefox 18.x
     * Mozilla added support for devicePixelRatio to Firefox 18,
     * but it is affected by the zoom level, so, like in older
     * Firefox we can't tell if we are in zoom mode or in a device
     * with a different pixel ratio
     * @return {Object}
     * @private
     */
    var firefox18 = function () {
        return {
            zoom: firefox4().zoom,
            devicePxPerCssPx: devicePixelRatio()
        };
    };

    /**
     * works starting Opera 11.11
     * the trick: outerWidth is the viewport width including scrollbars in
     * system px, while innerWidth is the viewport width including scrollbars
     * in CSS px
     * @return {Object}
     * @private
     */
    var opera11 = function () {
        var zoom = window.top.outerWidth / window.top.innerWidth;
        zoom = Math.round(zoom * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * Use a binary search through media queries to find zoom level in Firefox
     * @param property
     * @param unit
     * @param a
     * @param b
     * @param maxIter
     * @param epsilon
     * @return {Number}
     */
    var mediaQueryBinarySearch = function (property, unit, a, b, maxIter, epsilon) {
        var matchMedia;
        var head, style, div;
        if (window.matchMedia) {
            matchMedia = window.matchMedia;
        } else {
            head = document.getElementsByTagName('head')[0];
            style = document.createElement('style');
            head.appendChild(style);

            div = document.createElement('div');
            div.className = 'mediaQueryBinarySearch';
            div.style.display = 'none';
            document.body.appendChild(div);

            matchMedia = function (query) {
                style.sheet.insertRule('@media ' + query + '{.mediaQueryBinarySearch ' + '{text-decoration: underline} }', 0);
                var matched = getComputedStyle(div, null).textDecoration == 'underline';
                style.sheet.deleteRule(0);
                return {matches: matched};
            };
        }
        var ratio = binarySearch(a, b, maxIter);
        if (div) {
            head.removeChild(style);
            document.body.removeChild(div);
        }
        return ratio;

        function binarySearch(a, b, maxIter) {
            var mid = (a + b) / 2;
            if (maxIter <= 0 || b - a < epsilon) {
                return mid;
            }
            var query = "(" + property + ":" + mid + unit + ")";
            if (matchMedia(query).matches) {
                return binarySearch(mid, b, maxIter - 1);
            } else {
                return binarySearch(a, mid, maxIter - 1);
            }
        }
    };

    /**
     * Generate detection function
     * @private
     */
    var detectFunction = (function () {
        var func = fallback;
        //IE8+
        if (!isNaN(screen.logicalXDPI) && !isNaN(screen.systemXDPI)) {
            func = ie8;
        }
        // IE10+ / Touch
        else if (window.navigator.msMaxTouchPoints) {
            func = ie10;
        }
        //Mobile Webkit
        else if ('orientation' in window && typeof document.body.style.webkitMarquee === 'string') {
            func = webkitMobile;
        }
        //WebKit
        else if (typeof document.body.style.webkitMarquee === 'string') {
            func = webkit;
        }
        //Opera
        else if (navigator.userAgent.indexOf('Opera') >= 0) {
            func = opera11;
        }
        //Last one is Firefox
        //FF 18.x
        else if (window.devicePixelRatio) {
            func = firefox18;
        }
        //FF 4.0 - 17.x
        else if (firefox4().zoom > 0.001) {
            func = firefox4;
        }

        return func;
    }());


    return ({

        /**
         * Ratios.zoom shorthand
         * @return {Number} Zoom level
         */
        zoom: function () {
            return detectFunction().zoom;
        },

        /**
         * Ratios.devicePxPerCssPx shorthand
         * @return {Number} devicePxPerCssPx level
         */
        device: function () {
            return detectFunction().devicePxPerCssPx;
        }
    });
}));

var wpcom_img_zoomer = {
	zoomed: false,
	timer: null,
	interval: 1000, // zoom polling interval in millisecond

	// Should we apply width/height attributes to control the image size?
	imgNeedsSizeAtts: function( img ) {
		// Do not overwrite existing width/height attributes.
		if ( img.getAttribute('width') !== null || img.getAttribute('height') !== null )
			return false;
		// Do not apply the attributes if the image is already constrained by a parent element.
		if ( img.width < img.naturalWidth || img.height < img.naturalHeight )
			return false;
		return true;
	},

	init: function() {
		var t = this;
		try{
			t.zoomImages();
			t.timer = setInterval( function() { t.zoomImages(); }, t.interval );
		}
		catch(e){
		}
	},

	stop: function() {
		if ( this.timer )
			clearInterval( this.timer );
	},

	getScale: function() {
		var scale = detectZoom.device();
		// Round up to 1.5 or the next integer below the cap.
		if      ( scale <= 1.0 ) scale = 1.0;
		else if ( scale <= 1.5 ) scale = 1.5;
		else if ( scale <= 2.0 ) scale = 2.0;
		else if ( scale <= 3.0 ) scale = 3.0;
		else if ( scale <= 4.0 ) scale = 4.0;
		else                     scale = 5.0;
		return scale;
	},

	shouldZoom: function( scale ) {
		var t = this;
		// Do not operate on hidden frames.
		if ( "innerWidth" in window && !window.innerWidth )
			return false;
		// Don't do anything until scale > 1
		if ( scale == 1.0 && t.zoomed == false )
			return false;
		return true;
	},

	zoomImages: function() {
		var t = this;
		var scale = t.getScale();
		if ( ! t.shouldZoom( scale ) ){
			return;
		}
		t.zoomed = true;
		// Loop through all the <img> elements on the page.
		var imgs = document.getElementsByTagName("img");

		for ( var i = 0; i < imgs.length; i++ ) {
			// Wait for original images to load
			if ( "complete" in imgs[i] && ! imgs[i].complete )
				continue;

			// Skip images that don't need processing.
			var imgScale = imgs[i].getAttribute("scale");
			if ( imgScale == scale || imgScale == "0" )
				continue;

			// Skip images that have already failed at this scale
			var scaleFail = imgs[i].getAttribute("scale-fail");
			if ( scaleFail && scaleFail <= scale )
				continue;

			// Skip images that have no dimensions yet.
			if ( ! ( imgs[i].width && imgs[i].height ) )
				continue;

			// Skip images from Lazy Load plugins
			if ( ! imgScale && imgs[i].getAttribute("data-lazy-src") && (imgs[i].getAttribute("data-lazy-src") !== imgs[i].getAttribute("src")))
				continue;

			if ( t.scaleImage( imgs[i], scale ) ) {
				// Mark the img as having been processed at this scale.
				imgs[i].setAttribute("scale", scale);
			}
			else {
				// Set the flag to skip this image.
				imgs[i].setAttribute("scale", "0");
			}
		}
	},

	scaleImage: function( img, scale ) {
		var t = this;
		var newSrc = img.src;

		// Skip slideshow images
		if ( img.parentNode.className.match(/slideshow-slide/) )
			return false;

		// Scale gravatars that have ?s= or ?size=
		if ( img.src.match( /^https?:\/\/([^\/]*\.)?gravatar\.com\/.+[?&](s|size)=/ ) ) {
			newSrc = img.src.replace( /([?&](s|size)=)(\d+)/, function( $0, $1, $2, $3 ) {
				// Stash the original size
				var originalAtt = "originals",
				originalSize = img.getAttribute(originalAtt);
				if ( originalSize === null ) {
					originalSize = $3;
					img.setAttribute(originalAtt, originalSize);
					if ( t.imgNeedsSizeAtts( img ) ) {
						// Fix width and height attributes to rendered dimensions.
						img.width = img.width;
						img.height = img.height;
					}
				}
				// Get the width/height of the image in CSS pixels
				var size = img.clientWidth;
				// Convert CSS pixels to device pixels
				var targetSize = Math.ceil(img.clientWidth * scale);
				// Don't go smaller than the original size
				targetSize = Math.max( targetSize, originalSize );
				// Don't go larger than the service supports
				targetSize = Math.min( targetSize, 512 );
				return $1 + targetSize;
			});
		}

		// Scale resize queries (*.files.wordpress.com) that have ?w= or ?h=
		else if ( img.src.match( /^https?:\/\/([^\/]+)\.files\.wordpress\.com\/.+[?&][wh]=/ ) ) {
			if ( img.src.match( /[?&]crop/ ) )
				return false;
			var changedAttrs = {};
			var matches = img.src.match( /([?&]([wh])=)(\d+)/g );
			for ( var i = 0; i < matches.length; i++ ) {
				var lr = matches[i].split( '=' );
				var thisAttr = lr[0].replace(/[?&]/g, '' );
				var thisVal = lr[1];

				// Stash the original size
				var originalAtt = 'original' + thisAttr, originalSize = img.getAttribute( originalAtt );
				if ( originalSize === null ) {
					originalSize = thisVal;
					img.setAttribute(originalAtt, originalSize);
					if ( t.imgNeedsSizeAtts( img ) ) {
						// Fix width and height attributes to rendered dimensions.
						img.width = img.width;
						img.height = img.height;
					}
				}
				// Get the width/height of the image in CSS pixels
				var size = thisAttr == 'w' ? img.clientWidth : img.clientHeight;
				var naturalSize = ( thisAttr == 'w' ? img.naturalWidth : img.naturalHeight );
				// Convert CSS pixels to device pixels
				var targetSize = Math.ceil(size * scale);
				// Don't go smaller than the original size
				targetSize = Math.max( targetSize, originalSize );
				// Don't go bigger unless the current one is actually lacking
				if ( scale > img.getAttribute("scale") && targetSize <= naturalSize )
					targetSize = thisVal;
				// Don't try to go bigger if the image is already smaller than was requested
				if ( naturalSize < thisVal )
					targetSize = thisVal;
				if ( targetSize != thisVal )
					changedAttrs[ thisAttr ] = targetSize;
			}
			var w = changedAttrs.w || false;
			var h = changedAttrs.h || false;

			if ( w ) {
				newSrc = img.src.replace(/([?&])w=\d+/g, function( $0, $1 ) {
					return $1 + 'w=' + w;
				});
			}
			if ( h ) {
				newSrc = newSrc.replace(/([?&])h=\d+/g, function( $0, $1 ) {
					return $1 + 'h=' + h;
				});
			}
		}

		// Scale mshots that have width
		else if ( img.src.match(/^https?:\/\/([^\/]+\.)*(wordpress|wp)\.com\/mshots\/.+[?&]w=\d+/) ) {
			newSrc = img.src.replace( /([?&]w=)(\d+)/, function($0, $1, $2) {
				// Stash the original size
				var originalAtt = 'originalw', originalSize = img.getAttribute(originalAtt);
				if ( originalSize === null ) {
					originalSize = $2;
					img.setAttribute(originalAtt, originalSize);
					if ( t.imgNeedsSizeAtts( img ) ) {
						// Fix width and height attributes to rendered dimensions.
						img.width = img.width;
						img.height = img.height;
					}
				}
				// Get the width of the image in CSS pixels
				var size = img.clientWidth;
				// Convert CSS pixels to device pixels
				var targetSize = Math.ceil(size * scale);
				// Don't go smaller than the original size
				targetSize = Math.max( targetSize, originalSize );
				// Don't go bigger unless the current one is actually lacking
				if ( scale > img.getAttribute("scale") && targetSize <= img.naturalWidth )
					targetSize = $2;
				if ( $2 != targetSize )
					return $1 + targetSize;
				return $0;
			});
		}

		// Scale simple imgpress queries (s0.wp.com) that only specify w/h/fit
		else if ( img.src.match(/^https?:\/\/([^\/.]+\.)*(wp|wordpress)\.com\/imgpress\?(.+)/) ) {
			var imgpressSafeFunctions = ["zoom", "url", "h", "w", "fit", "filter", "brightness", "contrast", "colorize", "smooth", "unsharpmask"];
			// Search the query string for unsupported functions.
			var qs = RegExp.$3.split('&');
			for ( var q in qs ) {
				q = qs[q].split('=')[0];
				if ( imgpressSafeFunctions.indexOf(q) == -1 ) {
					return false;
				}
			}
			// Fix width and height attributes to rendered dimensions.
			img.width = img.width;
			img.height = img.height;
			// Compute new src
			if ( scale == 1 )
				newSrc = img.src.replace(/\?(zoom=[^&]+&)?/, '?');
			else
				newSrc = img.src.replace(/\?(zoom=[^&]+&)?/, '?zoom=' + scale + '&');
		}

		// Scale LaTeX images or Photon queries (i#.wp.com)
		else if (
			img.src.match(/^https?:\/\/([^\/.]+\.)*(wp|wordpress)\.com\/latex\.php\?(latex|zoom)=(.+)/) ||
			img.src.match(/^https?:\/\/i[\d]{1}\.wp\.com\/(.+)/)
		) {
			// Fix width and height attributes to rendered dimensions.
			img.width = img.width;
			img.height = img.height;
			// Compute new src
			if ( scale == 1 ) {
				newSrc = img.src.replace(/\?(zoom=[^&]+&)?/, '?');
			} else {
				newSrc = img.src;

				var url_var = newSrc.match( /\?w=(\d+)/ );
				if ( url_var !== null && url_var[1] ) {
					newSrc = newSrc.replace( new RegExp( 'w=' + url_var[1] ), 'w=' + img.width );
				}

				url_var = newSrc.match( /\?h=(\d+)/ );
				if ( url_var !== null && url_var[1] ) {
					newSrc = newSrc.replace( new RegExp( 'h=' + url_var[1] ), 'h=' + img.height );
				}

				var zoom_arg = '&zoom=2';
				if ( !newSrc.match( /\?/ ) ) {
					zoom_arg = '?zoom=2';
				}
				img.setAttribute( 'srcset', newSrc + zoom_arg + ' ' + scale + 'x' );
			}
		}

		// Scale static assets that have a name matching *-1x.png or *@1x.png
		else if ( img.src.match(/^https?:\/\/[^\/]+\/.*[-@]([12])x\.(gif|jpeg|jpg|png)(\?|$)/) ) {
			// Fix width and height attributes to rendered dimensions.
			img.width = img.width;
			img.height = img.height;
			var currentSize = RegExp.$1, newSize = currentSize;
			if ( scale <= 1 )
				newSize = 1;
			else
				newSize = 2;
			if ( currentSize != newSize )
				newSrc = img.src.replace(/([-@])[12]x\.(gif|jpeg|jpg|png)(\?|$)/, '$1'+newSize+'x.$2$3');
		}

		else {
			return false;
		}

		// Don't set img.src unless it has changed. This avoids unnecessary reloads.
		if ( newSrc != img.src ) {
			// Store the original img.src
			var prevSrc, origSrc = img.getAttribute("src-orig");
			if ( !origSrc ) {
				origSrc = img.src;
				img.setAttribute("src-orig", origSrc);
			}
			// In case of error, revert img.src
			prevSrc = img.src;
			img.onerror = function(){
				img.src = prevSrc;
				if ( img.getAttribute("scale-fail") < scale )
					img.setAttribute("scale-fail", scale);
				img.onerror = null;
			};
			// Finally load the new image
			img.src = newSrc;
		}

		return true;
	}
};

wpcom_img_zoomer.init();
;
// WARNING: This file is distributed verbatim in Jetpack. There should be nothing WordPress.com specific in this file. @hide-in-jetpack
(function($){ // Open closure
// Local vars
var Scroller, ajaxurl, stats, type, text, totop;

// IE requires special handling
var isIE = ( -1 != navigator.userAgent.search( 'MSIE' ) );
if ( isIE ) {
	var IEVersion = navigator.userAgent.match(/MSIE\s?(\d+)\.?\d*;/);
	var IEVersion = parseInt( IEVersion[1] );
}

// HTTP ajaxurl when site is HTTPS causes Access-Control-Allow-Origin failure in Desktop and iOS Safari
if ( "https:" == document.location.protocol ) {
	infiniteScroll.settings.ajaxurl = infiniteScroll.settings.ajaxurl.replace( "http://", "https://" );
}

/**
 * Loads new posts when users scroll near the bottom of the page.
 */
Scroller = function( settings ) {
	var self = this;

	// Initialize our variables
	this.id               = settings.id;
	this.body             = $( document.body );
	this.window           = $( window );
	this.element          = $( '#' + settings.id );
	this.wrapperClass     = settings.wrapper_class;
	this.ready            = true;
	this.disabled         = false;
	this.page             = 1;
	this.offset           = settings.offset;
	this.currentday       = settings.currentday;
	this.order            = settings.order;
	this.throttle         = false;
	this.handle           = '<div id="infinite-handle"><span><button>' + text.replace( '\\', '' ) + '</button></span></div>';
	this.click_handle     = settings.click_handle;
	this.google_analytics = settings.google_analytics;
	this.history          = settings.history;
	this.origURL          = window.location.href;
	this.pageCache        = {};

	// Footer settings
	this.footer           = $( '#infinite-footer' );
	this.footer.wrap      = settings.footer;

	// Core's native MediaElement.js implementation needs special handling
	this.wpMediaelement   = null;

	// We have two type of infinite scroll
	// cases 'scroll' and 'click'

	if ( type == 'scroll' ) {
		// Bind refresh to the scroll event
		// Throttle to check for such case every 300ms

		// On event the case becomes a fact
		this.window.bind( 'scroll.infinity', function() {
			this.throttle = true;
		});

		// Go back top method
		self.gotop();

		setInterval( function() {
			if ( this.throttle ) {
				// Once the case is the case, the action occurs and the fact is no more
				this.throttle = false;
				// Reveal or hide footer
				self.thefooter();
				// Fire the refresh
				self.refresh();
                self.determineURL(); // determine the url 
			}
		}, 250 );

		// Ensure that enough posts are loaded to fill the initial viewport, to compensate for short posts and large displays.
		self.ensureFilledViewport();
		this.body.bind( 'post-load', { self: self }, self.checkViewportOnLoad );
	} else if ( type == 'click' ) {
		if ( this.click_handle ) {
			this.element.append( this.handle );
		}

		this.body.delegate( '#infinite-handle', 'click.infinity', function() {
			// Handle the handle
			if ( self.click_handle ) {
				$( '#infinite-handle' ).remove();
			}

			// Fire the refresh
			self.refresh();
		});
	}

	// Initialize any Core audio or video players loaded via IS
	this.body.bind( 'post-load', { self: self }, self.initializeMejs );
};

/**
 * Check whether we should fetch any additional posts.
 */
Scroller.prototype.check = function() {
	var container = this.element.offset();

	// If the container can't be found, stop otherwise errors result
	if ( 'object' !== typeof container ) {
		return false;
	}

	var bottom = this.window.scrollTop() + this.window.height(),
		threshold = container.top + this.element.outerHeight(false) - (this.window.height() * 2);

	return bottom > threshold;
};

/**
 * Renders the results from a successful response.
 */
Scroller.prototype.render = function( response ) {
	this.body.addClass( 'infinity-success' );

	// Check if we can wrap the html
	this.element.append( response.html );
	this.body.trigger( 'post-load', response );
	this.ready = true;
};

/**
 * Returns the object used to query for new posts.
 */
Scroller.prototype.query = function() {
	return {
		page           : this.page,
		currentday     : this.currentday,
		order          : this.order,
		scripts        : window.infiniteScroll.settings.scripts,
		styles         : window.infiniteScroll.settings.styles,
		query_args     : window.infiniteScroll.settings.query_args,
		last_post_date : window.infiniteScroll.settings.last_post_date,
	};
};

/**
 * Scroll back to top.
 */
Scroller.prototype.gotop = function() {
	var blog = $( '#infinity-blog-title' );

	blog.attr( 'title', totop );

	// Scroll to top on blog title
	blog.bind( 'click', function( e ) {
		$( 'html, body' ).animate( { scrollTop: 0 }, 'fast' );
		e.preventDefault();
	});
};


/**
 * The infinite footer.
 */
Scroller.prototype.thefooter = function() {
	var self  = this,
		width;

	// Check if we have an id for the page wrapper
	if ( $.type( this.footer.wrap ) === "string" ) {
		width = $( 'body #' + this.footer.wrap ).outerWidth( false );

		// Make the footer match the width of the page
		if ( width > 479 )
			this.footer.find( '.container' ).css( 'width', width );
	}

	// Reveal footer
	if ( this.window.scrollTop() >= 350 )
		self.footer.animate( { 'bottom': 0 }, 'fast' );
	else if ( this.window.scrollTop() < 350 )
		self.footer.animate( { 'bottom': '-50px' }, 'fast' );
};


/**
 * Controls the flow of the refresh. Don't mess.
 */
Scroller.prototype.refresh = function() {
	var	self   = this,
		query, jqxhr, load, loader, color;

	// If we're disabled, ready, or don't pass the check, bail.
	if ( this.disabled || ! this.ready || ! this.check() )
		return;

	// Let's get going -- set ready to false to prevent
	// multiple refreshes from occurring at once.
	this.ready = false;

	// Create a loader element to show it's working.
	if ( this.click_handle ) {
		loader = '<span class="infinite-loader"></span>';
		this.element.append( loader );

		loader = this.element.find( '.infinite-loader' );
		color = loader.css( 'color' );

		try {
			loader.spin( 'medium-left', color );
		} catch ( error ) { }
	}

	// Generate our query vars.
	query = $.extend({
		action: 'infinite_scroll'
	}, this.query() );

	// Fire the ajax request.
	jqxhr = $.post( infiniteScroll.settings.ajaxurl, query );

	// Allow refreshes to occur again if an error is triggered.
	jqxhr.fail( function() {
		if ( self.click_handle ) {
			loader.hide();
		}

		self.ready = true;
	});

	// Success handler
	jqxhr.done( function( response ) {
			// On success, let's hide the loader circle.
			if ( self.click_handle ) {
				loader.hide();
			}

			// Check for and parse our response.
			if ( ! response )
				return;

			response = $.parseJSON( response );

			if ( ! response || ! response.type )
				return;

			// If there are no remaining posts...
			if ( response.type == 'empty' ) {
				// Disable the scroller.
				self.disabled = true;
				// Update body classes, allowing the footer to return to static positioning
				self.body.addClass( 'infinity-end' ).removeClass( 'infinity-success' );

			// If we've succeeded...
			} else if ( response.type == 'success' ) {
				// If additional scripts are required by the incoming set of posts, parse them
				if ( response.scripts ) {
					$( response.scripts ).each( function() {
						var elementToAppendTo = this.footer ? 'body' : 'head';

						// Add script handle to list of those already parsed
						window.infiniteScroll.settings.scripts.push( this.handle );

						// Output extra data, if present
						if ( this.extra_data ) {
							var data = document.createElement('script'),
								dataContent = document.createTextNode( "//<![CDATA[ \n" + this.extra_data + "\n//]]>" );

							data.type = 'text/javascript';
							data.appendChild( dataContent );

							document.getElementsByTagName( elementToAppendTo )[0].appendChild(data);
						}

						// Build script tag and append to DOM in requested location
						var script = document.createElement('script');
						script.type = 'text/javascript';
						script.src = this.src;
						script.id = this.handle;

						// If MediaElement.js is loaded in by this set of posts, don't initialize the players a second time as it breaks them all
						if ( 'wp-mediaelement' === this.handle ) {
							self.body.unbind( 'post-load', self.initializeMejs );
						}

						if ( 'wp-mediaelement' === this.handle && 'undefined' === typeof mejs ) {
							self.wpMediaelement = {};
							self.wpMediaelement.tag = script;
							self.wpMediaelement.element = elementToAppendTo;
							setTimeout( self.maybeLoadMejs.bind( self ), 250 );
						} else {
							document.getElementsByTagName( elementToAppendTo )[0].appendChild(script);
						}
					} );
				}

				// If additional stylesheets are required by the incoming set of posts, parse them
				if ( response.styles ) {
					$( response.styles ).each( function() {
						// Add stylesheet handle to list of those already parsed
						window.infiniteScroll.settings.styles.push( this.handle );

						// Build link tag
						var style = document.createElement('link');
						style.rel = 'stylesheet';
						style.href = this.src;
						style.id = this.handle + '-css';

						// Destroy link tag if a conditional statement is present and either the browser isn't IE, or the conditional doesn't evaluate true
						if ( this.conditional && ( ! isIE || ! eval( this.conditional.replace( /%ver/g, IEVersion ) ) ) )
							var style = false;

						// Append link tag if necessary
						if ( style )
							document.getElementsByTagName('head')[0].appendChild(style);
					} );
				}

				// stash the response in the page cache
				self.pageCache[self.page] = response;

				// Increment the page number
				self.page++;

				// Record pageview in WP Stats, if available.
				if ( stats )
					new Image().src = document.location.protocol + '//pixel.wp.com/g.gif?' + stats + '&post=0&baba=' + Math.random();

				// Add new posts to the postflair object
				if ( 'object' == typeof response.postflair && 'object' == typeof WPCOM_sharing_counts )
					WPCOM_sharing_counts = $.extend( WPCOM_sharing_counts, response.postflair );

				// Render the results
				self.render.apply( self, arguments );

				// If 'click' type and there are still posts to fetch, add back the handle
				if ( type == 'click' ) {
					if ( response.lastbatch ) {
						if ( self.click_handle ) {
							$( '#infinite-handle' ).remove();
						} else {
							self.body.trigger( 'infinite-scroll-posts-end' );
						}
					} else {
						if ( self.click_handle ) {
							self.element.append( self.handle );
						} else {
							self.body.trigger( 'infinite-scroll-posts-more' );
						}
					}
				}

				// Update currentday to the latest value returned from the server
				if ( response.currentday ) {
					self.currentday = response.currentday;
				}

				// Fire Google Analytics pageview
				if ( self.google_analytics ) {
					var ga_url = self.history.path.replace( /%d/, self.page );
					if ( 'object' === typeof _gaq ) {
						_gaq.push( [ '_trackPageview', ga_url ] );
					}
					if ( 'function' === typeof ga ) {
						ga( 'send', 'pageview', ga_url );
					}
				}
			}
		});

	return jqxhr;
};

/**
 * Core's native media player uses MediaElement.js
 * The library's size is sufficient that it may not be loaded in time for Core's helper to invoke it, so we need to delay until `mejs` exists.
 */
Scroller.prototype.maybeLoadMejs = function() {
	if ( null === this.wpMediaelement ) {
		return;
	}

	if ( 'undefined' === typeof mejs ) {
		setTimeout( this.maybeLoadMejs, 250 );
	} else {
		document.getElementsByTagName( this.wpMediaelement.element )[0].appendChild( this.wpMediaelement.tag );
		this.wpMediaelement = null;

		// Ensure any subsequent IS loads initialize the players
		this.body.bind( 'post-load', { self: this }, this.initializeMejs );
	}
}

/**
 * Initialize the MediaElement.js player for any posts not previously initialized
 */
Scroller.prototype.initializeMejs = function( ev, response ) {
	// Are there media players in the incoming set of posts?
	if ( ! response.html || -1 === response.html.indexOf( 'wp-audio-shortcode' ) && -1 === response.html.indexOf( 'wp-video-shortcode' ) ) {
		return;
	}

	// Don't bother if mejs isn't loaded for some reason
	if ( 'undefined' === typeof mejs ) {
		return;
	}

	// Adapted from wp-includes/js/mediaelement/wp-mediaelement.js
	// Modified to not initialize already-initialized players, as Mejs doesn't handle that well
	$(function () {
		var settings = {};

		if ( typeof _wpmejsSettings !== 'undefined' ) {
			settings.pluginPath = _wpmejsSettings.pluginPath;
		}

		settings.success = function (mejs) {
			var autoplay = mejs.attributes.autoplay && 'false' !== mejs.attributes.autoplay;
			if ( 'flash' === mejs.pluginType && autoplay ) {
				mejs.addEventListener( 'canplay', function () {
					mejs.play();
				}, false );
			}
		};

		$('.wp-audio-shortcode, .wp-video-shortcode').not( '.mejs-container' ).mediaelementplayer( settings );
	});
}

/**
 * Trigger IS to load additional posts if the initial posts don't fill the window.
 * On large displays, or when posts are very short, the viewport may not be filled with posts, so we overcome this by loading additional posts when IS initializes.
 */
Scroller.prototype.ensureFilledViewport = function() {
	var	self = this,
	   	windowHeight = self.window.height(),
	   	postsHeight = self.element.height(),
	   	aveSetHeight = 0,
	   	wrapperQty = 0;

	// Account for situations where postsHeight is 0 because child list elements are floated
	if ( postsHeight === 0 ) {
		$( self.element.selector + ' > li' ).each( function() {
			postsHeight += $( this ).height();
		} );

		if ( postsHeight === 0 ) {
			self.body.unbind( 'post-load', self.checkViewportOnLoad );
			return;
		}
	}

	// Calculate average height of a set of posts to prevent more posts than needed from being loaded.
	$( '.' + self.wrapperClass ).each( function() {
		aveSetHeight += $( this ).height();
		wrapperQty++;
	} );

	if ( wrapperQty > 0 )
		aveSetHeight = aveSetHeight / wrapperQty;
	else
		aveSetHeight = 0;

	// Load more posts if space permits, otherwise stop checking for a full viewport
	if ( postsHeight < windowHeight && ( postsHeight + aveSetHeight < windowHeight ) ) {
		self.ready = true;
		self.refresh();
	}
	else {
		self.body.unbind( 'post-load', self.checkViewportOnLoad );
	}
}

/**
 * Event handler for ensureFilledViewport(), tied to the post-load trigger.
 * Necessary to ensure that the variable `this` contains the scroller when used in ensureFilledViewport(). Since this function is tied to an event, `this` becomes the DOM element the event is tied to.
 */
Scroller.prototype.checkViewportOnLoad = function( ev ) {
	ev.data.self.ensureFilledViewport();
}

/**
 * Identify archive page that corresponds to majority of posts shown in the current browser window.
 */
Scroller.prototype.determineURL = function () {
	var self         = this,
		windowTop    = $( window ).scrollTop(),
		windowBottom = windowTop + $( window ).height(),
		windowSize   = windowBottom - windowTop,
		setsInView   = [],
		setsHidden   = [],
		pageNum      = false;

	// Find out which sets are in view
	$( '.' + self.wrapperClass ).each( function() {
		var id         = $( this ).attr( 'id' ),
			setTop     = $( this ).offset().top,
			setHeight  = $( this ).outerHeight( false ),
			setBottom  = 0,
			setPageNum = $( this ).data( 'page-num' );

		// Account for containers that have no height because their children are floated elements.
		if ( 0 === setHeight ) {
			$( '> *', this ).each( function() {
				setHeight += $( this ).outerHeight( false );
			} );
		}

		// Determine position of bottom of set by adding its height to the scroll position of its top.
		setBottom = setTop + setHeight;

		// Populate setsInView object. While this logic could all be combined into a single conditional statement, this is easier to understand.
		if ( setTop < windowTop && setBottom > windowBottom ) { // top of set is above window, bottom is below
			setsInView.push({'id': id, 'top': setTop, 'bottom': setBottom, 'pageNum': setPageNum });
		}
		else if( setTop > windowTop && setTop < windowBottom ) { // top of set is between top (gt) and bottom (lt)
			setsInView.push({'id': id, 'top': setTop, 'bottom': setBottom, 'pageNum': setPageNum });
		}
		else if( setBottom > windowTop && setBottom < windowBottom ) { // bottom of set is between top (gt) and bottom (lt)
			setsInView.push({'id': id, 'top': setTop, 'bottom': setBottom, 'pageNum': setPageNum });
		} else {
			setsHidden.push({'id': id, 'top': setTop, 'bottom': setBottom, 'pageNum': setPageNum });
		}
	} );

	$.each(setsHidden, function() {
		var $set = $('#' + this.id);
		if( $set.hasClass( 'is--replaced' ) ) {
			return;
		}

	        self.pageCache[ this.pageNum].html = $set.html();

		$set.css('min-height', ( this.bottom - this.top ) + 'px' )
		    .addClass('is--replaced')
		    .empty();
	});

	$.each(setsInView, function() {
		var $set = $('#' + this.id);

		if( $set.hasClass('is--replaced') ) {
			$set.css('min-height', '').removeClass('is--replaced');
			if( this.pageNum in self.pageCache ) {
				$set.html( self.pageCache[this.pageNum].html );
		        	self.body.trigger( 'post-load', self.pageCache[this.pageNum] );
			}
		}

	});

	// Parse number of sets found in view in an attempt to update the URL to match the set that comprises the majority of the window.
	if ( 0 == setsInView.length ) {
		pageNum = -1;
	}
	else if ( 1 == setsInView.length ) {
		var setData = setsInView.pop();

		// If the first set of IS posts is in the same view as the posts loaded in the template by WordPress, determine how much of the view is comprised of IS-loaded posts
		if ( ( ( windowBottom - setData.top ) / windowSize ) < 0.5 )
			pageNum = -1;
		else
			pageNum = setData.pageNum;
	}
	else {
		var majorityPercentageInView = 0;

		// Identify the IS set that comprises the majority of the current window and set the URL to it.
		$.each( setsInView, function( i, setData ) {
			var topInView     = 0,
				bottomInView  = 0,
				percentOfView = 0;

			// Figure percentage of view the current set represents
			if ( setData.top > windowTop && setData.top < windowBottom )
				topInView = ( windowBottom - setData.top ) / windowSize;

			if ( setData.bottom > windowTop && setData.bottom < windowBottom )
				bottomInView = ( setData.bottom - windowTop ) / windowSize;

			// Figure out largest percentage of view for current set
			if ( topInView >= bottomInView )
				percentOfView = topInView;
			else if ( bottomInView >= topInView )
				percentOfView = bottomInView;

			// Does current set's percentage of view supplant the largest previously-found set?
			if ( percentOfView > majorityPercentageInView ) {
				pageNum = setData.pageNum;
				majorityPercentageInView = percentOfView;
			}
		} );
	}

	// If a page number could be determined, update the URL
	// -1 indicates that the original requested URL should be used.
	if ( 'number' == typeof pageNum ) {
		if ( pageNum != -1 )
			pageNum++;

		self.updateURL( pageNum );
	}
}

/**
 * Update address bar to reflect archive page URL for a given page number.
 * Checks if URL is different to prevent pollution of browser history.
 */
Scroller.prototype.updateURL = function( page ) {
	// IE only supports pushState() in v10 and above, so don't bother if those conditions aren't met.
	if ( ! window.history.pushState ) {
		return;
	}
	var self = this,
		offset = self.offset > 0 ? self.offset - 1 : 0,
		pageSlug = -1 == page ? self.origURL : window.location.protocol + '//' + self.history.host + self.history.path.replace( /%d/, page + offset ) + self.history.parameters;

	if ( window.location.href != pageSlug ) {
		history.pushState( null, null, pageSlug );
	}
}

/**
 * Ready, set, go!
 */
$( document ).ready( function() {
	// Check for our variables
	if ( 'object' != typeof infiniteScroll )
		return;

	// Set ajaxurl (for brevity)
	ajaxurl = infiniteScroll.settings.ajaxurl;

	// Set stats, used for tracking stats
	stats = infiniteScroll.settings.stats;

	// Define what type of infinity we have, grab text for click-handle
	type  = infiniteScroll.settings.type;
	text  = infiniteScroll.settings.text;
	totop = infiniteScroll.settings.totop;

	// Initialize the scroller (with the ID of the element from the theme)
	infiniteScroll.scroller = new Scroller( infiniteScroll.settings );

	/**
	 * Monitor user scroll activity to update URL to correspond to archive page for current set of IS posts
	 */
    if( type == 'click' ) {
        var timer = null;
        $( window ).bind( 'scroll', function() {
            // run the real scroll handler once every 250 ms.
            if ( timer ) { return; }
            timer = setTimeout( function() {
                infiniteScroll.scroller.determineURL();
                timer = null;
            } , 250 );
        });
    }
});


})(jQuery); // Close closure
;
// WARNING: This file is distributed verbatim in Jetpack. @hide-in-jetpack
/*!
 * jQuery Cycle Plugin (with Transition Definitions)
 * Examples and documentation at: http://jquery.malsup.com/cycle/
 * Copyright (c) 2007-2010 M. Alsup
 * Version: 2.9999.8 (26-OCT-2012)
 * Dual licensed under the MIT and GPL licenses.
 * http://jquery.malsup.com/license.html
 * Requires: jQuery v1.3.2 or later
 */
;(function($, undefined) {
"use strict";

var ver = '2.9999.8';

// if $.support is not defined (pre jQuery 1.3) add what I need
if ($.support === undefined) {
	$.support = {
		opacity: !($.browser.msie)
	};
}

function debug(s) {
	if ($.fn.cycle.debug)
		log(s);
}
function log() {
	if (window.console && console.log)
		console.log('[cycle] ' + Array.prototype.join.call(arguments,' '));
}
$.expr[':'].paused = function(el) {
	return el.cyclePause;
};


// the options arg can be...
//   a number  - indicates an immediate transition should occur to the given slide index
//   a string  - 'pause', 'resume', 'toggle', 'next', 'prev', 'stop', 'destroy' or the name of a transition effect (ie, 'fade', 'zoom', etc)
//   an object - properties to control the slideshow
//
// the arg2 arg can be...
//   the name of an fx (only used in conjunction with a numeric value for 'options')
//   the value true (only used in first arg == 'resume') and indicates
//	 that the resume should occur immediately (not wait for next timeout)

$.fn.cycle = function(options, arg2) {
	var o = { s: this.selector, c: this.context };

	// in 1.3+ we can fix mistakes with the ready state
	if (this.length === 0 && options != 'stop') {
		if (!$.isReady && o.s) {
			log('DOM not ready, queuing slideshow');
			$(function() {
				$(o.s,o.c).cycle(options,arg2);
			});
			return this;
		}
		// is your DOM ready?  http://docs.jquery.com/Tutorials:Introducing_$(document).ready()
		log('terminating; zero elements found by selector' + ($.isReady ? '' : ' (DOM not ready)'));
		return this;
	}

	// iterate the matched nodeset
	return this.each(function() {
		var opts = handleArguments(this, options, arg2);
		if (opts === false)
			return;

		opts.updateActivePagerLink = opts.updateActivePagerLink || $.fn.cycle.updateActivePagerLink;

		// stop existing slideshow for this container (if there is one)
		if (this.cycleTimeout)
			clearTimeout(this.cycleTimeout);
		this.cycleTimeout = this.cyclePause = 0;
		this.cycleStop = 0; // issue #108

		var $cont = $(this);
		var $slides = opts.slideExpr ? $(opts.slideExpr, this) : $cont.children();
		var els = $slides.get();

		if (els.length < 2) {
			log('terminating; too few slides: ' + els.length);
			return;
		}

		var opts2 = buildOptions($cont, $slides, els, opts, o);
		if (opts2 === false)
			return;

		var startTime = opts2.continuous ? 10 : getTimeout(els[opts2.currSlide], els[opts2.nextSlide], opts2, !opts2.backwards);

		// if it's an auto slideshow, kick it off
		if (startTime) {
			startTime += (opts2.delay || 0);
			if (startTime < 10)
				startTime = 10;
			debug('first timeout: ' + startTime);
			this.cycleTimeout = setTimeout(function(){go(els,opts2,0,!opts.backwards);}, startTime);
		}
	});
};

function triggerPause(cont, byHover, onPager) {
	var opts = $(cont).data('cycle.opts');
	if (!opts)
		return;
	var paused = !!cont.cyclePause;
	if (paused && opts.paused)
		opts.paused(cont, opts, byHover, onPager);
	else if (!paused && opts.resumed)
		opts.resumed(cont, opts, byHover, onPager);
}

// process the args that were passed to the plugin fn
function handleArguments(cont, options, arg2) {
	if (cont.cycleStop === undefined)
		cont.cycleStop = 0;
	if (options === undefined || options === null)
		options = {};
	if (options.constructor == String) {
		switch(options) {
		case 'destroy':
		case 'stop':
			var opts = $(cont).data('cycle.opts');
			if (!opts)
				return false;
			cont.cycleStop++; // callbacks look for change
			if (cont.cycleTimeout)
				clearTimeout(cont.cycleTimeout);
			cont.cycleTimeout = 0;
			if (opts.elements)
				$(opts.elements).stop();
			$(cont).removeData('cycle.opts');
			if (options == 'destroy')
				destroy(cont, opts);
			return false;
		case 'toggle':
			cont.cyclePause = (cont.cyclePause === 1) ? 0 : 1;
			checkInstantResume(cont.cyclePause, arg2, cont);
			triggerPause(cont);
			return false;
		case 'pause':
			cont.cyclePause = 1;
			triggerPause(cont);
			return false;
		case 'resume':
			cont.cyclePause = 0;
			checkInstantResume(false, arg2, cont);
			triggerPause(cont);
			return false;
		case 'prev':
		case 'next':
			opts = $(cont).data('cycle.opts');
			if (!opts) {
				log('options not found, "prev/next" ignored');
				return false;
			}
			$.fn.cycle[options](opts);
			return false;
		default:
			options = { fx: options };
		}
		return options;
	}
	else if (options.constructor == Number) {
		// go to the requested slide
		var num = options;
		options = $(cont).data('cycle.opts');
		if (!options) {
			log('options not found, can not advance slide');
			return false;
		}
		if (num < 0 || num >= options.elements.length) {
			log('invalid slide index: ' + num);
			return false;
		}
		options.nextSlide = num;
		if (cont.cycleTimeout) {
			clearTimeout(cont.cycleTimeout);
			cont.cycleTimeout = 0;
		}
		if (typeof arg2 == 'string')
			options.oneTimeFx = arg2;
		go(options.elements, options, 1, num >= options.currSlide);
		return false;
	}
	return options;

	function checkInstantResume(isPaused, arg2, cont) {
		if (!isPaused && arg2 === true) { // resume now!
			var options = $(cont).data('cycle.opts');
			if (!options) {
				log('options not found, can not resume');
				return false;
			}
			if (cont.cycleTimeout) {
				clearTimeout(cont.cycleTimeout);
				cont.cycleTimeout = 0;
			}
			go(options.elements, options, 1, !options.backwards);
		}
	}
}

function removeFilter(el, opts) {
	if (!$.support.opacity && opts.cleartype && el.style.filter) {
		try { el.style.removeAttribute('filter'); }
		catch(smother) {} // handle old opera versions
	}
}

// unbind event handlers
function destroy(cont, opts) {
	if (opts.next)
		$(opts.next).unbind(opts.prevNextEvent);
	if (opts.prev)
		$(opts.prev).unbind(opts.prevNextEvent);

	if (opts.pager || opts.pagerAnchorBuilder)
		$.each(opts.pagerAnchors || [], function() {
			this.unbind().remove();
		});
	opts.pagerAnchors = null;
	$(cont).unbind('mouseenter.cycle mouseleave.cycle');
	if (opts.destroy) // callback
		opts.destroy(opts);
}

// one-time initialization
function buildOptions($cont, $slides, els, options, o) {
	var startingSlideSpecified;
	// support metadata plugin (v1.0 and v2.0)
	var opts = $.extend({}, $.fn.cycle.defaults, options || {}, $.metadata ? $cont.metadata() : $.meta ? $cont.data() : {});
	var meta = $.isFunction($cont.data) ? $cont.data(opts.metaAttr) : null;
	if (meta)
		opts = $.extend(opts, meta);
	if (opts.autostop)
		opts.countdown = opts.autostopCount || els.length;

	var cont = $cont[0];
	$cont.data('cycle.opts', opts);
	opts.$cont = $cont;
	opts.stopCount = cont.cycleStop;
	opts.elements = els;
	opts.before = opts.before ? [opts.before] : [];
	opts.after = opts.after ? [opts.after] : [];

	// push some after callbacks
	if (!$.support.opacity && opts.cleartype)
		opts.after.push(function() { removeFilter(this, opts); });
	if (opts.continuous)
		opts.after.push(function() { go(els,opts,0,!opts.backwards); });

	saveOriginalOpts(opts);

	// clearType corrections
	if (!$.support.opacity && opts.cleartype && !opts.cleartypeNoBg)
		clearTypeFix($slides);

	// container requires non-static position so that slides can be position within
	if ($cont.css('position') == 'static')
		$cont.css('position', 'relative');
	if (opts.width)
		$cont.width(opts.width);
	if (opts.height && opts.height != 'auto')
		$cont.height(opts.height);

	if (opts.startingSlide !== undefined) {
		opts.startingSlide = parseInt(opts.startingSlide,10);
		if (opts.startingSlide >= els.length || opts.startSlide < 0)
			opts.startingSlide = 0; // catch bogus input
		else
			startingSlideSpecified = true;
	}
	else if (opts.backwards)
		opts.startingSlide = els.length - 1;
	else
		opts.startingSlide = 0;

	// if random, mix up the slide array
	if (opts.random) {
		opts.randomMap = [];
		for (var i = 0; i < els.length; i++)
			opts.randomMap.push(i);
		opts.randomMap.sort(function(a,b) {return Math.random() - 0.5;});
		if (startingSlideSpecified) {
			// try to find the specified starting slide and if found set start slide index in the map accordingly
			for ( var cnt = 0; cnt < els.length; cnt++ ) {
				if ( opts.startingSlide == opts.randomMap[cnt] ) {
					opts.randomIndex = cnt;
				}
			}
		}
		else {
			opts.randomIndex = 1;
			opts.startingSlide = opts.randomMap[1];
		}
	}
	else if (opts.startingSlide >= els.length)
		opts.startingSlide = 0; // catch bogus input
	opts.currSlide = opts.startingSlide || 0;
	var first = opts.startingSlide;

	// set position and zIndex on all the slides
	$slides.css({position: 'absolute', top:0, left:0}).hide().each(function(i) {
		var z;
		if (opts.backwards)
			z = first ? i <= first ? els.length + (i-first) : first-i : els.length-i;
		else
			z = first ? i >= first ? els.length - (i-first) : first-i : els.length-i;
		$(this).css('z-index', z);
	});

	// make sure first slide is visible
	$(els[first]).css('opacity',1).show(); // opacity bit needed to handle restart use case
	removeFilter(els[first], opts);

	// stretch slides
	if (opts.fit) {
		if (!opts.aspect) {
	        if (opts.width)
	            $slides.width(opts.width);
	        if (opts.height && opts.height != 'auto')
	            $slides.height(opts.height);
		} else {
			$slides.each(function(){
				var $slide = $(this);
				var ratio = (opts.aspect === true) ? $slide.width()/$slide.height() : opts.aspect;
				if( opts.width && $slide.width() != opts.width ) {
					$slide.width( opts.width );
					$slide.height( opts.width / ratio );
				}

				if( opts.height && $slide.height() < opts.height ) {
					$slide.height( opts.height );
					$slide.width( opts.height * ratio );
				}
			});
		}
	}

	if (opts.center && ((!opts.fit) || opts.aspect)) {
		$slides.each(function(){
			var $slide = $(this);
			$slide.css({
				"margin-left": opts.width ?
					((opts.width - $slide.width()) / 2) + "px" :
					0,
				"margin-top": opts.height ?
					((opts.height - $slide.height()) / 2) + "px" :
					0
			});
		});
	}

	if (opts.center && !opts.fit && !opts.slideResize) {
		$slides.each(function(){
			var $slide = $(this);
			$slide.css({
				"margin-left": opts.width ? ((opts.width - $slide.width()) / 2) + "px" : 0,
				"margin-top": opts.height ? ((opts.height - $slide.height()) / 2) + "px" : 0
			});
		});
	}

	// stretch container
	var reshape = (opts.containerResize || opts.containerResizeHeight) && !$cont.innerHeight();
	if (reshape) { // do this only if container has no size http://tinyurl.com/da2oa9
		var maxw = 0, maxh = 0;
		for(var j=0; j < els.length; j++) {
			var $e = $(els[j]), e = $e[0], w = $e.outerWidth(), h = $e.outerHeight();
			if (!w) w = e.offsetWidth || e.width || $e.attr('width');
			if (!h) h = e.offsetHeight || e.height || $e.attr('height');
			maxw = w > maxw ? w : maxw;
			maxh = h > maxh ? h : maxh;
		}
		if (opts.containerResize && maxw > 0 && maxh > 0)
			$cont.css({width:maxw+'px',height:maxh+'px'});
		if (opts.containerResizeHeight && maxh > 0)
			$cont.css({height:maxh+'px'});
	}

	var pauseFlag = false;  // https://github.com/malsup/cycle/issues/44
	if (opts.pause)
		$cont.bind('mouseenter.cycle', function(){
			pauseFlag = true;
			this.cyclePause++;
			triggerPause(cont, true);
		}).bind('mouseleave.cycle', function(){
				if (pauseFlag)
					this.cyclePause--;
				triggerPause(cont, true);
		});

	if (supportMultiTransitions(opts) === false)
		return false;

	// apparently a lot of people use image slideshows without height/width attributes on the images.
	// Cycle 2.50+ requires the sizing info for every slide; this block tries to deal with that.
	var requeue = false;
	options.requeueAttempts = options.requeueAttempts || 0;
	$slides.each(function() {
		// try to get height/width of each slide
		var $el = $(this);
		this.cycleH = (opts.fit && opts.height) ? opts.height : ($el.height() || this.offsetHeight || this.height || $el.attr('height') || 0);
		this.cycleW = (opts.fit && opts.width) ? opts.width : ($el.width() || this.offsetWidth || this.width || $el.attr('width') || 0);

		if ( $el.is('img') ) {
			// sigh..  sniffing, hacking, shrugging...  this crappy hack tries to account for what browsers do when
			// an image is being downloaded and the markup did not include sizing info (height/width attributes);
			// there seems to be some "default" sizes used in this situation
			var loadingIE	= ($.browser.msie  && this.cycleW == 28 && this.cycleH == 30 && !this.complete);
			var loadingFF	= ($.browser.mozilla && this.cycleW == 34 && this.cycleH == 19 && !this.complete);
			var loadingOp	= ($.browser.opera && ((this.cycleW == 42 && this.cycleH == 19) || (this.cycleW == 37 && this.cycleH == 17)) && !this.complete);
			var loadingOther = (this.cycleH === 0 && this.cycleW === 0 && !this.complete);
			// don't requeue for images that are still loading but have a valid size
			if (loadingIE || loadingFF || loadingOp || loadingOther) {
				if (o.s && opts.requeueOnImageNotLoaded && ++options.requeueAttempts < 100) { // track retry count so we don't loop forever
					log(options.requeueAttempts,' - img slide not loaded, requeuing slideshow: ', this.src, this.cycleW, this.cycleH);
					setTimeout(function() {$(o.s,o.c).cycle(options);}, opts.requeueTimeout);
					requeue = true;
					return false; // break each loop
				}
				else {
					log('could not determine size of image: '+this.src, this.cycleW, this.cycleH);
				}
			}
		}
		return true;
	});

	if (requeue)
		return false;

	opts.cssBefore = opts.cssBefore || {};
	opts.cssAfter = opts.cssAfter || {};
	opts.cssFirst = opts.cssFirst || {};
	opts.animIn = opts.animIn || {};
	opts.animOut = opts.animOut || {};

	$slides.not(':eq('+first+')').css(opts.cssBefore);
	$($slides[first]).css(opts.cssFirst);

	if (opts.timeout) {
		opts.timeout = parseInt(opts.timeout,10);
		// ensure that timeout and speed settings are sane
		if (opts.speed.constructor == String)
			opts.speed = $.fx.speeds[opts.speed] || parseInt(opts.speed,10);
		if (!opts.sync)
			opts.speed = opts.speed / 2;

		var buffer = opts.fx == 'none' ? 0 : opts.fx == 'shuffle' ? 500 : 250;
		while((opts.timeout - opts.speed) < buffer) // sanitize timeout
			opts.timeout += opts.speed;
	}
	if (opts.easing)
		opts.easeIn = opts.easeOut = opts.easing;
	if (!opts.speedIn)
		opts.speedIn = opts.speed;
	if (!opts.speedOut)
		opts.speedOut = opts.speed;

	opts.slideCount = els.length;
	opts.currSlide = opts.lastSlide = first;
	if (opts.random) {
		if (++opts.randomIndex == els.length)
			opts.randomIndex = 0;
		opts.nextSlide = opts.randomMap[opts.randomIndex];
	}
	else if (opts.backwards)
		opts.nextSlide = opts.startingSlide === 0 ? (els.length-1) : opts.startingSlide-1;
	else
		opts.nextSlide = opts.startingSlide >= (els.length-1) ? 0 : opts.startingSlide+1;

	// run transition init fn
	if (!opts.multiFx) {
		var init = $.fn.cycle.transitions[opts.fx];
		if ($.isFunction(init))
			init($cont, $slides, opts);
		else if (opts.fx != 'custom' && !opts.multiFx) {
			log('unknown transition: ' + opts.fx,'; slideshow terminating');
			return false;
		}
	}

	// fire artificial events
	var e0 = $slides[first];
	if (!opts.skipInitializationCallbacks) {
		if (opts.before.length)
			opts.before[0].apply(e0, [e0, e0, opts, true]);
		if (opts.after.length)
			opts.after[0].apply(e0, [e0, e0, opts, true]);
	}
	if (opts.next)
		$(opts.next).bind(opts.prevNextEvent,function(){return advance(opts,1);});
	if (opts.prev)
		$(opts.prev).bind(opts.prevNextEvent,function(){return advance(opts,0);});
	if (opts.pager || opts.pagerAnchorBuilder)
		buildPager(els,opts);

	exposeAddSlide(opts, els);

	return opts;
}

// save off original opts so we can restore after clearing state
function saveOriginalOpts(opts) {
	opts.original = { before: [], after: [] };
	opts.original.cssBefore = $.extend({}, opts.cssBefore);
	opts.original.cssAfter  = $.extend({}, opts.cssAfter);
	opts.original.animIn	= $.extend({}, opts.animIn);
	opts.original.animOut   = $.extend({}, opts.animOut);
	$.each(opts.before, function() { opts.original.before.push(this); });
	$.each(opts.after,  function() { opts.original.after.push(this); });
}

function supportMultiTransitions(opts) {
	var i, tx, txs = $.fn.cycle.transitions;
	// look for multiple effects
	if (opts.fx.indexOf(',') > 0) {
		opts.multiFx = true;
		opts.fxs = opts.fx.replace(/\s*/g,'').split(',');
		// discard any bogus effect names
		for (i=0; i < opts.fxs.length; i++) {
			var fx = opts.fxs[i];
			tx = txs[fx];
			if (!tx || !txs.hasOwnProperty(fx) || !$.isFunction(tx)) {
				log('discarding unknown transition: ',fx);
				opts.fxs.splice(i,1);
				i--;
			}
		}
		// if we have an empty list then we threw everything away!
		if (!opts.fxs.length) {
			log('No valid transitions named; slideshow terminating.');
			return false;
		}
	}
	else if (opts.fx == 'all') {  // auto-gen the list of transitions
		opts.multiFx = true;
		opts.fxs = [];
		for (var p in txs) {
			if (txs.hasOwnProperty(p)) {
				tx = txs[p];
				if (txs.hasOwnProperty(p) && $.isFunction(tx))
					opts.fxs.push(p);
			}
		}
	}
	if (opts.multiFx && opts.randomizeEffects) {
		// munge the fxs array to make effect selection random
		var r1 = Math.floor(Math.random() * 20) + 30;
		for (i = 0; i < r1; i++) {
			var r2 = Math.floor(Math.random() * opts.fxs.length);
			opts.fxs.push(opts.fxs.splice(r2,1)[0]);
		}
		debug('randomized fx sequence: ',opts.fxs);
	}
	return true;
}

// provide a mechanism for adding slides after the slideshow has started
function exposeAddSlide(opts, els) {
	opts.addSlide = function(newSlide, prepend) {
		var $s = $(newSlide), s = $s[0];
		if (!opts.autostopCount)
			opts.countdown++;
		els[prepend?'unshift':'push'](s);
		if (opts.els)
			opts.els[prepend?'unshift':'push'](s); // shuffle needs this
		opts.slideCount = els.length;

		// add the slide to the random map and resort
		if (opts.random) {
			opts.randomMap.push(opts.slideCount-1);
			opts.randomMap.sort(function(a,b) {return Math.random() - 0.5;});
		}

		$s.css('position','absolute');
		$s[prepend?'prependTo':'appendTo'](opts.$cont);

		if (prepend) {
			opts.currSlide++;
			opts.nextSlide++;
		}

		if (!$.support.opacity && opts.cleartype && !opts.cleartypeNoBg)
			clearTypeFix($s);

		if (opts.fit && opts.width)
			$s.width(opts.width);
		if (opts.fit && opts.height && opts.height != 'auto')
			$s.height(opts.height);
		s.cycleH = (opts.fit && opts.height) ? opts.height : $s.height();
		s.cycleW = (opts.fit && opts.width) ? opts.width : $s.width();

		$s.css(opts.cssBefore);

		if (opts.pager || opts.pagerAnchorBuilder)
			$.fn.cycle.createPagerAnchor(els.length-1, s, $(opts.pager), els, opts);

		if ($.isFunction(opts.onAddSlide))
			opts.onAddSlide($s);
		else
			$s.hide(); // default behavior
	};
}

// reset internal state; we do this on every pass in order to support multiple effects
$.fn.cycle.resetState = function(opts, fx) {
	fx = fx || opts.fx;
	opts.before = []; opts.after = [];
	opts.cssBefore = $.extend({}, opts.original.cssBefore);
	opts.cssAfter  = $.extend({}, opts.original.cssAfter);
	opts.animIn	= $.extend({}, opts.original.animIn);
	opts.animOut   = $.extend({}, opts.original.animOut);
	opts.fxFn = null;
	$.each(opts.original.before, function() { opts.before.push(this); });
	$.each(opts.original.after,  function() { opts.after.push(this); });

	// re-init
	var init = $.fn.cycle.transitions[fx];
	if ($.isFunction(init))
		init(opts.$cont, $(opts.elements), opts);
};

// this is the main engine fn, it handles the timeouts, callbacks and slide index mgmt
function go(els, opts, manual, fwd) {
	var p = opts.$cont[0], curr = els[opts.currSlide], next = els[opts.nextSlide];

	// opts.busy is true if we're in the middle of an animation
	if (manual && opts.busy && opts.manualTrump) {
		// let manual transitions requests trump active ones
		debug('manualTrump in go(), stopping active transition');
		$(els).stop(true,true);
		opts.busy = 0;
		clearTimeout(p.cycleTimeout);
	}

	// don't begin another timeout-based transition if there is one active
	if (opts.busy) {
		debug('transition active, ignoring new tx request');
		return;
	}


	// stop cycling if we have an outstanding stop request
	if (p.cycleStop != opts.stopCount || p.cycleTimeout === 0 && !manual)
		return;

	// check to see if we should stop cycling based on autostop options
	if (!manual && !p.cyclePause && !opts.bounce &&
		((opts.autostop && (--opts.countdown <= 0)) ||
		(opts.nowrap && !opts.random && opts.nextSlide < opts.currSlide))) {
		if (opts.end)
			opts.end(opts);
		return;
	}

	// if slideshow is paused, only transition on a manual trigger
	var changed = false;
	if ((manual || !p.cyclePause) && (opts.nextSlide != opts.currSlide)) {
		changed = true;
		var fx = opts.fx;
		// keep trying to get the slide size if we don't have it yet
		curr.cycleH = curr.cycleH || $(curr).height();
		curr.cycleW = curr.cycleW || $(curr).width();
		next.cycleH = next.cycleH || $(next).height();
		next.cycleW = next.cycleW || $(next).width();

		// support multiple transition types
		if (opts.multiFx) {
			if (fwd && (opts.lastFx === undefined || ++opts.lastFx >= opts.fxs.length))
				opts.lastFx = 0;
			else if (!fwd && (opts.lastFx === undefined || --opts.lastFx < 0))
				opts.lastFx = opts.fxs.length - 1;
			fx = opts.fxs[opts.lastFx];
		}

		// one-time fx overrides apply to:  $('div').cycle(3,'zoom');
		if (opts.oneTimeFx) {
			fx = opts.oneTimeFx;
			opts.oneTimeFx = null;
		}

		$.fn.cycle.resetState(opts, fx);

		// run the before callbacks
		if (opts.before.length)
			$.each(opts.before, function(i,o) {
				if (p.cycleStop != opts.stopCount) return;
				o.apply(next, [curr, next, opts, fwd]);
			});

		// stage the after callacks
		var after = function() {
			opts.busy = 0;
			$.each(opts.after, function(i,o) {
				if (p.cycleStop != opts.stopCount) return;
				o.apply(next, [curr, next, opts, fwd]);
			});
			if (!p.cycleStop) {
				// queue next transition
				queueNext();
			}
		};

		debug('tx firing('+fx+'); currSlide: ' + opts.currSlide + '; nextSlide: ' + opts.nextSlide);

		// get ready to perform the transition
		opts.busy = 1;
		if (opts.fxFn) // fx function provided?
			opts.fxFn(curr, next, opts, after, fwd, manual && opts.fastOnEvent);
		else if ($.isFunction($.fn.cycle[opts.fx])) // fx plugin ?
			$.fn.cycle[opts.fx](curr, next, opts, after, fwd, manual && opts.fastOnEvent);
		else
			$.fn.cycle.custom(curr, next, opts, after, fwd, manual && opts.fastOnEvent);
	}
	else {
		queueNext();
	}

	if (changed || opts.nextSlide == opts.currSlide) {
		// calculate the next slide
		var roll;
		opts.lastSlide = opts.currSlide;
		if (opts.random) {
			opts.currSlide = opts.nextSlide;
			if (++opts.randomIndex == els.length) {
				opts.randomIndex = 0;
				opts.randomMap.sort(function(a,b) {return Math.random() - 0.5;});
			}
			opts.nextSlide = opts.randomMap[opts.randomIndex];
			if (opts.nextSlide == opts.currSlide)
				opts.nextSlide = (opts.currSlide == opts.slideCount - 1) ? 0 : opts.currSlide + 1;
		}
		else if (opts.backwards) {
			roll = (opts.nextSlide - 1) < 0;
			if (roll && opts.bounce) {
				opts.backwards = !opts.backwards;
				opts.nextSlide = 1;
				opts.currSlide = 0;
			}
			else {
				opts.nextSlide = roll ? (els.length-1) : opts.nextSlide-1;
				opts.currSlide = roll ? 0 : opts.nextSlide+1;
			}
		}
		else { // sequence
			roll = (opts.nextSlide + 1) == els.length;
			if (roll && opts.bounce) {
				opts.backwards = !opts.backwards;
				opts.nextSlide = els.length-2;
				opts.currSlide = els.length-1;
			}
			else {
				opts.nextSlide = roll ? 0 : opts.nextSlide+1;
				opts.currSlide = roll ? els.length-1 : opts.nextSlide-1;
			}
		}
	}
	if (changed && opts.pager)
		opts.updateActivePagerLink(opts.pager, opts.currSlide, opts.activePagerClass);

	function queueNext() {
		// stage the next transition
		var ms = 0, timeout = opts.timeout;
		if (opts.timeout && !opts.continuous) {
			ms = getTimeout(els[opts.currSlide], els[opts.nextSlide], opts, fwd);
         if (opts.fx == 'shuffle')
            ms -= opts.speedOut;
      }
		else if (opts.continuous && p.cyclePause) // continuous shows work off an after callback, not this timer logic
			ms = 10;
		if (ms > 0)
			p.cycleTimeout = setTimeout(function(){ go(els, opts, 0, !opts.backwards); }, ms);
	}
}

// invoked after transition
$.fn.cycle.updateActivePagerLink = function(pager, currSlide, clsName) {
   $(pager).each(function() {
       $(this).children().removeClass(clsName).eq(currSlide).addClass(clsName);
   });
};

// calculate timeout value for current transition
function getTimeout(curr, next, opts, fwd) {
	if (opts.timeoutFn) {
		// call user provided calc fn
		var t = opts.timeoutFn.call(curr,curr,next,opts,fwd);
		while (opts.fx != 'none' && (t - opts.speed) < 250) // sanitize timeout
			t += opts.speed;
		debug('calculated timeout: ' + t + '; speed: ' + opts.speed);
		if (t !== false)
			return t;
	}
	return opts.timeout;
}

// expose next/prev function, caller must pass in state
$.fn.cycle.next = function(opts) { advance(opts,1); };
$.fn.cycle.prev = function(opts) { advance(opts,0);};

// advance slide forward or back
function advance(opts, moveForward) {
	var val = moveForward ? 1 : -1;
	var els = opts.elements;
	var p = opts.$cont[0], timeout = p.cycleTimeout;
	if (timeout) {
		clearTimeout(timeout);
		p.cycleTimeout = 0;
	}
	if (opts.random && val < 0) {
		// move back to the previously display slide
		opts.randomIndex--;
		if (--opts.randomIndex == -2)
			opts.randomIndex = els.length-2;
		else if (opts.randomIndex == -1)
			opts.randomIndex = els.length-1;
		opts.nextSlide = opts.randomMap[opts.randomIndex];
	}
	else if (opts.random) {
		opts.nextSlide = opts.randomMap[opts.randomIndex];
	}
	else {
		opts.nextSlide = opts.currSlide + val;
		if (opts.nextSlide < 0) {
			if (opts.nowrap) return false;
			opts.nextSlide = els.length - 1;
		}
		else if (opts.nextSlide >= els.length) {
			if (opts.nowrap) return false;
			opts.nextSlide = 0;
		}
	}

	var cb = opts.onPrevNextEvent || opts.prevNextClick; // prevNextClick is deprecated
	if ($.isFunction(cb))
		cb(val > 0, opts.nextSlide, els[opts.nextSlide]);
	go(els, opts, 1, moveForward);
	return false;
}

function buildPager(els, opts) {
	var $p = $(opts.pager);
	$.each(els, function(i,o) {
		$.fn.cycle.createPagerAnchor(i,o,$p,els,opts);
	});
	opts.updateActivePagerLink(opts.pager, opts.startingSlide, opts.activePagerClass);
}

$.fn.cycle.createPagerAnchor = function(i, el, $p, els, opts) {
	var a;
	if ($.isFunction(opts.pagerAnchorBuilder)) {
		a = opts.pagerAnchorBuilder(i,el);
		debug('pagerAnchorBuilder('+i+', el) returned: ' + a);
	}
	else
		a = '<a href="#">'+(i+1)+'</a>';

	if (!a)
		return;
	var $a = $(a);
	// don't reparent if anchor is in the dom
	if ($a.parents('body').length === 0) {
		var arr = [];
		if ($p.length > 1) {
			$p.each(function() {
				var $clone = $a.clone(true);
				$(this).append($clone);
				arr.push($clone[0]);
			});
			$a = $(arr);
		}
		else {
			$a.appendTo($p);
		}
	}

	opts.pagerAnchors =  opts.pagerAnchors || [];
	opts.pagerAnchors.push($a);

	var pagerFn = function(e) {
		e.preventDefault();
		opts.nextSlide = i;
		var p = opts.$cont[0], timeout = p.cycleTimeout;
		if (timeout) {
			clearTimeout(timeout);
			p.cycleTimeout = 0;
		}
		var cb = opts.onPagerEvent || opts.pagerClick; // pagerClick is deprecated
		if ($.isFunction(cb))
			cb(opts.nextSlide, els[opts.nextSlide]);
		go(els,opts,1,opts.currSlide < i); // trigger the trans
//		return false; // <== allow bubble
	};

	if ( /mouseenter|mouseover/i.test(opts.pagerEvent) ) {
		$a.hover(pagerFn, function(){/* no-op */} );
	}
	else {
		$a.bind(opts.pagerEvent, pagerFn);
	}

	if ( ! /^click/.test(opts.pagerEvent) && !opts.allowPagerClickBubble)
		$a.bind('click.cycle', function(){return false;}); // suppress click

	var cont = opts.$cont[0];
	var pauseFlag = false; // https://github.com/malsup/cycle/issues/44
	if (opts.pauseOnPagerHover) {
		$a.hover(
			function() {
				pauseFlag = true;
				cont.cyclePause++;
				triggerPause(cont,true,true);
			}, function() {
				if (pauseFlag)
					cont.cyclePause--;
				triggerPause(cont,true,true);
			}
		);
	}
};

// helper fn to calculate the number of slides between the current and the next
$.fn.cycle.hopsFromLast = function(opts, fwd) {
	var hops, l = opts.lastSlide, c = opts.currSlide;
	if (fwd)
		hops = c > l ? c - l : opts.slideCount - l;
	else
		hops = c < l ? l - c : l + opts.slideCount - c;
	return hops;
};

// fix clearType problems in ie6 by setting an explicit bg color
// (otherwise text slides look horrible during a fade transition)
function clearTypeFix($slides) {
	debug('applying clearType background-color hack');
	function hex(s) {
		s = parseInt(s,10).toString(16);
		return s.length < 2 ? '0'+s : s;
	}
	function getBg(e) {
		for ( ; e && e.nodeName.toLowerCase() != 'html'; e = e.parentNode) {
			var v = $.css(e,'background-color');
			if (v && v.indexOf('rgb') >= 0 ) {
				var rgb = v.match(/\d+/g);
				return '#'+ hex(rgb[0]) + hex(rgb[1]) + hex(rgb[2]);
			}
			if (v && v != 'transparent')
				return v;
		}
		return '#ffffff';
	}
	$slides.each(function() { $(this).css('background-color', getBg(this)); });
}

// reset common props before the next transition
$.fn.cycle.commonReset = function(curr,next,opts,w,h,rev) {
	$(opts.elements).not(curr).hide();
	if (typeof opts.cssBefore.opacity == 'undefined')
		opts.cssBefore.opacity = 1;
	opts.cssBefore.display = 'block';
	if (opts.slideResize && w !== false && next.cycleW > 0)
		opts.cssBefore.width = next.cycleW;
	if (opts.slideResize && h !== false && next.cycleH > 0)
		opts.cssBefore.height = next.cycleH;
	opts.cssAfter = opts.cssAfter || {};
	opts.cssAfter.display = 'none';
	$(curr).css('zIndex',opts.slideCount + (rev === true ? 1 : 0));
	$(next).css('zIndex',opts.slideCount + (rev === true ? 0 : 1));
};

// the actual fn for effecting a transition
$.fn.cycle.custom = function(curr, next, opts, cb, fwd, speedOverride) {
	var $l = $(curr), $n = $(next);
	var speedIn = opts.speedIn, speedOut = opts.speedOut, easeIn = opts.easeIn, easeOut = opts.easeOut;
	$n.css(opts.cssBefore);
	if (speedOverride) {
		if (typeof speedOverride == 'number')
			speedIn = speedOut = speedOverride;
		else
			speedIn = speedOut = 1;
		easeIn = easeOut = null;
	}
	var fn = function() {
		$n.animate(opts.animIn, speedIn, easeIn, function() {
			cb();
		});
	};
	$l.animate(opts.animOut, speedOut, easeOut, function() {
		$l.css(opts.cssAfter);
		if (!opts.sync)
			fn();
	});
	if (opts.sync) fn();
};

// transition definitions - only fade is defined here, transition pack defines the rest
$.fn.cycle.transitions = {
	fade: function($cont, $slides, opts) {
		$slides.not(':eq('+opts.currSlide+')').css('opacity',0);
		opts.before.push(function(curr,next,opts) {
			$.fn.cycle.commonReset(curr,next,opts);
			opts.cssBefore.opacity = 0;
		});
		opts.animIn	   = { opacity: 1 };
		opts.animOut   = { opacity: 0 };
		opts.cssBefore = { top: 0, left: 0 };
	}
};

$.fn.cycle.ver = function() { return ver; };

// override these globally if you like (they are all optional)
$.fn.cycle.defaults = {
    activePagerClass: 'activeSlide', // class name used for the active pager link
    after:            null,     // transition callback (scope set to element that was shown):  function(currSlideElement, nextSlideElement, options, forwardFlag)
    allowPagerClickBubble: false, // allows or prevents click event on pager anchors from bubbling
    animIn:           null,     // properties that define how the slide animates in
    animOut:          null,     // properties that define how the slide animates out
    aspect:           false,    // preserve aspect ratio during fit resizing, cropping if necessary (must be used with fit option)
    autostop:         0,        // true to end slideshow after X transitions (where X == slide count)
    autostopCount:    0,        // number of transitions (optionally used with autostop to define X)
    backwards:        false,    // true to start slideshow at last slide and move backwards through the stack
    before:           null,     // transition callback (scope set to element to be shown):     function(currSlideElement, nextSlideElement, options, forwardFlag)
    center:           null,     // set to true to have cycle add top/left margin to each slide (use with width and height options)
    cleartype:        !$.support.opacity,  // true if clearType corrections should be applied (for IE)
    cleartypeNoBg:    false,    // set to true to disable extra cleartype fixing (leave false to force background color setting on slides)
    containerResize:  1,        // resize container to fit largest slide
    containerResizeHeight:  0,  // resize containers height to fit the largest slide but leave the width dynamic
    continuous:       0,        // true to start next transition immediately after current one completes
    cssAfter:         null,     // properties that defined the state of the slide after transitioning out
    cssBefore:        null,     // properties that define the initial state of the slide before transitioning in
    delay:            0,        // additional delay (in ms) for first transition (hint: can be negative)
    easeIn:           null,     // easing for "in" transition
    easeOut:          null,     // easing for "out" transition
    easing:           null,     // easing method for both in and out transitions
    end:              null,     // callback invoked when the slideshow terminates (use with autostop or nowrap options): function(options)
    fastOnEvent:      0,        // force fast transitions when triggered manually (via pager or prev/next); value == time in ms
    fit:              0,        // force slides to fit container
    fx:               'fade',   // name of transition effect (or comma separated names, ex: 'fade,scrollUp,shuffle')
    fxFn:             null,     // function used to control the transition: function(currSlideElement, nextSlideElement, options, afterCalback, forwardFlag)
    height:           'auto',   // container height (if the 'fit' option is true, the slides will be set to this height as well)
    manualTrump:      true,     // causes manual transition to stop an active transition instead of being ignored
    metaAttr:         'cycle',  // data- attribute that holds the option data for the slideshow
    next:             null,     // element, jQuery object, or jQuery selector string for the element to use as event trigger for next slide
    nowrap:           0,        // true to prevent slideshow from wrapping
    onPagerEvent:     null,     // callback fn for pager events: function(zeroBasedSlideIndex, slideElement)
    onPrevNextEvent:  null,     // callback fn for prev/next events: function(isNext, zeroBasedSlideIndex, slideElement)
    pager:            null,     // element, jQuery object, or jQuery selector string for the element to use as pager container
    pagerAnchorBuilder: null,   // callback fn for building anchor links:  function(index, DOMelement)
    pagerEvent:       'click.cycle', // name of event which drives the pager navigation
    pause:            0,        // true to enable "pause on hover"
    pauseOnPagerHover: 0,       // true to pause when hovering over pager link
    prev:             null,     // element, jQuery object, or jQuery selector string for the element to use as event trigger for previous slide
    prevNextEvent:    'click.cycle',// event which drives the manual transition to the previous or next slide
    random:           0,        // true for random, false for sequence (not applicable to shuffle fx)
    randomizeEffects: 1,        // valid when multiple effects are used; true to make the effect sequence random
    requeueOnImageNotLoaded: true, // requeue the slideshow if any image slides are not yet loaded
    requeueTimeout:   250,      // ms delay for requeue
    rev:              0,        // causes animations to transition in reverse (for effects that support it such as scrollHorz/scrollVert/shuffle)
    shuffle:          null,     // coords for shuffle animation, ex: { top:15, left: 200 }
    skipInitializationCallbacks: false, // set to true to disable the first before/after callback that occurs prior to any transition
    slideExpr:        null,     // expression for selecting slides (if something other than all children is required)
    slideResize:      1,        // force slide width/height to fixed size before every transition
    speed:            1000,     // speed of the transition (any valid fx speed value)
    speedIn:          null,     // speed of the 'in' transition
    speedOut:         null,     // speed of the 'out' transition
    startingSlide:    undefined,// zero-based index of the first slide to be displayed
    sync:             1,        // true if in/out transitions should occur simultaneously
    timeout:          4000,     // milliseconds between slide transitions (0 to disable auto advance)
    timeoutFn:        null,     // callback for determining per-slide timeout value:  function(currSlideElement, nextSlideElement, options, forwardFlag)
    updateActivePagerLink: null,// callback fn invoked to update the active pager link (adds/removes activePagerClass style)
    width:            null      // container width (if the 'fit' option is true, the slides will be set to this width as well)
};

})(jQuery);


/*!
 * jQuery Cycle Plugin Transition Definitions
 * This script is a plugin for the jQuery Cycle Plugin
 * Examples and documentation at: http://malsup.com/jquery/cycle/
 * Copyright (c) 2007-2010 M. Alsup
 * Version:	 2.73
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 */
(function($) {
"use strict";

//
// These functions define slide initialization and properties for the named
// transitions. To save file size feel free to remove any of these that you
// don't need.
//
$.fn.cycle.transitions.none = function($cont, $slides, opts) {
	opts.fxFn = function(curr,next,opts,after){
		$(next).show();
		$(curr).hide();
		after();
	};
};

// not a cross-fade, fadeout only fades out the top slide
$.fn.cycle.transitions.fadeout = function($cont, $slides, opts) {
	$slides.not(':eq('+opts.currSlide+')').css({ display: 'block', 'opacity': 1 });
	opts.before.push(function(curr,next,opts,w,h,rev) {
		$(curr).css('zIndex',opts.slideCount + (rev !== true ? 1 : 0));
		$(next).css('zIndex',opts.slideCount + (rev !== true ? 0 : 1));
	});
	opts.animIn.opacity = 1;
	opts.animOut.opacity = 0;
	opts.cssBefore.opacity = 1;
	opts.cssBefore.display = 'block';
	opts.cssAfter.zIndex = 0;
};

// scrollUp/Down/Left/Right
$.fn.cycle.transitions.scrollUp = function($cont, $slides, opts) {
	$cont.css('overflow','hidden');
	opts.before.push($.fn.cycle.commonReset);
	var h = $cont.height();
	opts.cssBefore.top = h;
	opts.cssBefore.left = 0;
	opts.cssFirst.top = 0;
	opts.animIn.top = 0;
	opts.animOut.top = -h;
};
$.fn.cycle.transitions.scrollDown = function($cont, $slides, opts) {
	$cont.css('overflow','hidden');
	opts.before.push($.fn.cycle.commonReset);
	var h = $cont.height();
	opts.cssFirst.top = 0;
	opts.cssBefore.top = -h;
	opts.cssBefore.left = 0;
	opts.animIn.top = 0;
	opts.animOut.top = h;
};
$.fn.cycle.transitions.scrollLeft = function($cont, $slides, opts) {
	$cont.css('overflow','hidden');
	opts.before.push($.fn.cycle.commonReset);
	var w = $cont.width();
	opts.cssFirst.left = 0;
	opts.cssBefore.left = w;
	opts.cssBefore.top = 0;
	opts.animIn.left = 0;
	opts.animOut.left = 0-w;
};
$.fn.cycle.transitions.scrollRight = function($cont, $slides, opts) {
	$cont.css('overflow','hidden');
	opts.before.push($.fn.cycle.commonReset);
	var w = $cont.width();
	opts.cssFirst.left = 0;
	opts.cssBefore.left = -w;
	opts.cssBefore.top = 0;
	opts.animIn.left = 0;
	opts.animOut.left = w;
};
$.fn.cycle.transitions.scrollHorz = function($cont, $slides, opts) {
	$cont.css('overflow','hidden').width();
	opts.before.push(function(curr, next, opts, fwd) {
		if (opts.rev)
			fwd = !fwd;
		$.fn.cycle.commonReset(curr,next,opts);
		opts.cssBefore.left = fwd ? (next.cycleW-1) : (1-next.cycleW);
		opts.animOut.left = fwd ? -curr.cycleW : curr.cycleW;
	});
	opts.cssFirst.left = 0;
	opts.cssBefore.top = 0;
	opts.animIn.left = 0;
	opts.animOut.top = 0;
};
$.fn.cycle.transitions.scrollVert = function($cont, $slides, opts) {
	$cont.css('overflow','hidden');
	opts.before.push(function(curr, next, opts, fwd) {
		if (opts.rev)
			fwd = !fwd;
		$.fn.cycle.commonReset(curr,next,opts);
		opts.cssBefore.top = fwd ? (1-next.cycleH) : (next.cycleH-1);
		opts.animOut.top = fwd ? curr.cycleH : -curr.cycleH;
	});
	opts.cssFirst.top = 0;
	opts.cssBefore.left = 0;
	opts.animIn.top = 0;
	opts.animOut.left = 0;
};

// slideX/slideY
$.fn.cycle.transitions.slideX = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$(opts.elements).not(curr).hide();
		$.fn.cycle.commonReset(curr,next,opts,false,true);
		opts.animIn.width = next.cycleW;
	});
	opts.cssBefore.left = 0;
	opts.cssBefore.top = 0;
	opts.cssBefore.width = 0;
	opts.animIn.width = 'show';
	opts.animOut.width = 0;
};
$.fn.cycle.transitions.slideY = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$(opts.elements).not(curr).hide();
		$.fn.cycle.commonReset(curr,next,opts,true,false);
		opts.animIn.height = next.cycleH;
	});
	opts.cssBefore.left = 0;
	opts.cssBefore.top = 0;
	opts.cssBefore.height = 0;
	opts.animIn.height = 'show';
	opts.animOut.height = 0;
};

// shuffle
$.fn.cycle.transitions.shuffle = function($cont, $slides, opts) {
	var i, w = $cont.css('overflow', 'visible').width();
	$slides.css({left: 0, top: 0});
	opts.before.push(function(curr,next,opts) {
		$.fn.cycle.commonReset(curr,next,opts,true,true,true);
	});
	// only adjust speed once!
	if (!opts.speedAdjusted) {
		opts.speed = opts.speed / 2; // shuffle has 2 transitions
		opts.speedAdjusted = true;
	}
	opts.random = 0;
	opts.shuffle = opts.shuffle || {left:-w, top:15};
	opts.els = [];
	for (i=0; i < $slides.length; i++)
		opts.els.push($slides[i]);

	for (i=0; i < opts.currSlide; i++)
		opts.els.push(opts.els.shift());

	// custom transition fn (hat tip to Benjamin Sterling for this bit of sweetness!)
	opts.fxFn = function(curr, next, opts, cb, fwd) {
		if (opts.rev)
			fwd = !fwd;
		var $el = fwd ? $(curr) : $(next);
		$(next).css(opts.cssBefore);
		var count = opts.slideCount;
		$el.animate(opts.shuffle, opts.speedIn, opts.easeIn, function() {
			var hops = $.fn.cycle.hopsFromLast(opts, fwd);
			for (var k=0; k < hops; k++) {
				if (fwd)
					opts.els.push(opts.els.shift());
				else
					opts.els.unshift(opts.els.pop());
			}
			if (fwd) {
				for (var i=0, len=opts.els.length; i < len; i++)
					$(opts.els[i]).css('z-index', len-i+count);
			}
			else {
				var z = $(curr).css('z-index');
				$el.css('z-index', parseInt(z,10)+1+count);
			}
			$el.animate({left:0, top:0}, opts.speedOut, opts.easeOut, function() {
				$(fwd ? this : curr).hide();
				if (cb) cb();
			});
		});
	};
	$.extend(opts.cssBefore, { display: 'block', opacity: 1, top: 0, left: 0 });
};

// turnUp/Down/Left/Right
$.fn.cycle.transitions.turnUp = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,true,false);
		opts.cssBefore.top = next.cycleH;
		opts.animIn.height = next.cycleH;
		opts.animOut.width = next.cycleW;
	});
	opts.cssFirst.top = 0;
	opts.cssBefore.left = 0;
	opts.cssBefore.height = 0;
	opts.animIn.top = 0;
	opts.animOut.height = 0;
};
$.fn.cycle.transitions.turnDown = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,true,false);
		opts.animIn.height = next.cycleH;
		opts.animOut.top   = curr.cycleH;
	});
	opts.cssFirst.top = 0;
	opts.cssBefore.left = 0;
	opts.cssBefore.top = 0;
	opts.cssBefore.height = 0;
	opts.animOut.height = 0;
};
$.fn.cycle.transitions.turnLeft = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,false,true);
		opts.cssBefore.left = next.cycleW;
		opts.animIn.width = next.cycleW;
	});
	opts.cssBefore.top = 0;
	opts.cssBefore.width = 0;
	opts.animIn.left = 0;
	opts.animOut.width = 0;
};
$.fn.cycle.transitions.turnRight = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,false,true);
		opts.animIn.width = next.cycleW;
		opts.animOut.left = curr.cycleW;
	});
	$.extend(opts.cssBefore, { top: 0, left: 0, width: 0 });
	opts.animIn.left = 0;
	opts.animOut.width = 0;
};

// zoom
$.fn.cycle.transitions.zoom = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,false,false,true);
		opts.cssBefore.top = next.cycleH/2;
		opts.cssBefore.left = next.cycleW/2;
		$.extend(opts.animIn, { top: 0, left: 0, width: next.cycleW, height: next.cycleH });
		$.extend(opts.animOut, { width: 0, height: 0, top: curr.cycleH/2, left: curr.cycleW/2 });
	});
	opts.cssFirst.top = 0;
	opts.cssFirst.left = 0;
	opts.cssBefore.width = 0;
	opts.cssBefore.height = 0;
};

// fadeZoom
$.fn.cycle.transitions.fadeZoom = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,false,false);
		opts.cssBefore.left = next.cycleW/2;
		opts.cssBefore.top = next.cycleH/2;
		$.extend(opts.animIn, { top: 0, left: 0, width: next.cycleW, height: next.cycleH });
	});
	opts.cssBefore.width = 0;
	opts.cssBefore.height = 0;
	opts.animOut.opacity = 0;
};

// blindX
$.fn.cycle.transitions.blindX = function($cont, $slides, opts) {
	var w = $cont.css('overflow','hidden').width();
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts);
		opts.animIn.width = next.cycleW;
		opts.animOut.left   = curr.cycleW;
	});
	opts.cssBefore.left = w;
	opts.cssBefore.top = 0;
	opts.animIn.left = 0;
	opts.animOut.left = w;
};
// blindY
$.fn.cycle.transitions.blindY = function($cont, $slides, opts) {
	var h = $cont.css('overflow','hidden').height();
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts);
		opts.animIn.height = next.cycleH;
		opts.animOut.top   = curr.cycleH;
	});
	opts.cssBefore.top = h;
	opts.cssBefore.left = 0;
	opts.animIn.top = 0;
	opts.animOut.top = h;
};
// blindZ
$.fn.cycle.transitions.blindZ = function($cont, $slides, opts) {
	var h = $cont.css('overflow','hidden').height();
	var w = $cont.width();
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts);
		opts.animIn.height = next.cycleH;
		opts.animOut.top   = curr.cycleH;
	});
	opts.cssBefore.top = h;
	opts.cssBefore.left = w;
	opts.animIn.top = 0;
	opts.animIn.left = 0;
	opts.animOut.top = h;
	opts.animOut.left = w;
};

// growX - grow horizontally from centered 0 width
$.fn.cycle.transitions.growX = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,false,true);
		opts.cssBefore.left = this.cycleW/2;
		opts.animIn.left = 0;
		opts.animIn.width = this.cycleW;
		opts.animOut.left = 0;
	});
	opts.cssBefore.top = 0;
	opts.cssBefore.width = 0;
};
// growY - grow vertically from centered 0 height
$.fn.cycle.transitions.growY = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,true,false);
		opts.cssBefore.top = this.cycleH/2;
		opts.animIn.top = 0;
		opts.animIn.height = this.cycleH;
		opts.animOut.top = 0;
	});
	opts.cssBefore.height = 0;
	opts.cssBefore.left = 0;
};

// curtainX - squeeze in both edges horizontally
$.fn.cycle.transitions.curtainX = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,false,true,true);
		opts.cssBefore.left = next.cycleW/2;
		opts.animIn.left = 0;
		opts.animIn.width = this.cycleW;
		opts.animOut.left = curr.cycleW/2;
		opts.animOut.width = 0;
	});
	opts.cssBefore.top = 0;
	opts.cssBefore.width = 0;
};
// curtainY - squeeze in both edges vertically
$.fn.cycle.transitions.curtainY = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,true,false,true);
		opts.cssBefore.top = next.cycleH/2;
		opts.animIn.top = 0;
		opts.animIn.height = next.cycleH;
		opts.animOut.top = curr.cycleH/2;
		opts.animOut.height = 0;
	});
	opts.cssBefore.height = 0;
	opts.cssBefore.left = 0;
};

// cover - curr slide covered by next slide
$.fn.cycle.transitions.cover = function($cont, $slides, opts) {
	var d = opts.direction || 'left';
	var w = $cont.css('overflow','hidden').width();
	var h = $cont.height();
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts);
		opts.cssAfter.display = '';
		if (d == 'right')
			opts.cssBefore.left = -w;
		else if (d == 'up')
			opts.cssBefore.top = h;
		else if (d == 'down')
			opts.cssBefore.top = -h;
		else
			opts.cssBefore.left = w;
	});
	opts.animIn.left = 0;
	opts.animIn.top = 0;
	opts.cssBefore.top = 0;
	opts.cssBefore.left = 0;
};

// uncover - curr slide moves off next slide
$.fn.cycle.transitions.uncover = function($cont, $slides, opts) {
	var d = opts.direction || 'left';
	var w = $cont.css('overflow','hidden').width();
	var h = $cont.height();
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,true,true,true);
		if (d == 'right')
			opts.animOut.left = w;
		else if (d == 'up')
			opts.animOut.top = -h;
		else if (d == 'down')
			opts.animOut.top = h;
		else
			opts.animOut.left = -w;
	});
	opts.animIn.left = 0;
	opts.animIn.top = 0;
	opts.cssBefore.top = 0;
	opts.cssBefore.left = 0;
};

// toss - move top slide and fade away
$.fn.cycle.transitions.toss = function($cont, $slides, opts) {
	var w = $cont.css('overflow','visible').width();
	var h = $cont.height();
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,true,true,true);
		// provide default toss settings if animOut not provided
		if (!opts.animOut.left && !opts.animOut.top)
			$.extend(opts.animOut, { left: w*2, top: -h/2, opacity: 0 });
		else
			opts.animOut.opacity = 0;
	});
	opts.cssBefore.left = 0;
	opts.cssBefore.top = 0;
	opts.animIn.left = 0;
};

// wipe - clip animation
$.fn.cycle.transitions.wipe = function($cont, $slides, opts) {
	var w = $cont.css('overflow','hidden').width();
	var h = $cont.height();
	opts.cssBefore = opts.cssBefore || {};
	var clip;
	if (opts.clip) {
		if (/l2r/.test(opts.clip))
			clip = 'rect(0px 0px '+h+'px 0px)';
		else if (/r2l/.test(opts.clip))
			clip = 'rect(0px '+w+'px '+h+'px '+w+'px)';
		else if (/t2b/.test(opts.clip))
			clip = 'rect(0px '+w+'px 0px 0px)';
		else if (/b2t/.test(opts.clip))
			clip = 'rect('+h+'px '+w+'px '+h+'px 0px)';
		else if (/zoom/.test(opts.clip)) {
			var top = parseInt(h/2,10);
			var left = parseInt(w/2,10);
			clip = 'rect('+top+'px '+left+'px '+top+'px '+left+'px)';
		}
	}

	opts.cssBefore.clip = opts.cssBefore.clip || clip || 'rect(0px 0px 0px 0px)';

	var d = opts.cssBefore.clip.match(/(\d+)/g);
	var t = parseInt(d[0],10), r = parseInt(d[1],10), b = parseInt(d[2],10), l = parseInt(d[3],10);

	opts.before.push(function(curr, next, opts) {
		if (curr == next) return;
		var $curr = $(curr), $next = $(next);
		$.fn.cycle.commonReset(curr,next,opts,true,true,false);
		opts.cssAfter.display = 'block';

		var step = 1, count = parseInt((opts.speedIn / 13),10) - 1;
		(function f() {
			var tt = t ? t - parseInt(step * (t/count),10) : 0;
			var ll = l ? l - parseInt(step * (l/count),10) : 0;
			var bb = b < h ? b + parseInt(step * ((h-b)/count || 1),10) : h;
			var rr = r < w ? r + parseInt(step * ((w-r)/count || 1),10) : w;
			$next.css({ clip: 'rect('+tt+'px '+rr+'px '+bb+'px '+ll+'px)' });
			(step++ <= count) ? setTimeout(f, 13) : $curr.css('display', 'none');
		})();
	});
	$.extend(opts.cssBefore, { display: 'block', opacity: 1, top: 0, left: 0 });
	opts.animIn	   = { left: 0 };
	opts.animOut   = { left: 0 };
};

})(jQuery);
;
/* jshint onevar:false, loopfunc:true */
/* global jetpackSlideshowSettings, escape */

// WARNING: This file is distributed verbatim in Jetpack. @hide-in-jetpack
function JetpackSlideshow( element, transition ) {
	this.element = element;
	this.images = [];
	this.controls = {};
	this.transition = transition || 'fade';
}

JetpackSlideshow.prototype.showLoadingImage = function( toggle ) {
	if ( toggle ) {
		this.loadingImage_ = document.createElement( 'div' );
		this.loadingImage_.className = 'slideshow-loading';
		var img = document.createElement( 'img' );
		img.src = jetpackSlideshowSettings.spinner;
		this.loadingImage_.appendChild( img );
		this.loadingImage_.appendChild( this.makeZeroWidthSpan() );
		this.element.append( this.loadingImage_ );
	} else if ( this.loadingImage_ ) {
		this.loadingImage_.parentNode.removeChild( this.loadingImage_ );
		this.loadingImage_ = null;
	}
};

JetpackSlideshow.prototype.init = function() {
	this.showLoadingImage(true);

	var self = this;
	// Set up DOM.
	for ( var i = 0; i < this.images.length; i++ ) {
		var imageInfo = this.images[i];
		var img = document.createElement( 'img' );
		img.src = imageInfo.src;
		img.title = typeof( imageInfo.title ) !== 'undefined' ? imageInfo.title : '';
		img.alt = typeof( imageInfo.alt ) !== 'undefined' ? imageInfo.alt : '';
		img.align = 'middle';
		img.nopin = 'nopin';
		var caption = document.createElement( 'div' );
		caption.className = 'slideshow-slide-caption';
		caption.innerHTML = imageInfo.caption;
		var container = document.createElement('div');
		container.className = 'slideshow-slide';

		// Hide loading image once first image has loaded.
		if ( i === 0 ) {
			if ( img.complete ) {
				// IE, image in cache
				setTimeout( function() {
					self.finishInit_();
				}, 1);
			} else {
				jQuery( img ).load(function() {
					self.finishInit_();
				});
			}
		}
		container.appendChild( img );
		// I'm not sure where these were coming from, but IE adds
		// bad values for width/height for portrait-mode images
		img.removeAttribute('width');
		img.removeAttribute('height');
		container.appendChild( this.makeZeroWidthSpan() );
		container.appendChild( caption );
		this.element.append( container );
	}
};

JetpackSlideshow.prototype.makeZeroWidthSpan = function() {
	var emptySpan = document.createElement( 'span' );
	emptySpan.className = 'slideshow-line-height-hack';
	// Having a NBSP makes IE act weird during transitions, but other
	// browsers ignore a text node with a space in it as whitespace.
	if (jQuery.browser.msie) {
		emptySpan.appendChild( document.createTextNode(' ') );
	} else {
		emptySpan.innerHTML = '&nbsp;';
	}
	return emptySpan;
};

JetpackSlideshow.prototype.finishInit_ = function() {
	this.showLoadingImage( false );
	this.renderControls_();

	var self = this;
	if ( this.images.length > 1 ) {
		// Initialize Cycle instance.
		this.element.cycle( {
			fx: this.transition,
			prev: this.controls.prev,
			next: this.controls.next,
			slideExpr: '.slideshow-slide',
			onPrevNextEvent: function() {
				return self.onCyclePrevNextClick_.apply( self, arguments );
			}
		} );

		var slideshow = this.element;
		jQuery( this.controls.stop ).click( function() {
			var button = jQuery(this);
			if ( ! button.hasClass( 'paused' ) ) {
				slideshow.cycle( 'pause' );
				button.removeClass( 'running' );
				button.addClass( 'paused' );
			} else {
				button.addClass( 'running' );
				button.removeClass( 'paused' );
				slideshow.cycle( 'resume', true );
			}
			return false;
		} );
	} else {
		this.element.children( ':first' ).show();
		this.element.css( 'position', 'relative' );
	}
	this.initialized_ = true;
};

JetpackSlideshow.prototype.renderControls_ = function() {
	if ( this.controlsDiv_ ) {
		return;
	}

	var controlsDiv = document.createElement( 'div' );
	controlsDiv.className = 'slideshow-controls';

	var controls = [ 'prev', 'stop', 'next' ];
	for ( var i = 0; i < controls.length; i++ ) {
		var controlName = controls[i];
		var a = document.createElement( 'a' );
		a.href = '#';
		controlsDiv.appendChild( a );
		this.controls[controlName] = a;
	}
	this.element.append( controlsDiv );
	this.controlsDiv_ = controlsDiv;
};

JetpackSlideshow.prototype.onCyclePrevNextClick_ = function( isNext, i/*, slideElement*/ ) {
	// If blog_id not present don't track page views
	if ( ! jetpackSlideshowSettings.blog_id ) {
		return;
	}

	var postid = this.images[i].id;
	var stats = new Image();
	stats.src = document.location.protocol +
		'//pixel.wp.com/g.gif?host=' +
		escape( document.location.host ) +
		'&rand=' + Math.random() +
		'&blog=' + jetpackSlideshowSettings.blog_id +
		'&subd=' + jetpackSlideshowSettings.blog_subdomain +
		'&user_id=' + jetpackSlideshowSettings.user_id +
		'&post=' + postid +
		'&ref=' + escape( document.location );
};

( function ( $ ) {
	function jetpack_slideshow_init() {
		$( '.jetpack-slideshow-noscript' ).remove();

		$( '.jetpack-slideshow' ).each( function () {
			var container = $( this );

			if ( container.data( 'processed' ) ) {
				return;
			}

			var slideshow = new JetpackSlideshow( container, container.data( 'trans' ) );
			slideshow.images = container.data( 'gallery' );
			slideshow.init();

			container.data( 'processed', true );
		} );
	}

	$( document ).ready( jetpack_slideshow_init );
	$( 'body' ).on( 'post-load', jetpack_slideshow_init );
} )( jQuery );
;
( function( $ ) {
	var $window = $( window );

	/*
	 * Toggle slide menu
	 */
	function slideControl() {
		$( '.menu-toggle' ).on( 'click', function( e ) {
			e.preventDefault();
			$( '.slide-menu' ).toggleClass( 'expanded' ).resize();
			$( 'body' ).toggleClass( 'sidebar-open' );
			$( this ).toggleClass( 'toggle-on' );
		} );
	}

	/*
	 * Close slide menu with escape key
	 */
	$( document ).keyup( function( e ) {
		if ( e.keyCode === 27 && $( '.slide-menu' ).hasClass( 'expanded' ) ) {
			$( 'body' ).removeClass( 'sidebar-open' );
			$( '.menu-toggle' ).removeClass( 'toggle-on' );
			$( '.slide-menu' ).removeClass( 'expanded' );
		}
	} );

	/*
	 * Wrap tiled gallery
	 */
	function galleryWrapper() {
		$gallery = $( '.entry-content' ).find( '.tiled-gallery' );
		$gallery.wrap( '<div class="tiled-gallery-wrapper"></div>' );
		$gallery.resize();
	}

	/*
	 * Add extra class to large images
	 */
	function outdentImages() {
		$( '.entry-content img' ).each( function() {
			var img = $( this ),
				caption = $( this ).closest( 'figure' ),
				new_img = new Image();
	
			new_img.src = img.attr('src');
			var img_width = new_img.width;
	
			if ( img_width >= 1000 ) {
				$( this ).addClass( 'size-big' );
				$( this ).parents( 'p' ).addClass( 'size-big-wrapper' );
				if ( $.trim( $( this ).parents( 'p' ).text() ) != '' ) {
					$( this ).parents( 'p' ).contents().filter( 'a, img' ).wrap( '<span class="size-big-wrapper" />' );
					$( this ).parents( 'p' ).removeClass( 'size-big-wrapper' );
				}
			}
			if ( caption.hasClass( 'wp-caption' ) && img_width >= 1000 ) {
				$( this ).removeClass( 'size-big' );
				caption.addClass( 'caption-big' );
			}
		} );
	}

	/*
	 * Manage full-screen featured images
	 */
	function fullScreenImages() {
		var $entryBackground = $( '.entry-background' ),
			singleThumbnail = $( 'body' ).hasClass( 'single-thumbnail' );

		if ( ! singleThumbnail ) {
			return;
		}

		if ( 768 < $window.width() ) {
			$entryBackground.height( $window.height() + 'px' );
		} else {
			$entryBackground.height( 'auto' );
		}

		$( 'html, .single.single-thumbnail' ).height( 'auto' );
	}

	//After DOM is ready
	$( document ).ready( function() {
		slideControl();
		fullScreenImages();
	} );
	
	// After page loads
	$window.load( function() {
		galleryWrapper();
		outdentImages();
	} );

	// On window resize
	$window.on( 'resize', function() {
		fullScreenImages();
	});

	// After infinite scroll loads
	$window.on( 'post-load', function() {
		galleryWrapper();
		outdentImages();
	} );

} )( jQuery );
;
( function() {
	var is_webkit = navigator.userAgent.toLowerCase().indexOf( 'webkit' ) > -1,
	    is_opera  = navigator.userAgent.toLowerCase().indexOf( 'opera' )  > -1,
	    is_ie     = navigator.userAgent.toLowerCase().indexOf( 'msie' )   > -1;

	if ( ( is_webkit || is_opera || is_ie ) && document.getElementById && window.addEventListener ) {
		window.addEventListener( 'hashchange', function() {
			var element = document.getElementById( location.hash.substring( 1 ) );

			if ( element ) {
				if ( ! /^(?:a|select|input|button|textarea)$/i.test( element.tagName ) )
					element.tabIndex = -1;

				element.focus();
			}
		}, false );
	}
})();
;
/*jslint indent: 2, browser: true, bitwise: true, plusplus: true */

/*! Copyright Twitter Inc. and other contributors. Licensed under MIT *//*
https://github.com/twitter/twemoji/blob/gh-pages/LICENSE
*/

// WARNING:   this file is generated automatically via
//            `node twemoji-generator.js`
//            please update its `createTwemoji` function
//            at the bottom of the same file instead.
var twemoji = (function ( ) {
  'use strict';

  /*jshint maxparams:4 */

  var
    // the exported module object
    twemoji = {


    /////////////////////////
    //      properties     //
    /////////////////////////

      // default assets url, by default will be Twitter Inc. CDN
      base: (location.protocol === 'https:' ? 'https:' : 'http:') +
            '//twemoji.maxcdn.com/',

      // default assets file extensions, by default '.png'
      ext: '.svg',

      // default assets/folder size, by default "36x36"
      // available via Twitter CDN: 16, 36, 72
      size: 'svg',

      // basic utilities / helpers to convert code points
      // to JavaScript surrogates and vice versa
      convert: {

        /**
         * Given an HEX codepoint, returns UTF16 surrogate pairs.
         *
         * @param   string  generic codepoint, i.e. '1F4A9'
         * @return  string  codepoint transformed into utf16 surrogates pair,
         *          i.e. \uD83D\uDCA9
         *
         * @example
         *  twemoji.convert.fromCodePoint('1f1e8');
         *  // "\ud83c\udde8"
         *
         *  '1f1e8-1f1f3'.split('-').map(twemoji.convert.fromCodePoint).join('')
         *  // "\ud83c\udde8\ud83c\uddf3"
         */
        fromCodePoint: fromCodePoint,

        /**
         * Given UTF16 surrogate pairs, returns the equivalent HEX codepoint.
         *
         * @param   string  generic utf16 surrogates pair, i.e. \uD83D\uDCA9
         * @param   string  optional separator for double code points, default='-'
         * @return  string  utf16 transformed into codepoint, i.e. '1F4A9'
         *
         * @example
         *  twemoji.convert.toCodePoint('\ud83c\udde8\ud83c\uddf3');
         *  // "1f1e8-1f1f3"
         *
         *  twemoji.convert.toCodePoint('\ud83c\udde8\ud83c\uddf3', '~');
         *  // "1f1e8~1f1f3"
         */
        toCodePoint: toCodePoint
      },


    /////////////////////////
    //       methods       //
    /////////////////////////

      /**
       * User first: used to remove missing images
       * preserving the original text intent when
       * a fallback for network problems is desired.
       * Automatically added to Image nodes via DOM
       * It could be recycled for string operations via:
       *  $('img.emoji').on('error', twemoji.onerror)
       */
      onerror: function onerror() {
        if (this.parentNode) {
          this.parentNode.replaceChild(createText(this.alt), this);
        }
      },

      /**
       * Main method/logic to generate either <img> tags or HTMLImage nodes.
       *  "emojify" a generic text or DOM Element.
       *
       * @overloads
       *
       * String replacement for `innerHTML` or server side operations
       *  twemoji.parse(string);
       *  twemoji.parse(string, Function);
       *  twemoji.parse(string, Object);
       *
       * HTMLElement tree parsing for safer operations over existing DOM
       *  twemoji.parse(HTMLElement);
       *  twemoji.parse(HTMLElement, Function);
       *  twemoji.parse(HTMLElement, Object);
       *
       * @param   string|HTMLElement  the source to parse and enrich with emoji.
       *
       *          string              replace emoji matches with <img> tags.
       *                              Mainly used to inject emoji via `innerHTML`
       *                              It does **not** parse the string or validate it,
       *                              it simply replaces found emoji with a tag.
       *                              NOTE: be sure this won't affect security.
       *
       *          HTMLElement         walk through the DOM tree and find emoji
       *                              that are inside **text node only** (nodeType === 3)
       *                              Mainly used to put emoji in already generated DOM
       *                              without compromising surrounding nodes and
       *                              **avoiding** the usage of `innerHTML`.
       *                              NOTE: Using DOM elements instead of strings should
       *                              improve security without compromising too much
       *                              performance compared with a less safe `innerHTML`.
       *
       * @param   Function|Object  [optional]
       *                              either the callback that will be invoked or an object
       *                              with all properties to use per each found emoji.
       *
       *          Function            if specified, this will be invoked per each emoji
       *                              that has been found through the RegExp except
       *                              those follwed by the invariant \uFE0E ("as text").
       *                              Once invoked, parameters will be:
       *
       *                                codePoint:string  the lower case HEX code point
       *                                                  i.e. "1f4a9"
       *
       *                                options:Object    all info for this parsing operation
       *
       *                                variant:char      the optional \uFE0F ("as image")
       *                                                  variant, in case this info
       *                                                  is anyhow meaningful.
       *                                                  By default this is ignored.
       *
       *                              If such callback will return a falsy value instead
       *                              of a valid `src` to use for the image, nothing will
       *                              actually change for that specific emoji.
       *
       *
       *          Object              if specified, an object containing the following properties
       *
       *            callback   Function  the callback to invoke per each found emoji.
       *            base       string    the base url, by default twemoji.base
       *            ext        string    the image extension, by default twemoji.ext
       *            size       string    the assets size, by default twemoji.size
       *
       * @example
       *
       *  twemoji.parse("I \u2764\uFE0F emoji!");
       *  // I <img class="emoji" draggable="false" alt="❤️" src="/assets/2764.gif"> emoji!
       *
       *
       *  twemoji.parse("I \u2764\uFE0F emoji!", function(icon, options, variant) {
       *    return '/assets/' + icon + '.gif';
       *  });
       *  // I <img class="emoji" draggable="false" alt="❤️" src="/assets/2764.gif"> emoji!
       *
       *
       * twemoji.parse("I \u2764\uFE0F emoji!", {
       *   size: 72,
       *   callback: function(icon, options, variant) {
       *     return '/assets/' + options.size + '/' + icon + options.ext;
       *   }
       * });
       *  // I <img class="emoji" draggable="false" alt="❤️" src="/assets/72x72/2764.png"> emoji!
       *
       */
      parse: parse,

      /**
       * Given a string, invokes the callback argument
       *  per each emoji found in such string.
       * This is the most raw version used by
       *  the .parse(string) method itself.
       *
       * @param   string    generic string to parse
       * @param   Function  a generic callback that will be
       *                    invoked to replace the content.
       *                    This calback wil receive standard
       *                    String.prototype.replace(str, callback)
       *                    arguments such:
       *  callback(
       *    match,  // the emoji match
       *    icon,   // the emoji text (same as text)
       *    variant // either '\uFE0E' or '\uFE0F', if present
       *  );
       *
       *                    and others commonly received via replace.
       *
       *  NOTE: When the variant \uFE0E is found, remember this is an explicit intent
       *  from the user: the emoji should **not** be replaced with an image.
       *  In \uFE0F case one, it's the opposite, it should be graphic.
       *  This utility convetion is that only \uFE0E are not translated into images.
       */
      replace: replace,

      /**
       * Simplify string tests against emoji.
       *
       * @param   string  some text that might contain emoji
       * @return  boolean true if any emoji was found, false otherwise.
       *
       * @example
       *
       *  if (twemoji.test(someContent)) {
       *    console.log("emoji All The Things!");
       *  }
       */
      test: test
    },

    // RegExp based on emoji's official Unicode standards
    // http://www.unicode.org/Public/UNIDATA/EmojiSources.txt
    re = /((?:\ud83c\udde8\ud83c\uddf3|\ud83c\uddfa\ud83c\uddf8|\ud83c\uddf7\ud83c\uddfa|\ud83c\uddf0\ud83c\uddf7|\ud83c\uddef\ud83c\uddf5|\ud83c\uddee\ud83c\uddf9|\ud83c\uddec\ud83c\udde7|\ud83c\uddeb\ud83c\uddf7|\ud83c\uddea\ud83c\uddf8|\ud83c\udde9\ud83c\uddea|\u0039\u20e3|\u0038\u20e3|\u0037\u20e3|\u0036\u20e3|\u0035\u20e3|\u0034\u20e3|\u0033\u20e3|\u0032\u20e3|\u0031\u20e3|\u0030\u20e3|\u0023\u20e3|\ud83d\udeb3|\ud83d\udeb1|\ud83d\udeb0|\ud83d\udeaf|\ud83d\udeae|\ud83d\udea6|\ud83d\udea3|\ud83d\udea1|\ud83d\udea0|\ud83d\ude9f|\ud83d\ude9e|\ud83d\ude9d|\ud83d\ude9c|\ud83d\ude9b|\ud83d\ude98|\ud83d\ude96|\ud83d\ude94|\ud83d\ude90|\ud83d\ude8e|\ud83d\ude8d|\ud83d\ude8b|\ud83d\ude8a|\ud83d\ude88|\ud83d\ude86|\ud83d\ude82|\ud83d\ude81|\ud83d\ude36|\ud83d\ude34|\ud83d\ude2f|\ud83d\ude2e|\ud83d\ude2c|\ud83d\ude27|\ud83d\ude26|\ud83d\ude1f|\ud83d\ude1b|\ud83d\ude19|\ud83d\ude17|\ud83d\ude15|\ud83d\ude11|\ud83d\ude10|\ud83d\ude0e|\ud83d\ude08|\ud83d\ude07|\ud83d\ude00|\ud83d\udd67|\ud83d\udd66|\ud83d\udd65|\ud83d\udd64|\ud83d\udd63|\ud83d\udd62|\ud83d\udd61|\ud83d\udd60|\ud83d\udd5f|\ud83d\udd5e|\ud83d\udd5d|\ud83d\udd5c|\ud83d\udd2d|\ud83d\udd2c|\ud83d\udd15|\ud83d\udd09|\ud83d\udd08|\ud83d\udd07|\ud83d\udd06|\ud83d\udd05|\ud83d\udd04|\ud83d\udd02|\ud83d\udd01|\ud83d\udd00|\ud83d\udcf5|\ud83d\udcef|\ud83d\udced|\ud83d\udcec|\ud83d\udcb7|\ud83d\udcb6|\ud83d\udcad|\ud83d\udc6d|\ud83d\udc6c|\ud83d\udc65|\ud83d\udc2a|\ud83d\udc16|\ud83d\udc15|\ud83d\udc13|\ud83d\udc10|\ud83d\udc0f|\ud83d\udc0b|\ud83d\udc0a|\ud83d\udc09|\ud83d\udc08|\ud83d\udc07|\ud83d\udc06|\ud83d\udc05|\ud83d\udc04|\ud83d\udc03|\ud83d\udc02|\ud83d\udc01|\ud83d\udc00|\ud83c\udfe4|\ud83c\udfc9|\ud83c\udfc7|\ud83c\udf7c|\ud83c\udf50|\ud83c\udf4b|\ud83c\udf33|\ud83c\udf32|\ud83c\udf1e|\ud83c\udf1d|\ud83c\udf1c|\ud83c\udf1a|\ud83c\udf18|\ud83c\udccf|\ud83c\udd70|\ud83c\udd71|\ud83c\udd7e|\ud83c\udd8e|\ud83c\udd91|\ud83c\udd92|\ud83c\udd93|\ud83c\udd94|\ud83c\udd95|\ud83c\udd96|\ud83c\udd97|\ud83c\udd98|\ud83c\udd99|\ud83c\udd9a|\ud83d\ude0d|\ud83d\udec5|\ud83d\udec4|\ud83d\udec3|\ud83d\udec2|\ud83d\udec1|\ud83d\udebf|\ud83d\udeb8|\ud83d\udeb7|\ud83d\udeb5|\ud83c\ude01|\ud83c\ude02|\ud83c\ude32|\ud83c\ude33|\ud83c\ude34|\ud83c\ude35|\ud83c\ude36|\ud83c\ude37|\ud83c\ude38|\ud83c\ude39|\ud83c\ude3a|\ud83c\ude50|\ud83c\ude51|\ud83c\udf00|\ud83c\udf01|\ud83c\udf02|\ud83c\udf03|\ud83c\udf04|\ud83c\udf05|\ud83c\udf06|\ud83c\udf07|\ud83c\udf08|\ud83c\udf09|\ud83c\udf0a|\ud83c\udf0b|\ud83c\udf0c|\ud83c\udf0f|\ud83c\udf11|\ud83c\udf13|\ud83c\udf14|\ud83c\udf15|\ud83c\udf19|\ud83c\udf1b|\ud83c\udf1f|\ud83c\udf20|\ud83c\udf30|\ud83c\udf31|\ud83c\udf34|\ud83c\udf35|\ud83c\udf37|\ud83c\udf38|\ud83c\udf39|\ud83c\udf3a|\ud83c\udf3b|\ud83c\udf3c|\ud83c\udf3d|\ud83c\udf3e|\ud83c\udf3f|\ud83c\udf40|\ud83c\udf41|\ud83c\udf42|\ud83c\udf43|\ud83c\udf44|\ud83c\udf45|\ud83c\udf46|\ud83c\udf47|\ud83c\udf48|\ud83c\udf49|\ud83c\udf4a|\ud83c\udf4c|\ud83c\udf4d|\ud83c\udf4e|\ud83c\udf4f|\ud83c\udf51|\ud83c\udf52|\ud83c\udf53|\ud83c\udf54|\ud83c\udf55|\ud83c\udf56|\ud83c\udf57|\ud83c\udf58|\ud83c\udf59|\ud83c\udf5a|\ud83c\udf5b|\ud83c\udf5c|\ud83c\udf5d|\ud83c\udf5e|\ud83c\udf5f|\ud83c\udf60|\ud83c\udf61|\ud83c\udf62|\ud83c\udf63|\ud83c\udf64|\ud83c\udf65|\ud83c\udf66|\ud83c\udf67|\ud83c\udf68|\ud83c\udf69|\ud83c\udf6a|\ud83c\udf6b|\ud83c\udf6c|\ud83c\udf6d|\ud83c\udf6e|\ud83c\udf6f|\ud83c\udf70|\ud83c\udf71|\ud83c\udf72|\ud83c\udf73|\ud83c\udf74|\ud83c\udf75|\ud83c\udf76|\ud83c\udf77|\ud83c\udf78|\ud83c\udf79|\ud83c\udf7a|\ud83c\udf7b|\ud83c\udf80|\ud83c\udf81|\ud83c\udf82|\ud83c\udf83|\ud83c\udf84|\ud83c\udf85|\ud83c\udf86|\ud83c\udf87|\ud83c\udf88|\ud83c\udf89|\ud83c\udf8a|\ud83c\udf8b|\ud83c\udf8c|\ud83c\udf8d|\ud83c\udf8e|\ud83c\udf8f|\ud83c\udf90|\ud83c\udf91|\ud83c\udf92|\ud83c\udf93|\ud83c\udfa0|\ud83c\udfa1|\ud83c\udfa2|\ud83c\udfa3|\ud83c\udfa4|\ud83c\udfa5|\ud83c\udfa6|\ud83c\udfa7|\ud83c\udfa8|\ud83c\udfa9|\ud83c\udfaa|\ud83c\udfab|\ud83c\udfac|\ud83c\udfad|\ud83c\udfae|\ud83c\udfaf|\ud83c\udfb0|\ud83c\udfb1|\ud83c\udfb2|\ud83c\udfb3|\ud83c\udfb4|\ud83c\udfb5|\ud83c\udfb6|\ud83c\udfb7|\ud83c\udfb8|\ud83c\udfb9|\ud83c\udfba|\ud83c\udfbb|\ud83c\udfbc|\ud83c\udfbd|\ud83c\udfbe|\ud83c\udfbf|\ud83c\udfc0|\ud83c\udfc1|\ud83c\udfc2|\ud83c\udfc3|\ud83c\udfc4|\ud83c\udfc6|\ud83c\udfc8|\ud83c\udfca|\ud83c\udfe0|\ud83c\udfe1|\ud83c\udfe2|\ud83c\udfe3|\ud83c\udfe5|\ud83c\udfe6|\ud83c\udfe7|\ud83c\udfe8|\ud83c\udfe9|\ud83c\udfea|\ud83c\udfeb|\ud83c\udfec|\ud83c\udfed|\ud83c\udfee|\ud83c\udfef|\ud83c\udff0|\ud83d\udc0c|\ud83d\udc0d|\ud83d\udc0e|\ud83d\udc11|\ud83d\udc12|\ud83d\udc14|\ud83d\udc17|\ud83d\udc18|\ud83d\udc19|\ud83d\udc1a|\ud83d\udc1b|\ud83d\udc1c|\ud83d\udc1d|\ud83d\udc1e|\ud83d\udc1f|\ud83d\udc20|\ud83d\udc21|\ud83d\udc22|\ud83d\udc23|\ud83d\udc24|\ud83d\udc25|\ud83d\udc26|\ud83d\udc27|\ud83d\udc28|\ud83d\udc29|\ud83d\udc2b|\ud83d\udc2c|\ud83d\udc2d|\ud83d\udc2e|\ud83d\udc2f|\ud83d\udc30|\ud83d\udc31|\ud83d\udc32|\ud83d\udc33|\ud83d\udc34|\ud83d\udc35|\ud83d\udc36|\ud83d\udc37|\ud83d\udc38|\ud83d\udc39|\ud83d\udc3a|\ud83d\udc3b|\ud83d\udc3c|\ud83d\udc3d|\ud83d\udc3e|\ud83d\udc40|\ud83d\udc42|\ud83d\udc43|\ud83d\udc44|\ud83d\udc45|\ud83d\udc46|\ud83d\udc47|\ud83d\udc48|\ud83d\udc49|\ud83d\udc4a|\ud83d\udc4b|\ud83d\udc4c|\ud83d\udc4d|\ud83d\udc4e|\ud83d\udc4f|\ud83d\udc50|\ud83d\udc51|\ud83d\udc52|\ud83d\udc53|\ud83d\udc54|\ud83d\udc55|\ud83d\udc56|\ud83d\udc57|\ud83d\udc58|\ud83d\udc59|\ud83d\udc5a|\ud83d\udc5b|\ud83d\udc5c|\ud83d\udc5d|\ud83d\udc5e|\ud83d\udc5f|\ud83d\udc60|\ud83d\udc61|\ud83d\udc62|\ud83d\udc63|\ud83d\udc64|\ud83d\udc66|\ud83d\udc67|\ud83d\udc68|\ud83d\udc69|\ud83d\udc6a|\ud83d\udc6b|\ud83d\udc6e|\ud83d\udc6f|\ud83d\udc70|\ud83d\udc71|\ud83d\udc72|\ud83d\udc73|\ud83d\udc74|\ud83d\udc75|\ud83d\udc76|\ud83d\udc77|\ud83d\udc78|\ud83d\udc79|\ud83d\udc7a|\ud83d\udc7b|\ud83d\udc7c|\ud83d\udc7d|\ud83d\udc7e|\ud83d\udc7f|\ud83d\udc80|\ud83d\udc81|\ud83d\udc82|\ud83d\udc83|\ud83d\udc84|\ud83d\udc85|\ud83d\udc86|\ud83d\udc87|\ud83d\udc88|\ud83d\udc89|\ud83d\udc8a|\ud83d\udc8b|\ud83d\udc8c|\ud83d\udc8d|\ud83d\udc8e|\ud83d\udc8f|\ud83d\udc90|\ud83d\udc91|\ud83d\udc92|\ud83d\udc93|\ud83d\udc94|\ud83d\udc95|\ud83d\udc96|\ud83d\udc97|\ud83d\udc98|\ud83d\udc99|\ud83d\udc9a|\ud83d\udc9b|\ud83d\udc9c|\ud83d\udc9d|\ud83d\udc9e|\ud83d\udc9f|\ud83d\udca0|\ud83d\udca1|\ud83d\udca2|\ud83d\udca3|\ud83d\udca4|\ud83d\udca5|\ud83d\udca6|\ud83d\udca7|\ud83d\udca8|\ud83d\udca9|\ud83d\udcaa|\ud83d\udcab|\ud83d\udcac|\ud83d\udcae|\ud83d\udcaf|\ud83d\udcb0|\ud83d\udcb1|\ud83d\udcb2|\ud83d\udcb3|\ud83d\udcb4|\ud83d\udcb5|\ud83d\udcb8|\ud83d\udcb9|\ud83d\udcba|\ud83d\udcbb|\ud83d\udcbc|\ud83d\udcbd|\ud83d\udcbe|\ud83d\udcbf|\ud83d\udcc0|\ud83d\udcc1|\ud83d\udcc2|\ud83d\udcc3|\ud83d\udcc4|\ud83d\udcc5|\ud83d\udcc6|\ud83d\udcc7|\ud83d\udcc8|\ud83d\udcc9|\ud83d\udcca|\ud83d\udccb|\ud83d\udccc|\ud83d\udccd|\ud83d\udcce|\ud83d\udccf|\ud83d\udcd0|\ud83d\udcd1|\ud83d\udcd2|\ud83d\udcd3|\ud83d\udcd4|\ud83d\udcd5|\ud83d\udcd6|\ud83d\udcd7|\ud83d\udcd8|\ud83d\udcd9|\ud83d\udcda|\ud83d\udcdb|\ud83d\udcdc|\ud83d\udcdd|\ud83d\udcde|\ud83d\udcdf|\ud83d\udce0|\ud83d\udce1|\ud83d\udce2|\ud83d\udce3|\ud83d\udce4|\ud83d\udce5|\ud83d\udce6|\ud83d\udce7|\ud83d\udce8|\ud83d\udce9|\ud83d\udcea|\ud83d\udceb|\ud83d\udcee|\ud83d\udcf0|\ud83d\udcf1|\ud83d\udcf2|\ud83d\udcf3|\ud83d\udcf4|\ud83d\udcf6|\ud83d\udcf7|\ud83d\udcf9|\ud83d\udcfa|\ud83d\udcfb|\ud83d\udcfc|\ud83d\udd03|\ud83d\udd0a|\ud83d\udd0b|\ud83d\udd0c|\ud83d\udd0d|\ud83d\udd0e|\ud83d\udd0f|\ud83d\udd10|\ud83d\udd11|\ud83d\udd12|\ud83d\udd13|\ud83d\udd14|\ud83d\udd16|\ud83d\udd17|\ud83d\udd18|\ud83d\udd19|\ud83d\udd1a|\ud83d\udd1b|\ud83d\udd1c|\ud83d\udd1d|\ud83d\udd1e|\ud83d\udd1f|\ud83d\udd20|\ud83d\udd21|\ud83d\udd22|\ud83d\udd23|\ud83d\udd24|\ud83d\udd25|\ud83d\udd26|\ud83d\udd27|\ud83d\udd28|\ud83d\udd29|\ud83d\udd2a|\ud83d\udd2b|\ud83d\udd2e|\ud83d\udd2f|\ud83d\udd30|\ud83d\udd31|\ud83d\udd32|\ud83d\udd33|\ud83d\udd34|\ud83d\udd35|\ud83d\udd36|\ud83d\udd37|\ud83d\udd38|\ud83d\udd39|\ud83d\udd3a|\ud83d\udd3b|\ud83d\udd3c|\ud83d\udd3d|\ud83d\udd50|\ud83d\udd51|\ud83d\udd52|\ud83d\udd53|\ud83d\udd54|\ud83d\udd55|\ud83d\udd56|\ud83d\udd57|\ud83d\udd58|\ud83d\udd59|\ud83d\udd5a|\ud83d\udd5b|\ud83d\uddfb|\ud83d\uddfc|\ud83d\uddfd|\ud83d\uddfe|\ud83d\uddff|\ud83d\ude01|\ud83d\ude02|\ud83d\ude03|\ud83d\ude04|\ud83d\ude05|\ud83d\ude06|\ud83d\ude09|\ud83d\ude0a|\ud83d\ude0b|\ud83d\ude0c|\ud83d\udeb4|\ud83d\ude0f|\ud83d\ude12|\ud83d\ude13|\ud83d\ude14|\ud83d\ude16|\ud83d\ude18|\ud83d\ude1a|\ud83d\ude1c|\ud83d\ude1d|\ud83d\ude1e|\ud83d\ude20|\ud83d\ude21|\ud83d\ude22|\ud83d\ude23|\ud83d\ude24|\ud83d\ude25|\ud83d\ude28|\ud83d\ude29|\ud83d\ude2a|\ud83d\ude2b|\ud83d\ude2d|\ud83d\ude30|\ud83d\ude31|\ud83d\ude32|\ud83d\ude33|\ud83d\ude35|\ud83d\ude37|\ud83d\ude38|\ud83d\ude39|\ud83d\ude3a|\ud83d\ude3b|\ud83d\ude3c|\ud83d\ude3d|\ud83d\ude3e|\ud83d\ude3f|\ud83d\ude40|\ud83d\ude45|\ud83d\ude46|\ud83d\ude47|\ud83d\ude48|\ud83d\ude49|\ud83d\ude4a|\ud83d\ude4b|\ud83d\ude4c|\ud83d\ude4d|\ud83d\ude4e|\ud83d\ude4f|\ud83d\ude80|\ud83d\ude83|\ud83d\ude84|\ud83d\ude85|\ud83d\ude87|\ud83d\ude89|\ud83d\ude8c|\ud83d\ude8f|\ud83d\ude91|\ud83d\ude92|\ud83d\ude93|\ud83d\ude95|\ud83d\ude97|\ud83d\ude99|\ud83d\ude9a|\ud83d\udea2|\ud83d\udea4|\ud83d\udea5|\ud83d\udea7|\ud83d\udea8|\ud83d\udea9|\ud83d\udeaa|\ud83d\udeab|\ud83d\udeac|\ud83d\udead|\ud83d\udeb2|\ud83d\udeb6|\ud83d\udeb9|\ud83d\udeba|\ud83d\udebb|\ud83d\udebc|\ud83d\udebd|\ud83d\udebe|\ud83d\udec0|\ud83c\udde6|\ud83c\udde7|\ud83c\udde8|\ud83c\udde9|\ud83c\uddea|\ud83c\uddeb|\ud83c\uddec|\ud83c\udded|\ud83c\uddee|\ud83c\uddef|\ud83c\uddf0|\ud83c\uddf1|\ud83c\uddf2|\ud83c\uddf3|\ud83c\uddf4|\ud83c\uddf5|\ud83c\uddf6|\ud83c\uddf7|\ud83c\uddf8|\ud83c\uddf9|\ud83c\uddfa|\ud83c\uddfb|\ud83c\uddfc|\ud83c\uddfd|\ud83c\uddfe|\ud83c\uddff|\ud83c\udf0d|\ud83c\udf0e|\ud83c\udf10|\ud83c\udf12|\ud83c\udf16|\ud83c\udf17|\ud83c\udf18|\ud83c\udf1a|\ud83c\udf1c|\ud83c\udf1d|\ud83c\udf1e|\ud83c\udf32|\ud83c\udf33|\ud83c\udf4b|\ud83c\udf50|\ud83c\udf7c|\ud83c\udfc7|\ud83c\udfc9|\ud83c\udfe4|\ud83d\udc00|\ud83d\udc01|\ud83d\udc02|\ud83d\udc03|\ud83d\udc04|\ud83d\udc05|\ud83d\udc06|\ud83d\udc07|\ud83d\udc08|\ud83d\udc09|\ud83d\udc0a|\ud83d\udc0b|\ud83d\udc0f|\ud83d\udc10|\ud83d\udc13|\ud83d\udc15|\ud83d\udc16|\ud83d\udc2a|\ud83d\udc65|\ud83d\udc6c|\ud83d\udc6d|\ud83d\udcad|\ud83d\udcb6|\ud83d\udcb7|\ud83d\udcec|\ud83d\udced|\ud83d\udcef|\ud83d\udcf5|\ud83d\udd00|\ud83d\udd01|\ud83d\udd02|\ud83d\udd04|\ud83d\udd05|\ud83d\udd06|\ud83d\udd07|\ud83d\udd08|\ud83d\udd09|\ud83d\udd15|\ud83d\udd2c|\ud83d\udd2d|\ud83d\udd5c|\ud83d\udd5d|\ud83d\udd5e|\ud83d\udd5f|\ud83d\udd60|\ud83d\udd61|\ud83d\udd62|\ud83d\udd63|\ud83d\udd64|\ud83d\udd65|\ud83d\udd66|\ud83d\udd67|\ud83d\ude00|\ud83d\ude07|\ud83d\ude08|\ud83d\ude0e|\ud83d\ude10|\ud83d\ude11|\ud83d\ude15|\ud83d\ude17|\ud83d\ude19|\ud83d\ude1b|\ud83d\ude1f|\ud83d\ude26|\ud83d\ude27|\ud83d\ude2c|\ud83d\ude2e|\ud83d\ude2f|\ud83d\ude34|\ud83d\ude36|\ud83d\ude81|\ud83d\ude82|\ud83d\ude86|\ud83d\ude88|\ud83d\ude8a|\ud83d\ude8b|\ud83d\ude8d|\ud83d\ude8e|\ud83d\ude90|\ud83d\ude94|\ud83d\ude96|\ud83d\ude98|\ud83d\ude9b|\ud83d\ude9c|\ud83d\ude9d|\ud83d\ude9e|\ud83d\ude9f|\ud83d\udea0|\ud83d\udea1|\ud83d\udea3|\ud83d\udea6|\ud83d\udeae|\ud83d\udeaf|\ud83d\udeb0|\ud83d\udeb1|\ud83d\udeb3|\ud83d\udeb4|\ud83d\udeb5|\ud83d\udeb7|\ud83d\udeb8|\ud83d\udebf|\ud83d\udec1|\ud83d\udec2|\ud83d\udec3|\ud83d\udec4|\ud83d\udec5|\ud83c\udf17|\ud83c\udf16|\ud83c\udde6|\ud83c\udde7|\ud83c\udde8|\ud83c\udde9|\ud83c\uddea|\ud83c\uddeb|\ud83c\uddec|\ud83c\udded|\ud83c\uddee|\ud83c\uddef|\ud83c\uddf0|\ud83c\uddf1|\ud83c\uddf2|\ud83c\uddf3|\ud83c\uddf4|\ud83c\uddf5|\ud83c\uddf6|\ud83c\uddf7|\ud83c\uddf8|\ud83c\uddf9|\ud83c\uddfa|\ud83c\uddfb|\ud83c\uddfc|\ud83c\uddfd|\ud83c\uddfe|\ud83c\uddff|\ud83c\udf0d|\ud83c\udf0e|\ud83c\udf10|\ud83c\udf12|\ud83c\udf16|\ud83c\udf17|\ud83c\udf18|\ud83c\udf1a|\ud83c\udf1c|\ud83c\udf1d|\ud83c\udf1e|\ud83c\udf32|\ud83c\udf33|\ud83c\udf4b|\ud83c\udf50|\ud83c\udf7c|\ud83c\udfc7|\ud83c\udfc9|\ud83c\udfe4|\ud83d\udc00|\ud83d\udc01|\ud83d\udc02|\ud83d\udc03|\ud83d\udc04|\ud83d\udc05|\ud83d\udc06|\ud83d\udc07|\ud83d\udc08|\ud83d\udc09|\ud83d\udc0a|\ud83d\udc0b|\ud83d\udc0f|\ud83d\udc10|\ud83d\udc13|\ud83d\udc15|\ud83d\udc16|\ud83d\udc2a|\ud83d\udc65|\ud83d\udc6c|\ud83d\udc6d|\ud83d\udcad|\ud83d\udcb6|\ud83d\udcb7|\ud83d\udcec|\ud83d\udced|\ud83d\udcef|\ud83d\udcf5|\ud83d\udd00|\ud83d\udd01|\ud83d\udd02|\ud83d\udd04|\ud83d\udd05|\ud83d\udd06|\ud83d\udd07|\ud83d\udd08|\ud83d\udd09|\ud83d\udd15|\ud83d\udd2c|\ud83d\udd2d|\ud83d\udd5c|\ud83d\udd5d|\ud83d\udd5e|\ud83d\udd5f|\ud83d\udd60|\ud83d\udd61|\ud83d\udd62|\ud83d\udd63|\ud83d\udd64|\ud83d\udd65|\ud83d\udd66|\ud83d\udd67|\ud83d\ude00|\ud83d\ude07|\ud83d\ude08|\ud83d\ude0e|\ud83d\ude10|\ud83d\ude11|\ud83d\ude15|\ud83d\ude17|\ud83d\ude19|\ud83d\ude1b|\ud83d\ude1f|\ud83d\ude26|\ud83d\ude27|\ud83d\ude2c|\ud83d\ude2e|\ud83d\ude2f|\ud83d\ude34|\ud83d\ude36|\ud83d\ude81|\ud83d\ude82|\ud83d\ude86|\ud83d\ude88|\ud83d\ude8a|\ud83d\ude8b|\ud83d\ude8d|\ud83d\ude8e|\ud83d\ude90|\ud83d\ude94|\ud83d\ude96|\ud83d\ude98|\ud83d\ude9b|\ud83d\ude9c|\ud83d\ude9d|\ud83d\ude9e|\ud83d\ude9f|\ud83d\udea0|\ud83d\udea1|\ud83d\udea3|\ud83d\udea6|\ud83d\udeae|\ud83d\udeaf|\ud83d\udeb0|\ud83d\udeb1|\ud83d\udeb3|\ud83d\udeb4|\ud83d\udeb5|\ud83d\udeb7|\ud83d\udeb8|\ud83d\udebf|\ud83d\udec1|\ud83d\udec2|\ud83d\udec3|\ud83d\udec4|\ud83d\udec5|\ud83c\udf12|\ud83c\udf10|\ud83c\udde6|\ud83c\udde7|\ud83c\udde8|\ud83c\udde9|\ud83c\uddea|\ud83c\uddeb|\ud83c\uddec|\ud83c\udded|\ud83c\uddee|\ud83c\uddef|\ud83c\uddf0|\ud83c\uddf1|\ud83c\uddf2|\ud83c\uddf3|\ud83c\uddf4|\ud83c\uddf5|\ud83c\uddf6|\ud83c\uddf7|\ud83c\uddf8|\ud83c\uddf9|\ud83c\uddfa|\ud83c\uddfb|\ud83c\uddfc|\ud83c\uddfd|\ud83c\uddfe|\ud83c\uddff|\ud83c\udf0d|\ud83c\udf0e|\ue50a|\ue50a|\ue50a|\u27bf|\u3030|\u27b0|\u2797|\u2796|\u2795|\u2755|\u2754|\u2753|\u274e|\u274c|\u2728|\u270b|\u270a|\u2705|\u26ce|\u27bf|\u23f3|\u23f0|\u23ec|\u23eb|\u23ea|\u23e9|\u2122|\u27bf|\u00a9|\u00ae)|(?:(?:\ud83c\udc04|\ud83c\udd7f|\ud83c\ude1a|\ud83c\ude2f|\u3299|\u3297|\u303d|\u2b55|\u2b50|\u2b1c|\u2b1b|\u2b07|\u2b06|\u2b05|\u2935|\u2934|\u27a1|\u2764|\u2757|\u2747|\u2744|\u2734|\u2733|\u2716|\u2714|\u2712|\u270f|\u270c|\u2709|\u2708|\u2702|\u26fd|\u26fa|\u26f5|\u26f3|\u26f2|\u26ea|\u26d4|\u26c5|\u26c4|\u26be|\u26bd|\u26ab|\u26aa|\u26a1|\u26a0|\u2693|\u267b|\u2668|\u2666|\u2665|\u2663|\u2660|\u2653|\u2652|\u2651|\u2650|\u264f|\u264e|\u264d|\u264c|\u264b|\u264a|\u2649|\u2648|\u263a|\u261d|\u2615|\u2614|\u2611|\u260e|\u2601|\u2600|\u25fe|\u25fd|\u25fc|\u25fb|\u25c0|\u25b6|\u25ab|\u25aa|\u24c2|\u231b|\u231a|\u21aa|\u21a9|\u2199|\u2198|\u2197|\u2196|\u2195|\u2194|\u2139|\u2049|\u203c|\u267f)([\uFE0E\uFE0F]?)))/g,

    // nodes with type 1 which should **not** be parsed
    shouldntBeParsed = /IFRAME|NOFRAMES|NOSCRIPT|SCRIPT|STYLE/,

    // just a private shortcut
    fromCharCode = String.fromCharCode;

  return twemoji;


  /////////////////////////
  //  private functions  //
  //     declaration     //
  /////////////////////////

  /**
   * Shortcut to create text nodes
   * @param   string  text used to create DOM text node
   * @return  Node  a DOM node with that text
   */
  function createText(text) {
    return document.createTextNode(text);
  }

  /**
   * Default callback used to generate emoji src
   *  based on Twitter CDN
   * @param   string    the emoji codepoint string
   * @param   string    the default size to use, i.e. "36x36"
   * @param   string    optional "\uFE0F" variant char, ignored by default
   * @return  string    the image source to use
   */
  function defaultImageSrcGenerator(icon, options) {
    return ''.concat(options.base, options.size, '/', icon, options.ext);
  }

  /**
   * Given a generic DOM nodeType 1, walk through all children
   * and store every nodeType 3 (#text) found in the tree.
   * @param   Element a DOM Element with probably some text in it
   * @param   Array the list of previously discovered text nodes
   * @return  Array same list with new discovered nodes, if any
   */
  function grabAllTextNodes(node, allText) {
    var
      childNodes = node.childNodes,
      length = childNodes.length,
      subnode,
      nodeType;
    while (length--) {
      subnode = childNodes[length];
      nodeType = subnode.nodeType;
      // parse emoji only in text nodes
      if (nodeType === 3) {
        // collect them to process emoji later
        allText.push(subnode);
      }
      // ignore all nodes that are not type 1 or that
      // should not be parsed as script, style, and others
      else if (nodeType === 1 && !shouldntBeParsed.test(subnode.nodeName)) {
        grabAllTextNodes(subnode, allText);
      }
    }
    return allText;
  }

  /**
   * Used to both remove the possible variant
   *  and to convert utf16 into code points
   * @param   string    the emoji surrogate pair
   * @param   string    the optional variant char, if any
   */
  function grabTheRightIcon(icon, variant) {
    // if variant is present as \uFE0F
    return toCodePoint(
      variant === '\uFE0F' ?
        // the icon should not contain it
        icon.slice(0, -1) :
        icon
    );
  }

  /**
   * DOM version of the same logic / parser:
   *  emojify all found sub-text nodes placing images node instead.
   * @param   Element   generic DOM node with some text in some child node
   * @param   Object    options  containing info about how to parse
    *
    *            .callback   Function  the callback to invoke per each found emoji.
    *            .base       string    the base url, by default twemoji.base
    *            .ext        string    the image extension, by default twemoji.ext
    *            .size       string    the assets size, by default twemoji.size
    *
   * @return  Element same generic node with emoji in place, if any.
   */
  function parseNode(node, options) {
    var
      allText = grabAllTextNodes(node, []),
      length = allText.length,
      fragment,
      subnode,
      text,
      match,
      i,
      index,
      img,
      alt,
      icon,
      variant,
      src;
    while (length--) {
      fragment = document.createDocumentFragment();
      subnode = allText[length];
      text = subnode.nodeValue;
      i = 0;
      while ((match = re.exec(text))) {
        index = match.index;
        if (index !== i) {
          fragment.appendChild(
            createText(text.slice(i, index))
          );
        }
        alt = match[0];
        icon = match[1];
        variant = match[2];
        i = index + alt.length;
        if (variant !== '\uFE0E') {
          src = options.callback(
            grabTheRightIcon(icon, variant),
            options,
            variant
          );
          if (src) {
            img = new Image();
            img.onerror = twemoji.onerror;
            img.className = 'emoji';
            img.setAttribute('draggable', 'false');
            img.alt = alt;
            img.src = src;
          }
        }
        fragment.appendChild(img || createText(alt));
        img = null;
      }
      // is there actually anything to replace in here ?
      if (0 < i) {
        // any text left to be added ?
        if (i < text.length) {
          fragment.appendChild(
            createText(text.slice(i))
          );
        }
        // replace the text node only, leave intact
        // anything else surrounding such text
        subnode.parentNode.replaceChild(fragment, subnode);
      }
    }
    return node;
  }

  /**
   * String/HTML version of the same logic / parser:
   *  emojify a generic text placing images tags instead of surrogates pair.
   * @param   string    generic string with possibly some emoji in it
   * @param   Object    options  containing info about how to parse
   *
   *            .callback   Function  the callback to invoke per each found emoji.
   *            .base       string    the base url, by default twemoji.base
   *            .ext        string    the image extension, by default twemoji.ext
   *            .size       string    the assets size, by default twemoji.size
   *
   * @return  the string with <img tags> replacing all found and parsed emoji
   */
  function parseString(str, options) {
    return replace(str, function (match, icon, variant) {
      var src;
      // verify the variant is not the FE0E one
      // this variant means "emoji as text" and should not
      // require any action/replacement
      // http://unicode.org/Public/UNIDATA/StandardizedVariants.html
      if (variant !== '\uFE0E') {
        src = options.callback(
          grabTheRightIcon(icon, variant),
          options,
          variant
        );
        if (src) {
          // recycle the match string replacing the emoji
          // with its image counter part
          match = '<img '.concat(
            'class="emoji" ',
            'draggable="false" ',
            // needs to preserve user original intent
            // when variants should be copied and pasted too
            'alt="',
            match,
            '" ',
            'src="',
            src,
            '"',
            '>'
          );
        }
      }
      return match;
    });
  }

  /**
   * Given a generic value, creates its squared counterpart if it's a number.
   *  As example, number 36 will return '36x36'.
   * @param   any     a generic value.
   * @return  any     a string representing asset size, i.e. "36x36"
   *                  only in case the value was a number.
   *                  Returns initial value otherwise.
   */
  function toSizeSquaredAsset(value) {
    return typeof value === 'number' ?
      value + 'x' + value :
      value;
  }


  /////////////////////////
  //  exported functions //
  //     declaration     //
  /////////////////////////

  function fromCodePoint(codepoint) {
    var code = typeof codepoint === 'string' ?
          parseInt(codepoint, 16) : codepoint;
    if (code < 0x10000) {
      return fromCharCode(code);
    }
    code -= 0x10000;
    return fromCharCode(
      0xD800 + (code >> 10),
      0xDC00 + (code & 0x3FF)
    );
  }

  function parse(what, how) {
    if (!how || typeof how === 'function') {
      how = {callback: how};
    }
    // if first argument is string, inject html <img> tags
    // otherwise use the DOM tree and parse text nodes only
    return (typeof what === 'string' ? parseString : parseNode)(what, {
      callback: how.callback || defaultImageSrcGenerator,
      base:     typeof how.base === 'string' ? how.base : twemoji.base,
      ext:      how.ext || twemoji.ext,
      size:     "svg" // toSizeSquaredAsset(how.size || twemoji.size)
    });
  }

  function replace(text, callback) {
    return String(text).replace(re, callback);
  }

  function test(text) {
    // IE6 needs a reset before too
    re.lastIndex = 0;
    var result = re.test(text);
    re.lastIndex = 0;
    return result;
  }

  function toCodePoint(unicodeSurrogates, sep) {
    var
      r = [],
      c = 0,
      p = 0,
      i = 0;
    while (i < unicodeSurrogates.length) {
      c = unicodeSurrogates.charCodeAt(i++);
      if (p) {
        r.push((0x10000 + ((p - 0xD800) << 10) + (c - 0xDC00)).toString(16));
        p = 0;
      } else if (0xD800 <= c && c <= 0xDBFF) {
        p = c;
      } else {
        r.push(c.toString(16));
      }
    }
    return r.join(sep || '-');
  }

}());

;
var JetpackEmoji = {
		EMOJI_SIZE: 72,
		BASE_URL: '//s0.wp.com/wp-content/mu-plugins/emoji/twemoji/',

        parse: function( element, size, base_url ) {
            twemoji.parse( element, {
                size: size || this.EMOJI_SIZE,
				base: base_url || this.BASE_URL,
				callback: function(icon, options, variant) {
					// Ignore some standard characters that TinyMCE recommends in its character map.
					// https://teamtinker.wordpress.com/2014/10/29/emoji-launch-week/#comment-2103
					switch ( icon ) {
						case 'a9':
						case 'ae':
						case '2122':
						case '2194':
						case '2660':
						case '2663':
						case '2665':
						case '2666':
							return false;
					}
				
					// directly from twemoji
					return ''.concat(options.base, options.size, '/', icon, options.ext);
				}
            } );
        }
}
;
(function() {
    var emoji = {	
        init: function() {
			if ( typeof JetpackEmoji === 'undefined' ) {
				console.error( 'JetpackEmoji not found.' );
				return;
			}

			var size, base_url;
			if ( typeof JetpackEmojiSettings !== 'undefined' ) {
				size = JetpackEmojiSettings.size || null;
				base_url = JetpackEmojiSettings.base_url || null;
			}	

            JetpackEmoji.parse( document.body, size, base_url );

            if ( typeof infiniteScroll !== 'undefined' ) {
                jQuery( document.body ).on( 'post-load', function( response ) {
                    // TODO: ideally, we should only target the newly added elements
                    JetpackEmoji.parse( document.body, size, base_url );
                } );
            }
        }
    };

    if ( window.addEventListener ) {
        window.addEventListener( 'load', emoji.init, false );
    } else if ( window.attachEvent ) {
        window.attachEvent( 'onload', emoji.init );
    }
})();
;
/*	SWFObject v2.2 <http://code.google.com/p/swfobject/> 
	is released under the MIT License <http://www.opensource.org/licenses/mit-license.php> 
*/
var swfobject=function(){var D="undefined",r="object",S="Shockwave Flash",W="ShockwaveFlash.ShockwaveFlash",q="application/x-shockwave-flash",R="SWFObjectExprInst",x="onreadystatechange",O=window,j=document,t=navigator,T=false,U=[h],o=[],N=[],I=[],l,Q,E,B,J=false,a=false,n,G,m=true,M=function(){var aa=typeof j.getElementById!=D&&typeof j.getElementsByTagName!=D&&typeof j.createElement!=D,ah=t.userAgent.toLowerCase(),Y=t.platform.toLowerCase(),ae=Y?/win/.test(Y):/win/.test(ah),ac=Y?/mac/.test(Y):/mac/.test(ah),af=/webkit/.test(ah)?parseFloat(ah.replace(/^.*webkit\/(\d+(\.\d+)?).*$/,"$1")):false,X=!+"\v1",ag=[0,0,0],ab=null;if(typeof t.plugins!=D&&typeof t.plugins[S]==r){ab=t.plugins[S].description;if(ab&&!(typeof t.mimeTypes!=D&&t.mimeTypes[q]&&!t.mimeTypes[q].enabledPlugin)){T=true;X=false;ab=ab.replace(/^.*\s+(\S+\s+\S+$)/,"$1");ag[0]=parseInt(ab.replace(/^(.*)\..*$/,"$1"),10);ag[1]=parseInt(ab.replace(/^.*\.(.*)\s.*$/,"$1"),10);ag[2]=/[a-zA-Z]/.test(ab)?parseInt(ab.replace(/^.*[a-zA-Z]+(.*)$/,"$1"),10):0}}else{if(typeof O.ActiveXObject!=D){try{var ad=new ActiveXObject(W);if(ad){ab=ad.GetVariable("$version");if(ab){X=true;ab=ab.split(" ")[1].split(",");ag=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}}catch(Z){}}}return{w3:aa,pv:ag,wk:af,ie:X,win:ae,mac:ac}}(),k=function(){if(!M.w3){return}if((typeof j.readyState!=D&&j.readyState=="complete")||(typeof j.readyState==D&&(j.getElementsByTagName("body")[0]||j.body))){f()}if(!J){if(typeof j.addEventListener!=D){j.addEventListener("DOMContentLoaded",f,false)}if(M.ie&&M.win){j.attachEvent(x,function(){if(j.readyState=="complete"){j.detachEvent(x,arguments.callee);f()}});if(O==top){(function(){if(J){return}try{j.documentElement.doScroll("left")}catch(X){setTimeout(arguments.callee,0);return}f()})()}}if(M.wk){(function(){if(J){return}if(!/loaded|complete/.test(j.readyState)){setTimeout(arguments.callee,0);return}f()})()}s(f)}}();function f(){if(J){return}try{var Z=j.getElementsByTagName("body")[0].appendChild(C("span"));Z.parentNode.removeChild(Z)}catch(aa){return}J=true;var X=U.length;for(var Y=0;Y<X;Y++){U[Y]()}}function K(X){if(J){X()}else{U[U.length]=X}}function s(Y){if(typeof O.addEventListener!=D){O.addEventListener("load",Y,false)}else{if(typeof j.addEventListener!=D){j.addEventListener("load",Y,false)}else{if(typeof O.attachEvent!=D){i(O,"onload",Y)}else{if(typeof O.onload=="function"){var X=O.onload;O.onload=function(){X();Y()}}else{O.onload=Y}}}}}function h(){if(T){V()}else{H()}}function V(){var X=j.getElementsByTagName("body")[0];var aa=C(r);aa.setAttribute("type",q);var Z=X.appendChild(aa);if(Z){var Y=0;(function(){if(typeof Z.GetVariable!=D){var ab=Z.GetVariable("$version");if(ab){ab=ab.split(" ")[1].split(",");M.pv=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}else{if(Y<10){Y++;setTimeout(arguments.callee,10);return}}X.removeChild(aa);Z=null;H()})()}else{H()}}function H(){var ag=o.length;if(ag>0){for(var af=0;af<ag;af++){var Y=o[af].id;var ab=o[af].callbackFn;var aa={success:false,id:Y};if(M.pv[0]>0){var ae=c(Y);if(ae){if(F(o[af].swfVersion)&&!(M.wk&&M.wk<312)){w(Y,true);if(ab){aa.success=true;aa.ref=z(Y);ab(aa)}}else{if(o[af].expressInstall&&A()){var ai={};ai.data=o[af].expressInstall;ai.width=ae.getAttribute("width")||"0";ai.height=ae.getAttribute("height")||"0";if(ae.getAttribute("class")){ai.styleclass=ae.getAttribute("class")}if(ae.getAttribute("align")){ai.align=ae.getAttribute("align")}var ah={};var X=ae.getElementsByTagName("param");var ac=X.length;for(var ad=0;ad<ac;ad++){if(X[ad].getAttribute("name").toLowerCase()!="movie"){ah[X[ad].getAttribute("name")]=X[ad].getAttribute("value")}}P(ai,ah,Y,ab)}else{p(ae);if(ab){ab(aa)}}}}}else{w(Y,true);if(ab){var Z=z(Y);if(Z&&typeof Z.SetVariable!=D){aa.success=true;aa.ref=Z}ab(aa)}}}}}function z(aa){var X=null;var Y=c(aa);if(Y&&Y.nodeName=="OBJECT"){if(typeof Y.SetVariable!=D){X=Y}else{var Z=Y.getElementsByTagName(r)[0];if(Z){X=Z}}}return X}function A(){return !a&&F("6.0.65")&&(M.win||M.mac)&&!(M.wk&&M.wk<312)}function P(aa,ab,X,Z){a=true;E=Z||null;B={success:false,id:X};var ae=c(X);if(ae){if(ae.nodeName=="OBJECT"){l=g(ae);Q=null}else{l=ae;Q=X}aa.id=R;if(typeof aa.width==D||(!/%$/.test(aa.width)&&parseInt(aa.width,10)<310)){aa.width="310"}if(typeof aa.height==D||(!/%$/.test(aa.height)&&parseInt(aa.height,10)<137)){aa.height="137"}j.title=j.title.slice(0,47)+" - Flash Player Installation";var ad=M.ie&&M.win?"ActiveX":"PlugIn",ac="MMredirectURL="+encodeURI(O.location).toString().replace(/&/g,"%26")+"&MMplayerType="+ad+"&MMdoctitle="+j.title;if(typeof ab.flashvars!=D){ab.flashvars+="&"+ac}else{ab.flashvars=ac}if(M.ie&&M.win&&ae.readyState!=4){var Y=C("div");X+="SWFObjectNew";Y.setAttribute("id",X);ae.parentNode.insertBefore(Y,ae);ae.style.display="none";(function(){if(ae.readyState==4){ae.parentNode.removeChild(ae)}else{setTimeout(arguments.callee,10)}})()}u(aa,ab,X)}}function p(Y){if(M.ie&&M.win&&Y.readyState!=4){var X=C("div");Y.parentNode.insertBefore(X,Y);X.parentNode.replaceChild(g(Y),X);Y.style.display="none";(function(){if(Y.readyState==4){Y.parentNode.removeChild(Y)}else{setTimeout(arguments.callee,10)}})()}else{Y.parentNode.replaceChild(g(Y),Y)}}function g(ab){var aa=C("div");if(M.win&&M.ie){aa.innerHTML=ab.innerHTML}else{var Y=ab.getElementsByTagName(r)[0];if(Y){var ad=Y.childNodes;if(ad){var X=ad.length;for(var Z=0;Z<X;Z++){if(!(ad[Z].nodeType==1&&ad[Z].nodeName=="PARAM")&&!(ad[Z].nodeType==8)){aa.appendChild(ad[Z].cloneNode(true))}}}}}return aa}function u(ai,ag,Y){var X,aa=c(Y);if(M.wk&&M.wk<312){return X}if(aa){if(typeof ai.id==D){ai.id=Y}if(M.ie&&M.win){var ah="";for(var ae in ai){if(ai[ae]!=Object.prototype[ae]){if(ae.toLowerCase()=="data"){ag.movie=ai[ae]}else{if(ae.toLowerCase()=="styleclass"){ah+=' class="'+ai[ae]+'"'}else{if(ae.toLowerCase()!="classid"){ah+=" "+ae+'="'+ai[ae]+'"'}}}}}var af="";for(var ad in ag){if(ag[ad]!=Object.prototype[ad]){af+='<param name="'+ad+'" value="'+ag[ad]+'" />'}}aa.outerHTML='<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"'+ah+">"+af+"</object>";N[N.length]=ai.id;X=c(ai.id)}else{var Z=C(r);Z.setAttribute("type",q);for(var ac in ai){if(ai[ac]!=Object.prototype[ac]){if(ac.toLowerCase()=="styleclass"){Z.setAttribute("class",ai[ac])}else{if(ac.toLowerCase()!="classid"){Z.setAttribute(ac,ai[ac])}}}}for(var ab in ag){if(ag[ab]!=Object.prototype[ab]&&ab.toLowerCase()!="movie"){e(Z,ab,ag[ab])}}aa.parentNode.replaceChild(Z,aa);X=Z}}return X}function e(Z,X,Y){var aa=C("param");aa.setAttribute("name",X);aa.setAttribute("value",Y);Z.appendChild(aa)}function y(Y){var X=c(Y);if(X&&X.nodeName=="OBJECT"){if(M.ie&&M.win){X.style.display="none";(function(){if(X.readyState==4){b(Y)}else{setTimeout(arguments.callee,10)}})()}else{X.parentNode.removeChild(X)}}}function b(Z){var Y=c(Z);if(Y){for(var X in Y){if(typeof Y[X]=="function"){Y[X]=null}}Y.parentNode.removeChild(Y)}}function c(Z){var X=null;try{X=j.getElementById(Z)}catch(Y){}return X}function C(X){return j.createElement(X)}function i(Z,X,Y){Z.attachEvent(X,Y);I[I.length]=[Z,X,Y]}function F(Z){var Y=M.pv,X=Z.split(".");X[0]=parseInt(X[0],10);X[1]=parseInt(X[1],10)||0;X[2]=parseInt(X[2],10)||0;return(Y[0]>X[0]||(Y[0]==X[0]&&Y[1]>X[1])||(Y[0]==X[0]&&Y[1]==X[1]&&Y[2]>=X[2]))?true:false}function v(ac,Y,ad,ab){if(M.ie&&M.mac){return}var aa=j.getElementsByTagName("head")[0];if(!aa){return}var X=(ad&&typeof ad=="string")?ad:"screen";if(ab){n=null;G=null}if(!n||G!=X){var Z=C("style");Z.setAttribute("type","text/css");Z.setAttribute("media",X);n=aa.appendChild(Z);if(M.ie&&M.win&&typeof j.styleSheets!=D&&j.styleSheets.length>0){n=j.styleSheets[j.styleSheets.length-1]}G=X}if(M.ie&&M.win){if(n&&typeof n.addRule==r){n.addRule(ac,Y)}}else{if(n&&typeof j.createTextNode!=D){n.appendChild(j.createTextNode(ac+" {"+Y+"}"))}}}function w(Z,X){if(!m){return}var Y=X?"visible":"hidden";if(J&&c(Z)){c(Z).style.visibility=Y}else{v("#"+Z,"visibility:"+Y)}}function L(Y){var Z=/[\\\"<>\.;]/;var X=Z.exec(Y)!=null;return X&&typeof encodeURIComponent!=D?encodeURIComponent(Y):Y}var d=function(){if(M.ie&&M.win){window.attachEvent("onunload",function(){var ac=I.length;for(var ab=0;ab<ac;ab++){I[ab][0].detachEvent(I[ab][1],I[ab][2])}var Z=N.length;for(var aa=0;aa<Z;aa++){y(N[aa])}for(var Y in M){M[Y]=null}M=null;for(var X in swfobject){swfobject[X]=null}swfobject=null})}}();return{registerObject:function(ab,X,aa,Z){if(M.w3&&ab&&X){var Y={};Y.id=ab;Y.swfVersion=X;Y.expressInstall=aa;Y.callbackFn=Z;o[o.length]=Y;w(ab,false)}else{if(Z){Z({success:false,id:ab})}}},getObjectById:function(X){if(M.w3){return z(X)}},embedSWF:function(ab,ah,ae,ag,Y,aa,Z,ad,af,ac){var X={success:false,id:ah};if(M.w3&&!(M.wk&&M.wk<312)&&ab&&ah&&ae&&ag&&Y){w(ah,false);K(function(){ae+="";ag+="";var aj={};if(af&&typeof af===r){for(var al in af){aj[al]=af[al]}}aj.data=ab;aj.width=ae;aj.height=ag;var am={};if(ad&&typeof ad===r){for(var ak in ad){am[ak]=ad[ak]}}if(Z&&typeof Z===r){for(var ai in Z){if(typeof am.flashvars!=D){am.flashvars+="&"+ai+"="+Z[ai]}else{am.flashvars=ai+"="+Z[ai]}}}if(F(Y)){var an=u(aj,am,ah);if(aj.id==ah){w(ah,true)}X.success=true;X.ref=an}else{if(aa&&A()){aj.data=aa;P(aj,am,ah,ac);return}else{w(ah,true)}}if(ac){ac(X)}})}else{if(ac){ac(X)}}},switchOffAutoHideShow:function(){m=false},ua:M,getFlashPlayerVersion:function(){return{major:M.pv[0],minor:M.pv[1],release:M.pv[2]}},hasFlashPlayerVersion:F,createSWF:function(Z,Y,X){if(M.w3){return u(Z,Y,X)}else{return undefined}},showExpressInstall:function(Z,aa,X,Y){if(M.w3&&A()){P(Z,aa,X,Y)}},removeSWF:function(X){if(M.w3){y(X)}},createCSS:function(aa,Z,Y,X){if(M.w3){v(aa,Z,Y,X)}},addDomLoadEvent:K,addLoadEvent:s,getQueryParamValue:function(aa){var Z=j.location.search||j.location.hash;if(Z){if(/\?/.test(Z)){Z=Z.split("?")[1]}if(aa==null){return L(Z)}var Y=Z.split("&");for(var X=0;X<Y.length;X++){if(Y[X].substring(0,Y[X].indexOf("="))==aa){return L(Y[X].substring((Y[X].indexOf("=")+1)))}}}return""},expressInstallCallback:function(){if(a){var X=c(R);if(X&&l){X.parentNode.replaceChild(l,X);if(Q){w(Q,true);if(M.ie&&M.win){l.style.display="block"}}if(E){E(B)}}a=false}}}}();;
/*!
 * VideoPress JavaScript Loader 1.09
 *
 * Copyright 2011 Automattic Inc.
 * Licensed under GNU General Public License (GPL) Version 2 or later
 * http://www.gnu.org/licenses/gpl-2.0.html
 */

// jQuery.type() was introduced in 1.4.3, WP 3.0 has 1.4.2 
// To maintain backwards compatibility, insert our own version if it doesn't exist 
if ( typeof jQuery.type != 'function' ) { 
	jQuery.extend({
		class2type: {},
	
		type: function( obj ) { 
	 		return obj == null ? 
	 	    	String( obj ) : 
	 	    	jQuery.class2type[ toString.call(obj) ] || "object"; 
		}
	});
	
	jQuery.each("Boolean Number String Function Array Date RegExp Object".split(" "), function(i, name) { 
	 	jQuery.class2type[ "[object " + name + "]" ] = name.toLowerCase(); 
	}); 
	
} 

jQuery.extend({VideoPress: {
	error:{
		messages:{
			age:"You are of insufficient age to view this video.",
			error:"Unable to download and play video",
			flash:"Error loading Flash on your system",
			freedom:'You do not have sufficient <a href="http://www.gnu.org/philosophy/free-sw.html">Freedom levels</a> to view this video.',
			incompatible:'VideoPress requires either HTML5 video or <a href="http://www.adobe.com/go/getflashplayer">Adobe Flash Player 10</a> or above for playback.',
			incapable:"Your device is incapable of playing the requested video.",
			network:"A network error prevented video download and playback"
		}
	},
	support:{
		flash: function() {
			if ( typeof swfobject !== "undefined" && swfobject.hasFlashPlayerVersion( jQuery.VideoPress.video.flash.min_version ) ) {
				return true;
			} else {
				return false;
			}
		},
		html5Video: function(sourcetype) {
			var v = document.createElement("video");
			if ( !!v.canPlayType ) {
				if ( jQuery.type(sourcetype)==="string" ) {
					return !!v.canPlayType(sourcetype).replace(/no/,"");
				}
				return true;
			} else {
				return false;
			}
		}
	},
	data:[],
	analytics:{
		wpcom:{
			base_uri:"//pixel.wp.com/v.gif?",
			params:function(guid, filetype) {
				var data = jQuery.VideoPress.data[guid];
				if ( !jQuery.isPlainObject(data) ) {
					return;
				}

				var params = {blog:data.blog,post:data.post,page_url:top.document.URL};
				if ( filetype==="mp4" && data.mp4 && data.mp4.size ) {
					params.video_fmt = "fmt_" + data.mp4.size;
				} else {
					params.video_fmt = "fmt_std";
				}
				return params;
			},
			send:function(params) {
				var beacon = new Image();
				beacon.src = jQuery.VideoPress.analytics.wpcom.base_uri + jQuery.param(params);
				beacon=null;
			}
		},
		ga:{
			is_active:function(){
				if ( (typeof _gaq !== "undefined") && jQuery.type( _gaq )==="array" ) {
					return true;
				} else {
					return false;
				}
			}
		},
		/*comscore:{
			is_active()function(){
				if ( typeof COMSCORE !== "undefined" )
					return true;
			}
		}*/
		impression:function(guid) {
			var params = jQuery.VideoPress.analytics.wpcom.params( guid, "mp4" );
			if ( !jQuery.isPlainObject( params ) ) {
				return;
			}
			params.video_impression = 1;
			jQuery.VideoPress.analytics.wpcom.send( params );
		},
		played:function(guid, filetype) {
			var params = jQuery.VideoPress.analytics.wpcom.params( guid, filetype );
			if ( !jQuery.isPlainObject( params ) ) {
				return;
			}
			params.video_play = 1;
			jQuery.VideoPress.analytics.wpcom.send( params );

			if ( jQuery.VideoPress.analytics.ga.is_active() ) {
				/* Google Analytics tracks unique events per visit.
				 * Unique video value omitted since two videos on the same page that are both played would only be recorded as one play event.
				 */
				_gaq.push( ["_trackEvent", "Videos", "Play" ] );
			}
		},
		watched:function( guid, filetype, current_time, initial_time ) {
			if ( jQuery.VideoPress.data[guid].playback === undefined ) {
				var start = 0;
				if ( initial_time !== undefined && jQuery.type(initial_time)==="number" && initial_time > 0 ) {
					if ( current_time > initial_time ) {
						start = current_time - initial_time;
					}
				}
				jQuery.VideoPress.data[guid].playback = { last_observed:current_time, time_elapsed:start };
			}
			var time_watched = current_time - jQuery.VideoPress.data[guid].playback.last_observed;
			if ( time_watched > 0 ) {
				jQuery.VideoPress.data[guid].playback.time_elapsed += time_watched;
				jQuery.VideoPress.data[guid].playback.last_observed = current_time;
				if ( jQuery.VideoPress.data[guid].playback.time_elapsed > 15 ) {
					var params = jQuery.VideoPress.analytics.wpcom.params( guid, filetype );
					if ( !jQuery.isPlainObject( params ) ) {
			  			return;
					}
					params.t = 15;
					jQuery.VideoPress.analytics.wpcom.send( params );
					jQuery.VideoPress.data[guid].playback.time_elapsed -= 15;
				} else if ( current_time === jQuery.VideoPress.data[guid].duration ) {
					jQuery.VideoPress.analytics.wpcom.send( params );
					jQuery.VideoPress.data[guid].playback.time_elapsed = 0;
					delete jQuery.VideoPress.data[guid].playback;
				}
			}
		}
	},
	requirements:{
		isSufficientAge: function( container_el, min_age ) {
			var birthday = new Date( parseInt( jQuery( "select[name=year]", container_el ).val() ), parseInt( jQuery( "select[name=month]", container_el ).val() ), parseInt( jQuery( "select[name=day]", container_el ).val() ) );
			var allowed_age = new Date( Date.now() - (1000*60*60*24*365*min_age) );
			if ( birthday > allowed_age ) {
				container_el.html( '<p class="error" style="color:#fff;font-weight:bold">' + jQuery.VideoPress.error.messages.age + "</p>");
			} else {
				jQuery.VideoPress.video.play(container_el);
			}
		},
		allowedDomain: function (allowed_domains) {
			if ( jQuery.type(allowed_domains)==="array" ) {
				if ( jQuery.inArray( top.document.location.hostname, allowed_domains )===-1 ) {
					return false;
				}
			}
			return true;
		}
	},
	video:{
		flash:{
			// Protocol and domain for player_uri and expressinstall set in video.play()
			player_uri: ( 'https:' == location.protocol ? 'https://v0.wordpress.com' : 'http://s0.videopress.com' ) + "/player.swf?v=1.04",
			min_version:"10.0.0",
			params:{wmode:"direct",quality:"autohigh",seamlesstabbing:"true",allowfullscreen:"true",allowscriptaccess:"always",overstretch:"true"},
			expressinstall: ( 'https:' == location.protocol ? 'https://v0.wordpress.com' : 'http://s0.videopress.com' ) + "/playerProductInstall.swf",
			embedCallback: function(event) {
				if ( event.success===false ) {
					jQuery("#" + event.id).html("<p>" + jQuery.VideoPress.error.messages.flash + "</p>");
				}
			}
		},
		types:{mp4:'video/mp4; codecs="avc1.64001E, mp4a.40.2"',ogv:'video/ogg; codecs="theora, vorbis"'},
		canPlay:function () {
			if ( jQuery.VideoPress.support.flash() ) {
				jQuery.VideoPress.video.playerSupport = "flash";
			} else if ( jQuery.VideoPress.support.html5Video() ) {
				if ( jQuery.VideoPress.support.html5Video( jQuery.VideoPress.video.types.mp4 ) ) {
					jQuery.VideoPress.video.playerSupport = "mp4";
				} else if ( jQuery.VideoPress.support.html5Video( jQuery.VideoPress.video.types.ogv ) ) {
					jQuery.VideoPress.video.playerSupport = "ogv";
				} else {
					jQuery.VideoPress.video.playerSupport = "html5";
				}
			} else {
				jQuery.VideoPress.video.playerSupport = "";
			}
		},
		prepare: function ( guid, config, count ) {
			var video = jQuery.VideoPress.data[guid][count];
			if ( config.container === undefined || jQuery.type(video)!=="object" ) {
				return;
			}
			
			var width = 0;
			if ( config.width !== undefined ) {
				width = config.width;
			} else {
				config.container.width();
			}


			var height = 0;
			if ( config.height !== undefined ) {
				height = config.height;
			} else {
				config.container.height();
			}
			
			var div_id = "#v-" + guid + '-' + count;
			
			var parent_width = jQuery( div_id ).parent().width();
			var diffw = 0;
			var diffh = 0;
			var ratio = 0;
			if ( width > parent_width ) {
				diffw = width - parent_width + 11;
				ratio = ( width * 1.0 ) / ( height * 1.0 );
				diffh = diffw / ratio;
				
				width -= diffw;
				height -= Math.round( diffh );
			}
			
			if ( width < 60 || height < 60 ) {
				width = 400;
				height = 300;
			}
			
			jQuery.VideoPress.data[guid][count].dimensions = {};
			
			if( 0 == ratio ) {
				jQuery.VideoPress.data[guid][count].dimensions.width = width;
				jQuery.VideoPress.data[guid][count].dimensions.height = height;
			}
			else {
				jQuery.VideoPress.data[guid][count].dimensions.width = width - 7;
				jQuery.VideoPress.data[guid][count].dimensions.height = height - Math.round( 7 / ratio );
				
				jQuery( div_id ).width( width );
				jQuery( div_id ).height( height + 50 );
	
				jQuery( div_id + "-placeholder" ).width( jQuery.VideoPress.data[guid][count].dimensions.width );
				jQuery( div_id + "-placeholder" ).height( jQuery.VideoPress.data[guid][count].dimensions.height );
	
				jQuery( div_id + "-placeholder img.videopress-poster" ).width( jQuery.VideoPress.data[guid][count].dimensions.width );
				jQuery( div_id + "-placeholder img.videopress-poster" ).height( jQuery.VideoPress.data[guid][count].dimensions.height );
			}

			config.container.data( "guid", guid );
			config.container.data( "count", count );
			if ( jQuery.VideoPress.video.playerSupport === undefined ) {
				jQuery.VideoPress.video.canPlay();
			}

			if ( config.freedom===true && jQuery.type(video.ogv)==="string" ) {
				jQuery.VideoPress.video.insert( config.container, guid, count, video, "ogv", jQuery.VideoPress.data[guid][count].dimensions.width, jQuery.VideoPress.data[guid].dimensions.height );
				config.container.data( "player", "ogv" );
			} else if ( jQuery.VideoPress.video.playerSupport === "flash" ) {
				config.container.data( "player", "flash" );
				config.container.append( '<div id="v-' + guid + "-" + count + '-video">' );
			} else if ( jQuery.inArray( jQuery.VideoPress.video.playerSupport, ["html5","mp4","ogv"] ) && ( jQuery.type(video.mp4.uri)==="string" || jQuery.type(video.ogv.uri)==="string" ) ) {
				var load_type = "html5";
				if ( jQuery.VideoPress.video.playerSupport==="mp4" && video.mp4!==undefined && jQuery.type(video.mp4.uri)==="string" ) {
					load_type = "mp4";
				} else if ( jQuery.VideoPress.video.playerSupport==="ogv" && video.ogv!==undefined && jQuery.type(video.ogv.uri)==="string" ) {
					load_type = "ogv";
				}
				jQuery.VideoPress.video.insert( config.container, guid, count, video, load_type, jQuery.VideoPress.data[guid][count].dimensions.width, jQuery.VideoPress.data[guid][count].dimensions.height );
				config.container.data( "player", load_type );
				load_type=null;
			} else {
				config.container.html('<p class="videopress-error">' + jQuery.VideoPress.error.messages.incompatible + '</p>');
				return false;
			}
			return true;
		},
		insert: function( container_el, guid, count, video_data, video_type, width, height ) {
			var video_id = "v-" + guid + "-" + count + "-video";
			var video_el = jQuery("<video />");
			video_el.attr( "id", video_id );
			video_el.attr( "width", width );
			video_el.attr( "height", height );
			video_el.attr( "poster", video_data.poster );
			if ( video_type==="ogv" ) {
				video_el.attr( "preload", "metadata" );
			} else {
				video_el.attr( "preload", "none" );
			}
			video_el.attr( "controls", "true" );
			video_el.attr( "x-webkit-airplay", "allow" );
			if ( video_type==="mp4" && video_data.mp4!==undefined && jQuery.type(video_data.mp4.uri)==="string" ) {
				video_el.attr( "src", video_data.mp4.uri );
			} else if ( video_type==="ogv" && video_data.ogv!==undefined && jQuery.type(video_data.ogv.uri)==="string" ) {
				video_el.attr( "src", video_data.ogv.uri );
			} else {
				// Purposely omit source type attribute since the browser does not seem to support specifics such as canPlayType
				if ( video_data.mp4!==undefined && jQuery.type(video_data.mp4.uri)==="string" ) {
					video_el.append( '<source src="' + video_data.mp4.uri + '" />' );
				}
				if ( video_data.ogv!==undefined && jQuery.type(video_data.ogv.uri)==="string" ) {
					video_el.append( '<source src="' + video_data.ogv.uri + '" />' );
				}
			}
			
			if ( video_data.tracks !== undefined ) {
				video_el.append( video_data.tracks );
			}
			video_el.append( '<p class="videopress-error">' + jQuery.VideoPress.error.messages.incompatible + "</p>" );
			video_el.hide();
			container_el.append( video_el );
			video_el=null;
			video_id=null;
		},
		play: function( container_el ) {
			var player = container_el.data( "player" );
			if ( player===undefined ) {
				player="flash";
			}

			var guid = container_el.data( "guid" );
			var count = container_el.data( "count" );

			if ( player === "flash" ) {
				jQuery( "#" + container_el.attr("id") + "-placeholder", container_el ).remove();

				var player_uri = jQuery.VideoPress.video.flash.player_uri;
				var expressinstall = jQuery.VideoPress.video.flash.expressinstall;

				swfobject.embedSWF( player_uri, "v-" + guid + "-" + count + "-video", jQuery.VideoPress.data[guid][count].dimensions.width, jQuery.VideoPress.data[guid][count].dimensions.height, jQuery.VideoPress.video.flash.min_version, expressinstall, {guid:guid,autoPlay:"true",isDynamicSeeking:"true",hd:jQuery.VideoPress.data[guid][count].hd}, jQuery.VideoPress.video.flash.params, null, jQuery.VideoPress.video.flash.embedCallback );
			} else if ( jQuery.inArray( player, ["html5", "mp4", "ogv"] ) ) {
				var video_el = jQuery("video", container_el);
				if ( video_el ) {
					jQuery( "#" + container_el.attr("id") + "-placeholder", container_el ).remove();
					if ( player==="html5" ) {
						player = "mp4";
					}
					jQuery.VideoPress.video.playHTML5( video_el, guid, player );
				}
			} else {
				jQuery( "#" + container_el.attr("id") + "-placeholder", container_el ).remove();
				container_el.append( '<p class="videopress-error">Unable to play video. No suitable player.</p>' );
			}

			var play_event = new CustomEvent( 'videopress_play_video', { 'detail': { 'video_id': guid } } );
			window.dispatchEvent( play_event );
		},
		playHTML5: function( video_el, guid, filetype ) {
			video_el.show();
			video_el[0].load();

			/* It seems load() sometimes does not work, but play() will trigger load.
			 * Tried attaching play() to a data event but data might not load
			 * So we trigger play() even if there is not enough data loaded to begin playback
			 */
			video_el[0].play();
			jQuery.VideoPress.analytics.played(guid, filetype);
			video_el.bind( "error stalled", function(e) {
				var message = jQuery.VideoPress.error.messages.error;
				try {
					// provide a more detailed error message if a failure reason is communicated
					switch (e.target.error.code) {
						case e.target.error.MEDIA_ERR_NETWORK:
							message = jQuery.VideoPress.error.messages.network;
							break;
						case e.target.error.MEDIA_ERR_DECODE:
						case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
							message = jQuery.VideoPress.error.messages.incapable + " " + filetype.toUpperCase() + ".";
							break;
						default:
							break;
					}
				} catch( err ){}
				// provide an opportunity to silence an error with an empty string
				if ( message.length > 0 ) {
					video_el.html( '<p class="videopress-error">' + message + "</p>" );
				}
				message=null;
			} );
			video_el.bind( "durationchange", {guid:guid}, function( event ) {
				var duration = jQuery(event.target).attr("duration");
				if ( jQuery.type(duration)==="number" ) {
					jQuery.VideoPress.data[event.data.guid].duration = duration;
				}
				duration=null;
			} );

			/* Only record stats after video data has loaded
			 * If html5 video seems to work but we could not match on a specific codec descriptor then there may be multiple source elements. Browser chooses a source at runtime in source order. We check the loaded video filetype instead of assuming MP4.
			 */
			video_el.one( "loadeddata", {guid:guid, filetype:filetype}, function( event ){
				var filetype = event.data.filetype;
				var loaded_file = jQuery(event.target).attr("currentSrc");
				if ( jQuery.type(loaded_file)==="string" && loaded_file.length > 3 ) {
					var ext = loaded_file.substr( loaded_file.lastIndexOf(".") + 1 ).toLowerCase();
					if ( jQuery.inArray( ext, ["mp4","ogv"] ) ) {
						filetype = ext;
					}
					ext=null;
				}
				video_el.bind( "play", {guid:event.data.guid,filetype:filetype}, function( event ) {
					jQuery.VideoPress.analytics.played(event.data.guid, event.data.filetype);
				} );
				video_el.bind( "timeupdate", {guid:event.data.guid,filetype:filetype}, function( event ) {
					var target = jQuery(event.target);
					jQuery.VideoPress.analytics.watched( event.data.guid, event.data.filetype, target.attr("currentTime"), target.attr("initialTime") );
					target=null;
				} );
				video_el.bind( "ended", {guid:event.data.guid,filetype:filetype}, function( event ) {
					jQuery.VideoPress.analytics.watched( event.data.guid, event.data.filetype, jQuery.VideoPress.data[guid].duration, jQuery(event.target).attr("initialTime") );
				} );
			} );
		}
	}
}});
;
/* jshint sub: true, onevar: false, multistr: true, devel: true, smarttabs: true */
/* global jetpackCarouselStrings, DocumentTouch, jetpackLikesWidgetQueue */

// @start-hide-in-jetpack
if (typeof wpcom === 'undefined') {
	var wpcom = {};
}
wpcom.carousel = (function(/*$*/) {
	var prebuilt_widths = jetpackCarouselStrings.widths;
	var pageviews_stats_args = jetpackCarouselStrings.stats_query_args;

	var findFirstLargeEnoughWidth = function(original_w, original_h, dest_w, dest_h) {
		var inverse_ratio = original_h / original_w;

		for ( var i = 0; i < prebuilt_widths.length; ++i ) {
			if ( prebuilt_widths[i] >= dest_w || prebuilt_widths[i] * inverse_ratio >= dest_h ) {
				return prebuilt_widths[i];
			}
		}

		return original_w;
	};

	var addWidthToImageURL = function(url, width) {
		width = parseInt(width, 10);
		// Give devices with a higher devicePixelRatio higher-res images (Retina display = 2, Android phones = 1.5, etc)
		if ('undefined' !== typeof window.devicePixelRatio && window.devicePixelRatio > 1) {
			width = Math.round( width * window.devicePixelRatio );
		}
		url = addArgToURL(url, 'w', width);
		url = addArgToURL(url, 'h', '');
		return url;
	};

	var addArgToURL = function(url, arg, value) {
		var re = new RegExp(arg+'=[^?&]+');
		if ( url.match(re) ) {
			return url.replace(re, arg + '=' + value);
		} else {
			var divider = url.indexOf('?') !== -1 ? '&' : '?';
			return url + divider + arg + '=' + value;
		}
	};

	var stat = function ( names ) {
		if ( typeof names !== 'string' ) {
			names = names.join( ',' );
		}

		new Image().src = window.location.protocol +
			'//pixel.wp.com/g.gif?v=wpcom-no-pv' +
			'&x_carousel=' + names +
			'&baba=' + Math.random();
	};

	var pageview = function ( post_id ) {
		new Image().src = window.location.protocol +
			'//pixel.wp.com/g.gif?host=' + encodeURIComponent( window.location.host ) +
			'&ref=' + encodeURIComponent( document.referrer ) +
			'&rand=' + Math.random() +
			'&' + pageviews_stats_args +
			'&post=' + encodeURIComponent( post_id );
	};


	return {
		findFirstLargeEnoughWidth: findFirstLargeEnoughWidth,
		addWidthToImageURL: addWidthToImageURL,
		stat: stat,
		pageview: pageview
	};

})(jQuery);
// @end-hide-in-jetpack

jQuery(document).ready(function($) {

	// gallery faded layer and container elements
	var overlay, comments, gallery, container, nextButton, previousButton, info, transitionBegin,
	caption, resizeTimeout, photo_info, close_hint, commentInterval, lastSelectedSlide,
	screenPadding = 110, originalOverflow = $('body').css('overflow'), originalHOverflow = $('html').css('overflow'), proportion = 85,
	last_known_location_hash = '', imageMeta, titleAndDescription, commentForm, leftColWrapper;

	if ( window.innerWidth <= 760 ) {
		screenPadding = Math.round( ( window.innerWidth / 760 ) * 110 );

		if ( screenPadding < 40 && ( ( 'ontouchstart' in window ) || window.DocumentTouch && document instanceof DocumentTouch ) ) {
			screenPadding = 0;
		}
	}

	var keyListener = function(e){
		switch(e.which){
			case 38: // up
				e.preventDefault();
				container.scrollTop(container.scrollTop() - 100);
				break;
			case 40: // down
				e.preventDefault();
				container.scrollTop(container.scrollTop() + 100);
				break;
			case 39: // right
				e.preventDefault();
				gallery.jp_carousel('clearCommentTextAreaValue');
				gallery.jp_carousel('next');
				break;
			case 37: // left
			case 8: // backspace
				e.preventDefault();
				gallery.jp_carousel('clearCommentTextAreaValue');
				gallery.jp_carousel('previous');
				break;
			case 27: // escape
				e.preventDefault();
				gallery.jp_carousel('clearCommentTextAreaValue');
				container.jp_carousel('close');
				break;
			default:
				// making jslint happy
				break;
		}
	};

	var resizeListener = function(/*e*/){
		clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(function(){
			gallery
				.jp_carousel('slides')
				.jp_carousel('fitSlide', true);
			gallery.jp_carousel('updateSlidePositions', true);
			gallery.jp_carousel('fitMeta', true);
		}, 200);
	};

	var prepareGallery = function( /*dataCarouselExtra*/ ){
		if (!overlay) {
			overlay = $('<div></div>')
				.addClass('jp-carousel-overlay')
				.css({
					'position' : 'absolute',
					'top'      : 0,
					'right'    : 0,
					'bottom'   : 0,
					'left'     : 0
				});

			var buttons  = '<a class="jp-carousel-commentlink" href="#">' + jetpackCarouselStrings.comment + '</a>';
			if ( 1 === Number( jetpackCarouselStrings.is_logged_in ) ) {
// @start-hide-in-jetpack
				if ( 1 === Number( jetpackCarouselStrings.is_public ) ) {
					buttons += '<a class="jp-carousel-reblog" href="#">' + jetpackCarouselStrings.reblog + '</a>';
				}
// @end-hide-in-jetpack
			}

			buttons  = $('<div class="jp-carousel-buttons">' + buttons + '</div>');

			caption    = $('<h2></h2>');
			photo_info = $('<div class="jp-carousel-photo-info"></div>').append(caption);

			imageMeta = $('<div></div>')
				.addClass('jp-carousel-image-meta')
				.css({
					'float'      : 'right',
					'margin-top' : '20px',
					'width'      :  '250px'
				});

			imageMeta
				.append( buttons )
				.append( '<ul class=\'jp-carousel-image-exif\' style=\'display:none;\'></ul>' )
				.append( '<a class=\'jp-carousel-image-download\' style=\'display:none;\'></a>' )
				.append( '<div class=\'jp-carousel-image-map\' style=\'display:none;\'></div>' );

			titleAndDescription = $('<div></div>')
				.addClass('jp-carousel-titleanddesc')
				.css({
					'width'      : '100%',
					'margin-top' : imageMeta.css('margin-top')
				});

			var commentFormMarkup = '<div id="jp-carousel-comment-form-container">';

			if ( jetpackCarouselStrings.local_comments_commenting_as && jetpackCarouselStrings.local_comments_commenting_as.length ) {
				// Jetpack comments not enabled, fallback to local comments

				if ( 1 !== Number( jetpackCarouselStrings.is_logged_in ) && 1 === Number( jetpackCarouselStrings.comment_registration ) ) {
					commentFormMarkup += '<div id="jp-carousel-comment-form-commenting-as">' + jetpackCarouselStrings.local_comments_commenting_as + '</div>';
				} else {
					commentFormMarkup += '<form id="jp-carousel-comment-form">';
					commentFormMarkup += '<textarea name="comment" class="jp-carousel-comment-form-field jp-carousel-comment-form-textarea" id="jp-carousel-comment-form-comment-field" placeholder="' + jetpackCarouselStrings.write_comment + '"></textarea>';
					commentFormMarkup += '<div id="jp-carousel-comment-form-submit-and-info-wrapper">';
					commentFormMarkup += '<div id="jp-carousel-comment-form-commenting-as">' + jetpackCarouselStrings.local_comments_commenting_as + '</div>';
					commentFormMarkup += '<input type="submit" name="submit" class="jp-carousel-comment-form-button" id="jp-carousel-comment-form-button-submit" value="'+jetpackCarouselStrings.post_comment+'" />';
					commentFormMarkup += '<span id="jp-carousel-comment-form-spinner">&nbsp;</span>';
					commentFormMarkup += '<div id="jp-carousel-comment-post-results"></div>';
					commentFormMarkup += '</div>';
					commentFormMarkup += '</form>';
				}
			}
			commentFormMarkup += '</div>';

			commentForm = $(commentFormMarkup)
				.css({
					'width'      : '100%',
					'margin-top' : '20px',
					'color'      : '#999'
				});

			comments = $('<div></div>')
				.addClass('jp-carousel-comments')
				.css({
					'width'      : '100%',
					'bottom'     : '10px',
					'margin-top' : '20px'
				});

			var commentsLoading = $('<div id="jp-carousel-comments-loading"><span>'+jetpackCarouselStrings.loading_comments+'</span></div>')
				.css({
					'width'      : '100%',
					'bottom'     : '10px',
					'margin-top' : '20px'
				});

			var leftWidth = ( $(window).width() - ( screenPadding * 2 ) ) - (imageMeta.width() + 40);
			leftWidth += 'px';

			leftColWrapper = $('<div></div>')
				.addClass('jp-carousel-left-column-wrapper')
				.css({
					'width' : Math.floor( leftWidth )
				})
				.append(titleAndDescription)
				.append(commentForm)
				.append(comments)
				.append(commentsLoading);

			var fadeaway = $('<div></div>')
				.addClass('jp-carousel-fadeaway');

			info = $('<div></div>')
				.addClass('jp-carousel-info')
				.css({
					'top'   : Math.floor( ($(window).height() / 100) * proportion ),
					'left'  : screenPadding,
					'right' : screenPadding
				})
				.append(photo_info)
				.append(imageMeta);

			if ( window.innerWidth <= 760 ) {
				photo_info.remove().insertAfter( titleAndDescription );
				info.prepend( leftColWrapper );
			}
			else {
				info.append( leftColWrapper );
			}

			var targetBottomPos = ( $(window).height() - parseInt( info.css('top'), 10 ) ) + 'px';

			nextButton = $('<div><span></span></div>')
				.addClass('jp-carousel-next-button')
				.css({
					'right'    : '15px'
				});

			previousButton = $('<div><span></span></div>')
				.addClass('jp-carousel-previous-button')
				.css({
					'left'     : 0
				});

			nextButton.add( previousButton ).css( {
				'position' : 'fixed',
				'top' : '40px',
				'bottom' : targetBottomPos,
				'width' : screenPadding
			} );

			gallery = $('<div></div>')
				.addClass('jp-carousel')
				.css({
					'position' : 'absolute',
					'top'      : 0,
					'bottom'   : targetBottomPos,
					'left'     : 0,
					'right'    : 0
				});

			close_hint = $('<div class="jp-carousel-close-hint"><span>&times;</span></div>')
				.css({
					position : 'fixed'
				});

			container = $('<div></div>')
				.addClass('jp-carousel-wrap')
				.addClass( 'jp-carousel-transitions' );

			if ( 'white' === jetpackCarouselStrings.background_color ) {
				 container.addClass('jp-carousel-light');
			}

			container.css({
					'position'   : 'fixed',
					'top'        : 0,
					'right'      : 0,
					'bottom'     : 0,
					'left'       : 0,
					'z-index'    : 2147483647,
					'overflow-x' : 'hidden',
					'overflow-y' : 'auto',
					'direction'  : 'ltr'
				})
				.hide()
				.append(overlay)
				.append(gallery)
				.append(fadeaway)
				.append(info)
				.append(nextButton)
				.append(previousButton)
				.append(close_hint)
				.appendTo($('body'))
				.click(function(e){
					var target = $(e.target), wrap = target.parents('div.jp-carousel-wrap'), data = wrap.data('carousel-extra'),
						slide = wrap.find('div.selected'), attachment_id = slide.data('attachment-id');
					data = data || [];

					if ( target.is(gallery) || target.parents().add(target).is(close_hint) ) {
						container.jp_carousel('close');
// @start-hide-in-jetpack
					} else if ( target.hasClass('jp-carousel-reblog') ) {
						e.preventDefault();
						e.stopPropagation();
						if ( !target.hasClass('reblogged') ) {
							target.jp_carousel('show_reblog_box');
							wpcom.carousel.stat('reblog_show_box');
						}
					} else if ( target.parents('#carousel-reblog-box').length ) {
						if ( target.is('a.cancel') ) {
							e.preventDefault();
							e.stopPropagation();
							target.jp_carousel('hide_reblog_box');
							wpcom.carousel.stat('reblog_cancel');
						} else if ( target.is( 'input[type="submit"]' ) ) {
							e.preventDefault();
							e.stopPropagation();

							var note = $('#carousel-reblog-box textarea').val();
							if ( jetpackCarouselStrings.reblog_add_thoughts === note ) {
								note = '';
							}

							$('#carousel-reblog-submit').val( jetpackCarouselStrings.reblogging );
							$('#carousel-reblog-submit').prop('disabled', true);
							$( '#carousel-reblog-box div.submit span.canceltext' ).spin( 'small' );

							$.post( jetpackCarouselStrings.ajaxurl, {
								'action': 'post_reblog',
								'reblog_source': 'carousel',
								'original_blog_id': $('#carousel-reblog-box input#carousel-reblog-blog-id').val(),
								'original_post_id': $('.jp-carousel div.selected').data('attachment-id'),
								'blog_id': $('#carousel-reblog-box select').val(),
								'blog_url': $('#carousel-reblog-box input#carousel-reblog-blog-url').val(),
								'blog_title': $('#carousel-reblog-box input#carousel-reblog-blog-title').val(),
								'post_url': $('#carousel-reblog-box input#carousel-reblog-post-url').val(),
								'post_title': slide.data( 'caption' ) || $('#carousel-reblog-box input#carousel-reblog-post-title').val(),
								'note': note,
								'_wpnonce': $('#carousel-reblog-box #_wpnonce').val()
							},
							function(/*result*/) {
								$('#carousel-reblog-box').css({ 'height': $('#carousel-reblog-box').height() + 'px' }).slideUp('fast');
								$('a.jp-carousel-reblog').html( jetpackCarouselStrings.reblogged ).removeClass( 'reblog' ).addClass( 'reblogged' );
								$( '#carousel-reblog-box div.submit span.canceltext' ).spin( false );
								$('#carousel-reblog-submit').val( jetpackCarouselStrings.post_reblog );
								$('div.jp-carousel-info').children().not('#carousel-reblog-box').fadeIn('fast');
								slide.data('reblogged', 1);
								$('div.gallery').find('img[data-attachment-id="' + slide.data('attachment-id') + '"]').data('reblogged', 1);


							}, 'json' );
							wpcom.carousel.stat('reblog_submit');
						}
					} else if ( target.hasClass( 'jp-carousel-image-download' ) ) {
						wpcom.carousel.stat( 'download_original_click' );
// @end-hide-in-jetpack
					} else if ( target.hasClass('jp-carousel-commentlink') ) {
						e.preventDefault();
						e.stopPropagation();
						$(window).unbind('keydown', keyListener);
						container.animate({scrollTop: parseInt(info.position()['top'], 10)}, 'fast');
						$('#jp-carousel-comment-form-submit-and-info-wrapper').slideDown('fast');
						$('#jp-carousel-comment-form-comment-field').focus();
					} else if ( target.hasClass('jp-carousel-comment-login') ) {
						var url = jetpackCarouselStrings.login_url + '%23jp-carousel-' + attachment_id;

						window.location.href = url;
					} else if ( target.parents('#jp-carousel-comment-form-container').length ) {
						var textarea = $('#jp-carousel-comment-form-comment-field')
							.blur(function(){
								$(window).bind('keydown', keyListener);
							})
							.focus(function(){
								$(window).unbind('keydown', keyListener);
							});

						var emailField = $('#jp-carousel-comment-form-email-field')
							.blur(function(){
								$(window).bind('keydown', keyListener);
							})
							.focus(function(){
								$(window).unbind('keydown', keyListener);
							});

						var authorField = $('#jp-carousel-comment-form-author-field')
							.blur(function(){
								$(window).bind('keydown', keyListener);
							})
							.focus(function(){
								$(window).unbind('keydown', keyListener);
							});

						var urlField = $('#jp-carousel-comment-form-url-field')
							.blur(function(){
								$(window).bind('keydown', keyListener);
							})
							.focus(function(){
								$(window).unbind('keydown', keyListener);
							});

						if ( textarea && textarea.attr('id') === target.attr('id')) {
							// For first page load
							$(window).unbind('keydown', keyListener);
							$('#jp-carousel-comment-form-submit-and-info-wrapper').slideDown('fast');
						} else if ( target.is( 'input[type="submit"]' ) ) {
							e.preventDefault();
							e.stopPropagation();

							$('#jp-carousel-comment-form-spinner').spin('small', 'white');

							var ajaxData = {
								action: 'post_attachment_comment',
								nonce:   jetpackCarouselStrings.nonce,
								blog_id: data['blog_id'],
								id:      attachment_id,
								comment: textarea.val()
							};

							if ( ! ajaxData['comment'].length ) {
								gallery.jp_carousel('postCommentError', {'field': 'jp-carousel-comment-form-comment-field', 'error': jetpackCarouselStrings.no_comment_text});
								return;
							}

							if ( 1 !== Number( jetpackCarouselStrings.is_logged_in ) ) {
								ajaxData['email']  = emailField.val();
								ajaxData['author'] = authorField.val();
								ajaxData['url']    = urlField.val();

								if ( 1 === Number( jetpackCarouselStrings.require_name_email ) ) {
									if ( ! ajaxData['email'].length || ! ajaxData['email'].match('@') ) {
										gallery.jp_carousel('postCommentError', {'field': 'jp-carousel-comment-form-email-field', 'error': jetpackCarouselStrings.no_comment_email});
										return;
									} else if ( ! ajaxData['author'].length ) {
										gallery.jp_carousel('postCommentError', {'field': 'jp-carousel-comment-form-author-field', 'error': jetpackCarouselStrings.no_comment_author});
										return;
									}
								}
							}

							$.ajax({
								type:       'POST',
								url:        jetpackCarouselStrings.ajaxurl,
								data:       ajaxData,
								dataType:   'json',
								success: function(response/*, status, xhr*/) {
									if ( 'approved' === response.comment_status ) {
										$('#jp-carousel-comment-post-results').slideUp('fast').html('<span class="jp-carousel-comment-post-success">' + jetpackCarouselStrings.comment_approved + '</span>').slideDown('fast');
									} else if ( 'unapproved' === response.comment_status ) {
										$('#jp-carousel-comment-post-results').slideUp('fast').html('<span class="jp-carousel-comment-post-success">' + jetpackCarouselStrings.comment_unapproved + '</span>').slideDown('fast');
									} else {
										// 'deleted', 'spam', false
										$('#jp-carousel-comment-post-results').slideUp('fast').html('<span class="jp-carousel-comment-post-error">' + jetpackCarouselStrings.comment_post_error + '</span>').slideDown('fast');
									}
									gallery.jp_carousel('clearCommentTextAreaValue');
									gallery.jp_carousel('getComments', {attachment_id: attachment_id, offset: 0, clear: true});
									$('#jp-carousel-comment-form-button-submit').val(jetpackCarouselStrings.post_comment);
									$('#jp-carousel-comment-form-spinner').spin(false);
								},
								error: function(/*xhr, status, error*/) {
									// TODO: Add error handling and display here
									gallery.jp_carousel('postCommentError', {'field': 'jp-carousel-comment-form-comment-field', 'error': jetpackCarouselStrings.comment_post_error});
									return;
								}
							});
						}
					} else if ( ! target.parents( '.jp-carousel-info' ).length ) {
						container.jp_carousel('next');
					}
				})
				.bind('jp_carousel.afterOpen', function(){
					$(window).bind('keydown', keyListener);
					$(window).bind('resize', resizeListener);
					gallery.opened = true;

					resizeListener();
				})
				.bind('jp_carousel.beforeClose', function(){
					var scroll = $(window).scrollTop();

					$(window).unbind('keydown', keyListener);
					$(window).unbind('resize', resizeListener);
					$(window).scrollTop(scroll);
					gallery.jp_carousel( 'hide_reblog_box' ); // @hide-in-jetpack
				})
				.bind('jp_carousel.afterClose', function(){
					if ( history.pushState ) {
						history.pushState('', document.title, window.location.pathname + window.location.search);
					} else {
						last_known_location_hash = '';
						window.location.hash = '';
					}
					gallery.opened = false;
				})
				.on( 'transitionend.jp-carousel ', '.jp-carousel-slide', function ( e ) {
					// If the movement transitions take more than twice the allotted time, disable them.
					// There is some wiggle room in the 2x, since some of that time is taken up in
					// JavaScript, setting up the transition and calling the events.
					if ( 'transform' === e.originalEvent.propertyName ) {
						var transitionMultiplier = ( ( Date.now() - transitionBegin ) / 1000 ) / e.originalEvent.elapsedTime;

						container.off( 'transitionend.jp-carousel' );

						if ( transitionMultiplier >= 2 ) {
							$( '.jp-carousel-transitions' ).removeClass( 'jp-carousel-transitions' );
						}
					}
				} );

				$( '.jp-carousel-wrap' ).touchwipe( {
					wipeLeft : function ( e ) {
						e.preventDefault();
						gallery.jp_carousel( 'next' );
					},
					wipeRight : function ( e ) {
						e.preventDefault();
						gallery.jp_carousel( 'previous' );
					},
					preventDefaultEvents : false
				} );

			$( '.jetpack-likes-widget-unloaded' ).each( function() {
				jetpackLikesWidgetQueue.push( this.id );
				});

			nextButton.add(previousButton).click(function(e){
				e.preventDefault();
				e.stopPropagation();
				if ( nextButton.is(this) ) {
					gallery.jp_carousel('next');
				} else {
					gallery.jp_carousel('previous');
				}
			});
		}
	};

	var methods = {
		testForData: function(gallery) {
			gallery = $( gallery ); // make sure we have it as a jQuery object.
			return !( ! gallery.length || ! gallery.data( 'carousel-extra' ) );
		},

		testIfOpened: function() {
			return !!( 'undefined' !== typeof(gallery) && 'undefined' !== typeof(gallery.opened) && gallery.opened );
		},

		openOrSelectSlide: function( index ) {
			// The `open` method triggers an asynchronous effect, so we will get an
			// error if we try to use `open` then `selectSlideAtIndex` immediately
			// after it. We can only use `selectSlideAtIndex` if the carousel is
			// already open.
			if ( ! $( this ).jp_carousel( 'testIfOpened' ) ) {
				// The `open` method selects the correct slide during the
				// initialization.
				$( this ).jp_carousel( 'open', { start_index: index } );
			} else {
				gallery.jp_carousel( 'selectSlideAtIndex', index );
			}
		},

		open: function(options) {
			var settings = {
				'items_selector' : '.gallery-item [data-attachment-id], .tiled-gallery-item [data-attachment-id]',
				'start_index': 0
			},
			data = $(this).data('carousel-extra');

			if ( !data ) {
				return; // don't run if the default gallery functions weren't used
			}

			prepareGallery( data );

			if ( gallery.jp_carousel( 'testIfOpened' ) ) {
				return; // don't open if already opened
			}

			// make sure to stop the page from scrolling behind the carousel overlay, so we don't trigger
			// infiniscroll for it when enabled (Reader, theme infiniscroll, etc).
			originalOverflow = $('body').css('overflow');
			$('body').css('overflow', 'hidden');
			// prevent html from overflowing on some of the new themes.
			originalHOverflow = $('html').css('overflow');
			$('html').css('overflow', 'hidden');

			// Re-apply inline-block style here and give an initial value for the width
			// This value will get replaced with a more appropriate value once the slide is loaded
			// This avoids the likes widget appearing initially full width below the comment button and then shuffling up
			jQuery( '.slim-likes-widget' ).find( 'iframe' ).css( 'display', 'inline-block' ).css( 'width', '60px' );

			container.data('carousel-extra', data);
// @start-hide-in-jetpack
			wpcom.carousel.stat( ['open', 'view_image'] );
// @end-hide-in-jetpack

			return this.each(function() {
				// If options exist, lets merge them
				// with our default settings
				var $this = $(this);

				if ( options ) {
					$.extend( settings, options );
				}
				if ( -1 === settings.start_index ) {
					settings.start_index = 0; //-1 returned if can't find index, so start from beginning
				}

				container.trigger('jp_carousel.beforeOpen').fadeIn('fast',function(){
					container.trigger('jp_carousel.afterOpen');
					gallery
						.jp_carousel('initSlides', $this.find(settings.items_selector), settings.start_index)
						.jp_carousel('selectSlideAtIndex', settings.start_index);
				});
				gallery.html('');
			});
		},

		selectSlideAtIndex : function(index){
			var slides = this.jp_carousel('slides'), selected = slides.eq(index);

			if ( 0 === selected.length ) {
				selected = slides.eq(0);
			}

			gallery.jp_carousel('selectSlide', selected, false);
			return this;
		},

		close : function(){
			// make sure to let the page scroll again
			$('body').css('overflow', originalOverflow);
			$('html').css('overflow', originalHOverflow);
			return container
				.trigger('jp_carousel.beforeClose')
				.fadeOut('fast', function(){
					container.trigger('jp_carousel.afterClose');
				});

		},

		next : function(){
			var slide = gallery.jp_carousel( 'nextSlide' );
			container.animate({scrollTop:0}, 'fast');
			gallery.jp_carousel( 'hide_reblog_box' ); // @hide-in-jetpack

			if ( slide ) {
				this.jp_carousel('selectSlide', slide);
				wpcom.carousel.stat( ['next', 'view_image'] ); // @hide-in-jetpack
			}
		},

		previous : function(){
			var slide = gallery.jp_carousel( 'prevSlide' );
			container.animate({scrollTop:0}, 'fast');
			gallery.jp_carousel( 'hide_reblog_box' ); // @hide-in-jetpack

			if ( slide ) {
				this.jp_carousel('selectSlide', slide);
				wpcom.carousel.stat( ['previous', 'view_image'] ); // @hide-in-jetpack
			}
		},

		resetButtons : function(current) {
			if ( current.data('liked') ) {
				$('.jp-carousel-buttons a.jp-carousel-like').addClass('liked').text(jetpackCarouselStrings.unlike);
			} else {
				$('.jp-carousel-buttons a.jp-carousel-like').removeClass('liked').text(jetpackCarouselStrings.like);
			}
// @start-hide-in-jetpack
			if ( current.data( 'reblogged' ) ) {
				$('.jp-carousel-buttons a.jp-carousel-reblog').addClass( 'reblogged' ).text( jetpackCarouselStrings.reblogged );
			} else {
				$('.jp-carousel-buttons a.jp-carousel-reblog').removeClass( 'reblogged' ).text( jetpackCarouselStrings.reblog );
			}

			// Must also take care of reblog/reblogged here
// @end-hide-in-jetpack
		},

		selectedSlide : function(){
			return this.find('.selected');
		},

		setSlidePosition : function(x) {
			transitionBegin = Date.now();

			return this.css({
					'-webkit-transform':'translate3d(' + x + 'px,0,0)',
					'-moz-transform':'translate3d(' + x + 'px,0,0)',
					'-ms-transform':'translate(' + x + 'px,0)',
					'-o-transform':'translate(' + x + 'px,0)',
					'transform':'translate3d(' + x + 'px,0,0)'
			});
		},

		updateSlidePositions : function(animate) {
			var current = this.jp_carousel( 'selectedSlide' ),
				galleryWidth = gallery.width(),
				currentWidth = current.width(),
				previous = gallery.jp_carousel( 'prevSlide' ),
				next = gallery.jp_carousel( 'nextSlide' ),
				previousPrevious = previous.prev(),
				nextNext = next.next(),
				left = Math.floor( ( galleryWidth - currentWidth ) * 0.5 );

			current.jp_carousel( 'setSlidePosition', left ).show();

			// minimum width
			gallery.jp_carousel( 'fitInfo', animate );

			// prep the slides
			var direction = lastSelectedSlide.is( current.prevAll() ) ? 1 : -1;

			// Since we preload the `previousPrevious` and `nextNext` slides, we need
			// to make sure they technically visible in the DOM, but invisible to the
			// user. To hide them from the user, we position them outside the edges
			// of the window.
			//
			// This section of code only applies when there are more than three
			// slides. Otherwise, the `previousPrevious` and `nextNext` slides will
			// overlap with the `previous` and `next` slides which must be visible
			// regardless.
			if ( 1 === direction ) {
				if ( ! nextNext.is( previous ) ) {
					nextNext.jp_carousel( 'setSlidePosition', galleryWidth + next.width() ).show();
				}

				if ( ! previousPrevious.is( next ) ) {
					previousPrevious.jp_carousel( 'setSlidePosition', -previousPrevious.width() - currentWidth ).show();
				}
			} else {
				if ( ! nextNext.is( previous ) ) {
					nextNext.jp_carousel( 'setSlidePosition', galleryWidth + currentWidth ).show();
				}
			}

			previous.jp_carousel( 'setSlidePosition', Math.floor( -previous.width() + ( screenPadding * 0.75 ) ) ).show();
			next.jp_carousel( 'setSlidePosition', Math.ceil( galleryWidth - ( screenPadding * 0.75 ) ) ).show();
		},

		selectSlide : function(slide, animate){
			lastSelectedSlide = this.find( '.selected' ).removeClass( 'selected' );

			var slides = gallery.jp_carousel( 'slides' ).css({ 'position': 'fixed' }),
				current = $( slide ).addClass( 'selected' ).css({ 'position': 'relative' }),
				attachmentId = current.data( 'attachment-id' ),
				previous = gallery.jp_carousel( 'prevSlide' ),
				next = gallery.jp_carousel( 'nextSlide' ),
				previousPrevious = previous.prev(),
				nextNext = next.next(),
				animated,
				captionHtml;

			// center the main image
			gallery.jp_carousel( 'loadFullImage', current );

			caption.hide();

			if ( next.length === 0 && slides.length <= 2 ) {
				$( '.jp-carousel-next-button' ).hide();
			} else {
				$( '.jp-carousel-next-button' ).show();
			}

			if ( previous.length === 0 && slides.length <= 2 ) {
				$( '.jp-carousel-previous-button' ).hide();
			} else {
				$( '.jp-carousel-previous-button' ).show();
			}

			animated = current
				.add( previous )
				.add( previousPrevious )
				.add( next )
				.add( nextNext )
				.jp_carousel( 'loadSlide' );

			// slide the whole view to the x we want
			slides.not( animated ).hide();

			gallery.jp_carousel( 'updateSlidePositions', animate );

			gallery.jp_carousel( 'resetButtons', current );
			container.trigger( 'jp_carousel.selectSlide', [current] );

			gallery.jp_carousel( 'getTitleDesc', {
				title: current.data( 'title' ),
				desc: current.data( 'desc' )
			});

			// Lazy-load the Likes iframe for the current, next, and previous slides.
			gallery.jp_carousel( 'loadLikes', attachmentId );
			gallery.jp_carousel( 'updateLikesWidgetVisibility', attachmentId );

			if ( next.length > 0 ) {
				gallery.jp_carousel( 'loadLikes', next.data( 'attachment-id' ) );
			}

			if ( previous.length > 0 ) {
				gallery.jp_carousel( 'loadLikes', previous.data( 'attachment-id' ) );
			}

			var imageMeta = current.data( 'image-meta' );
			gallery.jp_carousel( 'updateExif', imageMeta );
			gallery.jp_carousel( 'updateFullSizeLink', current );
			gallery.jp_carousel( 'updateMap', imageMeta );
			gallery.jp_carousel( 'testCommentsOpened', current.data( 'comments-opened' ) );
			gallery.jp_carousel( 'getComments', {
				'attachment_id': attachmentId,
				'offset': 0,
				'clear': true
			});
			$( '#jp-carousel-comment-post-results' ).slideUp();

			// $('<div />').text(sometext).html() is a trick to go to HTML to plain
			// text (including HTML entities decode, etc)
			if ( current.data( 'caption' ) ) {
				captionHtml = $( '<div />' ).text( current.data( 'caption' ) ).html();

				if ( captionHtml === $( '<div />' ).text( current.data( 'title' ) ).html() ) {
					$( '.jp-carousel-titleanddesc-title' ).fadeOut( 'fast' ).empty();
				}

				if ( captionHtml === $( '<div />' ).text( current.data( 'desc' ) ).html() ) {
					$( '.jp-carousel-titleanddesc-desc' ).fadeOut( 'fast' ).empty();
				}

				caption.html( current.data( 'caption' ) ).fadeIn( 'slow' );
			} else {
				caption.fadeOut( 'fast' ).empty();
			}

			wpcom.carousel.pageview( attachmentId ); // @hide-in-jetpack

			// Load the images for the next and previous slides.
			$( next ).add( previous ).each( function() {
				gallery.jp_carousel( 'loadFullImage', $( this ) );
			});

			window.location.hash = last_known_location_hash = '#jp-carousel-' + attachmentId;
		},

		slides : function(){
			return this.find('.jp-carousel-slide');
		},

		slideDimensions : function(){
			return {
				width: $(window).width() - (screenPadding * 2),
				height: Math.floor( $(window).height() / 100 * proportion - 60 )
			};
		},

		loadSlide : function() {
			return this.each(function(){
				var slide = $(this);
				slide.find('img')
					.one('load', function(){
						// set the width/height of the image if it's too big
						slide
							.jp_carousel('fitSlide',false);
					});
			});
		},

		bestFit : function(){
			var max        = gallery.jp_carousel('slideDimensions'),
			    orig       = this.jp_carousel('originalDimensions'),
			    orig_ratio = orig.width / orig.height,
			    w_ratio    = 1,
			    h_ratio    = 1,
			    width, height;

			if ( orig.width > max.width ) {
				w_ratio = max.width / orig.width;
			}
			if ( orig.height > max.height ) {
				h_ratio = max.height / orig.height;
			}

			if ( w_ratio < h_ratio ) {
				width = max.width;
				height = Math.floor( width / orig_ratio );
			} else if ( h_ratio < w_ratio ) {
				height = max.height;
				width = Math.floor( height * orig_ratio );
			} else {
				width = orig.width;
				height = orig.height;
			}

			return {
				width: width,
				height: height
			};
		},

		fitInfo : function(/*animated*/){
			var current = this.jp_carousel('selectedSlide'),
				size = current.jp_carousel('bestFit');

			photo_info.css({
				'left'  : Math.floor( (info.width() - size.width) * 0.5 ),
				'width' : Math.floor( size.width )
			});

			return this;
		},

		fitMeta : function(animated){
			var newInfoTop   = { top: Math.floor( $(window).height() / 100 * proportion + 5 ) + 'px' };
			var newLeftWidth = { width: ( info.width() - (imageMeta.width() + 80) ) + 'px' };

			if (animated) {
				info.animate(newInfoTop);
				leftColWrapper.animate(newLeftWidth);
			} else {
				info.animate(newInfoTop);
				leftColWrapper.css(newLeftWidth);
			}
		},

		fitSlide : function(/*animated*/){
			return this.each(function(){
				var $this      = $(this),
				    dimensions = $this.jp_carousel('bestFit'),
				    method     = 'css',
				    max        = gallery.jp_carousel('slideDimensions');

				dimensions.left = 0;
				dimensions.top = Math.floor( (max.height - dimensions.height) * 0.5 ) + 40;
				$this[method](dimensions);
			});
		},

		texturize : function(text) {
				text = '' + text; // make sure we get a string. Title "1" came in as int 1, for example, which did not support .replace().
				text = text.replace(/'/g, '&#8217;').replace(/&#039;/g, '&#8217;').replace(/[\u2019]/g, '&#8217;');
				text = text.replace(/"/g, '&#8221;').replace(/&#034;/g, '&#8221;').replace(/&quot;/g, '&#8221;').replace(/[\u201D]/g, '&#8221;');
				text = text.replace(/([\w]+)=&#[\d]+;(.+?)&#[\d]+;/g, '$1="$2"'); // untexturize allowed HTML tags params double-quotes
				return $.trim(text);
		},

		initSlides : function(items, start_index){
			if ( items.length < 2 ) {
				$( '.jp-carousel-next-button, .jp-carousel-previous-button' ).hide();
			} else {
				$( '.jp-carousel-next-button, .jp-carousel-previous-button' ).show();
			}

			// Calculate the new src.
			items.each(function(/*i*/){
				var src_item  = $(this),
					orig_size = src_item.data('orig-size') || '',
					max       = gallery.jp_carousel('slideDimensions'),
					parts     = orig_size.split(','),
					medium_file     = src_item.data('medium-file') || '',
					large_file      = src_item.data('large-file') || '',
					src;
				orig_size = {width: parseInt(parts[0], 10), height: parseInt(parts[1], 10)};

// @start-hide-in-jetpack
				if ( 'undefined' !== typeof wpcom ) {
					src = src_item.attr('src') || src_item.attr('original') || src_item.data('original') || src_item.data('lazy-src');
					if (src.indexOf('imgpress') !== -1) {
						src = src_item.data('orig-file');
					}
					src = wpcom.carousel.addWidthToImageURL( src, wpcom.carousel.findFirstLargeEnoughWidth( orig_size.width, orig_size.height, max.width, max.height ) );
				} else {
// @end-hide-in-jetpack
					src = src_item.data('orig-file');

					src = gallery.jp_carousel('selectBestImageSize', {
						orig_file   : src,
						orig_width  : orig_size.width,
						orig_height : orig_size.height,
						max_width   : max.width,
						max_height  : max.height,
						medium_file : medium_file,
						large_file  : large_file
					});
// @start-hide-in-jetpack
				} // end else of if ( 'undefined' != typeof wpcom )
// @end-hide-in-jetpack

				// Set the final src
				$(this).data( 'gallery-src', src );
			});

			// If the start_index is not 0 then preload the clicked image first.
			if ( 0 !== start_index ) {
				$('<img/>')[0].src = $(items[start_index]).data('gallery-src');
			}

			var useInPageThumbnails = items.first().closest( '.tiled-gallery.type-rectangular' ).length > 0;

			// create the 'slide'
			items.each(function(i){
				var src_item        = $(this),
					liked           = src_item.data('liked') || 0, // @hide-in-jetpack
					reblogged       = src_item.data( 'reblogged' ) || 0, // @hide-in-jetpack
					attachment_id   = src_item.data('attachment-id') || 0,
					comments_opened = src_item.data('comments-opened') || 0,
					image_meta      = src_item.data('image-meta') || {},
					orig_size       = src_item.data('orig-size') || '',
					thumb_size      = { width : src_item[0].naturalWidth, height : src_item[0].naturalHeight },
					title           = src_item.data('image-title') || '',
					description     = src_item.data('image-description') || '',
					caption         = src_item.parents('dl').find('dd.gallery-caption').html() || '',
					src		= src_item.data('gallery-src') || '',
					medium_file     = src_item.data('medium-file') || '',
					large_file      = src_item.data('large-file') || '',
					orig_file	= src_item.data('orig-file') || '';

				var tiledCaption = src_item.parents('div.tiled-gallery-item').find('div.tiled-gallery-caption').html();
				if ( tiledCaption ) {
					caption = tiledCaption;
				}

				if ( attachment_id && orig_size.length ) {
					title       = gallery.jp_carousel('texturize', title);
					description = gallery.jp_carousel('texturize', description);
					caption     = gallery.jp_carousel('texturize', caption);

					// Initially, the image is a 1x1 transparent gif.  The preview is shown as a background image on the slide itself.
					var image = $( '<img/>' )
						.attr( 'src', 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' )
						.css( 'width', '100%' )
						.css( 'height', '100%' );

					var slide = $('<div class="jp-carousel-slide"></div>')
							.hide()
							.css({
								//'position' : 'fixed',
								'left'     : i < start_index ? -1000 : gallery.width()
							})
							.append( image )
							.appendTo(gallery)
							.data('src', src )
							.data('title', title)
							.data('desc', description)
							.data('caption', caption)
							.data('attachment-id', attachment_id)
							.data('permalink', src_item.parents('a').attr('href'))
							.data('orig-size', orig_size)
							.data('comments-opened', comments_opened)
							.data('image-meta', image_meta)
							.data('medium-file', medium_file)
							.data('large-file', large_file)
							.data('orig-file', orig_file)
							.data('thumb-size', thumb_size)
							.data('liked', liked) // @hide-in-jetpack
							.data( 'reblogged', reblogged ) // @hide-in-jetpack
							;

						if ( useInPageThumbnails ) {
							// Use the image already loaded in the gallery as a preview.
							slide
								.data( 'preview-image', src_item.attr( 'src' ) )
								.css( {
									'background-image' : 'url("' + src_item.attr( 'src' ) + '")',
									'background-size' : '100% 100%',
									'background-position' : 'center center'
								} );
						}

						slide.jp_carousel( 'fitSlide', false );
				}
			});
			return this;
		},

		selectBestImageSize: function(args) {
			if ( 'object' !== typeof args ) {
				args = {};
			}

			if ( 'undefined' === typeof args.orig_file ) {
				return '';
			}

			if ( 'undefined' === typeof args.orig_width || 'undefined' === typeof args.max_width ) {
				return args.orig_file;
			}

			if ( 'undefined' === typeof args.medium_file || 'undefined' === typeof args.large_file ) {
				return args.orig_file;
			}

			var medium_size       = args.medium_file.replace(/-([\d]+x[\d]+)\..+$/, '$1'),
				medium_size_parts = (medium_size !== args.medium_file) ? medium_size.split('x') : [args.orig_width, 0],
				medium_width      = parseInt( medium_size_parts[0], 10 ),
				medium_height     = parseInt( medium_size_parts[1], 10 ),
				large_size        = args.large_file.replace(/-([\d]+x[\d]+)\..+$/, '$1'),
				large_size_parts  = (large_size !== args.large_file) ? large_size.split('x') : [args.orig_width, 0],
				large_width       = parseInt( large_size_parts[0], 10 ),
				large_height      = parseInt( large_size_parts[1], 10 );

			// Give devices with a higher devicePixelRatio higher-res images (Retina display = 2, Android phones = 1.5, etc)
			if ( 'undefined' !== typeof window.devicePixelRatio && window.devicePixelRatio > 1 ) {
				args.max_width  = args.max_width * window.devicePixelRatio;
				args.max_height = args.max_height * window.devicePixelRatio;
			}

			if ( large_width >= args.max_width || large_height >= args.max_height ) {
				return args.large_file;
			}

			if ( medium_width >= args.max_width || medium_height >= args.max_height ) {
				return args.medium_file;
			}

			return args.orig_file;
		},
// @start-hide-in-jetpack
		show_reblog_box: function() {
			$('#carousel-reblog-box textarea').val(jetpackCarouselStrings.reblog_add_thoughts);
			//t.addClass('selected');
			$('#carousel-reblog-box p.response').remove();
			$('#carousel-reblog-box div.submit, #carousel-reblog-box div.submit span.canceltext').show();
			$('#carousel-reblog-box div.submit input[type=submit]').prop('disabled', false);

			var current = $('.jp-carousel div.selected');
			$('#carousel-reblog-box input#carousel-reblog-post-url').val( current.data('permalink') );
			$('#carousel-reblog-box input#carousel-reblog-post-title').val( $('div.jp-carousel-info').children('h2').text() );

			$('div.jp-carousel-info').append( $('#carousel-reblog-box') ).children().fadeOut('fast');
			$('#carousel-reblog-box').fadeIn('fast');
		},

		hide_reblog_box: function () {
			$( 'div.jp-carousel-info' ).children().not( '#carousel-reblog-box' ).fadeIn( 'fast' );
			$( '#carousel-reblog-box' ).fadeOut( 'fast' );
		},
// @end-hide-in-jetpack

		originalDimensions: function() {
			var splitted = $(this).data('orig-size').split(',');
			return {width: parseInt(splitted[0], 10), height: parseInt(splitted[1], 10)};
		},

		format: function( args ) {
			if ( 'object' !== typeof args ) {
				args = {};
			}
			if ( ! args.text || 'undefined' === typeof args.text ) {
				return;
			}
			if ( ! args.replacements || 'undefined' === typeof args.replacements ) {
				return args.text;
			}
			return args.text.replace(/{(\d+)}/g, function( match, number ) {
				return typeof args.replacements[number] !== 'undefined' ? args.replacements[number] : match;
			});
		},

		shutterSpeed: function(d) {
			if (d >= 1) {
				return Math.round(d) + 's';
			}
			var df = 1, top = 1, bot = 1;
			var limit = 1e3;
			while (df !== d && limit-- > 0) {
				if (df < d) {
					top += 1;
				} else {
					bot += 1;
					top = parseInt(d * bot, 10);
				}
				df = top / bot;
			}
			if (top > 1) {
				bot = Math.round(bot / top);
				top = 1;
			}
			if (bot <= 1) {
				return '1s';
			}
			return top + '/' + bot + 's';
		},

		parseTitleDesc: function( value ) {
			if ( !value.match(' ') && value.match('_') ) {
				return '';
			}
			// Prefix list originally based on http://commons.wikimedia.org/wiki/MediaWiki:Filename-prefix-blacklist
			$([
				'CIMG',                   // Casio
				'DSC_',                   // Nikon
				'DSCF',                   // Fuji
				'DSCN',                   // Nikon
				'DUW',                    // some mobile phones
				'GEDC',                   // GE
				'IMG',                    // generic
				'JD',                     // Jenoptik
				'MGP',                    // Pentax
				'PICT',                   // misc.
				'Imagen',                 // misc.
				'Foto',                   // misc.
				'DSC',                    // misc.
				'Scan',                   // Scanners
				'SANY',                   // Sanyo
				'SAM',                    // Samsung
				'Screen Shot [0-9]+'      // Mac screenshots
			])
			.each(function(key, val){
				var regex = new RegExp('^' + val);
				if ( regex.test(value) ) {
					value = '';
					return;
				}
			});
			return value;
		},

		getTitleDesc: function( data ) {
			var title ='', desc = '', markup = '', target;

			target = $( 'div.jp-carousel-titleanddesc', 'div.jp-carousel-wrap' );
			target.hide();

			title = gallery.jp_carousel('parseTitleDesc', data.title) || '';
			desc  = gallery.jp_carousel('parseTitleDesc', data.desc)  || '';

			if ( title.length || desc.length ) {
				// $('<div />').text(sometext).html() is a trick to go to HTML to plain text (including HTML entities decode, etc)
				if ( $('<div />').text(title).html() === $('<div />').text(desc).html() ) {
					title = '';
				}

				markup  = ( title.length ) ? '<div class="jp-carousel-titleanddesc-title">' + title + '</div>' : '';
				markup += ( desc.length )  ? '<div class="jp-carousel-titleanddesc-desc">' + desc + '</div>'   : '';

				target.html( markup ).fadeIn('slow');
			}

			$( 'div#jp-carousel-comment-form-container' ).css('margin-top', '20px');
			$( 'div#jp-carousel-comments-loading' ).css('margin-top', '20px');
		},

		updateLikesWidgetVisibility: function ( attachmentId ) {
			// Only do this if likes is enabled
			if ( 'undefined' === typeof jetpackLikesWidgetQueue ) {
				return;
			}

			// Hide all likes widgets except for the one for the attachmentId passed in
			$( '.jp-carousel-buttons .jetpack-likes-widget-wrapper' ).css( 'display', 'none' ).each( function () {
				var widgetWrapper = $( this );
				if ( widgetWrapper.attr( 'data-attachment-id' ) == attachmentId ) { // jshint ignore:line
					widgetWrapper.css( 'display', 'inline-block' );
					return false;
				}
			});
		},

		loadLikes : function ( attachmentId ) {
			var dataCarouselExtra = $( '.jp-carousel-wrap' ).data( 'carousel-extra' );
			var blogId = dataCarouselExtra.likes_blog_id;

			if ( $( '#like-post-wrapper-' + blogId + '-' + attachmentId ).length === 0 ) {
				// Add the iframe the first time the slide is shown.
				var protocol = 'http';
				var originDomain = 'http://wordpress.com';

				if ( dataCarouselExtra.permalink.length ) {
					protocol = dataCarouselExtra.permalink.split( ':' )[0];

					if ( ( protocol !== 'http' ) && ( protocol !== 'https' ) ) {
						protocol = 'http';
					}

					var parts = dataCarouselExtra.permalink.split( '/' );

					if ( parts.length >= 2 ) {
						originDomain = protocol + '://' + parts[2];
					}
				}

				var dataSource = protocol + '://widgets.wp.com/likes/#blog_id=' + encodeURIComponent( blogId ) +
					'&post_id=' + encodeURIComponent( attachmentId ) +
					'&slim=1&origin=' + encodeURIComponent( originDomain );

				if ( 'en' !== jetpackCarouselStrings.lang ) {
					dataSource += '&lang=' + encodeURIComponent( jetpackCarouselStrings.lang );
				}

				var likesWidget = $( '<iframe class=\'post-likes-widget jetpack-likes-widget jetpack-resizeable\'></iframe>' )
					.attr( 'name', 'like-post-frame-' + blogId + '-' + attachmentId )
					.attr( 'src', dataSource )
					.css( 'display', 'inline-block' );

				var likesWidgetWrapper = $( '<div/>' )
					.addClass( 'jetpack-likes-widget-wrapper jetpack-likes-widget-unloaded slim-likes-widget' )
					.attr( 'id', 'like-post-wrapper-' + blogId + '-' + attachmentId )
					.attr( 'data-src', dataSource )
					.attr( 'data-name', 'like-post-frame-' + blogId + '-' + attachmentId )
					.attr( 'data-attachment-id', attachmentId )
					.css( 'display', 'none' )
					.css( 'vertical-align', 'middle' )
					.append( likesWidget )
					.append( '<div class=\'post-likes-widget-placeholder\'></div>' );

				$( '.jp-carousel-buttons' ).append( likesWidgetWrapper );
			}

		},

		// updateExif updates the contents of the exif UL (.jp-carousel-image-exif)
		updateExif: function( meta ) {
			if ( !meta || 1 !== Number( jetpackCarouselStrings.display_exif ) ) {
				return false;
			}

			var $ul = $( '<ul class=\'jp-carousel-image-exif\'></ul>' );

			$.each( meta, function( key, val ) {
				if ( 0 === parseFloat(val) || !val.length || -1 === $.inArray( key, [ 'camera', 'aperture', 'shutter_speed', 'focal_length' ] ) ) {
					return;
				}

				switch( key ) {
					case 'focal_length':
						val = val + 'mm';
						break;
					case 'shutter_speed':
						val = gallery.jp_carousel('shutterSpeed', val);
						break;
					case 'aperture':
						val = 'f/' + val;
						break;
				}

				$ul.append( '<li><h5>' + jetpackCarouselStrings[key] + '</h5>' + val + '</li>' );
			});

			// Update (replace) the content of the ul
			$( 'div.jp-carousel-image-meta ul.jp-carousel-image-exif' ).replaceWith( $ul );
		},

		// updateFullSizeLink updates the contents of the jp-carousel-image-download link
		updateFullSizeLink: function(current) {
			if(!current || !current.data) {
				return false;
			}
			var original  = current.data('orig-file').replace(/\?.+$/, ''),
				origSize  = current.data('orig-size').split(','),
				permalink = $( '<a>'+gallery.jp_carousel('format', {'text': jetpackCarouselStrings.download_original, 'replacements': origSize})+'</a>' )
					.addClass( 'jp-carousel-image-download' )
					.attr( 'href', original )
					.attr( 'target', '_blank' );

			// Update (replace) the content of the anchor
			$( 'div.jp-carousel-image-meta a.jp-carousel-image-download' ).replaceWith( permalink );
		},

		updateMap: function( meta ) {
			if ( !meta.latitude || !meta.longitude || 1 !== Number( jetpackCarouselStrings.display_geo ) ) {
				return;
			}

			var latitude  = meta.latitude,
				longitude = meta.longitude,
				$metabox  = $( 'div.jp-carousel-image-meta', 'div.jp-carousel-wrap' ),
				$mapbox   = $( '<div></div>' ),
				style     = '&scale=2&style=feature:all|element:all|invert_lightness:true|hue:0x0077FF|saturation:-50|lightness:-5|gamma:0.91';

			$mapbox
				.addClass( 'jp-carousel-image-map' )
				.html( '<img width="154" height="154" src="https://maps.googleapis.com/maps/api/staticmap?\
							center=' + latitude + ',' + longitude + '&\
							zoom=8&\
							size=154x154&\
							sensor=false&\
							markers=size:medium%7Ccolor:blue%7C' + latitude + ',' + longitude + style +'" class="gmap-main" />\
							\
						<div class="gmap-topright"><div class="imgclip"><img width="175" height="154" src="https://maps.googleapis.com/maps/api/staticmap?\
							center=' + latitude + ',' + longitude + '&\
							zoom=3&\
							size=175x154&\
							sensor=false&\
							markers=size:small%7Ccolor:blue%7C' + latitude + ',' + longitude + style + '"c /></div></div>\
							\
						' )
				.prependTo( $metabox );
		},

		testCommentsOpened: function( opened ) {
			if ( 1 === parseInt( opened, 10 ) ) {
// @start-hide-in-jetpack
				if ( 1 === Number( jetpackCarouselStrings.is_logged_in ) ) {
					$('.jp-carousel-commentlink').fadeIn('fast');
				} else {
// @end-hide-in-jetpack
					$('.jp-carousel-buttons').fadeIn('fast');
// @start-hide-in-jetpack
				}
// @end-hide-in-jetpack
				commentForm.fadeIn('fast');
			} else {
// @start-hide-in-jetpack
				if ( 1 === Number( jetpackCarouselStrings.is_logged_in ) ) {
					$('.jp-carousel-commentlink').fadeOut('fast');
				} else {
// @end-hide-in-jetpack
					$('.jp-carousel-buttons').fadeOut('fast');
// @start-hide-in-jetpack
				}
// @end-hide-in-jetpack
				commentForm.fadeOut('fast');
			}
		},

		getComments: function( args ) {
			clearInterval( commentInterval );

			if ( 'object' !== typeof args ) {
				return;
			}

			if ( 'undefined' === typeof args.attachment_id || ! args.attachment_id ) {
				return;
			}

			if ( ! args.offset || 'undefined' === typeof args.offset || args.offset < 1 ) {
				args.offset = 0;
			}

			var comments        = $('.jp-carousel-comments'),
				commentsLoading = $('#jp-carousel-comments-loading').show();

			if ( args.clear ) {
				comments.hide().empty();
			}

			$.ajax({
				type:       'GET',
				url:        jetpackCarouselStrings.ajaxurl,
				dataType:   'json',
				data: {
					action: 'get_attachment_comments',
					nonce:  jetpackCarouselStrings.nonce,
					id:     args.attachment_id,
					offset: args.offset
				},
				success: function(data/*, status, xhr*/) {
					if ( args.clear ) {
						comments.fadeOut('fast').empty();
					}

					$( data ).each(function(){
						var comment = $('<div></div>')
							.addClass('jp-carousel-comment')
							.attr('id', 'jp-carousel-comment-' + this['id'])
							.html(
								  '<div class="comment-gravatar">' +
								    this['gravatar_markup'] +
								  '</div>' +
								  '<div class="comment-author">' +
								    this['author_markup'] +
								  '</div>' +
								  '<div class="comment-date">' +
								    this['date_gmt'] +
								  '</div>' +
								  '<div class="comment-content">' +
								    this['content'] +
								  '</div>'
							);
						comments.append(comment);

						// Set the interval to check for a new page of comments.
						clearInterval( commentInterval );
						commentInterval = setInterval( function() {
							if ( ( $('.jp-carousel-overlay').height() - 150 ) < $('.jp-carousel-wrap').scrollTop() + $(window).height() ) {
								gallery.jp_carousel('getComments',{ attachment_id: args.attachment_id, offset: args.offset + 10, clear: false });
								clearInterval( commentInterval );
							}
						}, 300 );
					});

					// Verify (late) that the user didn't repeatldy click the arrows really fast, in which case the requested
					// attachment id might no longer match the current attachment id by the time we get the data back or a now
					// registered infiniscroll event kicks in, so we don't ever display comments for the wrong image by mistake.
					var current = $('.jp-carousel div.selected');
					if ( current && current.data && current.data('attachment-id') != args.attachment_id ) { // jshint ignore:line
						comments.fadeOut('fast');
						comments.empty();
						return;
					}

					// Increase the height of the background, semi-transparent overlay to match the new length of the comments list.
					$('.jp-carousel-overlay').height( $(window).height() + titleAndDescription.height() + commentForm.height() + ( (comments.height() > 0) ? comments.height() : imageMeta.height() ) + 200 );

					comments.show();
					commentsLoading.hide();
				},
				error: function(xhr, status, error) {
					// TODO: proper error handling
					console.log( 'Comment get fail...', xhr, status, error );
					comments.fadeIn('fast');
					commentsLoading.fadeOut('fast');
				}
			});
		},

		postCommentError: function(args) {
			if ( 'object' !== typeof args ) {
				args = {};
			}
			if ( ! args.field || 'undefined' === typeof args.field ||  ! args.error || 'undefined' === typeof args.error ) {
				return;
			}
			$('#jp-carousel-comment-post-results').slideUp('fast').html('<span class="jp-carousel-comment-post-error">'+args.error+'</span>').slideDown('fast');
			$('#jp-carousel-comment-form-spinner').spin(false);
		},

		setCommentIframeSrc: function(attachment_id) {
			var iframe = $('#jp-carousel-comment-iframe');
			// Set the proper irame src for the current attachment id
			if (iframe && iframe.length) {
				iframe.attr('src', iframe.attr('src').replace(/(postid=)\d+/, '$1'+attachment_id) );
				iframe.attr('src', iframe.attr('src').replace(/(%23.+)?$/, '%23jp-carousel-'+attachment_id) );
			}
		},

		clearCommentTextAreaValue: function() {
			var commentTextArea = $('#jp-carousel-comment-form-comment-field');
			if ( commentTextArea ) {
				commentTextArea.val('');
			}
		},

		nextSlide : function () {
			var slides = this.jp_carousel( 'slides' );
			var selected = this.jp_carousel( 'selectedSlide' );

			if ( selected.length === 0 || ( slides.length > 2 && selected.is( slides.last() ) ) ) {
				return slides.first();
			}

			return selected.next();
		},

		prevSlide : function () {
			var slides = this.jp_carousel( 'slides' );
			var selected = this.jp_carousel( 'selectedSlide' );

			if ( selected.length === 0 || ( slides.length > 2 && selected.is( slides.first() ) ) ) {
				return slides.last();
			}

			return selected.prev();
		},

		loadFullImage : function ( slide ) {
			var image = slide.find( 'img:first' );

			if ( ! image.data( 'loaded' ) ) {
				// If the width of the slide is smaller than the width of the "thumbnail" we're already using,
				// don't load the full image.

				image.on( 'load.jetpack', function () {
					image.off( 'load.jetpack' );
					$( this ).closest( '.jp-carousel-slide' ).css( 'background-image', '' );
				} );

				if ( ! slide.data( 'preview-image' ) || ( slide.data( 'thumb-size' ) && slide.width() > slide.data( 'thumb-size' ).width ) ) {
					image.attr( 'src', image.closest( '.jp-carousel-slide' ).data( 'src' ) );
				} else {
					image.attr( 'src', slide.data( 'preview-image' ) );
				}

				image.data( 'loaded', 1 );
			}
		}
	};

	$.fn.jp_carousel = function(method){
		// ask for the HTML of the gallery
		// Method calling logic
		if ( methods[method] ) {
			return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method ) {
			return methods.open.apply( this, arguments );
		} else {
			$.error( 'Method ' +	method + ' does not exist on jQuery.jp_carousel' );
		}

	};

	// register the event listener for starting the gallery
	$( document.body ).on( 'click', 'div.gallery,div.tiled-gallery', function(e) {
		if ( ! $(this).jp_carousel( 'testForData', e.currentTarget ) ) {
			return;
		}
		if ( $(e.target).parent().hasClass('gallery-caption') ) {
			return;
		}
		e.preventDefault();
		$(this).jp_carousel('open', {start_index: $(this).find('.gallery-item, .tiled-gallery-item').index($(e.target).parents('.gallery-item, .tiled-gallery-item'))});
	});

	// Makes carousel work on page load and when back button leads to same URL with carousel hash (ie: no actual document.ready trigger)
	$( window ).on( 'hashchange', function () {
		if ( ! window.location.hash || ! window.location.hash.match(/jp-carousel-(\d+)/) ) {
			return;
		}

		if ( window.location.hash === last_known_location_hash ) {
			return;
		}

		last_known_location_hash = window.location.hash;

		var gallery = $('div.gallery, div.tiled-gallery'), index = -1, n = window.location.hash.match(/jp-carousel-(\d+)/);

		if ( ! $(this).jp_carousel( 'testForData', gallery ) ) {
			return;
		}

		n = parseInt(n[1], 10);

		gallery.find('img').each(function(num, el){
			// n cannot be 0 (zero)
			if ( n && Number( $(el).data('attachment-id') ) === n ) {
				index = num;
				return false;
			}
		});

		if ( index !== -1 ) {
			gallery.jp_carousel('openOrSelectSlide', index);
		}
	});

	if ( window.location.hash ) {
		$( window ).trigger( 'hashchange' );
	}
});

/**
 * jQuery Plugin to obtain touch gestures from iPhone, iPod Touch and iPad, should also work with Android mobile phones (not tested yet!)
 * Common usage: wipe images (left and right to show the previous or next image)
 *
 * @author Andreas Waltl, netCU Internetagentur (http://www.netcu.de)
 * Version 1.1.1, modified to pass the touchmove event to the callbacks.
 */
(function($) {
$.fn.touchwipe = function(settings) {
	var config = {
			min_move_x: 20,
			min_move_y: 20,
			wipeLeft: function(/*e*/) { },
			wipeRight: function(/*e*/) { },
			wipeUp: function(/*e*/) { },
			wipeDown: function(/*e*/) { },
			preventDefaultEvents: true
	};

	if (settings) {
		$.extend(config, settings);
	}

	this.each(function() {
		var startX;
		var startY;
		var isMoving = false;

		function cancelTouch() {
			this.removeEventListener('touchmove', onTouchMove);
			startX = null;
			isMoving = false;
		}

		function onTouchMove(e) {
			if(config.preventDefaultEvents) {
				e.preventDefault();
			}
			if(isMoving) {
				var x = e.touches[0].pageX;
				var y = e.touches[0].pageY;
				var dx = startX - x;
				var dy = startY - y;
				if(Math.abs(dx) >= config.min_move_x) {
					cancelTouch();
					if(dx > 0) {
						config.wipeLeft(e);
					} else {
						config.wipeRight(e);
					}
				}
				else if(Math.abs(dy) >= config.min_move_y) {
						cancelTouch();
						if(dy > 0) {
							config.wipeDown(e);
						} else {
							config.wipeUp(e);
						}
					}
			}
		}

		function onTouchStart(e)
		{
			if (e.touches.length === 1) {
				startX = e.touches[0].pageX;
				startY = e.touches[0].pageY;
				isMoving = true;
				this.addEventListener('touchmove', onTouchMove, false);
			}
		}
		if ('ontouchstart' in document.documentElement) {
			this.addEventListener('touchstart', onTouchStart, false);
		}
	});

	return this;
};
})(jQuery);
;
