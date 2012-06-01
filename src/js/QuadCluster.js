
define(function(){

/**
 * Class: OpenLayers.Strategy.QuadCluster
 * A strategy that requests quadtree clusters from Solr.
 *
 * Inherits from:
 *  - <OpenLayers.Strategy>
 */
OpenLayers.Strategy.QuadCluster = OpenLayers.Class(OpenLayers.Strategy, {
    /**
     * Constructor: OpenLayers.Strategy.QuadCluster
     * Create a new QuadCluster strategy.
     *
     * Parameters:
     * options - {Object} Optional object whose properties will be set on the
     *     instance.
     */

    /**
     * Property: recenter
     * {Boolean} Whether to recenter/rezoom map to focus on visible clusters.
     */
    recenter: true,

    /**
     * Property: bounds,
     * {OpenLayers.Bounds} Optionally, provide extent which should be used for
     *      query when the layer is initially loaded.
     */
    bounds: null,

    /**
     * Property: zoom
     * {Number} If bounds is provided, optionally, also provide a zoom level that
     *      should be used for a query when the layer is initially loaded.
     */
    zoom: null,

    /**
     * Property: zoomOffset,
     * {Number} Optionally, provide an offset for getting hashes for a zoom level.
     *      For example, setting this to 2 would request hashes for 2 zoom levels
     *      above the current zoom level.
     */
    zoomOffset: 0,

    /**
     * Method: initialize
     * Initialize the strategy.
     *
     * Parameters:
     * options - {Object} Optional properties that will be passed to the
     *      constructor.
     */
    initialize: function(options) {
        OpenLayers.Strategy.prototype.initialize.apply(this, [options]);
    },

    /**
     * Method: activate
     * Activate the strategy: add listener to load when refreshed
     *
     * Returns:
     * {Boolean} True if the strategy was successfully activated or false if
     *      the strategy was already active.
     */
    activate: function() {
        if(OpenLayers.Strategy.prototype.activate.call(this)) {
            this.layer.events.on({
                "refresh": this.load,
                scope: this
            });
            return true;
        }
        return false;
    },

     /**
     * Method: load
     * Requests new set of quad clusters from Solr.
     *
     * Parameters:
     * options - {Object} Optional properties that will be passed to the
     *      protocol's read method.
     */
    load: function(options) {
        var layer = this.layer;
        var hashes = this.getHashes(this.bounds, this.zoom);
        for (var i=0; i<hashes.length; i++) {
            hashes[i] = 'group.query=hash:'+hashes[i]+'*';
        }
        hashes.push('group=true');
        var qstring = hashes.join("&")
        var requrl = OpenLayers.Util.urlAppend(layer.protocol.url, qstring);
        options = OpenLayers.Util.applyDefaults(options, {url: requrl})
        layer.events.triggerEvent("loadstart");
        layer.protocol.read(OpenLayers.Util.applyDefaults({
            callback: OpenLayers.Function.bind(this.merge, this,
                layer.map.getProjectionObject()),
            filter: layer.filter
        }, options));
        layer.events.un({
            "visibilitychanged": this.load,
            scope: this
        });
        /*
         * Map should recenter/zoom only the first time this layer loads.
         */
        this.recenter = this.bounds = this.zoom = null;
    },

    /**
     * Method: merge
     * Add all features to the layer.
     *
     * Parameters:
     * mapProjection - {OpenLayers.Projection} the map projection
     * resp - {Object} options to pass to protocol read.
     */
    merge: function(mapProjection, resp) {
        var layer = this.layer;
        layer.destroyFeatures();
        var features = resp.features;
        if (features && features.length > 0) {
            if(!mapProjection.equals(layer.projection)) {
                var geom;
                for(var i=0, len=features.length; i<len; ++i) {
                    geom = features[i].geometry;
                    if(geom) {
                        geom.transform(layer.projection, mapProjection);
                    }
                }
            }
            layer.addFeatures(features);
        }
        layer.events.triggerEvent("loadend");
    },

    /**
     * APIMethod: deactivate
     * Deactivate the strategy.  Unregister any listeners, do appropriate
     *     tear-down.
     *
     * Returns:
     * {Boolean} The strategy was successfully deactivated.
     */
    deactivate: function() {
        if(OpenLayers.Strategy.prototype.deactivate.apply(this, arguments)) {
            this.layer.events.un({
                "refresh": this.load,
                "visibilitychanged": this.load,
                scope: this
            });
            return true;
        }
        return false;
    },

    /**
     * Method: getHash
     * Finds the hash for a given lat/lon and precision.
     *
     * Parameters:
     * point - {OpenLayers.LonLat}
     * precision - {number} i.e. length of hash
     *
     * Returns:
     * {String} Base4 encoded hash
     */
    getHash: function(point, precision) {
        var n = 1<<precision;
        var lat = Math.floor(n*(point.lat+90.0)/180.0);
        var lon = Math.floor(n*(point.lon+180.0)/360.0);
        var hash = '';
        while (precision > 0) {
            hash += (((lat&1)<<1)+(lon&1));
            lat = lat>>1;
            lon = lon>>1;
            precision -= 1;
        }
        return hash.split("").reverse().join("");
    },

    /**
     * Method: splitHash
     * Splits a hash into an x,y tile location on a quadtree grid with bottom
     *  left tile at (0,0).
     *
     * Parameters:
     * hash - {String}
     *
     * Returns:
     * {Object} An object with x and y properties
     */
    splitHash: function(hash) {
        var tile = {};
        tile.x='', tile.y='';
        while (hash) {
            var quad = hash.charAt(0);
            tile.y += quad>>1;
            tile.x += quad&1;
            hash = hash.slice(1);
        }
        tile.x = parseInt(tile.x, 2);
        tile.y = parseInt(tile.y, 2);
        return tile;
    },

    /**
     * Method: getMorton
     * Creates a hash given an x,y tile location on a quadtree grid with bottom
     *  left tile at (0,0).
     *
     * Parameters:
     * x - {Number}
     * y - {Number}
     *
     * Returns:
     * {String} The Morton number for the given ints
     */
    getMorton: function(x, y) {
        x = x.toString(2);
        y = y.toString(2);
        var lenx = x.length - 1;
        var leny = y.length - 1;
        var max = Math.max(lenx, leny);
        var morton = 0;
        for (var i=0; i<=max; i++) {
            var xi = (i-1 < lenx) ? parseInt(x.charAt(lenx-i)) : 0;
            var yi = (i-1 < leny) ? parseInt(y.charAt(leny-i)) : 0;
            morton += Math.pow(2, (2*i)) * xi + Math.pow(2, (2*i+1)) * yi;
        }
        return morton.toString(4);
    },

    /**
     * Method: getHashes
     * Determines which quadtree tiles are visible based on the visible extent
     *  of the map.
     *
     * Parameters:
     * iBounds - {OpenLayers.Bounds} Optionally, get the hashes for a specified
     *      bounds rather than the visible extent of the map.
     * iZoom - {Number} In addition to the optional bounds parameter, specify a
     *      zoom level. If bounds is specified without zoom, a reasonable zoom
     *      is chosen.
     * Returns:
     * {Object} An array of hashstrings
     */
    getHashes: function(iBounds, iZoom) {
        var layer = this.layer;
        var extent, zoom;
        if (iBounds && this.recenter) {
            extent = iBounds;
            var tsfmExtent = extent.clone().transform(
                new OpenLayers.Projection('EPSG:4326'),
                new OpenLayers.Projection('EPSG:900913')
            );
            if (iZoom) {
                zoom = iZoom;
            } else {
                zoom = layer.map.getZoomForExtent(tsfmExtent);
            }
        } else if (layer.map && 'getExtent' in layer.map) {
            extent = layer.map.getExtent().transform(
                new OpenLayers.Projection('EPSG:900913'),
                new OpenLayers.Projection('EPSG:4326'));
        } else {
            extent = new OpenLayers.Bounds(-180, -89, 180, 89);
        }
        /*
         * Determine effective zoom level we will be requesting hashes for.
         * This should be between 3 and 17.
         */
        zoom = parseInt(zoom || layer.map.getZoom() || 0) + this.zoomOffset;
        if (zoom < 3) zoom = 3;
        if (zoom > 17) zoom = 17;
        var quadsize = 90 / Math.pow(2,zoom); //size of quad along y for zoom

        if (this.recenter) {
            extent.extend(new OpenLayers.Bounds(
                extent.left - quadsize*2,
                extent.bottom - quadsize,
                extent.right + quadsize*2,
                extent.top + quadsize)
            );
        }

        /*
         * Because of the date line we need to figure out the total degrees of
         *  longitude visible to determine how many quads to request along the
         *  x axis. Along the y axis we can just get the quad from the top left
         *  corner and the quad from the bottom left corner and grab everything
         *  in between.
         */
        var deltaLon = Math.abs(extent.right - extent.left); //I think this should work
        if (deltaLon > 360) {
            extent.left = -180, extent.right = 180;
            deltaLon = 360;
        }
        extent.top = Math.min(extent.top, 89);
        extent.bottom = Math.max(extent.bottom, -89);
        var maxquadx = Math.pow(2, zoom); //total possible quads in any direction
        var numquadx = Math.ceil(deltaLon/360.0*maxquadx); //total quads along x


        var hashsw = this.getHash(
                new OpenLayers.LonLat(extent.left, extent.bottom), zoom);
        var hashnw = this.getHash(
                new OpenLayers.LonLat(extent.left, extent.top), zoom);
        var pointsw = this.splitHash(hashsw);
        var pointnw = this.splitHash(hashnw);
        var bottom = pointsw.y;
        var top = pointnw.y;

        var hashes = [];
        for (var y = bottom; y <= top; y++) {
            var l = pointsw.x;
            for (var x = 0; x < numquadx; x++) {
                var hash = this.getMorton(l, y);
                while (hash.length < zoom) {
                    hash = '0' + hash;
                }
                hashes.push(hash);
                //this will allow us to wrap around the date line
                l = ++l % maxquadx;
            }
        }
        return hashes;
    },

    CLASS_NAME: "OpenLayers.Strategy.QuadCluster"
});

});