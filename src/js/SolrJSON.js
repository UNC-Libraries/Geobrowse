/**
 * Class: OpenLayers.Format.SolrJSON
 *
 * Inherits from:
 *  - <OpenLayers.Format.JSON>
 */
OpenLayers.Format.SolrJSON = OpenLayers.Class(OpenLayers.Format.JSON, {
    /**
     * Constructor: OpenLayers.Format.SolrJSON
     * Instances of this class are not useful.  See one of the subclasses.
     *
     * Parameters:
     * options - {Object} An optional object with properties to set on the
     *           format
     *
     * Valid options:
     * keepData - {Boolean} If true, upon <read>, the data property will be
     *     set to the parsed object (e.g. the json or xml object).
     *
     * Returns:
     * An instance of OpenLayers.Format
     */
//    initialize: function(options) {
//        OpenLayers.Format.JSON.prototype.initialize.apply(this, [options]);
//    },
    read: function(json, filter) {
        var results = [];
        var obj = null;
        if (typeof json == "string") {
            obj = OpenLayers.Format.JSON.prototype.read.apply(this,
                                                              [json, filter]);
        } else {
            obj = json;
        }
        if(!obj) {
            OpenLayers.Console.error("Bad JSON: " + json);
        } else {
            for (var prop in obj.grouped) {
                if (prop.substring(0,4) == 'hash') {
                    var g = obj.grouped[prop];
                    var count = g.doclist.numFound;
                    var hash = prop.substring(5);
                    var attributes = {'count': count, 'hash': hash};
                    var doc = g.doclist.docs.pop();
                    if (!doc)
                        continue;
                    var point = new OpenLayers.Geometry.Point(doc.lon, doc.lat);
                    results.push(new OpenLayers.Feature.Vector(point, attributes));
                }
            }
        }
        return results;
    },

    CLASS_NAME: "OpenLayers.Format.SolrJSON"
});