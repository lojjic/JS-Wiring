
var Wiring = (function() {

    /**
     * A single object wiring definition
     * @param {Wiring} wiring - the wiring object to which this definition belongs; used to
     *         look up other referenced definitions.
     * @param {Object} obj - the object definition.
     */
    function Def( wiring, obj ) {
        this.wiring = wiring;
        this.def = obj;
    }
    Def.defaults = {
        type: Object,
        singleton: true,
        ctorArgs: [],
        properties: {},
        initMethod: null,
        parent: null
    };
    Def.prototype = {
        /**
         * Expand a property or ctorArgs definition value into a real value that can be
         * injected into an object instance. Makes deep copies of arrays/objects, and
         * dereferences "ref:*" string values to other wired instances.
         */
        expand: function( val ) {
            var idx, res;
            // Deep copy of array members
            if( Object.prototype.toString.call( val ) == '[object Array]' ) {
                var arr = [], i, v;
                for( i = 0; v = val[ i ]; i++ ) {
                    arr.push( this.expand( v ) );
                };
                return arr;
            }
            // Deep copy of complex object properties
            else if( typeof val == "object" && val !== null ) {
                var obj = {}, p;
                for( p in val ) {
                    obj[ p ] = this.expand( val[ p ] );
                }
                return obj;
            }
            // String values with "foo:" prefixes: if there is a matching registered
            // ValueResolver, invoke it and return the result
            else if( typeof val == "string" && ( idx = val.indexOf( ":" ) ) > 0 ) {
                res = this.wiring._resolvers[ val.substring( 0, idx ) ];
                return ( res ? res.resolve( val.substring( idx + 1 ) ) : val );
            }
            // Everything else, just use literally
            else {
                return val;
            }
        },

        /**
         * Retrieve the Def object for the object definition referred to by
         * this def's 'parent' property, or null if no parent is configured.
         */
        getParent: function() {
            var p = this.def.parent;
            return ( p && this.wiring._defs[ p ] ) || null;
        },

        /**
         * Calculate and return a full definition template object, inheriting from
         * any configured parent definitions.  The resulting value will be cached
         * for performance on subsequent calls.
         * @return Object
         */
        getCascadedDef: function() {
            var cache = '_cascadedDef', def, par, casc;
            if( !( cache in this ) ) {
                def = this.def;
                par = this.getParent();
                if( par ) {
                    par = par.getCascadedDef();
                    casc = merge( {}, par, def );
                    casc.ctorArgs = merge( [], par.ctorArgs, def.ctorArgs );
                    casc.properties = merge( {}, par.properties, def.properties );
                    return casc;
                }
                this[ cache ] = merge( {}, Def.defaults, def );
            }
            return this[ cache ];
        },

        /**
         * Obtain an instance of this def's target class, with all configured dependencies
         * fully expanded and injected.  If the def is configured to be a singleton then
         * the instance will be cached and returned directly upon subsequent calls.  If
         * there is a configured initMethod then it will be invoked.
         * @return Object
         */
        getInstance: function() {
            var def = this.getCascadedDef();

            if( this._instance && def.singleton ) {
                return this._instance;
            }

            var p, m, v, inst,
                args = [], argRefs = [];

            if( def.ctorArgs.length > 0 ) {
                // Construct a new instance, passing along any ctorArgs.
                // Would be nice to find a less ugly way to do this, but I haven't found an
                // approach that doesn't result in an invalid prototype chain.
                for( var i = 0, len = def.ctorArgs.length; i < len; i++ ) {
                    args.push( this.expand( def.ctorArgs[ i ] ) );
                    argRefs.push( "a[" + i + "]" );
                }
                inst = ( new Function( 'T', 'a', "return new T(" + argRefs.join(',') + ")" ) )( def.type, args );
                // TODO implement protection against recursive ctorArgs 'ref:' values, which will cause an infinite loop
            } else {
                inst = new def.type();
            }

            if( def.singleton ) {
                this._instance = inst;
            }

            // If it is WiringAware, automatically inject the Wiring object
            if( inst instanceof WiringAware ) {
                inst.wiring = this.wiring;
            }

            // Set properties - if there is a setter method it will be used, otherwise
            // the raw property is set directly.
            for( p in def.properties ) {
                m = inst[ "set" + p.charAt(0).toUpperCase() + p.substring(1) ];
                v = this.expand( def.properties[p] );
                if( m && typeof m == "function" ) {
                    m.call( inst, v );
                } else {
                    inst[ p ] = v;
                }
            }

            // Call initMethod if specified
            if( ( m = def.initMethod ) && ( m = inst[ m ] ) && typeof m == "function" ) {
                m.call( inst );
            }

            return inst;
        }
    };


    /**
     * Utility for merging object properties.
     * Note this works for arrays too, by supplying an object with numeric
     * property names, e.g. merge( [1,2], {'1':'foo'} ) --> [1,'foo']; this
     * is useful for overriding individual ctorArgs
     * @return the first argument with any other arguments' properties merged in.
     */
    function merge( o1 /*, o2, o3, ...*/ ) {
        for( var i = 1, len = arguments.length; i < len; i++ ) {
            var oN = arguments[ i ], p;
            if( oN ) {
                for( p in oN ) {
                    o1[ p ] = oN[ p ];
                }
            }
        }
        return o1;
    }


    /**
     * Base class for objects that are aware of their Wiring environment.
     * When the Wiring environment constructs an instance of this class (or
     * a subclass) it will automatically inject itself as the 'wiring' property.
     */
    function WiringAware() {}
    WiringAware.prototype = {
        wiring: null
    };


    /**
     * Simple object factory class, which creates instances based on
     * a given object definition template.
     */
    function Factory() {}
    Factory.prototype = merge( new WiringAware, {
        refId: null,

        /**
         * Create and return an instance of the factory's target, optionally specifying
         * configuration properties to be overridden for this particular instance.
         * Note that if you supply overrides, the object definition will be treated as
         * non-singleton (a new instance will be created for each call) regardless of
         * whether the target definition is configured as a singleton or not.
         * @param {Object} overrides - Optional object definition containing aspects
         *        of the target definition to be overridden, such as ctorArgs or properties.
         */
        createInstance: function( overrides ) {
            if( overrides ) {
                var obj = merge( {}, overrides, { parent: this.refId } ),
                    def = new Def( this.wiring, obj );
                return def.getInstance();
            }
            return this.wiring.get( this.refId );
        }
    } );


    /**
     * Base class for resolving values from a key. When an object which inherits from this class
     * is added to the Wiring container, then its prefix will be registered to identify wired
     * values which should be resolved rather than used literally.  Matching values must be
     * strings beginning with the prefix and followed by a colon; everything after the colon
     * will be used as the key passed to the .resolve() method.
     * See also the RefResolver subclass, which is automatically registered to enable "ref:" values.
     * Other implementations may be added by the application, for instance a "config:" resolver
     * for resolving config entries or a "msg:" resolver for resolving localized strings.
     */
    function ValueResolver() {}
    ValueResolver.prototype = merge( new WiringAware, {
        /**
         * The prefix that will be used to trigger this ValueResolver
         */
        prefix: "",

        /**
         * Resolve and return the value for the given key
         * @param {String} key - The key to resolve
         * @return {Object} The resolved value
         */
        resolve: function( key ) {
            return key;
        }
    } );

    /**
     * Built-in ValueResolver implementation which resolves string values starting with
     * "ref:" to instances of other wired objects.  The value following the "ref:" prefix
     * will be used to identify the wired object to resolve and be set as the value.
     * An instance of this resolver will automatically be registered with the Wiring
     * container; to override it simply register another resolver with the same prefix.
     */
    function RefResolver() {}
    RefResolver.prototype = merge( new ValueResolver, {
        prefix: "ref",
        resolve: function( key ) {
            return this.wiring.get( key );
        }
    } );


    /**
     * Main wiring class
     */
    function W() {
        this._defs = {};
        this._resolvers = {};
        this.addValueResolver( new RefResolver );
    }
    merge( W.prototype, {
        /**
         * Add a new object definition to this wiring container
         * @param def
         */
        add: function( def ) {
            for( var p in def ) {
                this._defs[ p ] = new Def( this, def[ p ] );
            }
        },

        /**
         * Retrieve a fully expanded instance of an object definition, with all its
         * configured dependencies injected.
         * @param {String} name - The name of the object configuration
         */
        get: function( name ) {
            var def = this._defs[ name ];
            return ( def ? def.getInstance() : null );
        },

        /**
         * Add a ValueResolver instance to be registered for handling prefixed string values
         * @param {Wiring.ValueResolver} resolver
         */
        addValueResolver: function( resolver ) {
            resolver.wiring = this; //ValueResolver is WiringAware
            this._resolvers[ resolver.prefix ] = resolver;
        },

        WiringAware: WiringAware,
        Factory : Factory,
        ValueResolver: ValueResolver
    } );

    return new W();
})();






/*
Wiring.add( {
    poiFactory: {
        type: Wiring.Factory,
        properties: {
            refId: 'poi'
        }
    },

    poi: {
        type: LMI.Mapping.EDDKFindOnMapPoi,
        singleton: false,
        flyoutFactory: "ref:flyoutFactory"
    },

    flyoutFactory: {
        type: Wiring.Factory,
        properties: {
            refId: "flyout"
        }
    },

    flyout: {
        type: LMI.Mapping.EDDKListingFlyout,
        singleton: false,
        properties: {
            contentBuilders: [
                "ref:flyoutAddressBuilder",
                "ref:flyoutActionsBuilder",
                "ref:flyoutFindNearbyBuilder",
                "ref:flyoutRatingsBuilder"
            ]
        }
    },

    specialFlyout: {
        parent: 'flyout'
    },

    map: {
        type: LMI.Mapping.EDDKMap,
        properties: {
            controls: [ "ref:zoomControl", "ref:panControl" ]
        }
    },

    zoomControl: {
    },

    panControl: {
    }
} );



// Page script, reformulated as a class so it can have values injected.
// Ideally this configuration should be in a separate file than the
// page script itself, so it can be easily reconfigured while leaving the
// logic in the parent project.
// Note: Something will still have to invoke instantiation of this object by
// calling Wiring.get('mapSearch') ... or should we add a configuration
// option like 'createOnLoad:true' to automatically trigger instantiatiion
// when the dom is loaded?
Wiring.add( {
    mapSearch: {
        type: LMI.MapSearch,
        properties: {
            map: "ref:map",
            poiFactory: "ref:poiFactory",
            listings: LMI.Data.listings
        },
        initMethod: "init"
    }
} );


// Sample of a ValueResolver for localized message strings:
function MessageResolver() {};
YAHOO.lang.extend( MessageResolver, Wiring.ValueResolver, {
    prefix: "msg",
    resolve: LMI.Strings.getString
} );
Wiring.addValueResolver( new MessageResolver );


*/

