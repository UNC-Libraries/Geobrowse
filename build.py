#!/usr/bin/env python

import os
import os.path
import shutil
from jsmin import jsmin

def build():
    js = ['src/js/Facets.js',  'src/js/PhotoStrip.js', 'src/js/SolrJSON.js',
        'src/js/QuadCluster.js', 'src/js/Geobrowse.js',]
    root = os.path.dirname(os.path.abspath(__file__))
    dist = os.path.join(root, 'dist/')
    if (os.path.isdir(dist)):
        shutil.rmtree(dist)

    data = ''
    for file in js:
        fh = open(os.path.join(root, file))
        data += fh.read() + '\n'
        fh.close()

    try:
        os.mkdir(dist)
    except OSError:
        pass

    of = open(os.path.join(dist, 'geobrowse.min.js'), 'w')
    of.write(jsmin(data))
    of.close()

    shutil.copyfile(os.path.join(root, 'src/style.css'), os.path.join(dist, 'style.css'))
    shutil.copyfile(os.path.join(root, 'src/index-example.html'), os.path.join(dist, 'index.html'))
    shutil.copyfile(os.path.join(root, 'src/facets.tmpl.html'), os.path.join(dist, 'facets.tmpl.html'))

if __name__ == '__main__':
    build()