
define(function(require, exports, module) {
    var solr = module.config().solr,
        proxy = module.config().proxy,
        qterms = module.config().qterms || [],
        facets = module.config().facets || [],
        templates = module.config().templates,
        zoomoffset = module.config().zoomoffset;

    return {
        solr: solr,
        proxy: proxy,
        qterms: qterms,
        facets: facets,
        templates: templates,
        zoomoffset: zoomoffset
    }
});