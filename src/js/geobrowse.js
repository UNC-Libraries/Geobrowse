
/**
 * geobrowse.js - initializes geobrowse map
 * 
 * This module configures and initializes the map for the Geobrowse
 * interface.
 */

define(["util/solrrequest", "config"], function(SReq, config) {

var sreq = SReq;
var solr = config.solr;
var proxy = ("proxy" in config) ? config.proxy : "";

return function(options) {
    var query = sreq.getQuery() || "*:*";
    var bbox = options['bbox'];
    var zoom = options['zoom'];
    var bounds = options['bounds'];
    var center;

    if (bbox && zoom) {
        var reqBounds = OpenLayers.Bounds.fromString(bbox);
        bounds = reqBounds.clone().transform(
            new OpenLayers.Projection('EPSG:900913'),
            new OpenLayers.Projection('EPSG:4326')
        );
        center = reqBounds.getCenterLonLat();
    }

    var mapoptions = {
        maxExtent: new OpenLayers.Bounds(-20037508, -20037508, 20037508, 20037508),
        restrictedExtent: new OpenLayers.Bounds(-20037508, -20037508, 20037508, 20037508),
        numZoomLevels: 19,
        maxResolution: 156543,
        units: 'm',
        projection: new OpenLayers.Projection("EPSG:900913"),
        displayProjection: new OpenLayers.Projection('EPSG:4326'),
        controls: [
            new OpenLayers.Control.PanZoomBar(),
            new OpenLayers.Control.Navigation(),
            new OpenLayers.Control.LayerSwitcher({roundedCornerColor: '#364c83'})
        ]
    };
    var map = new OpenLayers.Map('map', mapoptions);

    /* define layers */
    //        var yahoolayer = new OpenLayers.Layer.Yahoo(
    //            "Yahoo",
    //            {
    //                sphericalMercator: true,
    //                minZoomLevel: 1
    //            }
    //        );
    var googlelayer = new OpenLayers.Layer.Google(
        "Google",
        {
            sphericalMercator: true,
            minZoomLevel: 1
        }
    );
    var googlesat = new OpenLayers.Layer.Google(
        "Google Satellite",
        {
            type: G_SATELLITE_MAP,
            sphericalMercator: true,
            minZoomLevel: 1
        }
    );

    var clusters = new OpenLayers.Layer.Vector("Clusters", {
                styleMap: new OpenLayers.StyleMap({
                    'default': new OpenLayers.Style({
                            pointRadius: "${radius}",
                            fillColor: "#36C",
                            fillOpacity: 0.9,
                            strokeColor: "#036",
                            strokeWidth: 2,
                            strokeOpacity: 0.8,
                            fontWeight: 'bold',
                            fontSize: '10px',
                            fontColor: "#003",
                            fontOpacity: 0.9,
                            label : "${count}",
                            labelAlign: 'cm'
                        },
                        {
                            context: {
                                radius: function(feature) {
                                    var clusters = feature.cluster, count=0;
                                    for (var i=0, l=feature.cluster.length; i<l; i++) {
                                        count += clusters[i].data.count;
                                    }
                                    return Math.min(count, 60)/3 + 7;
                                },
                                count: function(feature) {
                                    var clusters = feature.cluster, count=0;
                                    for (var i=0, l=feature.cluster.length; i<l; i++) {
                                        count += clusters[i].data.count;
                                    }
                                    return count;
                                }
                            }
                    }),
                    'select': new OpenLayers.Style({'fillColor': '#9CF'})
                }), //end styleMap
                projection: new OpenLayers.Projection('EPSG:4326'),
                protocol: new OpenLayers.Protocol.HTTP({
                    url: solr,
                    params: {
                        'q': query,
                        'wt': 'json',
                        'rows': '0',
                        'fl': 'lat,lon'
                    },
                    format: new OpenLayers.Format.SolrJSON()
                }),
                strategies: [
                    new OpenLayers.Strategy.QuadCluster({
                        bounds: bounds,
                        zoom: zoom,
                        zoomOffset: 1
                    }),
                    new OpenLayers.Strategy.Cluster({
                        distance: 30,
                        threshold: null
                    })
                ],
                eventListeners: {
                    "featureselected": function(event) {
                        var hashes = [];
                        for (var i=0, count=0, c=event.feature.cluster; i<c.length; i++) {
                            hashes.push(c[i].data.hash);
                            count += c[i].data.count;
                        }
                        $("#items").photostrip('loadCluster', {
                            query: 'hash:('+hashes.join(" OR ")+')'+' AND '+query,
                            total: count
                        });
                    },
                    "moveend": function(event) {
                        //triggers reload of clusters from Solr
                        event.object.refresh();
                    }
                }
            });

    /* add layers and cluster controls */
    map.addLayers([googlelayer, googlesat, clusters]);
    map.addControls([
        new OpenLayers.Control.SelectFeature([clusters], {
            hover: true,
            highlightOnly: true,
            autoActivate: true
        }),
        new OpenLayers.Control.SelectFeature([clusters], {
            clickout: true,
            autoActivate: true
        })
    ]);

    map.events.on({"moveend": function(event) {
            var search = window.location.search.split('?');
            var ll = map.getExtent().toArray().join(",");
            var zoom = map.getZoom();
            if (search.length > 1) {
                search = search[1].split('&');
                var params = {};
                for (var i=0; i<search.length; i++) {
                    var hash = search[i].split('=');
                    params[hash[0]] = hash[1];
                }
                var q = params['q'];
                $('#maplink').attr('href', '?q='+q+'&z='+zoom+'&ll='+ll);
            } else {
                $('#maplink').attr('href', '?q=*:*&z='+zoom+'&ll='+ll);
            }
    }});
    /**
        * Zoom, center and display map.
        */
    if (zoom && center) {
        /**
            * zoom and center params passed through URL
            */
        map.setCenter(center, zoom);
    } else if (bounds) {
        /**
            * bounds param passed through Geobrowse constructor
            */
        var extent = bounds.clone().transform(
            new OpenLayers.Projection('EPSG:4326'),
            new OpenLayers.Projection('EPSG:900913')
        );
        zoom = map.getZoomForExtent(extent);
        map.setCenter(extent.getCenterLonLat(), zoom);
    } else {
        /**
            * Default to zoom level 0.
            */
        map.zoomTo(0);
    }
    
    return map;
}
    
});