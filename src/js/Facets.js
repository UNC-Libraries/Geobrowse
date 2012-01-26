// ================
// = svn metadata =
// ================
// $Id$
// $URL$

// load order: 1

function getUrlParams() {
    /*
     * This function needs to get loaded early in order to give facets and map
     * classes access to the URL params.
     */
    var urlparams = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++) {
        hash = hashes[i].split('=');
        urlparams.push(hash[0]);
        urlparams[hash[0]] = hash[1];
    }
    if ((typeof localQuery !== "undefined") && localQuery) {
        if (urlparams['q']) {
            var qString = decodeURI(urlparams['q']);
            var qArray = [];
            if (qString.indexOf(localQuery) == -1) {
                qArray = qString.split(" AND ");
                qArray.push(localQuery);
                urlparams['q'] = encodeURI(qArray.join(" AND "));
            }
        } else {
            urlparams['q'] = encodeURI(localQuery);
        }
    }
    return urlparams;
}
var params = getUrlParams();
var qString = decodeURI(params['q'] ? params['q'] : '*:*');


function Facet(name, query, items) {
    this.name = name;
    this.query = query;
    this.items = [];
    if (items)
        this.addItems(items);
}
Facet.prototype.getQuery = function(term) {
    var qArray = null;
    if (this.query.indexOf("*:*") != -1) {
        qArray = [];
    } else {
        qArray = $.extend([], this.query.split(" AND "));
    }
    if (this.query.indexOf(term) == -1) {
        //item is not active so add term to query array
        qArray.push(term);
    } else {
        //item is active so remove term from query array
        for (var i in qArray) {
            if (term == qArray[i]) qArray.splice(i, 1);
        }
    }
    if (qArray.length) {
        return 'q=' + qArray.join(" AND ");
    }
}
Facet.prototype.addItems = function(items) {
    for (var i=0; i < items.length; i++) {
        if (!(i & 1)) {
            var term = this.name + ':' + '"' + items[i] + '"';
            this.items.push({
                name: items[i],
                term: term,
                count: items[parseInt(i)+1],
                active: this.query.indexOf(term) != -1,
                query: this.getQuery(term)
            });
        }
    }
}

CenturyFacet.prototype = new Facet();
CenturyFacet.prototype.constructor = CenturyFacet;

function CenturyFacet(name, query, items, subitems) {
    this.name = name;
    this.subitems = [];
    this.query = query;
    this.items = [];
    for (var i in subitems) {
        if (!(i & 1)) {
            var term = 'decade:"'+subitems[i]+'"';
            this.subitems.push({
                name: subitems[i]+'s',
                term: term,
                count: subitems[parseInt(i)+1],
                active: this.query.indexOf(term) != -1,
                query: this.getQuery(term)
            });
        }
    }
    this.addItems(items);
}
CenturyFacet.prototype.addItems = function(items) {
    for (var i=0; i < items.length; i++) {
        if (!(i & 1)) {
            var term = 'century:"'+items[i]+'"';
            var subitems = null;
            if (this.query.indexOf(term) != -1) {
                subitems = this.getDecades(items[i]);
            }
            this.items.push({
                name: items[i]+'s',
                term: term,
                count: items[parseInt(i)+1],
                active: this.query.indexOf(term) != -1,
                query: this.getQuery(term),
                realExpandable: this.isReallyExpandable(term, subitems),
                activeSubs: this.allActiveSubitems(subitems),
                expandable: this.isExpandable(subitems),
                activeSubitems: this.hasActiveSubitems(subitems),
                subitems: subitems
            });
        }
    }
}
CenturyFacet.prototype.isReallyExpandable = function(term, subitems) {
    if ((this.query.indexOf(term) != -1) && subitems) return true;
}
CenturyFacet.prototype.allActiveSubitems = function(subitems) {
    if (subitems) {
        for (var i in subitems) {
            if (!subitems[i].active) return false;
        }
    }
    return true;
}
CenturyFacet.prototype.getDecades = function(century){
    var decades = [];
    for (var i in this.subitems) {
        var decade = this.subitems[i].name.replace("s", "");
        if ((decade >= century) && (decade < (parseInt(century) + 100))) {
            decades.push(this.subitems[i]);
        }
    }
    return decades;
}
CenturyFacet.prototype.isExpandable = function(subitems) {
    //returns true if there are nonactive subitems
    if (subitems) {
        for (var i=0; i < subitems.length; i++) {
            if (!subitems[i].active) return true;
        }
    }
}
CenturyFacet.prototype.hasActiveSubitems = function(subitems) {
    //returns true if there are active subitems
    if (subitems) {
        for (var i in subitems) {
            if (subitems[i].active) return true;
        }
    }
}

$(function(){
    /*
     * Loads facet sidebar.
     */
    var params = {
        'q': qString,
        'rows': '0',
        'wt': 'json',
        'facet': 'true',
        'facet.mincount': '1',
        'facet.field': ['century', 'subject', 'decade', 'project'],
        'f.subject.facet.limit':'40',
        'f.century.facet.sort':'index',
        'f.decade.facet.sort':'index'
    };
    var facetlist = [];
    var templates = ((typeof localTemplates !== "undefined") && localTemplates) ? localTemplates : 'facets.tmpl.html';
    if ((typeof facetFields !== 'undefined') && facetFields) {
        //override defaults
        $.extend(params, {'facet.field': facetFields});
    }
    $.when(
        $.ajax({
            url: solr,
            dataType: 'json',
            data: params,
            traditional: true,
            success: function(data){
                var q = data.responseHeader.params.q;
                $.each(data.facet_counts.facet_fields, function(facet, items){
                    if (facet == 'century') {
                        facetlist.push(new CenturyFacet(facet, q, items, data.facet_counts.facet_fields.decade));
                    } else if (facet == 'decade') {
                        //do nothing
                    } else {
                        facetlist.push(new Facet(facet, q, items));
                    }
                });
            }
        }),
        $.get(templates, function(templates){
            $('body').append(templates);
        })
    ).then(function(){
        $("#facetTemplate").tmpl(facetlist, {displayNames: {
                    'century': 'Date', 'subject': 'Subject', 'project': 'Collection'}
            }).appendTo("#inactiveFacets");
        $("#activeTemplate").tmpl({facets: facetlist}).appendTo("#activeFacets");
    }).then(function(){
        if ($("#subjectFacet li").length > 10) {
            $("#subjectFacet li:gt(9)").hide();
            $('<a id="morelink" href="">(more)</a>')
                .insertAfter('#subjectFacet')
                .click(function(event) {
                    event.preventDefault();
                    $("#subjectFacet li:gt(9)").toggle();
                    if ($(this).text() == '(more)') {
                        $(this).text('(less)');
                    } else {
                        $(this).text('(more)');
                    }
                });
        }
    });
});