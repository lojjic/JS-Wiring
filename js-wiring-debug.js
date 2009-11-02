/*
 * Copyright (c) 2009 Jason Johnston
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/*jslint browser: true, undef: true, evil: false
   onevar: true, debug: false, on: false, eqeqeq: true */

/**
 * <p>Including this file adds some extra capabilities to the JS Wiring framework
 * objects to facilitate debugging:</p>
 *
 * <ul>
 *   <li>Every object instantiated and configured by the wiring container will be
 *       automatically assigned a <code>__wiring_name__</code> property, set to
 *       the name of the wiring definition used to create the object.</li>
 *   <li>A new <code>dumpConfig</code> method is added, which returns a dump of the
 *       complete object configuration. This is handy if you happen to assemble the
 *       configuration for your app across many separate files, so you can see the
 *       final aggregate result.
 * </ul>
 */
(function() {

    var W = Wiring.constructor,
        proto = W.prototype,
        _get = proto.get;

    /**
     * Debug flag; true by default, set this to false to disable debug logic
     * temporarily. To disable debug completely, it's best to omit this file.
     */
    proto.debug = true;

    /**
     * Override get method so that it adds a __wiring_name__ property to each
     * object it returns.
     */
    proto.get = function( name ) {
        try {
            var obj = _get.call( this, name );
            if( this.debug ) {
                obj.__wiring_name__ = name;
            }
            return obj;
        } catch( e ) {
            e.__wiring_name__ = name;
            throw e;
        }
    };

    /**
     * Dump the complete configuration for the wiring container.
     * @return {Object}
     */
    proto.dumpConfig = function() {
        var obj = {},
            defs = this._defs, p;
        for( p in defs ) {
            if( defs.hasOwnProperty( p ) ) {
                obj[ p ] = defs[ p ].cfg;
            }
        }
        return obj;
    };

})();