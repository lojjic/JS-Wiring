/*jslint browser: true, undef: true, evil: false
   onevar: true, debug: false, on: false, eqeqeq: true */

/**
 * <h1>Wiring: Dependency Injection for JavaScript</h1>
 *
 * <p>This is a lightweight dependency injection container for JavaScript objects.
 * It provides a simple mechanism for configuring object instances and how they
 * are wired together, so that those objects themselves do not have to contain
 * logic for creating/obtaining their dependencies.</p>
 *
 * <p>For an overview of dependency injection concepts, see
 * {@link http://en.wikipedia.org/wiki/Dependency_injection}</p>
 *
 * <p>This container is modeled loosely after Spring Framework's IoC container;
 * the biggest difference is that the configuration is done with a simple JavaScript
 * object structure rather than XML.  Like Spring it supports constructor-argument
 * injection and setter-method injection, but also supports direct property injection
 * which is more natural in the JavaScript world.  Like Spring, object definitions can
 * inherit from one another.  Unlike Spring, objects are not instantiated until they 
 * are requested directly or are required to satisfy another managed object's dependencies,
 * which improves performance.</p>
 *
 * <h2>Basic Usage</h2>
 *
 * <p>Objects are configured by calling <code>Wiring.add( defs )</code>, where
 * <code>defs</code> is an object containing one or more object definitions, each
 * identified by an arbitrary unique key. This key is used by other object definitions
 * when referencing dependencies.  Each definition specifies which JavaScript class
 * will be instantiated, and any constructor arguments and/or properties which will be
 * automatically injected.  A simple example:</p>
 *
 * <pre><code>Wiring.add( {
 *     myObject: {
 *         type: MyJSClass,
 *         properties: {
 *             someProp: 'some value'
 *         }
 *    }
 * } );</code></pre>
 *
 * <p>With the above example, when some piece of code calls <code>Wiring.get( 'myObject' )</code>,
 * the container will find this definition, create an instance of the <code>MyJSClass</code>
 * class, and sets that instance's <code>someProp</code> property to the string value 'some value'.</p>
 * 
 * <p>The real good stuff happens when you configure two or more objects and wire them together:</p>
 * 
 * <pre><code>Wiring.add( {
 *     objectOne: {
 *         type: MyJSClass,
 *         properties: {
 *             someProp: 'some value'
 *         }
 *     },
 *     objectTwo: {
 *         type: MyJSClass2,
 *         properties: {
 *             myDependency: 'ref:objectOne'
 *         }
 *     }
 * } );</code></pre>
 *
 * <p>Now when some piece of code calls <code>Wiring.get( 'myObjectTwo' )</code>, the container will
 * create a MyJSClass2 instance, then create a MyJSClass instance and inject its property, and then
 * inject the MyJSClass instance into the MyJSClass2 instance as its 'myDependency' property.</p>
 *
 * <p>This is the real utility of Dependency Injection: objectTwo only has to know that it has a
 * 'myDependency' property which is an instance or subclass of MyJSClass; it does not have to know
 * anything at all about how that dependency gets created, what exact concrete class was used to
 * construct it, or how it was configured.  It simply expects that the dependency will be provided
 * to it (aka "injected") by some external mechanism.</p>
 *
 * <h2>Definition Inheritance</h2>
 *
 * <p>TODO</p>
 *
 * <h2>Object Definition Structure</h2>
 *
 * <p>Below are all the possible properties of the definition object. When the value type "VALUE" is
 * referenced, this means that a property can have a value of:</p>
 * 
 * <ul>
 *     <li>A literal value: String, Number, or Boolean</li>
 *     <li>A value "placeholder". This is a String that begins with a prefix that has been registered
 *         with a ValueResolver, followed by a colon.  The placeholder string will be replaced by an
 *         expanded value returned by the <code>ValueResolver</code>.  By default the container understands 
 *         only the "ref:objectDefId" placeholder, which gets replaced by an instantiated and fully-configured
 *         object from another definition in the wiring container.  This is how managed objects are
 *         wired into other managed objects as dependencies.</li>
 *     <li>An Array or Object; when evaluated by the container these will be deep-copied into a new
 *         Array/Object.  During the copy each member will be treated as a VALUE of its own,
 *         allowing recursive value expansion.  In other words, value placeholders such as
 *         "ref:objectDefId" can occur at any depth in the object/array structure.
 * </ul>
 * 
 * <table>
 *     <thead>
 *         <tr>
 *             <th>Property</th>
 *             <th>Type</th>
 *             <th>Description</th>
 *         </tr>
 *     </thead>
 *     <tbody>
 *         <tr>
 *             <td>type</td>
 *             <td>Function</td>
 *             <td>The class which will be instantiated. Each definition is required to have
 *                 a type, though this property can be omitted on a definition that references
 *                 a parent if that parent declares its type.</td>
 *         </tr>
 *         <tr>
 *             <td>singleton</td>
 *             <td>Boolean</td>
 *             <td>Whether or not this object definition should behave like a singleton, i.e.
 *                 always return a single instance every time it is requested or required by
 *                 another object's dependencies. Defaults to true.</td>
 *         </tr>
 *         <tr>
 *             <td>parent</td>
 *             <td>String</td>
 *             <td>Declares that another object definition will serve as a parent to this
 *                 definition. The value must match the id of another configured definition.
 *                 If specified, all the configuration from the parent definition will be
 *                 inherited, and optionally overridden by corresponding configuration in
 *                 the child definition. Parent chains can be many deep.</td>
 *         </tr>
 *         <tr>
 *             <td>ctorArgs</td>
 *             <td>Array</td>
 *             <td>List of VALUEs that will be passed as arguments to the object constructor.</td>
 *         </tr>
 *         <tr>
 *             <td>properties</td>
 *             <td>Object</td>
 *             <td>A name-value mapping of property names to VALUEs. Each property will be
 *                 injected into the object after it is instantiated. If there is a "setter"
 *                 method on the object matching the property name (e.g. <code>setMyProp()</code>),
 *                 that method will be used to inject the value; otherwise the value will be set 
 *                 directly as a member property on the object.</td>
 *         </tr>
 *         <tr>
 *             <td>initMethod</td>
 *             <td>String</td>
 *             <td>If specified, the container will invoke a method of this name on the object
 *                 after it has been instantiated and fully injected.</td>
 *         </tr>
 *     </tbody>
 * </table>
 * 
 * <h2>Factories</h2>
 *
 * <p>TODO</p>
 * 
 * <h2>Custom <code>ValueResolver</code>s</h2>
 * 
 * <p>As mentioned above, in addition to the built-in "ref:objectDefId" placeholder, you can
 * create custom <code>ValueResolver</code>s and register them with arbitrary prefixes. For
 * example, you might want to define a "cfg:" placeholder which resolves configuration values
 * from some other configuration object. To do this, you would extend <code>Wiring.ValueResolver</code>
 * like so:</p>
 * 
 * <pre><code>function CfgResolver() {}
 * CfgResolver.prototype = new Wiring.ValueResolver();
 * CfgResolver.prototype.prefix = 'cfg';
 * CfgResolver.prototype.resolve = function( key ) {
 *     return someConfigObject.getConfigValue( key );
 * }
 * 
 * Wiring.addValueResolver( new CfgResolver() );</code></pre>
 * 
 * <p>Now any "cfg:" placeholders in object definitions will get their values from the CfgResolver.
 * This is a handy abstraction because the object configurations do not have to implement logic
 * concerning how to retrieve the values, and if the underlying source of the values changes then you
 * only have to modify the ValueResolver implementation and not the configurations themselves.</p>
 * 
 * <h2>WiringAware</h2>
 *
 * <p>TODO</p>
 * 
 * <h2>Examples</h2>
 *
 * <p>TODO</p>
 *
 */
var Wiring = (function() {

    /**
     * Utility for merging object properties.
     * Note this works for arrays too, by supplying an object with numeric
     * property names, e.g. merge( [1,2], {'1':'foo'} ) --> [1,'foo']; this
     * is useful for overriding individual ctorArgs
     * @return the first argument with any other arguments' properties merged in.
     */
    function merge( o1 /*, o2, o3, ...*/ ) {
        for( var i = 1, len = arguments.length, oN, p; i < len; i++ ) {
            oN = arguments[ i ];
            if( oN ) {
                for( p in oN ) {
                    if( oN.hasOwnProperty( p ) ) {
                        o1[ p ] = oN[ p ];
                    }
                }
            }
        }
        return o1;
    }


    /**
     * @class Wiring.WiringAware
     * Base class for objects that are aware of their Wiring environment.
     * When the Wiring environment constructs an instance of this class (or
     * a subclass) it will automatically inject itself as the 'wiring' property.
     */
    function WiringAware() {}
    WiringAware.prototype = {
        wiring: null
    };


    /**
     * @class Def (Internal) A single object wiring definition
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
            var i, v, p, idx, resolver, result;

            // Deep copy of array members
            if( Object.prototype.toString.call( val ) === '[object Array]' ) {
                result = [];
                for( i = 0; ( v = val[ i ] ); i++ ) {
                    result.push( this.expand( v ) );
                }
            }
            // Deep copy of complex object properties
            else if( typeof val === "object" && val !== null ) {
                result = {};
                for( p in val ) {
                    if( val.hasOwnProperty( p ) ) {
                        result[ p ] = this.expand( val[ p ] );
                    }
                }
            }
            // String values with "foo:" prefixes: if there is a matching registered
            // ValueResolver, invoke it and return the result
            else if( typeof val === "string" && ( idx = val.indexOf( ":" ) ) > 0 ) {
                resolver = this.wiring._resolvers[ val.substring( 0, idx ) ];
                result = ( resolver ? resolver.resolve( val.substring( idx + 1 ) ) : val );
            }
            // Everything else, just use literally
            else {
                result = val;
            }

            return result;
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
            var p, m, v, inst, i, len, args, argRefs,
                def = this.getCascadedDef(),
                defProps = def.properties;

            inst = this._instance;
            if( inst && def.singleton ) {
                return inst;
            }

            args = [];
            argRefs = [];

            len = def.ctorArgs.length;
            if( len > 0 ) {
                // Construct a new instance, passing along any ctorArgs.
                // Would be nice to find a less ugly way to do this, but I haven't found an
                // approach that doesn't result in an invalid prototype chain.
                for( i = 0; i < len; i++ ) {
                    args.push( this.expand( def.ctorArgs[ i ] ) );
                    argRefs.push( "a[" + i + "]" );
                }
                /*jslint evil: true */
                inst = ( new Function( 'T', 'a', "return new T(" + argRefs.join(',') + ")" ) )( def.type, args );
                // TODO implement protection against recursive ctorArgs 'ref:' values, which will cause an infinite loop
                /*jslint evil: false */
            } else {
                // Fast path for no-argument constructor
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
            for( p in defProps ) {
                if( defProps.hasOwnProperty( p ) ) {
                    m = inst[ "set" + p.charAt(0).toUpperCase() + p.substring(1) ];
                    v = this.expand( defProps[ p ] );
                    if( m && typeof m === "function" ) {
                        m.call( inst, v );
                    } else {
                        inst[ p ] = v;
                    }
                }
            }

            // Call initMethod if specified
            if( ( m = def.initMethod ) && ( m = inst[ m ] ) && typeof m === "function" ) {
                m.call( inst );
            }

            return inst;
        }
    };


    /**
     * @class Wiring.Factory
     * Simple object factory class, which creates instances based on
     * a given object definition template.
     */
    function Factory() {}
    Factory.prototype = merge( new WiringAware(), {
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
     * @class Wiring.ValueResolver
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
    ValueResolver.prototype = merge( new WiringAware(), {
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
     * @private
     */
    function RefResolver() {}
    RefResolver.prototype = merge( new ValueResolver(), {
        prefix: "ref",
        resolve: function( key ) {
            return this.wiring.get( key );
        }
    } );


    /**
     * The main wiring class
     */
    function W() {
        this._defs = {};
        this._resolvers = {};
        this.addValueResolver( new RefResolver() );
    }
    merge( W.prototype, {
        /**
         * Add a new object definition to this wiring container
         * @param def
         */
        add: function( def ) {
            for( var p in def ) {
                if( def.hasOwnProperty( p ) ) {
                    this._defs[ p ] = new Def( this, def[ p ] );
                }
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


    /* We return an instance of the wiring class rather than the class itself, since
     * most use cases will just want access to a single container. If for some reason
     * you need multiple containers, you can still instantiate new ones like so:
     * var otherWiring = new Wiring.constructor();
     */
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

