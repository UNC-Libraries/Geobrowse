GeoBrowse
=====================================================

GeoBrowse is an application for browsing images using a faceted and geographic
interface. For an example, see http://www.lib.unc.edu/dc/geobrowse/.

This application relies heavily on Solr (3.3+).

Building
--------

GeoBrowse can be built using the `RequireJS optimizer
<http://requirejs.org/docs/optimization.html>`_ (when using Node)::

$ r.js -o build.js

Note that while the RequireJS optimizer copies over all the files in the js directory,
the only javascript files that are needed once it's built are ``main.js`` and
``require-jquery.js``.

The index-example.html should be updated to include the Google Maps API and
OpenLayers.

How does this work?
-------------------

Solr
~~~~

All the points are stored in Solr with, at minimum, the following fields:

    ``title``: title of item

    ``thumbnail``: link to thumbnail

    ``url``: link to html representation of item

    ``url_self_s``: link to service providing more information about item

    ``lat``: latitude

    ``lon``: longitude

    ``hash``: hash string

The clustering functionality is accomplished through `quadtree clustering
<http://en.wikipedia.org/wiki/Quadtree>`_ and a base4 `geohash
<http://en.wikipedia.org/wiki/Geohash>`_. This is all done once at index time
allowing for the number of points in the collection to grow without reducing
performance in the interface.

Hash
~~~~

The hash string can be generated however you want as long as it follows the
numbering scheme::

 +-------+-------+
 |       |       |
 |   2   |   3   |
 |       |       |
 +-------+-------+
 |       |       |
 |   0   |   1   |
 |       |       |
 +-------+-------+

We use http://code.google.com/p/python-geohash/ for generating quad tree hashes.

OpenLayers
~~~~~~~~~~

The ``QuadCluster.js`` extension to OpenLayers does most of the work of
communicating with the Solr index. Based on either a Solr query, or the extent
of the visible map and zoom level, a query is formulated to get the points
within visible quads. The results are grouped by Solr on the hash string--a
simple text comparison.

:Author:
    Mike Graves
:Copyright:
    Copyright (c) 2012 University Library, University of North Carolina. See LICENSE for details.