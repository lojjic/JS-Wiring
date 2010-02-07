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
 * <h1>JS Wiring: Dependency Injection for JavaScript</h1>
 *
 * <p>This is a lightweight dependency injection container for JavaScript objects.
 * It provides a simple mechanism for configuring object instances and how they
 * are wired together, so that those objects themselves do not have to contain
 * logic for creating/obtaining their dependencies.</p>
 *
 * <p>For an overview of dependency injection concepts, see
 * http://en.wikipedia.org/wiki/Dependency_injection</p>
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
 *             myDependency: '{ref:objectOne}'
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
 *     <li>A value "placeholder". This is a String that begins and ends with curly braces and contains a prefix that
 *         matches that of a registered ValueResolver instance.  The placeholder string will be replaced by an
 *         expanded value returned by the <code>ValueResolver</code>.  By default the container understands 
 *         only the "{ref:objectDefId}" placeholder, which gets replaced by an instantiated and fully-configured
 *         object from another definition in the wiring container.  This is how managed objects are
 *         wired into other managed objects as dependencies.</li>
 *     <li>An Array or Object; when evaluated by the container these will be deep-copied into a new
 *         Array/Object.  During the copy each member will be treated as a VALUE of its own,
 *         allowing recursive value expansion.  In other words, value placeholders such as
 *         "{ref:objectDefId}" can occur at any depth in the object/array structure.
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
 *             <td>Function or String</td>
 *             <td>The class which will be instantiated. If not specified for a definition or
 *                 any of its parents, will default to <code>Object</code>. This can be set to
 *                 a String whose value is the fully-qualified (dot-separated only) name of the
 *                 class's constructor function, which will be evaluated upon object request.</td>
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
 * <h2>Merging</h2>
 *
 * <p>Sometimes when you have a child definition inheriting from a parent definition, you want that
 * child definition's properties or constructor arguments to be merged with the corresponding
 * properties or constructor arguments in the parent definition, rather than overriding them.
 * This is particularly useful for array items, where you want to have a base set of members
 * defined in the parent, and let the child definition add to that list.</p>
 *
 * <p>To support this, you can use the <code>merge</code> function to mark an object or array
 * property or constructor argument so that it will be merged with its parent.  If used on an
 * Object, its properties will be merged with the corresponding Object in its parent.  If used
 * on an Array, the items of the child Array will be appended to the items of the corresponding
 * Array in its parent.  For example:</p>
 *
 * <pre><code>Wiring.add( {
 *     parentObject: {
 *         properties: {
 *             objectProp: { parentProp: 'foo' },
 *             arrayProp: [ 'parentMember' ]
 *         }
 *     },
 *     childObject: {
 *         properties: {
 *             objectProp: Wiring.merge( { childProp: 'bar' } ),
 *             arrayProp: Wiring.merge( [ 'childMember' ] )
 *         }
 *     }
 * } );</code></pre>
 *
 * <p>With the definitions above, when <code>childObject</code> is created it will result in
 * the following structure:</p>
 *
 * <pre><code>{
 *     "objectProp": { "parentProp": "foo", "childProp": "bar" },
 *     "arrayProp": [ "parentMember", "childMember" ]
 * }</code></pre>
 * 
 * <h2>Factories</h2>
 *
 * <p>While the dependency injection pattern is great for configuring single dependencies
 * which are created once up-front, it does not handle the common case where an object needs to
 * be able to create multiple instances of another class on-the-fly dependent on runtime data.
 * We need a mechanism by which dependencies can be instantiated on demand and still themselves
 * be configured by the wiring container.</p>
 *
 * <p>To handle this, you can use <code>Wiring.Factory</code>. This is a very simple class with
 * a single <code>refId</code> property, which you will configure to point to the object definition
 * that will be instantiated, and a single <code>createInstance</code> method which the controlling
 * code will invoke to create an instance. An example:</p>
 *
 * <pre><code>Wiring.add( {
 *     objectOne: {
 *         type: MyJSClass,
 *         singleton: false,
 *         properties: {
 *             prop1: 'some value 1'
 *             prop2: 'some value 2'
 *         }
 *     },
 *     objectTwo: {
 *         type: MyJSClass2,
 *         properties: {
 *             myFactory: '{ref:objectOneFactory}'
 *         }
 *     },
 *     objectOneFactory: {
 *         type: Wiring.Factory,
 *         properties: {
 *             refId: 'objectOne'
 *         }
 *     }
 * } );</code></pre>
 *
 * <p>This configures objectTwo with a Factory instance, which it can use to create as many instances
 * of fully-configured MyJSClass objects as it needs, by calling <code>this.myFactory.createInstance()</code>.
 * It can also optionally pass along an object argument to the <code>createInstance</code> method; this
 * object can follow the same structure as a normal object definition (see section "Object Definition
 * Structure" above) and allows you to override individual aspects of the main object definition. For
 * instance:</p>
 *
 * <pre><code>this.myFactory.createInstance( { properties: { prop1: 'some other value' } } )</code></pre>
 *
 * <p>This call will return an instance of MyJSClass with properties prop1='some other value' and prop2='some value 2'.</p>
 * 
 * <h2>Custom ValueResolvers</h2>
 * 
 * <p>As mentioned above, in addition to the built-in "{ref:objectDefId}" placeholder, you can
 * create custom <code>ValueResolver</code>s and register them with arbitrary prefixes. For
 * example, you might want to define a "{cfg:foo}" placeholder which resolves configuration values
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
 * <p>Now any "{cfg:foo}" placeholders in object definitions will get their values from the CfgResolver.
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
    var OBJECT = Object,
        NULL = null,
        TOSTRING = OBJECT.prototype.toString;

    /**
     * Array detection utility
     * @param {Object} val
     */
    function isArray( val ) {
        return TOSTRING.call( val ) === '[object Array]';
    }


    /**
     * Wrapper class for an object or array to mark it as mergeable; used by the
     * 'merge' function below to merge object or array properties into their
     * parent properties rather than overriding them.
     */
    function Mergeable( obj ) {
        this.object = obj;
    }

    /**
     * Utility for merging object properties.
     * Note this works for arrays too, by supplying an object with numeric
     * property names, e.g. merge( [1,2], {'1':'foo'} ) --> [1,'foo']; this
     * is useful for overriding individual ctorArgs
     * @return the first argument with any other arguments' properties merged in.
     */
    function merge( o1 /*, o2, o3, ...*/ ) {
        var i = 1, len = arguments.length,
            oN, p, o1Val, oNVal;
        for( ; i < len; i++ ) {
            oN = arguments[ i ];
            if( oN ) {
                for( p in oN ) {
                    if( oN.hasOwnProperty( p ) ) {
                        oNVal = oN[ p ];
                        // If object is a Mergeable wrapper, unwrap and merge the properties
                        if( oNVal instanceof Mergeable ) {
                            oNVal = oNVal.object;
                            if( p in o1 && ( o1Val = o1[ p ] ) ) {
                                oNVal = ( isArray( o1Val ) && isArray( oNVal ) ) ?
                                        o1Val.concat( oNVal ) :
                                        merge( {}, o1Val, oNVal );
                            }
                        }
                        o1[ p ] = oNVal;
                    }
                }
            }
        }
        return o1;
    }

    /**
     * Simple class extension utility
     */
    function extend( subc, superc, overrides ) {
        var F = function() {},
            PROTO = 'prototype';
        F[ PROTO ] = superc[ PROTO ];
        subc[ PROTO ] = merge( new F(), overrides );
        subc[ PROTO ].constructor = subc;
    }


    /**
     * Resolve a fully-qualified object name into that object. This is a very
     * simple implementation and only handles dot-separated object paths, to
     * avoid potential complications with eval'ing strings.
     * @param {String} str
     */
    function strToObj( str ) {
        var obj = this,
            parts = str.split( '.' ),
            i = 0, len = parts.length;
        for( ; i < len; i++ ) {
            obj = obj[ parts[ i ] ];
        }
        return obj;
    }


    /**
     * @class Wiring.WiringAware
     * Base class for objects that are aware of their Wiring environment.
     * When the Wiring environment constructs an instance of this class (or
     * a subclass) it will automatically inject itself as the 'wiring' property.
     */
    function WiringAware() {}
    extend( WiringAware, OBJECT, {
        wiring: NULL
    } );


    /**
     * @class Def (Internal) A single object wiring definition
     * @param {Wiring} wiring - the wiring object to which this definition belongs; used to
     *         look up other referenced definitions.
     * @param {Object} cfg - the object configuration.
     */
    function Def( wiring, cfg ) {
        this.wiring = wiring;
        this.cfg = cfg;
    }
    Def.defaults = {
        type: OBJECT,
        singleton: true,
        ctorArgs: [],
        properties: {},
        initMethod: NULL,
        parent: NULL
    };
    Def.PLACEHOLDER_RE = /^\{(\w+):(.+)\}$/;
    extend( Def, OBJECT, {
        /**
         * modify the current object definition
         */
        modify: function( def ) {
            merge( this.cfg, def );
        },

        /**
         * Expand a property or ctorArgs definition value into a real value that can be
         * injected into an object instance. Makes deep copies of arrays/objects, and
         * dereferences placeholder string values by invoking the matching ValueResolver.
         */
        expand: function( val ) {
            var i, v, p, phMatch, resolver, result;

            // Deep copy of array members
            if( isArray( val ) ) {
                result = [];
                for( i = 0; ( v = val[ i ] ); i++ ) {
                    result.push( this.expand( v ) );
                }
            }
            // Deep copy of complex object properties
            else if( typeof val === "object" && val !== NULL ) {
                result = {};
                for( p in val ) {
                    if( val.hasOwnProperty( p ) ) {
                        result[ p ] = this.expand( val[ p ] );
                    }
                }
            }
            // String values matching placeholder regexp: if there is a matching registered
            // ValueResolver for the placeholder's prefix, invoke it and return the result
            else if( typeof val === "string" && ( phMatch = val.match( Def.PLACEHOLDER_RE ) ) ) {
                resolver = this.wiring._resolvers[ phMatch[1] ];
                result = ( resolver ? resolver.resolve( phMatch[2] ) : val );
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
            var p = this.cfg.parent;
            return ( p && this.wiring._defs[ p ] ) || NULL;
        },

        /**
         * Calculate and return a full configuration object, inheriting from
         * any configured parent definitions.  The resulting value will be cached
         * for performance on subsequent calls.
         * @return Object
         */
        getCascadedCfg: function() {
            var cache = '_cascCfg', cfg, par, casc,
                obj = this[ cache ];
            if( !obj ) {
                cfg = this.cfg;
                par = this.getParent();
                if( par ) {
                    par = par.getCascadedCfg();
                    casc = merge( {}, par, cfg );
                    casc.ctorArgs = merge( [], par.ctorArgs, cfg.ctorArgs );
                    casc.properties = merge( {}, par.properties, cfg.properties );
                    cfg = casc;
                }
                obj = this[ cache ] = merge( {}, Def.defaults, cfg );

                // If the 'type' is a string, attempt to resolve it to an object
                if( typeof obj.type === 'string' ) {
                    obj.type = strToObj( obj.type );
                }
            }
            return obj;
        },

        /**
         * Obtain an instance of this def's target class, with all configured dependencies
         * fully expanded and injected.  If the def is configured to be a singleton then
         * the instance will be cached and returned directly upon subsequent calls.  If
         * there is a configured initMethod then it will be invoked.
         * @return Object
         */
        getInstance: function() {
            var p, m, v, inst, tempCtor,
                cfg = this.getCascadedCfg(),
                cfgProps = cfg.properties,
                cfgCtor = cfg.type,
                cfgCtorArgs = cfg.ctorArgs,
                func = 'function';

            inst = this._instance;
            if( inst && cfg.singleton ) {
                return inst;
            }

            if( cfgCtorArgs.length > 0 ) {
                // Construct a new instance, passing along any ctorArgs. Instantiate the
                // object using an empty constructor, then call apply on the real constructor;
                // this allows us to use a ctor argument list of unknown length and still
                // maintain the correct prototype chain.
                tempCtor = function() {};
                tempCtor.prototype = cfgCtor.prototype;
                inst = new tempCtor();
                cfgCtor.apply( inst, this.expand( cfgCtorArgs ) );
            } else {
                // Fast path for no-argument constructor
                inst = new cfgCtor();
            }

            if( cfg.singleton ) {
                this._instance = inst;
            }

            // If it is WiringAware, automatically inject the Wiring object
            if( inst instanceof WiringAware ) {
                inst.wiring = this.wiring;
            }

            // Set properties - if there is a setter method it will be used, otherwise
            // the raw property is set directly.
            for( p in cfgProps ) {
                if( cfgProps.hasOwnProperty( p ) ) {
                    m = inst[ "set" + p.charAt(0).toUpperCase() + p.substring(1) ];
                    v = this.expand( cfgProps[ p ] );
                    if( m && typeof m === func ) {
                        m.call( inst, v );
                    } else {
                        inst[ p ] = v;
                    }
                }
            }

            // Call initMethod if specified
            if( ( m = cfg.initMethod ) && ( m = inst[ m ] ) && typeof m === func ) {
                m.call( inst );
            }

            return inst;
        }
    } );


    /**
     * @class Wiring.Factory
     * Simple object factory class, which creates instances based on
     * a given object definition template.
     */
    function Factory() {}
    extend( Factory, WiringAware, {
        refId: NULL,

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
     * is registered with the Wiring container via Wiring.addValueResolver, then when a "{prefix:key}"
     * placeholder string value is encountered in an object definition, the container will look for
     * a registered ValueResolver which matches the prefix, and invoke its 'resolve' method using the
     * placeholder's key.
     * See also the RefResolver subclass, which is automatically registered to enable "{ref:*}" values
     * for dereferencing other object instances from the wiring container.
     * Other implementations may be added by the application, for instance a "{cfg:*}" resolver
     * for resolving config entries or a "{msg:*}" resolver for resolving localized strings.
     */
    function ValueResolver() {}
    extend( ValueResolver, WiringAware, {
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
     * "{ref:*}" to instances of other wired objects.  The value following the prefix
     * will be used to identify the wired object to resolve and be set as the value.
     * An instance of this resolver will automatically be registered with the Wiring
     * container; to override it simply register another resolver with the same prefix.
     * @private
     */
    function RefResolver() {}
    extend( RefResolver, ValueResolver, {
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
    extend( W, OBJECT, {
        /**
         * Add one or more new object definitions to this wiring container
         * @param {Object} def
         */
        add: function( def ) {
            for( var p in def ) {
                if( def.hasOwnProperty( p ) ) {
                    this._defs[ p ] = new Def( this, def[ p ] );
                }
            }
        },

        /**
         * Modify one or more existing object definitions in this wiring container.
         * @param {Object} def
         */
        modify: function( def ) {
            for( var p in def ) {
                if( def.hasOwnProperty( p ) ) {
                    this._defs[ p ].modify( def[ p ] );
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
            return ( def ? def.getInstance() : NULL );
        },

        /**
         * Determine if a specific object name is configured
         * @param {String} name - The name of the object configuration
         */
        isDefined: function( name ) {
            return !!this._defs[ name ];
        },

        /**
         * Add a ValueResolver instance to be registered for handling placeholder string values
         * @param {Wiring.ValueResolver} resolver
         */
        addValueResolver: function( resolver ) {
            resolver.wiring = this; //ValueResolver is WiringAware
            this._resolvers[ resolver.prefix ] = resolver;
        },

        /**
         * Mark an object or array so that it will be merged with its corresponding value
         * in its parent definition rather than overwriting it.
         * @param {Object|Array} obj The object to be marked
         */
        merge: function( obj ) {
            return new Mergeable( obj );
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
