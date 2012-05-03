
/**
 * solrrequest.js - retrieve and manipulate Solr query parameters
 * 
 * This module returns an object that generally allows manipulation of request
 * parameters. It also provides specific functionality for manipulating a Solr
 * query parameter (q).
 */

define(function() {

var terms   = [],
    params  = {},
    rparams,
    i, key, value;

rparams = window.location.href.indexOf("?") !== -1 ? 
    window.location.href.slice(window.location.href.indexOf("?") + 1).split("&") :
    [];

for (i = 0; i < rparams.length; i++) {
    key = rparams[i].slice(0, rparams[i].indexOf("="));
    value = rparams[i].slice(rparams[i].indexOf("=")+1);
    params[key] = decodeURIComponent(value);
}

if (typeof(params["q"]) === "string") {
    terms = params["q"].split(" AND ");
}

return {
    
    /**
     * Check if query term is present in request.
     */
    hasTerm: function(term) {
        return (terms.indexOf(term) !== -1) || false;
    },
    
    /**
     * Add term to request query terms.
     */
    addTerm: function(term) {
        if (terms.indexOf(term) === -1) {
            terms.push(term);
        }
    },
    
    /**
     * Delete term from request query terms.
     */
    delTerm: function(term) {
        if (terms.indexOf(term) !== -1) {
            terms.splice(terms.indexOf(term), 1);
        }
    },
    
    /**
     * Retrieve the value of a request parameter.
     */
    getParam: function(param) {
        return params[param];
    },
    
    /**
     * Set the value of a request parameter.
     */
    setParam: function(param, value) {
        params[param] = value;
    },
    
    /**
     * Delete a request parameter.
     */
    delParam: function(param) {
        delete params[param];
    },
    
    /**
     * Get the URL-encoded request string.
     */
    getRequest: function() {
        var req = [];
        for (var prop in params) {
            if (params.hasOwnProperty(prop)) {
                if (prop === "q") {
                    req.push("q=" + encodeURIComponent(terms.join(" AND ")));
                } else {
                    req.push(prop + "=" + encodeURIComponent(params[prop]));
                }
            }
        }
        return req.join("&");
    }
}

});