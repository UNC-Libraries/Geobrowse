
/**
 * This needs to be loaded outside of RequireJS's asynchronous load to
 * make sure the window load event is captured. OpenLayers can't be
 * initialized until after the window load event in IE. This function
 * allows us to safely use the window load event as a deferred within
 * $.ready().
 */
(function($) {
    var dfd = $.Deferred();
    $(window).load(function(){
        dfd.resolve();
    });
    if (window._loaded) {
        dfd.resolve();
    }
    $.fn.windowloaded = function() {
        return dfd;
    }
})(jQuery);


require(["jquery", "util/solrrequest", "config", "geobrowse",
    "QuadCluster", "SolrJSON", "PhotoStrip",
    "jquery.tmpl.beta1.min", "Facets", "jquery.kinetic"],
    function($, SReq, config, Geobrowse ) {

/**
 * @todo: if no config.solr then throw error
 */

$(function(){
    /**
     * Add event handlers to map link functionality.
     */
    $("#imgbar-wrapper").photostrip({solr: config.solr});
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
    var q = SReq.getQuery() || "*:*";
    var params = {
        'q': q,
        'rows': 0,
        'stats': 'true',
        'stats.field': ['lat', 'lon'],
        'wt': 'json'
    }
    $.when(
        /**
        * This is needed in order to get a bounding box for the points in a
        * query. The bounds are passed to the QuadCluster layer for determining
        * the quads to request; it's also used to zoom/center map on load.
        */
        $.ajax({
            url: config.solr,
            dataType: 'json',
            data: params,
            traditional: true
        }),
        $(document).windowloaded()
    ).done(function(data) {
        var response = $.parseJSON(data[2].responseText);
        var stats = response.stats.stats_fields;
        var bounds = new OpenLayers.Bounds(
            stats.lon.min, stats.lat.min, stats.lon.max, stats.lat.max
        );
        /**
         * Loads the map. Called only after the window has loaded (needed for
         *  OpenLayers) and after an initial call to Solr to determine required
         *  zoom and extent for map.
         */
        var opts = {
            bounds: bounds,
            bbox: SReq.getParam("ll"),
            zoom: SReq.getParam("z")
        };

        new Geobrowse(opts);
    });
});

});