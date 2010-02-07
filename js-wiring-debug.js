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
/*global Wiring*/

/**
 * <p>Including this file adds some extra capabilities to the JS Wiring framework
 * objects to facilitate debugging:</p>
 *
 * <ul>
 *   <li>Every object instantiated and configured by the wiring container will be
 *       automatically assigned a <code>__wiring_name__</code> property, set to
 *       the name of the wiring definition used to create the object, and a
 *       <code>__wiring_config__</code> property, set to the fully-calculated
 *       configuration object.</li>
 *   <li>When calling <code>.get()</code>, a series of validations are performed on
 *       the target configuration. If any of these fail, an exception will be thrown
 *       containing a descriptive message of the problem.</li>
 *   <li>A new <code>dumpConfig</code> method is added, which returns a dump of the
 *       complete object configuration. This is handy if you happen to assemble the
 *       configuration for your app across many separate files, so you can see the
 *       final aggregate result.
 * </ul>
 *
 * <p>All of the above functionality can be temporarily disabled by setting the
 * <code>debug</code> property of the Wiring object to false.</p>
 */
(function() {

    var W = Wiring.constructor,
        proto = W.prototype,
        _get = proto.get,
        _modify = proto.modify;

    /**
     * Debug flag; true by default, set this to false to disable debug logic
     * temporarily. To disable debug completely, it's best to omit this file.
     */
    proto.debug = true;

    /*
     * Error strings
     */
    proto.ERR_NO_DEF = 'Wiring: No object named "{0}" is configured.';
    proto.ERR_PARENT_NOT_STRING = 'Wiring: The configured parent for the object named "{0}" is not a string.';
    proto.ERR_PARENT_NONEXISTENT = 'Wiring: The configured parent named "{1}" for the object named "{0}" does not exist in the configuration.';
    proto.ERR_TYPE_NONEXISTENT = 'Wiring: The object named "{0}" is configured with a "type" that is undefined or not a function.';
    proto.ERR_INITMETHOD_NOT_STRING = 'Wiring: The configured "initMethod" for the object named "{0}" is not a string.';
    proto.ERR_INITMETHOD_NONEXISTENT = 'Wiring: The configured "initMethod" for the object named "{0}" does not exist in the prototype.';
    proto.ERR_MODIFY_NONEXISTENT = 'Wiring: Attempted to modify a nonexistent object definition: "{0}"';

    /**
     * Override get method so that it adds a __wiring_name__ property to each
     * object it returns.
     */
    proto.get = function( name ) {
        var def, cfg, obj, par;

        if( this.debug ) {
            // Make sure an object of that name is configured
            def = this._defs[ name ];
            if( !def ) {
                throw new Error( this.ERR_NO_DEF.replace( "{0}", name ) );
            }

            // Perform some basic validation on the completed config
            cfg = def.getCascadedCfg();
            if( typeof cfg.type !== 'function' ) {
                throw new Error( this.ERR_TYPE_NONEXISTENT.replace( "{0}", name ) );
            }
            if( cfg.initMethod ) {
                if( typeof cfg.initMethod !== 'string' ) {
                    throw new Error( this.ERR_INITMETHOD_NOT_STRING.replace( "{0}", name ) );
                }
                if( typeof cfg.type.prototype[ cfg.initMethod ] !== 'function' ) {
                    throw new Error( this.ERR_INITMETHOD_NONEXISTENT.replace( "{0}", name ) );
                }
            }

            // If a parent is declared, make sure it and all grandparents exist
            par = def;
            while( 'parent' in par.cfg ) {
                par = par.cfg.parent;
                if( typeof par !== 'string' ) {
                    throw new Error( this.ERR_PARENT_NOT_STRING.replace( "{0}", name ) );
                }
                if( !( this._defs[ par ] ) ) {
                    throw new Error( this.ERR_PARENT_NONEXISTENT.replace( "{0}", name ).replace( "{1}", par ) );
                }
                par = this._defs[ par ];
            }

            // Call through, adding debugging info
            try {
                obj = _get.call( this, name );
                obj.__wiring_name__ = name;
                obj.__wiring_config__ = cfg;
                return obj;
            } catch( e ) {
                e.__wiring_name__ = name;
                e.__wiring_config__ = cfg;
                throw e;
            }
        }
        else {
            return _get.call( this, name );
        }
    };

    /**
     * Override modify method to validate the def(s) being modified actually exist
     */
    proto.modify = function( def ) {
        for( var p in def ) {
            if( def.hasOwnProperty( p ) ) {
                if( !this._defs[ p ] ) {
                    throw new Error( this.ERR_MODIFY_NONEXISTENT.replace( "{0}", p ) );
                } else {
                    return _modify.call( this, def );
                }
            }
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