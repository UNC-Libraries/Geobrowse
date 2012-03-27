//load order: 4

/* for IE < 9 */
if (!Array.indexOf) {
    Array.prototype.indexOf = function(obj) {
        for (var i=0; i<this.length; i++) {
            if (this[i]==obj)
               return i;
        }
        return -1;
    }
}

//global for debug
var map = null;

//override in page if needed
OpenLayers.ImgPath = 'http://styleserv.lib.unc.edu/openlayers/img/';

function Geobrowse(options) {
        var query = options['q'];
        var solrurl = options['solr'];
        var bbox = options['bbox'];
        var zoom = options['zoom'];
        var xhrproxy = options['proxy'] ? options['proxy'] : '';
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
              new OpenLayers.Control.UNCPanZoomBar(),
              new OpenLayers.Control.Navigation(),
              new OpenLayers.Control.LayerSwitcher({roundedCornerColor: '#364c83'})
          ]
        };
        map = new OpenLayers.Map('map', mapoptions);

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
                        url: solrurl,
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
}

$(function(){
    /**
     * Add event handlers to map link functionality.
     */
    $("#items").photostrip({solr: solr});
    $('#linkbox a').click(function(event) {
        event.preventDefault();
        $(this).parent().toggle('fast');
    });
    $('#maplink').click(function(event) {
        event.preventDefault();
        var url = window.location.protocol + '//' + window.location.host +
            window.location.pathname;
        $('#linkbox input').val(url + $(this).attr('href'))
            .parent().toggle('fast', function() {
                $(this).children('input').select();
            });
    });
    /**
     * Initializes the map
     */
    var q = qString;
    $.when(
        $.Deferred(function(dfd){
            /**
             * This is needed in order to get a bounding box for the points in a
             * query. The bounds are passed to the QuadCluster layer for determining
             * the quads to request; it's also used to zoom/center map on load.
             */
            var params = {
                'q': q,
                'rows': 0,
                'stats': 'true',
                'stats.field': ['lat', 'lon'],
                'wt': 'json'
            }
            $.ajax({
                url: solr,
                dataType: 'json',
                data: params,
                traditional: true,
                success: function(data) {
                    var stats = data.stats.stats_fields;
                    var bounds = new OpenLayers.Bounds(
                        stats.lon.min, stats.lat.min, stats.lon.max, stats.lat.max
                    );
                    dfd.resolve({bounds: bounds});
                }
            })
        }),
        $.Deferred(function(dfd){
            $(window).load(dfd.resolve)
        })
    ).then(function(options) {
        /**
         * Loads the map. Called only after the window has loaded (needed for
         *  OpenLayers) and after an initial call to Solr to determine required
         *  zoom and extent for map.
         */
        var bbox = params['ll'] ? decodeURI(params['ll']) : null;
        var zoom = params['z'] ? params['z'] : 1;
        var xhrproxy = (typeof proxy != 'undefined') ? proxy : null;
        new Geobrowse({
            'q': qString,
            'solr': solr,
            'bbox': bbox,
            'zoom': zoom,
            'proxy': xhrproxy,
            'bounds': options.bounds
        });
    });
})