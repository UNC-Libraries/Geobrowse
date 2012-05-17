define(["jquery", "config"], function($, config){

(function($){
    var requesting = false,
        requested = 0,
        torequest = 0,
        barwidth = 2,
        settings = {},
        query,
        $this;

    var initialize = function(options) {
        $this = this;
        $.extend(settings, options);

        $("#imgbar-content").kinetic({
            y: false,
            moved: function(settings) {
                var ulwidth = $this.find("ul").width(),
                    barwidth = $this.find("#imgbar-content").width(),
                    width = ulwidth - barwidth - settings.scrollLeft;
                if ((width < barwidth * 2) && !requesting && (requested < torequest)) {
                    fetchThumbs();
                }
            }
        });

        $this.on("mouseenter", function() {
            $("#imgbar-back-button, #imgbar-forward-button").fadeIn(300);
        }).on("mouseleave", function() {
            $("#imgbar-back-button, #imgbar-forward-button").fadeOut(300);
        });

        $("#imgbar-forward-button").on("mousedown", function() {
            $("#imgbar-content").kinetic("start", {velocity: 7});
        });

        $("#imgbar-back-button").on("mousedown", function() {
            $("#imgbar-content").kinetic("start", {velocity: -7});
        });

        $(document).on("mouseup", function() {
            $("#imgbar-content").kinetic("end");
        });

        $this.on("click", "li img", function() {
            displayImage($(this).attr("data-url"));
        });
    }

    var fetchThumbs = function() {
        requesting = true;
        $.ajax(settings.solr, {
            data: {
                q: query,
                wt: 'json',
                fl: 'thumbnail,title,url_self_s',
                rows: 30,
                start: requested
            },
            dataType: "json"
        })
        .done(function(resp) {
            var dfds = [];
            requested += 30;
            $.each(resp.response.docs, function(index, value) {
                var dfd = $.Deferred(),
                    img;

                dfd.done(function(img) {
                    if (img) {
                        var $li = $("<li>").append(img);
                        $this.find("ul").append($li);
                        barwidth += img.width();
                        $this.find("ul").width(barwidth);
                    }
                });

                dfds.push(dfd);

                img = $("<img/>").attr({
                    src: value.thumbnail,
                    "data-url": value.url_self_s,
                    title: value.title
                }).on("load", function(e) {
                    dfd.resolve(img);
                    return true;
                }).on("error", function(e) {
                    /* @todo: what to do here? */
                    dfd.resolve();
                    return true;
                });

                if (img.prop("complete") && img.prop("naturalWidth") !== undefined ) {
                    dfd.resolve(img);
                    return true;
                }

                if (img.prop("readyState") || img.prop("complete")) {
                    dfd.resolve(img);
                }
            });
            $.when.apply($, dfds).done(function() {
                requesting = false;
            });
        });
    }

    var displayImage = function(url) {
        $("#wrapper, #viewer").remove();
        if (config.proxy) {
            url = config.proxy+url;
        }
        $.getJSON(url, function(data) {
            var description = data.description;
            var imgurl = data.image;
            var url = data.url;
            var title = data.title;
            $("body").append('<div id="wrapper"></div>'+
                '<div id="viewer">'+
                    '<div id="v-image"></div>'+
                    '<div id="v-links">'+
                        '<div class="v-button"><a title="Close image" href=""><img src="http://imageserv.lib.unc.edu/geobrowse/cross.png" /></a></div>'+
                        '<div class="v-button">'+
                        '<a target="_blank" title="Open full image in new window" href="'+url+'">'+
                            '<img src="http://imageserv.lib.unc.edu/geobrowse/application.png" />'+
                        '</a>'+
                        '</div>'+
                    '</div>'+
                    '<div id="v-desc">'+
                        '<div><b>Title:</b> '+title+'</div>'+
                        '<div><b>Description:</b> '+description+
                            ' <a target="_blank" title="Open full image in new window" href="'+url+'">more...</a>'+
                        '</div>'+
                    '</div>'+
                '</div>');
            $("#wrapper, .v-button:first a").click(function(event) {
                event.preventDefault();
                $("#wrapper, #viewer").fadeOut(200, function(){
                    $("#wrapper, #viewer").remove();
                });
            });
            $("#wrapper").fadeTo(200, 0.9);
            $.Deferred(function(dfd){
                $("<img/>")
                .attr("src", imgurl)
                .load(function(){
                    var top = $(window).scrollTop() + 20;
                    var winwidth = $(window).width();
                    var width = this.width + 50;
                    var lmargin = 20;
                    if (width < winwidth) {
                        lmargin = (winwidth - width) / 2;
                    }
                    dfd.resolve({
                        img: $(this),
                        top: top,
                        lmargin: lmargin,
                        width: width
                    });
                });
            }).then(function(options){
                $("#v-image").append(options.img);
                $("#viewer").css({
                    'visibility': 'visible',
                    'width': options.width + 'px',
                    'margin-top': options.top + 'px',
                    'margin-left': options.lmargin + 'px'
                }).hide().fadeIn(300);
            });
        });
    }

    var methods = {

        loadCluster: function(options) {
            torequest = options.total;
            requested = 0;
            barwidth = 2;
            $this.find("ul").empty();
            query = options.query;
            fetchThumbs();
        }
    };

    $.fn.photostrip = function(options) {
        if (typeof options === "string") {
            if (options in methods) {
                methods[options].apply(this, Array.prototype.slice.call(arguments, 1));
            } else {
                $.error("Method " + options + " not available on photostrip.");
            }
        } else {
            initialize.call(this, options);
        }
        return this;
    };

})(jQuery);

});