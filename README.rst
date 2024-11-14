======================================================
ckanext-geoview - Geospatial viewer for CKAN resources
======================================================



This extension contains view plugins to display geospatial files and services in CKAN.
It contains an OpenLayers based viewer originally developed by `Philippe Duchesne`_ and other view plugins that
used to be part of ckanext-spatial_.

**Note:** This is a work in progress, if you can help with `OpenLayers`_ or `Leaflet`_ development,
check the `Issues` section for what needs to be done or add a new issue.

This extensions supports CKAN 2.7 onwards, including Python 3 support on CKAN 2.9 or higher.

------------
Installation
------------

To install ckanext-geoview on a production site:

1. Activate your CKAN virtual environment, for example::

     source /usr/lib/ckan/default/bin/activate

2. Install the ckanext-geoview Python package into your virtual environment::

     pip install ckanext-geoview

3. Add the relevant plugins to the ``ckan.plugins`` setting in your CKAN
   config file (by default the config file is located at
   ``/etc/ckan/default/production.ini``). Check `Available plugins`_ to see which
   ones are available and if they require further configuration.

4. Add the ``resource_proxy`` plugin to the ``ckan.plugins`` setting.

5. Restart CKAN. For example if you've deployed CKAN with Apache on Ubuntu::

     sudo service apache2 reload

------------------------
Development Installation
------------------------

To install ckanext-geoview for development:

1. Clone the source::

    cd /usr/lib/ckan/default/src
    git clone https://github.com/ckan/ckanext-geoview.git

2. Activate your CKAN virtual environment, for example::

    source /usr/lib/ckan/default/bin/activate

3. Install the ckanext-geoview Python package into your python virtual environment::

    cd ckanext-geoview
    python setup.py develop

4. Continue with the main installation instructions above (step 3 onwards).

-----------------
Available plugins
-----------------

* `OpenLayers Viewer`_
* `Leaflet GeoJSON Viewer`_
* `Leaflet WMTS Viewer`_
* `Leaflet ESRI Shapefile Viewer`_


OpenLayers Viewer
-----------------

.. image:: http://i.imgur.com/wCQm2Uh.jpg

The OpenLayers_ viewer provides access to different geospatial formats and services:

To enable it, add ``geo_view`` to your ``ckan.plugins`` setting.::

    ckan.plugins = ... resource_proxy geo_view

If you want the geospatial views to be created by default, add the plugin to the following setting::


    ckan.views.default_views = ... geo_view

The formats and services supported are:

========================= ===================
Type                      Resource format (*)
========================= ===================
Web Map Service (WMS)     ``wms``
Web Feature Service (WFS) ``wfs``
GeoJSON                   ``geojson``
GML                       ``gml``
KML                       ``kml``
ArcGIS REST API           ``arcgis_rest``
Google Fusion Tables      ``gft``
========================= ===================

(*) Resource formats are case insensitive

Support varies across formats, so you might want to deactivate the ones you are not interested in.
To choose which formats to display, set the following configuration option::

    ckanext.geoview.ol_viewer.formats = wms kml

To render Google Fusion Tables resources, a Google API Key must be provided in the ini file::

    ckanext.geoview.gapi_key = <API Key here>

This key must be granted Fusion Tables permissions. More information on obtaining such a key can be found at https://developers.google.com/fusiontables/docs/v1/using#APIKey.

All configuration options relating to the OpenLayers viewer (ie those prefixed with `ckanext.geoview.ol_viewer.*`)
are passed to the JavaScript module, where they are accessible on the `options.ol_config` object::

    this.ckan.module('olpreview', function (jQuery, _) {

        // ...

        _onReady: function () {


            console.log(this.options.ol_config)

        }

        // ...

    }

Other available configuration options are:

 * `ckanext.geoview.ol_viewer.hide_overlays`: if set to True, overlays won't be visible by default (only the base layer)
 * `ckanext.geoview.ol_viewer.default_feature_hoveron`: if set to True, feature data popup will be displayed when hovering on
 * `ckanext.geoview.ol_viewer.forward_ogc_request_params`: if set to True, OGC request parameters that may be present in
   resource URLs will be kept as part of proxied service requests. If False (default), such parameters will be removed
   from URL when proxying requests.


Each instance of a view has the following configuration options that can override the global configuration :
 * `feature_hoveron`: if set to True, feature data popup will be displayed when hovering on
 * `feature_style`: JSON representation of an OpenLayers style, as accepted by the StyleMap constructor

**Specific basemap support**
In addition to the basemap types described in `Common base layers for Map Widgets`_, the OpenLayers viewer supports several
other basemap types, namely TMS, WMTS, WMS

TMS example (here in Mercator projection) ::

    ckanext.spatial.common_map.tms.url = <tms URL>
    ckanext.spatial.common_map.tms.srs = EPSG:900913
    ckanext.spatial.common_map.tms.layername = <TMS layer name>
    ckanext.spatial.common_map.tms.resolutions = [156543.03390625,78271.516953125,39135.7584765625,19567.87923828125,9783.939619140625,4891.9698095703125,2445.9849047851562,1222.9924523925781,611.4962261962891,305.74811309814453,152.87405654907226,76.43702827453613,38.218514137268066,19.109257068634033,9.554628534317017,4.777314267158508,2.388657133579254,1.194328566789627,0.5971642833948135,0.29858214169740677,0.14929107084870338,0.07464553542435169,0.037322767712175846,0.018661383856087923,0.009330691928043961,0.004665345964021981,0.0023326729820109904,0.0011663364910054952,5.831682455027476E-4,2.915841227513738E-4,1.457920613756869E-4]
    ckanext.spatial.common_map.tms.extent = [-20037508.34, -20037508.34,20037508.34, 20037508.34]


WMTS (in this case parameters will be fetched from online capabilities) ::

    ckanext.spatial.common_map.type = wmts
    ckanext.spatial.common_map.wmts.url = <wmts URL>
    ckanext.spatial.common_map.wmts.layer = <WMTS layer name>
    ckanext.spatial.common_map.wmts.srs = EPSG:4326

WMS ::

    ckanext.spatial.common_map.wms.url = <wms URL>
    ckanext.spatial.common_map.wms.layer = <layer name>
    ckanext.spatial.common_map.wms.srs = EPSG:31370
    ckanext.spatial.common_map.wms.extent = [141192.712000, 161464.403000, 158005.472000, 178169.335000]

**Multi basemaps**

Multiple basemaps can be defined in a separate file, and will result in a dropdown in the interface
allowing to switch between basemaps.
Basemap definition file is defined as follows ::

    #ckanext.geoview.basemaps=%(here)s/basemaps.json

(here pointing to a file next to the ini file).
This file is a JSON encoded array of basemap definitions reproducing the structure and syntax described above::

    [
        {
            "title": "OSM",
            "type" : "custom",
            "url" : "http://tile.openstreetmap.org/{z}/{x}/{y}.png",
            "attribution" : " Map tiles & Data by OpenStreetMap, under CC BY SA."
        },
        {
            "title": "Blue Marble Mercator",
            "type" : "tms",
            "url" : "http://demo.opengeo.org/geoserver/gwc/service/tms/",
            "srs" : "EPSG:900913",
            "layername" : "nasa%3Abluemarble@EPSG%3A900913@png",
            "resolutions" : [156543.03390625,78271.516953125,39135.7584765625,19567.87923828125,9783.939619140625,4891.9698095703125,2445.9849047851562,1222.9924523925781,611.4962261962891,305.74811309814453,152.87405654907226,76.43702827453613,38.218514137268066,19.109257068634033,9.554628534317017,4.777314267158508,2.388657133579254,1.194328566789627,0.5971642833948135,0.29858214169740677,0.14929107084870338,0.07464553542435169,0.037322767712175846,0.018661383856087923,0.009330691928043961,0.004665345964021981,0.0023326729820109904,0.0011663364910054952,5.831682455027476E-4,2.915841227513738E-4,1.457920613756869E-4],
            "extent" : [-20037508.34, -20037508.34,20037508.34, 20037508.34]
        },
        {
            "title": "Blue Marble 4326",
            "type" : "tms",
            "url" : "http://demo.opengeo.org/geoserver/gwc/service/tms/",
            "srs" : "EPSG:4326",
            "layername" : "nasa%3Abluemarble@EPSG%3A4326@png",
            "resolutions" : [0.703125,0.3515625,0.17578125,0.087890625,0.0439453125,0.02197265625,0.010986328125,0.0054931640625,0.00274658203125,0.001373291015625,6.866455078125E-4,3.4332275390625E-4,1.71661376953125E-4,8.58306884765625E-5,4.291534423828125E-5,2.1457672119140625E-5,1.0728836059570312E-5,5.364418029785156E-6,2.682209014892578E-6,1.341104507446289E-6,6.705522537231445E-7,3.3527612686157227E-7],
            "extent" : [-180,-90,180,90]
        },
        {
            "title": "Opengeo WMS demo",
            "type" : "wms",
            "url" : "http://demo.opengeo.org/geoserver/ows",
            "layer" : "ne:NE1_HR_LC_SR_W_DR",
            "srs" : "EPSG:4326",
            "extent" : [-180,-90,180,90]
        }
    ]

When declared, this basemap list will override the ``ckanext.spatial.common_map`` properties.

**URL specification**

For WMS and WFS views, the URL must be specified carefully to get the desired result. In general, to browse the offered layers or features of a WMS or WFS endpoint, just specify the endpoint in the URL field of the resource, e.g.:

https://neo.sci.gsfc.nasa.gov/wms/wms

or 

http://giswebservices.massgis.state.ma.us/geoserver/wfs

You can request individual layers/features using the "#" sign, e.g.:

https://neo.sci.gsfc.nasa.gov/wms/wms#MOD14A1_M_FIRE

or

http://giswebservices.massgis.state.ma.us/geoserver/wfs#GISDATA.MINLL1_ARC

N.B. For WFS this is the feature name without the qualifier, e.g. GISDATA.MINLL1_ARC and not massgis:GISDATA.MINLL1_ARC in the example above.

Leaflet GeoJSON Viewer
----------------------

**Note**: This plugin used to be part of ckanext-spatial_.

.. image:: http://i.imgur.com/4w9du2T.png

The Leaflet_ GeoJSON_ viewer will render GeoJSON files on a map and add a popup showing the features properties, for those resources that have a ``geojson`` format.

To enable it, add ``geojson_view`` to your ``ckan.plugins`` setting.::

    ckan.plugins = ... resource_proxy geojson_view

If you want the views to be created by default on all GeoJSON files, add the plugin to the following setting::


    ckan.views.default_views = ... geojson_view

You can use the ``ckanext.geoview.geojson.max_file_size`` configuration option to define the maximum file size (in bytes) that will be rendered in the map widget. Default is 25 Mb.
Note that this relies on the resource ``size`` field being set (ie it will only work with uploaded files, not linked externally).




Leaflet WMTS Viewer
----------------------

.. image:: http://i.imgur.com/MderhVH.png

The Leaflet_ WMTS viewer will render WMTS (Web Map Tile Service) layers on a map for those resources that have a ``wmts`` format.

To enable it, add ``wmts_view`` to your ``ckan.plugins`` setting.::

    ckan.plugins = ... resource_proxy wmts_view

If you want the views to be created by default on all WMTS resources, add the plugin to the following setting::


    ckan.views.default_views = ... wmts_view


Leaflet ESRI Shapefile Viewer
-----------------------------

.. image:: http://i.imgur.com/JDIRgPy.png

The Leaflet_ Shapefile_ viewer will render ESRI Shapfiles (A ZIP archive contains the .shp, .shx, .dbf, and .prj files) on a map and add a popup showing the features properties, for those resources that have a ``shp`` format.

To enable it, add ``shp_view`` to your ``ckan.plugins`` setting.::

    ckan.plugins = ... resource_proxy shp_view

If you want the views to be created by default on all Shapefiles, add the plugin to the following setting::


    ckan.views.default_views = ... shp_view

The projection information (EPSG code, e.g., 4326 and 3857) will be loaded if there is a .prj file provided. You can also add a new field named 'resource_crs' in your custom resource fields or the following configuration option (The loading order is: .prj file, 'resource_crs' field, option and EPSG:4326/WGS84)::

    ckanext.geoview.shp_viewer.srid = 4326

The encoding of the shapefile can be defined by a custom resource field named 'encoding' in the metadata of the dataset or the following configuration option (The loading order is: 'encoding' field, option and UTF-8)::

    ckanext.geoview.shp_viewer.encoding = UTF-8


----------------------------------
Common base layers for Map Widgets
----------------------------------

The geospatial view plugins support the same base map configurations than the ckanext-spatial `widgets`_.

Check the following page to learn how to choose a different base map layer:

http://docs.ckan.org/projects/ckanext-spatial/en/latest/map-widgets.html

.. image:: http://i.imgur.com/cdiIjkU.png


.. _widgets: http://docs.ckan.org/projects/ckanext-spatial/en/latest/spatial-search.html#spatial-search-widget

> [!WARNING]  
> As of July 2024 the common map configuration is not working with the OpenLayers viewer. Pull requests are welcome to address the issue

-------------------------
Updating the JS libraries
-------------------------

To update a JS library to a new version:

1. Update the version number in ``package.json``
2. Run ``npm install``
3. Run ``npm run update-libs``

The following libraries are managed manually as they don't have npm packages:

* ol-helpers
* shp2geojson


-----------------------------------
Registering ckanext-geoview on pypi
-----------------------------------

ckanext-geoview should be availabe on PyPI as
https://pypi.python.org/pypi/ckanext-geoview. If that link doesn't work, then
you can register the project on PyPI for the first time by following these
steps:

1. Create a source distribution of the project::

     python setup.py sdist

2. Register the project::

     python setup.py register

3. Upload the source distribution to PyPI::

     python setup.py sdist upload

4. Tag the first release of the project on GitHub with the version number from
   the ``setup.py`` file. For example if the version number in ``setup.py`` is
   0.0.1 then do::

       git tag 0.0.1
       git push --tags


------------------------------------------
Releasing a new version of ckanext-geoview
------------------------------------------

ckanext-geoview is availabe on PyPI as https://pypi.python.org/pypi/ckanext-geoview.
To publish a new version to PyPI follow these steps:

1. Update the version number in the ``setup.py`` file.
   See `PEP 440 <http://legacy.python.org/dev/peps/pep-0440/#public-version-identifiers>`_
   for how to choose version numbers.

2. Create a source distribution of the new version::

     python setup.py sdist

3. Upload the source distribution to PyPI::

     python setup.py sdist upload

4. Tag the new release of the project on GitHub with the version number from
   the ``setup.py`` file. For example if the version number in ``setup.py`` is
   0.0.2 then do::

       git tag 0.0.2
       git push --tags

.. _Philippe Duchesne: https://github.com/pduchesne
.. _OpenLayers: http://openlayers.org
.. _Leaflet: http://leafletjs.com/
.. _GeoJSON: http://geojson.org/
.. _Shapefile: https://en.wikipedia.org/wiki/Shapefile
.. _ckanext-spatial: https://github.com/ckan/ckanext-spatial
