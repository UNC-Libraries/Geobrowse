(function( $ ){

    var methods = {
        init: function(options) {
            return this.each(function() {
                var $this = $(this);
                var settings = {
                    solr: null
                }
                if (options) {
                    $.extend(settings, options);
                }
                $this.data('photostrip', settings);
                $this.on("click", "#prevPageButton", function(e){
                    e.preventDefault();
                    $this.photostrip('moveLeft');
                }).on("click", "#nextPageButton", function(e){
                    e.preventDefault();
                    $this.photostrip('moveRight');
                }).on("click", "#items-list a", function(e){
                    e.preventDefault();
                    $this.photostrip('displayImage', $(this).attr("data-url"));
                });
                $("#nextPageButton, #prevPageButton").hide();
            });
        },

        loadCluster: function(options) {
            return this.each(function() {
                var $this = $(this);
                var data = $this.data('photostrip');
                var settings = {
                    counter: -5, //position in queue of first visible image
                    queue: [], //queue of images
                    total: 0, //total number of points in cluster
                    query: null,
                    solr: data.solr //retain this, all other settings overwritten
                };
                if (options) $.extend(settings, options);
                $this.data('photostrip', settings);
                $this.photostrip('moveRight');
            });
        },

        fillStrip: function() {
            return this.each(function() {
                var $this = $(this);
                var data = $this.data('photostrip');
                $("#items-list").empty();
                var current = data.queue.slice(data.counter, data.counter+5);
                $.each(current, function(index, value){
                    $.Deferred(function(dfd) {
                        $("<img/>")
                        .attr({
                            src: value.thumbnail,
                            title: value.title,
                            height: "75px"
                        })
                        .load(function(){
                            var li = $(this)
                                .appendTo("<a/>")
                                .parent()
                                    .attr({
                                        href: "#",
                                        "data-url": value.url_self_s
                                    })
                                .appendTo("<li/>")
                                .parent();
                            dfd.resolve({
                                li: li
                            });
                        });
                    })
                    .then(function(options){
                        options.li.appendTo("#items-list").hide();
                        $(options.li).fadeIn(500);
                    });
                });
                if (data.total <= 5) {
                    $("#nextPageButton, #prevPageButton").hide();
                } else {
                    if (data.counter+5 >= data.total) {
                        $("#nextPageButton").hide();
                    } else {
                        $("#nextPageButton").show();
                    }
                    if (data.counter >= 5) {
                        $("#prevPageButton").show();
                    } else {
                        $("#prevPageButton").hide();
                    }
                }
            });
        },

        moveRight: function() {
            return this.each(function() {
                var $this = $(this);
                var data = $this.data('photostrip');
                data.start = data.start ? parseInt(data.start)+10 : 0;
                data.counter += 5;
                if (data.queue.length < data.total) {
                    $.when(
                        $.get(data.solr, {
                                q: data.query,
                                wt: 'json',
                                fl: 'thumbnail,title,url_self_s',
                                rows: 10,
                                start: data.start},
                            function(res){
                                data.queue = data.queue.concat(res.response.docs);
                                data.start = res.responseHeader.params.start;
                                $this.data('photostrip', data);
                            },
                            'json')
                    ).then(function(){
                        $this.photostrip('fillStrip');
                    });
                } else {
                    $this.photostrip('fillStrip');
                }
            })
        },

        moveLeft: function() {
            return this.each(function() {
                var $this = $(this);
                var data = $this.data('photostrip');
                data.counter -= 5;
                $this.photostrip('fillStrip');
            });
        },

        displayImage: function(url) {
            return this.each(function() {
                $("#wrapper, #viewer").remove();
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
                })
            });
        }
    };

    $.fn.photostrip = function(method) {
        if ( methods[method] ) {
            return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
        } else if ( typeof method === 'object' || ! method ) {
            return methods.init.apply( this, arguments );
        } else {
            $.error( 'Method ' +  method + ' does not exist on jQuery.photostrip' );
        }
    };

})(jQuery);